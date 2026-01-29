import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ZodError, z } from "zod";
import { CreateDefectSchema, formatZodError } from "@/lib/validations";

// Extended schema that includes reportId (not in the base schema)
const createDefectWithReportSchema = CreateDefectSchema.extend({
  reportId: z.string().min(1, "Report ID is required"),
});

// POST /api/defects - Create defect
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lookupField = getUserLookupField();
    const user = await prisma.user.findUnique({
      where: { [lookupField]: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createDefectWithReportSchema.parse(body);

    // Verify report exists and belongs to user
    const report = await prisma.report.findFirst({
      where: {
        id: validatedData.reportId,
        inspectorId: user.id,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Get next defect number for this report
    const maxDefect = await prisma.defect.aggregate({
      where: { reportId: report.id },
      _max: { defectNumber: true },
    });
    const defectNumber = (maxDefect._max.defectNumber || 0) + 1;

    const defect = await prisma.defect.create({
      data: {
        reportId: report.id,
        roofElementId: validatedData.roofElementId || null,
        defectNumber,
        title: validatedData.title,
        description: validatedData.description,
        location: validatedData.location,
        classification: validatedData.classification,
        severity: validatedData.severity,
        observation: validatedData.observation,
        analysis: validatedData.analysis || null,
        opinion: validatedData.opinion || null,
        codeReference: validatedData.codeReference || null,
        copReference: validatedData.copReference || null,
        probableCause: validatedData.probableCause || null,
        contributingFactors: validatedData.contributingFactors || null,
        recommendation: validatedData.recommendation || null,
        priorityLevel: validatedData.priorityLevel || null,
        estimatedCost: validatedData.estimatedCost || null,
        measurements: validatedData.measurements as object | undefined,
      },
      include: {
        photos: true,
        roofElement: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: report.id,
        userId: user.id,
        action: "DEFECT_ADDED",
        details: {
          defectId: defect.id,
          defectNumber,
          title: defect.title,
          classification: defect.classification,
          severity: defect.severity,
        },
      },
    });

    return NextResponse.json(defect, { status: 201 });
  } catch (error) {
    console.error("Error creating defect:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(formatZodError(error), { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create defect" },
      { status: 500 }
    );
  }
}

// GET /api/defects?reportId=xxx - List defects for a report
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lookupField = getUserLookupField();
    const user = await prisma.user.findUnique({
      where: { [lookupField]: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    // Verify report access
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        inspectorId: user.id,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const defects = await prisma.defect.findMany({
      where: { reportId },
      orderBy: { defectNumber: "asc" },
      include: {
        photos: true,
        roofElement: true,
      },
    });

    return NextResponse.json(defects);
  } catch (error) {
    console.error("Error fetching defects:", error);
    return NextResponse.json(
      { error: "Failed to fetch defects" },
      { status: 500 }
    );
  }
}
