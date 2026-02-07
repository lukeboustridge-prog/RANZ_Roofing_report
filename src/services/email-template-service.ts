/**
 * Email Template Service
 *
 * Manages email templates stored in the database with variable substitution.
 * Falls back to hardcoded default templates (matching src/lib/email.ts) when
 * no database template is found for a given type.
 */

import prisma from "@/lib/db";

interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

interface DefaultTemplate {
  type: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: Record<string, string>;
}

// RANZ branded email wrapper (matches src/lib/email.ts wrapInTemplate)
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

class EmailTemplateService {
  /**
   * Render a template by type with variable substitution.
   * Looks up from database first, falls back to hardcoded defaults.
   */
  async renderTemplate(
    templateType: string,
    variables: Record<string, string>
  ): Promise<RenderedTemplate> {
    // Try database template first
    try {
      const dbTemplate = await prisma.emailTemplate.findUnique({
        where: { type: templateType, isActive: true },
      });

      if (dbTemplate) {
        return {
          subject: this.substituteVariables(dbTemplate.subject, variables),
          html: wrapInTemplate(
            this.substituteVariables(dbTemplate.bodyHtml, variables),
            this.substituteVariables(dbTemplate.subject, variables)
          ),
          text: this.substituteVariables(dbTemplate.bodyText, variables),
        };
      }
    } catch (error) {
      // Database unavailable - fall back to defaults
      console.warn(
        `[EmailTemplateService] DB lookup failed for ${templateType}, using default:`,
        error instanceof Error ? error.message : error
      );
    }

    // Fall back to hardcoded default
    const defaultTemplate = this.getDefaultTemplate(templateType);
    if (!defaultTemplate) {
      throw new Error(
        `No template found for type: ${templateType} (no DB or default template)`
      );
    }

    return {
      subject: this.substituteVariables(defaultTemplate.subject, variables),
      html: wrapInTemplate(
        this.substituteVariables(defaultTemplate.bodyHtml, variables),
        this.substituteVariables(defaultTemplate.subject, variables)
      ),
      text: this.substituteVariables(defaultTemplate.bodyText, variables),
    };
  }

  /**
   * Get a single default template by type.
   */
  getDefaultTemplate(templateType: string): DefaultTemplate | undefined {
    return this.getDefaultTemplates().find((t) => t.type === templateType);
  }

