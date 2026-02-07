import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================
// TEST USERS
// ============================================

const testUsers = [
  {
    clerkId: "uat_inspector_001",
    email: "inspector@uat.ranz.org.nz",
    name: "Jane Inspector",
    phone: "+64 21 555 0001",
    role: "INSPECTOR" as const,
    status: "ACTIVE" as const,
    company: "NZ Roofing Inspections Ltd",
    qualifications: "NZQA Level 5 Roofing, LBP Design 2",
    lbpNumber: "BP123456",
    yearsExperience: 12,
    specialisations: ["Metal roofing", "Membrane systems"],
    onboardingCompleted: true,
    onboardingStep: 5,
    onboardingCompletedAt: new Date("2026-01-15"),
  },
  {
    clerkId: "uat_reviewer_001",
    email: "reviewer@uat.ranz.org.nz",
    name: "Tom Reviewer",
    phone: "+64 21 555 0002",
    role: "REVIEWER" as const,
    status: "ACTIVE" as const,
    company: "RANZ Quality Assurance",
    qualifications: "NZQA Level 6 Building, Senior LBP",
    lbpNumber: "BP654321",
    yearsExperience: 20,
    specialisations: ["Quality review", "Compliance assessment"],
    onboardingCompleted: true,
    onboardingStep: 5,
    onboardingCompletedAt: new Date("2026-01-10"),
  },
  {
    clerkId: "uat_admin_001",
    email: "admin@uat.ranz.org.nz",
    name: "Sarah Admin",
    phone: "+64 21 555 0003",
    role: "ADMIN" as const,
    status: "ACTIVE" as const,
    company: "RANZ Head Office",
    onboardingCompleted: true,
    onboardingStep: 5,
    onboardingCompletedAt: new Date("2026-01-05"),
  },
];

// ============================================
// SAMPLE REPORTS
// ============================================

