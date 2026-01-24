import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

// Type for executive summary
interface ExecutiveSummary {
  keyFindings: string[];
  majorDefects: string;
  overallCondition: string;
  criticalRecommendations: string[];
}

// Schema for executive summary
const executiveSummarySchema = z.object({
  keyFindings: z.array(z.string()).default([]),
  majorDefects: z.string().default(""),
  overallCondition: z.string().default(""),
  criticalRecommendations: z.array(z.string()).default([]),
});

// GET /api/reports/[id]/executive-summary - Get executive summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const report = await prisma.report.findFirst({
      where: {
        id,
        inspectorId: user.id,
      },
      select: {
        id: true,
        executiveSummary: true,
        defects: {
          select: {
            id: true,
            title: true,
            severity: true,
            classification: true,
            recommendation: true,
          },
          orderBy: { defectNumber: "asc" },
        },
        roofElements: {
          select: {
            id: true,
            elementType: true,
            conditionRating: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Parse existing executive summary or return default
    const defaultSummary: ExecutiveSummary = {
      keyFindings: [],
      majorDefects: "",
      overallCondition: "",
      criticalRecommendations: [],
    };

    let executiveSummary: ExecutiveSummary = defaultSummary;
    if (report.executiveSummary) {
      try {
        executiveSummary = executiveSummarySchema.parse(report.executiveSummary) as ExecutiveSummary;
      } catch {
        executiveSummary = defaultSummary;
      }
    }

    return NextResponse.json({
      executiveSummary,
      // Include report data for auto-suggestions
      defects: report.defects,
      roofElements: report.roofElements,
    });
  } catch (error) {
    console.error("Error fetching executive summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch executive summary" },
      { status: 500 }
    );
  }
}

// PUT /api/reports/[id]/executive-summary - Update executive summary
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const report = await prisma.report.findFirst({
      where: {
        id,
        inspectorId: user.id,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Don't allow editing finalised reports
    if (report.status === "FINALISED") {
      return NextResponse.json(
        { error: "Cannot edit finalised report" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = executiveSummarySchema.parse(body);

    // Update report with executive summary
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        executiveSummary: validatedData,
      },
      select: {
        id: true,
        executiveSummary: true,
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "UPDATED",
        details: {
          field: "executiveSummary",
          updatedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      executiveSummary: updatedReport.executiveSummary,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating executive summary:", error);
    return NextResponse.json(
      { error: "Failed to update executive summary" },
      { status: 500 }
    );
  }
}
