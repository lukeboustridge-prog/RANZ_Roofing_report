import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";

// Wizard data schema for Risk & Scope Assessment
const wizardDataSchema = z.object({
  pathway: z.enum(["planning", "execution"]).nullable(),
  scope: z.enum(["new", "replace_same", "replace_change"]).nullable().optional(),
  pitch: z.enum(["standard", "low", "zero"]).optional(),
  complex: z.array(z.enum([
    "gutter", "skillion", "truss", "dormer", "container",
    "attic_storage", "h1_upgrade", "sips", "solar", "asbestos", "none"
  ])).optional(),
  age: z.enum(["old", "young"]).nullable().optional(),
  consent_status: z.enum(["yes", "emergency", "no_check"]).nullable().optional(),
  b_type: z.enum(["residential", "rental", "commercial"]).nullable().optional(),
  variation: z.enum(["yes", "no"]).nullable().optional(),
  exec_task: z.enum([
    "finish_eaves", "flashings", "penetration", "substitution", "insulation", "none"
  ]).optional(),
  discovery: z.enum(["structural", "checked_ok", "none"]).nullable().optional(),
  licence: z.enum(["yes", "no"]).nullable().optional(),
  supervision: z.enum(["self", "check", "remote"]).nullable().optional(),
  completion: z.enum(["in_progress", "finished", "dispute", "terminated"]).nullable().optional(),
}).nullable().optional();

const complianceAssessmentSchema = z.object({
  checklistResults: z.record(z.string(), z.record(z.string(), z.string())),
  nonComplianceSummary: z.string().optional().nullable(),
  wizardData: wizardDataSchema,
});

/**
 * GET /api/compliance/[reportId] - Get compliance assessment for a report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { reportId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
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
        wizardData: assessment.wizardData,
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
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { reportId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
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

    // Prepare wizardData - convert null to Prisma.JsonNull for proper DB storage
    const wizardDataValue = validatedData.wizardData
      ? (validatedData.wizardData as Prisma.InputJsonValue)
      : Prisma.JsonNull;

    // Compute denormalized compliance status
    const allStatuses: string[] = [];
    for (const checklist of Object.values(validatedData.checklistResults)) {
      for (const status of Object.values(checklist)) {
        allStatuses.push(status.toLowerCase());
      }
    }
    const assessedStatuses = allStatuses.filter(s => s !== "na");
    let complianceStatus: "PASS" | "FAIL" | "PARTIAL" | "NOT_ASSESSED" = "NOT_ASSESSED";
    if (assessedStatuses.length > 0) {
      if (allStatuses.includes("fail")) complianceStatus = "FAIL";
      else if (allStatuses.includes("partial")) complianceStatus = "PARTIAL";
      else complianceStatus = "PASS";
    }

    // Upsert compliance assessment and update denormalized status in parallel
    const [assessment] = await Promise.all([
      prisma.complianceAssessment.upsert({
        where: { reportId },
        create: {
          reportId,
          checklistResults: validatedData.checklistResults as Prisma.InputJsonValue,
          nonComplianceSummary: validatedData.nonComplianceSummary,
          wizardData: wizardDataValue,
        },
        update: {
          checklistResults: validatedData.checklistResults as Prisma.InputJsonValue,
          nonComplianceSummary: validatedData.nonComplianceSummary,
          wizardData: wizardDataValue,
        },
      }),
      prisma.report.update({
        where: { id: reportId },
        data: { complianceStatus },
      }),
    ]);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId,
        userId: user.id,
        action: "UPDATED",
        details: {
          type: "compliance_assessment",
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
        wizardData: assessment.wizardData,
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
