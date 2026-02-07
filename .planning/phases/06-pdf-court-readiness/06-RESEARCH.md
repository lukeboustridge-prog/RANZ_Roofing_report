# Phase 6: PDF Court-Readiness - Research

**Researched:** 2026-02-07
**Domain:** PDF generation with @react-pdf/renderer, Prisma schema, ISO 17020 compliance sections
**Confidence:** HIGH

## Summary

This phase requires adding five missing ISO 17020 sections to the PDF report: methodology, equipment/tools, limitations, access method, and compliance assessment results (B2/E2/COP with pass/fail/NA). Research of the existing codebase reveals that:

1. **Database fields already exist** for all five data categories (`methodology`, `equipment`, `limitations`, `accessMethod` on the Report model; `complianceAssessment` relation with `checklistResults` JSON). No schema migration is needed.
2. **UI form fields already exist** for `accessMethod` and `limitations` in the report edit page (`src/app/(dashboard)/reports/[id]/edit/page.tsx`). The compliance assessment UI exists at `/reports/[id]/compliance`. However, there are NO UI fields for `methodology` (the field exists in the schema as `Json?` but is not editable in any UI) or `equipment` (also `Json?` in schema, not editable).
3. **The PDF template already renders some of this data partially** -- `accessMethod` and `limitations` appear as rows in the "Inspection Details" section on page 1, and the compliance assessment section (Section 7) renders all three checklists (E2/AS1, Metal Roof COP, B2 Durability) with pass/fail/partial/NA badges. However, there are **no dedicated PDF sections** for methodology, equipment/tools, or a structured limitations section. The data is just inline rows, not the formal ISO 17020 sections the spec requires.
4. **The Table of Contents already references** "3. Methodology" with subsections "3.1 Inspection Process", "3.2 Equipment Used", "3.3 Weather Conditions" -- but these sections DO NOT EXIST in the actual PDF body. They are placeholders in the TOC only.

**Primary recommendation:** This phase is primarily about creating new PDF section components and wiring up the data flow. The database supports it, the UI partially supports it, but the PDF rendering is missing the actual section content. The work is: (a) add UI fields for methodology and equipment, (b) create 3-4 new PDF section components, (c) update the main report template to include them, (d) ensure data flows from API to template.

## Current Architecture (What Exists)

