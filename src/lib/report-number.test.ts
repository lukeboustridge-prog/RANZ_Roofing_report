/**
 * Report Number Generation Tests
 *
 * Tests for the unique report number generation utility.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrismaClient, resetPrismaMocks } from "@/test/mocks/prisma";

// Mock the database before importing the function
vi.mock("@/lib/db", () => ({
  default: mockPrismaClient,
}));

import { generateReportNumber } from "./report-number";

describe("generateReportNumber", () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it("should generate first report number for the year", async () => {
    mockPrismaClient.report.count.mockResolvedValue(0);

    const result = await generateReportNumber();

    const year = new Date().getFullYear();
    expect(result).toBe(`RANZ-${year}-00001`);
  });

  it("should increment based on existing reports", async () => {
    mockPrismaClient.report.count.mockResolvedValue(5);

    const result = await generateReportNumber();

    const year = new Date().getFullYear();
    expect(result).toBe(`RANZ-${year}-00006`);
  });

  it("should pad with leading zeros", async () => {
    mockPrismaClient.report.count.mockResolvedValue(99);

    const result = await generateReportNumber();

    const year = new Date().getFullYear();
    expect(result).toBe(`RANZ-${year}-00100`);
  });

  it("should handle large numbers", async () => {
    mockPrismaClient.report.count.mockResolvedValue(99999);

    const result = await generateReportNumber();

    const year = new Date().getFullYear();
    expect(result).toBe(`RANZ-${year}-100000`);
  });

  it("should query only reports for current year", async () => {
    mockPrismaClient.report.count.mockResolvedValue(0);

    await generateReportNumber();

    const year = new Date().getFullYear();
    expect(mockPrismaClient.report.count).toHaveBeenCalledWith({
      where: {
        reportNumber: {
          startsWith: `RANZ-${year}-`,
        },
      },
    });
  });
});
