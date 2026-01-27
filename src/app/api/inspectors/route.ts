import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/inspectors - List public inspector profiles
 * This is a public endpoint - no authentication required
 * Supports filtering by region, specialisation, and availability
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query params
    const region = searchParams.get("region");
    const specialisation = searchParams.get("specialisation");
    const availability = searchParams.get("availability");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build where clause
    const where: Record<string, unknown> = {
      role: "INSPECTOR",
      status: "ACTIVE",
      isPublicListed: true,
    };

    // Filter by region (service areas)
    if (region) {
      where.serviceAreas = {
        has: region,
      };
    }

    // Filter by specialisation
    if (specialisation) {
      where.specialisations = {
        has: specialisation,
      };
    }

    // Filter by availability
    if (availability) {
      where.availabilityStatus = availability;
    }

    // Search by name
    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Get inspectors with stats
    const [inspectors, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          qualifications: true,
          lbpNumber: true,
          yearsExperience: true,
          specialisations: true,
          serviceAreas: true,
          availabilityStatus: true,
          publicBio: true,
          company: true,
          createdAt: true,
          _count: {
            select: {
              reports: {
                where: {
                  status: {
                    in: ["APPROVED", "FINALISED"],
                  },
                },
              },
            },
          },
        },
        orderBy: [
          { availabilityStatus: "asc" }, // AVAILABLE first
          { yearsExperience: "desc" },
          { name: "asc" },
        ],
        take: Math.min(limit, 50),
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    // Transform response
    const results = inspectors.map((inspector) => ({
      id: inspector.id,
      name: inspector.name,
      company: inspector.company,
      lbpNumber: inspector.lbpNumber,
      yearsExperience: inspector.yearsExperience,
      specialisations: inspector.specialisations,
      serviceAreas: inspector.serviceAreas,
      availabilityStatus: inspector.availabilityStatus,
      publicBio: inspector.publicBio,
      completedReports: inspector._count.reports,
      memberSince: inspector.createdAt,
    }));

    return NextResponse.json({
      inspectors: results,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + results.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching inspectors:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspectors" },
      { status: 500 }
    );
  }
}
