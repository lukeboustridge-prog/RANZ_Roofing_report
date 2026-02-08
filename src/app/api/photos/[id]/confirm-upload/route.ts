/**
 * POST /api/photos/[id]/confirm-upload
 * Confirms that a photo has been uploaded to R2 via presigned URL.
 *
 * After mobile app uploads directly to R2, this endpoint:
 * 1. Fetches the image from the public URL
 * 2. Processes photo in single pass (hash, thumbnail, metadata)
 * 3. Compares SHA-256 hash with stored originalHash (case-insensitive)
 * 4. Uploads thumbnail to R2
 * 5. Updates photo record with url, thumbnailUrl, hashVerified, uploadedAt, metadata
 * 6. Creates audit log entry with full details
 *
 * Note: Hash mismatch is logged but does NOT fail the request (fail-safe approach).
 */

import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadToR2, generateThumbnailKey, downloadFromR2, getPublicUrl } from "@/lib/r2";
import { processPhotoForStorage } from "@/lib/photo-processing";

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
      where: getUserWhereClause(userId, authUser.authSource),
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

    // Reconstruct the R2 key and correct public URL from photo metadata
    const photoKey = `reports/${photo.reportId}/photos/${photo.filename}`;
    const correctPublicUrl = getPublicUrl(photoKey);

    // Idempotent: if already confirmed, return existing data
    if (photo.url && photo.uploadedAt) {
      return NextResponse.json({
        success: true,
        photo: {
          id: photo.id,
          url: photo.url,
          thumbnailUrl: photo.thumbnailUrl,
          hashVerified: photo.hashVerified,
          uploadedAt: photo.uploadedAt,
        },
        alreadyConfirmed: true,
      });
    }

    // Download the uploaded image from R2 using authenticated S3 access
    let imageBuffer: Buffer;
    try {
      imageBuffer = await downloadFromR2(photoKey);
    } catch (fetchError) {
      console.error("Failed to download image from R2:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch uploaded image from storage" },
        { status: 400 }
      );
    }

    // Process photo in single pass: hash, thumbnail, metadata
    const processingResult = await processPhotoForStorage(
      imageBuffer,
      photo.originalHash ?? undefined
    );

    // Log hash mismatch with full details (fail-safe: don't fail request)
    if (!processingResult.hashVerified && photo.originalHash) {
      console.warn(
        `Hash mismatch for photo ${photoId}:`,
        `expected=${photo.originalHash}`,
        `computed=${processingResult.hash}`,
        `metadata=${JSON.stringify(processingResult.metadata)}`
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
            computedHash: processingResult.hash,
            publicUrl: correctPublicUrl,
            metadata: {
              width: processingResult.metadata.width,
              height: processingResult.metadata.height,
              format: processingResult.metadata.format,
              size: processingResult.metadata.size,
            },
            source: "mobile_confirm_upload",
          },
        },
      });
    }

    // Upload thumbnail to R2 if generated
    let thumbnailUrl: string | null = null;
    if (processingResult.thumbnail) {
      try {
        const thumbnailKey = generateThumbnailKey(photoKey);
        thumbnailUrl = await uploadToR2(
          processingResult.thumbnail.buffer,
          thumbnailKey,
          "image/jpeg"
        );
      } catch (thumbnailUploadError) {
        console.error("Failed to upload thumbnail:", thumbnailUploadError);
        // Continue without thumbnail - not critical
      }
    }

    // Update photo record
    const now = new Date();
    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: {
        url: correctPublicUrl,
        thumbnailUrl,
        hashVerified: processingResult.hashVerified,
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
          publicUrl: correctPublicUrl,
          thumbnailUrl,
          hashVerified: processingResult.hashVerified,
          computedHash: processingResult.hash,
          metadata: {
            width: processingResult.metadata.width,
            height: processingResult.metadata.height,
            format: processingResult.metadata.format,
            size: processingResult.metadata.size,
          },
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
        metadata: {
          width: processingResult.metadata.width,
          height: processingResult.metadata.height,
          format: processingResult.metadata.format,
          size: processingResult.metadata.size,
        },
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
