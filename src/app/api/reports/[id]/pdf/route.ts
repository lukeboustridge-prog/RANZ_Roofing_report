import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";

// Dynamic imports to prevent @react-pdf/renderer from being analyzed during build
// This avoids the "Html should not be imported outside pages/_document" error
async function loadPdfModules() {
  const [{ renderToBuffer }, { ReportPDF }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/report-template"),
  ]);
  return { renderToBuffer, ReportPDF };
}

// GET /api/reports/[id]/pdf - Generate PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply strict rate limiting for PDF generation (expensive operation)
  const rateLimitResult = rateLimit(request, RATE_LIMIT_PRESETS.pdf);
  if (rateLimitResult) return rateLimitResult;

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

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        inspector: {
          select: {
            name: true,
            email: true,
            qualifications: true,
            lbpNumber: true,
            yearsExperience: true,
          },
        },
        photos: {
          orderBy: { sortOrder: "asc" },
        },
        defects: {
          orderBy: { defectNumber: "asc" },
          include: {
            photos: true,
            roofElement: true,
          },
        },
        roofElements: {
          orderBy: { createdAt: "asc" },
          include: {
            photos: {
              orderBy: { sortOrder: "asc" },
              take: 5,
            },
          },
        },
        complianceAssessment: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Verify ownership
    if (report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Type for expert declaration data
    interface ExpertDeclarationData {
      expertiseConfirmed: boolean;
      codeOfConductAccepted: boolean;
      courtComplianceAccepted: boolean;
      falseEvidenceUnderstood: boolean;
      impartialityConfirmed: boolean;
      inspectionConducted: boolean;
      evidenceIntegrity: boolean;
    }

    // Transform report data for PDF generation
    const reportData = {
      ...report,
      // Transform JSON fields to strings for PDF template
      scopeOfWorks: report.scopeOfWorks ? String(report.scopeOfWorks) : null,
      methodology: report.methodology ? String(report.methodology) : null,
      equipment: Array.isArray(report.equipment) ? report.equipment as string[] : null,
      conclusions: report.conclusions ? String(report.conclusions) : null,
      expertDeclaration: report.expertDeclaration as ExpertDeclarationData | null,
      // Transform roofElements to include photos properly
      roofElements: report.roofElements.map(element => ({
        ...element,
        photos: element.photos.map(photo => ({
          url: photo.url,
          caption: photo.caption,
          photoType: photo.photoType,
        })),
      })),
      complianceAssessment: report.complianceAssessment
        ? {
            checklistResults: report.complianceAssessment.checklistResults as Record<string, Record<string, string>>,
            nonComplianceSummary: report.complianceAssessment.nonComplianceSummary,
          }
        : null,
    };

    // Generate PDF (using dynamic imports to avoid build issues)
    const { renderToBuffer, ReportPDF } = await loadPdfModules();
    const pdfBuffer = await renderToBuffer(ReportPDF({ report: reportData }));

    // Update report with PDF generation timestamp
    await prisma.report.update({
      where: { id },
      data: { pdfGeneratedAt: new Date() },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "PDF_GENERATED",
        details: {},
      },
    });

    // Convert NodeJS Buffer to Uint8Array for Response
    const pdfUint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(pdfUint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${report.reportNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
