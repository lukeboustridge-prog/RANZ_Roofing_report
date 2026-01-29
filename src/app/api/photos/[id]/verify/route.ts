import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import crypto from "crypto";

// GET /api/photos/[id]/verify - Verify photo integrity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id: photoId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lookupField = getUserLookupField();
    const user = await prisma.user.findUnique({
      where: { [lookupField]: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        report: {
          select: {
            inspectorId: true,
            reportNumber: true,
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Check access - must be inspector, reviewer, or admin
    const isOwner = photo.report.inspectorId === user.id;
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(user.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the original file and verify hash
    let verificationResult: {
      verified: boolean;
      originalHash: string | null;
      currentHash: string | null;
      hashMatch: boolean;
      metadata: {
        capturedAt: Date | null;
        gpsLat: number | null;
        gpsLng: number | null;
        cameraMake: string | null;
        cameraModel: string | null;
        isEdited: boolean;
        editedFrom: string | null;
      };
      chainOfCustody: {
        uploadedAt: Date;
        lastVerifiedAt: Date;
        accessCount: number;
      };
    };

    try {
      // Attempt to fetch the file and compute hash
      let currentHash: string | null = null;
      let hashMatch = false;

      if (photo.url) {
        try {
          const response = await fetch(photo.url);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const hash = crypto
              .createHash("sha256")
              .update(Buffer.from(buffer))
              .digest("hex");
            currentHash = hash;
            hashMatch = photo.originalHash === hash;
          }
        } catch (fetchError) {
          console.error("Failed to fetch photo for verification:", fetchError);
        }
      }

      // Count access events from audit log
      const accessCount = await prisma.auditLog.count({
        where: {
          reportId: photo.reportId,
          action: { in: ["PHOTO_ADDED", "DOWNLOADED"] },
          details: {
            path: ["photoId"],
            equals: photoId,
          },
        },
      });

      verificationResult = {
        verified: hashMatch || (photo.hashVerified && !currentHash),
        originalHash: photo.originalHash,
        currentHash,
        hashMatch,
        metadata: {
          capturedAt: photo.capturedAt,
          gpsLat: photo.gpsLat,
          gpsLng: photo.gpsLng,
          cameraMake: photo.cameraMake,
          cameraModel: photo.cameraModel,
          isEdited: photo.isEdited,
          editedFrom: photo.editedFrom,
        },
        chainOfCustody: {
          uploadedAt: photo.uploadedAt,
          lastVerifiedAt: new Date(),
          accessCount,
        },
      };

      // Update hash verified status
      if (hashMatch && !photo.hashVerified) {
        await prisma.photo.update({
          where: { id: photoId },
          data: { hashVerified: true },
        });
      }

    } catch (verifyError) {
      console.error("Verification error:", verifyError);
      verificationResult = {
        verified: photo.hashVerified,
        originalHash: photo.originalHash,
        currentHash: null,
        hashMatch: false,
        metadata: {
          capturedAt: photo.capturedAt,
          gpsLat: photo.gpsLat,
          gpsLng: photo.gpsLng,
          cameraMake: photo.cameraMake,
          cameraModel: photo.cameraModel,
          isEdited: photo.isEdited,
          editedFrom: photo.editedFrom,
        },
        chainOfCustody: {
          uploadedAt: photo.uploadedAt,
          lastVerifiedAt: new Date(),
          accessCount: 0,
        },
      };
    }

    return NextResponse.json({
      photoId: photo.id,
      filename: photo.originalFilename,
      reportNumber: photo.report.reportNumber,
      ...verificationResult,
    });
  } catch (error) {
    console.error("Error verifying photo:", error);
    return NextResponse.json(
      { error: "Failed to verify photo" },
      { status: 500 }
    );
  }
}
