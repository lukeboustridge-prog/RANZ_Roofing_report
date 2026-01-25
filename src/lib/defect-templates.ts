/**
 * Defect Templates Library
 * Pre-defined templates for common roofing defects
 */

import type { DefectClass, DefectSeverity, PriorityLevel } from "@prisma/client";

export interface DefectTemplate {
  id: string;
  name: string;
  category: string;
  title: string;
  description: string;
  classification: DefectClass;
  severity: DefectSeverity;
  observationTemplate: string;
  analysisTemplate?: string;
  opinionTemplate?: string;
  codeReference?: string;
  copReference?: string;
  probableCauseTemplate?: string;
  recommendationTemplate?: string;
  priorityLevel?: PriorityLevel;
  tags: string[];
}

export const DEFECT_CATEGORIES = [
  "Cladding",
  "Flashings",
  "Gutters & Downpipes",
  "Ridge & Hip",
  "Penetrations",
  "Fixings",
  "Underlays",
  "Structural",
  "Weathertightness",
  "Maintenance",
] as const;

export type DefectCategory = (typeof DEFECT_CATEGORIES)[number];

/**
 * Common roofing defect templates
 */
export const DEFECT_TEMPLATES: DefectTemplate[] = [
  // Cladding Defects
  {
    id: "cladding-corrosion",
    name: "Cladding Corrosion",
    category: "Cladding",
    title: "Corrosion to roof cladding",
    description: "Surface corrosion identified on metal roof cladding",
    classification: "MAJOR_DEFECT",
    severity: "HIGH",
    observationTemplate:
      "Surface corrosion was observed on the [MATERIAL] roof cladding at [LOCATION]. The affected area measures approximately [SIZE]. The corrosion presents as [DESCRIPTION - e.g., rust staining, pitting, delamination].",
    analysisTemplate:
      "The corrosion indicates breakdown of the protective coating system, likely caused by [CAUSE - e.g., age, environmental factors, mechanical damage, chemical exposure]. This type of corrosion typically progresses [RATE] in [ENVIRONMENT] conditions.",
    codeReference: "NZBC E2.3.2",
    copReference: "Metal Roof COP Section 5.3",
    probableCauseTemplate:
      "Possible causes include: coating breakdown due to age, mechanical damage during installation or maintenance, ponding water, chemical contamination, or inadequate coating specification for the environment.",
    recommendationTemplate:
      "Replace affected cladding sections and investigate the source of corrosion. Ensure replacement material is appropriately specified for the environment. Consider enhanced coating systems for corrosive environments.",
    priorityLevel: "SHORT_TERM",
    tags: ["corrosion", "metal", "cladding", "coating"],
  },
  {
    id: "cladding-dent-damage",
    name: "Mechanical Damage to Cladding",
    category: "Cladding",
    title: "Mechanical damage to roof cladding",
    description: "Dents, scratches, or physical damage to roof cladding",
    classification: "MINOR_DEFECT",
    severity: "LOW",
    observationTemplate:
      "Mechanical damage was observed on the roof cladding at [LOCATION]. The damage consists of [DESCRIPTION - e.g., dents, scratches, foot traffic marks]. The affected area measures approximately [SIZE].",
    analysisTemplate:
      "The damage appears to be caused by [CAUSE - e.g., foot traffic, falling debris, installation damage]. While primarily cosmetic, this damage may compromise the protective coating and lead to premature corrosion.",
    codeReference: "NZBC E2.3.2",
    copReference: "Metal Roof COP Section 3.2",
    recommendationTemplate:
      "Monitor for signs of corrosion at damaged areas. Apply touch-up coating to scratched areas. Install walkway systems if regular roof access is required.",
    priorityLevel: "LONG_TERM",
    tags: ["damage", "dent", "scratch", "mechanical"],
  },
  {
    id: "cladding-low-pitch",
    name: "Insufficient Roof Pitch",
    category: "Cladding",
    title: "Roof pitch below minimum requirements",
    description: "Roof pitch does not meet minimum requirements for installed cladding",
    classification: "MAJOR_DEFECT",
    severity: "CRITICAL",
    observationTemplate:
      "The roof pitch at [LOCATION] was measured at [MEASURED PITCH] degrees. The installed [CLADDING TYPE] cladding requires a minimum pitch of [REQUIRED PITCH] degrees.",
    analysisTemplate:
      "Insufficient roof pitch increases the risk of water ingress through laps and fixings, and may cause ponding water. This installation does not comply with manufacturer specifications or the Metal Roof Code of Practice.",
    codeReference: "NZBC E2.3.1",
    copReference: "Metal Roof COP Section 4.2",
    probableCauseTemplate:
      "Design error, as-built deviation from design, or incorrect cladding selection for the roof geometry.",
    recommendationTemplate:
      "Engage a structural engineer and roofing specialist to assess options. Solutions may include: increasing roof pitch, installing sealed lap systems, or replacing with appropriate low-pitch cladding.",
    priorityLevel: "IMMEDIATE",
    tags: ["pitch", "design", "compliance", "ponding"],
  },

  // Flashing Defects
  {
    id: "flashing-wall-failure",
    name: "Wall Flashing Failure",
    category: "Flashings",
    title: "Deteriorated or failed wall flashing",
    description: "Wall flashing showing signs of failure or deterioration",
    classification: "MAJOR_DEFECT",
    severity: "HIGH",
    observationTemplate:
      "The wall flashing at [LOCATION] exhibits [DESCRIPTION - e.g., lifting, corrosion, separation, inadequate upstand]. The flashing is [MATERIAL] and appears to be [AGE ESTIMATE] years old.",
    analysisTemplate:
      "Failed wall flashings are a common cause of weathertightness failures. The observed condition indicates [ASSESSMENT]. Water may be entering the building envelope at this location.",
    codeReference: "NZBC E2.3.2",
    copReference: "Metal Roof COP Section 7.1",
    probableCauseTemplate:
      "Possible causes include: inadequate original installation, thermal movement, sealant failure, or mechanical damage.",
    recommendationTemplate:
      "Remove and replace the wall flashing. Ensure new flashing complies with E2/AS1 requirements with minimum 75mm upstand. Install appropriate weatherseal at wall junction.",
    priorityLevel: "SHORT_TERM",
    tags: ["flashing", "wall", "weathertightness", "upstand"],
  },
  {
    id: "flashing-penetration-failure",
    name: "Penetration Flashing Failure",
    category: "Penetrations",
    title: "Failed or inadequate penetration flashing",
    description: "Flashing around roof penetration showing signs of failure",
    classification: "MAJOR_DEFECT",
    severity: "HIGH",
    observationTemplate:
      "The penetration flashing at [PENETRATION TYPE - e.g., pipe, vent, flue] at [LOCATION] exhibits [DESCRIPTION - e.g., cracking, separation, inadequate overlap, sealant failure].",
    analysisTemplate:
      "Penetration flashings are critical weathertightness elements. The observed condition indicates water may be entering the roof system at this point. [EVIDENCE OF WATER INGRESS IF VISIBLE].",
    codeReference: "NZBC E2.3.2",
    copReference: "Metal Roof COP Section 8.0",
    recommendationTemplate:
      "Replace penetration flashing with compliant system. Use appropriate proprietary flashing boot or custom fabricated flashing. Ensure minimum 150mm overlap with roof cladding.",
    priorityLevel: "SHORT_TERM",
    tags: ["flashing", "penetration", "pipe", "vent", "weathertightness"],
  },

  // Gutter Defects
  {
    id: "gutter-corrosion",
    name: "Gutter Corrosion",
    category: "Gutters & Downpipes",
    title: "Corrosion in gutter system",
    description: "Corrosion identified in gutters or downpipes",
    classification: "MINOR_DEFECT",
    severity: "MEDIUM",
    observationTemplate:
      "Corrosion was observed in the [GUTTER TYPE] gutter at [LOCATION]. The corrosion presents as [DESCRIPTION - e.g., rust staining, pitting, perforations]. The affected length is approximately [LENGTH].",
    analysisTemplate:
      "Gutter corrosion is typically caused by [CAUSE - e.g., debris accumulation, standing water, dissimilar metals, age]. If untreated, this will progress to leaking and potential fascia damage.",
    codeReference: "NZBC E1.3.1",
    copReference: "Metal Roof COP Section 9.3",
    recommendationTemplate:
      "Replace corroded gutter sections. Ensure adequate falls (minimum 1:500). Install gutter guards if debris accumulation is a contributing factor. Consider upgrade to more corrosion-resistant material.",
    priorityLevel: "MEDIUM_TERM",
    tags: ["gutter", "corrosion", "drainage"],
  },
  {
    id: "gutter-inadequate-fall",
    name: "Inadequate Gutter Fall",
    category: "Gutters & Downpipes",
    title: "Insufficient gutter fall causing ponding",
    description: "Gutter does not have adequate fall to outlets",
    classification: "MINOR_DEFECT",
    severity: "MEDIUM",
    observationTemplate:
      "The gutter at [LOCATION] exhibits inadequate fall towards the outlet. Standing water was observed [DEPTH] deep extending [LENGTH] from the outlet. Evidence of [DEBRIS/ALGAE/STAINING] indicates ongoing ponding.",
    analysisTemplate:
      "Inadequate gutter fall causes ponding which accelerates corrosion, promotes algae growth, and increases the risk of overflow during rain events. Minimum fall should be 1:500.",
    codeReference: "NZBC E1.3.1",
    copReference: "Metal Roof COP Section 9.1",
    recommendationTemplate:
      "Rehang gutter with minimum 1:500 fall to outlets. Check and clear any blockages in outlets and downpipes. Consider additional outlets if gutter runs are excessive.",
    priorityLevel: "MEDIUM_TERM",
    tags: ["gutter", "fall", "ponding", "drainage"],
  },

  // Ridge & Hip Defects
  {
    id: "ridge-cap-lifting",
    name: "Ridge Cap Lifting",
    category: "Ridge & Hip",
    title: "Ridge cap lifting or displaced",
    description: "Ridge cap showing signs of lifting or movement",
    classification: "MAJOR_DEFECT",
    severity: "HIGH",
    observationTemplate:
      "The ridge cap at [LOCATION] is lifting/displaced by approximately [MEASUREMENT]. [NUMBER] fixings appear to be [DESCRIPTION - e.g., loose, missing, corroded]. The ridge seal is [CONDITION].",
    analysisTemplate:
      "Lifting ridge caps allow water and wind-driven rain to enter the roof space. This poses a significant weathertightness risk, particularly during severe weather events.",
    codeReference: "NZBC E2.3.2",
    copReference: "Metal Roof COP Section 6.1",
    probableCauseTemplate:
      "Possible causes include: fixing failure, thermal movement, inadequate original fixing, wind damage, or deteriorated ridge seal.",
    recommendationTemplate:
      "Refasten ridge cap with appropriate fixings. Replace ridge seal. Check and secure all ridge cap sections. Consider installing additional fixings in exposed locations.",
    priorityLevel: "SHORT_TERM",
    tags: ["ridge", "cap", "lifting", "fixings"],
  },

  // Fixing Defects
  {
    id: "fixings-backing-out",
    name: "Fixings Backing Out",
    category: "Fixings",
    title: "Roof fixings backing out",
    description: "Roof fixings showing signs of backing out or loosening",
    classification: "MAJOR_DEFECT",
    severity: "HIGH",
    observationTemplate:
      "Multiple roof fixings at [LOCATION] are backing out from the substrate. Approximately [NUMBER] fixings in [AREA] are affected. The fixings are [TYPE] and [APPROXIMATE AGE].",
    analysisTemplate:
      "Backing out fixings compromise the roof's wind uplift resistance and create potential water entry points. This is a serious defect that requires prompt attention.",
    codeReference: "NZBC B1.3.1",
    copReference: "Metal Roof COP Section 3.4",
    probableCauseTemplate:
      "Possible causes include: thermal cycling, inadequate fixing penetration into substrate, incorrect fixing type, purlins shrinking, or inadequate pilot holes.",
    recommendationTemplate:
      "Replace all backing out fixings with appropriate fixings. Consider using larger diameter or longer fixings. Install oversized washers on replacements. Check remaining fixings across the roof.",
    priorityLevel: "SHORT_TERM",
    tags: ["fixings", "screws", "backing out", "wind uplift"],
  },
  {
    id: "fixings-corrosion",
    name: "Corroded Fixings",
    category: "Fixings",
    title: "Corrosion of roof fixings",
    description: "Roof fixings showing signs of corrosion",
    classification: "MINOR_DEFECT",
    severity: "MEDIUM",
    observationTemplate:
      "Corrosion is evident on roof fixings at [LOCATION]. The fixings appear to be [MATERIAL]. Rust staining is visible on the surrounding cladding. Approximately [PERCENTAGE]% of visible fixings are affected.",
    analysisTemplate:
      "Corroded fixings will eventually fail, creating water entry points and compromising wind uplift resistance. Dissimilar metal corrosion may indicate inappropriate fixing selection.",
    codeReference: "NZBC B2.3.1",
    copReference: "Metal Roof COP Section 3.4",
    recommendationTemplate:
      "Replace corroded fixings with appropriate corrosion-resistant fixings matching the cladding material. Use Class 4 or stainless steel fixings in coastal environments.",
    priorityLevel: "MEDIUM_TERM",
    tags: ["fixings", "corrosion", "rust", "galvanic"],
  },

  // Maintenance Defects
  {
    id: "debris-accumulation",
    name: "Debris Accumulation",
    category: "Maintenance",
    title: "Debris accumulation on roof",
    description: "Significant debris accumulation affecting roof performance",
    classification: "MAINTENANCE_ITEM",
    severity: "LOW",
    observationTemplate:
      "Significant debris accumulation was observed at [LOCATION]. The debris consists of [DESCRIPTION - e.g., leaves, moss, lichen, bird droppings]. The buildup is approximately [DEPTH/COVERAGE].",
    analysisTemplate:
      "Debris accumulation traps moisture against the roof surface, accelerating deterioration and potentially blocking drainage paths. Regular cleaning is required to maintain roof condition.",
    copReference: "Metal Roof COP Section 10.0",
    recommendationTemplate:
      "Clean debris from affected areas. Establish regular maintenance schedule (recommend 6-monthly in vegetated areas). Consider installing bird deterrents if applicable. Trim overhanging vegetation.",
    priorityLevel: "LONG_TERM",
    tags: ["maintenance", "debris", "cleaning", "moss"],
  },
  {
    id: "general-wear",
    name: "General Wear and Ageing",
    category: "Maintenance",
    title: "General wear consistent with age",
    description: "Roof showing general wear appropriate for its age",
    classification: "MAINTENANCE_ITEM",
    severity: "LOW",
    observationTemplate:
      "The [MATERIAL] roof cladding at [LOCATION] exhibits wear consistent with its estimated age of [AGE] years. Observable signs include [DESCRIPTION - e.g., fading, minor oxidation, weathering].",
    analysisTemplate:
      "The observed condition is typical for a roof of this age and does not indicate premature failure. Continued monitoring is recommended to identify any deterioration requiring intervention.",
    recommendationTemplate:
      "Continue regular maintenance inspections. Plan for roof replacement within [TIMEFRAME] based on expected service life. Address any specific defects separately.",
    priorityLevel: "LONG_TERM",
    tags: ["maintenance", "ageing", "wear", "expected"],
  },
];

/**
 * Get all defect templates
 */
export function getAllDefectTemplates(): DefectTemplate[] {
  return DEFECT_TEMPLATES;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: DefectCategory): DefectTemplate[] {
  return DEFECT_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): DefectTemplate | undefined {
  return DEFECT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Search templates by text
 */
export function searchTemplates(query: string): DefectTemplate[] {
  const lowercaseQuery = query.toLowerCase();
  return DEFECT_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowercaseQuery) ||
      t.title.toLowerCase().includes(lowercaseQuery) ||
      t.description.toLowerCase().includes(lowercaseQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery))
  );
}

/**
 * Get all unique categories from templates
 */
export function getCategories(): string[] {
  return [...new Set(DEFECT_TEMPLATES.map((t) => t.category))];
}
