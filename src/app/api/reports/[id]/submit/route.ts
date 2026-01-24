import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import type { InspectionType } from "@prisma/client";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completionPercentage: number;
  missingRequiredItems: string[];
  validationDetails: {
    propertyDetails: { complete: boolean; missing: string[] };
    inspectionDetails: { complete: boolean; missing: string[] };
    roofElements: { complete: boolean; count: number; minimum: number };
    defects: { documented: boolean; count: number };
    photos: { sufficient: boolean; count: number; minimum: number; withExif: number };
    compliance: { complete: boolean; coverage: number; required: number };
  };
}

// Required compliance checklists by inspection type
const REQUIRED_CHECKLISTS: Record<InspectionType, string[]> = {
  FULL_INSPECTION: ["e2_as1", "metal_roof_cop", "b2_durability"],
  VISUAL_ONLY: ["e2_as1"],
  NON_INVASIVE: ["e2_as1", "b2_durability"],
  INVASIVE: ["e2_as1", "metal_roof_cop", "b2_durability"],
  DISPUTE_RESOLUTION: ["e2_as1", "metal_roof_cop", "b2_durability"],
  PRE_PURCHASE: ["e2_as1", "b2_durability"],
  MAINTENANCE_REVIEW: ["e2_as1"],
  WARRANTY_CLAIM: ["e2_as1", "metal_roof_cop", "b2_durability"],
};

// Minimum photo requirements by inspection type
const MINIMUM_PHOTOS: Record<InspectionType, number> = {
  FULL_INSPECTION: 20,
  VISUAL_ONLY: 10,
  NON_INVASIVE: 15,
  INVASIVE: 25,
  DISPUTE_RESOLUTION: 30,
  PRE_PURCHASE: 15,
  MAINTENANCE_REVIEW: 10,
  WARRANTY_CLAIM: 25,
};

// Minimum roof elements by inspection type
const MINIMUM_ELEMENTS: Record<InspectionType, number> = {
  FULL_INSPECTION: 5,
  VISUAL_ONLY: 3,
  NON_INVASIVE: 4,
  INVASIVE: 5,
  DISPUTE_RESOLUTION: 5,
  PRE_PURCHASE: 4,
  MAINTENANCE_REVIEW: 3,
  WARRANTY_CLAIM: 5,
};

/**
 * POST /api/reports/[id]/submit - Validate and submit report for review
 */
