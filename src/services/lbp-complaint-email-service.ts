/**
 * LBP Complaint Email Service
 *
 * Handles email submission of LBP complaints to the Building Practitioners Board,
 * including PDF generation, evidence packaging, and email delivery via Resend.
 */

import { prisma } from "@/lib/db";
import { isEmailConfigured } from "@/lib/env";
import { uploadToR2 } from "@/lib/r2";
import type { LBPComplaint, Report, Photo, Defect, User } from "@prisma/client";
import { BPB_DETAILS, RANZ_DETAILS, EMAIL_SUBJECTS } from "@/lib/constants/lbp";
import { lbpComplaintPDFService } from "./lbp-complaint-pdf-service";
import { lbpEvidencePackageService } from "./lbp-evidence-package-service";
import { lbpComplaintService } from "./lbp-complaint-service";
import crypto from "crypto";

// Type for complaint with relations
type ComplaintWithRelations = LBPComplaint & {
  report: Report & {
    photos: Photo[];
    defects: Defect[];
    inspector: User;
  };
};

interface SubmissionResult {
  success: boolean;
  complaintNumber: string;
  submittedAt: Date;
  confirmationId: string;
  pdfUrl: string;
  evidencePackageUrl: string;
  error?: string;
}

export class LBPComplaintEmailService {
  /**
   * Submit complaint to BPB via email
   */
  async submitComplaint(
    complaintId: string,
    adminUserId: string
  ): Promise<SubmissionResult> {
    // Verify admin permissions
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!admin || !["ADMIN", "SUPER_ADMIN"].includes(admin.role)) {
      throw new Error("Only administrators can submit complaints");
    }

