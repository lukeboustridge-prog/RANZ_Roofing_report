import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/reports/[id]/comments/[commentId] - Get a single comment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { userId } = await auth();
    const { id, commentId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const comment = await prisma.reviewComment.findFirst({
      where: {
        id: commentId,
        reportId: id,
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

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Error fetching comment:", error);
    return NextResponse.json(
      { error: "Failed to fetch comment" },
      { status: 500 }
    );
  }
}

// PATCH /api/reports/[id]/comments/[commentId] - Update/resolve a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { userId } = await auth();
    const { id, commentId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const comment = await prisma.reviewComment.findFirst({
      where: {
        id: commentId,
        reportId: id,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Get the report to check ownership
    const report = await prisma.report.findUnique({
      where: { id },
      select: { inspectorId: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const body = await request.json();
    const { resolved, comment: commentText, severity } = body;

    // Inspector can only mark comments as resolved
    const isInspector = report.inspectorId === user.id;
    const isReviewer = ["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role);

    if (isInspector && !isReviewer) {
      // Inspector can only resolve
      if (commentText !== undefined || severity !== undefined) {
        return NextResponse.json(
          { error: "Inspectors can only mark comments as resolved" },
          { status: 403 }
        );
      }
    }

    if (!isInspector && !isReviewer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update data
    const updateData: {
      resolved?: boolean;
      resolvedAt?: Date | null;
      resolvedBy?: string | null;
      comment?: string;
      severity?: "CRITICAL" | "ISSUE" | "NOTE" | "SUGGESTION";
    } = {};

    if (resolved !== undefined) {
      updateData.resolved = resolved;
      if (resolved) {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = user.id;
      } else {
        updateData.resolvedAt = null;
        updateData.resolvedBy = null;
      }
    }

    if (commentText !== undefined && isReviewer) {
      updateData.comment = commentText.trim();
    }

    if (severity !== undefined && isReviewer) {
      const validSeverities = ["CRITICAL", "ISSUE", "NOTE", "SUGGESTION"];
      if (!validSeverities.includes(severity)) {
        return NextResponse.json(
          { error: `Invalid severity. Must be one of: ${validSeverities.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.severity = severity;
    }

    const updatedComment = await prisma.reviewComment.update({
      where: { id: commentId },
      data: updateData,
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "UPDATED",
        details: {
          action: resolved ? "comment_resolved" : "comment_updated",
          commentId,
          changes: updateData,
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

// DELETE /api/reports/[id]/comments/[commentId] - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { userId } = await auth();
    const { id, commentId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only reviewers can delete comments
    if (!["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only reviewers can delete comments" },
        { status: 403 }
      );
    }

    const comment = await prisma.reviewComment.findFirst({
      where: {
        id: commentId,
        reportId: id,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only the comment author or admins can delete
    if (comment.reviewerId !== user.id && !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only the comment author or admins can delete comments" },
        { status: 403 }
      );
    }

    await prisma.reviewComment.delete({
      where: { id: commentId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "UPDATED",
        details: {
          action: "comment_deleted",
          commentId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Comment deleted",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
