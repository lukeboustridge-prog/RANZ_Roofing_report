// ============================================
// DETERMINATION DATABASE
// Extracted from RANZ Compliance Wizard
// Contains MBIE determinations and BPB rulings
// ============================================

export type AlertType =
  | "danger-box"
  | "warning-box"
  | "precedent-box"
  | "success-box"
  | "case-study-box"
  | "tech-alert"
  | "info-box";

export interface Determination {
  id: string;
  file: string;
  title: string;
  summary: string;
  type: AlertType;
}

export const DETERMINATION_DATABASE: Record<string, Determination> = {
  // ============================================
  // PLANNING PHASE DETERMINATIONS
  // ============================================
  zero_pitch: {
    id: "Det 2016/016",
    file: "2016-016.pdf",
    title: "Zero Pitch Exception",
    summary:
      "Membranes usually need 1.5°. However, 'Protected Membranes' (ballasted) at 0° CAN be compliant if certified (Codemark/BBA).",
    type: "precedent-box",
  },
  low_pitch_repair: {
    id: "Det 2018/021",
    file: "2018-021.pdf",
    title: "Low Pitch Alternative Solution",
    summary:
      "Low pitch roofs (<3°) can be compliant if specific evidence (manufacturer verification/history) is provided, even if outside E2/AS1.",
    type: "success-box",
  },
  skillion_vent: {
    id: "Det 2021/012",
    file: "2021-012.pdf",
    title: "Skillion Roof Ventilation",
    summary:
      "Strict Rule: You MUST maintain a 25mm air gap between insulation and underlay. Blocking this gap violates E2. Check purlin depth.",
    type: "danger-box",
  },
  internal_gutter: {
    id: "Det 2014/035",
    file: "2014-035.pdf",
    title: "Internal Gutter: Repair vs Mod",
    summary:
      "Re-lining is Exempt. Changing depth/width/overflow is a Modification (Consent Required).",
    type: "warning-box",
  },
  truss_cow: {
    id: "Det 2023/008",
    file: "2023-008.pdf",
    title: "Truss Design = RBW",
    summary:
      "Trusses are Primary Structure. You cannot just use the manufacturer's PS1. A Design LBP must provide a Certificate of Work (CoW).",
    type: "danger-box",
  },
  dormer_fire: {
    id: "Det 2024/018",
    file: "2024-018.pdf",
    title: "Dormer Fire Rating",
    summary:
      "Dormer cheeks <1m from boundary are External Walls. They likely require Fire Rating (Clause C3).",
    type: "warning-box",
  },
  pool_deck: {
    id: "Det 2023/024",
    file: "2023-024.pdf",
    title: "Roof Decks & Pools",
    summary:
      "If a roof deck overlooks a pool, Clause F9 (Barriers) applies. Treat deck as 'immediate pool area'.",
    type: "warning-box",
  },
  container_roof: {
    id: "Det 2019/057",
    file: "2019-057.pdf",
    title: "Shipping Containers",
    summary:
      "Placing a container is exempt. However, building a roof over it or joining containers is 'Building Work' and requires Consent.",
    type: "warning-box",
  },
  attic_storage: {
    id: "Det 2023/036",
    file: "2023-036.pdf",
    title: "Attic/Roof Space Storage",
    summary:
      "Ceiling joists are not floor joists. Boarding them over for storage triggers B1 (Structure). A Certificate of Acceptance was refused because joists were over-spanned.",
    type: "danger-box",
  },

  // ============================================
  // EXECUTION / WORKMANSHIP DETERMINATIONS
  // ============================================
  underlay_uv: {
    id: "Det 2024/051",
    file: "2024-051.pdf",
    title: "Eaves: Underlay & Turn-Downs",
    summary:
      "Non-Compliant: Leaving underlay exposed to UV at the gutter. Metal sheets MUST have stop-ends/turn-downs (approx 10mm) to prevent water blow-back.",
    type: "danger-box",
  },
  flashing_laps: {
    id: "Det 2025/033",
    file: "2025-033.pdf",
    title: "Barge Flashing Cover",
    summary:
      "Flashings must provide adequate cover. Cladding often needs to run BEHIND the barge flashing leg, not just butt up to it.",
    type: "warning-box",
  },
  flue_gap: {
    id: "Det 2024/036",
    file: "2024-036.pdf",
    title: "Flue Penetrations",
    summary:
      "Must maintain manufacturer specified air gap (usually 25mm) from timber/underlay. Do not pack insulation tight against the flue liner.",
    type: "danger-box",
  },
  membrane_sub: {
    id: "Det 2023/013",
    file: "2023-013.pdf",
    title: "Membrane Substitution",
    summary:
      "Swapping membrane brands is NOT a Minor Variation. It requires a formal Amendment (Form 2).",
    type: "danger-box",
  },
  spray_foam: {
    id: "Det 2019/002",
    file: "2019-002.pdf",
    title: "Spray Foam Risk",
    summary:
      "Retrofitting spray foam directly to underlay is NON-COMPLIANT. It blocks drainage/ventilation paths (E2 Failure).",
    type: "danger-box",
  },
};

