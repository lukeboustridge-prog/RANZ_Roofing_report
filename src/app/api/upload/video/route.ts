/**
 * POST /api/upload/video
 * Chunked video upload endpoint for large files from mobile
 *
 * Accepts multipart form data with video file + metadata.
 * Used when video file is too large for presigned URL approach.
 */

import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadToR2, generateFileKey, getPublicUrl } from "@/lib/r2";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId, authUser.authSource),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metadataStr = formData.get("metadata") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 500MB)
    const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum video size is 500MB." },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "Invalid file type. Only video files are accepted." },
        { status: 400 }
      );
    }

    const metadata = metadataStr ? JSON.parse(metadataStr) : {};
    const { reportId, videoId, filename, originalHash } = metadata;

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    // Verify report exists and belongs to user
    const report = await prisma.report.findFirst({
      where: { id: reportId, inspectorId: user.id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate hash for integrity
    const hash = originalHash || crypto.createHash("sha256").update(buffer).digest("hex");

    // Generate file key and upload to R2
    const fileKey = generateFileKey(reportId, filename || file.name, "videos");
    const url = await uploadToR2(buffer, fileKey, file.type);

    // Create or upsert video record
    const video = await prisma.video.upsert({
      where: { id: videoId || `chunked-${Date.now()}` },
      create: {
        id: videoId || undefined,
        reportId,
        filename: fileKey.split("/").pop() || file.name,
        originalFilename: filename || file.name,
        mimeType: file.type,
        fileSize: buffer.length,
        url,
        originalHash: hash,
      },
      update: {
        url,
        fileSize: buffer.length,
        originalHash: hash,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId,
        userId: user.id,
        action: "VIDEO_ADDED",
        details: {
          source: "mobile_sync_chunked",
          videoId: video.id,
          filename: file.name,
          fileSize: buffer.length,
        },
      },
    });

    return NextResponse.json({ success: true, url, videoId: video.id }, { status: 201 });
  } catch (error) {
    console.error("Error uploading video:", error);
    return NextResponse.json(
      { error: "Failed to upload video" },
      { status: 500 }
    );
  }
}
