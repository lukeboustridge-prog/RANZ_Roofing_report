import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { InspectionType } from "@prisma/client";

/**
 * Report Templates API
 * Manage reusable report templates for different inspection types
 */

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

interface CreateTemplateBody {
  name: string;
  description?: string;
  inspectionType: InspectionType;
  sections: TemplateSection[];
  checklists?: string[];
  isDefault?: boolean;
}

/**
 * GET /api/templates - List all active templates
 */
export async function GET(request: NextRequest) {
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

    const body: CreateTemplateBody = await request.json();

    // Validate required fields
    if (!body.name || !body.inspectionType || !body.sections) {
      return NextResponse.json(
        { error: "Name, inspection type, and sections are required" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.reportTemplate.findUnique({
      where: { name: body.name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 409 }
      );
    }

    // If this is marked as default, unset other defaults for this type
    if (body.isDefault) {
      await prisma.reportTemplate.updateMany({
        where: {
          inspectionType: body.inspectionType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const template = await prisma.reportTemplate.create({
      data: {
        name: body.name,
        description: body.description,
        inspectionType: body.inspectionType,
        sections: body.sections as unknown as object,
        checklists: (body.checklists || []) as unknown as object,
        isDefault: body.isDefault || false,
        isActive: true,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
