import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportPDF } from "@/lib/pdf/report-template";

// GET /api/reports/[id]/pdf - Generate PDF
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
      expertDeclaration: report.expertDeclaration as ExpertDeclarationData | null,
      complianceAssessment: report.complianceAssessment
        ? {
            checklistResults: report.complianceAssessment.checklistResults as Record<string, Record<string, string>>,
            nonComplianceSummary: report.complianceAssessment.nonComplianceSummary,
          }
        : null,
    };

    // Generate PDF
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
