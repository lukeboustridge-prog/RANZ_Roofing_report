import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const updateDefectSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  classification: z.enum(["MAJOR_DEFECT", "MINOR_DEFECT", "SAFETY_HAZARD", "MAINTENANCE_ITEM"]).optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  observation: z.string().min(1).optional(),
  analysis: z.string().optional().nullable(),
  opinion: z.string().optional().nullable(),
  codeReference: z.string().optional().nullable(),
  copReference: z.string().optional().nullable(),
  recommendation: z.string().optional().nullable(),
  priorityLevel: z.enum(["IMMEDIATE", "SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"]).optional().nullable(),
});

// GET /api/defects/[id] - Get single defect
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

    const defect = await prisma.defect.findUnique({
      where: { id },
      include: {
        report: true,
        photos: true,
        roofElement: true,
      },
    });

    if (!defect) {
      return NextResponse.json({ error: "Defect not found" }, { status: 404 });
    }

    // Verify ownership
    if (defect.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(defect);
  } catch (error) {
    console.error("Error fetching defect:", error);
    return NextResponse.json(
      { error: "Failed to fetch defect" },
      { status: 500 }
    );
  }
}

// PATCH /api/defects/[id] - Update defect
export async function PATCH(
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

    const defect = await prisma.defect.findUnique({
      where: { id },
      include: { report: true },
    });

    if (!defect) {
      return NextResponse.json({ error: "Defect not found" }, { status: 404 });
    }

    // Verify ownership
    if (defect.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateDefectSchema.parse(body);

    const updatedDefect = await prisma.defect.update({
      where: { id },
      data: validatedData,
      include: {
        photos: true,
        roofElement: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: defect.reportId,
        userId: user.id,
        action: "DEFECT_UPDATED",
        details: {
          defectId: id,
          changes: Object.keys(validatedData),
        },
      },
    });

    return NextResponse.json(updatedDefect);
  } catch (error) {
    console.error("Error updating defect:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update defect" },
      { status: 500 }
    );
  }
}

// DELETE /api/defects/[id] - Delete defect
export async function DELETE(
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

    const defect = await prisma.defect.findUnique({
      where: { id },
      include: { report: true },
    });

    if (!defect) {
      return NextResponse.json({ error: "Defect not found" }, { status: 404 });
    }

    // Verify ownership
    if (defect.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.defect.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: defect.reportId,
        userId: user.id,
        action: "DEFECT_DELETED",
        details: {
          defectNumber: defect.defectNumber,
          title: defect.title,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting defect:", error);
    return NextResponse.json(
      { error: "Failed to delete defect" },
      { status: 500 }
    );
  }
}
