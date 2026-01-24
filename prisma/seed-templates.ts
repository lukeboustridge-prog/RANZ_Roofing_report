import { PrismaClient, InspectionType } from "@prisma/client";

const prisma = new PrismaClient();

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
            placeholder: "Describe the scope of the inspection...",
            defaultValue:
              "This inspection covers the external roofing system including cladding, flashings, penetrations, gutters, and downpipes. Internal ceiling spaces were inspected where accessible.",
            required: true,
          },
          {
            id: "areas_included",
            label: "Areas Included",
            type: "textarea",
            placeholder: "List areas included in the inspection...",
            defaultValue:
              "All external roof surfaces, ridge and hip cappings, valleys, barge and fascia boards, gutters and downpipes, roof penetrations including vents and skylights.",
            required: true,
          },
          {
            id: "areas_excluded",
            label: "Areas Excluded",
            type: "textarea",
            placeholder: "List any areas not inspected...",
            defaultValue: "",
            required: false,
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
            placeholder: "Describe the inspection methodology...",
            defaultValue:
              "Visual inspection conducted from ground level, ladder access, and walking on roof surfaces where safe to do so. Photographic documentation was captured using GPS-enabled camera with automatic timestamping.",
            required: true,
          },
          {
            id: "standards_applied",
            label: "Standards Applied",
            type: "textarea",
            placeholder: "List applicable standards...",
            defaultValue:
              "This inspection was conducted in accordance with AS 4349.1, NZBC Clauses E2 and B2, and the NZ Metal Roof and Wall Cladding Code of Practice.",
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
          {
            id: "ladder",
            label: "Ladder",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
          {
            id: "camera",
            label: "Digital Camera with GPS",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
          {
            id: "moisture_meter",
            label: "Moisture Meter",
            type: "checkbox",
            defaultValue: "false",
            required: false,
          },
          {
            id: "measuring_tape",
            label: "Measuring Tape",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
          {
            id: "binoculars",
            label: "Binoculars",
            type: "checkbox",
            defaultValue: "false",
            required: false,
          },
          {
            id: "drone",
            label: "Drone",
            type: "checkbox",
            defaultValue: "false",
            required: false,
          },
          {
            id: "torch",
            label: "Torch/Flashlight",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
        ],
      },
    ],
    checklists: ["e2_as1", "metal_roof_cop", "b2_durability"],
  },
  {
    name: "Pre-Purchase Inspection",
    description:
      "Standard pre-purchase roofing assessment for property buyers",
    inspectionType: InspectionType.PRE_PURCHASE,
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
            placeholder: "Describe the scope of the inspection...",
            defaultValue:
              "Pre-purchase visual inspection of the roofing system to identify the general condition, any major defects, and items requiring attention prior to property purchase.",
            required: true,
          },
          {
            id: "purpose",
            label: "Purpose",
            type: "textarea",
            placeholder: "Purpose of the inspection...",
            defaultValue:
              "This inspection is intended to provide the prospective purchaser with an independent assessment of the roof condition to inform their purchase decision.",
            required: true,
          },
        ],
      },
      {
        id: "methodology",
        name: "Methodology",
        description: "Describe the inspection methodology",
        required: true,
        order: 2,
        fields: [
          {
            id: "inspection_method",
            label: "Inspection Method",
            type: "textarea",
            placeholder: "Describe the inspection methodology...",
            defaultValue:
              "Non-invasive visual inspection from ground level and safe access points. This inspection does not include destructive testing or removal of materials.",
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
          {
            id: "ladder",
            label: "Ladder",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
          {
            id: "camera",
            label: "Digital Camera with GPS",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
          {
            id: "binoculars",
            label: "Binoculars",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
        ],
      },
    ],
    checklists: ["e2_as1", "b2_durability"],
  },
  {
    name: "Dispute Resolution Inspection",
    description:
      "Detailed court-ready inspection template for weathertightness disputes and legal proceedings",
    inspectionType: InspectionType.DISPUTE_RESOLUTION,
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
            placeholder: "Describe the scope of the inspection...",
            defaultValue:
              "Detailed forensic inspection of the roofing system to identify defects, assess causation, and provide expert opinion for dispute resolution purposes.",
            required: true,
          },
          {
            id: "instructions",
            label: "Instructions Received",
            type: "textarea",
            placeholder: "Describe the instructions received...",
            defaultValue: "",
            required: true,
          },
          {
            id: "documents_reviewed",
            label: "Documents Reviewed",
            type: "textarea",
            placeholder: "List documents reviewed...",
            defaultValue: "",
            required: false,
          },
        ],
      },
      {
        id: "methodology",
        name: "Methodology",
        description: "Describe the inspection methodology",
        required: true,
        order: 2,
        fields: [
          {
            id: "inspection_method",
            label: "Inspection Method",
            type: "textarea",
            placeholder: "Describe the inspection methodology...",
            defaultValue:
              "Systematic visual inspection with photographic documentation. All photographs include GPS coordinates and timestamps for chain of custody purposes. Inspection conducted in accordance with ISO/IEC 17020:2012 requirements.",
            required: true,
          },
          {
            id: "reproducibility",
            label: "Reproducibility Statement",
            type: "textarea",
            placeholder: "Describe how findings can be verified...",
            defaultValue:
              "The methodology employed is reproducible by another competent inspector. Findings are based on observable conditions documented through photography.",
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
          {
            id: "ladder",
            label: "Ladder",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
          {
            id: "camera",
            label: "Digital Camera with GPS",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
          {
            id: "moisture_meter",
            label: "Moisture Meter",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
          {
            id: "measuring_tape",
            label: "Measuring Tape",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
          {
            id: "pitch_gauge",
            label: "Pitch Gauge",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
        ],
      },
    ],
    checklists: ["e2_as1", "metal_roof_cop", "b2_durability"],
  },
  {
    name: "Visual Only Assessment",
    description:
      "Basic visual inspection template for quick condition assessments",
    inspectionType: InspectionType.VISUAL_ONLY,
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
            placeholder: "Describe the scope of the inspection...",
            defaultValue:
              "Visual-only assessment of externally visible roof elements. No access to roof surface or ceiling spaces.",
            required: true,
          },
          {
            id: "limitations",
            label: "Limitations",
            type: "textarea",
            placeholder: "List any limitations...",
            defaultValue:
              "This assessment is limited to visual observations from ground level only. Hidden defects, concealed flashings, and internal conditions are not assessed.",
            required: true,
          },
        ],
      },
      {
        id: "methodology",
        name: "Methodology",
        description: "Describe the inspection methodology",
        required: true,
        order: 2,
        fields: [
          {
            id: "inspection_method",
            label: "Inspection Method",
            type: "textarea",
            placeholder: "Describe the inspection methodology...",
            defaultValue:
              "Visual inspection from ground level using binoculars where required. Photographic documentation of observable conditions.",
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
          {
            id: "camera",
            label: "Digital Camera with GPS",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
          {
            id: "binoculars",
            label: "Binoculars",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
        ],
      },
    ],
    checklists: [],
  },
  {
    name: "Maintenance Review",
    description:
      "Template for routine maintenance assessments and condition monitoring",
    inspectionType: InspectionType.MAINTENANCE_REVIEW,
    isDefault: true,
    sections: [
      {
        id: "scope",
        name: "Scope of Works",
        description: "Define the extent of the maintenance review",
        required: true,
        order: 1,
        fields: [
          {
            id: "scope_description",
            label: "Review Scope",
            type: "textarea",
            placeholder: "Describe the scope of the review...",
            defaultValue:
              "Routine maintenance inspection to assess current condition, identify items requiring maintenance attention, and document any deterioration since previous inspection.",
            required: true,
          },
          {
            id: "previous_inspection",
            label: "Previous Inspection Reference",
            type: "text",
            placeholder: "Previous report number if applicable...",
            defaultValue: "",
            required: false,
          },
        ],
      },
      {
        id: "methodology",
        name: "Methodology",
        description: "Describe the inspection methodology",
        required: true,
        order: 2,
        fields: [
          {
            id: "inspection_method",
            label: "Inspection Method",
            type: "textarea",
            placeholder: "Describe the inspection methodology...",
            defaultValue:
              "Visual inspection of all accessible roof elements with photographic documentation. Comparison with previous inspection records where available.",
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
          {
            id: "ladder",
            label: "Ladder",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
          {
            id: "camera",
            label: "Digital Camera with GPS",
            type: "checkbox",
            defaultValue: "true",
            required: false,
          },
        ],
      },
    ],
    checklists: ["b2_durability"],
  },
];

async function seedTemplates() {
  console.log("Seeding report templates...");

  for (const template of defaultTemplates) {
    const existing = await prisma.reportTemplate.findUnique({
      where: { name: template.name },
    });

    if (existing) {
      console.log(`Template "${template.name}" already exists, updating...`);
      await prisma.reportTemplate.update({
        where: { name: template.name },
        data: {
          description: template.description,
          inspectionType: template.inspectionType,
          sections: template.sections,
          checklists: template.checklists,
          isDefault: template.isDefault,
          isActive: true,
        },
      });
    } else {
      console.log(`Creating template "${template.name}"...`);
      await prisma.reportTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          inspectionType: template.inspectionType,
          sections: template.sections,
          checklists: template.checklists,
          isDefault: template.isDefault,
          isActive: true,
        },
      });
    }
  }

  console.log("Template seeding complete!");
}

// Run if called directly
seedTemplates()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding templates:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { seedTemplates, defaultTemplates };
