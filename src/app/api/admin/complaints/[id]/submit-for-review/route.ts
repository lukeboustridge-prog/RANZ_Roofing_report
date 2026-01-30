import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { lbpComplaintService } from "@/services/lbp-complaint-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/admin/complaints/[id]/submit-for-review
 * Submit complaint for senior admin review
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id } = await context.params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const complaint = await lbpComplaintService.submitForReview(id, user.id);

    return NextResponse.json({
      success: true,
      message: "Complaint submitted for review",
      complaint,
    });
  } catch (error) {
    console.error("Error submitting complaint for review:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit for review" },
      { status: 500 }
    );
  }
}
