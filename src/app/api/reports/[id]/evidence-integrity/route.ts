import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * Evidence Integrity API
 * Returns photo evidence integrity metrics for chain of custody documentation
 */

interface EvidenceIntegrityResult {
  summary: {
    totalPhotos: number;
    withHash: number;
    hashVerified: number;
    withExif: number;
    withGps: number;
    withCamera: number;
    withTimestamp: number;
    edited: number;
    integrityScore: number; // 0-100
  };
  photos: Array<{
    id: string;
    filename: string;
    hasHash: boolean;
    hashVerified: boolean;
    hasExif: boolean;
    hasGps: boolean;
    hasCamera: boolean;
    hasTimestamp: boolean;
    isEdited: boolean;
    capturedAt: string | null;
    uploadedAt: string;
    cameraMake: string | null;
    cameraModel: string | null;
    gpsLat: number | null;
    gpsLng: number | null;
  }>;
  chainOfCustody: {
    firstUpload: string | null;
    lastUpload: string | null;
    uniqueDevices: string[];
    uploadEvents: Array<{
      action: string;
      timestamp: string;
      user: string;
      details: string | null;
    }>;
  };
}

/**
 * GET /api/reports/[id]/evidence-integrity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify access to report
    const report = await prisma.report.findFirst({
      where: {
        id,
        OR: [
          { inspectorId: user.id },
          ...([" REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)
            ? [{ id }]
            : []),
        ],
      },
      select: { id: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Fetch all photos with integrity fields
    const photos = await prisma.photo.findMany({
      where: { reportId: id },
      select: {
        id: true,
        filename: true,
        originalFilename: true,
        originalHash: true,
        hashVerified: true,
        isEdited: true,
        capturedAt: true,
        gpsLat: true,
        gpsLng: true,
        cameraMake: true,
        cameraModel: true,
        cameraSerial: true,
        exposureTime: true,
        fNumber: true,
        iso: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Fetch upload audit logs for chain of custody
    const uploadLogs = await prisma.auditLog.findMany({
      where: {
        reportId: id,
        action: { in: ["PHOTO_ADDED", "PHOTO_DELETED"] },
      },
      orderBy: { createdAt: "asc" },
    });

    // Get user names for logs
    const logUserIds = [...new Set(uploadLogs.map((l) => l.userId))];
    const logUsers = await prisma.user.findMany({
      where: { id: { in: logUserIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(logUsers.map((u) => [u.id, u.name]));

    // Calculate metrics
    const totalPhotos = photos.length;
    const withHash = photos.filter((p) => p.originalHash).length;
    const hashVerified = photos.filter((p) => p.hashVerified).length;
    const withExif = photos.filter(
      (p) => p.capturedAt || p.cameraMake || p.cameraModel || p.exposureTime
    ).length;
    const withGps = photos.filter((p) => p.gpsLat !== null && p.gpsLng !== null).length;
    const withCamera = photos.filter((p) => p.cameraMake || p.cameraModel).length;
    const withTimestamp = photos.filter((p) => p.capturedAt).length;
    const edited = photos.filter((p) => p.isEdited).length;

    // Calculate integrity score (weighted)
    let integrityScore = 0;
    if (totalPhotos > 0) {
      const hashScore = (withHash / totalPhotos) * 30; // 30% weight
      const verifiedScore = (hashVerified / totalPhotos) * 20; // 20% weight
      const exifScore = (withExif / totalPhotos) * 20; // 20% weight
      const gpsScore = (withGps / totalPhotos) * 15; // 15% weight
      const timestampScore = (withTimestamp / totalPhotos) * 15; // 15% weight
      integrityScore = Math.round(hashScore + verifiedScore + exifScore + gpsScore + timestampScore);
    }

    // Build unique devices list
    const uniqueDevices = [
      ...new Set(
        photos
          .filter((p) => p.cameraMake || p.cameraModel)
          .map((p) => [p.cameraMake, p.cameraModel].filter(Boolean).join(" "))
      ),
    ];

    // Build chain of custody events
    const uploadEvents = uploadLogs.map((log) => {
      const details = log.details as Record<string, unknown> | null;
      return {
        action: log.action,
        timestamp: log.createdAt.toISOString(),
        user: userMap.get(log.userId) || "Unknown",
        details: details?.filename ? String(details.filename) : null,
      };
    });

    const result: EvidenceIntegrityResult = {
      summary: {
        totalPhotos,
        withHash,
        hashVerified,
        withExif,
        withGps,
        withCamera,
        withTimestamp,
        edited,
        integrityScore,
      },
      photos: photos.map((p) => ({
        id: p.id,
        filename: p.originalFilename,
        hasHash: !!p.originalHash,
        hashVerified: p.hashVerified,
        hasExif: !!(p.capturedAt || p.cameraMake || p.cameraModel || p.exposureTime),
        hasGps: p.gpsLat !== null && p.gpsLng !== null,
        hasCamera: !!(p.cameraMake || p.cameraModel),
        hasTimestamp: !!p.capturedAt,
        isEdited: p.isEdited,
        capturedAt: p.capturedAt?.toISOString() || null,
        uploadedAt: p.createdAt.toISOString(),
        cameraMake: p.cameraMake,
        cameraModel: p.cameraModel,
        gpsLat: p.gpsLat,
        gpsLng: p.gpsLng,
      })),
      chainOfCustody: {
        firstUpload: photos[0]?.createdAt.toISOString() || null,
        lastUpload: photos[photos.length - 1]?.createdAt.toISOString() || null,
        uniqueDevices,
        uploadEvents,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching evidence integrity:", error);
    return NextResponse.json(
      { error: "Failed to fetch evidence integrity" },
      { status: 500 }
    );
  }
}