### PDF Infrastructure

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/pdf/report-template.tsx` | Main PDF document assembly (2400+ lines) | **Core file to modify** |
| `src/lib/pdf/components.tsx` | Reusable PDF components (Header, Footer, SectionHeading, InfoRow, BulletList, Table, ComplianceItem, DefectCard, etc.) | Rich component library - reuse these |
| `src/lib/pdf/styles.ts` | Shared styles, RANZ brand colors, typography | Already comprehensive |
| `src/lib/pdf/react-pdf-wrapper.ts` | Re-exports from @react-pdf/renderer (Document, Page, Text, View, Image, etc.) | Stable wrapper |
| `src/lib/pdf/sections/cover-page.tsx` | Professional cover page section | Pattern example |
| `src/lib/pdf/sections/toc.tsx` | Table of contents with section entries | **Needs updating** |
| `src/lib/pdf/sections/declaration.tsx` | Expert witness declaration (High Court Rules Schedule 4) | Pattern example |
| `src/lib/pdf/sections/evidence-certificate.tsx` | Evidence integrity certificate with photo hash registry | Pattern example |
| `src/lib/pdf/sections/photo-appendix.tsx` | Photo appendix section | Pattern example |
| `src/lib/pdf/sections/index.ts` | Barrel exports for all sections | **Add new sections here** |

### PDF Library

| Library | Version | Notes |
|---------|---------|-------|
| `@react-pdf/renderer` | ^4.3.2 | Server-side only (`"server-only"` directive). Uses `renderToBuffer()` in API route. |

### Current PDF Document Structure (in report-template.tsx)

The `ReportPDF` component assembles pages in this order:
1. CoverPage (separate section component)
2. TableOfContents (separate section component)
3. Declaration (separate section component)
4. Property Details Page (inline in report-template.tsx)
5. Executive Summary Page (inline)
6. Table of Contents Page (inline -- duplicated from #2!)
7. Glossary Page (inline)
8. Expert Witness Declaration Page (inline -- duplicated from #3, conditional on `declarationSigned`)
9. Section 5: Factual Observations - Roof Elements (inline)
10. Section 6: Defects Register (inline)
11. Section 7: Building Code Compliance Assessment (inline -- **already renders E2/AS1, COP, B2 with pass/fail badges**)
12. Section 10: Recommendations Summary (inline)
13. Overview Photos Page (inline)
14. Disclaimer Page (inline)
15. Standards & References Page (inline)
16. EvidenceCertificate (separate section component)
17. PhotoAppendix (separate section component)

**Missing from actual PDF body** (but referenced in TOC):
- Section 1: Introduction & Scope (with limitations)
- Section 2: Inspector Credentials
- Section 3: Methodology (with equipment, weather, access method)
- Sections 8 & 9: Analysis & Discussion / Opinions & Conclusions

### Database Schema (What Exists for These Fields)

All fields needed for PDF-01 through PDF-05 already exist in the Prisma schema:

| Requirement | DB Field | Type | Location | Has UI? | In PDF? |
|-------------|----------|------|----------|---------|---------|
| **PDF-01: Methodology** | `Report.methodology` | `Json?` | Schema line ~147 | **NO** - no edit UI | TOC only, no body section |
| **PDF-02: Equipment** | `Report.equipment` | `Json?` | Schema line ~148 | **NO** - no edit UI | TOC only, no body section |
| **PDF-03: Limitations** | `Report.limitations` | `String? @db.Text` | Schema line ~131 | **YES** - textarea in edit page | Inline row only, not a formal section |
| **PDF-04: Access Method** | `Report.accessMethod` | `String?` | Schema line ~130 | **YES** - input in edit page | Inline row only, not a formal section |
| **PDF-05: Compliance** | `Report.e2Compliance`, `Report.b2Compliance`, `Report.copCompliance` (direct JSON), plus `ComplianceAssessment.checklistResults` | `Json?` each | Schema lines ~158-160, ~675-691 | **YES** - full compliance wizard at `/reports/[id]/compliance` | **YES** - Section 7 already renders checklist tables with pass/fail/partial/NA |

### ComplianceAssessment Model Detail

```prisma
model ComplianceAssessment {
  id                   String @id @default(cuid())
  reportId             String @unique
  report               Report @relation(...)
  checklistResults     Json   // { e2_as1: { item_id: "pass"|"fail"|"partial"|"na" }, metal_roof_cop: {...}, b2_durability: {...} }
  nonComplianceSummary String? @db.Text
  wizardData           Json?  // Risk assessment wizard answers
}
```

The `checklistResults` JSON structure maps to three checklists already hardcoded in `report-template.tsx`:
- `e2_as1` (12 items) -- E2/AS1 4th Edition External Moisture
- `metal_roof_cop` (16 items) -- Metal Roof COP v25.12
- `b2_durability` (8 items) -- B2 Durability Assessment

Each item gets a status: `"pass"`, `"fail"`, `"partial"`, or `"na"`.

### PDF API Route Data Flow

`src/app/api/reports/[id]/pdf/route.ts`:

1. Fetches report with `include: { inspector, photos, defects (with photos, roofElement), roofElements (with photos), complianceAssessment }`
2. Transforms JSON fields: `methodology` -> `String()`, `equipment` -> `string[]`, `conclusions` -> `String()`
3. Passes to `ReportPDF({ report: reportData })`
4. Calls `renderToBuffer()` to generate PDF bytes
5. Returns as `application/pdf` with `Content-Disposition: attachment`

**Key observation:** The API route already fetches `methodology`, `equipment`, `limitations`, `accessMethod`, and `complianceAssessment`. The data is already passed to the template. The template just does not render dedicated sections for methodology/equipment.

### Report Edit Page UI

`src/app/(dashboard)/reports/[id]/edit/page.tsx`:

The edit page has form fields for:
- Property details (address, city, region, postcode, type, building age)
- Inspection details (date, type, weather conditions, **access method**, **limitations**)
- Client details (name, email, phone)
- Status

**NOT present in the edit page:**
- Methodology (no textarea or input)
- Equipment/tools (no list editor)

### Compliance Assessment UI

The compliance assessment is a **separate page** at `/reports/[id]/compliance` with:
- Three checklist sections (E2/AS1, Metal Roof COP, B2 Durability)
- Each item has a toggle for pass/fail/partial/NA
- Non-compliance summary textarea
- Risk assessment wizard (from compliance engine)
- Progress tracking

### Court Compliance Check

`src/app/api/reports/[id]/court-compliance/route.ts` checks 12 compliance items for High Court Rules Schedule 4. Relevant: check #6 "Methodology Documented" passes if `report.scopeOfWorks || report.methodology` exists.

## Architecture Patterns

### Pattern 1: PDF Section Component

Every existing PDF section follows this exact pattern:

```typescript
// src/lib/pdf/sections/[section-name].tsx
import { Page, View, Text } from "../react-pdf-wrapper";
import { styles, colors } from "../styles";
import { Header, Footer } from "../components";

