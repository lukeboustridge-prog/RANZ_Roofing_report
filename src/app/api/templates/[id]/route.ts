import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { InspectionType } from "@prisma/client";
import { z } from "zod";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";

// Zod schemas for proper validation
const templateFieldSchema = z.object({
  id: z.string().min(1, "Field ID is required"),
  label: z.string().min(1, "Field label is required"),
  type: z.enum(["text", "textarea", "select", "checkbox", "number"]),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
  required: z.boolean(),
});

const templateSectionSchema = z.object({
  id: z.string().min(1, "Section ID is required"),
  name: z.string().min(1, "Section name is required"),
  description: z.string().optional(),
  required: z.boolean(),
  order: z.number().int().min(0),
  fields: z.array(templateFieldSchema).min(0),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  inspectionType: z.nativeEnum(InspectionType).optional(),
  sections: z.array(templateSectionSchema).min(1).optional(),
  checklists: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/templates/[id] - Get a specific template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(request, RATE_LIMIT_PRESETS.standard);
  if (rateLimitResult) return rateLimitResult;

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
  // Apply rate limiting
  const rateLimitResult = rateLimit(request, RATE_LIMIT_PRESETS.standard);
  if (rateLimitResult) return rateLimitResult;

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

    // Parse and validate request body with Zod
    const body = await request.json();
    const validatedData = updateTemplateSchema.parse(body);

    // Check for duplicate name if name is being changed
    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await prisma.reportTemplate.findUnique({
        where: { name: validatedData.name },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A template with this name already exists" },
          { status: 409 }
        );
      }
    }

    // If setting as default, unset other defaults for this type
    if (validatedData.isDefault) {
      const inspectionType = validatedData.inspectionType || existing.inspectionType;
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
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.inspectionType && { inspectionType: validatedData.inspectionType }),
        ...(validatedData.sections && { sections: validatedData.sections as unknown as object }),
        ...(validatedData.checklists !== undefined && { checklists: validatedData.checklists as unknown as object }),
        ...(validatedData.isDefault !== undefined && { isDefault: validatedData.isDefault }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error updating template:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

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
  // Apply rate limiting
  const rateLimitResult = rateLimit(request, RATE_LIMIT_PRESETS.standard);
  if (rateLimitResult) return rateLimitResult;

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
