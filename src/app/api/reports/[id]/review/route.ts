import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * POST /api/reports/[id]/review - Start reviewing a report (mark as UNDER_REVIEW)
 * Only REVIEWER, ADMIN, or SUPER_ADMIN can start reviews
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
        { error: "Insufficient permissions. Only reviewers and admins can review reports." },
        { status: 403 }
      );
    }

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

    // Check report is in PENDING_REVIEW status
    if (report.status !== "PENDING_REVIEW") {
      return NextResponse.json(
        {
          error: `Report cannot be reviewed. Current status: ${report.status}. Report must be in PENDING_REVIEW status.`,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // Update the report to UNDER_REVIEW
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: "UNDER_REVIEW",
        reviewerId: user.id,
        updatedAt: now,
      },
      include: {
        inspector: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            photos: true,
            defects: true,
            roofElements: true,
          },
        },
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "STATUS_CHANGED",
        details: {
          previousStatus: "PENDING_REVIEW",
          newStatus: "UNDER_REVIEW",
          reviewerAssigned: user.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Review started. Report is now under review.",
      report: {
        id: updatedReport.id,
        reportNumber: updatedReport.reportNumber,
        status: updatedReport.status,
        propertyAddress: updatedReport.propertyAddress,
        propertyCity: updatedReport.propertyCity,
        inspectionType: updatedReport.inspectionType,
        inspector: updatedReport.inspector,
        reviewerId: updatedReport.reviewerId,
        counts: updatedReport._count,
      },
    });
  } catch (error) {
    console.error("Error starting review:", error);
    return NextResponse.json(
      { error: "Failed to start review" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports/[id]/review - Get review status and history for a report
 */
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

    // Fetch the report with review-related data
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
        auditLog: {
          where: {
            action: {
              in: ["REVIEWED", "APPROVED", "STATUS_CHANGED", "SUBMITTED"],
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check access - either owner, reviewer assigned, or admin
    const isOwner = report.inspectorId === user.id;
    const isReviewer = report.reviewerId === user.id;
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role);
    const canReview = ["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role);

    if (!isOwner && !isReviewer && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Extract revision feedback from audit log if status is REVISION_REQUIRED
    const revisionFeedback = report.status === "REVISION_REQUIRED"
      ? report.auditLog.find(
          (log) =>
            log.action === "REVIEWED" &&
            (log.details as Record<string, unknown>)?.outcome === "REVISION_REQUIRED"
        )
      : null;

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        reportNumber: report.reportNumber,
        status: report.status,
        submittedAt: report.submittedAt,
        approvedAt: report.approvedAt,
        inspector: report.inspector,
        reviewerId: report.reviewerId,
      },
      reviewHistory: report.auditLog.map((log) => ({
        action: log.action,
        details: log.details,
        createdAt: log.createdAt,
        userId: log.userId,
      })),
      revisionFeedback: revisionFeedback
        ? {
            reason: (revisionFeedback.details as Record<string, unknown>)?.reason,
            revisionItems: (revisionFeedback.details as Record<string, unknown>)?.revisionItems,
            priority: (revisionFeedback.details as Record<string, unknown>)?.priority,
            reviewerName: (revisionFeedback.details as Record<string, unknown>)?.reviewerName,
            reviewedAt: revisionFeedback.createdAt,
          }
        : null,
      permissions: {
        canEdit: isOwner && ["DRAFT", "IN_PROGRESS", "REVISION_REQUIRED"].includes(report.status),
        canSubmit: isOwner && ["DRAFT", "IN_PROGRESS", "REVISION_REQUIRED"].includes(report.status),
        canReview: canReview && ["PENDING_REVIEW", "UNDER_REVIEW"].includes(report.status),
        canApprove: canReview && ["PENDING_REVIEW", "UNDER_REVIEW"].includes(report.status),
      },
    });
  } catch (error) {
    console.error("Error fetching review status:", error);
    return NextResponse.json(
      { error: "Failed to fetch review status" },
      { status: 500 }
    );
  }
}
