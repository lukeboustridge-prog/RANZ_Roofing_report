// ============================================
// COMPLIANCE EVALUATION ENGINE
// Ported from RANZ Compliance Wizard
// Pure function that evaluates compliance based on inputs
// ============================================

import {
  DETERMINATION_DATABASE,
  type Determination,
  type CaseStudy,
  type AlertType,
} from "./determinations";

// ============================================
// INPUT TYPES
// ============================================

export type Pathway = "planning" | "execution";
export type Scope = "new" | "replace_same" | "replace_change";
export type Pitch = "standard" | "low" | "zero";
export type Age = "old" | "young";
export type ConsentStatus = "yes" | "emergency" | "no_check";
export type BuildingType = "residential" | "rental" | "commercial";
export type Variation = "yes" | "no";
export type Discovery = "structural" | "checked_ok" | "none";
export type Licence = "yes" | "no";
export type Supervision = "self" | "check" | "remote";
export type Completion = "in_progress" | "finished" | "dispute" | "terminated";
export type ExecTask =
  | "finish_eaves"
  | "flashings"
  | "penetration"
  | "substitution"
  | "insulation"
  | "none";

export type ComplexRisk =
  | "gutter"
  | "skillion"
  | "truss"
  | "dormer"
  | "container"
  | "attic_storage"
  | "h1_upgrade"
  | "sips"
  | "solar"
  | "asbestos"
  | "none";

export interface WizardInputs {
  // Pathway selection
  pathway: Pathway | null;

  // Planning phase inputs
  scope?: Scope | null;
  pitch?: Pitch;
  complex?: ComplexRisk[];
  age?: Age | null;
  consent_status?: ConsentStatus | null;

  // Execution phase inputs
  b_type?: BuildingType | null;
  variation?: Variation | null;
  exec_task?: ExecTask;
  discovery?: Discovery | null;
  licence?: Licence | null;
  supervision?: Supervision | null;
  completion?: Completion | null;
}

// ============================================
// OUTPUT TYPES
// ============================================

export type ComplianceStatus =
  | "consent_required"
  | "lbp_required"
  | "likely_exempt"
  | "commercial_exempt"
  | "check_required";

export interface CustomAlert {
  type: AlertType;
  title: string;
  content: string;
  pdfLink?: string;
}

