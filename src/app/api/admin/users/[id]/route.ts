import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(["INSPECTOR", "REVIEWER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING_APPROVAL"]).optional(),
  qualifications: z.string().optional().nullable(),
  lbpNumber: z.string().optional().nullable(),
  yearsExperience: z.number().optional().nullable(),
  specialisations: z.array(z.string()).optional(),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  cvUrl: z.string().url().optional().nullable(),
});

/**
 * GET /api/admin/users/[id] - Get a specific user (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check admin permissions
    if (!["ADMIN", "SUPER_ADMIN"].includes(adminUser.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    // Fetch the requested user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        reports: {
          select: {
            id: true,
            reportNumber: true,
            status: true,
            propertyAddress: true,
            propertyCity: true,
            inspectionType: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            reports: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: targetUser,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id] - Update a user (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check admin permissions
    if (!["ADMIN", "SUPER_ADMIN"].includes(adminUser.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    // Fetch the target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent non-super-admins from modifying admins
    if (targetUser.role === "ADMIN" && adminUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only super admins can modify admin users" },
        { status: 403 }
      );
    }

    // Prevent admins from self-demotion
    if (targetUser.id === adminUser.id) {
      const body = await request.json();
      if (body.role && body.role !== adminUser.role) {
        return NextResponse.json(
          { error: "You cannot change your own role" },
          { status: 400 }
        );
      }
      if (body.status && body.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "You cannot suspend your own account" },
          { status: 400 }
        );
      }
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Prevent non-super-admins from promoting to admin
    if (validatedData.role === "ADMIN" && adminUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only super admins can promote users to admin" },
        { status: 403 }
      );
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: validatedData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        company: true,
        qualifications: true,
        lbpNumber: true,
        yearsExperience: true,
        specialisations: true,
        cvUrl: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id] - Delete a user (admin only)
 * Note: This is a soft delete - sets status to SUSPENDED
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only super admins can delete users
    if (adminUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only super admins can delete users" },
        { status: 403 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent self-deletion
    if (targetUser.id === adminUser.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Soft delete - set status to SUSPENDED
    await prisma.user.update({
      where: { id },
      data: { status: "SUSPENDED" },
    });

    return NextResponse.json({
      success: true,
      message: "User suspended successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
