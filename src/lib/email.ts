/**
 * Email Service
 * Handles sending notifications via Resend email API
 */

import { isEmailConfigured } from "./env";
import { emailTemplateService } from "@/services/email-template-service";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// RANZ branded email template
function wrapInTemplate(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
  <!-- Header -->
  <div style="background-color: #2d5c8f; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">RANZ Roofing Report</h1>
  </div>

  <!-- Content -->
  <div style="background-color: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    ${content}
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 16px; color: #6b7280; font-size: 12px;">
    <p style="margin: 0;">This is an automated notification from RANZ Roofing Report Platform</p>
    <p style="margin: 8px 0 0 0;">Please do not reply to this email.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<SendResult> {
  if (!isEmailConfigured()) {
    console.log("[Email] Resend not configured, skipping email:", options.subject);
    return {
      success: false,
      error: "Email not configured",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "RANZ Reports <noreply@ranzroofing.co.nz>",
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Email] Failed to send:", error);
      return {
        success: false,
        error: `Failed to send email: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log("[Email] Sent successfully:", options.subject, "to:", options.to);

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// Review Notification Templates
// ============================================

interface ReportInfo {
  reportNumber: string;
  propertyAddress: string;
  inspectorName: string;
  inspectorEmail: string;
  reportUrl: string;
}

/**
 * Send notification when a report is submitted for review
 */
export async function sendReportSubmittedNotification(
  reviewerEmail: string,
  report: ReportInfo
): Promise<SendResult> {
  const variables = {
    reportNumber: report.reportNumber,
    propertyAddress: report.propertyAddress,
    inspectorName: report.inspectorName,
    reportUrl: report.reportUrl,
  };

  let rendered: { subject: string; html: string; text: string };
  try {
    rendered = await emailTemplateService.renderTemplate("REPORT_SUBMITTED", variables);
  } catch (error) {
    console.warn("[Email] Template service failed for REPORT_SUBMITTED, using hardcoded fallback:", error instanceof Error ? error.message : error);
    const content = `
    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">Report Submitted for Review</h2>

    <p style="margin: 0 0 16px 0;">A new report has been submitted and requires your review.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Report:</strong> ${report.reportNumber}</p>
      <p style="margin: 0 0 8px 0;"><strong>Property:</strong> ${report.propertyAddress}</p>
      <p style="margin: 0;"><strong>Inspector:</strong> ${report.inspectorName}</p>
    </div>

    <a href="${report.reportUrl}" style="display: inline-block; background-color: #2d5c8f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Review Report
    </a>
  `;
    rendered = {
      subject: `[Review Required] Report ${report.reportNumber} - ${report.propertyAddress}`,
      text: `Report ${report.reportNumber} for ${report.propertyAddress} has been submitted by ${report.inspectorName} and requires your review. View at: ${report.reportUrl}`,
      html: wrapInTemplate(content, "Report Submitted for Review"),
    };
  }

  return sendEmail({
    to: reviewerEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}

/**
 * Send notification when a report is approved
 */
export async function sendReportApprovedNotification(
  report: ReportInfo,
  reviewerName: string
): Promise<SendResult> {
  const variables = {
    reportNumber: report.reportNumber,
    propertyAddress: report.propertyAddress,
    reviewerName,
    reportUrl: report.reportUrl,
  };

  let rendered: { subject: string; html: string; text: string };
  try {
    rendered = await emailTemplateService.renderTemplate("REPORT_APPROVED", variables);
  } catch (error) {
    console.warn("[Email] Template service failed for REPORT_APPROVED, using hardcoded fallback:", error instanceof Error ? error.message : error);
    const content = `
    <h2 style="color: #16a34a; margin: 0 0 16px 0; font-size: 18px;">Report Approved</h2>

    <p style="margin: 0 0 16px 0;">Great news! Your report has been approved and is ready for finalisation.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Report:</strong> ${report.reportNumber}</p>
      <p style="margin: 0 0 8px 0;"><strong>Property:</strong> ${report.propertyAddress}</p>
      <p style="margin: 0;"><strong>Approved by:</strong> ${reviewerName}</p>
    </div>

    <a href="${report.reportUrl}" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      View Report
    </a>

    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      You can now generate the final PDF for delivery to your client.
    </p>
  `;
    rendered = {
      subject: `[Approved] Report ${report.reportNumber} - ${report.propertyAddress}`,
      text: `Your report ${report.reportNumber} for ${report.propertyAddress} has been approved by ${reviewerName}. View at: ${report.reportUrl}`,
      html: wrapInTemplate(content, "Report Approved"),
    };
  }

  return sendEmail({
    to: report.inspectorEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}

/**
 * Send notification when a report requires revision
 */
export async function sendRevisionRequiredNotification(
  report: ReportInfo,
  reviewerName: string,
  commentsSummary: { critical: number; issue: number; note: number; suggestion: number }
): Promise<SendResult> {
  const totalComments =
    commentsSummary.critical +
    commentsSummary.issue +
    commentsSummary.note +
    commentsSummary.suggestion;

  const variables = {
    reportNumber: report.reportNumber,
    propertyAddress: report.propertyAddress,
    reviewerName,
    reportUrl: report.reportUrl,
    criticalCount: commentsSummary.critical.toString(),
    issueCount: commentsSummary.issue.toString(),
    noteCount: commentsSummary.note.toString(),
    suggestionCount: commentsSummary.suggestion.toString(),
    totalComments: totalComments.toString(),
  };

  let rendered: { subject: string; html: string; text: string };
  try {
    rendered = await emailTemplateService.renderTemplate("REVISION_REQUIRED", variables);
  } catch (error) {
    console.warn("[Email] Template service failed for REVISION_REQUIRED, using hardcoded fallback:", error instanceof Error ? error.message : error);

    let commentList = "";
    if (commentsSummary.critical > 0) {
      commentList += `<li style="color: #dc2626;">${commentsSummary.critical} Critical issue(s)</li>`;
    }
    if (commentsSummary.issue > 0) {
      commentList += `<li style="color: #ea580c;">${commentsSummary.issue} Issue(s)</li>`;
    }
    if (commentsSummary.note > 0) {
      commentList += `<li style="color: #2563eb;">${commentsSummary.note} Note(s)</li>`;
    }
    if (commentsSummary.suggestion > 0) {
      commentList += `<li style="color: #7c3aed;">${commentsSummary.suggestion} Suggestion(s)</li>`;
    }

    const content = `
    <h2 style="color: #ea580c; margin: 0 0 16px 0; font-size: 18px;">Revision Required</h2>

    <p style="margin: 0 0 16px 0;">Your report has been reviewed and requires some changes before it can be approved.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Report:</strong> ${report.reportNumber}</p>
      <p style="margin: 0 0 8px 0;"><strong>Property:</strong> ${report.propertyAddress}</p>
      <p style="margin: 0 0 8px 0;"><strong>Reviewed by:</strong> ${reviewerName}</p>
      <p style="margin: 0;"><strong>Feedback items:</strong> ${totalComments}</p>
    </div>

    <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 500; color: #9a3412;">Feedback Summary:</p>
      <ul style="margin: 0; padding-left: 20px;">
        ${commentList}
      </ul>
    </div>

    <a href="${report.reportUrl}/revisions" style="display: inline-block; background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      View Feedback & Revise
    </a>

    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      Please address the feedback and resubmit your report for another review.
    </p>
  `;
    rendered = {
      subject: `[Revision Required] Report ${report.reportNumber} - ${totalComments} feedback items`,
      text: `Your report ${report.reportNumber} for ${report.propertyAddress} requires revision. ${totalComments} feedback items have been added by ${reviewerName}. View at: ${report.reportUrl}/revisions`,
      html: wrapInTemplate(content, "Revision Required"),
    };
  }

  return sendEmail({
    to: report.inspectorEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}

/**
 * Send notification when new comments are added to a report
 */
export async function sendNewCommentsNotification(
  report: ReportInfo,
  reviewerName: string,
  newCommentCount: number
): Promise<SendResult> {
  const variables = {
    reportNumber: report.reportNumber,
    propertyAddress: report.propertyAddress,
    reviewerName,
    commentCount: newCommentCount.toString(),
    reportUrl: report.reportUrl,
  };

  let rendered: { subject: string; html: string; text: string };
  try {
    rendered = await emailTemplateService.renderTemplate("NEW_COMMENTS", variables);
  } catch (error) {
    console.warn("[Email] Template service failed for NEW_COMMENTS, using hardcoded fallback:", error instanceof Error ? error.message : error);
    const content = `
    <h2 style="color: #2563eb; margin: 0 0 16px 0; font-size: 18px;">New Review Comments</h2>

    <p style="margin: 0 0 16px 0;">${reviewerName} has added ${newCommentCount} new comment${newCommentCount !== 1 ? "s" : ""} to your report.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Report:</strong> ${report.reportNumber}</p>
      <p style="margin: 0;"><strong>Property:</strong> ${report.propertyAddress}</p>
    </div>

    <a href="${report.reportUrl}/revisions" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      View Comments
    </a>
  `;
    rendered = {
      subject: `[New Comments] Report ${report.reportNumber} - ${newCommentCount} new comment${newCommentCount !== 1 ? "s" : ""}`,
      text: `${reviewerName} has added ${newCommentCount} new comment(s) to your report ${report.reportNumber}. View at: ${report.reportUrl}/revisions`,
      html: wrapInTemplate(content, "New Review Comments"),
    };
  }

  return sendEmail({
    to: report.inspectorEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}

/**
 * Send notification when a report is finalized
 */
export async function sendReportFinalizedNotification(
  report: ReportInfo,
  clientEmail?: string
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  // Notify inspector (uses template service)
  const inspectorVariables = {
    reportNumber: report.reportNumber,
    propertyAddress: report.propertyAddress,
    inspectorName: report.inspectorName,
    inspectorEmail: report.inspectorEmail,
    reportUrl: report.reportUrl,
  };

  let inspectorRendered: { subject: string; html: string; text: string };
  try {
    inspectorRendered = await emailTemplateService.renderTemplate("REPORT_FINALIZED", inspectorVariables);
  } catch (error) {
    console.warn("[Email] Template service failed for REPORT_FINALIZED, using hardcoded fallback:", error instanceof Error ? error.message : error);
    const inspectorContent = `
    <h2 style="color: #16a34a; margin: 0 0 16px 0; font-size: 18px;">Report Finalized</h2>

    <p style="margin: 0 0 16px 0;">Your report has been finalized and is ready for delivery to your client.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Report:</strong> ${report.reportNumber}</p>
      <p style="margin: 0;"><strong>Property:</strong> ${report.propertyAddress}</p>
    </div>

    <a href="${report.reportUrl}/pdf" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Download PDF
    </a>

    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      This report has been locked and can no longer be edited.
    </p>
  `;
    inspectorRendered = {
      subject: `[Finalized] Report ${report.reportNumber} - Ready for Delivery`,
      text: `Your report ${report.reportNumber} for ${report.propertyAddress} has been finalized. Download PDF at: ${report.reportUrl}/pdf`,
      html: wrapInTemplate(inspectorContent, "Report Finalized"),
    };
  }

  results.push(
    await sendEmail({
      to: report.inspectorEmail,
      subject: inspectorRendered.subject,
      text: inspectorRendered.text,
      html: inspectorRendered.html,
    })
  );

  // Optionally notify client if email provided (no template type -- stays hardcoded)
  if (clientEmail) {
    const clientContent = `
      <h2 style="color: #2d5c8f; margin: 0 0 16px 0; font-size: 18px;">Your Roofing Inspection Report is Ready</h2>

      <p style="margin: 0 0 16px 0;">The roofing inspection report for your property is now complete and ready for your review.</p>

      <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Report Number:</strong> ${report.reportNumber}</p>
        <p style="margin: 0 0 8px 0;"><strong>Property:</strong> ${report.propertyAddress}</p>
        <p style="margin: 0;"><strong>Inspector:</strong> ${report.inspectorName}</p>
      </div>

      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
        Your inspector will provide you with the full report. If you have any questions,
        please contact them directly at ${report.inspectorEmail}.
      </p>
    `;

    results.push(
      await sendEmail({
        to: clientEmail,
        subject: `Roofing Inspection Report Ready - ${report.propertyAddress}`,
        text: `Your roofing inspection report (${report.reportNumber}) for ${report.propertyAddress} is now complete. Please contact your inspector ${report.inspectorName} at ${report.inspectorEmail} for the full report.`,
        html: wrapInTemplate(clientContent, "Your Report is Ready"),
      })
    );
  }

  return results;
}

/**
 * Send notification when a report is rejected
 */
export async function sendReportRejectedNotification(
  report: ReportInfo,
  reviewerName: string,
  reason: string
): Promise<SendResult> {
  const variables = {
    reportNumber: report.reportNumber,
    propertyAddress: report.propertyAddress,
    reviewerName,
    reason,
    reportUrl: report.reportUrl,
  };

  let rendered: { subject: string; html: string; text: string };
  try {
    rendered = await emailTemplateService.renderTemplate("REPORT_REJECTED", variables);
  } catch (error) {
    console.warn("[Email] Template service failed for REPORT_REJECTED, using hardcoded fallback:", error instanceof Error ? error.message : error);
    const content = `
    <h2 style="color: #dc2626; margin: 0 0 16px 0; font-size: 18px;">Report Rejected</h2>

    <p style="margin: 0 0 16px 0;">Unfortunately, your report has been rejected and cannot proceed in its current form.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Report:</strong> ${report.reportNumber}</p>
      <p style="margin: 0 0 8px 0;"><strong>Property:</strong> ${report.propertyAddress}</p>
      <p style="margin: 0;"><strong>Rejected by:</strong> ${reviewerName}</p>
    </div>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 500; color: #991b1b;">Reason for Rejection:</p>
      <p style="margin: 0; color: #7f1d1d;">${reason}</p>
    </div>

    <a href="${report.reportUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      View Report
    </a>

    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      Please review the feedback and consider starting a new inspection if necessary.
    </p>
  `;
    rendered = {
      subject: `[Rejected] Report ${report.reportNumber} - ${report.propertyAddress}`,
      text: `Your report ${report.reportNumber} for ${report.propertyAddress} has been rejected by ${reviewerName}. Reason: ${reason}. View at: ${report.reportUrl}`,
      html: wrapInTemplate(content, "Report Rejected"),
    };
  }

  return sendEmail({
    to: report.inspectorEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}

// ============================================
// Assignment Notification Templates
// ============================================

interface AssignmentDetails {
  clientName: string;
  propertyAddress: string;
  inspectorName: string;
  requestType: string;
  urgency: string;
  scheduledDate?: string;
}

interface InspectorAssignmentDetails {
  inspectorName: string;
  clientName: string;
  clientEmail: string;
  propertyAddress: string;
  requestType: string;
  urgency: string;
  scheduledDate?: string;
  assignmentUrl: string;
  notes?: string;
}

/**
 * Send confirmation email to client when assignment is created
 */
export async function sendAssignmentConfirmationEmail(
  clientEmail: string,
  details: AssignmentDetails
): Promise<SendResult> {
  const requestTypeFormatted = details.requestType.replace(/_/g, " ");

  const variables = {
    clientName: details.clientName,
    propertyAddress: details.propertyAddress,
    requestType: requestTypeFormatted,
    urgency: details.urgency,
    scheduledDate: details.scheduledDate || "",
    inspectorName: details.inspectorName,
  };

  let rendered: { subject: string; html: string; text: string };
  try {
    rendered = await emailTemplateService.renderTemplate("ASSIGNMENT_CONFIRMATION", variables);
  } catch (error) {
    console.warn("[Email] Template service failed for ASSIGNMENT_CONFIRMATION, using hardcoded fallback:", error instanceof Error ? error.message : error);
    const content = `
    <h2 style="color: #2d5c8f; margin: 0 0 16px 0; font-size: 18px;">Inspection Request Confirmed</h2>

    <p style="margin: 0 0 16px 0;">Dear ${details.clientName},</p>

    <p style="margin: 0 0 16px 0;">Your inspection request has been received and an inspector has been assigned.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Property Address:</strong> ${details.propertyAddress}</p>
      <p style="margin: 0 0 8px 0;"><strong>Request Type:</strong> ${requestTypeFormatted}</p>
      <p style="margin: 0 0 8px 0;"><strong>Urgency Level:</strong> ${details.urgency}</p>
      ${details.scheduledDate ? `<p style="margin: 0 0 8px 0;"><strong>Scheduled Date:</strong> ${details.scheduledDate}</p>` : ""}
      <p style="margin: 0;"><strong>Inspector:</strong> ${details.inspectorName}</p>
    </div>

    <p style="margin: 0 0 16px 0;">
      Your inspector will be in contact to arrange access to the property. If you have any questions, please contact RANZ.
    </p>
  `;
    rendered = {
      subject: `Inspection Request Confirmed - ${details.propertyAddress}`,
      text: `Dear ${details.clientName}, your inspection request for ${details.propertyAddress} has been received. Inspector ${details.inspectorName} has been assigned and will contact you to arrange access. Request type: ${requestTypeFormatted}, Urgency: ${details.urgency}${details.scheduledDate ? `, Scheduled: ${details.scheduledDate}` : ""}.`,
      html: wrapInTemplate(content, "Inspection Request Confirmed"),
    };
  }

  return sendEmail({
    to: clientEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}

/**
 * Send assignment notification email to inspector
 */
export async function sendInspectorAssignmentEmail(
  inspectorEmail: string,
  details: InspectorAssignmentDetails
): Promise<SendResult> {
  const requestTypeFormatted = details.requestType.replace(/_/g, " ");

  const variables = {
    inspectorName: details.inspectorName,
    clientName: details.clientName,
    clientEmail: details.clientEmail,
    propertyAddress: details.propertyAddress,
    requestType: requestTypeFormatted,
    urgency: details.urgency,
    scheduledDate: details.scheduledDate || "",
    notes: details.notes || "",
    assignmentUrl: details.assignmentUrl,
  };

  let rendered: { subject: string; html: string; text: string };
  try {
    rendered = await emailTemplateService.renderTemplate("INSPECTOR_ASSIGNMENT", variables);
  } catch (error) {
    console.warn("[Email] Template service failed for INSPECTOR_ASSIGNMENT, using hardcoded fallback:", error instanceof Error ? error.message : error);
    const content = `
    <h2 style="color: #2d5c8f; margin: 0 0 16px 0; font-size: 18px;">New Inspection Assignment</h2>

    <p style="margin: 0 0 16px 0;">You have been assigned a new inspection.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Property Address:</strong> ${details.propertyAddress}</p>
      <p style="margin: 0 0 8px 0;"><strong>Client Name:</strong> ${details.clientName}</p>
      <p style="margin: 0 0 8px 0;"><strong>Request Type:</strong> ${requestTypeFormatted}</p>
      <p style="margin: 0 0 8px 0;"><strong>Urgency:</strong> ${details.urgency}</p>
      ${details.scheduledDate ? `<p style="margin: 0 0 8px 0;"><strong>Scheduled Date:</strong> ${details.scheduledDate}</p>` : ""}
      ${details.notes ? `<p style="margin: 0;"><strong>Notes:</strong> ${details.notes}</p>` : ""}
    </div>

    <a href="${details.assignmentUrl}" style="display: inline-block; background-color: #2d5c8f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      View Assignment
    </a>
  `;
    rendered = {
      subject: `[New Assignment] ${details.propertyAddress} - ${requestTypeFormatted}`,
      text: `New assignment: ${requestTypeFormatted} inspection for ${details.propertyAddress}. Client: ${details.clientName} (${details.clientEmail}). Urgency: ${details.urgency}${details.scheduledDate ? `, Scheduled: ${details.scheduledDate}` : ""}${details.notes ? `. Notes: ${details.notes}` : ""}. View details at: ${details.assignmentUrl}`,
      html: wrapInTemplate(content, "New Inspection Assignment"),
    };
  }

  return sendEmail({
    to: inspectorEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}
