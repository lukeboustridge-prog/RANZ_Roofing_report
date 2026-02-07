import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateReportNumber } from "@/lib/report-number";
import { ZodError } from "zod";
import { CreateReportSchema, formatZodError } from "@/lib/validations";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import type { Prisma, ReportStatus, InspectionType, PropertyType, DefectSeverity } from "@prisma/client";

// Valid sort fields and orders
const VALID_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "inspectionDate",
  "reportNumber",
  "propertyAddress",
  "status",
] as const;
const VALID_SORT_ORDERS = ["asc", "desc"] as const;

// GET /api/reports - List reports with search, filtering, and pagination
export async function GET(request: NextRequest) {
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
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status");
    const inspectionType = url.searchParams.get("inspectionType");
    const propertyType = url.searchParams.get("propertyType");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const severity = url.searchParams.get("severity");
    const complianceStatus = url.searchParams.get("complianceStatus");
    const dateField = url.searchParams.get("dateField") || "inspectionDate";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);

    // Build where clause
    const where: Prisma.ReportWhereInput = {};

    // Base filter: user's reports (or all if admin/reviewer)
    if (["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(user.role)) {
      // Admins and reviewers can see all reports, optionally filtered by inspector
      const inspectorId = url.searchParams.get("inspectorId");
      if (inspectorId) {
        where.inspectorId = inspectorId;
      }
    } else {
      // Regular users only see their own reports
      where.inspectorId = user.id;
    }

    // Text search (report number, address, client name)
    if (search.trim()) {
      where.OR = [
        { reportNumber: { contains: search, mode: "insensitive" } },
        { propertyAddress: { contains: search, mode: "insensitive" } },
        { propertyCity: { contains: search, mode: "insensitive" } },
        { clientName: { contains: search, mode: "insensitive" } },
        { clientEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    // Status filter (supports comma-separated values)
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

    // Defect severity filter (SRCH-01) - finds reports with at least one defect of this severity
    if (severity) {
      where.defects = {
        some: {
          severity: severity as DefectSeverity
        }
      };
    }

    // Date range filter with dynamic field selection (SRCH-04)
    if (dateFrom || dateTo) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (dateFrom) {
        dateFilter.gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Set to end of day for inclusive range
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.lte = endDate;
      }

      // Map dateField to correct Prisma field
      const validDateFields = ["createdAt", "inspectionDate", "submittedAt", "approvedAt"] as const;
      const selectedField = validDateFields.includes(dateField as any) ? dateField : "inspectionDate";

      if (selectedField === "createdAt") {
        where.createdAt = dateFilter;
      } else if (selectedField === "submittedAt") {
        where.submittedAt = dateFilter;
      } else if (selectedField === "approvedAt") {
        where.approvedAt = dateFilter;
      } else {
        where.inspectionDate = dateFilter;
      }
    }

    // Validate and build sort
    const validSortBy = VALID_SORT_FIELDS.includes(sortBy as typeof VALID_SORT_FIELDS[number])
      ? sortBy
      : "createdAt";
    const validSortOrder = VALID_SORT_ORDERS.includes(sortOrder as typeof VALID_SORT_ORDERS[number])
      ? sortOrder
      : "desc";

    const orderBy: Prisma.ReportOrderByWithRelationInput = {
      [validSortBy]: validSortOrder,
    };

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Compliance status filter (SRCH-02) - requires post-fetch filtering due to nested JSON
    const needsComplianceFilter = !!complianceStatus;

    // Execute queries in parallel
    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          inspector: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              photos: true,
              defects: true,
              roofElements: true,
            },
          },
          ...(needsComplianceFilter ? { complianceAssessment: true } : {}),
        },
      }),
      prisma.report.count({ where }),
    ]);

    // Post-fetch compliance status filtering
    let filteredReports = reports;
    let filteredCount = totalCount;

    if (complianceStatus && needsComplianceFilter) {
      filteredReports = reports.filter(report => {
        const assessment = (report as any).complianceAssessment;
        if (!assessment?.checklistResults) return false;
        const results = assessment.checklistResults as Record<string, Record<string, string>>;
        for (const checklist of Object.values(results)) {
          for (const status of Object.values(checklist)) {
            if (status === complianceStatus) return true;
          }
        }
        return false;
      });
      filteredCount = filteredReports.length;

      // Strip complianceAssessment from response to avoid leaking extra data
      filteredReports = filteredReports.map(report => {
        const { complianceAssessment, ...rest } = report as any;
        return rest;
      });
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(filteredCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      reports: filteredReports,
      pagination: {
        page,
        limit,
        totalCount: filteredCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        search: search || null,
        status: status || null,
        inspectionType: inspectionType || null,
        propertyType: propertyType || null,
        severity: severity || null,
        complianceStatus: complianceStatus || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        dateField: dateField || "inspectionDate",
      },
      sort: {
        field: validSortBy,
        order: validSortOrder,
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

// POST /api/reports - Create report
export async function POST(request: NextRequest) {
  // Apply rate limiting - standard limit for report creation
  const rateLimitResult = await rateLimit(request, RATE_LIMIT_PRESETS.standard);
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

    const body = await request.json();
    const validatedData = CreateReportSchema.parse(body);

    const reportNumber = await generateReportNumber();

    const report = await prisma.report.create({
      data: {
        reportNumber,
        inspectorId: user.id,
        propertyAddress: validatedData.propertyAddress,
        propertyCity: validatedData.propertyCity,
        propertyRegion: validatedData.propertyRegion,
        propertyPostcode: validatedData.propertyPostcode,
        propertyType: validatedData.propertyType,
        buildingAge: validatedData.buildingAge,
        inspectionDate: validatedData.inspectionDate,
        inspectionType: validatedData.inspectionType,
        weatherConditions: validatedData.weatherConditions || null,
        accessMethod: validatedData.accessMethod || null,
        limitations: validatedData.limitations || null,
        clientName: validatedData.clientName,
        clientEmail: validatedData.clientEmail || null,
        clientPhone: validatedData.clientPhone || null,
        status: "DRAFT",
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: report.id,
        userId: user.id,
        action: "CREATED",
        details: { reportNumber },
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Error creating report:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(formatZodError(error), { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}
