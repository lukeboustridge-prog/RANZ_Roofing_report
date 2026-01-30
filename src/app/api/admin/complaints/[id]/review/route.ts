import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { lbpComplaintService } from "@/services/lbp-complaint-service";
import { z } from "zod";

const reviewSchema = z.object({
  approved: z.boolean(),
  reviewNotes: z.string().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/admin/complaints/[id]/review
 * Approve or reject complaint (super admin only)
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

    // Only super admins can review/approve complaints
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only super administrators can review complaints" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = reviewSchema.parse(body);

    const complaint = await lbpComplaintService.reviewComplaint(
      id,
      user.id,
      validatedData
    );

    return NextResponse.json({
      success: true,
      message: validatedData.approved
        ? "Complaint approved and ready for submission"
        : "Complaint returned for revision",
      complaint,
    });
  } catch (error) {
    console.error("Error reviewing complaint:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to review complaint" },
      { status: 500 }
    );
  }
}
