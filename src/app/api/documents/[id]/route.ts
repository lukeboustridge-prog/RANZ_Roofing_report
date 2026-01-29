import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
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

const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  documentType: z.enum(DOCUMENT_TYPES).optional(),
});

// GET /api/documents/[id] - Get single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id } = await params;

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

    const document = await prisma.document.findUnique({
      where: { id },
      include: { report: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify ownership
    if (document.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

// PATCH /api/documents/[id] - Update document
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id } = await params;

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

    const document = await prisma.document.findUnique({
      where: { id },
      include: { report: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify ownership
    if (document.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateDocumentSchema.parse(body);

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error("Error updating document:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id } = await params;

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

    const document = await prisma.document.findUnique({
      where: { id },
      include: { report: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify ownership
    if (document.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