interface SectionProps {
  reportNumber: string;
  // ... section-specific data props
}

const sectionStyles = {
  page: {
    ...styles.page,
    paddingTop: 80,
    paddingBottom: 60,
  },
  // ... section-specific styles using colors from ../styles
};

export function SectionName({ reportNumber, ...props }: SectionProps) {
  return (
    <Page size="A4" style={sectionStyles.page}>
      <Header reportNumber={reportNumber} />
      {/* Section content */}
      <Footer />
    </Page>
  );
}

export default SectionName;
```

**Key conventions:**
- Always `"server-only"` (imported from wrapper)
- Each section is a full `<Page>` component
- Uses `Header` and `Footer` from `../components`
- Extends `styles.page` with `paddingTop: 80, paddingBottom: 60` (for header/footer space)
- Local `sectionStyles` object (not StyleSheet.create) for section-specific styles
- Uses `colors` from `../styles` for RANZ branding
- Uses `as const` for literal type constraints in style objects

### Pattern 2: Inline Sections in report-template.tsx

Several sections are rendered inline within the main `ReportPDF` component as additional `<Page>` elements. The pattern is:

```typescript
<Page size="A4" style={styles.page}>
  <Text style={styles.sectionTitle}>SECTION TITLE</Text>
  {/* Section content using styles from the file-level StyleSheet */}
  <View style={styles.footer}>
    <Text>Report: {report.reportNumber}</Text>
    <Text render={({ pageNumber }) => `Page ${pageNumber}`} />
  </View>
</Page>
```

**Key difference from section components:** Inline sections use the file-level `styles` and `colors` objects (different from the shared `../styles` module), and use inline footer rather than the `<Footer />` component.

### Pattern 3: ReportData Interface

The `ReportData` interface in `report-template.tsx` defines exactly what data the PDF template receives:

```typescript
interface ReportData {
  reportNumber: string;
  // ... property, inspection, client fields ...
  scopeOfWorks: string | null;
  methodology: string | null;
  equipment: string[] | null;
  conclusions: string | null;
  accessMethod: string | null;
  limitations: string | null;
  // ... declaration fields ...
  inspector: { name, email, qualifications, lbpNumber, yearsExperience };
  roofElements: RoofElementData[];
  defects: DefectData[];
  photos: PhotoData[];
  complianceAssessment?: ComplianceAssessmentData | null;
}
```

**All required data fields are already in this interface.** No interface changes needed.

### Recommended New Section Structure

```
src/lib/pdf/sections/
  cover-page.tsx          (existing)
  toc.tsx                 (existing - update)
  declaration.tsx         (existing)
  evidence-certificate.tsx (existing)
  photo-appendix.tsx      (existing)
  methodology-section.tsx  (NEW - PDF-01, PDF-02, PDF-04)
  limitations-section.tsx  (NEW - PDF-03)
  index.ts               (existing - update)
