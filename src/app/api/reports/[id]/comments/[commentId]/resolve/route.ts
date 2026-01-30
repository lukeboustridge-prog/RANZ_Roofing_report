import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// PATCH /api/reports/[id]/comments/[commentId]/resolve - Mark comment as resolved/unresolved
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id: reportId, commentId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the report to check permissions
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { inspectorId: true, status: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Only the inspector (owner) can mark comments as resolved
    const isInspector = report.inspectorId === user.id;
    const isReviewer = ["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role);

    if (!isInspector && !isReviewer) {
      return NextResponse.json(
        { error: "Only the inspector or reviewers can update comments" },
        { status: 403 }
      );
    }

    // Get the comment
    const comment = await prisma.reviewComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.reportId !== reportId) {
      return NextResponse.json(
        { error: "Comment does not belong to this report" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { resolved } = body;

    if (typeof resolved !== "boolean") {
      return NextResponse.json(
        { error: "resolved must be a boolean" },
        { status: 400 }
      );
    }

    // Update the comment
    const updatedComment = await prisma.reviewComment.update({
      where: { id: commentId },
      data: { resolved },
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
        reportId,
        userId: user.id,
        action: "UPDATED",
        details: {
          action: resolved ? "comment_resolved" : "comment_unresolved",
          commentId,
          resolvedBy: user.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      comment: updatedComment,
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}
