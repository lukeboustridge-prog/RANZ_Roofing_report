import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// E2/AS1 4th Edition - External Moisture Checklist
const e2As1Checklist = {
  name: "E2/AS1 4th Edition - External Moisture",
  category: "compliance",
  standard: "E2/AS1",
  items: [
    {
      id: "e2_3_1",
      section: "E2.3.1",
      item: "Precipitation Shedding",
      description:
        "Roofs and exterior walls must shed precipitation. Assessment of whether the roof system effectively sheds water and snow without allowing accumulation or ponding that could lead to moisture ingress.",
      required: true,
    },
    {
      id: "e2_3_2",
      section: "E2.3.2",
      item: "Water Penetration Prevention",
      description:
        "Building elements must prevent water penetration that could cause undue dampness, damage to building elements, or both. Assessment of weathertightness performance.",
      required: true,
    },
    {
      id: "e2_pitch",
      section: "E2/AS1 Table 1",
      item: "Roof Pitch Adequacy",
      description:
        "Roof pitch must be adequate for the installed cladding type per E2/AS1 Table 1. Minimum pitch requirements vary by profile and exposure.",
      required: true,
    },
    {
      id: "e2_flashing_junctions",
      section: "E2/AS1 9.1",
      item: "Flashing at Junctions",
      description:
        "All roof/wall junctions, penetrations, and changes in roof plane must have appropriate flashings installed to E2/AS1 requirements.",
      required: true,
    },
    {
      id: "e2_flashing_penetrations",
      section: "E2/AS1 9.2",
      item: "Penetration Flashings",
      description:
        "All roof penetrations (pipes, vents, skylights) must have code-compliant flashings that maintain weathertightness under expected conditions.",
      required: true,
    },
    {
      id: "e2_underlay",
      section: "E2/AS1 8.5",
      item: "Underlay Installation",
      description:
        "Roof underlay must be installed correctly with adequate laps, sealed at penetrations, and appropriate for the roof pitch and climate zone.",
      required: true,
    },
    {
      id: "e2_gutters",
      section: "E2/AS1 10.1",
      item: "Gutter and Drainage",
      description:
        "Gutters and downpipes must be adequately sized, correctly installed, and functional to handle expected rainfall without overflow or backing up.",
      required: true,
    },
    {
      id: "e2_clearances",
      section: "E2/AS1 6.1",
      item: "Ground Clearances",
      description:
        "Cladding must maintain required clearances from ground level, paving, and decks to prevent moisture wicking and splash-back damage.",
      required: true,
    },
    {
      id: "e2_ventilation",
      section: "E2/AS1 8.6",
      item: "Roof Cavity Ventilation",
      description:
        "Roof cavities must have adequate ventilation to prevent condensation buildup and moisture damage to structural elements and insulation.",
      required: true,
    },
    {
      id: "e2_compatibility",
      section: "E2/AS1 4.1",
      item: "Material Compatibility",
      description:
        "All roof materials must be compatible with each other (no galvanic corrosion risk) and suitable for the environmental exposure category.",
      required: true,
    },
    {
      id: "e2_sealants",
      section: "E2/AS1 9.4",
      item: "Sealant Condition",
      description:
        "All sealants at penetrations and junctions must be intact, properly applied, and show no signs of failure, cracking, or degradation.",
      required: true,
    },
  ],
};