```

**Recommendation:** Create a `MethodologySection` that renders Section 3 content with subsections for:
- 3.1 Inspection Process (from `methodology` field)
- 3.2 Equipment Used (from `equipment` field)
- 3.3 Access Method (from `accessMethod` field)
- 3.4 Weather Conditions (from `weatherConditions` field)

Create a `LimitationsSection` that renders a formal Section 1.3/1.4 limitations block or integrates into a combined "Introduction & Scope" section.

Alternatively, since the compliance assessment section (Section 7) already exists and renders correctly, PDF-05 may just need verification and possibly minor refinement rather than new code.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF rendering | Custom HTML-to-PDF | `@react-pdf/renderer` renderToBuffer() | Already in place, server-side React PDF |
| Compliance status styling | Custom color logic | Existing `getStatusColor()` and `ComplianceTableSection` helper | Already handles pass/fail/partial/NA with correct RANZ brand colors |
| Section layout | Custom page structure | Existing section component pattern (Page + Header + Footer) | Consistent branding across all sections |
| Compliance checklist definitions | New checklist structures | Existing `CHECKLIST_DEFINITIONS` constant in report-template.tsx | Already defines all 36 checklist items for E2/AS1, COP, B2 |

## Common Pitfalls

### Pitfall 1: Duplicate Sections in the Template
**What goes wrong:** The current template has duplicated sections (TOC appears twice, Expert Declaration appears twice -- once from the section component and once inline). Adding new sections could worsen this.
**Why it happens:** The template evolved incrementally, with section components added alongside existing inline sections.
**How to avoid:** When adding new sections, check if existing inline content covers the same ground. Either replace the inline content with the new section component, or ensure they serve different purposes.
**Warning signs:** PDF output with the same content appearing on multiple pages.

### Pitfall 2: JSON Field Type Confusion
**What goes wrong:** The `methodology` and `equipment` fields are `Json?` in Prisma, which means they arrive as `unknown` type. The API route transforms `methodology` with `String()` and `equipment` with `as string[]`, but direct Prisma JSON values could be strings, objects, arrays, or null.
**Why it happens:** Prisma `Json` type is not typed at the application level.
**How to avoid:** Always guard for the actual runtime type. Check `Array.isArray(equipment)` before mapping. Check `typeof methodology === 'string'` before rendering. The existing API route already does some of this transformation.
**Warning signs:** `[object Object]` appearing in PDF text, or "undefined" rendering.

### Pitfall 3: Empty Sections in the PDF
**What goes wrong:** Rendering sections with no data (e.g., methodology not filled in) results in empty or near-empty pages in the PDF.
**Why it happens:** Data fields are optional and may not be populated.
**How to avoid:** Conditionally render each section only when data exists. Pattern: `{report.methodology && <MethodologySection ... />}`. Add "Not documented" fallback text for required fields that are missing.
**Warning signs:** Blank pages in generated PDF, or "N/A" filling entire sections.

### Pitfall 4: react-pdf/renderer Dynamic Import Requirement
**What goes wrong:** Build errors like "Html should not be imported outside pages/_document".
**Why it happens:** `@react-pdf/renderer` conflicts with Next.js when statically imported in the build graph.
**How to avoid:** The API route already uses dynamic `import()` to load PDF modules. Any new section files that import from the react-pdf-wrapper will be fine as long as they're only imported through the existing dynamic import chain in the PDF route.
**Warning signs:** Build failures referencing `@react-pdf/renderer` or `Html` component.

### Pitfall 5: Compliance Assessment Not Created Yet
**What goes wrong:** The compliance section renders nothing because `ComplianceAssessment` record does not exist for the report.
**Why it happens:** The compliance assessment is created when the inspector visits the compliance page and starts filling in the checklist. If they never visit it, the record does not exist.
**How to avoid:** Already handled -- the template checks `hasComplianceData` before rendering Section 7. For PDF-05, ensure the court-compliance check also verifies compliance data completeness.
**Warning signs:** Compliance section missing from PDF for reports where inspector skipped the compliance step.

## Implementation Recommendations

### What Needs to Be Done (by requirement)

#### PDF-01: Methodology Section
**Status:** Database field exists (`methodology Json?`), no UI, no PDF section
**Work needed:**
1. Add methodology textarea to the report edit page (or a new dedicated page)
2. Create `MethodologySection` PDF component rendering Section 3
3. Add to report-template.tsx document assembly
4. Update TOC entries to match

#### PDF-02: Equipment/Tools Section
**Status:** Database field exists (`equipment Json?`), no UI, no PDF section
**Work needed:**
1. Add equipment list editor to the report edit page (or combine with methodology page)
2. Create equipment subsection within MethodologySection (3.2 Equipment Used)
3. Include calibration status if available

#### PDF-03: Limitations Section
**Status:** Database field exists (`limitations String?`), UI exists (textarea), appears as inline row in PDF
**Work needed:**
1. Upgrade from inline row to a formal, prominent section (Section 1.3 or 1.4)
2. Add structured limitations (access restrictions, caveats, areas not inspected)
3. Render with appropriate visual emphasis (warning box styling)

#### PDF-04: Access Method Section
**Status:** Database field exists (`accessMethod String?`), UI exists (input field), appears as inline row in PDF
**Work needed:**
1. Include in the methodology section (3.3 or 3.4) with more detail
2. Possibly expand the UI input to a richer field (dropdown + freetext)

#### PDF-05: Compliance Assessment Results
**Status:** Fully functional -- database, UI, and PDF rendering all exist
**Work needed:**
1. Verify the existing Section 7 rendering meets requirements
2. Ensure pass/fail/NA is clearly displayed for all three standards (E2, B2, COP)
3. Consider adding an overall compliance summary at the top of the section
4. This is likely **already complete** or needs only minor polish

### Suggested Task Breakdown

1. **Add methodology & equipment UI fields** to the report editor
2. **Create MethodologySection PDF component** (covers PDF-01, PDF-02, PDF-04)
3. **Create or enhance LimitationsSection** in PDF (covers PDF-03)
4. **Verify and polish compliance assessment PDF section** (covers PDF-05)
5. **Update report-template.tsx** to include new sections in document assembly
6. **Update TOC** to reflect actual sections that now render
7. **Test PDF generation** with populated and empty data

### Data That Needs UI Before PDF Can Render It

| Field | Current UI | Needed UI |
|-------|-----------|-----------|
| `methodology` | None | Textarea with description of inspection approach |
| `equipment` | None | Editable list of instruments/tools used |
| `limitations` | Basic textarea | Already adequate (could enhance with structured fields) |
| `accessMethod` | Basic text input | Already adequate (could enhance with dropdown presets) |
| Compliance assessment | Full wizard UI | Already complete |

### Compliance Assessment PDF Detail (PDF-05)

The existing Section 7 in report-template.tsx already renders:

1. **Introduction text** explaining the assessment
2. **Summary statistics** bar (pass/fail/partial/NA/total counts)
3. **E2/AS1 table** (Section 7.1) with all 12 items, each showing ref/item/description/status badge
4. **Metal Roof COP table** (Section 7.2) with all 16 items
5. **B2 Durability table** (Section 7.3) with all 8 items
6. **Non-compliance warning box** (Section 7.4) with summary and red highlight

Each checklist item is rendered with:
- Section reference (e.g., "E2.3.1")
- Item name (e.g., "Precipitation Shedding")
- Description (e.g., "Roof effectively sheds water and snow")
- Status badge: green "PASS", red "FAIL", yellow "PARTIAL", grey "N/A"

**Assessment: PDF-05 is largely already implemented.** Verify it meets requirements and add any missing elements.

## Code Examples

### Existing Section Component Pattern (from cover-page.tsx)

```typescript
// Key structure for a new PDF section component:
import { Page, View, Text } from "../react-pdf-wrapper";
import { styles, colors } from "../styles";
import { Header, Footer } from "../components";

