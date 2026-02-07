import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/admin/email-templates - List all email templates
export async function GET(request: NextRequest) {
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

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { type: "asc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error listing email templates:", error);
    return NextResponse.json(
      { error: "Failed to list email templates" },
      { status: 500 }
    );
  }
}

// POST /api/admin/email-templates - Create a new email template
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { type, name, subject, bodyHtml, bodyText, variables } = body;

    if (!type || !name || !subject || !bodyHtml || !bodyText) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: type, name, subject, bodyHtml, bodyText",
        },
        { status: 400 }
      );
    }

    // Check uniqueness of type
    const existing = await prisma.emailTemplate.findUnique({
      where: { type },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Template with type "${type}" already exists` },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        type,
        name,
        subject,
        bodyHtml,
        bodyText,
        variables: variables || {},
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating email template:", error);
    return NextResponse.json(
      { error: "Failed to create email template" },
      { status: 500 }
    );
  }
}