// Metal Roof and Wall Cladding Code of Practice v25.12
const metalRoofCopChecklist = {
  name: "Metal Roof and Wall Cladding Code of Practice v25.12",
  category: "compliance",
  standard: "Metal_Roof_COP_v25.12",
  items: [
    {
      id: "cop_3_1",
      section: "Section 3.1",
      item: "Structure/B1 Compliance - Support",
      description:
        "Roof structure must provide adequate support for cladding. Purlins/battens must be at correct centres for the profile and span tables.",
      required: true,
    },
    {
      id: "cop_3_2",
      section: "Section 3.2",
      item: "Fastening Patterns",
      description:
        "Fasteners must be installed at correct patterns and centres per manufacturer specifications and COP requirements for wind zone.",
      required: true,
    },
    {
      id: "cop_4_1",
      section: "Section 4.1",
      item: "Durability/B2 - Environmental Category",
      description:
        "Materials must be appropriate for the environmental exposure category (C, D, or E) based on distance from marine/industrial sources.",
      required: true,
    },
    {
      id: "cop_4_2",
      section: "Section 4.2",
      item: "Material Expected Life",
      description:
        "Roof cladding materials must have a durability rating meeting the 15-year minimum requirement for moderately accessible elements.",
      required: true,
    },
    {
      id: "cop_5_1",
      section: "Section 5.1",
      item: "Roof Drainage/E1 Compliance",
      description:
        "Roof drainage system must be designed and installed to effectively remove rainwater without causing damage or overflow.",
      required: true,
    },
    {
      id: "cop_6_1",
      section: "Section 6.1",
      item: "External Moisture/E2 - General",
      description:
        "Overall roof system must prevent moisture ingress and comply with E2 performance requirements for the building type.",
      required: true,
    },
    {
      id: "cop_7_1",
      section: "Section 7.1",
      item: "Minimum Roof Pitch",
      description:
        "Roof pitch must meet or exceed the minimum requirement for the specific profile installed (typically 3-8 degrees depending on profile).",
      required: true,
    },
    {
      id: "cop_7_2",
      section: "Section 7.2",
      item: "End Lap Requirements",
      description:
        "End laps (transverse joints) must have minimum overlaps per profile requirements, typically 150-200mm with sealant.",
      required: true,
    },
    {
      id: "cop_7_3",
      section: "Section 7.3",
      item: "Side Lap Requirements",
      description:
        "Side laps must have minimum one full rib overlap and be fastened at correct centres to prevent wind uplift.",
      required: true,
    },
    {
      id: "cop_8_1",
      section: "Section 8.1",
      item: "Flashing Design",
      description:
        "Flashings must be designed and installed per COP details with adequate cover, turn-ups, and weatherproofing.",
      required: true,
    },
    {
      id: "cop_8_2",
      section: "Section 8.2",
      item: "Sealant Application",
      description:
        "Sealants must be appropriate type (neutral cure silicone or polyurethane) and correctly applied per COP requirements.",
      required: false,
    },
    {
      id: "cop_9_1",
      section: "Section 9.1",
      item: "Fastener Type",
      description:
        "Fasteners must be appropriate type (hex head, pan head) with correct material (stainless, class 4) for exposure category.",
      required: true,
    },
    {
      id: "cop_9_2",
      section: "Section 9.2",
      item: "Fastener Spacing",
      description:
        "Fastener spacing must comply with wind zone requirements and manufacturer specifications for edge and field zones.",
      required: true,
    },
    {
      id: "cop_10_1",
      section: "Section 10.1",
      item: "Internal Moisture/E3 - Condensation",
      description:
        "Roof system must manage condensation risk through appropriate underlay, ventilation, and insulation detailing.",
      required: true,
    },
    {
      id: "cop_10_2",
      section: "Section 10.2",
      item: "Underlay Specification",
      description:
        "Underlay must be appropriate type (permeable or impermeable) correctly installed with taped laps at low pitches.",
      required: true,
    },
    {
      id: "cop_11_1",
      section: "Section 11.1",
      item: "Expansion Allowances",
      description:
        "Long roof runs must have provision for thermal expansion through slotted holes or expansion joints.",
      required: false,
    },
  ],
};

// B2 Durability Assessment Checklist
const b2DurabilityChecklist = {
  name: "B2 Durability Assessment",
  category: "compliance",
  standard: "B2_Durability",
  items: [
    {
      id: "b2_cladding_15",
      section: "B2.3.1(a)",
      item: "Roof Cladding Durability",
      description:
        "Roof cladding (moderately accessible building element) must have a minimum 15-year durability expectancy. Assessment of current condition relative to age.",
      required: true,
    },
    {
      id: "b2_flashing_15",
      section: "B2.3.1(a)",
      item: "Flashing Durability",
      description:
        "Flashings (moderately accessible) must have minimum 15-year durability. Check for corrosion, deformation, or degradation relative to expected life.",
      required: true,
    },
    {
      id: "b2_fastener",
      section: "B2.3.1",
      item: "Fastener Durability",
      description:
        "Fasteners must be appropriate material (stainless steel preferred, minimum class 4 galvanized) with no signs of corrosion or failure.",
      required: true,
    },
    {
      id: "b2_sealant_5",
      section: "B2.3.1(b)",
      item: "Sealant Durability",
      description:
        "Sealants (easily accessible, maintainable element) must have minimum 5-year durability. Assessment of condition and maintenance history.",
      required: true,
    },
    {
      id: "b2_coating",
      section: "B2.3.1(a)",
      item: "Paint/Coating Durability",
      description:
        "Paint systems and coatings must show adequate durability for age. Assessment of chalking, fading, peeling, or corrosion initiation.",
      required: true,
    },
    {
      id: "b2_structure_50",
      section: "B2.3.1(c)",
      item: "Structural Element Durability",
      description:
        "Difficult to access or replace structural elements (rafters, purlins) must have 50-year durability expectancy. Assessment of timber/steel condition.",
      required: true,
    },
    {
      id: "b2_condition_age",
      section: "B2 General",
      item: "Condition vs Expected Life",
      description:
        "Overall assessment of whether roof system condition is appropriate for its age. A 10-year-old roof should still have substantial remaining life.",
      required: true,
    },
    {
      id: "b2_accelerated_wear",
      section: "B2 General",
      item: "Signs of Accelerated Wear",
      description:
        "Assessment of any evidence of premature failure or accelerated deterioration (incorrect material selection, installation defects, extreme exposure).",
      required: true,
    },
    {
      id: "b2_maintenance",
      section: "B2.3.2",
      item: "Maintenance Requirements",
      description:
        "Assessment of whether maintenance specified by the building consent has been carried out and is adequate for continued durability.",
      required: true,
    },
    {
      id: "b2_environmental",
      section: "B2.3.1",
      item: "Environmental Exposure Assessment",
      description:
        "Confirmation that materials are appropriate for the actual environmental exposure (marine, industrial, geothermal) and not underspecified.",
      required: true,
    },
  ],
};

