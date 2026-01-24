import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/reports/[id]/revisions - Get revision history with changes
 * Groups audit logs by revision round to show what changed between submissions
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

    // Verify user owns the report or is admin/reviewer
    const report = await prisma.report.findFirst({
      where: {
        id,
        OR: [
          { inspectorId: user.id },
          ...(["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)
            ? [{ id }]
            : []),
        ],
      },
      select: {
        id: true,
        reportNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        revisionRound: true,
        submittedAt: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Fetch all audit logs with SUBMITTED action to identify revision boundaries
    const submissionLogs = await prisma.auditLog.findMany({
      where: {
        reportId: id,
        action: "SUBMITTED",
      },
      orderBy: { createdAt: "asc" },
    });

    // Fetch all audit logs
    const allLogs = await prisma.auditLog.findMany({
      where: { reportId: id },
      orderBy: { createdAt: "asc" },
    });

    // Fetch review comments grouped by revision round
    const comments = await prisma.reviewComment.findMany({
      where: { reportId: id },
      orderBy: { createdAt: "asc" },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Get user names for the logs
    const userIds = [...new Set(allLogs.map((log) => log.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Create revision boundaries based on submission times
    const revisionBoundaries: { round: number; submittedAt: Date; endAt: Date | null }[] = [];

    submissionLogs.forEach((log, index) => {
      const round = (log.details as { revisionRound?: number })?.revisionRound || index + 1;
      const nextSubmission = submissionLogs[index + 1];

      revisionBoundaries.push({
        round,
        submittedAt: log.createdAt,
        endAt: nextSubmission ? nextSubmission.createdAt : null,
      });
    });

    // Add initial draft period
    if (submissionLogs.length > 0) {
      revisionBoundaries.unshift({
        round: 0,
        submittedAt: report.createdAt,
        endAt: submissionLogs[0].createdAt,
      });
    } else {
      // No submissions yet - all changes are in draft
      revisionBoundaries.push({
        round: 0,
        submittedAt: report.createdAt,
        endAt: null,
      });
    }

    // Group logs by revision round
    const revisions = revisionBoundaries.map((boundary) => {
      const roundLogs = allLogs.filter((log) => {
        const logTime = log.createdAt.getTime();
        const startTime = boundary.submittedAt.getTime();
        const endTime = boundary.endAt?.getTime() || Date.now();
        return logTime >= startTime && logTime < endTime;
      });

      // Group changes by type
      const changes = {
        updates: roundLogs.filter((l) => l.action === "UPDATED"),
        photosAdded: roundLogs.filter((l) => l.action === "PHOTO_ADDED"),
        photosDeleted: roundLogs.filter((l) => l.action === "PHOTO_DELETED"),
        defectsAdded: roundLogs.filter((l) => l.action === "DEFECT_ADDED"),
        defectsUpdated: roundLogs.filter((l) => l.action === "DEFECT_UPDATED"),
        statusChanges: roundLogs.filter((l) => l.action === "STATUS_CHANGED"),
        other: roundLogs.filter((l) =>
          !["UPDATED", "PHOTO_ADDED", "PHOTO_DELETED", "DEFECT_ADDED",
            "DEFECT_UPDATED", "STATUS_CHANGED", "SUBMITTED"].includes(l.action)
        ),
      };

      // Get comments for this round
      const roundComments = comments.filter((c) => c.revisionRound === boundary.round);

      // Extract field changes from update logs
      const fieldChanges: Array<{
        field: string;
        from: string | null;
        to: string | null;
        changedAt: Date;
        changedBy: string;
      }> = [];

      changes.updates.forEach((log) => {
        const details = log.details as Record<string, unknown> | null;
        if (details?.field) {
          fieldChanges.push({
            field: String(details.field),
            from: details.from ? String(details.from) : null,
            to: details.to ? String(details.to) : null,
            changedAt: log.createdAt,
            changedBy: userMap.get(log.userId)?.name || "Unknown",
          });
        }
        // Handle multiple field changes in one log
        if (details?.changes && Array.isArray(details.changes)) {
          (details.changes as Array<{ field: string; from: unknown; to: unknown }>).forEach((change) => {
            fieldChanges.push({
              field: change.field,
              from: change.from ? String(change.from) : null,
              to: change.to ? String(change.to) : null,
              changedAt: log.createdAt,
              changedBy: userMap.get(log.userId)?.name || "Unknown",
            });
          });
        }
      });

      return {
        round: boundary.round,
        label: boundary.round === 0 ? "Initial Draft" : `Revision ${boundary.round}`,
        startedAt: boundary.submittedAt,
        endedAt: boundary.endAt,
        isActive: boundary.endAt === null,
        summary: {
          totalChanges: roundLogs.length,
          fieldChanges: fieldChanges.length,
          photosAdded: changes.photosAdded.length,
          photosDeleted: changes.photosDeleted.length,
          defectsAdded: changes.defectsAdded.length,
          defectsUpdated: changes.defectsUpdated.length,
          commentsReceived: roundComments.length,
          commentsResolved: roundComments.filter((c) => c.resolved).length,
        },
        fieldChanges,
        comments: roundComments.map((c) => ({
          id: c.id,
          comment: c.comment,
          severity: c.severity,
          resolved: c.resolved,
          section: c.section,
          reviewer: c.reviewer,
          createdAt: c.createdAt,
        })),
        logs: roundLogs.map((log) => ({
          id: log.id,
          action: log.action,
          details: log.details,
          createdAt: log.createdAt,
          user: userMap.get(log.userId) || { id: log.userId, name: "Unknown", email: "" },
        })),
      };
    });

    return NextResponse.json({
      reportNumber: report.reportNumber,
      status: report.status,
      currentRound: report.revisionRound || 0,
      totalRevisions: revisions.length,
      revisions: revisions.reverse(), // Most recent first
    });
  } catch (error) {
    console.error("Error fetching revision history:", error);
    return NextResponse.json(
      { error: "Failed to fetch revision history" },
      { status: 500 }
    );
  }
}