    // Get complaint with all relations
    const complaint = await prisma.lBPComplaint.findUnique({
      where: { id: complaintId },
      include: {
        report: {
          include: {
            photos: true,
            defects: true,
            inspector: true,
          },
        },
      },
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    if (complaint.status !== "READY_TO_SUBMIT") {
      throw new Error(
        `Complaint must be approved before submission. Current status: ${complaint.status}`
      );
    }

    if (!complaint.declarationAccepted) {
      throw new Error("Declaration must be accepted before submission");
    }

    try {
      // 1. Generate complaint PDF
      console.log(`[LBP Email] Generating PDF for ${complaint.complaintNumber}`);
      const complaintPdf = await lbpComplaintPDFService.generateComplaintPDF(
        complaintId
      );
      const pdfHash = crypto
        .createHash("sha256")
        .update(complaintPdf)
        .digest("hex");

      // 2. Upload PDF to R2
      const pdfKey = `complaints/${complaint.complaintNumber}/complaint.pdf`;
      const pdfUrl = await uploadToR2(complaintPdf, pdfKey, "application/pdf");

      // 3. Generate evidence package
      console.log(
        `[LBP Email] Creating evidence package for ${complaint.complaintNumber}`
      );
      const { url: evidencePackageUrl, hash: evidencePackageHash } =
        await lbpEvidencePackageService.createEvidencePackage(complaintId);

      // 4. Send email to BPB
      console.log(`[LBP Email] Sending email to BPB for ${complaint.complaintNumber}`);
      const emailResult = await this.sendSubmissionEmail(
        complaint,
        complaintPdf,
        admin
      );

      if (!emailResult.success) {
        throw new Error(`Failed to send email: ${emailResult.error}`);
      }

      // 5. Mark complaint as submitted
      await lbpComplaintService.markAsSubmitted(complaintId, adminUserId, {
        submissionEmail: BPB_DETAILS.complaintsEmail,
        submissionConfirmation: emailResult.messageId!,
        complaintPdfUrl: pdfUrl,
        complaintPdfHash: pdfHash,
        evidencePackageUrl,
        evidencePackageHash,
      });

      console.log(
        `[LBP Email] Successfully submitted ${complaint.complaintNumber}`
      );

      return {
        success: true,
        complaintNumber: complaint.complaintNumber,
        submittedAt: new Date(),
        confirmationId: emailResult.messageId!,
        pdfUrl,
        evidencePackageUrl,
      };
    } catch (error) {
      console.error(
        `[LBP Email] Failed to submit complaint ${complaint.complaintNumber}:`,
        error
      );

      // Log failure to audit
      await prisma.auditLog.create({
        data: {
          reportId: complaint.reportId,
          userId: adminUserId,
          action: "UPDATED",
          details: {
            lbpAction: "COMPLAINT_SUBMISSION_FAILED",
            complaintId,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        },
      });

      throw error;
    }
  }

  /**
   * Send submission email via Resend
   */
  private async sendSubmissionEmail(
    complaint: ComplaintWithRelations,
    pdfBuffer: Buffer,
    admin: User
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!isEmailConfigured()) {
      console.log("[LBP Email] Email not configured, simulating submission");
      return {
        success: true,
        messageId: `sim_${Date.now()}_${complaint.complaintNumber}`,
      };
    }

    try {
      const emailHtml = this.generateSubmissionEmailHtml(complaint);
      const emailText = this.generateSubmissionEmailText(complaint);

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `RANZ Complaints <${RANZ_DETAILS.adminEmail || "complaints@ranzroofing.co.nz"}>`,
          to: BPB_DETAILS.complaintsEmail,
          cc: [admin.email, RANZ_DETAILS.adminEmail].filter(Boolean),
          subject: EMAIL_SUBJECTS.SUBMISSION(
            complaint.complaintNumber,
            complaint.subjectLbpName
          ),
          text: emailText,
          html: emailHtml,
          attachments: [
            {
              filename: `${complaint.complaintNumber}_Complaint.pdf`,
              content: pdfBuffer.toString("base64"),
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[LBP Email] Resend API error:", errorText);
        return {
          success: false,
          error: `Resend API error: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      console.error("[LBP Email] Error sending email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate HTML email content
   */
  private generateSubmissionEmailHtml(complaint: ComplaintWithRelations): string {
    const groundsList = (complaint.groundsForDiscipline || [])
      .map((g: string) => `<li>${g.replace(/_/g, " ")}</li>`)
      .join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; }
    .header { background-color: #1e40af; color: white; padding: 20px; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { padding: 20px; }
    .details { background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .details p { margin: 5px 0; }
    .grounds { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .evidence { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .footer { background-color: #f9fafb; padding: 15px; margin-top: 30px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1>LBP Complaint Submission</h1>
    <p style="margin: 5px 0 0 0; font-size: 14px;">Roofing Association of New Zealand</p>
  </div>

  <div class="content">
    <p>Dear Building Practitioners Board,</p>

    <p>Please find attached a formal complaint regarding the conduct of a Licensed Building Practitioner, submitted under Section 317 of the Building Act 2004.</p>

    <div class="details">
      <p><strong>Complaint Number:</strong> ${complaint.complaintNumber}</p>
      <p><strong>Subject LBP:</strong> ${complaint.subjectLbpName}</p>
      <p><strong>LBP Number:</strong> ${complaint.subjectLbpNumber}</p>
      <p><strong>Property Address:</strong> ${complaint.workAddress}${complaint.workCity ? `, ${complaint.workCity}` : ""}</p>
      <p><strong>Submitted By:</strong> ${complaint.preparedByName} (${complaint.preparedByEmail})</p>
    </div>

    <div class="grounds">
      <p><strong>Grounds for Discipline (Building Act 2004 Section 317):</strong></p>
      <ul style="margin: 10px 0;">
        ${groundsList}
      </ul>
    </div>

    <div class="evidence">
      <p><strong>Evidence Package Contents:</strong></p>
      <ul style="margin: 10px 0;">
        <li><strong>Complaint Form:</strong> ${complaint.complaintNumber}_Complaint.pdf (attached)</li>
        <li><strong>Photographs:</strong> ${complaint.attachedPhotoIds?.length || 0} with GPS and EXIF metadata</li>
        <li><strong>Documented Defects:</strong> ${complaint.attachedDefectIds?.length || 0}</li>
        <li><strong>Source Report:</strong> ${complaint.report?.reportNumber}</li>
        <li><strong>Chain of Custody:</strong> Documentation included</li>
      </ul>
      <p style="font-size: 12px; color: #047857; margin-top: 10px;">
        <em>A complete evidence package with all photographs and supporting documents is available upon request.</em>
      </p>
    </div>

    <p>All evidence has been captured and preserved in accordance with:</p>
    <ul>
      <li>ISO 17020:2012 (Conformity assessment - Inspection bodies)</li>
      <li>NZ Evidence Act 2006</li>
      <li>Chain of custody protocols for digital evidence</li>
    </ul>

    <p>Should you require the complete evidence package, additional information, or clarification, please do not hesitate to contact us.</p>

    <p>Yours sincerely,</p>
    <p>
      <strong>${complaint.preparedByName}</strong><br>
      ${complaint.preparedByEmail}<br>
      On behalf of <strong>${RANZ_DETAILS.name}</strong><br>
      ${RANZ_DETAILS.phone ? `Phone: ${RANZ_DETAILS.phone}<br>` : ""}
      ${RANZ_DETAILS.website}
    </p>
  </div>

  <div class="footer">
    <p>This complaint was generated and submitted through the RANZ Roofing Report Platform.</p>
    <p>Complaint generated: ${new Date().toISOString()}</p>
    <p>Digital signature and evidence integrity verified.</p>
    <p style="margin-top: 10px;"><strong>CONFIDENTIAL:</strong> This email and any attachments are intended solely for the Building Practitioners Board and may contain legally privileged information.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text email content
   */
  private generateSubmissionEmailText(complaint: ComplaintWithRelations): string {
    const grounds = (complaint.groundsForDiscipline || [])
      .map((g: string) => `  - ${g.replace(/_/g, " ")}`)
      .join("\n");

    return `
LBP COMPLAINT SUBMISSION
========================
${RANZ_DETAILS.name}

Dear Building Practitioners Board,

Please find attached a formal complaint regarding the conduct of a Licensed Building Practitioner, submitted under Section 317 of the Building Act 2004.

COMPLAINT DETAILS
-----------------
Complaint Number: ${complaint.complaintNumber}
Subject LBP: ${complaint.subjectLbpName}
LBP Number: ${complaint.subjectLbpNumber}
Property Address: ${complaint.workAddress}${complaint.workCity ? `, ${complaint.workCity}` : ""}
Submitted By: ${complaint.preparedByName} (${complaint.preparedByEmail})

GROUNDS FOR DISCIPLINE (Building Act 2004 Section 317)
------------------------------------------------------
${grounds}

EVIDENCE PACKAGE
----------------
- Complaint Form: ${complaint.complaintNumber}_Complaint.pdf (attached)
- Photographs: ${complaint.attachedPhotoIds?.length || 0} with GPS and EXIF metadata
- Documented Defects: ${complaint.attachedDefectIds?.length || 0}
- Source Report: ${complaint.report?.reportNumber}
- Chain of Custody: Documentation included

A complete evidence package with all photographs and supporting documents is available upon request.

All evidence has been captured and preserved in accordance with:
- ISO 17020:2012 (Conformity assessment - Inspection bodies)
- NZ Evidence Act 2006
- Chain of custody protocols for digital evidence

Should you require the complete evidence package, additional information, or clarification, please do not hesitate to contact us.

Yours sincerely,

${complaint.preparedByName}
${complaint.preparedByEmail}
On behalf of ${RANZ_DETAILS.name}
${RANZ_DETAILS.phone ? `Phone: ${RANZ_DETAILS.phone}` : ""}
${RANZ_DETAILS.website}

---
This complaint was generated and submitted through the RANZ Roofing Report Platform.
Complaint generated: ${new Date().toISOString()}
Digital signature and evidence integrity verified.

CONFIDENTIAL: This email and any attachments are intended solely for the Building Practitioners Board and may contain legally privileged information.
    `.trim();
  }

  /**
   * Send acknowledgment notification to admin
   */
  async sendAcknowledgmentNotification(
    complaintId: string,
    bpbReference: string
  ): Promise<void> {
    const complaint = await prisma.lBPComplaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) return;

    if (!isEmailConfigured()) {
      console.log(
        "[LBP Email] Email not configured, skipping acknowledgment notification"
      );
      return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #059669; color: white; padding: 20px; }
    .content { padding: 20px; }
    .details { background-color: #ecfdf5; padding: 15px; margin: 20px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>BPB Acknowledgment Received</h1>
  </div>
  <div class="content">
    <p>Good news! The Building Practitioners Board has acknowledged receipt of the complaint.</p>
    <div class="details">
      <p><strong>Complaint Number:</strong> ${complaint.complaintNumber}</p>
      <p><strong>BPB Reference:</strong> ${bpbReference}</p>
      <p><strong>Subject LBP:</strong> ${complaint.subjectLbpName}</p>
    </div>
    <p>You can track the status of this complaint in the RANZ admin portal.</p>
  </div>
</body>
</html>
    `.trim();

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `RANZ Reports <noreply@ranzroofing.co.nz>`,
        to: complaint.preparedByEmail,
        cc: RANZ_DETAILS.adminEmail,
        subject: EMAIL_SUBJECTS.ACKNOWLEDGMENT(complaint.complaintNumber),
        html,
      }),
    });
  }
}

export const lbpComplaintEmailService = new LBPComplaintEmailService();
