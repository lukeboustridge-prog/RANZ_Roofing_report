import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

const BATCH_SIZE = 5;
const MAX_REPORTS = 50;

// Dynamic imports to prevent @react-pdf/renderer from being analyzed during build
async function loadPdfModules() {
  const [{ renderToBuffer }, { ReportPDF }] = await Promise.all([
    import("@/lib/pdf/react-pdf-wrapper"),
    import("@/lib/pdf/report-template"),
  ]);
  return { renderToBuffer, ReportPDF };
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

type ReportWithIncludes = Awaited<ReturnType<typeof fetchReports>>[number];

async function fetchReports(reportIds: string[]) {
  return prisma.report.findMany({
    where: { id: { in: reportIds } },
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
}

async function generatePdfForReport(
  report: ReportWithIncludes,
  renderToBuffer: Awaited<ReturnType<typeof loadPdfModules>>["renderToBuffer"],
  ReportPDF: Awaited<ReturnType<typeof loadPdfModules>>["ReportPDF"]
): Promise<void> {
  // Transform report data for PDF generation (same pattern as /api/reports/[id]/pdf)
  const reportData = {
    ...report,
    scopeOfWorks: report.scopeOfWorks ? String(report.scopeOfWorks) : null,
    methodology: report.methodology ? String(report.methodology) : null,
    equipment: Array.isArray(report.equipment)
      ? (report.equipment as string[])
      : null,
    conclusions: report.conclusions ? String(report.conclusions) : null,
    expertDeclaration: report.expertDeclaration as ExpertDeclarationData | null,
    roofElements: report.roofElements.map((element) => ({
      ...element,
      photos: element.photos.map((photo) => ({
        url: photo.url,
        caption: photo.caption,
        photoType: photo.photoType,
      })),
    })),
    complianceAssessment: report.complianceAssessment
      ? {
          checklistResults:
            report.complianceAssessment.checklistResults as Record<
              string,
              Record<string, string>
            >,
          nonComplianceSummary:
            report.complianceAssessment.nonComplianceSummary,
        }
      : null,
  };

  // Generate PDF buffer (we don't return bytes here, just ensure generation succeeds)
  await renderToBuffer(ReportPDF({ report: reportData }));
}

// POST /api/admin/reports/batch-pdf - Generate PDFs for multiple reports
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

    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { reportIds } = body;

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return NextResponse.json(
        { error: "reportIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (reportIds.length > MAX_REPORTS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_REPORTS} reports per batch request` },
        { status: 400 }
      );
    }

    // Fetch all reports in a single query
    const reports = await fetchReports(reportIds);

    if (reports.length === 0) {
      return NextResponse.json(
        { error: "No reports found for the provided IDs" },
        { status: 404 }
      );
    }

    // Load PDF modules once (dynamic import to avoid build issues)
    const { renderToBuffer, ReportPDF } = await loadPdfModules();

    // Process in batches of BATCH_SIZE using Promise.allSettled
    const results: Array<{
      id: string;
      reportNumber: string;
      success: boolean;
      error?: string;
    }> = [];

    for (let i = 0; i < reports.length; i += BATCH_SIZE) {
      const batch = reports.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((report) =>
          generatePdfForReport(report, renderToBuffer, ReportPDF)
        )
      );

      // Map results back to report info
      batchResults.forEach((result, index) => {
        const report = batch[index];
        if (result.status === "fulfilled") {
          results.push({
            id: report.id,
            reportNumber: report.reportNumber,
            success: true,
          });
        } else {
          console.error(
            `[Batch PDF] Failed to generate PDF for report ${report.reportNumber}:`,
            result.reason
          );
          results.push({
            id: report.id,
            reportNumber: report.reportNumber,
            success: false,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : "PDF generation failed",
          });
        }
      });
    }

    // Update pdfGeneratedAt for successful reports
    const successfulIds = results
      .filter((r) => r.success)
      .map((r) => r.id);

    if (successfulIds.length > 0) {
      await prisma.report.updateMany({
        where: { id: { in: successfulIds } },
        data: { pdfGeneratedAt: new Date() },
      });

      // Create audit log entries for each successful PDF generation
      await Promise.all(
        successfulIds.map((reportId) =>
          prisma.auditLog.create({
            data: {
              reportId,
              userId: user.id,
              action: "PDF_GENERATED",
              details: { batchOperation: true },
            },
          })
        )
      );
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      successful,
      failed,
      results,
    });
  } catch (error) {
    console.error("[Batch PDF] Error:", error);
    return NextResponse.json(
      { error: "Failed to process batch PDF generation" },
      { status: 500 }
    );
  }
}
