import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateReportNumber } from "@/lib/report-number";
import { ZodError } from "zod";
import { CreateReportSchema, formatZodError } from "@/lib/validations";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";

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
  // Apply rate limiting - standard limit for report creation
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
