import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { lbpComplaintService } from "@/services/lbp-complaint-service";
import { z } from "zod";

const createComplaintSchema = z.object({
  reportId: z.string().min(1, "Report ID is required"),
});

/**
 * GET /api/admin/complaints - List all LBP complaints
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check admin permissions
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as Parameters<typeof lbpComplaintService.listComplaints>[0]["status"];
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await lbpComplaintService.listComplaints({
      status: status || undefined,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return NextResponse.json(
      { error: "Failed to fetch complaints" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/complaints - Create new LBP complaint from a dispute report
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check admin permissions
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createComplaintSchema.parse(body);

    const complaint = await lbpComplaintService.createFromReport(
      validatedData.reportId,
      user.id
    );

    return NextResponse.json(
      {
        success: true,
        message: "Complaint created successfully",
        complaint,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating complaint:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create complaint" },
      { status: 500 }
    );
  }
}
