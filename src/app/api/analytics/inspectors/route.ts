import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getUserLookupField } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/analytics/inspectors - Get inspector performance analytics
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

    // Get all inspectors with their reports
    const inspectors = await prisma.user.findMany({
      where: { role: "INSPECTOR" },
      select: {
        id: true,
        name: true,
        email: true,
        serviceAreas: true,
        specialisations: true,
        createdAt: true,
        reports: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            approvedAt: true,
            submittedAt: true,
            revisionRound: true,
            _count: {
              select: {
                photos: true,
                defects: true,
              },
            },
          },
        },
      },
    });

    // Calculate 30 days ago for active status
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Process inspector data
    const inspectorStats = inspectors.map((inspector) => {
      const completedReports = inspector.reports.filter(r =>
        ["APPROVED", "FINALISED"].includes(r.status)
      );
      const pendingReports = inspector.reports.filter(r =>
        ["DRAFT", "IN_PROGRESS", "PENDING_REVIEW", "UNDER_REVIEW", "REVISION_REQUIRED"].includes(r.status)
      );

      // Calculate total photos and defects
      const totalPhotos = inspector.reports.reduce((sum, r) => sum + r._count.photos, 0);
      const totalDefects = inspector.reports.reduce((sum, r) => sum + r._count.defects, 0);

      // Calculate averages
      const totalReports = inspector.reports.length;
      const avgPhotosPerReport = totalReports > 0 ? totalPhotos / totalReports : 0;
      const avgDefectsPerReport = totalReports > 0 ? totalDefects / totalReports : 0;

      // Calculate completion time (days between creation and approval)
      const completionTimes: number[] = [];
      for (const report of completedReports) {
        if (report.approvedAt && report.submittedAt) {
          const days = (report.approvedAt.getTime() - report.submittedAt.getTime()) / (1000 * 60 * 60 * 24);
          completionTimes.push(days);
        }
      }
      const avgCompletionDays = completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

      // Calculate revision rate
      const reportsWithRevisions = inspector.reports.filter(r => (r.revisionRound || 0) > 0).length;
      const submittedReports = inspector.reports.filter(r =>
        !["DRAFT", "IN_PROGRESS"].includes(r.status)
      ).length;
      const revisionRate = submittedReports > 0
        ? (reportsWithRevisions / submittedReports) * 100
        : 0;

      // Calculate approval rate (first-time approval)
      const firstTimeApprovals = inspector.reports.filter(r =>
        ["APPROVED", "FINALISED"].includes(r.status) && (r.revisionRound || 0) === 0
      ).length;
      const approvalRate = completedReports.length > 0
        ? (firstTimeApprovals / completedReports.length) * 100
        : 0;

      // Find last active date
      const lastReport = inspector.reports
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const lastActive = lastReport?.createdAt || null;

      return {
        id: inspector.id,
        name: inspector.name || "Unknown",
        email: inspector.email,
        totalReports,
        completedReports: completedReports.length,
        pendingReports: pendingReports.length,
        totalPhotos,
        totalDefects,
        avgPhotosPerReport: Math.round(avgPhotosPerReport * 10) / 10,
        avgDefectsPerReport: Math.round(avgDefectsPerReport * 10) / 10,
        avgCompletionDays: Math.round(avgCompletionDays * 10) / 10,
        revisionRate: Math.round(revisionRate * 10) / 10,
        approvalRate: Math.round(approvalRate * 10) / 10,
        regions: inspector.serviceAreas || [],
        specialisations: inspector.specialisations || [],
        lastActive,
        memberSince: inspector.createdAt,
        rating: null, // Could be populated from a ratings system
      };
    });

    // Calculate summary stats
    const totalInspectors = inspectorStats.length;
    const activeInspectors = inspectorStats.filter(i =>
      i.lastActive && i.lastActive >= thirtyDaysAgo
    ).length;
    const totalReportsAll = inspectorStats.reduce((sum, i) => sum + i.totalReports, 0);
    const avgReportsPerInspector = totalInspectors > 0
      ? totalReportsAll / totalInspectors
      : 0;
    const avgApprovalRate = inspectorStats.length > 0
      ? inspectorStats.reduce((sum, i) => sum + i.approvalRate, 0) / inspectorStats.length
      : 0;

    return NextResponse.json({
      inspectors: inspectorStats,
      summary: {
        totalInspectors,
        activeInspectors,
        avgReportsPerInspector: Math.round(avgReportsPerInspector * 10) / 10,
        avgApprovalRate: Math.round(avgApprovalRate * 10) / 10,
      },
    });
  } catch (error) {
    console.error("Inspector analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspector analytics" },
      { status: 500 }
    );
  }
}