  /**
   * Get all default templates extracted from the hardcoded email functions
   * in src/lib/email.ts, with values replaced by {{variableName}} placeholders.
   */
  getDefaultTemplates(): DefaultTemplate[] {
    return [
      // 1. REPORT_SUBMITTED
      {
        type: "REPORT_SUBMITTED",
        name: "Report Submitted for Review",
        subject:
          "[Review Required] Report {{reportNumber}} - {{propertyAddress}}",
        bodyHtml: `
    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">Report Submitted for Review</h2>

    <p style="margin: 0 0 16px 0;">A new report has been submitted and requires your review.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Report:</strong> {{reportNumber}}</p>
      <p style="margin: 0 0 8px 0;"><strong>Property:</strong> {{propertyAddress}}</p>
      <p style="margin: 0;"><strong>Inspector:</strong> {{inspectorName}}</p>
    </div>

    <a href="{{reportUrl}}" style="display: inline-block; background-color: #2d5c8f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Review Report
    </a>`,
        bodyText:
          "Report {{reportNumber}} for {{propertyAddress}} has been submitted by {{inspectorName}} and requires your review. View at: {{reportUrl}}",
        variables: {
          reportNumber: "string",
          propertyAddress: "string",
          inspectorName: "string",
          reportUrl: "string",
        },
      },

      // 2. REPORT_APPROVED
      {
        type: "REPORT_APPROVED",
        name: "Report Approved Notification",
        subject: "[Approved] Report {{reportNumber}} - {{propertyAddress}}",
        bodyHtml: `
    <h2 style="color: #16a34a; margin: 0 0 16px 0; font-size: 18px;">Report Approved</h2>

    <p style="margin: 0 0 16px 0;">Great news! Your report has been approved and is ready for finalisation.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Report:</strong> {{reportNumber}}</p>
      <p style="margin: 0 0 8px 0;"><strong>Property:</strong> {{propertyAddress}}</p>
      <p style="margin: 0;"><strong>Approved by:</strong> {{reviewerName}}</p>
    </div>

    <a href="{{reportUrl}}" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      View Report
    </a>

    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      You can now generate the final PDF for delivery to your client.
    </p>`,
        bodyText:
          "Your report {{reportNumber}} for {{propertyAddress}} has been approved by {{reviewerName}}. View at: {{reportUrl}}",
        variables: {
          reportNumber: "string",
          propertyAddress: "string",
          reviewerName: "string",
          reportUrl: "string",
        },
      },

      // 3. REVISION_REQUIRED
      {
        type: "REVISION_REQUIRED",
        name: "Revision Required Notification",
        subject:
          "[Revision Required] Report {{reportNumber}} - {{totalComments}} feedback items",
        bodyHtml: `
    <h2 style="color: #ea580c; margin: 0 0 16px 0; font-size: 18px;">Revision Required</h2>

    <p style="margin: 0 0 16px 0;">Your report has been reviewed and requires some changes before it can be approved.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Report:</strong> {{reportNumber}}</p>
      <p style="margin: 0 0 8px 0;"><strong>Property:</strong> {{propertyAddress}}</p>
      <p style="margin: 0 0 8px 0;"><strong>Reviewed by:</strong> {{reviewerName}}</p>
      <p style="margin: 0;"><strong>Feedback items:</strong> {{totalComments}}</p>
    </div>

    <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 500; color: #9a3412;">Feedback Summary:</p>
      <ul style="margin: 0; padding-left: 20px;">
        <li style="color: #dc2626;">{{criticalCount}} Critical issue(s)</li>
        <li style="color: #ea580c;">{{issueCount}} Issue(s)</li>
        <li style="color: #2563eb;">{{noteCount}} Note(s)</li>
        <li style="color: #7c3aed;">{{suggestionCount}} Suggestion(s)</li>
      </ul>
    </div>

    <a href="{{reportUrl}}/revisions" style="display: inline-block; background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      View Feedback & Revise
    </a>

    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      Please address the feedback and resubmit your report for another review.
    </p>`,
        bodyText:
          "Your report {{reportNumber}} for {{propertyAddress}} requires revision. {{totalComments}} feedback items have been added by {{reviewerName}}. View at: {{reportUrl}}/revisions",
        variables: {
          reportNumber: "string",
          propertyAddress: "string",
          reviewerName: "string",
          reportUrl: "string",
          criticalCount: "string",
          issueCount: "string",
          noteCount: "string",
          suggestionCount: "string",
          totalComments: "string",
        },
      },

      // 4. REPORT_REJECTED
      {
        type: "REPORT_REJECTED",
        name: "Report Rejected Notification",
        subject: "[Rejected] Report {{reportNumber}} - {{propertyAddress}}",
        bodyHtml: `
    <h2 style="color: #dc2626; margin: 0 0 16px 0; font-size: 18px;">Report Rejected</h2>

    <p style="margin: 0 0 16px 0;">Unfortunately, your report has been rejected and cannot proceed in its current form.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Report:</strong> {{reportNumber}}</p>
      <p style="margin: 0 0 8px 0;"><strong>Property:</strong> {{propertyAddress}}</p>
      <p style="margin: 0;"><strong>Rejected by:</strong> {{reviewerName}}</p>
    </div>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 500; color: #991b1b;">Reason for Rejection:</p>
      <p style="margin: 0; color: #7f1d1d;">{{reason}}</p>
    </div>

    <a href="{{reportUrl}}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      View Report
    </a>

    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      Please review the feedback and consider starting a new inspection if necessary.
    </p>`,
        bodyText:
          "Your report {{reportNumber}} for {{propertyAddress}} has been rejected by {{reviewerName}}. Reason: {{reason}}. View at: {{reportUrl}}",
        variables: {
          reportNumber: "string",
          propertyAddress: "string",
          reviewerName: "string",
          reason: "string",
          reportUrl: "string",
        },
      },

      // 5. REPORT_FINALIZED
      {
        type: "REPORT_FINALIZED",
        name: "Report Finalized Notification",
        subject:
          "[Finalized] Report {{reportNumber}} - Ready for Delivery",
        bodyHtml: `
    <h2 style="color: #16a34a; margin: 0 0 16px 0; font-size: 18px;">Report Finalized</h2>

    <p style="margin: 0 0 16px 0;">Your report has been finalized and is ready for delivery to your client.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Report:</strong> {{reportNumber}}</p>
      <p style="margin: 0;"><strong>Property:</strong> {{propertyAddress}}</p>
    </div>

    <a href="{{reportUrl}}/pdf" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Download PDF
    </a>

    <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
      This report has been locked and can no longer be edited.
    </p>`,
        bodyText:
          "Your report {{reportNumber}} for {{propertyAddress}} has been finalized. Download PDF at: {{reportUrl}}/pdf",
        variables: {
          reportNumber: "string",
          propertyAddress: "string",
          inspectorName: "string",
          inspectorEmail: "string",
          reportUrl: "string",
        },
      },

      // 6. ASSIGNMENT_CONFIRMATION
      {
        type: "ASSIGNMENT_CONFIRMATION",
        name: "Inspection Request Confirmation",
        subject:
          "Inspection Request Confirmed - {{propertyAddress}}",
        bodyHtml: `
    <h2 style="color: #2d5c8f; margin: 0 0 16px 0; font-size: 18px;">Inspection Request Confirmed</h2>

    <p style="margin: 0 0 16px 0;">Dear {{clientName}},</p>

    <p style="margin: 0 0 16px 0;">Your inspection request has been received and an inspector has been assigned.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Property Address:</strong> {{propertyAddress}}</p>
      <p style="margin: 0 0 8px 0;"><strong>Request Type:</strong> {{requestType}}</p>
      <p style="margin: 0 0 8px 0;"><strong>Urgency Level:</strong> {{urgency}}</p>
      <p style="margin: 0 0 8px 0;"><strong>Scheduled Date:</strong> {{scheduledDate}}</p>
      <p style="margin: 0;"><strong>Inspector:</strong> {{inspectorName}}</p>
    </div>

    <p style="margin: 0 0 16px 0;">
      Your inspector will be in contact to arrange access to the property. If you have any questions, please contact RANZ.
    </p>`,
        bodyText:
          "Dear {{clientName}}, your inspection request for {{propertyAddress}} has been received. Inspector {{inspectorName}} has been assigned and will contact you to arrange access. Request type: {{requestType}}, Urgency: {{urgency}}, Scheduled: {{scheduledDate}}.",
        variables: {
          clientName: "string",
          propertyAddress: "string",
          requestType: "string",
          urgency: "string",
          scheduledDate: "string",
          inspectorName: "string",
        },
      },

      // 7. INSPECTOR_ASSIGNMENT
      {
        type: "INSPECTOR_ASSIGNMENT",
        name: "New Inspection Assignment",
        subject:
          "[New Assignment] {{propertyAddress}} - {{requestType}}",
        bodyHtml: `
    <h2 style="color: #2d5c8f; margin: 0 0 16px 0; font-size: 18px;">New Inspection Assignment</h2>

    <p style="margin: 0 0 16px 0;">You have been assigned a new inspection.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Property Address:</strong> {{propertyAddress}}</p>
      <p style="margin: 0 0 8px 0;"><strong>Client Name:</strong> {{clientName}}</p>
      <p style="margin: 0 0 8px 0;"><strong>Request Type:</strong> {{requestType}}</p>
      <p style="margin: 0 0 8px 0;"><strong>Urgency:</strong> {{urgency}}</p>
      <p style="margin: 0 0 8px 0;"><strong>Scheduled Date:</strong> {{scheduledDate}}</p>
      <p style="margin: 0;"><strong>Notes:</strong> {{notes}}</p>
    </div>

    <a href="{{assignmentUrl}}" style="display: inline-block; background-color: #2d5c8f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      View Assignment
    </a>`,
        bodyText:
          "New assignment: {{requestType}} inspection for {{propertyAddress}}. Client: {{clientName}} ({{clientEmail}}). Urgency: {{urgency}}, Scheduled: {{scheduledDate}}. Notes: {{notes}}. View details at: {{assignmentUrl}}",
        variables: {
          inspectorName: "string",
          clientName: "string",
          clientEmail: "string",
          propertyAddress: "string",
          requestType: "string",
          urgency: "string",
          scheduledDate: "string",
          notes: "string",
          assignmentUrl: "string",
        },
      },

      // 8. NEW_COMMENTS
      {
        type: "NEW_COMMENTS",
        name: "New Review Comments Notification",
        subject:
          "[New Comments] Report {{reportNumber}} - {{commentCount}} new comment(s)",
        bodyHtml: `
    <h2 style="color: #2563eb; margin: 0 0 16px 0; font-size: 18px;">New Review Comments</h2>

    <p style="margin: 0 0 16px 0;">{{reviewerName}} has added {{commentCount}} new comment(s) to your report.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 0 0 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Report:</strong> {{reportNumber}}</p>
      <p style="margin: 0;"><strong>Property:</strong> {{propertyAddress}}</p>
    </div>

    <a href="{{reportUrl}}/revisions" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      View Comments
    </a>`,
        bodyText:
          "{{reviewerName}} has added {{commentCount}} new comment(s) to your report {{reportNumber}}. View at: {{reportUrl}}/revisions",
        variables: {
          reportNumber: "string",
          propertyAddress: "string",
          reviewerName: "string",
          commentCount: "string",
          reportUrl: "string",
        },
      },
    ];
  }

