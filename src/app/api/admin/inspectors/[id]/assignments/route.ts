import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { canManageInspectors } from "@/lib/role-mapping";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/inspectors/[id]/assignments
 * Get reports assigned to this inspector
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);

  if (!authUser || !canManageInspectors(authUser.role)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { id: inspectorId } = await context.params;

  try {
    // Get reports assigned to this inspector
    // inspectorId references AuthUser.id from Quality Program
    const reports = await prisma.report.findMany({
      where: { inspectorId },
      select: {
        id: true,
        reportNumber: true,
        status: true,
        propertyAddress: true,
        propertyCity: true,
        inspectionDate: true,
        createdAt: true,
        clientName: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[Assignments API] Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/inspectors/[id]/assignments
 * Assign inspector to a report
 * Body: { reportId: string }
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);

  if (!authUser || !canManageInspectors(authUser.role)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { id: inspectorId } = await context.params;

  try {
    const body = await request.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: "reportId is required" },
        { status: 400 }
      );
    }

    // Verify report exists
    const existingReport = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, reportNumber: true, inspectorId: true },
    });

    if (!existingReport) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // Update report with new inspector
    const report = await prisma.report.update({
      where: { id: reportId },
      data: { inspectorId },
      select: {
        id: true,
        reportNumber: true,
        status: true,
        propertyAddress: true,
        inspectorId: true,
      },
    });

    return NextResponse.json({
      success: true,
      report,
      message: `Inspector assigned to report ${report.reportNumber}`,
    });
  } catch (error) {
    console.error("[Assignments API] Error assigning inspector:", error);
    return NextResponse.json(
      { error: "Failed to assign inspector" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/inspectors/[id]/assignments
 * Remove inspector from a report
 * Body: { reportId: string, newInspectorId?: string }
 *
 * Note: Report.inspectorId is required in the schema, so we cannot
 * truly "unassign" a report. Instead, this endpoint reassigns the report
 * to another inspector. If newInspectorId is not provided, returns an error.
 *
 * A future schema migration could make inspectorId optional to support
 * true unassignment.
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);

  if (!authUser || !canManageInspectors(authUser.role)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { reportId, newInspectorId } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: "reportId is required" },
        { status: 400 }
      );
    }

    // Report.inspectorId is required - we cannot set it to null
    // The DELETE endpoint requires a newInspectorId to reassign the report
    if (!newInspectorId) {
      return NextResponse.json(
        {
          error: "Cannot unassign report - inspectorId is required",
          message: "Reports must always have an assigned inspector. Use POST to reassign to a different inspector, or provide newInspectorId to transfer the report."
        },
        { status: 400 }
      );
    }

    // Reassign report to new inspector
    const report = await prisma.report.update({
      where: { id: reportId },
      data: { inspectorId: newInspectorId },
      select: {
        id: true,
        reportNumber: true,
        inspectorId: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Report ${report.reportNumber} reassigned`,
      report,
    });
  } catch (error) {
    console.error("[Assignments API] Error reassigning report:", error);
    return NextResponse.json(
      { error: "Failed to reassign report" },
      { status: 500 }
    );
  }
}
