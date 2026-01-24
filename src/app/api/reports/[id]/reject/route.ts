import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z.string().min(10, "Rejection reason must be at least 10 characters"),
  revisionItems: z.array(z.string()).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
});

/**
 * POST /api/reports/[id]/reject - Reject a report and request revisions
 * Only REVIEWER, ADMIN, or SUPER_ADMIN can reject reports
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
        { error: "Insufficient permissions. Only reviewers and admins can reject reports." },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { reason, revisionItems, priority } = rejectSchema.parse(body);

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
          error: `Report cannot be rejected. Current status: ${report.status}. Report must be in PENDING_REVIEW or UNDER_REVIEW status.`,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // Update the report status to REVISION_REQUIRED
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: "REVISION_REQUIRED",
        reviewerId: user.id,
        updatedAt: now,
      },
    });

    // Create audit log entry for rejection
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "REVIEWED",
        details: {
          outcome: "REVISION_REQUIRED",
          previousStatus: report.status,
          newStatus: "REVISION_REQUIRED",
          reason,
          revisionItems: revisionItems || [],
          priority,
          reviewerName: user.name,
        },
      },
    });

    // Create status change audit log
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "STATUS_CHANGED",
        details: {
          previousStatus: report.status,
          newStatus: "REVISION_REQUIRED",
          reason: "Reviewer requested revisions",
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Report returned for revision",
      report: {
        id: updatedReport.id,
        reportNumber: updatedReport.reportNumber,
        status: updatedReport.status,
        reviewerId: updatedReport.reviewerId,
      },
      revisionDetails: {
        reason,
        revisionItems: revisionItems || [],
        priority,
        reviewedBy: user.name,
        reviewedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error rejecting report:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to reject report" },
      { status: 500 }
    );
  }
}