// ============================================
// CASE STUDY ALERTS (BPB Upheld Complaints)
// ============================================
export interface CaseStudy {
  id: string;
  title: string;
  file: string;
  summary: string;
  type: "case-study-box";
}

export const CASE_STUDY_DATABASE: Record<string, CaseStudy> = {
  newton_2023: {
    id: "Newton [2023]",
    title: "Design Changes = No Exemption",
    file: "newton-2023-cb26223-final-decision.pdf",
    summary:
      "A roofer replaced a dormer but removed parapets. The Board ruled this was not 'like-for-like'. If you change the design, Schedule 1 does not apply.",
    type: "case-study-box",
  },
  corbett_pearson_2024: {
    id: "Corbett-Pearson [2024]",
    title: "Duty to Check",
    file: "dean-corbett-pearson-2024-bpb-26512-redacted.pdf",
    summary:
      "A roofer assumed a consent was in place but didn't check. The Board ruled the LBP is in the best position to stop unconsented work.",
    type: "case-study-box",
  },
  langdon_2025: {
    id: "Langdon [2025]",
    title: '"My way is better" Trap',
    file: "langdon-2025-bpb-cb26658-finalised-draft-decision.pdf",
    summary:
      "A roofer was fined for using a 'better' method without approval. Product substitution was also a key issue.",
    type: "case-study-box",
  },
  woolhouse_2024: {
    id: "Woolhouse [2024]",
    title: "Substrate Responsibility",
    file: "jesse-woolhouse-2024-bpb-cb26464.pdf",
    summary:
      "Relying on the builder's incorrect set-out was no defence. Do not cover up non-compliant work.",
    type: "case-study-box",
  },
  casha_2025: {
    id: "Casha [2025]",
    title: "Scope of Licence",
    file: "christopher-scott-casha-2025-bpb-cb26690-finalised-draft-decision.pdf",
    summary:
      "A roofer was fined for doing work outside his specific licence class (Membrane vs Metal).",
    type: "case-study-box",
  },
  horrack_2024: {
    id: "Horrack [2024]",
    title: "Remote Supervision",
    file: "bjorn-horrack-2024-bpb-26456-redacted.pdf",
    summary:
      'The Board ruled "Remote supervision does not mean NO supervision".',
    type: "case-study-box",
  },
  moyes_2025: {
    id: "Moyes [2025]",
    title: "Withholding Paperwork",
    file: "moyes-2025-bpb-cb26670-finalised-draft-decision.pdf",
    summary:
      "An LBP was fined for withholding a Record of Work due to unpaid invoices.",
    type: "case-study-box",
  },
  mcfarlane_2025: {
    id: "McFarlane [2025]",
    title: "SIPs Warning",
    file: "ramon-mcfarlane-2025-bpb-26638-redacted.pdf",
    summary:
      "Fixing cladding to SIPs is specialised. Standard timber frame fixings/cavities may not apply. Lack of specific knowledge was ruled as incompetence.",
    type: "case-study-box",
  },
  dhillon_2025: {
    id: "Dhillon [2025]",
    title: "Substitution Warning",
    file: "gaganjeet-dhillon-2025-bpb-26605.pdf",
    summary:
      "Swapping '5-Rib' for 'Brownbuilt 900' without a variation was ruled as negligent. You must have paperwork for product swaps.",
    type: "case-study-box",
  },
  bogue_2024: {
    id: "Bogue [2024]",
    title: "Subcontracting & Liability",
    file: "scott-bogue-2024-bpb-26384.pdf",
    summary:
      "You cannot outsource your RoW liability. Even if you subcontract the labour, if you are the lead LBP, you must ensure the Record of Work is provided.",
    type: "case-study-box",
  },
};

// ============================================
// LEGISLATION EXPLANATIONS
// ============================================
export interface LegislationExplanation {
  question: string;
  options: Record<
    string,
    {
      ref: string;
      text: string;
    }
  >;
}

