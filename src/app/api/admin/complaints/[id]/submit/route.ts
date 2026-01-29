import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { lbpComplaintService } from "@/services/lbp-complaint-service";
import { lbpComplaintEmailService } from "@/services/lbp-complaint-email-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/admin/complaints/[id]/submit
 * Submit complaint to Building Practitioners Board via email
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

    const lookupField = getUserLookupField();
    const user = await prisma.user.findUnique({
      where: { [lookupField]: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only super admins can submit to BPB
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only super administrators can submit complaints to BPB" },
        { status: 403 }
      );
    }

    // Get the complaint
    const complaint = await lbpComplaintService.getComplaint(id);

    if (!complaint) {
      return NextResponse.json(
        { error: "Complaint not found" },
        { status: 404 }
      );
    }

    // Check complaint is ready to submit
    if (complaint.status !== "READY_TO_SUBMIT") {
      return NextResponse.json(
        { error: "Complaint must be approved before submission" },
        { status: 400 }
      );
    }

    // Submit via email service (this also marks the complaint as submitted)
    const result = await lbpComplaintEmailService.submitComplaint(id, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to submit complaint" },
        { status: 500 }
      );
    }

    // Get updated complaint
    const updatedComplaint = await lbpComplaintService.getComplaint(id);

    return NextResponse.json({
      success: true,
      message: "Complaint submitted to Building Practitioners Board",
      complaint: updatedComplaint,
      confirmationId: result.confirmationId,
    });
  } catch (error) {
    console.error("Error submitting complaint to BPB:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit complaint" },
      { status: 500 }
    );
  }
}
