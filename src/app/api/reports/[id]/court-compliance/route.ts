import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import type { InspectionType } from "@prisma/client";

/**
 * High Court Rules Schedule 4 Compliance Requirements for Expert Witness Reports
 */
interface ComplianceCheck {
  id: string;
  label: string;
  description: string;
  required: boolean;
  passed: boolean;
  details: string;
  reference: string; // High Court Rules reference
}

interface ComplianceResult {
  isCompliant: boolean;
  score: number; // 0-100
  requiredChecks: number;
  passedChecks: number;
  checks: ComplianceCheck[];
  inspectionType: string;
  isCourtReport: boolean;
}

// Court report types that require High Court Rules compliance
const COURT_REPORT_TYPES: InspectionType[] = ["DISPUTE_RESOLUTION", "WARRANTY_CLAIM"];

/**
 * GET /api/reports/[id]/court-compliance - Check High Court Rules Schedule 4 compliance
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Fetch report with all required relationships
    const report = await prisma.report.findFirst({
      where: {
        id,
        OR: [
          { inspectorId: user.id },
          ...(["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)
            ? [{ id }]
            : []),
        ],
      },
      include: {
        inspector: {
          select: {
            name: true,
            qualifications: true,
            lbpNumber: true,
            yearsExperience: true,
            cvUrl: true,
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
            originalHash: true,
          },
        },
        defects: true,
        roofElements: true,
        complianceAssessment: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const inspectionType = report.inspectionType as InspectionType;
    const isCourtReport = COURT_REPORT_TYPES.includes(inspectionType);
    const expertDeclaration = report.expertDeclaration as Record<string, boolean> | null;

    // Build compliance checks
    const checks: ComplianceCheck[] = [];

    // 1. Expert Qualifications (Schedule 4, Part 1)
    checks.push({
      id: "qualifications",
      label: "Expert Qualifications",
      description: "Expert's qualifications and experience documented",
      required: true,
      passed: !!(
        report.inspector?.qualifications &&
        report.inspector?.lbpNumber
      ),
      details: report.inspector?.qualifications
        ? `LBP #${report.inspector.lbpNumber}, ${report.inspector.yearsExperience || "N/A"} years experience`
        : "Qualifications not documented",
      reference: "Schedule 4, Part 1, Clause 3",
    });

    // 2. Expert CV Attached (Schedule 4, Part 3)
    checks.push({
      id: "cv",
      label: "Curriculum Vitae",
      description: "Expert's CV available in appendix",
      required: isCourtReport,
      passed: !!report.inspector?.cvUrl,
      details: report.inspector?.cvUrl
        ? "CV attached"
        : "CV not attached",
      reference: "Schedule 4, Part 3, Clause 9",
    });

    // 3. Code of Conduct Compliance (Schedule 4, Part 2)
    checks.push({
      id: "codeOfConduct",
      label: "Code of Conduct",
      description: "Agreement to Expert Witness Code of Conduct",
      required: true,
      passed: !!(expertDeclaration?.codeOfConductAccepted),
      details: expertDeclaration?.codeOfConductAccepted
        ? "Code of conduct accepted"
        : "Code of conduct not accepted",
      reference: "Schedule 4, Part 2",
    });

    // 4. Impartiality Declaration (Schedule 4, Part 2, Clause 4)
    checks.push({
      id: "impartiality",
      label: "Impartiality Declaration",
      description: "Confirmation of independent, impartial opinion",
      required: true,
      passed: !!(expertDeclaration?.impartialityConfirmed),
      details: expertDeclaration?.impartialityConfirmed
        ? "Impartiality confirmed"
        : "Impartiality not confirmed",
      reference: "Schedule 4, Part 2, Clause 4",
    });

    // 5. Conflict of Interest Disclosure (Schedule 4, Part 3, Clause 8)
    const hasConflict = report.hasConflict as boolean | null;
    const conflictDisclosure = report.conflictDisclosure as string | null;
    checks.push({
      id: "conflictDisclosure",
      label: "Conflict Disclosure",
      description: "Any conflicts of interest properly disclosed",
      required: true,
      passed: hasConflict === false || (hasConflict === true && !!conflictDisclosure),
      details: hasConflict === false
        ? "No conflict declared"
        : hasConflict === true && conflictDisclosure
        ? "Conflict disclosed"
        : "Conflict status not addressed",
      reference: "Schedule 4, Part 3, Clause 8",
    });

    // 6. Scope and Methodology (Schedule 4, Part 3, Clause 6)
    checks.push({
      id: "methodology",
      label: "Methodology Documented",
      description: "Inspection methodology and scope clearly stated",
      required: true,
      passed: !!(report.scopeOfWorks || report.methodology),
      details: report.methodology
        ? "Methodology documented"
        : "Methodology not documented",
      reference: "Schedule 4, Part 3, Clause 6",
    });

    // 7. Evidence Integrity (Evidence Act 2006, Section 137)
    const photosWithHash = report.photos.filter((p) => p.originalHash);
    checks.push({
      id: "evidenceIntegrity",
      label: "Evidence Integrity",
      description: "Photo evidence hashes for chain of custody",
      required: isCourtReport,
      passed: photosWithHash.length === report.photos.length,
      details: `${photosWithHash.length}/${report.photos.length} photos have integrity hashes`,
      reference: "Evidence Act 2006, s.137",
    });

    // 8. EXIF Metadata (for evidentiary value)
    const photosWithExif = report.photos.filter(
      (p) => p.capturedAt || p.cameraMake || p.cameraModel
    );
    checks.push({
      id: "exifMetadata",
      label: "EXIF Metadata",
      description: "Photo timestamp and device metadata preserved",
      required: isCourtReport,
      passed: isCourtReport
        ? photosWithExif.length === report.photos.length
        : photosWithExif.length >= report.photos.length * 0.8, // 80% threshold for non-court
      details: `${photosWithExif.length}/${report.photos.length} photos have EXIF data`,
      reference: "Evidence Act 2006, s.25",
    });

    // 9. GPS Location (for evidentiary value)
    const photosWithGps = report.photos.filter(
      (p) => p.gpsLat !== null && p.gpsLng !== null
    );
    checks.push({
      id: "gpsLocation",
      label: "GPS Location Data",
      description: "Photo GPS coordinates to prove location",
      required: isCourtReport,
      passed: isCourtReport
        ? photosWithGps.length === report.photos.length
        : photosWithGps.length >= report.photos.length * 0.5,
      details: `${photosWithGps.length}/${report.photos.length} photos have GPS coordinates`,
      reference: "Evidence Act 2006, s.25",
    });

    // 10. Declaration Signed (Schedule 4, Part 3, Clause 10)
    checks.push({
      id: "declarationSigned",
      label: "Declaration Signed",
      description: "Expert declaration signed and dated",
      required: true,
      passed: !!report.declarationSigned && !!report.signedAt,
      details: report.signedAt
        ? `Signed on ${new Date(report.signedAt).toLocaleDateString("en-NZ")}`
        : "Not signed",
      reference: "Schedule 4, Part 3, Clause 10",
    });

    // 11. Court Compliance Agreement
    checks.push({
      id: "courtCompliance",
      label: "Court Compliance",
      description: "Agreement to comply with court directions",
      required: isCourtReport,
      passed: !!(expertDeclaration?.courtComplianceAccepted),
      details: expertDeclaration?.courtComplianceAccepted
        ? "Court compliance accepted"
        : "Court compliance not accepted",
      reference: "Schedule 4, Part 2, Clause 5",
    });

    // 12. Perjury Understanding
    checks.push({
      id: "perjuryUnderstanding",
      label: "Perjury Acknowledgment",
      description: "Understanding of consequences of false evidence",
      required: isCourtReport,
      passed: !!(expertDeclaration?.falseEvidenceUnderstood),
      details: expertDeclaration?.falseEvidenceUnderstood
        ? "Perjury warning acknowledged"
        : "Perjury warning not acknowledged",
      reference: "Crimes Act 1961, s.108",
    });

    // Calculate compliance score
    const requiredChecks = checks.filter((c) => c.required);
    const passedRequired = requiredChecks.filter((c) => c.passed);
    const score = requiredChecks.length > 0
      ? Math.round((passedRequired.length / requiredChecks.length) * 100)
      : 100;

    const result: ComplianceResult = {
      isCompliant: passedRequired.length === requiredChecks.length,
      score,
      requiredChecks: requiredChecks.length,
      passedChecks: passedRequired.length,
      checks,
      inspectionType,
      isCourtReport,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking court compliance:", error);
    return NextResponse.json(
      { error: "Failed to check compliance" },
      { status: 500 }
    );
  }
}
