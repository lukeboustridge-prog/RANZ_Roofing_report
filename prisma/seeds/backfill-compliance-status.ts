import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Compute compliance status from checklist results JSON.
 * Returns: PASS | FAIL | PARTIAL | NOT_ASSESSED
 */
function computeComplianceStatus(
  checklistResults: Record<string, Record<string, string>>
): "PASS" | "FAIL" | "PARTIAL" | "NOT_ASSESSED" {
  const allStatuses: string[] = [];

  for (const checklist of Object.values(checklistResults)) {
    for (const status of Object.values(checklist)) {
      allStatuses.push(status.toLowerCase());
    }
  }

  if (allStatuses.length === 0) return "NOT_ASSESSED";

  const hasFail = allStatuses.includes("fail");
  const hasPartial = allStatuses.includes("partial");
  const assessedStatuses = allStatuses.filter(s => s !== "na");

  if (assessedStatuses.length === 0) return "NOT_ASSESSED";

  if (hasFail) return "FAIL";
  if (hasPartial) return "PARTIAL";

  // All assessed items are "pass"
  return "PASS";
}

async function backfillComplianceStatus() {
  console.log("Backfilling complianceStatus on Report...\n");

  // Get all compliance assessments
  const assessments = await prisma.complianceAssessment.findMany({
    select: {
      reportId: true,
      checklistResults: true,
    },
  });

  console.log(`Found ${assessments.length} compliance assessments to process`);

  let updated = 0;
  let skipped = 0;

  for (const assessment of assessments) {
    const results = assessment.checklistResults as Record<string, Record<string, string>>;
    const status = computeComplianceStatus(results);

    if (status === "NOT_ASSESSED") {
      skipped++;
      continue;
    }

    await prisma.report.update({
      where: { id: assessment.reportId },
      data: { complianceStatus: status },
    });

    updated++;
    console.log(`  ${assessment.reportId} -> ${status}`);
  }

  console.log(`\nBackfill complete: ${updated} updated, ${skipped} skipped (NOT_ASSESSED)`);
}

async function main() {
  try {
    await backfillComplianceStatus();
  } catch (error) {
    console.error("Error backfilling compliance status:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
