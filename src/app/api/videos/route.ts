import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadToR2, generateFileKey } from "@/lib/r2";
import crypto from "crypto";

// POST /api/videos - Upload a video
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
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

    const metadata = metadataStr ? JSON.parse(metadataStr) : {};
    const { reportId, title, description } = metadata;

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    // Verify report exists and belongs to user
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        inspectorId: user.id,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate hash for integrity
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Generate file key and upload to R2
    const fileKey = generateFileKey(reportId, file.name, "videos");
    const url = await uploadToR2(buffer, fileKey, file.type);

    // Create video record
    const video = await prisma.video.create({
      data: {
        reportId,
        filename: fileKey.split("/").pop() || file.name,
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: buffer.length,
        url,
        originalHash: hash,
        title: title || null,
        description: description || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId,
        userId: user.id,
        action: "VIDEO_ADDED",
        details: {
          videoId: video.id,
          filename: file.name,
        },
      },
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("Error uploading video:", error);
    return NextResponse.json(
      { error: "Failed to upload video" },
      { status: 500 }
    );
  }
}

// GET /api/videos?reportId=xxx - List videos for a report
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
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

    const videos = await prisma.video.findMany({
      where: { reportId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