export interface ComplianceResult {
  status: ComplianceStatus;
  bannerClass: string;
  bannerTitle: string;
  bannerSubtitle?: string;
  warnings: (Determination | CaseStudy | CustomAlert)[];
  reasons: string[];
  requiredActions: string[];
  legislationKeys: string[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createCustomAlert(
  type: AlertType,
  title: string,
  content: string,
  pdfLink?: string
): CustomAlert {
  return { type, title, content, pdfLink };
}

// ============================================
// MAIN EVALUATION FUNCTION
// ============================================

export function evaluateCompliance(inputs: WizardInputs): ComplianceResult {
  if (!inputs.pathway) {
    return {
      status: "check_required",
      bannerClass: "res-check",
      bannerTitle: "SELECT PATHWAY",
      warnings: [],
      reasons: [],
      requiredActions: [],
      legislationKeys: [],
    };
  }

  if (inputs.pathway === "planning") {
    return evaluatePlanning(inputs);
  } else {
    return evaluateExecution(inputs);
  }
}

// ============================================
// PLANNING PATHWAY EVALUATION
// ============================================

function evaluatePlanning(inputs: WizardInputs): ComplianceResult {
  const warnings: (Determination | CaseStudy | CustomAlert)[] = [];
  const reasons: string[] = [];
  const requiredActions: string[] = [];
  let isConsentRequired = false;

  const complex = inputs.complex || [];
  const pitch = inputs.pitch || "standard";
  const scope = inputs.scope;
  const age = inputs.age;
  const consent_status = inputs.consent_status;

  // ============================================
  // 1. BASE LOGIC
  // ============================================

  // Complex risks that always require consent
  const complexHasRisk = complex.some((x) =>
    ["gutter", "container"].includes(x)
  );
  if (complexHasRisk) isConsentRequired = true;

  // Scope-based logic
  if (scope !== "replace_same") isConsentRequired = true;

  // Age-based logic (15-year rule)
  if (age === "young") isConsentRequired = true;

  // ============================================
  // 2. DETERMINATION ENGINE
  // ============================================

  // Zero pitch
  if (pitch === "zero") {
    warnings.push(DETERMINATION_DATABASE.zero_pitch);
    reasons.push(
      "<strong>Zero Pitch:</strong> Requires 'Protected Membrane System' (Ballasted/Insulated) to comply."
    );
  }

  // Low pitch with like-for-like replacement (potential exemption)
  if (pitch === "low" && scope === "replace_same") {
    isConsentRequired = false; // Force Exempt based on Det 2018/021 Logic
    warnings.push(DETERMINATION_DATABASE.low_pitch_repair);
  }

  // Skillion roof
  if (complex.includes("skillion")) {
    warnings.push(DETERMINATION_DATABASE.skillion_vent);
  }

  // Truss work
  if (complex.includes("truss")) {
    isConsentRequired = true;
    warnings.push(DETERMINATION_DATABASE.truss_cow);
  }

  // Dormer
  if (complex.includes("dormer")) {
    warnings.push(DETERMINATION_DATABASE.dormer_fire);
  }

  // Container roof
  if (complex.includes("container")) {
    isConsentRequired = true;
    warnings.push(DETERMINATION_DATABASE.container_roof);
  }

  // Attic storage
  if (complex.includes("attic_storage")) {
    warnings.push(DETERMINATION_DATABASE.attic_storage);
    reasons.push(
      "<strong>Structure (B1):</strong> Ceiling joists cannot act as floor joists."
    );
  }

  // SIPs
  if (complex.includes("sips")) {
    warnings.push(
      createCustomAlert(
        "case-study-box",
        "SIPs Warning (McFarlane [2025])",
        "Fixing cladding to SIPs is specialised. Standard timber frame fixings/cavities may not apply. Lack of specific knowledge was ruled as incompetence.",
        "public/upheld_complaints/ramon-mcfarlane-2025-bpb-26638-redacted.pdf"
      )
    );
  }

  // ============================================
  // 3. EDUCATIONAL ALERTS
  // ============================================

  // Solar panels
  if (complex.includes("solar")) {
    warnings.push(
      createCustomAlert(
        "tech-alert",
        "Solar & Structure (Education)",
        '<strong>Why it matters:</strong> Solar panels alter the structural load path. Standard roof trusses are designed for "distributed loads", not "point loads". <br><br><strong>Action:</strong> Verify structure (B1) and flashings (E2).'
      )
    );
  }

  // Asbestos
  if (complex.includes("asbestos")) {
    warnings.push(
      createCustomAlert(
        "tech-alert",
        "Asbestos & The Law",
        "<strong>The Rule:</strong> Pre-2000 buildings are presumed to contain asbestos. You generally cannot disturb materials without a negative test."
      )
    );
  }

  // Double risk: Skillion + H1 upgrade
  if (complex.includes("skillion") && complex.includes("h1_upgrade")) {
    warnings.push(
      createCustomAlert(
        "warning-box",
        "DOUBLE RISK: Skillion + Insulation",
        "<strong>The Conflict:</strong> Thick H1 insulation (R6.6) in a shallow skillion roof often blocks the 25mm air gap.<br><strong>Advice:</strong> Raise the roof height (Consent required) or use high-density insulation boards."
      )
    );
  }

  // Internal gutter conversion
  if (complex.includes("gutter")) {
    warnings.push(
      createCustomAlert(
        "tech-alert",
        "Internal Gutters",
        "<strong>Why Consent is needed:</strong> Converting an internal gutter to an external one alters drainage design (Clause E1)."
      )
    );
  }

  // ============================================
  // 4. CONSENT STATUS CHECKS
  // ============================================

  if (consent_status === "no_check" && isConsentRequired) {
    warnings.push(
      createCustomAlert(
        "case-study-box",
        "Danger (Corbett-Pearson [2024])",
        "Failing to check for consent is negligence. Verify now.",
        "public/upheld_complaints/dean-corbett-pearson-2024-bpb-26512-redacted.pdf"
      )
    );
  }

  if (consent_status === "emergency") {
    requiredActions.push(
      "Apply for Certificate of Acceptance (s42) immediately."
    );
  }

  // ============================================
  // 5. BUILD RESULT
  // ============================================

  if (isConsentRequired) {
    reasons.push("<strong>LBP Required:</strong> Restricted Building Work.");
  } else {
    reasons.push("<strong>No LBP Mandate:</strong> (But recommended).");
  }

  return {
    status: isConsentRequired ? "consent_required" : "likely_exempt",
    bannerClass: isConsentRequired ? "res-consent" : "res-exempt",
    bannerTitle: isConsentRequired
      ? "CONSENT & LBP REQUIRED"
      : "LIKELY EXEMPT",
    warnings,
    reasons,
    requiredActions,
    legislationKeys: ["scope", "pitch", "complex", "age", "consent_status"],
  };
}

// ============================================
// EXECUTION PATHWAY EVALUATION
// ============================================

function evaluateExecution(inputs: WizardInputs): ComplianceResult {
  const warnings: (Determination | CaseStudy | CustomAlert)[] = [];
  const reasons: string[] = [];
  const requiredActions: string[] = [];

  const b_type = inputs.b_type;
  const variation = inputs.variation;
  const exec_task = inputs.exec_task || "none";
  const discovery = inputs.discovery;
  const licence = inputs.licence;
  const supervision = inputs.supervision;
  const completion = inputs.completion;

  let status: ComplianceStatus = "lbp_required";
  let bannerClass = "res-consent";
  let bannerTitle = "LBP REQUIRED";
  let bannerSubtitle = "Residential Roofing is Restricted Building Work";

  // ============================================
  // 1. BUILDING TYPE LOGIC
  // ============================================

  if (b_type === "commercial") {
    status = "commercial_exempt";
    bannerClass = "res-commercial";
    bannerTitle = "COMMERCIAL: LBP NOT MANDATED";
    reasons.push("Commercial work is generally not RBW.");
  } else {
    if (discovery === "structural") {
      bannerSubtitle = "Structural Work Discovered (RBW)";
    }

    if (b_type === "residential" || b_type === "rental") {
      reasons.push(
        "<strong>Residential Rule:</strong> This work is Restricted Building Work (RBW). It must be supervised by an LBP, with the relevant licence class."
      );
    }

    if (b_type === "rental") {
      warnings.push(
        createCustomAlert(
          "warning-box",
          "Rental Property Ventilation (Det 2015/057)",
          "Tenanted properties have higher moisture loads. MBIE rules often require <strong>Mechanical Ventilation</strong> (kitchen/bathroom extraction) to meet Clause E3, as tenants cannot be relied upon to open windows."
        )
      );
    }
  }

  // ============================================
  // 2. EXECUTION TASK DETERMINATIONS
  // ============================================

  if (exec_task === "finish_eaves") {
    warnings.push(DETERMINATION_DATABASE.underlay_uv);
    requiredActions.push("Trim underlay at gutter line. Install metal turn-downs.");
  }

  if (exec_task === "flashings") {
    warnings.push(DETERMINATION_DATABASE.flashing_laps);
  }

  if (exec_task === "penetration") {
    warnings.push(DETERMINATION_DATABASE.flue_gap);
  }

  if (exec_task === "substitution") {
    warnings.push(DETERMINATION_DATABASE.membrane_sub);
    warnings.push(
      createCustomAlert(
        "case-study-box",
        "Substitution Warning (Dhillon [2025])",
        "Swapping '5-Rib' for 'Brownbuilt 900' without a variation was ruled as negligent. You must have paperwork for product swaps.",
        "public/upheld_complaints/gaganjeet-dhillon-2025-bpb-26605.pdf"
      )
    );
    requiredActions.push("STOP: Apply for Amendment (Form 2) before installing.");
  }

  if (exec_task === "insulation") {
    warnings.push(DETERMINATION_DATABASE.spray_foam);
    warnings.push(
      createCustomAlert(
        "warning-box",
        "PIR Board (Det 2017/071)",
        "If using PIR board, ensure thermal breaks and cavities match NZ construction standards. Overseas certificates (BBA) are valid but installation details must be adapted for NZ."
      )
    );
  }

  // ============================================
  // 3. VARIATION CHECK
  // ============================================

  if (variation === "yes") {
    warnings.push(
      createCustomAlert(
        "case-study-box",
        "STOP: Variation / Substitution (Langdon [2025])",
        "Unapproved changes = Fines. Apply for Minor Variation (Form 45A).",
        "public/upheld_complaints/langdon-2025-bpb-cb26658-finalised-draft-decision.pdf"
      )
    );
  }

  // ============================================
  // 4. DISCOVERY / SUBSTRATE CHECK
  // ============================================

  if (discovery === "structural") {
    reasons.push(
      "<strong>Structural Finding:</strong> Replacing substrate/purlins is RBW. New work MUST meet current code (s112)."
    );
  }

  if (discovery === "none") {
    warnings.push(
      createCustomAlert(
        "case-study-box",
        "Substrate Liability (Woolhouse [2024])",
        "The Board ruled that if you cover up a builder's mistake, you <strong>adopt that defect</strong> as your own.<br><br><strong>Advice:</strong> Always inspect the substrate before starting.",
        "public/upheld_complaints/jesse-woolhouse-2024-bpb-cb26464.pdf"
      )
    );
  }

  // ============================================
  // 5. LICENCE CHECK
  // ============================================

  if (licence === "no") {
    warnings.push(
      createCustomAlert(
        "case-study-box",
        "Licence Breach (Casha [2025])",
        "You are working outside your licence class. You cannot supervise this work.",
        "public/upheld_complaints/christopher-scott-casha-2025-bpb-cb26690-finalised-draft-decision.pdf"
      )
    );
    warnings.push(
      createCustomAlert(
        "warning-box",
        "Tanking vs Roofing (Wu [2025])",
        "While Tanking is RBW, confusion exists over which licence covers it. Ensure your licence explicitly covers the scope of work (e.g. External Plastering/Foundations vs Roofing)."
      )
    );
  }

  // ============================================
  // 6. SUPERVISION CHECK
  // ============================================

  if (supervision === "remote") {
    warnings.push(
      createCustomAlert(
        "case-study-box",
        "Supervision Risk (Horrack [2024])",
        "Remote supervision requires physical inspection.",
        "public/upheld_complaints/bjorn-horrack-2024-bpb-26456-redacted.pdf"
      )
    );
    warnings.push(
      createCustomAlert(
        "case-study-box",
        "Subcontracting & Liability (Bogue [2024])",
        "You cannot outsource your RoW liability. Even if you subcontract the labour, if you are the lead LBP, you must ensure the Record of Work is provided.",
        "public/upheld_complaints/scott-bogue-2024-bpb-26384.pdf"
      )
    );
    requiredActions.push("Schedule a physical site inspection immediately.");
  }

  // ============================================
  // 7. COMPLETION LOGIC
  // ============================================

  if (completion === "in_progress") {
    reasons.push(
      "<strong>Status:</strong> Work in progress. Maintain compliant supervision."
    );
    if (b_type === "residential" || b_type === "rental") {
      reasons.push(
        "<strong>Reminder:</strong> Issue Record of Work upon completion."
      );
    }
  } else if (completion === "finished") {
    if (b_type === "residential" || b_type === "rental") {
      requiredActions.push("Issue Record of Work (RoW) to Owner AND Council.");
    }
  } else if (completion === "dispute") {
    warnings.push(
      createCustomAlert(
        "case-study-box",
        "Issue RoW Now (Moyes [2025])",
        "Do not withhold RoW for payment.",
        "public/upheld_complaints/moyes-2025-bpb-cb26670-finalised-draft-decision.pdf"
      )
    );
    if (b_type === "residential" || b_type === "rental") {
      requiredActions.push(
        "Issue Record of Work (RoW) to the Owner & Council immediately. Your obligation to certify RBW is statutory, not contractual. Withholding an RoW as leverage for payment is a disciplinary offence."
      );
    }
  } else if (completion === "terminated") {
    if (b_type === "residential" || b_type === "rental") {
      requiredActions.push(
        "Issue RoW to Owner & Council for the specific work done to date. This creates a liability 'line in the sand'."
      );
    }
  }

  // General RoW reminder for residential
  if (b_type === "residential" || b_type === "rental") {
    reasons.push("<strong>General:</strong> Send RoW to Owner AND Council.");
  }

  return {
    status,
    bannerClass,
    bannerTitle,
    bannerSubtitle,
    warnings,
    reasons,
    requiredActions,
    legislationKeys: [
      "b_type",
      "variation",
      "exec_task",
      "discovery",
      "licence",
      "supervision",
      "completion",
    ],
  };
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function isWizardComplete(inputs: WizardInputs): boolean {
  if (!inputs.pathway) return false;

  if (inputs.pathway === "planning") {
    return !!(
      inputs.scope &&
      inputs.pitch &&
      inputs.complex &&
      inputs.complex.length > 0 &&
      (inputs.scope !== "replace_same" || inputs.age) &&
      inputs.consent_status
    );
  } else {
    return !!(
      inputs.b_type &&
      inputs.variation &&
      inputs.discovery &&
      inputs.licence &&
      inputs.supervision &&
      inputs.completion
    );
  }
}

export function getNextRequiredField(inputs: WizardInputs): string | null {
  if (!inputs.pathway) return "pathway";

  if (inputs.pathway === "planning") {
    if (!inputs.scope) return "scope";
    if (!inputs.pitch) return "pitch";
    if (!inputs.complex || inputs.complex.length === 0) return "complex";
    if (inputs.scope === "replace_same" && !inputs.age) return "age";
    if (!inputs.consent_status) return "consent_status";
  } else {
    if (!inputs.b_type) return "b_type";
    if (!inputs.variation) return "variation";
    if (!inputs.discovery) return "discovery";
    if (!inputs.licence) return "licence";
    if (!inputs.supervision) return "supervision";
    if (!inputs.completion) return "completion";
  }

  return null;
}
