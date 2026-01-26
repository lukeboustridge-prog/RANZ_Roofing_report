/**
 * LBP Complaint Service Tests
 *
 * Tests for the LBP (Licensed Building Practitioner) complaint management service.
 * These tests verify the business logic for creating, updating, and submitting
 * complaints to the Building Practitioners Board (BPB).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Use vi.hoisted to create mock before vi.mock hoisting
const { mockPrismaClient } = vi.hoisted(() => {
  return {
    mockPrismaClient: {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      report: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      lBPComplaint: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    },
  };
});

// Mock the prisma client
vi.mock("@/lib/db", () => ({
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import {
  createMockReport,
  createMockUser,
  createMockLBPComplaint,
  createMockPhoto,
  createMockDefect,
} from "@/test/utils";

// Import the service after mocking
import { lbpComplaintService } from "./lbp-complaint-service";

// Helper to reset all mocks
function resetPrismaMocks() {
  Object.values(mockPrismaClient).forEach((model) => {
    if (typeof model === "object" && model !== null) {
      Object.values(model).forEach((method) => {
        if (typeof method === "function" && "mockReset" in method) {
          (method as ReturnType<typeof vi.fn>).mockReset();
        }
      });
    }
  });
}

describe("LBPComplaintService", () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("generateComplaintNumber", () => {
    it("should generate first complaint number for the year", async () => {
      mockPrismaClient.lBPComplaint.findFirst.mockResolvedValue(null);

      const result = await lbpComplaintService.generateComplaintNumber();

      const year = new Date().getFullYear();
      expect(result).toBe(`RANZ-LBP-${year}-00001`);
    });

    it("should increment complaint number based on existing complaints", async () => {
      const year = new Date().getFullYear();
      mockPrismaClient.lBPComplaint.findFirst.mockResolvedValue({
        complaintNumber: `RANZ-LBP-${year}-00005`,
      });

      const result = await lbpComplaintService.generateComplaintNumber();

      expect(result).toBe(`RANZ-LBP-${year}-00006`);
    });

    it("should pad complaint number with leading zeros", async () => {
      const year = new Date().getFullYear();
      mockPrismaClient.lBPComplaint.findFirst.mockResolvedValue({
        complaintNumber: `RANZ-LBP-${year}-00099`,
      });

      const result = await lbpComplaintService.generateComplaintNumber();

      expect(result).toBe(`RANZ-LBP-${year}-00100`);
    });
  });

  describe("createFromReport", () => {
    const mockReport = createMockReport({
      id: "report-123",
      inspectionType: "DISPUTE_RESOLUTION",
      photos: [createMockPhoto({ id: "photo-1" })],
      defects: [createMockDefect({ id: "defect-1" })],
      inspector: createMockUser({ id: "inspector-1" }),
    });

    const mockAdmin = createMockUser({
      id: "admin-1",
      role: "ADMIN",
      name: "Admin User",
      email: "admin@ranz.org.nz",
    });

    it("should create a complaint from a dispute resolution report", async () => {
      mockPrismaClient.report.findUnique.mockResolvedValue(mockReport);
      mockPrismaClient.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaClient.lBPComplaint.findFirst.mockResolvedValue(null);
      mockPrismaClient.lBPComplaint.create.mockResolvedValue(
        createMockLBPComplaint({ reportId: "report-123" })
      );
      mockPrismaClient.auditLog.create.mockResolvedValue({});

      const result = await lbpComplaintService.createFromReport(
        "report-123",
        "admin-1"
      );

      expect(mockPrismaClient.lBPComplaint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reportId: "report-123",
            status: "DRAFT",
            workAddress: mockReport.propertyAddress,
          }),
        })
      );
      expect(result.reportId).toBe("report-123");
    });

    it("should throw error if report not found", async () => {
      mockPrismaClient.report.findUnique.mockResolvedValue(null);

      await expect(
        lbpComplaintService.createFromReport("invalid-id", "admin-1")
      ).rejects.toThrow("Report not found");
    });

    it("should throw error for non-dispute reports", async () => {
      mockPrismaClient.report.findUnique.mockResolvedValue(
        createMockReport({ inspectionType: "FULL_INSPECTION" })
      );

      await expect(
        lbpComplaintService.createFromReport("report-123", "admin-1")
      ).rejects.toThrow("Can only create complaints from dispute resolution reports");
    });

    it("should throw error if user is not admin", async () => {
      mockPrismaClient.report.findUnique.mockResolvedValue(mockReport);
      mockPrismaClient.user.findUnique.mockResolvedValue(
        createMockUser({ role: "INSPECTOR" })
      );

      await expect(
        lbpComplaintService.createFromReport("report-123", "inspector-1")
      ).rejects.toThrow("Only administrators can create LBP complaints");
    });

    it("should throw error if active complaint already exists", async () => {
      mockPrismaClient.report.findUnique.mockResolvedValue(mockReport);
      mockPrismaClient.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaClient.lBPComplaint.findFirst.mockResolvedValue(
        createMockLBPComplaint({ complaintNumber: "RANZ-LBP-2025-00001" })
      );

      await expect(
        lbpComplaintService.createFromReport("report-123", "admin-1")
      ).rejects.toThrow(/An active complaint.*already exists/);
    });
  });

  describe("getComplaint", () => {
    it("should return complaint with relations", async () => {
      const mockComplaint = createMockLBPComplaint();
      mockPrismaClient.lBPComplaint.findUnique.mockResolvedValue(mockComplaint);

      const result = await lbpComplaintService.getComplaint("complaint-id");

      expect(mockPrismaClient.lBPComplaint.findUnique).toHaveBeenCalledWith({
        where: { id: "complaint-id" },
        include: expect.objectContaining({
          report: expect.any(Object),
        }),
      });
      expect(result).toEqual(mockComplaint);
    });

    it("should return null if complaint not found", async () => {
      mockPrismaClient.lBPComplaint.findUnique.mockResolvedValue(null);

      const result = await lbpComplaintService.getComplaint("invalid-id");

      expect(result).toBeNull();
    });
  });

  describe("listComplaints", () => {
    it("should list complaints with pagination", async () => {
      const mockComplaints = [
        createMockLBPComplaint({ id: "1" }),
        createMockLBPComplaint({ id: "2" }),
      ];
      mockPrismaClient.lBPComplaint.findMany.mockResolvedValue(mockComplaints);
      mockPrismaClient.lBPComplaint.count.mockResolvedValue(10);

      const result = await lbpComplaintService.listComplaints({
        page: 1,
        pageSize: 20,
      });

      expect(result.complaints).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it("should filter by status", async () => {
      mockPrismaClient.lBPComplaint.findMany.mockResolvedValue([]);
      mockPrismaClient.lBPComplaint.count.mockResolvedValue(0);

      await lbpComplaintService.listComplaints({ status: "DRAFT" });

      expect(mockPrismaClient.lBPComplaint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "DRAFT" },
        })
      );
    });
  });

  describe("updateComplaint", () => {
    const mockAdmin = createMockUser({ role: "ADMIN" });

    it("should update draft complaint", async () => {
      mockPrismaClient.lBPComplaint.findUnique.mockResolvedValue(
        createMockLBPComplaint({ status: "DRAFT" })
      );
      mockPrismaClient.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaClient.lBPComplaint.update.mockResolvedValue(
        createMockLBPComplaint({ workDescription: "Updated description" })
      );
      mockPrismaClient.auditLog.create.mockResolvedValue({});

      const result = await lbpComplaintService.updateComplaint(
        "complaint-id",
        "admin-1",
        { workDescription: "Updated description" }
      );

      expect(mockPrismaClient.lBPComplaint.update).toHaveBeenCalled();
      expect(result.workDescription).toBe("Updated description");
    });

    it("should throw error for non-editable status", async () => {
      mockPrismaClient.lBPComplaint.findUnique.mockResolvedValue(
        createMockLBPComplaint({ status: "SUBMITTED" })
      );

      await expect(
        lbpComplaintService.updateComplaint("complaint-id", "admin-1", {
          workDescription: "Updated",
        })
      ).rejects.toThrow("Cannot edit complaint after approval");
    });
  });

  describe("submitForReview", () => {
    it("should submit draft complaint for review", async () => {
      const completeComplaint = createMockLBPComplaint({
        status: "DRAFT",
        subjectLbpNumber: "BP123456",
        subjectLbpName: "Test Builder",
        workDescription: "Description",
        conductDescription: "Conduct issues",
        evidenceSummary: "Evidence",
        groundsForDiscipline: ["NEGLIGENCE"],
      });
      mockPrismaClient.lBPComplaint.findUnique.mockResolvedValue(completeComplaint);
      mockPrismaClient.lBPComplaint.update.mockResolvedValue({
        ...completeComplaint,
        status: "PENDING_REVIEW",
      });
      mockPrismaClient.auditLog.create.mockResolvedValue({});

      const result = await lbpComplaintService.submitForReview(
        "complaint-id",
        "admin-1"
      );

      expect(result.status).toBe("PENDING_REVIEW");
    });

    it("should throw error if not in draft status", async () => {
      mockPrismaClient.lBPComplaint.findUnique.mockResolvedValue(
        createMockLBPComplaint({ status: "PENDING_REVIEW" })
      );

      await expect(
        lbpComplaintService.submitForReview("complaint-id", "admin-1")
      ).rejects.toThrow("Complaint must be in draft status");
    });
  });

  describe("reviewComplaint", () => {
    const mockSuperAdmin = createMockUser({ role: "SUPER_ADMIN", name: "Super Admin" });

    it("should approve complaint", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockSuperAdmin);
      mockPrismaClient.lBPComplaint.findUnique.mockResolvedValue(
        createMockLBPComplaint({ status: "PENDING_REVIEW" })
      );
      mockPrismaClient.lBPComplaint.update.mockResolvedValue(
        createMockLBPComplaint({ status: "READY_TO_SUBMIT" })
      );
      mockPrismaClient.auditLog.create.mockResolvedValue({});

      const result = await lbpComplaintService.reviewComplaint(
        "complaint-id",
        "super-admin-1",
        { approved: true, reviewNotes: "Looks good" }
      );

      expect(result.status).toBe("READY_TO_SUBMIT");
    });

    it("should reject complaint back to draft", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockSuperAdmin);
      mockPrismaClient.lBPComplaint.findUnique.mockResolvedValue(
        createMockLBPComplaint({ status: "PENDING_REVIEW" })
      );
      mockPrismaClient.lBPComplaint.update.mockResolvedValue(
        createMockLBPComplaint({ status: "DRAFT" })
      );
      mockPrismaClient.auditLog.create.mockResolvedValue({});

      const result = await lbpComplaintService.reviewComplaint(
        "complaint-id",
        "super-admin-1",
        { approved: false, reviewNotes: "Needs more detail" }
      );

      expect(result.status).toBe("DRAFT");
    });

    it("should throw error if user is not super admin", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(
        createMockUser({ role: "ADMIN" })
      );

      await expect(
        lbpComplaintService.reviewComplaint("complaint-id", "admin-1", {
          approved: true,
        })
      ).rejects.toThrow("Only super administrators can review complaints");
    });
  });

  describe("signComplaint", () => {
    const mockAdmin = createMockUser({ role: "ADMIN", name: "Admin User" });

    it("should sign approved complaint", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaClient.lBPComplaint.findUnique.mockResolvedValue(
        createMockLBPComplaint({ status: "READY_TO_SUBMIT" })
      );
      mockPrismaClient.lBPComplaint.update.mockResolvedValue(
        createMockLBPComplaint({
          signedBy: "admin-1",
          signedAt: new Date(),
          declarationAccepted: true,
        })
      );
      mockPrismaClient.auditLog.create.mockResolvedValue({});

      const result = await lbpComplaintService.signComplaint(
        "complaint-id",
        "admin-1",
        { declarationAccepted: true, signatureData: "base64-signature" }
      );

      expect(result.declarationAccepted).toBe(true);
    });

    it("should throw error if declaration not accepted", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaClient.lBPComplaint.findUnique.mockResolvedValue(
        createMockLBPComplaint({ status: "READY_TO_SUBMIT" })
      );

      await expect(
        lbpComplaintService.signComplaint("complaint-id", "admin-1", {
          declarationAccepted: false,
          signatureData: "base64-signature",
        })
      ).rejects.toThrow("Declaration must be accepted");
    });
  });

  describe("withdrawComplaint", () => {
    it("should withdraw complaint with reason", async () => {
      mockPrismaClient.lBPComplaint.findUnique.mockResolvedValue(
        createMockLBPComplaint({ status: "SUBMITTED" })
      );
      mockPrismaClient.lBPComplaint.update.mockResolvedValue(
        createMockLBPComplaint({ status: "WITHDRAWN" })
      );
      mockPrismaClient.auditLog.create.mockResolvedValue({});

      const result = await lbpComplaintService.withdrawComplaint(
        "complaint-id",
        "admin-1",
        "Issue resolved amicably"
      );

      expect(result.status).toBe("WITHDRAWN");
    });

    it("should not withdraw already decided complaint", async () => {
      mockPrismaClient.lBPComplaint.findUnique.mockResolvedValue(
        createMockLBPComplaint({ status: "DECIDED" })
      );

      await expect(
        lbpComplaintService.withdrawComplaint(
          "complaint-id",
          "admin-1",
          "Reason"
        )
      ).rejects.toThrow(/Cannot withdraw complaint/);
    });
  });

  describe("getStats", () => {
    it("should return complaint statistics", async () => {
      mockPrismaClient.lBPComplaint.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10) // draft
        .mockResolvedValueOnce(5) // pending review
        .mockResolvedValueOnce(30) // submitted
        .mockResolvedValueOnce(15) // active
        .mockResolvedValueOnce(40); // closed

      const stats = await lbpComplaintService.getStats();

      expect(stats).toEqual({
        totalComplaints: 100,
        draftComplaints: 10,
        pendingReviewComplaints: 5,
        submittedComplaints: 30,
        activeComplaints: 15,
        closedComplaints: 40,
      });
    });
  });

  describe("calculateHash", () => {
    it("should calculate SHA-256 hash of data", () => {
      const data = Buffer.from("test data");
      const hash = lbpComplaintService.calculateHash(data);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should return consistent hash for same data", () => {
      const data = Buffer.from("consistent test");
      const hash1 = lbpComplaintService.calculateHash(data);
      const hash2 = lbpComplaintService.calculateHash(data);

      expect(hash1).toBe(hash2);
    });

    it("should return different hash for different data", () => {
      const data1 = Buffer.from("test data 1");
      const data2 = Buffer.from("test data 2");

      const hash1 = lbpComplaintService.calculateHash(data1);
      const hash2 = lbpComplaintService.calculateHash(data2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
