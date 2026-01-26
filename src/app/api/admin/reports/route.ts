import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";

/**
 * GET /api/admin/reports - List all reports with filters (admin/reviewer only)
 * Supports filtering by status, inspector, date range, and search
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(request, RATE_LIMIT_PRESETS.standard);
  if (rateLimitResult) return rateLimitResult;

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

    // Check reviewer/admin permissions
    if (!["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Reviewer or admin access required." },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const inspectorId = searchParams.get("inspectorId");
    const reviewerId = searchParams.get("reviewerId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      // Support multiple statuses separated by comma
      const statuses = status.split(",");
      where.status = statuses.length === 1 ? status : { in: statuses };
    }

    if (inspectorId) where.inspectorId = inspectorId;
    if (reviewerId) where.reviewerId = reviewerId;

    if (dateFrom || dateTo) {
      where.inspectionDate = {};
      if (dateFrom) (where.inspectionDate as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo) (where.inspectionDate as Record<string, Date>).lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { reportNumber: { contains: search, mode: "insensitive" } },
        { propertyAddress: { contains: search, mode: "insensitive" } },
        { propertyCity: { contains: search, mode: "insensitive" } },
        { clientName: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy
    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    // Fetch reports with pagination
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        select: {
          id: true,
          reportNumber: true,
          status: true,
          propertyAddress: true,
          propertyCity: true,
          propertyRegion: true,
          inspectionDate: true,
          inspectionType: true,
          clientName: true,
          createdAt: true,
          updatedAt: true,
          submittedAt: true,
          approvedAt: true,
          inspector: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewerId: true,
          _count: {
            select: {
              photos: true,
              defects: true,
              roofElements: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    // Get status counts for the filter sidebar
    const statusCounts = await prisma.report.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    });

    const statusCountsMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts: statusCountsMap,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
