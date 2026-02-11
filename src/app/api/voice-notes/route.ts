import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadToR2, generateFileKey } from "@/lib/r2";
import crypto from "crypto";

// POST /api/voice-notes - Upload a voice note
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

    // Validate file size (max 50MB)
    const MAX_VOICE_NOTE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_VOICE_NOTE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum voice note size is 50MB." },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "Invalid file type. Only audio files are accepted." },
        { status: 400 }
      );
    }

    const metadata = metadataStr ? JSON.parse(metadataStr) : {};
    const { reportId } = metadata;

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
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Generate file key and upload to R2
    const fileKey = generateFileKey(reportId, file.name, "voice-notes");
    const url = await uploadToR2(buffer, fileKey, file.type);

    // Create voice note record
    const voiceNote = await prisma.voiceNote.create({
      data: {
        reportId,
        filename: fileKey.split("/").pop() || file.name,
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: buffer.length,
        url,
        originalHash: hash,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId,
        userId: user.id,
        action: "VOICE_NOTE_ADDED",
        details: {
          voiceNoteId: voiceNote.id,
          filename: file.name,
        },
      },
    });

    return NextResponse.json(voiceNote, { status: 201 });
  } catch (error) {
    console.error("Error uploading voice note:", error);
    return NextResponse.json(
      { error: "Failed to upload voice note" },
      { status: 500 }
    );
  }
}

// GET /api/voice-notes?reportId=xxx - List voice notes for a report
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    // Verify report access
    const report = await prisma.report.findFirst({
      where: { id: reportId, inspectorId: user.id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const voiceNotes = await prisma.voiceNote.findMany({
      where: { reportId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(voiceNotes);
  } catch (error) {
    console.error("Error fetching voice notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch voice notes" },
      { status: 500 }
    );
  }
}
