import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { UpdateReportSchema, formatZodError } from "@/lib/validations";

// GET /api/reports/[id] - Get single report
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
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        inspector: {
          select: {
            id: true,
            name: true,
            email: true,
            qualifications: true,
            lbpNumber: true,
          },
        },
        photos: {
          orderBy: { sortOrder: "asc" },
        },
        defects: {
          orderBy: { defectNumber: "asc" },
          include: {
            photos: true,
            roofElement: true,
          },
        },
        roofElements: {
          orderBy: { createdAt: "asc" },
          include: {
            defects: true,
            photos: true,
          },
        },
        auditLog: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            photos: true,
            defects: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Verify ownership
    if (report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}

// PATCH /api/reports/[id] - Update report
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
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Verify ownership
    if (report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent editing finalized reports
    if (report.status === "FINALISED") {
      return NextResponse.json(
        { error: "Cannot edit a finalized report" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateReportSchema.parse(body);

    const updatedReport = await prisma.report.update({
      where: { id },
      data: validatedData as Prisma.ReportUpdateInput,
      include: {
        _count: {
          select: {
            photos: true,
            defects: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "UPDATED",
        details: {
          changes: Object.keys(validatedData),
        },
      },
    });

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error("Error updating report:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(formatZodError(error), { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/[id] - Delete report
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
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Verify ownership
    if (report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent deleting finalized reports
    if (report.status === "FINALISED") {
      return NextResponse.json(
        { error: "Cannot delete a finalized report" },
        { status: 400 }
      );
    }

    // Delete report (cascades to photos, defects, etc.)
    await prisma.report.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}
