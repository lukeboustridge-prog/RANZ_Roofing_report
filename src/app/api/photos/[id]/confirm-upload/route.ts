/**
 * POST /api/photos/[id]/confirm-upload
 * Confirms that a photo has been uploaded to R2 via presigned URL.
 *
 * After mobile app uploads directly to R2, this endpoint:
 * 1. Fetches the image from the public URL
 * 2. Computes SHA-256 hash and compares with stored originalHash
 * 3. Generates a 200x200 JPEG thumbnail
 * 4. Uploads thumbnail to R2
 * 5. Updates photo record with url, thumbnailUrl, hashVerified, uploadedAt
 * 6. Creates audit log entry
 *
 * Note: Hash mismatch is logged but does NOT fail the request (fail-safe approach).
 */

import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadToR2, generateThumbnailKey } from "@/lib/r2";
import crypto from "crypto";
import sharp from "sharp";

interface ConfirmUploadBody {
  publicUrl: string;
}

// POST /api/photos/[id]/confirm-upload
export async function POST(
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

    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse request body
    const body: ConfirmUploadBody = await request.json();
    const { publicUrl } = body;

    if (!publicUrl) {
      return NextResponse.json(
        { error: "publicUrl is required" },
        { status: 400 }
      );
    }

    // Find photo and verify ownership
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        report: {
          select: {
            id: true,
            inspectorId: true,
            reportNumber: true,
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Verify user owns the report this photo belongs to
    if (photo.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the uploaded image from R2
    let imageBuffer: Buffer;
    try {
      const response = await fetch(publicUrl);
      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch image: ${response.statusText}` },
          { status: 400 }
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } catch (fetchError) {
      console.error("Failed to fetch uploaded image:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch uploaded image from storage" },
        { status: 400 }
      );
    }

    // Compute SHA-256 hash of uploaded file
    const computedHash = crypto
      .createHash("sha256")
      .update(imageBuffer)
      .digest("hex");

    // Compare with original hash - log mismatch but don't fail (fail-safe)
    const hashMatch = computedHash === photo.originalHash;
    if (!hashMatch) {
      console.warn(
        `Hash mismatch for photo ${photoId}: expected ${photo.originalHash}, got ${computedHash}`
      );
      // Create audit log for hash mismatch
      await prisma.auditLog.create({
        data: {
          reportId: photo.reportId,
          userId: user.id,
          action: "PHOTO_ADDED",
          details: {
            photoId,
            event: "hash_mismatch",
            expectedHash: photo.originalHash,
            computedHash,
            publicUrl,
            source: "mobile_confirm_upload",
          },
        },
      });
    }

    // Generate thumbnail using Sharp
    let thumbnailUrl: string | null = null;
    try {
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(200, 200, {
          fit: "cover",
          position: "centre",
        })
        .jpeg({ quality: 70 })
        .toBuffer();

      // Upload thumbnail to R2
      const thumbnailKey = generateThumbnailKey(photo.filename);
      thumbnailUrl = await uploadToR2(thumbnailBuffer, thumbnailKey, "image/jpeg");
    } catch (thumbnailError) {
      console.error("Failed to generate thumbnail:", thumbnailError);
      // Continue without thumbnail - not critical
    }

    // Update photo record
    const now = new Date();
    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: {
        url: publicUrl,
        thumbnailUrl,
        hashVerified: hashMatch,
        uploadedAt: now,
      },
    });

    // Create audit log entry for successful upload confirmation
    await prisma.auditLog.create({
      data: {
        reportId: photo.reportId,
        userId: user.id,
        action: "PHOTO_ADDED",
        details: {
          photoId,
          filename: photo.originalFilename,
          publicUrl,
          thumbnailUrl,
          hashVerified: hashMatch,
          source: "mobile_confirm_upload",
        },
      },
    });

    return NextResponse.json({
      success: true,
      photo: {
        id: updatedPhoto.id,
        url: updatedPhoto.url,
        thumbnailUrl: updatedPhoto.thumbnailUrl,
        hashVerified: updatedPhoto.hashVerified,
        uploadedAt: updatedPhoto.uploadedAt,
      },
    });
  } catch (error) {
    console.error("Error confirming photo upload:", error);
    return NextResponse.json(
      { error: "Failed to confirm photo upload" },
      { status: 500 }
    );
  }
}
