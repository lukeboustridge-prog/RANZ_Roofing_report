import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/analytics - Get analytics data for the current user
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

    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "30"; // days
    const periodDays = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Build where clause based on role
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role);
    const reportWhere = isAdmin ? {} : { inspectorId: user.id };
    const reportWhereWithDate = {
      ...reportWhere,
      createdAt: { gte: startDate },
    };

    // Get report counts by status
    const reportsByStatus = await prisma.report.groupBy({
      by: ["status"],
      where: reportWhere,
      _count: { id: true },
    });

    // Get reports created over time (grouped by date)
    const reportsOverTime = await prisma.report.findMany({
      where: reportWhereWithDate,
      select: {
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group reports by date
    const reportsByDate: Record<string, number> = {};
    reportsOverTime.forEach((report) => {
      const date = report.createdAt.toISOString().split("T")[0];
      reportsByDate[date] = (reportsByDate[date] || 0) + 1;
    });

    // Get defects by severity
    const defectsBySeverity = await prisma.defect.groupBy({
      by: ["severity"],
      where: {
        report: reportWhere,
      },
      _count: { id: true },
    });

    // Get defects by classification
    const defectsByClass = await prisma.defect.groupBy({
      by: ["classification"],
      where: {
        report: reportWhere,
      },
      _count: { id: true },
    });

    // Get total counts
    const totalReports = await prisma.report.count({ where: reportWhere });
    const totalDefects = await prisma.defect.count({
      where: { report: reportWhere },
    });
    const totalPhotos = await prisma.photo.count({
      where: { report: reportWhere },
    });

    // Get reports in each status for the period
    const reportsThisPeriod = await prisma.report.count({
      where: reportWhereWithDate,
    });

    const completedThisPeriod = await prisma.report.count({
      where: {
        ...reportWhereWithDate,
        status: { in: ["APPROVED", "FINALISED"] },
      },
    });

    // Calculate average defects per report
    const avgDefectsPerReport =
      totalReports > 0 ? (totalDefects / totalReports).toFixed(1) : "0";

    // Get recent activity (last 10 reports)
    const recentReports = await prisma.report.findMany({
      where: reportWhere,
      select: {
        id: true,
        reportNumber: true,
        status: true,
        propertyAddress: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    // Get inspection types distribution
    const reportsByType = await prisma.report.groupBy({
      by: ["inspectionType"],
      where: reportWhere,
      _count: { id: true },
    });

    // Calculate completion rate
    const completionRate =
      totalReports > 0
        ? (
            (reportsByStatus
              .filter((s) => ["APPROVED", "FINALISED", "ARCHIVED"].includes(s.status))
              .reduce((sum, s) => sum + s._count.id, 0) /
              totalReports) *
            100
          ).toFixed(0)
        : "0";

    // Get monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyReports = await prisma.report.findMany({
      where: {
        ...reportWhere,
        createdAt: { gte: sixMonthsAgo },
      },
      select: { createdAt: true },
    });

    const reportsByMonth: Record<string, number> = {};
    monthlyReports.forEach((report) => {
      const month = report.createdAt.toISOString().slice(0, 7); // YYYY-MM
      reportsByMonth[month] = (reportsByMonth[month] || 0) + 1;
    });

    return NextResponse.json({
      summary: {
        totalReports,
        totalDefects,
        totalPhotos,
        avgDefectsPerReport,
        completionRate: `${completionRate}%`,
        reportsThisPeriod,
        completedThisPeriod,
      },
      reportsByStatus: reportsByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      defectsBySeverity: defectsBySeverity.map((d) => ({
        severity: d.severity,
        count: d._count.id,
      })),
      defectsByClass: defectsByClass.map((d) => ({
        classification: d.classification,
        count: d._count.id,
      })),
      reportsByType: reportsByType.map((r) => ({
        type: r.inspectionType,
        count: r._count.id,
      })),
      reportsOverTime: Object.entries(reportsByDate).map(([date, count]) => ({
        date,
        count,
      })),
      monthlyTrend: Object.entries(reportsByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({
          month,
          count,
        })),
      recentActivity: recentReports,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
