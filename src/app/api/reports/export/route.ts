import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  generateReportsCSV,
  generateDefectsCSV,
  mapReportToExport,
  mapDefectToExport,
} from "@/lib/export";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import type { Prisma, ReportStatus, InspectionType, PropertyType } from "@prisma/client";

/**
 * GET /api/reports/export - Export reports to CSV
 *
 * Query params:
 * - type: "reports" | "defects" (default: "reports")
 * - status: filter by status (comma-separated)
 * - inspectionType: filter by inspection type (comma-separated)
 * - propertyType: filter by property type (comma-separated)
 * - dateFrom: filter by inspection date from
 * - dateTo: filter by inspection date to
 * - search: search in report number, address, client name
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting - strict limit for exports
  const rateLimitResult = rateLimit(request, RATE_LIMIT_PRESETS.strict);
  if (rateLimitResult) return rateLimitResult;

  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const exportType = url.searchParams.get("type") || "reports";
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status");
    const inspectionType = url.searchParams.get("inspectionType");
    const propertyType = url.searchParams.get("propertyType");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    // Build where clause
    const where: Prisma.ReportWhereInput = {};

    // Base filter: user's reports (or all if admin)
    if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      const inspectorId = url.searchParams.get("inspectorId");
      if (inspectorId) {
        where.inspectorId = inspectorId;
      }
    } else {
      where.inspectorId = user.id;
    }

    // Text search
    if (search.trim()) {
      where.OR = [
        { reportNumber: { contains: search, mode: "insensitive" } },
        { propertyAddress: { contains: search, mode: "insensitive" } },
        { propertyCity: { contains: search, mode: "insensitive" } },
        { clientName: { contains: search, mode: "insensitive" } },
      ];
    }

    // Status filter
    if (status) {
      const statuses = status.split(",").filter(Boolean) as ReportStatus[];
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
    }

    // Inspection type filter
    if (inspectionType) {
      const types = inspectionType.split(",").filter(Boolean) as InspectionType[];
      if (types.length === 1) {
        where.inspectionType = types[0];
      } else if (types.length > 1) {
        where.inspectionType = { in: types };
      }
    }

    // Property type filter
    if (propertyType) {
      const types = propertyType.split(",").filter(Boolean) as PropertyType[];
      if (types.length === 1) {
        where.propertyType = types[0];
      } else if (types.length > 1) {
        where.propertyType = { in: types };
      }
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.inspectionDate = {};
      if (dateFrom) {
        where.inspectionDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.inspectionDate.lte = new Date(dateTo);
      }
    }

    let csv: string;
    let filename: string;

    if (exportType === "defects") {
      // Export defects from matching reports
      const reports = await prisma.report.findMany({
        where,
        select: {
          reportNumber: true,
          defects: {
            select: {
              defectNumber: true,
              title: true,
              description: true,
              location: true,
              classification: true,
              severity: true,
              observation: true,
              analysis: true,
              opinion: true,
              codeReference: true,
              copReference: true,
              probableCause: true,
              recommendation: true,
              priorityLevel: true,
              createdAt: true,
              _count: {
                select: { photos: true },
              },
            },
            orderBy: { defectNumber: "asc" },
          },
        },
        orderBy: { reportNumber: "asc" },
      });

      const defects = reports.flatMap((report) =>
        report.defects.map((defect) => mapDefectToExport(defect, report.reportNumber))
      );

      csv = generateDefectsCSV(defects);
      filename = `ranz-defects-export-${new Date().toISOString().split("T")[0]}.csv`;
    } else {
      // Export reports
      const reports = await prisma.report.findMany({
        where,
        select: {
          id: true,
          reportNumber: true,
          status: true,
          propertyAddress: true,
          propertyCity: true,
          propertyRegion: true,
          propertyPostcode: true,
          propertyType: true,
          inspectionDate: true,
          inspectionType: true,
          clientName: true,
          clientEmail: true,
          clientPhone: true,
          weatherConditions: true,
          accessMethod: true,
          createdAt: true,
          updatedAt: true,
          submittedAt: true,
          approvedAt: true,
          inspector: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              defects: true,
              photos: true,
              roofElements: true,
            },
          },
        },
        orderBy: { reportNumber: "asc" },
      });

      const exportData = reports.map(mapReportToExport);
      csv = generateReportsCSV(exportData);
      filename = `ranz-reports-export-${new Date().toISOString().split("T")[0]}.csv`;
    }

    // Create audit log for export
    await prisma.auditLog.create({
      data: {
        reportId: "00000000-0000-0000-0000-000000000000", // System-level action
        userId: user.id,
        action: "DOWNLOADED",
        details: {
          type: "bulk_export",
          exportType,
          filters: {
            search: search || null,
            status: status || null,
            inspectionType: inspectionType || null,
            propertyType: propertyType || null,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
          },
        },
      },
    });

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting reports:", error);
    return NextResponse.json(
      { error: "Failed to export reports" },
      { status: 500 }
    );
  }
}
