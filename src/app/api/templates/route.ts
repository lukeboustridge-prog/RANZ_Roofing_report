import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { InspectionType } from "@prisma/client";
import { z } from "zod";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";

/**
 * Report Templates API
 * Manage reusable report templates for different inspection types
 */

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

const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(255),
  description: z.string().max(1000).optional(),
  inspectionType: z.nativeEnum(InspectionType),
  sections: z.array(templateSectionSchema).min(1, "At least one section is required"),
  checklists: z.array(z.string()).optional(),
  isDefault: z.boolean().optional().default(false),
});

/**
 * GET /api/templates - List all active templates
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(request, RATE_LIMIT_PRESETS.standard);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inspectionType = searchParams.get("type") as InspectionType | null;
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Build query filter
    const where: {
      isActive?: boolean;
      inspectionType?: InspectionType;
    } = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    if (inspectionType) {
      where.inspectionType = inspectionType;
    }

    const templates = await prisma.reportTemplate.findMany({
      where,
      orderBy: [
        { isDefault: "desc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        inspectionType: true,
        isDefault: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Don't include full sections/checklists in list view
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates - Create a new template (admin only)
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(request, RATE_LIMIT_PRESETS.standard);
  if (rateLimitResult) return rateLimitResult;

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

    // Only admins can create templates
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Parse and validate request body with Zod
    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);

    // Check for duplicate name
    const existing = await prisma.reportTemplate.findUnique({
      where: { name: validatedData.name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 409 }
      );
    }

    // If this is marked as default, unset other defaults for this type
    if (validatedData.isDefault) {
      await prisma.reportTemplate.updateMany({
        where: {
          inspectionType: validatedData.inspectionType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const template = await prisma.reportTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        inspectionType: validatedData.inspectionType,
        sections: validatedData.sections as unknown as object,
        checklists: (validatedData.checklists || []) as unknown as object,
        isDefault: validatedData.isDefault,
        isActive: true,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
