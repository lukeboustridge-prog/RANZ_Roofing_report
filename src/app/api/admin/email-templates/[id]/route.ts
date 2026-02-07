import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/admin/email-templates/[id] - Get a single template by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Email template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error getting email template:", error);
    return NextResponse.json(
      { error: "Failed to get email template" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/email-templates/[id] - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Email template not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, subject, bodyHtml, bodyText, isActive } = body;

    // Do NOT allow changing type (it's the unique identifier)
    if (body.type !== undefined && body.type !== existing.type) {
      return NextResponse.json(
        { error: "Cannot change template type" },
        { status: 400 }
      );
    }

    // Check if bodyHtml contains all required variables (warn, don't block)
    const warnings: string[] = [];
    if (bodyHtml && existing.variables) {
      const variableNames = Object.keys(
        existing.variables as Record<string, string>
      );
      for (const varName of variableNames) {
        if (!bodyHtml.includes(`{{${varName}}}`)) {
          warnings.push(
            `Variable "{{${varName}}}" is not present in bodyHtml`
          );
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (subject !== undefined) updateData.subject = subject;
    if (bodyHtml !== undefined) updateData.bodyHtml = bodyHtml;
    if (bodyText !== undefined) updateData.bodyText = bodyText;
    if (isActive !== undefined) updateData.isActive = isActive;

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...template,
      ...(warnings.length > 0 && { warnings }),
    });
  } catch (error) {
    console.error("Error updating email template:", error);
    return NextResponse.json(
      { error: "Failed to update email template" },
      { status: 500 }
    );
  }
}
