import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadToR2, generateFileKey } from "@/lib/r2";
import { z } from "zod";

const DOCUMENT_TYPES = [
  "BUILDING_CONSENT",
  "CODE_OF_COMPLIANCE",
  "MANUFACTURER_SPEC",
  "PREVIOUS_REPORT",
  "CORRESPONDENCE",
  "CALIBRATION_CERT",
  "OTHER",
] as const;

// POST /api/documents - Upload a document
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metadataStr = formData.get("metadata") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const metadata = metadataStr ? JSON.parse(metadataStr) : {};
    const { reportId, documentType, title } = metadata;

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    if (!documentType || !DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json({ error: "Valid documentType is required" }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
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

    // Generate file key and upload to R2
    const fileKey = generateFileKey(reportId, file.name, "documents");
    const url = await uploadToR2(buffer, fileKey, file.type);

    // Create document record
    const document = await prisma.document.create({
      data: {
        reportId,
        documentType,
        title,
        filename: fileKey.split("/").pop() || file.name,
        mimeType: file.type,
        fileSize: buffer.length,
        url,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

// GET /api/documents?reportId=xxx - List documents for a report
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

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

    const documents = await prisma.document.findMany({
      where: { reportId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
