import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

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

/**
 * POST /api/templates/[id]/apply - Apply a template to a report
 * Creates pre-filled sections and checklists based on the template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id: templateId } = await params;

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

    const body = await request.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    // Verify template exists
    const template = await prisma.reportTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.isActive) {
      return NextResponse.json(
        { error: "Template not found or inactive" },
        { status: 404 }
      );
    }

    // Verify report exists and user has access
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        inspectorId: user.id,
        status: { in: ["DRAFT", "IN_PROGRESS"] },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found or cannot be modified" },
        { status: 404 }
      );
    }

    // Parse template sections
    const sections = template.sections as unknown as TemplateSection[];
    const checklists = template.checklists as unknown as string[] | null;

    // Build default values from template sections
    const scopeOfWorks = sections.find(s => s.id === "scope")
      ? buildSectionContent(sections.find(s => s.id === "scope")!)
      : null;

    const methodology = sections.find(s => s.id === "methodology")
      ? buildSectionContent(sections.find(s => s.id === "methodology")!)
      : null;

    const equipment = sections.find(s => s.id === "equipment")
      ? extractDefaultList(sections.find(s => s.id === "equipment")!)
      : null;

    // Update report with template data
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        inspectionType: template.inspectionType,
        ...(scopeOfWorks && { scopeOfWorks }),
        ...(methodology && { methodology }),
        ...(equipment && { equipment }),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId,
        userId: user.id,
        action: "UPDATED",
        details: {
          action: "template_applied",
          templateId: template.id,
          templateName: template.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      report: updatedReport,
      template: {
        id: template.id,
        name: template.name,
        sectionsApplied: sections.length,
        checklistsIncluded: checklists?.length || 0,
      },
    });
  } catch (error) {
    console.error("Error applying template:", error);
    return NextResponse.json(
      { error: "Failed to apply template" },
      { status: 500 }
    );
  }
}

/**
 * Build section content from template fields
 */
function buildSectionContent(section: TemplateSection): string {
  const parts: string[] = [];

  if (section.description) {
    parts.push(section.description);
  }

  section.fields.forEach(field => {
    if (field.defaultValue) {
      parts.push(`${field.label}: ${field.defaultValue}`);
    }
  });

  return parts.join("\n\n");
}

/**
 * Extract default list items from template fields
 */
function extractDefaultList(section: TemplateSection): string[] {
  const items: string[] = [];

  section.fields.forEach(field => {
    if (field.type === "checkbox" && field.defaultValue === "true") {
      items.push(field.label);
    } else if (field.options && field.defaultValue) {
      items.push(field.defaultValue);
    } else if (field.defaultValue) {
      items.push(field.defaultValue);
    }
  });

  return items;
}