export async function POST(
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

    // Fetch complete report with all related data
    const report = await prisma.report.findFirst({
      where: {
        id,
        inspectorId: user.id,
      },
      include: {
        inspector: {
          select: {
            name: true,
            qualifications: true,
            lbpNumber: true,
          },
        },
        roofElements: true,
        defects: {
          include: {
            photos: true,
          },
        },
        photos: {
          select: {
            id: true,
            capturedAt: true,
            gpsLat: true,
            gpsLng: true,
            cameraMake: true,
            cameraModel: true,
          },
        },
        complianceAssessment: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check if report is already finalised
    if (report.status === "FINALISED") {
      return NextResponse.json(
        { error: "Report is already finalised and cannot be resubmitted" },
        { status: 400 }
      );
    }

    // Perform validation
    const validation = validateReport(report);

    // If validation passes, update report status
    if (validation.isValid) {
      await prisma.report.update({
        where: { id },
        data: {
          status: "PENDING_REVIEW",
          updatedAt: new Date(),
        },
      });

      // Create audit log for submission
      await prisma.auditLog.create({
        data: {
          reportId: id,
          userId: user.id,
          action: "SUBMITTED",
          details: {
            completionPercentage: validation.completionPercentage,
            photosCount: validation.validationDetails.photos.count,
            defectsCount: validation.validationDetails.defects.count,
            elementsCount: validation.validationDetails.roofElements.count,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Report submitted for review",
        validation,
        newStatus: "PENDING_REVIEW",
      });
    }

    // Return validation errors without updating status
    return NextResponse.json({
      success: false,
      message: "Report validation failed. Please address the errors before submitting.",
      validation,
    });
  } catch (error) {
    console.error("Error submitting report:", error);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports/[id]/submit - Get validation status without submitting
 */
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
      include: {
        inspector: {
          select: {
            name: true,
            qualifications: true,
            lbpNumber: true,
          },
        },
        roofElements: true,
        defects: {
          include: {
            photos: true,
          },
        },
        photos: {
          select: {
            id: true,
            capturedAt: true,
            gpsLat: true,
            gpsLng: true,
            cameraMake: true,
            cameraModel: true,
          },
        },
        complianceAssessment: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const validation = validateReport(report);

    return NextResponse.json({
      success: true,
      validation,
      currentStatus: report.status,
    });
  } catch (error) {
    console.error("Error validating report:", error);
    return NextResponse.json(
      { error: "Failed to validate report" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateReport(report: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingRequiredItems: string[] = [];

  // 1. Validate Property Details
  const propertyMissing: string[] = [];
  if (!report.propertyAddress) propertyMissing.push("Property address");
  if (!report.propertyCity) propertyMissing.push("Property city");
  if (!report.propertyRegion) propertyMissing.push("Property region");
  if (!report.propertyPostcode) propertyMissing.push("Property postcode");
  if (!report.propertyType) propertyMissing.push("Property type");

  if (propertyMissing.length > 0) {
    errors.push(`Missing property details: ${propertyMissing.join(", ")}`);
    missingRequiredItems.push(...propertyMissing);
  }

  // 2. Validate Inspection Details
  const inspectionMissing: string[] = [];
  if (!report.inspectionDate) inspectionMissing.push("Inspection date");
  if (!report.inspectionType) inspectionMissing.push("Inspection type");
  if (!report.clientName) inspectionMissing.push("Client name");

  if (inspectionMissing.length > 0) {
    errors.push(`Missing inspection details: ${inspectionMissing.join(", ")}`);
    missingRequiredItems.push(...inspectionMissing);
  }

  // Weather conditions - warning only
  if (!report.weatherConditions) {
    warnings.push("Weather conditions not documented");
  }

  // Access method - warning only
  if (!report.accessMethod) {
    warnings.push("Access method not documented");
  }

  // 3. Validate Inspector Details
  if (!report.inspector?.name) {
    errors.push("Inspector name is required");
    missingRequiredItems.push("Inspector name");
  }
  if (!report.inspector?.lbpNumber) {
    warnings.push("Inspector LBP number not provided");
  }
  if (!report.inspector?.qualifications) {
    warnings.push("Inspector qualifications not documented");
  }

  // 4. Validate Roof Elements
  const minimumElements = MINIMUM_ELEMENTS[report.inspectionType as InspectionType] || 3;
  const elementCount = report.roofElements?.length || 0;

  if (elementCount < minimumElements) {
    errors.push(
      `Insufficient roof elements documented. Required: ${minimumElements}, Found: ${elementCount}`
    );
    missingRequiredItems.push(`Roof elements (need ${minimumElements - elementCount} more)`);
  }

  // 5. Validate Defects Documentation
  const defectCount = report.defects?.length || 0;
  const defectsWithoutPhotos = report.defects?.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d: any) => !d.photos || d.photos.length === 0
  ).length || 0;

  if (defectsWithoutPhotos > 0) {
    warnings.push(`${defectsWithoutPhotos} defect(s) have no supporting photos`);
  }

  // Check for defects without descriptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defectsWithoutDescription = report.defects?.filter((d: any) => !d.description).length || 0;
  if (defectsWithoutDescription > 0) {
    warnings.push(`${defectsWithoutDescription} defect(s) have no description`);
  }

  // 6. Validate Photos
  const minimumPhotos = MINIMUM_PHOTOS[report.inspectionType as InspectionType] || 10;
  const photoCount = report.photos?.length || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const photosWithExif = report.photos?.filter((p: any) => p.capturedAt || p.cameraMake || p.cameraModel).length || 0;

  if (photoCount < minimumPhotos) {
    errors.push(
      `Insufficient photos. Required: ${minimumPhotos}, Found: ${photoCount}`
    );
    missingRequiredItems.push(`Photos (need ${minimumPhotos - photoCount} more)`);
  }

  // EXIF warning - important for legal evidence
  const photosWithoutExif = photoCount - photosWithExif;
  if (photosWithoutExif > 0) {
    warnings.push(
      `${photosWithoutExif} photo(s) missing EXIF metadata. This may affect evidentiary value.`
    );
  }

  // 7. Validate Compliance Assessment
  const requiredChecklists = REQUIRED_CHECKLISTS[report.inspectionType as InspectionType] || ["e2_as1"];
  let complianceCoverage = 0;

  if (!report.complianceAssessment) {
    errors.push("Compliance assessment is required");
    missingRequiredItems.push("Compliance assessment");
  } else {
    const checklistResults = report.complianceAssessment.checklistResults as Record<string, Record<string, string>>;
    const completedChecklists = Object.keys(checklistResults || {});

    // Check which required checklists are missing
    const missingChecklists = requiredChecklists.filter(
      (c) => !completedChecklists.includes(c)
    );

    if (missingChecklists.length > 0) {
      const checklistNames: Record<string, string> = {
        e2_as1: "E2/AS1 External Moisture",
        metal_roof_cop: "Metal Roof COP",
        b2_durability: "B2 Durability",
      };
      const missingNames = missingChecklists.map((c) => checklistNames[c] || c);
      errors.push(`Missing required compliance checklists: ${missingNames.join(", ")}`);
      missingRequiredItems.push(...missingNames.map((n) => `${n} checklist`));
    }

    // Calculate compliance coverage
    complianceCoverage = Math.round(
      ((requiredChecklists.length - missingChecklists.length) / requiredChecklists.length) * 100
    );

    // Check for incomplete checklists (items not answered)
    for (const checklist of completedChecklists) {
      const results = checklistResults[checklist];
      const unansweredItems = Object.values(results || {}).filter(
        (v) => !v || v === ""
      ).length;
      if (unansweredItems > 0) {
        warnings.push(`${checklist} checklist has ${unansweredItems} unanswered item(s)`);
      }
    }
  }

  // 8. Validate Executive Summary for certain report types
  if (
    ["FULL_INSPECTION", "PRE_PURCHASE", "INSURANCE_CLAIM"].includes(report.inspectionType) &&
    !report.executiveSummary
  ) {
    warnings.push("Executive summary is recommended for this inspection type");
  }

  // Calculate completion percentage
  const totalChecks = 7; // property, inspection, inspector, elements, defects, photos, compliance
  let passedChecks = 0;

  if (propertyMissing.length === 0) passedChecks++;
  if (inspectionMissing.length === 0) passedChecks++;
  if (report.inspector?.name) passedChecks++;
  if (elementCount >= minimumElements) passedChecks++;
  if (defectCount >= 0) passedChecks++; // Defects documented (0 is valid)
  if (photoCount >= minimumPhotos) passedChecks++;
  if (report.complianceAssessment && complianceCoverage === 100) passedChecks++;

  const completionPercentage = Math.round((passedChecks / totalChecks) * 100);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completionPercentage,
    missingRequiredItems,
    validationDetails: {
      propertyDetails: {
        complete: propertyMissing.length === 0,
        missing: propertyMissing,
      },
      inspectionDetails: {
        complete: inspectionMissing.length === 0,
        missing: inspectionMissing,
      },
      roofElements: {
        complete: elementCount >= minimumElements,
        count: elementCount,
        minimum: minimumElements,
      },
      defects: {
        documented: true,
        count: defectCount,
      },
      photos: {
        sufficient: photoCount >= minimumPhotos,
        count: photoCount,
        minimum: minimumPhotos,
        withExif: photosWithExif,
      },
      compliance: {
        complete: report.complianceAssessment && complianceCoverage === 100,
        coverage: complianceCoverage,
        required: requiredChecklists.length,
      },
    },
  };
}
