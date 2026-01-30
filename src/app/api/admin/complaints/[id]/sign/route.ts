import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { lbpComplaintService } from "@/services/lbp-complaint-service";
import { z } from "zod";

const signSchema = z.object({
  signatureData: z.string().min(1, "Signature is required"),
  declarationAccepted: z.boolean().refine(val => val === true, {
    message: "Declaration must be accepted",
  }),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/admin/complaints/[id]/sign
 * Sign complaint with digital signature
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

    const body = await request.json();
    const validatedData = signSchema.parse(body);

    const complaint = await lbpComplaintService.signComplaint(
      id,
      user.id,
      validatedData
    );

    return NextResponse.json({
      success: true,
      message: "Complaint signed successfully",
      complaint,
    });
  } catch (error) {
    console.error("Error signing complaint:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sign complaint" },
      { status: 500 }
    );
  }
}
