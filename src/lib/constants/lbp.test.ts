/**
 * LBP Constants Tests
 *
 * Tests to verify the LBP complaint system constants are properly configured.
 */

import { describe, it, expect } from "vitest";
import {
  RANZ_DETAILS,
  BPB_DETAILS,
  COMPLAINT_NUMBER_PREFIX,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_STATUS_COLORS,
  BPB_DECISIONS,
  BPB_OUTCOMES,
  EMAIL_SUBJECTS,
  PDF_SETTINGS,
  EVIDENCE_PACKAGE_SETTINGS,
  VALIDATION_RULES,
  REQUIRED_FIELDS_FOR_SUBMISSION,
  LBP_AUDIT_ACTIONS,
} from "./lbp";

describe("RANZ_DETAILS", () => {
  it("should have required organization details", () => {
    expect(RANZ_DETAILS.name).toBeDefined();
    expect(RANZ_DETAILS.website).toBe("https://www.ranz.org.nz");
    expect(RANZ_DETAILS.relation).toBe("Third-party inspector");
  });

  it("should have contact fields (may be empty if env not set)", () => {
    expect(typeof RANZ_DETAILS.address).toBe("string");
    expect(typeof RANZ_DETAILS.phone).toBe("string");
    expect(typeof RANZ_DETAILS.email).toBe("string");
    expect(typeof RANZ_DETAILS.adminEmail).toBe("string");
  });
});

describe("BPB_DETAILS", () => {
  it("should have Building Practitioners Board details", () => {
    expect(BPB_DETAILS.name).toBe("Building Practitioners Board");
    expect(BPB_DETAILS.website).toBe("https://www.lbp.govt.nz");
    expect(BPB_DETAILS.phone).toBe("0800 60 60 50");
  });

  it("should have email addresses", () => {
    expect(BPB_DETAILS.email).toMatch(/@/);
    expect(BPB_DETAILS.complaintsEmail).toMatch(/@/);
  });

  it("should have physical address", () => {
    expect(BPB_DETAILS.address).toMatch(/Wellington/);
  });
});

describe("COMPLAINT_NUMBER_PREFIX", () => {
  it("should have correct format prefix", () => {
    expect(COMPLAINT_NUMBER_PREFIX).toBe("RANZ-LBP");
  });
});

describe("COMPLAINT_STATUS_LABELS", () => {
  const expectedStatuses = [
    "DRAFT",
    "PENDING_REVIEW",
    "READY_TO_SUBMIT",
    "SUBMITTED",
    "ACKNOWLEDGED",
    "UNDER_INVESTIGATION",
    "HEARING_SCHEDULED",
    "DECIDED",
    "CLOSED",
    "WITHDRAWN",
  ];

  it("should have labels for all statuses", () => {
    expectedStatuses.forEach((status) => {
      expect(COMPLAINT_STATUS_LABELS[status]).toBeDefined();
      expect(typeof COMPLAINT_STATUS_LABELS[status]).toBe("string");
    });
  });

  it("should have human-readable labels", () => {
    expect(COMPLAINT_STATUS_LABELS.DRAFT).toBe("Draft");
    expect(COMPLAINT_STATUS_LABELS.PENDING_REVIEW).toBe("Pending Review");
    expect(COMPLAINT_STATUS_LABELS.SUBMITTED).toBe("Submitted");
  });
});

describe("COMPLAINT_STATUS_COLORS", () => {
  const expectedStatuses = [
    "DRAFT",
    "PENDING_REVIEW",
    "READY_TO_SUBMIT",
    "SUBMITTED",
    "ACKNOWLEDGED",
    "UNDER_INVESTIGATION",
    "HEARING_SCHEDULED",
    "DECIDED",
    "CLOSED",
    "WITHDRAWN",
  ];

  it("should have colors for all statuses", () => {
    expectedStatuses.forEach((status) => {
      expect(COMPLAINT_STATUS_COLORS[status]).toBeDefined();
      expect(COMPLAINT_STATUS_COLORS[status].bg).toMatch(/^bg-/);
      expect(COMPLAINT_STATUS_COLORS[status].text).toMatch(/^text-/);
    });
  });
});

