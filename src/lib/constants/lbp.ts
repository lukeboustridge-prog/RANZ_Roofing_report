/**
 * LBP Complaint System Constants
 *
 * These constants are used for the LBP (Licensed Building Practitioner)
 * Complaint Automation System to lodge complaints with the Building
 * Practitioners Board (BPB).
 */

// RANZ Organization Details (defaults - can be overridden by env vars)
export const RANZ_DETAILS = {
  name: process.env.RANZ_NAME || "Roofing Association of New Zealand",
  address: process.env.RANZ_ADDRESS || "",
  phone: process.env.RANZ_PHONE || "",
  email: process.env.RANZ_EMAIL || "",
  adminEmail: process.env.RANZ_ADMIN_EMAIL || "",
  website: "https://www.ranz.org.nz",
  relation: "Third-party inspector", // Relationship to the matter
} as const;

// Building Practitioners Board Details
export const BPB_DETAILS = {
  name: "Building Practitioners Board",
  email: process.env.BPB_EMAIL || "bpb@lbp.govt.nz",
  complaintsEmail: process.env.BPB_COMPLAINTS_EMAIL || "complaints@lbp.govt.nz",
  website: "https://www.lbp.govt.nz",
  address: "Building Practitioners Board, PO Box 10-352, Wellington 6143",
  phone: "0800 60 60 50",
} as const;

// Complaint number format: RANZ-LBP-YYYY-NNNNN
export const COMPLAINT_NUMBER_PREFIX = "RANZ-LBP";

// Status display labels
export const COMPLAINT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  READY_TO_SUBMIT: "Ready to Submit",
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  UNDER_INVESTIGATION: "Under Investigation",
  HEARING_SCHEDULED: "Hearing Scheduled",
  DECIDED: "Decided",
  CLOSED: "Closed",
  WITHDRAWN: "Withdrawn",
} as const;

// Status badge colors for UI
export const COMPLAINT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700" },
  PENDING_REVIEW: { bg: "bg-yellow-100", text: "text-yellow-700" },
  READY_TO_SUBMIT: { bg: "bg-green-100", text: "text-green-700" },
  SUBMITTED: { bg: "bg-blue-100", text: "text-blue-700" },
  ACKNOWLEDGED: { bg: "bg-blue-200", text: "text-blue-800" },
  UNDER_INVESTIGATION: { bg: "bg-purple-100", text: "text-purple-700" },
  HEARING_SCHEDULED: { bg: "bg-orange-100", text: "text-orange-700" },
  DECIDED: { bg: "bg-teal-100", text: "text-teal-700" },
  CLOSED: { bg: "bg-gray-200", text: "text-gray-600" },
  WITHDRAWN: { bg: "bg-red-100", text: "text-red-700" },
} as const;

// BPB Decision types
export const BPB_DECISIONS = {
  PROCEED_TO_HEARING: "Proceed to Hearing",
  DISMISSED: "Dismissed",
  REFERRED_FOR_FURTHER_INVESTIGATION: "Referred for Further Investigation",
  RESOLVED_BY_CONSENT: "Resolved by Consent",
  NO_FURTHER_ACTION: "No Further Action",
} as const;

// BPB Outcomes (penalties)
export const BPB_OUTCOMES = {
  LICENSE_CANCELLED: "License Cancelled",
  LICENSE_SUSPENDED: "License Suspended",
  FORMAL_WARNING: "Formal Warning",
  FINE: "Fine Imposed",
  CONDITIONS_IMPOSED: "Conditions Imposed on License",
  NO_PENALTY: "No Penalty",
  COST_ORDER: "Cost Order",
} as const;

// Email templates
export const EMAIL_SUBJECTS = {
  SUBMISSION: (complaintNumber: string, lbpName: string) =>
    `LBP Complaint - ${complaintNumber} - ${lbpName}`,
  ACKNOWLEDGMENT: (complaintNumber: string) =>
    `Complaint ${complaintNumber} - Acknowledgment Received`,
  STATUS_UPDATE: (complaintNumber: string) =>
    `Complaint ${complaintNumber} - Status Update`,
} as const;

// PDF Generation settings
export const PDF_SETTINGS = {
  pageSize: "A4" as const,
  margins: {
    top: 50,
    bottom: 50,
    left: 50,
    right: 50,
  },
  fontSizes: {
    title: 16,
    heading: 14,
    subheading: 12,
    body: 10,
    small: 8,
  },
} as const;

// Evidence package settings
export const EVIDENCE_PACKAGE_SETTINGS = {
  maxPhotoSize: 10 * 1024 * 1024, // 10MB per photo
  maxPackageSize: 100 * 1024 * 1024, // 100MB total
  compressionLevel: 9, // Maximum compression
  photoQuality: 90, // JPEG quality for thumbnails
} as const;

// Validation rules
export const VALIDATION_RULES = {
  lbpNumber: {
    pattern: /^[A-Z]{2}\d{6}$/, // Format: XX000000 (2 letters + 6 digits)
    message: "LBP number must be 2 letters followed by 6 digits (e.g., BP123456)",
  },
  minGroundsForDiscipline: 1,
  maxGroundsForDiscipline: 5,
  minPhotosRequired: 1,
  maxWitnesses: 10,
  maxDescriptionLength: 10000,
  maxSummaryLength: 5000,
} as const;

// Required fields for submission
export const REQUIRED_FIELDS_FOR_SUBMISSION = [
  "subjectLbpNumber",
  "subjectLbpName",
  "workAddress",
  "workDescription",
  "conductDescription",
  "evidenceSummary",
  "groundsForDiscipline",
  "attachedPhotoIds",
] as const;

// Audit action types specific to LBP complaints
export const LBP_AUDIT_ACTIONS = {
  COMPLAINT_CREATED: "COMPLAINT_CREATED",
  COMPLAINT_UPDATED: "COMPLAINT_UPDATED",
  COMPLAINT_SUBMITTED_FOR_REVIEW: "COMPLAINT_SUBMITTED_FOR_REVIEW",
  COMPLAINT_APPROVED: "COMPLAINT_APPROVED",
  COMPLAINT_REJECTED: "COMPLAINT_REJECTED",
  COMPLAINT_SIGNED: "COMPLAINT_SIGNED",
  COMPLAINT_SUBMITTED_TO_BPB: "COMPLAINT_SUBMITTED_TO_BPB",
  COMPLAINT_WITHDRAWN: "COMPLAINT_WITHDRAWN",
  BPB_RESPONSE_RECEIVED: "BPB_RESPONSE_RECEIVED",
  PDF_GENERATED: "PDF_GENERATED",
  EVIDENCE_PACKAGE_CREATED: "EVIDENCE_PACKAGE_CREATED",
} as const;
