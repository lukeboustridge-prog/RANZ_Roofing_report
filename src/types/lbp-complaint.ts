import type { LBPComplaint, LBPComplaintStatus } from "@prisma/client";

// Re-export Prisma types
export type { LBPComplaint, LBPComplaintStatus };

// Extended types with relations
export type LBPComplaintWithRelations = LBPComplaint & {
  report: {
    id: string;
    reportNumber: string;
    propertyAddress: string;
    propertyCity: string;
    inspectionDate: Date;
    clientName: string;
    inspector: {
      id: string;
      name: string;
      email: string;
      lbpNumber: string | null;
    };
    photos: Array<{
      id: string;
      url: string;
      thumbnailUrl: string | null;
      caption: string | null;
      photoType: string;
    }>;
    defects: Array<{
      id: string;
      title: string;
      severity: string;
      classification: string;
      description: string;
      location: string;
    }>;
  };
};

// Grounds for Discipline - Building Act 2004 Section 317
export const GROUNDS_FOR_DISCIPLINE = {
  NEGLIGENT_OR_INCOMPETENT_WORK: {
    code: "NEGLIGENT_OR_INCOMPETENT_WORK",
    label:
      "Carried out or supervised building work negligently or incompetently",
    section: "317(1)(b)",
    description:
      "The LBP performed or supervised building work that was below the standard of care expected of a reasonably competent practitioner.",
  },
  NON_COMPLIANT_WITH_CONSENT: {
    code: "NON_COMPLIANT_WITH_CONSENT",
    label:
      "Carried out or supervised building work that does not comply with a building consent",
    section: "317(1)(c)",
    description:
      "The building work does not conform to the plans and specifications approved in the building consent.",
  },
  MISREPRESENTED_LICENSE: {
    code: "MISREPRESENTED_LICENSE",
    label:
      "Held themselves out to be licensed when not licensed for that type of work",
    section: "317(1)(d)",
    description:
      "The person claimed or implied they were licensed to perform work for which they did not hold a valid license.",
  },
  CONVICTION_AFFECTING_FITNESS: {
    code: "CONVICTION_AFFECTING_FITNESS",
    label: "Convicted of an offence that affects fitness to do building work",
    section: "317(1)(da)",
    description:
      "The LBP has been convicted of an offence that calls into question their fitness to perform building work.",
  },
  FALSE_INFO_FOR_LICENSE: {
    code: "FALSE_INFO_FOR_LICENSE",
    label: "Provided false information in order to become licensed",
    section: "317(1)(e)",
    description:
      "The LBP obtained their license by providing false or misleading information.",
  },
  FAILED_PROVIDE_DESIGN_CERTIFICATE: {
    code: "FAILED_PROVIDE_DESIGN_CERTIFICATE",
    label: "Failed to provide certificate of design work for building consent",
    section: "317(1)(f)",
    description:
      "The LBP failed to provide the required design certificate when applying for building consent.",
  },
  FAILED_PROVIDE_RECORD_OF_WORK: {
    code: "FAILED_PROVIDE_RECORD_OF_WORK",
    label:
      "Failed to provide record of work on completion of restricted building work",
    section: "317(1)(g)",
    description:
      "The LBP did not provide a record of work upon completion of restricted building work as required by the Building Act.",
  },
  MISREPRESENTED_COMPETENCE: {
    code: "MISREPRESENTED_COMPETENCE",
    label: "Misrepresented their competence",
    section: "317(1)(h)",
    description:
      "The LBP made false claims about their skills, qualifications, or experience.",
  },
  WORKED_OUTSIDE_COMPETENCE: {
    code: "WORKED_OUTSIDE_COMPETENCE",
    label:
      "Carried out or supervised building work outside their competence",
    section: "317(1)(h)",
    description:
      "The LBP performed work that was beyond their area of competence or license class.",
  },
  FAILED_PRODUCE_LICENSE: {
    code: "FAILED_PRODUCE_LICENSE",
    label: "Failed to produce licence or notify change in licence status",
    section: "317(1)(i)",
    description:
      "The LBP failed to produce their license when requested or failed to notify changes in their license status.",
  },
  DISREPUTABLE_CONDUCT: {
    code: "DISREPUTABLE_CONDUCT",
    label:
      "Conducted themselves in a manner that brings the LBP scheme into disrepute",
    section: "317(1)(j)",
    description:
      "The LBP's conduct has damaged the reputation or integrity of the Licensed Building Practitioner scheme.",
  },
} as const;

