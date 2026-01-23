import prisma from "./db";

/**
 * Generate a unique report number in format: RANZ-YYYY-NNNNN
 * Example: RANZ-2025-00234
 */
export async function generateReportNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RANZ-${year}-`;

  const count = await prisma.report.count({
    where: {
      reportNumber: {
        startsWith: prefix,
      },
    },
  });

  const number = (count + 1).toString().padStart(5, "0");
  return `${prefix}${number}`;
}
