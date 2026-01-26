import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { lbpComplaintService } from "@/services/lbp-complaint-service";
import { lbpComplaintPDFService } from "@/services/lbp-complaint-pdf-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/complaints/[id]/pdf
 * Generate and download complaint PDF
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

    // Generate PDF (service fetches complaint internally)
    const pdfBuffer = await lbpComplaintPDFService.generateComplaintPDF(id);

    // Convert NodeJS Buffer to Uint8Array for Response
    const pdfUint8Array = new Uint8Array(pdfBuffer);

    // Return PDF as download
    return new NextResponse(pdfUint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${complaint.complaintNumber}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating complaint PDF:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