interface MethodologySectionProps {
  reportNumber: string;
  methodology: string | null;
  equipment: string[] | null;
  accessMethod: string | null;
  weatherConditions: string | null;
  inspectionType: string;
}

const methodologyStyles = {
  page: { ...styles.page, paddingTop: 80, paddingBottom: 60 },
  // ... additional styles
};

export function MethodologySection({ ... }: MethodologySectionProps) {
  return (
    <Page size="A4" style={methodologyStyles.page}>
      <Header reportNumber={reportNumber} />
      {/* Section content */}
      <Footer />
    </Page>
  );
}
```

### Existing Compliance Rendering Pattern (from report-template.tsx)

```typescript
// ComplianceTableSection helper renders one checklist as a table:
<ComplianceTableSection
  title="E2/AS1 4th Edition - External Moisture Assessment"
  sectionNumber="7.1"
  checklistKey="e2_as1"
  checklistDef={CHECKLIST_DEFINITIONS.e2_as1}
  results={report.complianceAssessment?.checklistResults?.e2_as1}
/>
```

### Existing InfoRow Component (from components.tsx)

```typescript
// For simple label-value pairs in sections:
<InfoRow label="Access Method" value={report.accessMethod} />
<InfoRow label="Weather" value={report.weatherConditions} />
```

### Existing BulletList Component (from components.tsx)

```typescript
// For equipment lists:
<BulletList items={report.equipment || []} />
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Inline data rows in Property Details page | Dedicated section components with structured content | Better for court admissibility -- dedicated sections show rigour |
| Compliance as optional addon | Structured checklists with pass/fail assessment | Already implemented correctly |