async function seedComplianceChecklists() {
  console.log("Seeding compliance checklists...\n");

  // Check and create E2/AS1 checklist
  const existingE2 = await prisma.checklist.findFirst({
    where: { standard: "E2/AS1" },
  });

  if (!existingE2) {
    const e2 = await prisma.checklist.create({
      data: e2As1Checklist,
    });
    console.log(`✓ Created: ${e2.name} (${e2As1Checklist.items.length} items)`);
  } else {
    console.log(`○ Skipped: E2/AS1 checklist already exists`);
  }

  // Check and create Metal Roof COP checklist
  const existingCop = await prisma.checklist.findFirst({
    where: { standard: "Metal_Roof_COP_v25.12" },
  });

  if (!existingCop) {
    const cop = await prisma.checklist.create({
      data: metalRoofCopChecklist,
    });
    console.log(
      `✓ Created: ${cop.name} (${metalRoofCopChecklist.items.length} items)`
    );
  } else {
    console.log(`○ Skipped: Metal Roof COP checklist already exists`);
  }

  // Check and create B2 Durability checklist
  const existingB2 = await prisma.checklist.findFirst({
    where: { standard: "B2_Durability" },
  });

  if (!existingB2) {
    const b2 = await prisma.checklist.create({
      data: b2DurabilityChecklist,
    });
    console.log(
      `✓ Created: ${b2.name} (${b2DurabilityChecklist.items.length} items)`
    );
  } else {
    console.log(`○ Skipped: B2 Durability checklist already exists`);
  }

  console.log("\n✓ Compliance checklists seeding complete!");
}

// Also create default report templates
async function seedReportTemplates() {
  console.log("\nSeeding report templates...\n");

  const templates = [
    {
      name: "Full Inspection Template",
      description:
        "Complete roofing inspection including all compliance assessments. Required for building consent applications and legal reports.",
      inspectionType: "FULL_INSPECTION" as const,
      sections: [
        "property",
        "inspection",
        "elements",
        "defects",
        "compliance",
        "conclusions",
        "sign-off",
      ],
      checklists: {
        required: ["E2/AS1", "Metal_Roof_COP_v25.12", "B2_Durability"],
        optional: [],
      },
      isDefault: true,
      isActive: true,
    },
    {
      name: "Visual Inspection Template",
      description:
        "Visual-only inspection from ground level. Limited scope, no invasive testing.",
      inspectionType: "VISUAL_ONLY" as const,
      sections: [
        "property",
        "inspection",
        "elements",
        "defects",
        "compliance",
        "conclusions",
        "sign-off",
      ],
      checklists: {
        required: ["E2/AS1"],
        optional: ["B2_Durability"],
      },
      isDefault: false,
      isActive: true,
    },
    {
      name: "Pre-Purchase Inspection Template",
      description:
        "Pre-purchase inspection for property buyers. Focus on defects and remaining life assessment.",
      inspectionType: "PRE_PURCHASE" as const,
      sections: [
        "property",
        "inspection",
        "elements",
        "defects",
        "compliance",
        "conclusions",
        "sign-off",
      ],
      checklists: {
        required: ["E2/AS1", "B2_Durability"],
        optional: ["Metal_Roof_COP_v25.12"],
      },
      isDefault: false,
      isActive: true,
    },
    {
      name: "Maintenance Review Template",
      description:
        "Routine maintenance inspection for existing clients. Simplified scope.",
      inspectionType: "MAINTENANCE_REVIEW" as const,
      sections: [
        "property",
        "inspection",
        "elements",
        "defects",
        "conclusions",
      ],
      checklists: {
        required: [],
        optional: ["E2/AS1", "B2_Durability"],
      },
      isDefault: false,
      isActive: true,
    },
  ];

  for (const template of templates) {
    const existing = await prisma.reportTemplate.findUnique({
      where: { name: template.name },
    });

    if (!existing) {
      const created = await prisma.reportTemplate.create({
        data: template,
      });
      console.log(`✓ Created template: ${created.name}`);
    } else {
      console.log(`○ Skipped: ${template.name} already exists`);
    }
  }

  console.log("\n✓ Report templates seeding complete!");
}

async function main() {
  try {
    await seedComplianceChecklists();
    await seedReportTemplates();
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
