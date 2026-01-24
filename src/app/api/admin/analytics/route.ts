import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/admin/analytics - Get platform analytics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check admin permissions
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    // Parse query parameters for date range
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Default to last 30 days if no date range specified
    const endDate = dateTo ? new Date(dateTo) : new Date();
    const startDate = dateFrom
      ? new Date(dateFrom)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all analytics in parallel
    const [
      totalUsers,
      activeInspectors,
      totalReports,
      reportsByStatus,
      reportsByType,
      reportsInPeriod,
      averagePhotosPerReport,
      averageDefectsPerReport,
      topInspectors,
      recentActivity,
    ] = await Promise.all([
      // Total users by role
      prisma.user.groupBy({
        by: ["role"],
        _count: { role: true },
      }),

      // Active inspectors (with at least one report)
      prisma.user.count({
        where: {
          role: "INSPECTOR",
          status: "ACTIVE",
          reports: { some: {} },
        },
      }),

      // Total reports
      prisma.report.count(),

      // Reports by status
      prisma.report.groupBy({
        by: ["status"],
        _count: { status: true },
      }),

      // Reports by inspection type
      prisma.report.groupBy({
        by: ["inspectionType"],
        _count: { inspectionType: true },
      }),

      // Reports created in period
      prisma.report.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Average photos per report
      prisma.photo.count().then(async (photoCount) => {
        const reportCount = await prisma.report.count();
        return reportCount > 0 ? Math.round((photoCount / reportCount) * 10) / 10 : 0;
      }),

      // Average defects per report
      prisma.defect.count().then(async (defectCount) => {
        const reportCount = await prisma.report.count();
        return reportCount > 0 ? Math.round((defectCount / reportCount) * 10) / 10 : 0;
      }),

      // Top inspectors by report count
      prisma.user.findMany({
        where: {
          role: "INSPECTOR",
          reports: { some: {} },
        },
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: { reports: true },
          },
        },
        orderBy: {
          reports: { _count: "desc" },
        },
        take: 10,
      }),

      // Recent activity (last 20 audit log entries)
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          report: {
            select: {
              reportNumber: true,
              propertyAddress: true,
            },
          },
        },
      }),
    ]);

    // Calculate reports by month for the period
    const reportsByMonth = await prisma.$queryRaw<
      { month: Date; count: bigint }[]
    >`
      SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*) as count
      FROM "Report"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;

    // Format the results
    const usersByRole = totalUsers.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {} as Record<string, number>);

    const statusDistribution = reportsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    const typeDistribution = reportsByType.reduce((acc, item) => {
      acc[item.inspectionType] = item._count.inspectionType;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalUsers: Object.values(usersByRole).reduce((a, b) => a + b, 0),
          usersByRole,
          activeInspectors,
          totalReports,
          reportsInPeriod,
          averagePhotosPerReport,
          averageDefectsPerReport,
        },
        reports: {
          byStatus: statusDistribution,
          byType: typeDistribution,
          byMonth: reportsByMonth.map((item) => ({
            month: item.month,
            count: Number(item.count),
          })),
        },
        topInspectors: topInspectors.map((inspector) => ({
          id: inspector.id,
          name: inspector.name,
          email: inspector.email,
          reportCount: inspector._count.reports,
        })),
        recentActivity: recentActivity.map((log) => ({
          id: log.id,
          action: log.action,
          reportNumber: log.report.reportNumber,
          propertyAddress: log.report.propertyAddress,
          details: log.details,
          createdAt: log.createdAt,
        })),
        period: {
          from: startDate.toISOString(),
          to: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