function createReportData(
  inspectorId: string,
  index: number,
  overrides: Record<string, unknown> = {}
) {
  const reports = [
    {
      reportNumber: `RANZ-2026-UAT001`,
      status: "DRAFT" as const,
      propertyAddress: "42 Lambton Quay",
      propertyCity: "Wellington",
      propertyRegion: "Wellington",
      propertyPostcode: "6011",
      propertyType: "COMMERCIAL_LOW" as const,
      inspectionDate: new Date("2026-02-01"),
      inspectionType: "FULL_INSPECTION" as const,
      clientName: "Wellington Property Trust",
      clientEmail: "trust@example.co.nz",
      weatherConditions: "Overcast, light wind",
      temperature: 16.5,
      accessMethod: "Roof hatch and ladder",
    },
    {
      reportNumber: `RANZ-2026-UAT002`,
      status: "PENDING_REVIEW" as const,
      propertyAddress: "15 Queen Street",
      propertyCity: "Auckland",
      propertyRegion: "Auckland",
      propertyPostcode: "1010",
      propertyType: "RESIDENTIAL_1" as const,
      inspectionDate: new Date("2026-01-28"),
      inspectionType: "PRE_PURCHASE" as const,
      clientName: "Mike and Lisa Chen",
      clientEmail: "chen.family@example.co.nz",
      weatherConditions: "Fine, warm",
      temperature: 24.0,
      accessMethod: "Extension ladder",
      submittedAt: new Date("2026-01-29"),
    },
    {
      reportNumber: `RANZ-2026-UAT003`,
      status: "APPROVED" as const,
      propertyAddress: "88 Riccarton Road",
      propertyCity: "Christchurch",
      propertyRegion: "Canterbury",
      propertyPostcode: "8011",
      propertyType: "RESIDENTIAL_2" as const,
      inspectionDate: new Date("2026-01-20"),
      inspectionType: "DISPUTE_RESOLUTION" as const,
      clientName: "Canterbury Home Owners Assoc",
      clientEmail: "disputes@choa.co.nz",
      clientPhone: "+64 3 555 1234",
      weatherConditions: "Clear, dry",
      temperature: 22.0,
      accessMethod: "Cherry picker",
      submittedAt: new Date("2026-01-21"),
      approvedAt: new Date("2026-01-23"),
    },
    {
      reportNumber: `RANZ-2026-UAT004`,
      status: "FINALISED" as const,
      propertyAddress: "3 Marine Parade",
      propertyCity: "Napier",
      propertyRegion: "Hawke's Bay",
      propertyPostcode: "4110",
      propertyType: "RESIDENTIAL_1" as const,
      inspectionDate: new Date("2026-01-10"),
      inspectionType: "VISUAL_ONLY" as const,
      clientName: "Napier City Council",
      clientEmail: "inspections@napier.govt.nz",
      weatherConditions: "Sunny, still",
      temperature: 28.0,
      accessMethod: "Ground-level visual",
      submittedAt: new Date("2026-01-11"),
      approvedAt: new Date("2026-01-13"),
      declarationSigned: true,
      signedAt: new Date("2026-01-14"),
    },
    {
      reportNumber: `RANZ-2026-UAT005`,
      status: "REVISION_REQUIRED" as const,
      propertyAddress: "201 Great South Road",
      propertyCity: "Hamilton",
      propertyRegion: "Waikato",
      propertyPostcode: "3204",
      propertyType: "INDUSTRIAL" as const,
      inspectionDate: new Date("2026-01-25"),
      inspectionType: "NON_INVASIVE" as const,
      clientName: "Waikato Industrial Parks Ltd",
      clientEmail: "maintenance@wip.co.nz",
      weatherConditions: "Light rain",
      temperature: 18.0,
      accessMethod: "Internal access via mezzanine",
      submittedAt: new Date("2026-01-26"),
      revisionRound: 1,
    },
    {
      reportNumber: `RANZ-2026-UAT006`,
      status: "APPROVED" as const,
      propertyAddress: "55 Devonport Road",
      propertyCity: "Tauranga",
      propertyRegion: "Bay of Plenty",
      propertyPostcode: "3110",
      propertyType: "COMMERCIAL_HIGH" as const,
      inspectionDate: new Date("2026-01-15"),
      inspectionType: "MAINTENANCE_REVIEW" as const,
      clientName: "BOP Commercial Holdings",
      clientEmail: "facilities@bopc.co.nz",
      weatherConditions: "Partly cloudy",
      temperature: 25.0,
      accessMethod: "Roof access walkway",
      submittedAt: new Date("2026-01-16"),
      approvedAt: new Date("2026-01-18"),
    },
  ];

  return {
    ...reports[index],
    inspectorId,
    ...overrides,
  };
}

// ============================================
// SAMPLE DEFECTS
// ============================================

