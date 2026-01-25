import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/inspectors/[id] - Get public inspector profile
 * This is a public endpoint - no authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const inspector = await prisma.user.findUnique({
      where: {
        id,
        role: "INSPECTOR",
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        qualifications: true,
        lbpNumber: true,
        yearsExperience: true,
        specialisations: true,
        createdAt: true,
        // Get report statistics (public info only)
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
    });

    if (!inspector) {
      return NextResponse.json(
        { error: "Inspector not found" },
        { status: 404 }
      );
    }

    // Get inspection type breakdown
    const inspectionTypes = await prisma.report.groupBy({
      by: ["inspectionType"],
      where: {
        inspectorId: id,
        status: {
          in: ["APPROVED", "FINALISED"],
        },
      },
      _count: {
        id: true,
      },
    });

    // Get average defects per report (quality indicator)
    const defectStats = await prisma.defect.aggregate({
      _count: {
        id: true,
      },
      where: {
        report: {
          inspectorId: id,
          status: {
            in: ["APPROVED", "FINALISED"],
          },
        },
      },
    });

    const completedReports = inspector._count.reports;
    const totalDefects = defectStats._count.id;
    const avgDefectsPerReport = completedReports > 0
      ? (totalDefects / completedReports).toFixed(1)
      : "0";

    // Calculate member since
    const memberSince = new Date(inspector.createdAt);
    const memberYears = Math.floor(
      (Date.now() - memberSince.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    return NextResponse.json({
      id: inspector.id,
      name: inspector.name,
      qualifications: inspector.qualifications,
      lbpNumber: inspector.lbpNumber,
      yearsExperience: inspector.yearsExperience,
      specialisations: inspector.specialisations,
      memberSince: inspector.createdAt,
      memberYears,
      stats: {
        completedReports,
        avgDefectsPerReport,
        inspectionTypes: inspectionTypes.map(t => ({
          type: t.inspectionType,
          count: t._count.id,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching inspector profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspector profile" },
      { status: 500 }
    );
  }
}
