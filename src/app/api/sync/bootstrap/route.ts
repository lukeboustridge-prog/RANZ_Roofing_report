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

    console.log(`[Bootstrap] Report query: role=${user.role}, lastSyncAt=${lastSyncAt || 'null'}, where=${JSON.stringify(reportWhere)}`);

    // Fetch recent reports with full related data for mobile sync
    const reports = await prisma.report.findMany({
      where: reportWhere,
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        photos: {
          orderBy: { sortOrder: "asc" },
        },
        defects: {
          orderBy: { defectNumber: "asc" },
        },
        roofElements: {
          orderBy: { createdAt: "asc" },
        },
        complianceAssessment: true,
        _count: {
          select: {
            photos: true,
            defects: true,
          },
        },
      },
    });

    console.log(`[Bootstrap] User ${user.id} (${user.email}): found ${reports.length} reports`);
    if (reports.length > 0) {
      console.log(`[Bootstrap] Reports: ${reports.map(r => `${r.reportNumber}(inspectorId=${r.inspectorId}, photos=${r._count.photos}, defects=${r._count.defects})`).join(', ')}`);
    }

    // Transform reports with full nested data for mobile sync
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
      // Full related data for mobile down-sync
      photos: report.photos.map((p) => ({
        id: p.id,
        reportId: p.reportId,
        defectId: p.defectId,
        roofElementId: p.roofElementId,
        filename: p.filename,
        originalFilename: p.originalFilename,
        mimeType: p.mimeType,
        fileSize: p.fileSize,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
        photoType: p.photoType,
        capturedAt: p.capturedAt?.toISOString() ?? null,
        gpsLat: p.gpsLat,
        gpsLng: p.gpsLng,
        gpsAltitude: p.gpsAltitude,
        cameraMake: p.cameraMake,
        cameraModel: p.cameraModel,
        exposureTime: p.exposureTime,
        fNumber: p.fNumber,
        iso: p.iso,
        focalLength: p.focalLength,
        originalHash: p.originalHash,
        caption: p.caption,
        annotations: p.annotations,
        annotatedUrl: p.annotatedUrl,
        sortOrder: p.sortOrder,
        createdAt: p.createdAt.toISOString(),
      })),
      defects: report.defects.map((d) => ({
        id: d.id,
        reportId: d.reportId,
        roofElementId: d.roofElementId,
        defectNumber: d.defectNumber,
        title: d.title,
        description: d.description,
        location: d.location,
        classification: d.classification,
        severity: d.severity,
        observation: d.observation,
        analysis: d.analysis,
        opinion: d.opinion,
        codeReference: d.codeReference,
        copReference: d.copReference,
        recommendation: d.recommendation,
        priorityLevel: d.priorityLevel,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      roofElements: report.roofElements.map((e) => ({
        id: e.id,
        reportId: e.reportId,
        elementType: e.elementType,
        location: e.location,
        claddingType: e.claddingType,
        material: e.material,
        manufacturer: e.manufacturer,
        pitch: e.pitch,
        area: e.area,
        conditionRating: e.conditionRating,
        conditionNotes: e.conditionNotes,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      complianceAssessment: report.complianceAssessment ? {
        id: report.complianceAssessment.id,
        reportId: report.complianceAssessment.reportId,
        checklistResults: report.complianceAssessment.checklistResults,
        nonComplianceSummary: report.complianceAssessment.nonComplianceSummary,
        createdAt: report.complianceAssessment.createdAt.toISOString(),
        updatedAt: report.complianceAssessment.updatedAt.toISOString(),
      } : null,
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
