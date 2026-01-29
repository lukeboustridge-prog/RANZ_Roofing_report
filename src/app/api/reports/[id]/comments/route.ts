import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import type { CommentSeverity } from "@prisma/client";
import { sendNewCommentsNotification } from "@/lib/email";

// GET /api/reports/[id]/comments - Get all review comments for a report
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

    // Check if user has access to this report
    const report = await prisma.report.findUnique({
      where: { id },
      select: { inspectorId: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Only inspector or reviewers can see comments
    const isInspector = report.inspectorId === user.id;
    const isReviewer = ["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role);

    if (!isInspector && !isReviewer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query params for filtering
    const url = new URL(request.url);
    const resolved = url.searchParams.get("resolved");
    const severity = url.searchParams.get("severity");
    const revisionRound = url.searchParams.get("revisionRound");

    // Build filter
    const filter: {
      reportId: string;
      resolved?: boolean;
      severity?: CommentSeverity;
      revisionRound?: number;
    } = { reportId: id };

    if (resolved !== null) {
      filter.resolved = resolved === "true";
    }
    if (severity) {
      filter.severity = severity as CommentSeverity;
    }
    if (revisionRound) {
      filter.revisionRound = parseInt(revisionRound);
    }

    const comments = await prisma.reviewComment.findMany({
      where: filter,
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { revisionRound: "desc" },
        { severity: "asc" }, // CRITICAL first
        { createdAt: "desc" },
      ],
    });

    // Get summary stats
    const stats = await prisma.reviewComment.groupBy({
      by: ["severity", "resolved"],
      where: { reportId: id },
      _count: true,
    });

    const summary = {
      total: comments.length,
      resolved: comments.filter((c) => c.resolved).length,
      unresolved: comments.filter((c) => !c.resolved).length,
      bySeverity: {
        CRITICAL: comments.filter((c) => c.severity === "CRITICAL").length,
        ISSUE: comments.filter((c) => c.severity === "ISSUE").length,
        NOTE: comments.filter((c) => c.severity === "NOTE").length,
        SUGGESTION: comments.filter((c) => c.severity === "SUGGESTION").length,
      },
    };

    return NextResponse.json({
      comments,
      summary,
      stats,
    });
  } catch (error) {
    console.error("Error fetching review comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/reports/[id]/comments - Add a review comment
export async function POST(
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

    // Only reviewers can add comments
    if (!["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only reviewers can add comments" },
        { status: 403 }
      );
    }

    const report = await prisma.report.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        revisionRound: true,
        reportNumber: true,
        propertyAddress: true,
        inspector: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Can only add comments to reports under review
    if (!["PENDING_REVIEW", "UNDER_REVIEW"].includes(report.status)) {
      return NextResponse.json(
        { error: "Can only add comments to reports under review" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      comment,
      severity = "NOTE",
      defectId,
      roofElementId,
      photoId,
      section,
    } = body;

    if (!comment || !comment.trim()) {
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      );
    }

    // Validate severity
    const validSeverities = ["CRITICAL", "ISSUE", "NOTE", "SUGGESTION"];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${validSeverities.join(", ")}` },
        { status: 400 }
      );
    }

    // Create the comment
    const reviewComment = await prisma.reviewComment.create({
      data: {
        reportId: id,
        reviewerId: user.id,
        comment: comment.trim(),
        severity: severity as CommentSeverity,
        defectId: defectId || null,
        roofElementId: roofElementId || null,
        photoId: photoId || null,
        section: section || null,
        revisionRound: report.revisionRound + 1, // Next revision round
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "REVIEWED",
        details: {
          action: "comment_added",
          commentId: reviewComment.id,
          severity,
          section: section || "general",
        },
      },
    });

    // Send notification to inspector about new comment (non-blocking)
    if (report.inspector?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://reports.ranzroofing.co.nz";
      sendNewCommentsNotification(
        {
          reportNumber: report.reportNumber,
          propertyAddress: report.propertyAddress,
          inspectorName: report.inspector.name,
          inspectorEmail: report.inspector.email,
          reportUrl: `${baseUrl}/reports/${report.id}`,
        },
        user.name,
        1 // Single comment added
      ).catch((err) => {
        console.error("[Comments] Failed to send notification email:", err);
      });
    }

    return NextResponse.json({
      success: true,
      comment: reviewComment,
    });
  } catch (error) {
    console.error("Error creating review comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