export const EXPLANATIONS: Record<string, LegislationExplanation> = {
  scope: {
    question: "Scope of Work",
    options: {
      new: {
        ref: "Building Act 2004, Section 40",
        text: "Section 40: 'A person must not carry out any building work except in accordance with a building consent.' New builds do not fit the definition of maintenance/replacement under Schedule 1.",
      },
      replace_same: {
        ref: "Building Act 2004, Schedule 1, Part 1, Clause 1",
        text: "Exemption 1: Covers 'General repair, maintenance, and replacement'. Crucially, it only applies if you use 'comparable materials' in the 'same position'.",
      },
      replace_change: {
        ref: "Building Act 2004, Schedule 1 & Newton [2023]",
        text: "In Newton [2023], the BPB ruled that removing parapets constituted a change in design/position. This voided the Schedule 1 exemption.",
      },
    },
  },
  pitch: {
    question: "Roof Pitch",
    options: {
      low: {
        ref: "E2/AS1",
        text: "Low pitch roofs (<3°) generally require specific design (Membrane) or long-run profiles with specific washer/sealant requirements.",
      },
      zero: {
        ref: "Det 2016/016",
        text: "Zero pitch requires specific 'Protected Membrane' systems to comply.",
      },
    },
  },
  complex: {
    question: "Complex / Risks",
    options: {
      gutter: {
        ref: "Building Code E1/E2",
        text: "Converting gutters alters drainage design. Consent required.",
      },
      skillion: {
        ref: "Building Code H1/E3",
        text: "Skillion roofs need ventilation to prevent condensation. Design advice recommended.",
      },
      truss: {
        ref: "Det 2023/008",
        text: "Trusses are Primary Structure. Manufacturer PS1 is not enough; requires LBP Design CoW.",
      },
      dormer: {
        ref: "Det 2024/018",
        text: "Dormer cheeks near boundary must be Fire Rated (Clause C3).",
      },
      container: {
        ref: "Det 2019/057",
        text: "Relocating a container is exempt. However, roofing over it creates a new building structure, requiring Consent.",
      },
      attic_storage: {
        ref: "Det 2023/036",
        text: "Converting roof space to storage imposes new loads (B1). Ceiling joists are rarely designed for floor loads.",
      },
      sips: {
        ref: "McFarlane [2025]",
        text: "Fixing cladding to SIPs is specialised work. Standard timber frame fixings/cavities may not apply. Lack of knowledge = Incompetence.",
      },
      solar: {
        ref: "Building Code B1",
        text: "Solar panels add weight. Structural check required.",
      },
      asbestos: {
        ref: "Health & Safety at Work Act",
        text: "Asbestos must be identified. Stop work order risk.",
      },
      h1_upgrade: {
        ref: "Building Code H1 / E2",
        text: "Upgrading insulation often increases roof depth, affecting flashing cover and building envelope height.",
      },
      none: {
        ref: "N/A",
        text: "Standard scope.",
      },
    },
  },
  age: {
    question: "15-Year Rule",
    options: {
      young: {
        ref: "Schedule 1, Clause 1(a)(ii)",
        text: "No exemption if failed <15 years.",
      },
      old: {
        ref: "Schedule 1",
        text: "Likely maintenance exemption.",
      },
    },
  },
  consent_status: {
    question: "Consent Check",
    options: {
      no_check: {
        ref: "Corbett-Pearson",
        text: "Failing to check consent is negligence.",
      },
      emergency: {
        ref: "Building Act s41(c)",
        text: "Emergency work allowed but requires Certificate of Acceptance (s42) immediately after.",
      },
    },
  },
  b_type: {
    question: "Building Type",
    options: {
      residential: {
        ref: "RBW Order 2011",
        text: "RBW applies to residential housing.",
      },
      rental: {
        ref: "Det 2015/057",
        text: "Tenanted properties have higher moisture risks. Mechanical ventilation is often required to meet E3.",
      },
      commercial: {
        ref: "Building Act",
        text: "Commercial is not RBW.",
      },
    },
  },
  variation: {
    question: "Deviations/Substitution",
    options: {
      yes: {
        ref: "Langdon [2025] & Smith [2023]",
        text: "Substitution or variation requires Form 45A approval.",
      },
    },
  },
  exec_task: {
    question: "Execution Detail",
    options: {
      finish_eaves: {
        ref: "Det 2024/051",
        text: "Exposed underlay and lack of turn-downs is non-compliant.",
      },
      flashings: {
        ref: "Det 2025/033",
        text: "Flashings must provide adequate cover to cladding.",
      },
      penetration: {
        ref: "Det 2024/036",
        text: "Flue air gaps must be maintained.",
      },
    },
  },
  discovery: {
    question: "Substrate/Structure",
    options: {
      structural: {
        ref: "Building Act s112",
        text: "Replacing structure is RBW. Must meet current code.",
      },
      none: {
        ref: "Woolhouse [2024]",
        text: "Failing to check substrate is negligence.",
      },
    },
  },
  licence: {
    question: "Licence Class",
    options: {
      no: {
        ref: "Casha [2025]",
        text: "Working outside licence class is a disciplinary offence.",
      },
    },
  },
  supervision: {
    question: "Supervision",
    options: {
      remote: {
        ref: "Horrack [2024]",
        text: "Must physically inspect.",
      },
    },
  },
  completion: {
    question: "Completion",
    options: {
      dispute: {
        ref: "Moyes [2025]",
        text: "Withholding RoW is illegal.",
      },
      terminated: {
        ref: "McKinstry [2023]",
        text: "Completion = End of contract.",
      },
    },
  },
};
