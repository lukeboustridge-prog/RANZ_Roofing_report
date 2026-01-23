import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const complianceAssessmentSchema = z.object({
  checklistResults: z.record(z.string(), z.record(z.string(), z.string())),
  nonComplianceSummary: z.string().optional().nullable(),
});

/**
 * GET /api/compliance/[reportId] - Get compliance assessment for a report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { userId } = await auth();
    const { reportId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify report exists and user has access
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        inspectorId: user.id,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Get compliance assessment
    const assessment = await prisma.complianceAssessment.findUnique({
      where: { reportId },
    });

    if (!assessment) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No compliance assessment found for this report",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: assessment.id,
        reportId: assessment.reportId,
        checklistResults: assessment.checklistResults,
        nonComplianceSummary: assessment.nonComplianceSummary,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching compliance assessment:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance assessment" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/compliance/[reportId] - Save/update compliance assessment for a report
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { userId } = await auth();
    const { reportId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify report exists and user has access
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        inspectorId: user.id,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check if report is finalised
    if (report.status === "FINALISED") {
      return NextResponse.json(
        { error: "Cannot modify compliance assessment for a finalised report" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = complianceAssessmentSchema.parse(body);

    // Upsert compliance assessment
    const assessment = await prisma.complianceAssessment.upsert({
      where: { reportId },
      create: {
        reportId,
        checklistResults: validatedData.checklistResults as object,
        nonComplianceSummary: validatedData.nonComplianceSummary,
      },
      update: {
        checklistResults: validatedData.checklistResults as object,
        nonComplianceSummary: validatedData.nonComplianceSummary,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId,
        userId: user.id,
        action: "COMPLIANCE_ASSESSMENT_SAVED",
        details: {
          checklistCount: Object.keys(validatedData.checklistResults).length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: assessment.id,
        reportId: assessment.reportId,
        checklistResults: assessment.checklistResults,
        nonComplianceSummary: assessment.nonComplianceSummary,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error saving compliance assessment:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save compliance assessment" },
      { status: 500 }
    );
  }
}
