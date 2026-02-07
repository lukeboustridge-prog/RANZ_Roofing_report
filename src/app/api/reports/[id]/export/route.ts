import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import { evidenceExportService } from "@/services/evidence-export-service";

// GET /api/reports/[id]/export - Generate evidence export package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply strict rate limiting (exports are expensive like PDF generation)
  const rateLimitResult = await rateLimit(request, RATE_LIMIT_PRESETS.pdf);
  if (rateLimitResult) return rateLimitResult;

  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check report exists and user has access
    const report = await prisma.report.findUnique({
      where: { id },
      select: {
        id: true,
        inspectorId: true,
        status: true,
        reportNumber: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Verify access - owner or reviewer/admin can export
    const isOwner = report.inspectorId === user.id;
    const isReviewerOrAdmin = ["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(
      user.role
    );

    if (!isOwner && !isReviewerOrAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate the evidence export package
    const result = await evidenceExportService.createExportPackage(id);

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "EVIDENCE_EXPORTED",
        details: {
          filename: result.filename,
          hash: result.hash,
        },
      },
    });

    return NextResponse.json({
      url: result.url,
      hash: result.hash,
      filename: result.filename,
    });
  } catch (error) {
    console.error("Error generating evidence export:", error);
    return NextResponse.json(
      { error: "Failed to generate evidence export package" },
      { status: 500 }
    );
  }
}
