import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// NZ Regions with display labels
const NZ_REGIONS: Record<string, string> = {
  northland: "Northland",
  auckland: "Auckland",
  waikato: "Waikato",
  "bay-of-plenty": "Bay of Plenty",
  gisborne: "Gisborne",
  "hawkes-bay": "Hawke's Bay",
  taranaki: "Taranaki",
  "manawatu-whanganui": "Manawatu-Whanganui",
  wellington: "Wellington",
  tasman: "Tasman",
  nelson: "Nelson",
  marlborough: "Marlborough",
  "west-coast": "West Coast",
  canterbury: "Canterbury",
  otago: "Otago",
  southland: "Southland",
};

/**
 * GET /api/analytics/regions - Get regional analytics data
 * Requires admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (!user || !["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all reports with their regions
    const reports = await prisma.report.findMany({
      select: {
        propertyRegion: true,
        createdAt: true,
        _count: {
          select: {
            defects: true,
          },
        },
      },
    });

    // Get inspectors by service area
    const inspectors = await prisma.user.findMany({
      where: { role: "INSPECTOR", status: "ACTIVE" },
      select: {
        serviceAreas: true,
      },
    });

    // Get defects by region (through reports)
    const reportsWithDefects = await prisma.report.findMany({
      select: {
        propertyRegion: true,
        defects: {
          select: {
            classification: true,
          },
        },
      },
    });

    // Calculate date ranges for trend
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Process data by region
    const regionData: Record<string, {
      totalReports: number;
      totalInspectors: number;
      totalDefects: number;
      defectCounts: Record<string, number>;
      recentReports: number;
      previousReports: number;
    }> = {};

    // Initialize all regions
    for (const regionKey of Object.keys(NZ_REGIONS)) {
      regionData[regionKey] = {
        totalReports: 0,
        totalInspectors: 0,
        totalDefects: 0,
        defectCounts: {},
        recentReports: 0,
        previousReports: 0,
      };
    }

    // Count reports per region
    for (const report of reports) {
      const region = report.propertyRegion?.toLowerCase() || "unknown";
      if (regionData[region]) {
        regionData[region].totalReports++;
        regionData[region].totalDefects += report._count.defects;

        // Track trends
        if (report.createdAt >= thirtyDaysAgo) {
          regionData[region].recentReports++;
        } else if (report.createdAt >= sixtyDaysAgo) {
          regionData[region].previousReports++;
        }
      }
    }

    // Count defect types per region
    for (const report of reportsWithDefects) {
      const region = report.propertyRegion?.toLowerCase() || "unknown";
      if (regionData[region]) {
        for (const defect of report.defects) {
          regionData[region].defectCounts[defect.classification] =
            (regionData[region].defectCounts[defect.classification] || 0) + 1;
        }
      }
    }

    // Count inspectors per region (by service area)
    for (const inspector of inspectors) {
      for (const area of inspector.serviceAreas || []) {
        const region = area.toLowerCase();
        if (regionData[region]) {
          regionData[region].totalInspectors++;
        }
      }
    }

    // Build response
    const regions = Object.entries(regionData).map(([region, data]) => {
      // Find most common defect
      let mostCommonDefect = "";
      let maxCount = 0;
      for (const [defectType, count] of Object.entries(data.defectCounts)) {
        if (count > maxCount) {
          maxCount = count;
          mostCommonDefect = defectType;
        }
      }

      // Calculate trend
      const trend = data.previousReports > 0
        ? Math.round(((data.recentReports - data.previousReports) / data.previousReports) * 100)
        : data.recentReports > 0 ? 100 : 0;

      return {
        region,
        regionLabel: NZ_REGIONS[region] || region,
        totalReports: data.totalReports,
        totalInspectors: data.totalInspectors,
        totalDefects: data.totalDefects,
        avgDefectsPerReport: data.totalReports > 0
          ? Math.round((data.totalDefects / data.totalReports) * 10) / 10
          : 0,
        mostCommonDefect,
        trend,
      };
    });

    // Calculate totals
    const totals = {
      reports: reports.length,
      inspectors: inspectors.length,
      defects: reports.reduce((sum, r) => sum + r._count.defects, 0),
    };

    // Find top and growth regions
    const sortedByReports = [...regions].sort((a, b) => b.totalReports - a.totalReports);
    const sortedByGrowth = [...regions].sort((a, b) => b.trend - a.trend);

    return NextResponse.json({
      regions,
      totals,
      topRegion: sortedByReports[0]?.region || "",
      growthRegion: sortedByGrowth[0]?.region || "",
    });
  } catch (error) {
    console.error("Regional analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch regional analytics" },
      { status: 500 }
    );
  }
}
