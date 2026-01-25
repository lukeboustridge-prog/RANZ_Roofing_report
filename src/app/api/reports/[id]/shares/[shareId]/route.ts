import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * DELETE /api/reports/[id]/shares/[shareId] - Revoke a share link
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const { userId } = await auth();
    const { id, shareId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check report exists and user has access
    const report = await prisma.report.findFirst({
      where: {
        id,
        OR: [
          { inspectorId: user.id },
          ...(['ADMIN', 'SUPER_ADMIN'].includes(user.role) ? [{}] : []),
        ],
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Find the share
    const share = await prisma.reportShare.findFirst({
      where: {
        id: shareId,
        reportId: id,
      },
    });

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    // Revoke the share (soft delete - preserve audit trail)
    await prisma.reportShare.update({
      where: { id: shareId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: user.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "SHARED",
        details: {
          type: "revoked",
          shareId,
          recipientEmail: share.recipientEmail,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Share link revoked",
    });
  } catch (error) {
    console.error("Error revoking share:", error);
    return NextResponse.json(
      { error: "Failed to revoke share link" },
      { status: 500 }
    );
  }
}