  /**
   * Preview a template with sample data for admin preview.
   */
  async previewTemplate(
    templateType: string,
    sampleData?: Record<string, string>
  ): Promise<RenderedTemplate> {
    const defaults: Record<string, string> = {
      reportNumber: "RANZ-2025-001234",
      propertyAddress: "42 Example Street, Wellington 6011",
      inspectorName: "John Smith",
      inspectorEmail: "john.smith@example.com",
      reviewerName: "Jane Doe",
      reportUrl: "https://reports.ranz.org.nz/reports/example-id",
      reason: "Insufficient photographic evidence of roof penetration defects.",
      criticalCount: "2",
      issueCount: "3",
      noteCount: "1",
      suggestionCount: "1",
      totalComments: "7",
      clientName: "Bob Wilson",
      clientEmail: "bob@example.com",
      requestType: "Full Inspection",
      urgency: "STANDARD",
      scheduledDate: "15 March 2025",
      notes: "Access via side gate. Dog in backyard.",
      assignmentUrl:
        "https://reports.ranz.org.nz/assignments/example-id",
      commentCount: "3",
    };

    const variables = { ...defaults, ...sampleData };
    return this.renderTemplate(templateType, variables);
  }

  /**
   * Substitute {{key}} placeholders with values from variables map.
   * Missing variables are left as-is (graceful handling).
   */
  private substituteVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replaceAll(`{{${key}}}`, value);
    }
    return result;
  }
}

export const emailTemplateService = new EmailTemplateService();
