import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const approveSchema = z.object({
  comments: z.string().optional(),
  finalise: z.boolean().optional().default(false),
});

/**
 * POST /api/reports/[id]/approve - Approve a report
 * Only REVIEWER, ADMIN, or SUPER_ADMIN can approve reports
 */
export async function POST(
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

    // Check user has reviewer/admin permissions
    if (!["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Only reviewers and admins can approve reports." },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { comments, finalise } = approveSchema.parse(body);

    // Fetch the report
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        inspector: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check report is in a reviewable state
    const reviewableStatuses = ["PENDING_REVIEW", "UNDER_REVIEW"];
    if (!reviewableStatuses.includes(report.status)) {
      return NextResponse.json(
        {
          error: `Report cannot be approved. Current status: ${report.status}. Report must be in PENDING_REVIEW or UNDER_REVIEW status.`,
        },
        { status: 400 }
      );
    }

    // Determine new status
    const newStatus = finalise ? "FINALISED" : "APPROVED";
    const now = new Date();

    // Update the report
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: newStatus,
        reviewerId: user.id,
        approvedAt: now,
        updatedAt: now,
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "APPROVED",
        details: {
          previousStatus: report.status,
          newStatus,
          finalised: finalise,
          comments: comments || null,
          reviewerName: user.name,
        },
      },
    });

    // If finalised, also log that action
    if (finalise) {
      await prisma.auditLog.create({
        data: {
          reportId: id,
          userId: user.id,
          action: "STATUS_CHANGED",
          details: {
            previousStatus: "APPROVED",
            newStatus: "FINALISED",
            reason: "Auto-finalised on approval",
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: finalise
        ? "Report approved and finalised successfully"
        : "Report approved successfully",
      report: {
        id: updatedReport.id,
        reportNumber: updatedReport.reportNumber,
        status: updatedReport.status,
        approvedAt: updatedReport.approvedAt,
        reviewerId: updatedReport.reviewerId,
      },
    });
  } catch (error) {
    console.error("Error approving report:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to approve report" },
      { status: 500 }
    );
  }
}
