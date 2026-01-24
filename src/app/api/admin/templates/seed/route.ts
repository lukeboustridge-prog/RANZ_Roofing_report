import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { InspectionType } from "@prisma/client";

/**
 * Default report templates for different inspection types
 */
const defaultTemplates = [
  {
    name: "Full Roofing Inspection",
    description:
      "Comprehensive roofing inspection template including all standard sections for detailed assessment",
    inspectionType: InspectionType.FULL_INSPECTION,
    isDefault: true,
    sections: [
      {
        id: "scope",
        name: "Scope of Works",
        description: "Define the extent and limitations of the inspection",
        required: true,
        order: 1,
        fields: [
          {
            id: "scope_description",
            label: "Inspection Scope",
            type: "textarea",
            defaultValue:
              "This inspection covers the external roofing system including cladding, flashings, penetrations, gutters, and downpipes.",
            required: true,
          },
        ],
      },
      {
        id: "methodology",
        name: "Methodology",
        description: "Describe the inspection methodology and approach",
        required: true,
        order: 2,
        fields: [
          {
            id: "inspection_method",
            label: "Inspection Method",
            type: "textarea",
            defaultValue:
              "Visual inspection conducted from ground level, ladder access, and walking on roof surfaces where safe to do so.",
            required: true,
          },
        ],
      },
      {
        id: "equipment",
        name: "Equipment Used",
        description: "List equipment used during the inspection",
        required: true,
        order: 3,
        fields: [
          { id: "ladder", label: "Ladder", type: "checkbox", defaultValue: "true", required: false },
          { id: "camera", label: "Digital Camera with GPS", type: "checkbox", defaultValue: "true", required: false },
          { id: "moisture_meter", label: "Moisture Meter", type: "checkbox", defaultValue: "false", required: false },
        ],
      },
    ],
    checklists: ["e2_as1", "metal_roof_cop", "b2_durability"],
  },
  {
    name: "Pre-Purchase Inspection",
    description: "Standard pre-purchase roofing assessment for property buyers",
    inspectionType: InspectionType.PRE_PURCHASE,
    isDefault: true,
    sections: [
      {
        id: "scope",
        name: "Scope of Works",
        required: true,
        order: 1,
        fields: [
          {
            id: "scope_description",
            label: "Inspection Scope",
            type: "textarea",
            defaultValue:
              "Pre-purchase visual inspection of the roofing system to identify the general condition and any major defects.",
            required: true,
          },
        ],
      },
      {
        id: "methodology",
        name: "Methodology",
        required: true,
        order: 2,
        fields: [
          {
            id: "inspection_method",
            label: "Inspection Method",
            type: "textarea",
            defaultValue:
              "Non-invasive visual inspection from ground level and safe access points.",
            required: true,
          },
        ],
      },
    ],
    checklists: ["e2_as1", "b2_durability"],
  },
  {
    name: "Dispute Resolution Inspection",
    description: "Detailed court-ready inspection template for weathertightness disputes",
    inspectionType: InspectionType.DISPUTE_RESOLUTION,
    isDefault: true,
    sections: [
      {
        id: "scope",
        name: "Scope of Works",
        required: true,
        order: 1,
        fields: [
          {
            id: "scope_description",
            label: "Inspection Scope",
            type: "textarea",
            defaultValue:
              "Detailed forensic inspection of the roofing system to identify defects, assess causation, and provide expert opinion for dispute resolution purposes.",
            required: true,
          },
          {
            id: "instructions",
            label: "Instructions Received",
            type: "textarea",
            defaultValue: "",
            required: true,
          },
        ],
      },
      {
        id: "methodology",
        name: "Methodology",
        required: true,
        order: 2,
        fields: [
          {
            id: "inspection_method",
            label: "Inspection Method",
            type: "textarea",
            defaultValue:
              "Systematic visual inspection with photographic documentation. Inspection conducted in accordance with ISO/IEC 17020:2012 requirements.",
            required: true,
          },
        ],
      },
    ],
    checklists: ["e2_as1", "metal_roof_cop", "b2_durability"],
  },
  {
    name: "Visual Only Assessment",
    description: "Basic visual inspection template for quick condition assessments",
    inspectionType: InspectionType.VISUAL_ONLY,
    isDefault: true,
    sections: [
      {
        id: "scope",
        name: "Scope of Works",
        required: true,
        order: 1,
        fields: [
          {
            id: "scope_description",
            label: "Inspection Scope",
            type: "textarea",
            defaultValue: "Visual-only assessment of externally visible roof elements.",
            required: true,
          },
          {
            id: "limitations",
            label: "Limitations",
            type: "textarea",
            defaultValue: "This assessment is limited to visual observations from ground level only.",
            required: true,
          },
        ],
      },
    ],
    checklists: [],
  },
  {
    name: "Maintenance Review",
    description: "Template for routine maintenance assessments and condition monitoring",
    inspectionType: InspectionType.MAINTENANCE_REVIEW,
    isDefault: true,
    sections: [
      {
        id: "scope",
        name: "Scope of Works",
        required: true,
        order: 1,
        fields: [
          {
            id: "scope_description",
            label: "Review Scope",
            type: "textarea",
            defaultValue:
              "Routine maintenance inspection to assess current condition and identify items requiring maintenance attention.",
            required: true,
          },
        ],
      },
    ],
    checklists: ["b2_durability"],
  },
];

/**
 * POST /api/admin/templates/seed - Seed default templates
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

    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
    };

    for (const template of defaultTemplates) {
      const existing = await prisma.reportTemplate.findUnique({
        where: { name: template.name },
      });

      if (existing) {
        // Update existing template
        await prisma.reportTemplate.update({
          where: { name: template.name },
          data: {
            description: template.description,
            inspectionType: template.inspectionType,
            sections: template.sections as unknown as object,
            checklists: template.checklists as unknown as object,
            isDefault: template.isDefault,
            isActive: true,
          },
        });
        results.updated++;
      } else {
        // Create new template
        await prisma.reportTemplate.create({
          data: {
            name: template.name,
            description: template.description,
            inspectionType: template.inspectionType,
            sections: template.sections as unknown as object,
            checklists: template.checklists as unknown as object,
            isDefault: template.isDefault,
            isActive: true,
          },
        });
        results.created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.created} new templates, updated ${results.updated} existing templates`,
      results,
    });
  } catch (error) {
    console.error("Error seeding templates:", error);
    return NextResponse.json(
      { error: "Failed to seed templates" },
      { status: 500 }
    );
  }
}
