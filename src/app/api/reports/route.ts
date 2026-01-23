import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateReportNumber } from "@/lib/report-number";
import { z } from "zod";

const createReportSchema = z.object({
  propertyAddress: z.string().min(1),
  propertyCity: z.string().min(1),
  propertyRegion: z.string().min(1),
  propertyPostcode: z.string().min(1),
  propertyType: z.enum([
    "RESIDENTIAL_1",
    "RESIDENTIAL_2",
    "RESIDENTIAL_3",
    "COMMERCIAL_LOW",
    "COMMERCIAL_HIGH",
    "INDUSTRIAL",
  ]),
  buildingAge: z.number().nullable().optional(),
  inspectionDate: z.string().transform((s) => new Date(s)),
  inspectionType: z.enum([
    "FULL_INSPECTION",
    "VISUAL_ONLY",
    "NON_INVASIVE",
    "INVASIVE",
    "DISPUTE_RESOLUTION",
    "PRE_PURCHASE",
    "MAINTENANCE_REVIEW",
  ]),
  weatherConditions: z.string().optional(),
  accessMethod: z.string().optional(),
  limitations: z.string().optional(),
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
});

// GET /api/reports - List reports
export async function GET() {
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

    const reports = await prisma.report.findMany({
      where: { inspectorId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            photos: true,
            defects: true,
          },
        },
      },
    });

    return NextResponse.json(reports);
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

    const body = await request.json();
    const validatedData = createReportSchema.parse(body);

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

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}