describe("BPB_DECISIONS", () => {
  it("should have expected decision types", () => {
    expect(BPB_DECISIONS.PROCEED_TO_HEARING).toBe("Proceed to Hearing");
    expect(BPB_DECISIONS.DISMISSED).toBe("Dismissed");
    expect(BPB_DECISIONS.NO_FURTHER_ACTION).toBe("No Further Action");
  });
});

describe("BPB_OUTCOMES", () => {
  it("should have expected penalty types", () => {
    expect(BPB_OUTCOMES.LICENSE_CANCELLED).toBe("License Cancelled");
    expect(BPB_OUTCOMES.LICENSE_SUSPENDED).toBe("License Suspended");
    expect(BPB_OUTCOMES.FORMAL_WARNING).toBe("Formal Warning");
    expect(BPB_OUTCOMES.FINE).toBe("Fine Imposed");
  });
});

describe("EMAIL_SUBJECTS", () => {
  it("should generate submission subject correctly", () => {
    const subject = EMAIL_SUBJECTS.SUBMISSION("RANZ-LBP-2025-00001", "John Builder");
    expect(subject).toBe("LBP Complaint - RANZ-LBP-2025-00001 - John Builder");
  });

  it("should generate acknowledgment subject correctly", () => {
    const subject = EMAIL_SUBJECTS.ACKNOWLEDGMENT("RANZ-LBP-2025-00001");
    expect(subject).toBe("Complaint RANZ-LBP-2025-00001 - Acknowledgment Received");
  });

  it("should generate status update subject correctly", () => {
    const subject = EMAIL_SUBJECTS.STATUS_UPDATE("RANZ-LBP-2025-00001");
    expect(subject).toBe("Complaint RANZ-LBP-2025-00001 - Status Update");
  });
});

describe("PDF_SETTINGS", () => {
  it("should have A4 page size", () => {
    expect(PDF_SETTINGS.pageSize).toBe("A4");
  });

  it("should have reasonable margins", () => {
    expect(PDF_SETTINGS.margins.top).toBeGreaterThan(0);
    expect(PDF_SETTINGS.margins.bottom).toBeGreaterThan(0);
    expect(PDF_SETTINGS.margins.left).toBeGreaterThan(0);
    expect(PDF_SETTINGS.margins.right).toBeGreaterThan(0);
  });

  it("should have font sizes in decreasing order", () => {
    const { fontSizes } = PDF_SETTINGS;
    expect(fontSizes.title).toBeGreaterThan(fontSizes.heading);
    expect(fontSizes.heading).toBeGreaterThan(fontSizes.subheading);
    expect(fontSizes.subheading).toBeGreaterThan(fontSizes.body);
    expect(fontSizes.body).toBeGreaterThan(fontSizes.small);
  });
});

describe("EVIDENCE_PACKAGE_SETTINGS", () => {
  it("should have reasonable photo size limit", () => {
    // 10MB max per photo
    expect(EVIDENCE_PACKAGE_SETTINGS.maxPhotoSize).toBe(10 * 1024 * 1024);
  });

  it("should have reasonable package size limit", () => {
    // 100MB max total
    expect(EVIDENCE_PACKAGE_SETTINGS.maxPackageSize).toBe(100 * 1024 * 1024);
  });

  it("should have valid compression level", () => {
    expect(EVIDENCE_PACKAGE_SETTINGS.compressionLevel).toBeGreaterThanOrEqual(0);
    expect(EVIDENCE_PACKAGE_SETTINGS.compressionLevel).toBeLessThanOrEqual(9);
  });

  it("should have valid photo quality", () => {
    expect(EVIDENCE_PACKAGE_SETTINGS.photoQuality).toBeGreaterThan(0);
    expect(EVIDENCE_PACKAGE_SETTINGS.photoQuality).toBeLessThanOrEqual(100);
  });
});

