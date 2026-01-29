import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateReportNumber } from "@/lib/report-number";
import { z } from "zod";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { Prisma } from "@prisma/client";

const duplicateSchema = z.object({
  // What to copy
  includeDefects: z.boolean().optional().default(false),
  includeRoofElements: z.boolean().optional().default(true),
  includeComplianceAssessment: z.boolean().optional().default(false),

  // Overrides for the new report
  propertyAddress: z.string().optional(),
  propertyCity: z.string().optional(),
  propertyRegion: z.string().optional(),
  propertyPostcode: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  inspectionDate: z.coerce.date().optional(),
});

/**
 * POST /api/reports/[id]/duplicate - Duplicate a report as a template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(request, RATE_LIMIT_PRESETS.standard);
  if (rateLimitResult) return rateLimitResult;

  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id } = await params;

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

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const options = duplicateSchema.parse(body);

    // Fetch the source report
    const sourceReport = await prisma.report.findFirst({
      where: {
        id,
        // Allow duplicating own reports or if admin
        OR: [
          { inspectorId: user.id },
          ...(["ADMIN", "SUPER_ADMIN"].includes(user.role) ? [{}] : []),
        ],
      },
      include: {
        roofElements: options.includeRoofElements,
        defects: options.includeDefects
          ? {
              include: {
                photos: false, // Don't copy photo links for defects
              },
            }
          : false,
        complianceAssessment: options.includeComplianceAssessment,
      },
    });

    if (!sourceReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Generate new report number
    const reportNumber = await generateReportNumber();

    // Create the duplicate report
    const newReport = await prisma.report.create({
      data: {
        reportNumber,
        inspectorId: user.id,
        status: "DRAFT",

        // Property details (can be overridden)
        propertyAddress: options.propertyAddress || sourceReport.propertyAddress,
        propertyCity: options.propertyCity || sourceReport.propertyCity,
        propertyRegion: options.propertyRegion || sourceReport.propertyRegion,
        propertyPostcode: options.propertyPostcode || sourceReport.propertyPostcode,
        propertyType: sourceReport.propertyType,
        buildingAge: sourceReport.buildingAge,

        // Inspection details
        inspectionType: sourceReport.inspectionType,
        inspectionDate: options.inspectionDate || new Date(),
        // New inspection - don't copy weather
        accessMethod: sourceReport.accessMethod,
        limitations: sourceReport.limitations,

        // Client details (can be overridden)
        clientName: options.clientName || sourceReport.clientName,
        clientEmail: options.clientEmail || sourceReport.clientEmail,
        clientPhone: options.clientPhone || sourceReport.clientPhone,
        clientCompany: sourceReport.clientCompany,
        engagingParty: sourceReport.engagingParty,

        // Report structure (copy as template if they exist)
        scopeOfWorks: sourceReport.scopeOfWorks ?? Prisma.JsonNull,
        methodology: sourceReport.methodology ?? Prisma.JsonNull,
        equipment: sourceReport.equipment ?? Prisma.JsonNull,

        // Sign-off (must be new)
        declarationSigned: false,
      },
    });

    // Copy roof elements if requested
    if (options.includeRoofElements && sourceReport.roofElements) {
      await prisma.roofElement.createMany({
        data: sourceReport.roofElements.map((element) => ({
          reportId: newReport.id,
          elementType: element.elementType,
          location: element.location,
          claddingType: element.claddingType,
          claddingProfile: element.claddingProfile,
          material: element.material,
          manufacturer: element.manufacturer,
          colour: element.colour,
          pitch: element.pitch,
          area: element.area,
          ageYears: element.ageYears,
          // Clear condition data (new inspection)
          conditionRating: null,
          conditionNotes: null,
          meetsCop: null,
          meetsE2: null,
        })),
      });
    }

    // Copy defects if requested (as template, without photos)
    if (options.includeDefects && sourceReport.defects) {
      await prisma.defect.createMany({
        data: sourceReport.defects.map((defect, index) => ({
          reportId: newReport.id,
          defectNumber: index + 1,
          title: defect.title,
          description: defect.description,
          location: defect.location,
          classification: defect.classification,
          severity: defect.severity,
          observation: "", // Must be filled in for new inspection
          codeReference: defect.codeReference,
          copReference: defect.copReference,
          recommendation: defect.recommendation,
          priorityLevel: defect.priorityLevel,
        })),
      });
    }

    // Copy compliance assessment structure if requested
    if (options.includeComplianceAssessment && sourceReport.complianceAssessment) {
      await prisma.complianceAssessment.create({
        data: {
          reportId: newReport.id,
          // Empty checklist results - must be filled in for new inspection
          checklistResults: {},
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: newReport.id,
        userId: user.id,
        action: "CREATED",
        details: {
          type: "duplicate",
          sourceReportId: sourceReport.id,
          sourceReportNumber: sourceReport.reportNumber,
          options: {
            includeDefects: options.includeDefects,
            includeRoofElements: options.includeRoofElements,
            includeComplianceAssessment: options.includeComplianceAssessment,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Report duplicated successfully",
      report: {
        id: newReport.id,
        reportNumber: newReport.reportNumber,
        status: newReport.status,
        propertyAddress: newReport.propertyAddress,
      },
      sourceReport: {
        id: sourceReport.id,
        reportNumber: sourceReport.reportNumber,
      },
    });
  } catch (error) {
    console.error("Error duplicating report:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to duplicate report" },
      { status: 500 }
    );
  }
}
