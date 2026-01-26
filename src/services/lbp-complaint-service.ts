/**
 * LBP Complaint Service
 *
 * Core business logic for creating, managing, and submitting
 * complaints to the Building Practitioners Board (BPB).
 */

import { prisma } from "@/lib/db";
import { LBPComplaintStatus } from "@prisma/client";
import type {
  UpdateLBPComplaintInput,
  ReviewComplaintInput,
  SignComplaintInput,
  BPBResponseInput,
} from "@/types/lbp-complaint";
import {
  COMPLAINT_NUMBER_PREFIX,
  RANZ_DETAILS,
  REQUIRED_FIELDS_FOR_SUBMISSION,
  LBP_AUDIT_ACTIONS,
} from "@/lib/constants/lbp";
import crypto from "crypto";

export class LBPComplaintService {
  /**
   * Generate unique complaint number: RANZ-LBP-YYYY-NNNNN
   */
  async generateComplaintNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${COMPLAINT_NUMBER_PREFIX}-${year}-`;

    // Find highest number for current year
    const latestComplaint = await prisma.lBPComplaint.findFirst({
      where: {
        complaintNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        complaintNumber: "desc",
      },
    });

    let nextNumber = 1;
    if (latestComplaint) {
      const lastNumber = parseInt(
        latestComplaint.complaintNumber.split("-").pop() || "0"
      );
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
  }

  /**
   * Create complaint from dispute report
   */
  async createFromReport(reportId: string, adminUserId: string) {
    // Verify report exists and is a dispute report
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        defects: true,
        photos: true,
        inspector: true,
      },
    });

    if (!report) {
      throw new Error("Report not found");
    }

    if (report.inspectionType !== "DISPUTE_RESOLUTION") {
      throw new Error("Can only create complaints from dispute resolution reports");
    }

    // Verify admin has permission
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!admin || !["ADMIN", "SUPER_ADMIN"].includes(admin.role)) {
      throw new Error("Only administrators can create LBP complaints");
    }

    // Check if complaint already exists for this report
    const existingComplaint = await prisma.lBPComplaint.findFirst({
      where: {
        reportId: report.id,
        status: {
          notIn: ["WITHDRAWN", "CLOSED"],
        },
      },
    });

    if (existingComplaint) {
      throw new Error(
        `An active complaint (${existingComplaint.complaintNumber}) already exists for this report`
      );
    }

    // Generate complaint number
    const complaintNumber = await this.generateComplaintNumber();

    // Create draft complaint with pre-filled data from report
    const complaint = await prisma.lBPComplaint.create({
      data: {
        complaintNumber,
        reportId: report.id,
        status: "DRAFT",

        // Pre-fill from report
        workAddress: report.propertyAddress,
        workCity: report.propertyCity,
        workStartDate: report.inspectionDate,
        workDescription: "",
        conductDescription: "",
        evidenceSummary: "",

        groundsForDiscipline: [],
        subjectLbpNumber: "",
        subjectLbpName: "",
        subjectLbpLicenseTypes: [],

        // Complainant (RANZ)
        complainantName: RANZ_DETAILS.name,
        complainantAddress: RANZ_DETAILS.address,
        complainantPhone: RANZ_DETAILS.phone,
        complainantEmail: RANZ_DETAILS.email,
        complainantRelation: RANZ_DETAILS.relation,

        // Admin details
        preparedBy: admin.id,
        preparedByName: admin.name,
        preparedByEmail: admin.email,

        // Auto-attach all photos and defects from report
        attachedPhotoIds: report.photos.map((p) => p.id),
        attachedDefectIds: report.defects.map((d) => d.id),
      },
    });

    // Create audit log
    await this.createAuditLog(
      reportId,
      adminUserId,
      LBP_AUDIT_ACTIONS.COMPLAINT_CREATED,
      {
        complaintId: complaint.id,
        complaintNumber,
        status: "DRAFT",
      }
    );

    return complaint;
  }

  /**
   * Get complaint by ID with relations
   */
  async getComplaint(complaintId: string) {
    return prisma.lBPComplaint.findUnique({
      where: { id: complaintId },
      include: {
        report: {
          include: {
            photos: true,
            defects: true,
            inspector: {
              select: {
                id: true,
                name: true,
                email: true,
                lbpNumber: true,
                qualifications: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * List complaints with optional filtering
   */
  async listComplaints(options?: {
    status?: LBPComplaintStatus;
    preparedBy?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, preparedBy, page = 1, pageSize = 20 } = options || {};

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (preparedBy) where.preparedBy = preparedBy;

    const [complaints, total] = await Promise.all([
      prisma.lBPComplaint.findMany({
        where,
        include: {
          report: {
            select: {
              reportNumber: true,
              propertyAddress: true,
              propertyCity: true,
              inspectionDate: true,
              clientName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lBPComplaint.count({ where }),
    ]);

    return {
      complaints,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update complaint details
   */
  async updateComplaint(
    complaintId: string,
    adminUserId: string,
    data: UpdateLBPComplaintInput
  ) {
    const complaint = await prisma.lBPComplaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    if (!["DRAFT", "PENDING_REVIEW"].includes(complaint.status)) {
      throw new Error("Cannot edit complaint after approval");
    }

    // Verify admin permission
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!admin || !["ADMIN", "SUPER_ADMIN"].includes(admin.role)) {
      throw new Error("Only administrators can update complaints");
    }

    // Build update object with only defined fields
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    const updated = await prisma.lBPComplaint.update({
      where: { id: complaintId },
      data: updateData,
    });

    // Audit log
    await this.createAuditLog(
      complaint.reportId,
      adminUserId,
      LBP_AUDIT_ACTIONS.COMPLAINT_UPDATED,
      {
        complaintId,
        changes: Object.keys(data),
      }
    );

    return updated;
  }

  /**
   * Submit complaint for review
   */
  async submitForReview(complaintId: string, adminUserId: string) {
    const complaint = await prisma.lBPComplaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    if (complaint.status !== "DRAFT") {
      throw new Error("Complaint must be in draft status to submit for review");
    }

    // Validate required fields
    this.validateComplaintData(complaint);

    const updated = await prisma.lBPComplaint.update({
      where: { id: complaintId },
      data: {
        status: "PENDING_REVIEW",
      },
    });

    // Audit log
    await this.createAuditLog(
      complaint.reportId,
      adminUserId,
      LBP_AUDIT_ACTIONS.COMPLAINT_SUBMITTED_FOR_REVIEW,
      { complaintId }
    );

    return updated;
  }

  /**
   * Review complaint (approve or reject)
   */
  async reviewComplaint(
    complaintId: string,
    adminUserId: string,
    input: ReviewComplaintInput
  ) {
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!admin || admin.role !== "SUPER_ADMIN") {
      throw new Error("Only super administrators can review complaints");
    }

    const complaint = await prisma.lBPComplaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    if (complaint.status !== "PENDING_REVIEW") {
      throw new Error("Complaint must be pending review");
    }

    const newStatus = input.approved ? "READY_TO_SUBMIT" : "DRAFT";

    const updated = await prisma.lBPComplaint.update({
      where: { id: complaintId },
      data: {
        status: newStatus,
        reviewedBy: admin.id,
        reviewedByName: admin.name,
        reviewedAt: new Date(),
        reviewNotes: input.reviewNotes,
      },
    });

    // Audit log
    await this.createAuditLog(
      complaint.reportId,
      adminUserId,
      input.approved
        ? LBP_AUDIT_ACTIONS.COMPLAINT_APPROVED
        : LBP_AUDIT_ACTIONS.COMPLAINT_REJECTED,
      {
        complaintId,
        reviewNotes: input.reviewNotes,
      }
    );

    return updated;
  }

  /**
   * Sign complaint with digital signature
   */
  async signComplaint(
    complaintId: string,
    adminUserId: string,
    input: SignComplaintInput
  ) {
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!admin || !["ADMIN", "SUPER_ADMIN"].includes(admin.role)) {
      throw new Error("Only administrators can sign complaints");
    }

    const complaint = await prisma.lBPComplaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    if (complaint.status !== "READY_TO_SUBMIT") {
      throw new Error("Complaint must be approved before signing");
    }

    if (!input.declarationAccepted) {
      throw new Error("Declaration must be accepted to sign the complaint");
    }

    const updated = await prisma.lBPComplaint.update({
      where: { id: complaintId },
      data: {
        signedBy: admin.id,
        signedByName: admin.name,
        signatureData: input.signatureData,
        signedAt: new Date(),
        declarationAccepted: true,
      },
    });

    // Audit log
    await this.createAuditLog(
      complaint.reportId,
      adminUserId,
      LBP_AUDIT_ACTIONS.COMPLAINT_SIGNED,
      { complaintId }
    );

    return updated;
  }

  /**
   * Withdraw complaint
   */
  async withdrawComplaint(
    complaintId: string,
    adminUserId: string,
    reason: string
  ) {
    const complaint = await prisma.lBPComplaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    // Can only withdraw if not yet decided
    const nonWithdrawableStatuses: LBPComplaintStatus[] = [
      "DECIDED",
      "CLOSED",
      "WITHDRAWN",
    ];
    if (nonWithdrawableStatuses.includes(complaint.status)) {
      throw new Error(`Cannot withdraw complaint in ${complaint.status} status`);
    }

    const updated = await prisma.lBPComplaint.update({
      where: { id: complaintId },
      data: {
        status: "WITHDRAWN",
        bpbNotes: reason,
      },
    });

    // Audit log
    await this.createAuditLog(
      complaint.reportId,
      adminUserId,
      LBP_AUDIT_ACTIONS.COMPLAINT_WITHDRAWN,
      { complaintId, reason }
    );

    return updated;
  }

  /**
   * Update BPB response information
   */
  async updateBPBResponse(
    complaintId: string,
    adminUserId: string,
    input: BPBResponseInput
  ) {
    const complaint = await prisma.lBPComplaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    // Determine new status based on BPB response
    let newStatus = complaint.status;
    if (input.bpbAcknowledgedAt && complaint.status === "SUBMITTED") {
      newStatus = "ACKNOWLEDGED";
    }
    if (input.bpbDecision) {
      newStatus = "DECIDED";
    }

    const updated = await prisma.lBPComplaint.update({
      where: { id: complaintId },
      data: {
        ...input,
        status: newStatus,
      },
    });

    // Audit log
    await this.createAuditLog(
      complaint.reportId,
      adminUserId,
      LBP_AUDIT_ACTIONS.BPB_RESPONSE_RECEIVED,
      { complaintId, ...input }
    );

    return updated;
  }

  /**
   * Mark submission as complete (called after email sent)
   */
  async markAsSubmitted(
    complaintId: string,
    adminUserId: string,
    submissionData: {
      submissionEmail: string;
      submissionConfirmation: string;
      complaintPdfUrl?: string;
      complaintPdfHash?: string;
      evidencePackageUrl?: string;
      evidencePackageHash?: string;
    }
  ) {
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!admin) {
      throw new Error("Admin not found");
    }

    const complaint = await prisma.lBPComplaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const updated = await prisma.lBPComplaint.update({
      where: { id: complaintId },
      data: {
        status: "SUBMITTED",
        submittedBy: admin.id,
        submittedByName: admin.name,
        submittedAt: new Date(),
        submissionMethod: "EMAIL",
        ...submissionData,
      },
    });

    // Audit log
    await this.createAuditLog(
      complaint.reportId,
      adminUserId,
      LBP_AUDIT_ACTIONS.COMPLAINT_SUBMITTED_TO_BPB,
      {
        complaintId,
        submissionEmail: submissionData.submissionEmail,
        confirmationId: submissionData.submissionConfirmation,
      }
    );

    return updated;
  }

  /**
   * Get complaint statistics
   */
  async getStats() {
    const [
      totalComplaints,
      draftComplaints,
      pendingReviewComplaints,
      submittedComplaints,
      activeComplaints,
      closedComplaints,
    ] = await Promise.all([
      prisma.lBPComplaint.count(),
      prisma.lBPComplaint.count({ where: { status: "DRAFT" } }),
      prisma.lBPComplaint.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.lBPComplaint.count({ where: { status: "SUBMITTED" } }),
      prisma.lBPComplaint.count({
        where: {
          status: { in: ["UNDER_INVESTIGATION", "HEARING_SCHEDULED"] },
        },
      }),
      prisma.lBPComplaint.count({
        where: { status: { in: ["CLOSED", "WITHDRAWN"] } },
      }),
    ]);

    return {
      totalComplaints,
      draftComplaints,
      pendingReviewComplaints,
      submittedComplaints,
      activeComplaints,
      closedComplaints,
    };
  }

  /**
   * Calculate hash for integrity verification
   */
  calculateHash(data: Buffer): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Validate complaint has all required data for submission
   */
  private validateComplaintData(complaint: Record<string, unknown>): void {
    const missingFields: string[] = [];

    for (const field of REQUIRED_FIELDS_FOR_SUBMISSION) {
      const value = complaint[field];
      if (value === null || value === undefined || value === "") {
        missingFields.push(field);
      } else if (Array.isArray(value) && value.length === 0) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields for submission: ${missingFields.join(", ")}`
      );
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    reportId: string,
    userId: string,
    action: string,
    details?: Record<string, unknown>
  ) {
    // The existing AuditLog model uses AuditAction enum which doesn't have LBP actions
    // Store LBP actions as 'UPDATED' with details containing the specific action
    await prisma.auditLog.create({
      data: {
        reportId,
        userId,
        action: "UPDATED", // Use existing enum value
        details: {
          lbpAction: action,
          ...details,
        },
      },
    });
  }
}

export const lbpComplaintService = new LBPComplaintService();
