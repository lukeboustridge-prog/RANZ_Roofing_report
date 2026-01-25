import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { staleWhileRevalidate, cacheKeys, CACHE_TTL } from "@/lib/cache";

/**
 * Dashboard Statistics API
 * Returns aggregated statistics for the user's dashboard
 * Uses stale-while-revalidate caching for performance
 */

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET() {
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

    // Use stale-while-revalidate caching - return cached data immediately
    // while refreshing in background (60 second TTL)
    const stats = await staleWhileRevalidate(
      cacheKeys.dashboardStats(user.id),
      () => fetchDashboardStats(user.id),
      CACHE_TTL.SHORT
    );

    // Add cache headers for CDN/browser caching
    const response = NextResponse.json(stats);
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}

/**
 * Fetch dashboard statistics from database
 */
async function fetchDashboardStats(inspectorId: string) {
    // Get date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Run all queries in parallel for better performance
    const [
      // Report counts by status
      reportsByStatus,
      // Total reports
      totalReports,
      // Reports this month
      reportsThisMonth,
      // Reports this week
      reportsThisWeek,
      // Recent reports (last 30 days)
      recentReports,
      // Total photos
      totalPhotos,
      // Total defects
      totalDefects,
      // Defects by severity
      defectsBySeverity,
      // Reports by inspection type
      reportsByInspectionType,
      // Average defects per report
      avgDefectsPerReport,
      // Photos this month
      photosThisMonth,
    ] = await Promise.all([
      // Report counts by status
      prisma.report.groupBy({
        by: ["status"],
        where: { inspectorId },
        _count: { id: true },
      }),

      // Total reports
      prisma.report.count({
        where: { inspectorId },
      }),

      // Reports this month
      prisma.report.count({
        where: {
          inspectorId,
          createdAt: { gte: startOfMonth },
        },
      }),

      // Reports this week
      prisma.report.count({
        where: {
          inspectorId,
          createdAt: { gte: sevenDaysAgo },
        },
      }),

      // Recent reports (last 30 days) for trend
      prisma.report.findMany({
        where: {
          inspectorId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          createdAt: true,
          status: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      // Total photos
      prisma.photo.count({
        where: {
          report: { inspectorId },
        },
      }),

      // Total defects
      prisma.defect.count({
        where: {
          report: { inspectorId },
        },
      }),

      // Defects by severity
      prisma.defect.groupBy({
        by: ["severity"],
        where: {
          report: { inspectorId },
        },
        _count: { id: true },
      }),

      // Reports by inspection type
      prisma.report.groupBy({
        by: ["inspectionType"],
        where: { inspectorId },
        _count: { id: true },
      }),

      // Average defects per report (using raw query for aggregation)
      prisma.report.findMany({
        where: { inspectorId },
        select: {
          _count: { select: { defects: true } },
        },
      }),

      // Photos this month
      prisma.photo.count({
        where: {
          report: { inspectorId },
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    // Calculate average defects per report
    const avgDefects = avgDefectsPerReport.length > 0
      ? avgDefectsPerReport.reduce((sum, r) => sum + r._count.defects, 0) / avgDefectsPerReport.length
      : 0;

    // Transform status counts to object
    const statusCounts: Record<string, number> = {};
    reportsByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.id;
    });

    // Transform severity counts to object
    const severityCounts: Record<string, number> = {};
    defectsBySeverity.forEach((item) => {
      severityCounts[item.severity] = item._count.id;
    });

    // Transform inspection type counts to object
    const inspectionTypeCounts: Record<string, number> = {};
    reportsByInspectionType.forEach((item) => {
      inspectionTypeCounts[item.inspectionType] = item._count.id;
    });

    // Calculate daily report counts for trend chart (last 30 days)
    const dailyReportCounts: Array<{ date: string; count: number }> = [];
    const dateMap = new Map<string, number>();

    recentReports.forEach((report) => {
      const dateStr = report.createdAt.toISOString().split("T")[0];
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
    });

    // Fill in all days in the range
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      dailyReportCounts.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
      });
    }

    // Calculate completion rate (approved + finalised out of total non-draft)
    const completedCount = (statusCounts.APPROVED || 0) + (statusCounts.FINALISED || 0);
    const nonDraftCount = totalReports - (statusCounts.DRAFT || 0);
    const completionRate = nonDraftCount > 0 ? (completedCount / nonDraftCount) * 100 : 0;

    return {
      overview: {
        totalReports,
        reportsThisMonth,
        reportsThisWeek,
        totalPhotos,
        photosThisMonth,
        totalDefects,
        averageDefectsPerReport: Math.round(avgDefects * 10) / 10,
        completionRate: Math.round(completionRate),
      },
      reportsByStatus: statusCounts,
      defectsBySeverity: severityCounts,
      reportsByInspectionType: inspectionTypeCounts,
      trends: {
        dailyReports: dailyReportCounts,
      },
    };
}
