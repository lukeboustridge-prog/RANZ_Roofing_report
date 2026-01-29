import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/reports/[id]/audit - Get audit trail for a report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check access - owner, reviewer, or admin
    const isOwner = report.inspectorId === user.id;
    const isReviewer = report.reviewerId === user.id;
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(user.role);

    if (!isOwner && !isReviewer && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query params
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Build where clause
    const where: Record<string, unknown> = { reportId: id };

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    // Get audit logs with pagination
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Get unique user IDs to fetch user info
    const userIds = [...new Set(auditLogs.map((log) => log.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Enrich audit logs with user info
    const enrichedLogs = auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      user: userMap.get(log.userId) || { id: log.userId, name: "Unknown", email: null },
    }));

    // Get action summary for filters
    const actionSummary = await prisma.auditLog.groupBy({
      by: ["action"],
      where: { reportId: id },
      _count: { id: true },
    });

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      actionSummary: actionSummary.map((s) => ({
        action: s.action,
        count: s._count.id,
      })),
      report: {
        id: report.id,
        reportNumber: report.reportNumber,
      },
    });
  } catch (error) {
    console.error("Error fetching audit trail:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit trail" },
      { status: 500 }
    );
  }
}
