import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/reports/[id]/audit-log - Get audit log for a report
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

    // Verify user owns the report or is admin/reviewer
    const report = await prisma.report.findFirst({
      where: {
        id,
        OR: [
          { inspectorId: user.id },
          // Allow reviewers and admins to view audit logs
          ...(["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)
            ? [{ id }]
            : []),
        ],
      },
      select: {
        id: true,
        reportNumber: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Fetch audit logs with user information
    const auditLogs = await prisma.auditLog.findMany({
      where: { reportId: id },
      orderBy: { createdAt: "desc" },
      include: {
        report: {
          select: {
            reportNumber: true,
          },
        },
      },
    });

    // Get user names for the logs
    const userIds = [...new Set(auditLogs.map((log) => log.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Enrich logs with user information
    const enrichedLogs = auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      user: userMap.get(log.userId) || { id: log.userId, name: "Unknown", email: "" },
    }));

    return NextResponse.json({
      reportNumber: report.reportNumber,
      logs: enrichedLogs,
    });
  } catch (error) {
    console.error("Error fetching audit log:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit log" },
      { status: 500 }
    );
  }
}
