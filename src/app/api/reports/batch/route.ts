import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { generateReportsCSV, generateDefectsCSV, mapReportToExport, mapDefectToExport } from "@/lib/export";

const batchActionSchema = z.object({
  action: z.enum(["archive", "unarchive", "delete", "export"]),
  reportIds: z.array(z.string()).min(1, "At least one report must be selected"),
  exportType: z.enum(["reports", "defects"]).optional(),
});

/**
 * POST /api/reports/batch - Perform batch operations on multiple reports
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RATE_LIMIT_PRESETS.strict);
  if (rateLimitResult) return rateLimitResult;

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
    const { action, reportIds, exportType } = batchActionSchema.parse(body);

    // Build base query - users can only operate on their own reports (admins can do all)
    const whereClause = ["ADMIN", "SUPER_ADMIN"].includes(user.role)
      ? { id: { in: reportIds } }
      : { id: { in: reportIds }, inspectorId: user.id };

    // Verify all reports exist and user has access
    const reports = await prisma.report.findMany({
      where: whereClause,
      select: { id: true, reportNumber: true, status: true },
    });

    if (reports.length !== reportIds.length) {
      const foundIds = reports.map((r) => r.id);
      const missingIds = reportIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        {
          error: "Some reports not found or access denied",
          missingIds,
        },
        { status: 404 }
      );
    }

    switch (action) {
      case "archive": {
        // Can only archive reports that are FINALISED or APPROVED
        const archivableStatuses = ["FINALISED", "APPROVED"];
        const nonArchivable = reports.filter(
          (r) => !archivableStatuses.includes(r.status)
        );

        if (nonArchivable.length > 0) {
          return NextResponse.json(
            {
              error: "Some reports cannot be archived",
              details: `Only FINALISED or APPROVED reports can be archived. Found: ${nonArchivable
                .map((r) => `${r.reportNumber} (${r.status})`)
                .join(", ")}`,
            },
            { status: 400 }
          );
        }

        const result = await prisma.report.updateMany({
          where: whereClause,
          data: { status: "ARCHIVED" },
        });

        // Create audit logs
        await prisma.auditLog.createMany({
          data: reportIds.map((reportId) => ({
            reportId,
            userId: user.id,
            action: "STATUS_CHANGED",
            details: {
              previousStatus: "FINALISED",
              newStatus: "ARCHIVED",
              batchOperation: true,
            },
          })),
        });

        return NextResponse.json({
          success: true,
          message: `${result.count} report(s) archived`,
          count: result.count,
        });
      }

      case "unarchive": {
        // Can only unarchive ARCHIVED reports
        const nonArchived = reports.filter((r) => r.status !== "ARCHIVED");

        if (nonArchived.length > 0) {
          return NextResponse.json(
            {
              error: "Some reports are not archived",
              details: `Only ARCHIVED reports can be unarchived. Found: ${nonArchived
                .map((r) => `${r.reportNumber} (${r.status})`)
                .join(", ")}`,
            },
            { status: 400 }
          );
        }

        const result = await prisma.report.updateMany({
          where: whereClause,
          data: { status: "FINALISED" },
        });

        // Create audit logs
        await prisma.auditLog.createMany({
          data: reportIds.map((reportId) => ({
            reportId,
            userId: user.id,
            action: "STATUS_CHANGED",
            details: {
              previousStatus: "ARCHIVED",
              newStatus: "FINALISED",
              batchOperation: true,
            },
          })),
        });

        return NextResponse.json({
          success: true,
          message: `${result.count} report(s) unarchived`,
          count: result.count,
        });
      }

      case "delete": {
        // Can only delete DRAFT reports
        const nonDrafts = reports.filter((r) => r.status !== "DRAFT");

        if (nonDrafts.length > 0) {
          return NextResponse.json(
            {
              error: "Some reports cannot be deleted",
              details: `Only DRAFT reports can be deleted. Found: ${nonDrafts
                .map((r) => `${r.reportNumber} (${r.status})`)
                .join(", ")}`,
            },
            { status: 400 }
          );
        }

        const result = await prisma.report.deleteMany({
          where: whereClause,
        });

        return NextResponse.json({
          success: true,
          message: `${result.count} draft report(s) deleted`,
          count: result.count,
        });
      }

      case "export": {
        // Export selected reports to CSV
        const type = exportType || "reports";

        if (type === "defects") {
          const reportsWithDefects = await prisma.report.findMany({
            where: whereClause,
            select: {
              reportNumber: true,
              defects: {
                select: {
                  defectNumber: true,
                  title: true,
                  description: true,
                  location: true,
                  classification: true,
                  severity: true,
                  observation: true,
                  analysis: true,
                  opinion: true,
                  codeReference: true,
                  copReference: true,
                  probableCause: true,
                  recommendation: true,
                  priorityLevel: true,
                  createdAt: true,
                  _count: { select: { photos: true } },
                },
                orderBy: { defectNumber: "asc" },
              },
            },
            orderBy: { reportNumber: "asc" },
          });

          const defects = reportsWithDefects.flatMap((report) =>
            report.defects.map((defect) =>
              mapDefectToExport(defect, report.reportNumber)
            )
          );

          const csv = generateDefectsCSV(defects);
          const filename = `ranz-defects-batch-${new Date().toISOString().split("T")[0]}.csv`;

          return new NextResponse(csv, {
            status: 200,
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          });
        } else {
          const fullReports = await prisma.report.findMany({
            where: whereClause,
            select: {
              id: true,
              reportNumber: true,
              status: true,
              propertyAddress: true,
              propertyCity: true,
              propertyRegion: true,
              propertyPostcode: true,
              propertyType: true,
              inspectionDate: true,
              inspectionType: true,
              clientName: true,
              clientEmail: true,
              clientPhone: true,
              weatherConditions: true,
              accessMethod: true,
              createdAt: true,
              updatedAt: true,
              submittedAt: true,
              approvedAt: true,
              inspector: { select: { name: true, email: true } },
              _count: {
                select: { defects: true, photos: true, roofElements: true },
              },
            },
            orderBy: { reportNumber: "asc" },
          });

          const exportData = fullReports.map(mapReportToExport);
          const csv = generateReportsCSV(exportData);
          const filename = `ranz-reports-batch-${new Date().toISOString().split("T")[0]}.csv`;

          return new NextResponse(csv, {
            status: 200,
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          });
        }
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error performing batch operation:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to perform batch operation" },
      { status: 500 }
    );
  }
}
