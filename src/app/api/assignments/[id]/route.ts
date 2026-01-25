import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const updateAssignmentSchema = z.object({
  status: z.enum([
    "PENDING",
    "ACCEPTED",
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ]).optional(),
  scheduledDate: z.string().nullable().optional(),
  completedDate: z.string().nullable().optional(),
  notes: z.string().optional(),
  urgency: z.enum(["STANDARD", "PRIORITY", "URGENT", "EMERGENCY"]).optional(),
});

/**
 * GET /api/assignments/[id] - Get a single assignment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        inspector: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            qualifications: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Check access - admins can see all, inspectors only their own
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(user.role);
    if (!isAdmin && assignment.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error fetching assignment:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignment" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/assignments/[id] - Update an assignment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Check access
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(user.role);
    const isAssignedInspector = assignment.inspectorId === user.id;

    if (!isAdmin && !isAssignedInspector) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = updateAssignmentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Inspectors can only accept, schedule, or mark in progress/complete their own assignments
    if (!isAdmin && data.status) {
      const allowedTransitions: Record<string, string[]> = {
        PENDING: ["ACCEPTED"],
        ACCEPTED: ["SCHEDULED", "IN_PROGRESS"],
        SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
        IN_PROGRESS: ["COMPLETED"],
      };

      const allowed = allowedTransitions[assignment.status] || [];
      if (!allowed.includes(data.status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${assignment.status} to ${data.status}` },
          { status: 400 }
        );
      }
    }

    const updatedAssignment = await prisma.assignment.update({
      where: { id },
      data: {
        status: data.status,
        scheduledDate: data.scheduledDate !== undefined
          ? (data.scheduledDate ? new Date(data.scheduledDate) : null)
          : undefined,
        completedDate: data.completedDate !== undefined
          ? (data.completedDate ? new Date(data.completedDate) : null)
          : undefined,
        notes: data.notes,
        urgency: data.urgency,
      },
      include: {
        inspector: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.error("Error updating assignment:", error);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assignments/[id] - Delete an assignment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only admins can delete assignments
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only administrators can delete assignments" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    await prisma.assignment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