const defectTemplates = [
  {
    title: "Corroded ridge flashing",
    description: "Significant corrosion observed on galvanised ridge flashing along the north-south ridge line.",
    location: "Main ridge, north-south axis",
    classification: "MAJOR_DEFECT" as const,
    severity: "HIGH" as const,
    observation: "Ridge flashing shows surface corrosion exceeding 30% of visible area with pitting visible to naked eye.",
    analysis: "Galvanised coating has failed prematurely, likely due to coastal exposure category E exceeding material specification.",
    opinion: "Replacement required within 6 months to prevent moisture ingress into roof cavity.",
    codeReference: "E2/AS1 9.1",
    recommendation: "Replace with grade 316 stainless steel ridge flashing suitable for exposure category E.",
    priorityLevel: "SHORT_TERM" as const,
    estimatedCost: "$2,500 - $3,500",
  },
  {
    title: "Missing gutter bracket",
    description: "Gutter bracket missing at approximately 1.8m from downpipe junction on east elevation.",
    location: "East elevation gutter run",
    classification: "MINOR_DEFECT" as const,
    severity: "MEDIUM" as const,
    observation: "Gap between gutter brackets exceeds manufacturer maximum of 900mm, measured at 1800mm span.",
    analysis: "Bracket may have been omitted during installation or has since detached.",
    recommendation: "Install additional gutter bracket to restore maximum 900mm spacing.",
    priorityLevel: "MEDIUM_TERM" as const,
    estimatedCost: "$150 - $250",
  },
  {
    title: "Ponding on flat roof section",
    description: "Standing water observed 48 hours after last rainfall on flat membrane section.",
    location: "Flat roof area adjacent to parapet wall, north side",
    classification: "MAJOR_DEFECT" as const,
    severity: "CRITICAL" as const,
    observation: "Ponding water approximately 15mm deep over 2m x 3m area. Water has not drained 48hrs post-rainfall.",
    analysis: "Membrane drainage fall appears insufficient. Minimum 1.5 degree fall to outlet not achieved.",
    opinion: "Chronic ponding will accelerate membrane degradation and risk leaking within 12 months.",
    codeReference: "E2/AS1 Table 1",
    copReference: "Section 5.1",
    recommendation: "Re-grade membrane with tapered insulation to achieve minimum 1.5 degree fall to outlet.",
    priorityLevel: "IMMEDIATE" as const,
    estimatedCost: "$8,000 - $12,000",
  },
  {
    title: "Fastener over-driven",
    description: "Multiple over-driven fasteners observed on west elevation long-run cladding.",
    location: "West elevation, bays 3-5",
    classification: "WORKMANSHIP_ISSUE" as const,
    severity: "LOW" as const,
    observation: "Approximately 15 fasteners show deformed neoprene washer indicating over-driving.",
    recommendation: "Replace over-driven fasteners with correctly tensioned replacements.",
    priorityLevel: "LONG_TERM" as const,
    estimatedCost: "$300 - $500",
  },
  {
    title: "Skylight flashing deterioration",
    description: "Lead flashing around skylight shows cracking and lifting at sill.",
    location: "Skylight #1, master bedroom",
    classification: "SAFETY_HAZARD" as const,
    severity: "HIGH" as const,
    observation: "Lead apron flashing cracked at 2 points with 5mm lifting at sill edge. Daylight visible through gap.",
    analysis: "Thermal cycling has caused fatigue cracking in lead flashing. Original installation may have been too thin gauge.",
    opinion: "Active leak risk. Water ingress likely during driving rain from the south.",
    codeReference: "E2/AS1 9.2",
    recommendation: "Strip and replace all skylight flashings with code-compliant system.",
    priorityLevel: "IMMEDIATE" as const,
    estimatedCost: "$1,800 - $2,800",
  },
  {
    title: "Insufficient roof underlay lap",
    description: "Underlay visible at eave line showing laps below minimum requirement.",
    location: "South eave, full length",
    classification: "MAINTENANCE_ITEM" as const,
    severity: "MEDIUM" as const,
    observation: "Underlay laps measured at 75mm where minimum 150mm required per E2/AS1.",
    recommendation: "Monitor during next maintenance visit. Repair if moisture detected in cavity.",
    priorityLevel: "MEDIUM_TERM" as const,
    estimatedCost: "$500 - $900",
  },
];

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seedUATData() {
  console.log("=== UAT Seed Data ===\n");

  // 1. Upsert test users
  console.log("Seeding test users...");
  const users: Record<string, string> = {};

  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { clerkId: userData.clerkId },
      create: userData,
      update: {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: userData.status,
      },
    });
    users[userData.role] = user.id;
    console.log(`  + ${user.name} (${user.role}) - ${user.id}`);
  }

  const inspectorId = users["INSPECTOR"];
  const reviewerId = users["REVIEWER"];
  const adminId = users["ADMIN"];

  // 2. Create sample reports
  console.log("\nSeeding reports...");
  const reportIds: string[] = [];

  for (let i = 0; i < 6; i++) {
    const data = createReportData(inspectorId, i, {
      reviewerId: i >= 1 ? reviewerId : undefined,
    });

    // Check if report already exists
    const existing = await prisma.report.findUnique({
      where: { reportNumber: data.reportNumber },
    });

    if (existing) {
      reportIds.push(existing.id);
      console.log(`  ~ ${data.reportNumber} already exists (${data.status})`);
      continue;
    }

    const report = await prisma.report.create({ data });
    reportIds.push(report.id);
    console.log(`  + ${report.reportNumber} (${data.status})`);

    // Create audit log for each report
    await prisma.auditLog.create({
      data: {
        reportId: report.id,
        userId: inspectorId,
        action: "CREATED",
        details: { reportNumber: report.reportNumber, source: "uat-seed" },
      },
    });
  }

  // 3. Create defects (2-4 per report)
  console.log("\nSeeding defects...");
  let defectCount = 0;

  for (let i = 0; i < reportIds.length; i++) {
    const reportId = reportIds[i];
    const numDefects = 2 + (i % 3); // 2, 3, 4, 2, 3, 4

    // Check if report already has defects
    const existingDefects = await prisma.defect.count({ where: { reportId } });
    if (existingDefects > 0) {
      console.log(`  ~ Report ${i + 1}: ${existingDefects} defects already exist`);
      continue;
    }

    for (let d = 0; d < numDefects; d++) {
      const template = defectTemplates[(i * 2 + d) % defectTemplates.length];
      await prisma.defect.create({
        data: {
          reportId,
          defectNumber: d + 1,
          ...template,
        },
      });
      defectCount++;
    }
    console.log(`  + Report ${i + 1}: ${numDefects} defects`);
  }
  console.log(`  Total: ${defectCount} defects created`);

  // 4. Create compliance assessments on 3 reports (reports 3, 4, 6 - APPROVED/FINALISED)
  console.log("\nSeeding compliance assessments...");
  const complianceReportIndices = [2, 3, 5]; // 0-indexed

  for (const idx of complianceReportIndices) {
    const reportId = reportIds[idx];

    const existing = await prisma.complianceAssessment.findUnique({
      where: { reportId },
    });
    if (existing) {
      console.log(`  ~ Report ${idx + 1}: compliance assessment already exists`);
      continue;
    }

    const checklistResults: Record<string, Record<string, string>> = {
      "E2/AS1": {
        e2_3_1: "pass",
        e2_3_2: idx === 2 ? "fail" : "pass",
        e2_pitch: "pass",
        e2_flashing_junctions: idx === 5 ? "partial" : "pass",
        e2_flashing_penetrations: "pass",
        e2_underlay: "pass",
        e2_gutters: idx === 2 ? "fail" : "pass",
        e2_clearances: "pass",
        e2_ventilation: "na",
        e2_compatibility: "pass",
        e2_sealants: "pass",
      },
      Metal_Roof_COP_v25_12: {
        cop_3_1: "pass",
        cop_3_2: "pass",
        cop_4_1: idx === 2 ? "fail" : "pass",
        cop_4_2: "pass",
        cop_5_1: "pass",
        cop_6_1: "pass",
        cop_7_1: "pass",
        cop_7_2: idx === 5 ? "partial" : "pass",
        cop_7_3: "pass",
        cop_8_1: "pass",
        cop_8_2: "pass",
        cop_9_1: "pass",
        cop_9_2: "pass",
        cop_10_1: "pass",
        cop_10_2: "pass",
        cop_11_1: "na",
      },
      B2_Durability: {
        b2_cladding_15: "pass",
        b2_flashing_15: idx === 2 ? "fail" : "pass",
        b2_fastener: "pass",
        b2_sealant_5: "pass",
        b2_coating: "pass",
        b2_structure_50: "pass",
        b2_condition_age: "pass",
        b2_accelerated_wear: idx === 2 ? "fail" : "pass",
        b2_maintenance: "pass",
        b2_environmental: "pass",
      },
    };

    const hasFailure = Object.values(checklistResults).some(checklist =>
      Object.values(checklist).includes("fail")
    );

    await prisma.complianceAssessment.create({
      data: {
        reportId,
        checklistResults,
        nonComplianceSummary: hasFailure
          ? "Non-compliance items identified in E2/AS1 and/or B2 Durability assessments. See individual checklist results for details."
          : null,
      },
    });
    console.log(`  + Report ${idx + 1}: compliance assessment (${hasFailure ? "has failures" : "all pass"})`);
  }

  // 5. Create notifications
  console.log("\nSeeding notifications...");
  const notificationData = [
    { type: "REPORT_SUBMITTED" as const, title: "Report Submitted", message: "Report RANZ-2026-UAT002 has been submitted for review.", userId: reviewerId, reportId: reportIds[1], read: false },
    { type: "REPORT_APPROVED" as const, title: "Report Approved", message: "Report RANZ-2026-UAT003 has been approved.", userId: inspectorId, reportId: reportIds[2], read: true, readAt: new Date("2026-01-24") },
    { type: "REPORT_FINALIZED" as const, title: "Report Finalised", message: "Report RANZ-2026-UAT004 has been finalised and is ready for distribution.", userId: inspectorId, reportId: reportIds[3], read: true, readAt: new Date("2026-01-15") },
    { type: "REPORT_REJECTED" as const, title: "Revision Required", message: "Report RANZ-2026-UAT005 requires revisions. Please check reviewer comments.", userId: inspectorId, reportId: reportIds[4], read: false },
    { type: "REPORT_COMMENTS" as const, title: "New Review Comments", message: "New comments on report RANZ-2026-UAT005 from Tom Reviewer.", userId: inspectorId, reportId: reportIds[4], read: false },
    { type: "NEW_ASSIGNMENT" as const, title: "New Assignment", message: "You have been assigned a new inspection at 100 Ponsonby Road, Auckland.", userId: inspectorId, read: false },
    { type: "WELCOME" as const, title: "Welcome to RANZ Reports", message: "Welcome Jane! Complete your profile to get started with inspections.", userId: inspectorId, read: true, readAt: new Date("2026-01-15") },
    { type: "SYSTEM_ANNOUNCEMENT" as const, title: "Platform Update", message: "New features available: evidence package export and batch PDF generation.", userId: inspectorId, read: false },
    { type: "ONBOARDING_COMPLETE" as const, title: "Onboarding Complete", message: "Congratulations! Your inspector profile is now complete.", userId: inspectorId, read: true, readAt: new Date("2026-01-16") },
    { type: "SHARE_ACCESSED" as const, title: "Report Viewed", message: "Someone accessed your shared report RANZ-2026-UAT003.", userId: inspectorId, reportId: reportIds[2], read: false },
  ];

  // Check if notifications already exist for these users
  const existingNotifCount = await prisma.notification.count({
    where: {
      userId: { in: [inspectorId, reviewerId, adminId] },
      title: { in: notificationData.map(n => n.title) },
    },
  });

  if (existingNotifCount > 0) {
    console.log(`  ~ ${existingNotifCount} notifications already exist, skipping`);
  } else {
    for (const notif of notificationData) {
      await prisma.notification.create({ data: notif });
    }
    console.log(`  + ${notificationData.length} notifications created`);
  }

  // 6. Create report shares
  console.log("\nSeeding report shares...");
  const shareData = [
    {
      reportId: reportIds[2],
      createdById: inspectorId,
      recipientEmail: "client@example.co.nz",
      recipientName: "Canterbury Home Owners",
      accessLevel: "VIEW_DOWNLOAD" as const,
      expiresAt: new Date("2026-03-01"),
      password: null,
    },
    {
      reportId: reportIds[3],
      createdById: inspectorId,
      recipientEmail: "legal@example.co.nz",
      recipientName: "Smith & Associates Law",
      accessLevel: "VIEW_ONLY" as const,
      expiresAt: new Date("2026-04-01"),
      // bcrypt hash of "TestPassword123" - in production this would be hashed
      password: "$2b$10$UAT.placeholder.hash.for.testing.purposes.only",
    },
  ];

  const existingShares = await prisma.reportShare.count({
    where: {
      reportId: { in: [reportIds[2], reportIds[3]] },
      createdById: inspectorId,
    },
  });

  if (existingShares > 0) {
    console.log(`  ~ ${existingShares} shares already exist, skipping`);
  } else {
    for (const share of shareData) {
      await prisma.reportShare.create({ data: share });
    }
    console.log(`  + 2 report shares created (1 with password, 1 without)`);
  }

  console.log("\n=== UAT Seed Complete ===");
  console.log(`Users: ${testUsers.length}`);
  console.log(`Reports: ${reportIds.length}`);
  console.log(`Defects: ${defectCount}`);
  console.log(`Compliance assessments: ${complianceReportIndices.length}`);
  console.log(`Notifications: ${notificationData.length}`);
  console.log(`Report shares: ${shareData.length}`);
}

async function main() {
  try {
    await seedUATData();
  } catch (error) {
    console.error("Error seeding UAT data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
