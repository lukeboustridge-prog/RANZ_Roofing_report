import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { lbpComplaintService } from "@/services/lbp-complaint-service";
import { z } from "zod";

const updateComplaintSchema = z.object({
  // Subject LBP
  subjectLbpNumber: z.string().optional(),
  subjectLbpName: z.string().optional(),
  subjectLbpEmail: z.string().email().optional().nullable(),
  subjectLbpPhone: z.string().optional().nullable(),
  subjectLbpCompany: z.string().optional().nullable(),
  subjectLbpAddress: z.string().optional().nullable(),
  subjectLbpLicenseTypes: z.array(z.string()).optional(),
  subjectSightedLicense: z.boolean().optional(),
  subjectWorkType: z.string().optional().nullable(),

  // Work details
  workAddress: z.string().optional(),
  workSuburb: z.string().optional().nullable(),
  workCity: z.string().optional().nullable(),
  workStartDate: z.string().datetime().optional().nullable(),
  workEndDate: z.string().datetime().optional().nullable(),
  workDescription: z.string().optional(),
  buildingConsentNumber: z.string().optional().nullable(),
  buildingConsentDate: z.string().datetime().optional().nullable(),

  // Complaint details
  groundsForDiscipline: z.array(z.string()).optional(),
  conductDescription: z.string().optional(),
  evidenceSummary: z.string().optional(),
  stepsToResolve: z.string().optional().nullable(),

  // Evidence
  attachedPhotoIds: z.array(z.string()).optional(),
  attachedDefectIds: z.array(z.string()).optional(),
  witnesses: z.array(z.object({
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    role: z.string().optional(),
    details: z.string(),
  })).optional().nullable(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/complaints/[id] - Get complaint details
 */
export async function GET(
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

    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const complaint = await lbpComplaintService.getComplaint(id);

    if (!complaint) {
      return NextResponse.json(
        { error: "Complaint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      complaint,
    });
  } catch (error) {
    console.error("Error fetching complaint:", error);
    return NextResponse.json(
      { error: "Failed to fetch complaint" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/complaints/[id] - Update complaint details
 */
export async function PATCH(
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

    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateComplaintSchema.parse(body);

    // Convert date strings to Date objects
    const updateData = {
      ...validatedData,
      workStartDate: validatedData.workStartDate ? new Date(validatedData.workStartDate) : undefined,
      workEndDate: validatedData.workEndDate ? new Date(validatedData.workEndDate) : undefined,
      buildingConsentDate: validatedData.buildingConsentDate ? new Date(validatedData.buildingConsentDate) : undefined,
    };

    const complaint = await lbpComplaintService.updateComplaint(
      id,
      user.id,
      updateData
    );

    return NextResponse.json({
      success: true,
      message: "Complaint updated successfully",
      complaint,
    });
  } catch (error) {
    console.error("Error updating complaint:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update complaint" },
      { status: 500 }
    );
  }
}
