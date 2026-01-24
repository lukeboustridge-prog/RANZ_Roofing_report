import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { InspectionType } from "@prisma/client";

interface TemplateSection {
  id: string;
  name: string;
  description?: string;
  required: boolean;
  order: number;
  fields: Array<{
    id: string;
    label: string;
    type: "text" | "textarea" | "select" | "checkbox" | "number";
    placeholder?: string;
    options?: string[];
    defaultValue?: string;
    required: boolean;
  }>;
}

interface UpdateTemplateBody {
  name?: string;
  description?: string;
  inspectionType?: InspectionType;
  sections?: TemplateSection[];
  checklists?: string[];
  isDefault?: boolean;
  isActive?: boolean;
}

/**
 * GET /api/templates/[id] - Get a specific template
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

    const template = await prisma.reportTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/templates/[id] - Update a template (admin only)
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

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admins can update templates
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const existing = await prisma.reportTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const body: UpdateTemplateBody = await request.json();

    // Check for duplicate name if name is being changed
    if (body.name && body.name !== existing.name) {
      const duplicate = await prisma.reportTemplate.findUnique({
        where: { name: body.name },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A template with this name already exists" },
          { status: 409 }
        );
      }
    }

    // If setting as default, unset other defaults for this type
    if (body.isDefault) {
      const inspectionType = body.inspectionType || existing.inspectionType;
      await prisma.reportTemplate.updateMany({
        where: {
          inspectionType,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const template = await prisma.reportTemplate.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.inspectionType && { inspectionType: body.inspectionType }),
        ...(body.sections && { sections: body.sections as unknown as object }),
        ...(body.checklists !== undefined && { checklists: body.checklists as unknown as object }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[id] - Delete a template (admin only)
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

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admins can delete templates
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const existing = await prisma.reportTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting inactive (preserves historical data)
    await prisma.reportTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
