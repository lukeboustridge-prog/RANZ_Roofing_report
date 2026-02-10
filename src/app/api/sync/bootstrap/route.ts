/**
 * GET /api/sync/bootstrap
 * Bootstrap endpoint for mobile app initialization
 * Returns user profile, checklists, templates, and recent reports
 */

import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    console.log(`[Bootstrap] Auth result: userId=${userId}, authSource=${authUser?.authSource}`);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get lastSyncAt from query params for incremental sync
    const { searchParams } = new URL(request.url);
    const lastSyncAt = searchParams.get("lastSyncAt");
    const lastSyncDate = lastSyncAt ? new Date(lastSyncAt) : null;

    // Get user with profile info
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId, authUser.authSource),
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        role: true,
        qualifications: true,
        lbpNumber: true,
        yearsExperience: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all active checklists
    const checklists = await prisma.checklist.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Transform checklists to API format
    const formattedChecklists = checklists.map((checklist) => ({
      id: checklist.id,
      name: checklist.name,
      category: checklist.category,
      standard: checklist.standard || checklist.category,
      items: checklist.items as Array<{
        id: string;
        section: string;
        item: string;
        description: string;
        required?: boolean;
      }>,
      createdAt: checklist.createdAt.toISOString(),
      updatedAt: checklist.updatedAt.toISOString(),
    }));

    // Fetch all active report templates
    const templates = await prisma.reportTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    // Transform templates to API format
    const formattedTemplates = templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      inspectionType: template.inspectionType,
      sections: template.sections as string[],
      checklists: template.checklists as { compliance?: string[] } | null,
      isDefault: template.isDefault,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    }));

    // Build report query - role-based visibility matching GET /api/reports
    const reportWhere: Record<string, unknown> = {
      ...(lastSyncDate ? { updatedAt: { gt: lastSyncDate } } : {}),
    };
    if (!["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(user.role)) {
      // Regular users only see their own reports
      reportWhere.inspectorId = user.id;
    }

    // Fetch recent reports (last 20, or only updated ones for incremental sync)
    const reports = await prisma.report.findMany({
      where: reportWhere,
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        reportNumber: true,
        propertyAddress: true,
        propertyCity: true,
        inspectionType: true,
        status: true,
        inspectorId: true,
        submittedAt: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            photos: true,
            defects: true,
          },
        },
      },
    });

    console.log(`[Bootstrap] User ${user.id} (${user.email}): found ${reports.length} reports`);

    // Transform reports to summary format
    const recentReports = reports.map((report) => ({
      id: report.id,
      reportNumber: report.reportNumber,
      propertyAddress: report.propertyAddress,
      propertyCity: report.propertyCity,
      inspectionType: report.inspectionType,
      status: report.status,
      inspectorId: report.inspectorId,
      submittedAt: report.submittedAt?.toISOString() ?? null,
      approvedAt: report.approvedAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      photoCount: report._count.photos,
      defectCount: report._count.defects,
    }));

    // Current sync timestamp
    const lastSyncAtResponse = new Date().toISOString();

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          clerkId: user.clerkId,
          email: user.email,
          name: user.name,
          role: user.role,
          qualifications: user.qualifications,
          lbpNumber: user.lbpNumber,
          yearsExperience: user.yearsExperience,
        },
        checklists: formattedChecklists,
        templates: formattedTemplates,
        recentReports,
        lastSyncAt: lastSyncAtResponse,
      },
    });
  } catch (error) {
    console.error("Error in bootstrap endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch bootstrap data" },
      { status: 500 }
    );
  }
}
