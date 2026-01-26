import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { lbpComplaintService } from "@/services/lbp-complaint-service";
import { lbpEvidencePackageService } from "@/services/lbp-evidence-package-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/complaints/[id]/evidence
 * Generate and download evidence package (ZIP)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    const { id } = await context.params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
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

    // Verify complaint exists
    const complaint = await lbpComplaintService.getComplaint(id);

    if (!complaint) {
      return NextResponse.json(
        { error: "Complaint not found" },
        { status: 404 }
      );
    }

    // Generate evidence package (uploads to R2 and returns URL)
    const { url, hash } = await lbpEvidencePackageService.createEvidencePackage(id);

    // Return download URL
    return NextResponse.json({
      success: true,
      downloadUrl: url,
      filename: `${complaint.complaintNumber}-evidence.zip`,
      hash,
    });
  } catch (error) {
    console.error("Error generating evidence package:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate evidence package" },
      { status: 500 }
    );
  }
}
