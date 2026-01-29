import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/admin/reports/batch - Perform batch operations on reports
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

    if (!user || !["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, reportIds, comment } = body;

    if (!action || !reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return NextResponse.json(
        { error: "Action and reportIds are required" },
        { status: 400 }
      );
    }

    const validActions = ["approve", "reject", "archive", "start_review"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Valid actions: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify all reports exist and user has permission
    const reports = await prisma.report.findMany({
      where: { id: { in: reportIds } },
      select: { id: true, status: true, reportNumber: true },
    });

    if (reports.length !== reportIds.length) {
      return NextResponse.json(
        { error: "Some reports not found" },
        { status: 404 }
      );
    }

    const results: { id: string; success: boolean; error?: string }[] = [];
    const now = new Date();

    for (const report of reports) {
      try {
        let newStatus: string;
        let auditAction: string;

        switch (action) {
          case "approve":
            if (!["PENDING_REVIEW", "UNDER_REVIEW"].includes(report.status)) {
              results.push({
                id: report.id,
                success: false,
                error: `Cannot approve report with status ${report.status}`,
              });
              continue;
            }
            newStatus = "APPROVED";
            auditAction = "APPROVED";
            break;

          case "reject":
            if (!["PENDING_REVIEW", "UNDER_REVIEW"].includes(report.status)) {
              results.push({
                id: report.id,
                success: false,
                error: `Cannot reject report with status ${report.status}`,
              });
              continue;
            }
            newStatus = "REVISION_REQUIRED";
            auditAction = "REVIEWED";
            break;

          case "archive":
            if (report.status === "ARCHIVED") {
              results.push({
                id: report.id,
                success: false,
                error: "Report is already archived",
              });
              continue;
            }
            newStatus = "ARCHIVED";
            auditAction = "STATUS_CHANGED";
            break;

          case "start_review":
            if (report.status !== "PENDING_REVIEW") {
              results.push({
                id: report.id,
                success: false,
                error: `Cannot start review for report with status ${report.status}`,
              });
              continue;
            }
            newStatus = "UNDER_REVIEW";
            auditAction = "REVIEWED";
            break;

          default:
            results.push({
              id: report.id,
              success: false,
              error: "Unknown action",
            });
            continue;
        }

        // Update report
        await prisma.report.update({
          where: { id: report.id },
          data: {
            status: newStatus as never,
            ...(action === "approve" && { approvedAt: now }),
            reviewerId: user.id,
          },
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            reportId: report.id,
            action: auditAction as never,
            userId: user.id,
            details: {
              batchOperation: true,
              previousStatus: report.status,
              newStatus,
              comment: comment || null,
            },
          },
        });

        results.push({ id: report.id, success: true });
      } catch (error) {
        console.error(`Error processing report ${report.id}:`, error);
        results.push({
          id: report.id,
          success: false,
          error: "Processing failed",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      processed: results.length,
      successful: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error("Error in batch operation:", error);
    return NextResponse.json(
      { error: "Failed to process batch operation" },
      { status: 500 }
    );
  }
}