describe("VALIDATION_RULES", () => {
  describe("lbpNumber pattern", () => {
    const { pattern } = VALIDATION_RULES.lbpNumber;

    it("should match valid LBP numbers", () => {
      expect(pattern.test("BP123456")).toBe(true);
      expect(pattern.test("LB999999")).toBe(true);
      expect(pattern.test("XY000001")).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(pattern.test("123456")).toBe(false); // No letters
      expect(pattern.test("BP12345")).toBe(false); // Too few digits
      expect(pattern.test("BP1234567")).toBe(false); // Too many digits
      expect(pattern.test("bp123456")).toBe(false); // Lowercase
      expect(pattern.test("B1234567")).toBe(false); // Only one letter
    });
  });

  it("should have reasonable limits", () => {
    expect(VALIDATION_RULES.minGroundsForDiscipline).toBeGreaterThan(0);
    expect(VALIDATION_RULES.maxGroundsForDiscipline).toBeLessThan(10);
    expect(VALIDATION_RULES.minPhotosRequired).toBeGreaterThan(0);
    expect(VALIDATION_RULES.maxDescriptionLength).toBeGreaterThan(1000);
  });
});

describe("REQUIRED_FIELDS_FOR_SUBMISSION", () => {
  it("should require subject LBP details", () => {
    expect(REQUIRED_FIELDS_FOR_SUBMISSION).toContain("subjectLbpNumber");
    expect(REQUIRED_FIELDS_FOR_SUBMISSION).toContain("subjectLbpName");
  });

  it("should require work details", () => {
    expect(REQUIRED_FIELDS_FOR_SUBMISSION).toContain("workAddress");
    expect(REQUIRED_FIELDS_FOR_SUBMISSION).toContain("workDescription");
  });

  it("should require conduct and evidence", () => {
    expect(REQUIRED_FIELDS_FOR_SUBMISSION).toContain("conductDescription");
    expect(REQUIRED_FIELDS_FOR_SUBMISSION).toContain("evidenceSummary");
  });

  it("should require grounds and photos", () => {
    expect(REQUIRED_FIELDS_FOR_SUBMISSION).toContain("groundsForDiscipline");
    expect(REQUIRED_FIELDS_FOR_SUBMISSION).toContain("attachedPhotoIds");
  });
});

describe("LBP_AUDIT_ACTIONS", () => {
  it("should have all lifecycle actions", () => {
    expect(LBP_AUDIT_ACTIONS.COMPLAINT_CREATED).toBeDefined();
    expect(LBP_AUDIT_ACTIONS.COMPLAINT_UPDATED).toBeDefined();
    expect(LBP_AUDIT_ACTIONS.COMPLAINT_SUBMITTED_FOR_REVIEW).toBeDefined();
    expect(LBP_AUDIT_ACTIONS.COMPLAINT_APPROVED).toBeDefined();
    expect(LBP_AUDIT_ACTIONS.COMPLAINT_REJECTED).toBeDefined();
    expect(LBP_AUDIT_ACTIONS.COMPLAINT_SIGNED).toBeDefined();
    expect(LBP_AUDIT_ACTIONS.COMPLAINT_SUBMITTED_TO_BPB).toBeDefined();
    expect(LBP_AUDIT_ACTIONS.COMPLAINT_WITHDRAWN).toBeDefined();
  });

  it("should have response and document actions", () => {
    expect(LBP_AUDIT_ACTIONS.BPB_RESPONSE_RECEIVED).toBeDefined();
    expect(LBP_AUDIT_ACTIONS.PDF_GENERATED).toBeDefined();
    expect(LBP_AUDIT_ACTIONS.EVIDENCE_PACKAGE_CREATED).toBeDefined();
  });
});