## Open Questions

1. **Methodology content format:** Should `methodology` be a plain text field, or structured JSON with subsections (inspection process, testing procedures, reproducibility statement)? The schema stores it as `Json?`, so either works. Recommendation: Start with plain textarea, upgrade later if needed.

2. **Equipment list presets:** Should there be a preset list of common inspection equipment (moisture meter, infrared camera, drone, ladder, etc.) that inspectors can select from? Or purely freeform? Recommendation: Provide common presets as suggestions but allow freeform entries.

3. **Section numbering:** The current PDF has inconsistent numbering (TOC says "3. Methodology" but body sections jump from property details to Section 5 elements). The new sections need to establish consistent numbering. Recommendation: Follow the ISO 17020 structure from the pdf-report-structure.md spec document.

4. **Inline vs component sections:** Should the new sections be separate component files or inline in report-template.tsx? Recommendation: Create as separate section components (matching the pattern of cover-page, declaration, evidence-certificate) for maintainability, then import into report-template.tsx.

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` -- Verified all field types and model relationships directly
- `src/lib/pdf/report-template.tsx` -- Read entire 2400+ line file for current rendering
- `src/lib/pdf/sections/*.tsx` -- Read all 5 section component files for patterns
- `src/lib/pdf/components.tsx` -- Full component library (481 lines)
- `src/lib/pdf/styles.ts` -- Complete style definitions (520 lines)
- `src/app/api/reports/[id]/pdf/route.ts` -- Full API route for PDF generation
- `src/app/api/reports/[id]/court-compliance/route.ts` -- Court compliance checker
- `src/app/(dashboard)/reports/[id]/edit/page.tsx` -- Report edit page with form fields
- `src/app/(dashboard)/reports/[id]/compliance/compliance-content.tsx` -- Compliance UI
- `src/lib/compliance/engine.ts` -- Compliance evaluation engine
- `src/lib/compliance/determinations.ts` -- MBIE determination database
- `claude_docs/pdf-report-structure.md` -- ISO 17020 report structure spec

### Secondary (MEDIUM confidence)
- `package.json` -- Confirmed @react-pdf/renderer ^4.3.2

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All code read directly, no external dependencies to verify
- Architecture: HIGH -- Full codebase understanding from reading all files
- Database schema: HIGH -- Read complete Prisma schema
- Pitfalls: HIGH -- Identified from actual code patterns and duplications
- Implementation plan: HIGH -- Based on concrete existing patterns

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable internal codebase, no external API dependencies)
