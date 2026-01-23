import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadToR2, generatePhotoKey, generateThumbnailKey } from "@/lib/r2";
import { processPhoto } from "@/lib/exif";
import { z } from "zod";

const uploadSchema = z.object({
  reportId: z.string().min(1),
  photoType: z.enum(["OVERVIEW", "CONTEXT", "DETAIL", "SCALE_REFERENCE", "GENERAL"]),
  defectId: z.string().optional(),
  roofElementId: z.string().optional(),
  caption: z.string().optional(),
});

// POST /api/photos - Upload photo
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const metadata = formData.get("metadata") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!metadata) {
      return NextResponse.json({ error: "No metadata provided" }, { status: 400 });
    }

    const parsedMetadata = uploadSchema.parse(JSON.parse(metadata));

    // Verify report exists and belongs to user
    const report = await prisma.report.findFirst({
      where: {
        id: parsedMetadata.reportId,
        inspectorId: user.id,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process photo (hash, EXIF, thumbnail)
    const { hash, exif, thumbnail } = await processPhoto(buffer);

    // Generate keys for R2
    const photoKey = generatePhotoKey(report.id, file.name);
    const thumbnailKey = generateThumbnailKey(photoKey);

    // Upload original and thumbnail to R2
    const [url, thumbnailUrl] = await Promise.all([
      uploadToR2(buffer, photoKey, file.type),
      uploadToR2(thumbnail, thumbnailKey, "image/jpeg"),
    ]);

    // Get current max sort order
    const maxSortOrder = await prisma.photo.aggregate({
      where: { reportId: report.id },
      _max: { sortOrder: true },
    });

    // Create photo record
    const photo = await prisma.photo.create({
      data: {
        reportId: report.id,
        defectId: parsedMetadata.defectId || null,
        roofElementId: parsedMetadata.roofElementId || null,
        filename: photoKey.split("/").pop()!,
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: buffer.length,
        url,
        thumbnailUrl,
        photoType: parsedMetadata.photoType,
        capturedAt: exif.capturedAt || null,
        gpsLat: exif.gpsLat || null,
        gpsLng: exif.gpsLng || null,
        cameraMake: exif.cameraMake || null,
        cameraModel: exif.cameraModel || null,
        originalHash: hash,
        hashVerified: true,
        caption: parsedMetadata.caption || null,
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: report.id,
        userId: user.id,
        action: "PHOTO_UPLOADED",
        details: {
          photoId: photo.id,
          filename: file.name,
          hash: hash.substring(0, 16) + "...",
        },
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Error uploading photo:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}

// GET /api/photos?reportId=xxx - List photos for a report
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    // Verify report access
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        inspectorId: user.id,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const photos = await prisma.photo.findMany({
      where: { reportId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