export type GroundForDisciplineCode = keyof typeof GROUNDS_FOR_DISCIPLINE;

// License types
export const LICENSE_TYPES = [
  "Design",
  "Site",
  "Carpentry",
  "Roofing",
  "External Plastering",
  "Brick and Blocklaying",
  "Foundations",
] as const;

export type LicenseType = (typeof LICENSE_TYPES)[number];

// Work types
export const WORK_TYPES = {
  CARRIED_OUT: "Carried out",
  SUPERVISED: "Supervised",
  BOTH: "Both carried out and supervised",
} as const;

export type WorkType = keyof typeof WORK_TYPES;

// Witness interface
export interface WitnessDetails {
  name: string;
  phone?: string;
  email?: string;
  role?: string; // e.g., "Property owner", "Site manager"
  details: string; // What they witnessed
}

// Complaint form data input
export interface CreateLBPComplaintInput {
  reportId: string;
}

export interface UpdateLBPComplaintInput {
  // Subject LBP
  subjectLbpNumber?: string;
  subjectLbpName?: string;
  subjectLbpEmail?: string;
  subjectLbpPhone?: string;
  subjectLbpCompany?: string;
  subjectLbpAddress?: string;
  subjectLbpLicenseTypes?: string[];
  subjectSightedLicense?: boolean;
  subjectWorkType?: string;

  // Work details
  workAddress?: string;
  workSuburb?: string;
  workCity?: string;
  workStartDate?: Date;
  workEndDate?: Date;
  workDescription?: string;
  buildingConsentNumber?: string;
  buildingConsentDate?: Date;

  // Complaint details
  groundsForDiscipline?: string[];
  conductDescription?: string;
  evidenceSummary?: string;
  stepsToResolve?: string;

  // Evidence
  attachedPhotoIds?: string[];
  attachedDefectIds?: string[];
  witnesses?: WitnessDetails[];
  additionalAttachments?: string[];

  // Complainant (RANZ - usually pre-filled)
  complainantName?: string;
  complainantAddress?: string;
  complainantPhone?: string;
  complainantEmail?: string;
}

// Review input
export interface ReviewComplaintInput {
  reviewNotes?: string;
  approved: boolean;
}

// Signature input
export interface SignComplaintInput {
  signatureData: string; // Base64 signature image
  declarationAccepted: boolean;
}

// BPB response tracking
export interface BPBResponseInput {
  bpbReference?: string;
  bpbAcknowledgedAt?: Date;
  bpbDecision?: string;
  bpbDecisionDate?: Date;
  bpbOutcome?: string;
  bpbNotes?: string;
}

// Status transition validation
export const VALID_STATUS_TRANSITIONS: Record<LBPComplaintStatus, LBPComplaintStatus[]> = {
  DRAFT: ["PENDING_REVIEW", "WITHDRAWN"],
  PENDING_REVIEW: ["DRAFT", "READY_TO_SUBMIT", "WITHDRAWN"],
  READY_TO_SUBMIT: ["SUBMITTED", "PENDING_REVIEW", "WITHDRAWN"],
  SUBMITTED: ["ACKNOWLEDGED", "WITHDRAWN"],
  ACKNOWLEDGED: ["UNDER_INVESTIGATION", "DECIDED", "CLOSED"],
  UNDER_INVESTIGATION: ["HEARING_SCHEDULED", "DECIDED", "CLOSED"],
  HEARING_SCHEDULED: ["DECIDED", "CLOSED"],
  DECIDED: ["CLOSED"],
  CLOSED: [],
  WITHDRAWN: [],
};

// Helper function to check if status transition is valid
export function canTransitionTo(
  currentStatus: LBPComplaintStatus,
  newStatus: LBPComplaintStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

// Complaint dashboard stats
export interface LBPComplaintStats {
  totalComplaints: number;
  draftComplaints: number;
  pendingReviewComplaints: number;
  submittedComplaints: number;
  activeComplaints: number; // Under investigation, hearing scheduled
  closedComplaints: number;
}

// API response types
export interface LBPComplaintListResponse {
  complaints: LBPComplaintWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LBPComplaintSubmissionResult {
  success: boolean;
  complaintNumber: string;
  submittedAt: Date;
  confirmationId: string;
  pdfUrl?: string;
  evidencePackageUrl?: string;
}
