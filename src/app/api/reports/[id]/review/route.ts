import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { createAndPushNotification } from "@/lib/notifications/push-service";
import {
  sendReportApprovedNotification,
  sendRevisionRequiredNotification,
  sendReportRejectedNotification,
} from "@/lib/email";

const reviewDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "REQUEST_REVISION"]),
  comment: z.string().optional(),
  revisionItems: z.array(z.string()).optional(),
});

/**
 * POST /api/reports/[id]/review - Start reviewing a report (mark as UNDER_REVIEW)
 * Only REVIEWER, ADMIN, or SUPER_ADMIN can start reviews
 */
export async function POST(
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

/**
 * PATCH /api/reports/[id]/review - Submit review decision (approve, reject, request revision)
 */
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

    // Check user has reviewer/admin permissions
    if (!["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only reviewers and admins can submit review decisions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = reviewDecisionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { decision, comment, revisionItems } = validationResult.data;

    // Fetch the report
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check report is under review
    if (report.status !== "UNDER_REVIEW") {
      return NextResponse.json(
        {
          error: `Cannot submit review decision. Current status: ${report.status}. Report must be UNDER_REVIEW.`,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // Determine new status based on decision
    const statusMap: Record<string, string> = {
      APPROVE: "APPROVED",
      REJECT: "DRAFT",
      REQUEST_REVISION: "REVISION_REQUIRED",
    };

    const newStatus = statusMap[decision];

    // Update the report
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: now,
    };

    if (decision === "APPROVE") {
      updateData.approvedAt = now;
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: updateData,
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: decision === "APPROVE" ? "APPROVED" : "REVIEWED",
        details: {
          outcome: decision,
          previousStatus: report.status,
          newStatus,
          reviewerName: user.name,
          reason: comment || null,
          revisionItems: revisionItems || null,
        },
      },
    });

    // Create a review comment if provided
    if (comment) {
      await prisma.reviewComment.create({
        data: {
          reportId: id,
          reviewerId: user.id,
          comment: comment,
          severity: decision === "REQUEST_REVISION" ? "ISSUE" : "NOTE",
        },
      });
    }

    // --- Notify inspector of review decision ---
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://reports.ranz.co.nz";

    if (report.inspector?.id) {
      // 1. In-app + push notification (for all decisions)
      const notificationTypeMap: Record<string, import("@prisma/client").NotificationType> = {
        APPROVE: "REPORT_APPROVED",
        REJECT: "REPORT_REJECTED",
        REQUEST_REVISION: "REPORT_COMMENTS",
      };

      const notificationTitleMap: Record<string, string> = {
        APPROVE: "Report Approved",
        REJECT: "Report Rejected",
        REQUEST_REVISION: "Revision Required",
      };

      const notificationMessageMap: Record<string, string> = {
        APPROVE: `Report ${report.reportNumber} has been approved by ${user.name}`,
        REJECT: `Report ${report.reportNumber} has been rejected by ${user.name}`,
        REQUEST_REVISION: `Report ${report.reportNumber} requires revision - feedback from ${user.name}`,
      };

      createAndPushNotification(report.inspector.id, {
        type: notificationTypeMap[decision],
        title: notificationTitleMap[decision],
        message: notificationMessageMap[decision],
        link: `/reports/${id}`,
        reportId: id,
        metadata: {
          decision,
          reviewerName: user.name,
        },
      }).catch(err => {
        console.error("[Review] Failed to send in-app notification:", err);
      });

      // 2. Email notification (decision-specific template)
      if (report.inspector.email) {
        const reportInfo = {
          reportNumber: report.reportNumber || "",
          propertyAddress: report.propertyAddress || "",
          inspectorName: report.inspector.name || "",
          inspectorEmail: report.inspector.email,
          reportUrl: `${baseUrl}/reports/${id}`,
        };

        if (decision === "APPROVE") {
          sendReportApprovedNotification(reportInfo, user.name || "Reviewer").catch(err => {
            console.error("[Review] Failed to send approval email:", err);
          });
        } else if (decision === "REQUEST_REVISION") {
          const commentsSummary = {
            critical: 0,
            issue: decision === "REQUEST_REVISION" ? 1 : 0,
            note: 0,
            suggestion: 0,
          };
          sendRevisionRequiredNotification(reportInfo, user.name || "Reviewer", commentsSummary).catch(err => {
            console.error("[Review] Failed to send revision email:", err);
          });
        } else if (decision === "REJECT") {
          sendReportRejectedNotification(reportInfo, user.name || "Reviewer", comment || "No reason provided").catch(err => {
            console.error("[Review] Failed to send rejection email:", err);
          });
        }
      }
    }

    // Build response message
    const messages: Record<string, string> = {
      APPROVE: "Report has been approved.",
      REJECT: "Report has been rejected and returned to draft status.",
      REQUEST_REVISION: "Revision has been requested. The inspector will be notified.",
    };

    return NextResponse.json({
      success: true,
      message: messages[decision],
      report: {
        id: updatedReport.id,
        reportNumber: updatedReport.reportNumber,
        status: updatedReport.status,
        approvedAt: updatedReport.approvedAt,
        inspector: updatedReport.inspector,
      },
    });
  } catch (error) {
    console.error("Error submitting review decision:", error);
    return NextResponse.json(
      { error: "Failed to submit review decision" },
      { status: 500 }
    );
  }
}
