import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getUserLookupField } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/analytics/defects - Get defect trend analytics
 * Requires admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const lookupField = getUserLookupField();
    const user = await prisma.user.findUnique({
      where: { [lookupField]: userId },
      select: { role: true },
    });

    if (!user || !["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "6months";

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3months":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "12months":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "6months":
      default:
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    }

    // Previous period for trend calculation
    const periodLength = now.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodLength);

    // Fetch defects data
    const [
      defects,
      previousDefects,
      defectsByClassification,
      defectsBySeverity,
      totalReports,
    ] = await Promise.all([
      prisma.defect.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        select: {
          classification: true,
          severity: true,
          createdAt: true,
        },
      }),
      prisma.defect.findMany({
        where: {
          createdAt: {
            gte: previousStart,
            lt: startDate,
          },
        },
        select: {
          classification: true,
        },
      }),
      prisma.defect.groupBy({
        by: ["classification"],
        where: { createdAt: { gte: startDate } },
        _count: { classification: true },
      }),
      prisma.defect.groupBy({
        by: ["severity"],
        where: { createdAt: { gte: startDate } },
        _count: { severity: true },
      }),
      prisma.report.count({
        where: { createdAt: { gte: startDate } },
      }),
    ]);

    // Calculate previous period counts by classification
    const previousCounts: Record<string, number> = {};
    for (const d of previousDefects) {
      previousCounts[d.classification] = (previousCounts[d.classification] || 0) + 1;
    }

    // Process classification data
    const totalDefects = defects.length;
    const byClassification = defectsByClassification.map((item) => {
      const previousCount = previousCounts[item.classification] || 0;
      const currentCount = item._count.classification;
      const trendValue = previousCount > 0
        ? Math.round(((currentCount - previousCount) / previousCount) * 100)
        : currentCount > 0 ? 100 : 0;

      return {
        classification: item.classification,
        count: currentCount,
        percentage: totalDefects > 0 ? Math.round((currentCount / totalDefects) * 100) : 0,
        trend: trendValue > 5 ? "up" as const : trendValue < -5 ? "down" as const : "stable" as const,
        trendValue,
      };
    });

    // Process severity data
    const bySeverity = defectsBySeverity.map((item) => ({
      severity: item.severity,
      count: item._count.severity,
      percentage: totalDefects > 0 ? Math.round((item._count.severity / totalDefects) * 100) : 0,
    }));

    // Calculate monthly trends
    const monthlyData: Record<string, {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    }> = {};

    for (const defect of defects) {
      const monthKey = defect.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
      }
      monthlyData[monthKey].total++;
      const severity = defect.severity.toLowerCase() as "critical" | "high" | "medium" | "low";
      if (severity in monthlyData[monthKey]) {
        monthlyData[monthKey][severity]++;
      }
    }

    const monthlyTrends = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-NZ", { month: "short" }),
        ...data,
      }));

    // Get top defect types (by title pattern)
    const defectTitles = await prisma.defect.groupBy({
      by: ["classification"],
      where: { createdAt: { gte: startDate } },
      _count: { classification: true },
      orderBy: { _count: { classification: "desc" } },
      take: 5,
    });

    const topDefectTypes = defectTitles.map((d) => ({
      type: d.classification,
      count: d._count.classification,
    }));

    return NextResponse.json({
      byClassification,
      bySeverity,
      monthlyTrends,
      topDefectTypes,
      totalDefects,
      avgPerReport: totalReports > 0 ? Math.round((totalDefects / totalReports) * 10) / 10 : 0,
    });
  } catch (error) {
    console.error("Defect analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch defect analytics" },
      { status: 500 }
    );
  }
}
