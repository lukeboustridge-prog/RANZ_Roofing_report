import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ZodError, z } from "zod";
import { CreateRoofElementSchema, formatZodError } from "@/lib/validations";

// Extended schema that includes reportId (not in the base schema)
const createElementWithReportSchema = CreateRoofElementSchema.extend({
  reportId: z.string().min(1, "Report ID is required"),
});

// POST /api/elements - Create element
export async function POST(request: NextRequest) {
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
    const validatedData = createElementWithReportSchema.parse(body);

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

    const element = await prisma.roofElement.create({
      data: {
        reportId: report.id,
        elementType: validatedData.elementType,
        location: validatedData.location,
        claddingType: validatedData.claddingType || null,
        material: validatedData.material || null,
        manufacturer: validatedData.manufacturer || null,
        pitch: validatedData.pitch || null,
        area: validatedData.area || null,
        conditionRating: validatedData.conditionRating || null,
        conditionNotes: validatedData.conditionNotes || null,
      },
    });

    return NextResponse.json(element, { status: 201 });
  } catch (error) {
    console.error("Error creating element:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(formatZodError(error), { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create element" },
      { status: 500 }
    );
  }
}

// GET /api/elements?reportId=xxx - List elements for a report
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

    const elements = await prisma.roofElement.findMany({
      where: { reportId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            defects: true,
            photos: true,
          },
        },
      },
    });

    return NextResponse.json(elements);
  } catch (error) {
    console.error("Error fetching elements:", error);
    return NextResponse.json(
      { error: "Failed to fetch elements" },
      { status: 500 }
    );
  }
}
