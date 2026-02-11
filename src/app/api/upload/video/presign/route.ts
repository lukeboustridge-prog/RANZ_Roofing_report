/**
 * POST /api/upload/video/presign
 * Generate a presigned R2 URL for mobile video upload
 */

import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateFileKey, getPresignedUploadUrl, getPublicUrl } from "@/lib/r2";
import { z } from "zod";

const presignRequestSchema = z.object({
  videoId: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  originalHash: z.string().nullable().optional(),
  reportId: z.string(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  capturedAt: z.string().nullable().optional(),
  gpsLat: z.number().nullable().optional(),
  gpsLng: z.number().nullable().optional(),
  duration: z.number().nullable().optional(),
});

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

    const body = await request.json();
    const parsed = presignRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { videoId, filename, mimeType, fileSize, originalHash, reportId, title, description, capturedAt, gpsLat, gpsLng, duration } = parsed.data;

    // Verify report exists and belongs to user
    const report = await prisma.report.findFirst({
      where: { id: reportId, inspectorId: user.id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Generate R2 key and presigned URL
    const fileKey = generateFileKey(reportId, filename, "videos");
    const uploadUrl = await getPresignedUploadUrl(fileKey, mimeType);
    const publicUrl = getPublicUrl(fileKey);

    // Create or upsert video record in database
    await prisma.video.upsert({
      where: { id: videoId },
      create: {
        id: videoId,
        reportId,
        filename: fileKey.split("/").pop() || filename,
        originalFilename: filename,
        mimeType,
        fileSize,
        url: publicUrl,
        originalHash: originalHash || "",
        title: title || null,
        description: description || null,
        capturedAt: capturedAt ? new Date(capturedAt) : null,
        gpsLat: gpsLat || null,
        gpsLng: gpsLng || null,
        duration: duration || null,
      },
      update: {
        url: publicUrl,
        fileSize,
        originalHash: originalHash || "",
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        reportId,
        userId: user.id,
        action: "VIDEO_ADDED",
        details: {
          source: "mobile_sync",
          videoId,
          filename,
          fileSize,
        },
      },
    });

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    console.error("Error generating video presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
