# Phase 8: Search, Filtering & Templates - Research

**Researched:** 2026-02-07
**Domain:** Report list filtering, date range selection, template application workflows
**Confidence:** HIGH

## Summary

This phase extends the existing `ReportSearch` component and report creation flow to support additional filtering dimensions (defect severity, compliance status, inspector assignment, date ranges) and template pre-population during report creation.

**Current state:** The report list already has comprehensive filtering infrastructure with search, status, inspection type, property type, and basic date filtering. The template system has full CRUD APIs and an admin UI, but lacks integration into the report creation wizard.

**Primary recommendation:** Extend existing `ReportSearch.tsx` filter panel with four new filter controls (severity, compliance, inspector, date field selector) and add a template selection step to the `/reports/new` wizard before property details.

## Standard Stack

All necessary libraries are already in place. This phase requires no new dependencies.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui | (local) | UI component primitives | Already used throughout app for Select, Input, Card |
| Prisma Client | 7.3 | Database queries with type safety | Project ORM, schema defines all filterable fields |
| Zod | (current) | Form validation | Used in all API routes and forms |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Next.js App Router | 16 | Server/client architecture | Already structured, API routes handle filtering |
| React Hook Form | (current) | Form state management | Used in report wizard |

### Alternatives Considered
None. All required functionality exists in current stack.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Existing Filter Architecture (HIGH confidence)

The `ReportSearch` component (`src/components/reports/ReportSearch.tsx`) follows a proven pattern:

```
ReportSearch (Client Component)
├── State: filters object with all filter fields
├── useEffect: debounced fetch (300ms)
├── fetchReports: builds URLSearchParams, calls /api/reports
└── Filter UI: collapsible panel with Select/Input controls

GET /api/reports (Server Route)
├── Parse searchParams → build Prisma where clause
├── Apply role-based access control
├── Execute paginated query with includes
└── Return { reports, pagination, filters, sort }
```

**Key insight:** The existing pattern separates concerns cleanly:
- Client: UI state, debouncing, pagination controls
- Server: query building, RBAC, database access

### Recommended Project Structure
```
src/
├── components/reports/
│   ├── ReportSearch.tsx           # EXTEND: add new filter fields
│   └── TemplateSelector.tsx       # NEW: template picker for wizard
├── app/(dashboard)/reports/
│   ├── new/page.tsx               # EXTEND: add template selection step
│   └── page.tsx                   # EXISTING: already uses ReportSearch
├── app/api/
│   ├── reports/route.ts           # EXTEND: add severity/compliance/inspector filters
│   └── templates/route.ts         # EXISTING: already returns templates
```

### Pattern 1: Multi-Field Filtering (HIGH confidence)
**What:** URL-based filter state that persists across refreshes
**When to use:** When users need to apply combinations of filters
**Example:**
```typescript
// From existing src/components/reports/ReportSearch.tsx
interface SearchFilters {
  search: string;
  status: string;
  inspectionType: string;
  propertyType: string;
  dateFrom: string;          // EXTEND: add dateField selector
  dateTo: string;            // EXTEND: add dateField selector
  // NEW filters:
  severity: string;          // DefectSeverity enum or empty
  complianceStatus: string;  // "pass" | "fail" | "partial" | "na" | ""
  inspectorId: string;       // User ID or empty
  dateField: string;         // "createdAt" | "inspectionDate" | "submittedAt" | "approvedAt"
  sortBy: string;
  sortOrder: "asc" | "desc";
}

// Build query params and fetch
const params = new URLSearchParams();
if (filters.severity) params.set("severity", filters.severity);
if (filters.complianceStatus) params.set("complianceStatus", filters.complianceStatus);
if (filters.inspectorId) params.set("inspectorId", filters.inspectorId);
params.set("dateField", filters.dateField || "inspectionDate"); // default
if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
if (filters.dateTo) params.set("dateTo", filters.dateTo);
```

### Pattern 2: Server-Side Filter Translation (HIGH confidence)
**What:** Convert URL params to Prisma where clauses with proper joins
**When to use:** When filtering requires database relations
**Example:**
```typescript
// From existing src/app/api/reports/route.ts (lines 52-116)
// Pattern to extend:

const where: Prisma.ReportWhereInput = {};

// EXISTING: Basic filters
if (status) where.status = status;

// NEW: Defect severity filter (requires join)
if (severity) {
  where.defects = {
    some: {
      severity: severity as DefectSeverity
    }
  };
}

// NEW: Compliance status filter (requires join to ComplianceAssessment)
if (complianceStatus) {
  where.complianceAssessment = {
    checklistResults: {
      // JSON query - check for status in nested JSON
      path: ["$"], // root level
      // Use string_contains for JSON search
    }
  };
  // NOTE: ComplianceAssessment.checklistResults is complex JSON
  // May need to filter in-memory after fetch if JSON query is complex
}

// NEW: Inspector filter (already supported, just expose in UI)
if (inspectorId && user.role includes admin/reviewer) {
  where.inspectorId = inspectorId;
}

// EXISTING: Date filter (extend to support multiple date fields)
const dateField = url.searchParams.get("dateField") || "inspectionDate";
if (dateFrom || dateTo) {
  const dateFilter: any = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo) dateFilter.lte = new Date(dateTo);

  // Map to correct field
  if (dateField === "createdAt") where.createdAt = dateFilter;
  else if (dateField === "inspectionDate") where.inspectionDate = dateFilter;
  else if (dateField === "submittedAt") where.submittedAt = dateFilter;
  else if (dateField === "approvedAt") where.approvedAt = dateFilter;
}
```

### Pattern 3: Template Application in Wizard (MEDIUM confidence)
**What:** Pre-populate report fields from template before user enters data
**When to use:** At the start of report creation, before property details
**Example:**
```typescript
// NEW: Add template selection as Step 0 in /reports/new/page.tsx
// Current wizard: 1. Property → 2. Inspection → 3. Client → Create

// Proposed wizard: 0. Template (optional) → 1. Property → 2. Inspection → 3. Client → Create

// Step 0: Template Selection (optional, can skip)
const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
const [templates, setTemplates] = useState<Template[]>([]);

useEffect(() => {
  // Fetch active templates
  fetch("/api/templates?includeInactive=false")
    .then(res => res.json())
    .then(setTemplates);
}, []);

// When template selected, pre-fill inspectionType
if (selectedTemplate) {
  const template = templates.find(t => t.id === selectedTemplate);
  if (template) {
    updateField("inspectionType", template.inspectionType);
  }
}

// On final submit, apply template if selected
const handleSubmit = async () => {
  // 1. Create report with basic fields
  const reportResponse = await fetch("/api/reports", { method: "POST", body: reportData });
  const report = await reportResponse.json();

  // 2. If template selected, apply it
  if (selectedTemplate) {
    await fetch(`/api/templates/${selectedTemplate}/apply`, {
      method: "POST",
      body: JSON.stringify({ reportId: report.id })
    });
  }

  // 3. Navigate to report editor
  router.push(`/reports/${report.id}`);
};
```

### Anti-Patterns to Avoid
- **Client-side filtering of large datasets:** Always filter on server with Prisma queries
- **Complex JSON queries in Prisma:** For `complianceAssessment.checklistResults`, consider post-fetch filtering if JSON query is too complex
- **Blocking template selection:** Template must be optional, users should be able to skip

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date range picker | Custom date inputs | Native `<input type="date">` (already used) | Already used in existing date filter, accessible, mobile-friendly |
| Select dropdowns | Custom dropdown | shadcn/ui `<Select>` or `<NativeSelect>` | Already used throughout app, consistent styling |
| Debounced search | Custom debounce logic | Existing `useEffect` pattern with `setTimeout` | Already implemented in `ReportSearch.tsx` line 191 |
| URL state management | Custom query param handling | `URLSearchParams` (already used) | Already used in both client and server code |
| Filter state persistence | localStorage | URL search params | Already implemented, allows sharing filtered views |
| Inspector user list | Custom user API | Extend `/api/users` or fetch inline | User data already available via Clerk |

**Key insight:** The existing `ReportSearch` component already solves most filtering patterns. Extend it, don't rebuild it.

## Common Pitfalls

### Pitfall 1: Complexity of Compliance Status Filtering
**What goes wrong:** `ComplianceAssessment.checklistResults` is a complex nested JSON structure, not a simple enum.
**Why it happens:** The compliance assessment stores results as `{ [checklistKey]: { [itemId]: "pass" | "fail" | "partial" | "na" } }`
**How to avoid:**
1. First attempt: Try Prisma JSON filtering if simple (e.g., `{ path: ..., equals: ... }`)
2. If too complex: Fetch reports, then filter in-memory by checking if any checklist item matches the desired status
3. Document that compliance filter may be slower than others
4. Consider adding a computed field `overallComplianceStatus` to Report model in future if performance becomes issue

**Warning signs:**
- Slow query times when compliance filter is active
- Complex JSON path queries in Prisma that are hard to read

**Code example (in-memory fallback):**
```typescript
// If Prisma JSON query is too complex, filter after fetch
let reports = await prisma.report.findMany({
  where: baseWhere,
  include: { complianceAssessment: true }
});

// Post-fetch filter
if (complianceStatus) {
  reports = reports.filter(report => {
    if (!report.complianceAssessment?.checklistResults) return false;
    const results = report.complianceAssessment.checklistResults as any;

    // Check if any checklist item has the desired status
    for (const checklist of Object.values(results)) {
      for (const status of Object.values(checklist as any)) {
        if (status === complianceStatus) return true;
      }
    }
    return false;
  });
}
```

### Pitfall 2: Defect Severity Filter Performance
**What goes wrong:** Filtering by defect severity requires a join to the Defects table, which can be slow on large datasets.
**Why it happens:** Reports can have 0 to 50+ defects, and we need to check if ANY defect matches the severity.
**How to avoid:**
1. Use Prisma's `some` relation filter: `where.defects = { some: { severity: "HIGH" } }`
2. Add index on `Defect.severity` if not already present (check schema line 357)
3. Ensure pagination is applied AFTER filter (already done in existing code)
4. Consider adding `_count.defects` to report list response for UI feedback

**Warning signs:**
- Query times > 1 second when severity filter active
- Database query analyzer shows sequential scan on defects table

### Pitfall 3: Inspector Filter RBAC
**What goes wrong:** Regular inspectors try to filter by other inspectors, seeing reports they shouldn't.
**Why it happens:** Forgetting to apply role-based filtering when adding inspector filter.
**How to avoid:**
1. Only show inspector filter to ADMIN/SUPER_ADMIN/REVIEWER roles
2. Keep existing RBAC logic at lines 55-64 of `/api/reports/route.ts`
3. Validate `inspectorId` param server-side: reject if user is not admin and tries to filter by another inspector
4. Test with inspector-role account to ensure they only see their own reports

**Warning signs:**
- Inspectors can see other inspectors' reports
- Inspector filter appears in UI for non-admin users

### Pitfall 4: Date Field Selector UX
**What goes wrong:** Users confused about which date the date range is filtering (created? inspected? submitted?).
**Why it happens:** Reports have 4+ date fields, UI doesn't clarify which is active.
**How to avoid:**
1. Add a `dateField` selector ABOVE the date range inputs
2. Default to `inspectionDate` (most intuitive for users)
3. Label clearly: "Filter by: [Inspection Date ▼]" with dropdown
4. Show field label next to date inputs: "Inspection Date: From [...] To [...]"

**Code example:**
```typescript
<div className="space-y-2">
  <label className="text-sm font-medium">Date Range</label>
  <Select value={filters.dateField} onValueChange={(v) => updateFilter("dateField", v)}>
    <SelectTrigger>
      <SelectValue placeholder="Filter by date..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="inspectionDate">Inspection Date</SelectItem>
      <SelectItem value="createdAt">Created Date</SelectItem>
      <SelectItem value="submittedAt">Submitted Date</SelectItem>
      <SelectItem value="approvedAt">Approved Date</SelectItem>
    </SelectContent>
  </Select>
  <div className="flex gap-2">
    <Input type="date" value={filters.dateFrom} onChange={...} placeholder="From" />
    <Input type="date" value={filters.dateTo} onChange={...} placeholder="To" />
  </div>
</div>
```

## Code Examples

Verified patterns from the existing codebase:

### Existing Filter Implementation
```typescript
// Source: src/components/reports/ReportSearch.tsx, lines 119-188
interface SearchFilters {
  search: string;
  status: string;
  inspectionType: string;
  propertyType: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

const fetchReports = useCallback(async (page: number = 1) => {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", "20");

  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  // ... more filters

  const response = await fetch(`/api/reports?${params.toString()}`);
  const data = await response.json();
  setReports(data.reports);
  setPagination(data.pagination);
}, [filters]);

// Debounced fetch on filter change
useEffect(() => {
  const debounceTimer = setTimeout(() => {
    startTransition(() => {
      fetchReports(1);
    });
  }, 300);
  return () => clearTimeout(debounceTimer);
}, [fetchReports]);
```

### Existing Server-Side Filtering
```typescript
// Source: src/app/api/reports/route.ts, lines 38-116
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  const where: Prisma.ReportWhereInput = {};

  // Role-based access control
  if (["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(user.role)) {
    const inspectorId = url.searchParams.get("inspectorId");
    if (inspectorId) where.inspectorId = inspectorId;
  } else {
    where.inspectorId = user.id;
  }

  // Date range filter
  if (dateFrom || dateTo) {
    where.inspectionDate = {};
    if (dateFrom) where.inspectionDate.gte = new Date(dateFrom);
    if (dateTo) where.inspectionDate.lte = new Date(dateTo);
  }

  const [reports, totalCount] = await Promise.all([
    prisma.report.findMany({ where, orderBy, skip, take, include }),
    prisma.report.count({ where })
  ]);

  return NextResponse.json({ reports, pagination });
}
```

### Template Application Flow
```typescript
// Source: src/app/api/templates/[id]/apply/route.ts, lines 26-143
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: templateId } = await params;
  const body = await request.json();
  const { reportId } = body;

  // Verify template exists and is active
  const template = await prisma.reportTemplate.findUnique({
    where: { id: templateId }
  });

  if (!template || !template.isActive) {
    return NextResponse.json({ error: "Template not found or inactive" }, { status: 404 });
  }

  // Verify report is editable
  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      inspectorId: user.id,
      status: { in: ["DRAFT", "IN_PROGRESS"] }
    }
  });

  // Parse template sections and apply default values
  const sections = template.sections as unknown as TemplateSection[];
  const updatedReport = await prisma.report.update({
    where: { id: reportId },
    data: {
      inspectionType: template.inspectionType,
      scopeOfWorks: buildSectionContent(sections.find(s => s.id === "scope")),
      methodology: buildSectionContent(sections.find(s => s.id === "methodology")),
      equipment: extractDefaultList(sections.find(s => s.id === "equipment"))
    }
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      reportId,
      userId: user.id,
      action: "UPDATED",
      details: { action: "template_applied", templateId, templateName: template.name }
    }
  });

  return NextResponse.json({ success: true, report: updatedReport });
}
```

### Compliance Status Data Structure
```typescript
// Source: compliance-content.tsx, lines 52-62
type ComplianceStatus = "pass" | "fail" | "partial" | "na" | "";

interface ChecklistResults {
  [checklistKey: string]: {      // e.g., "e2_weathertightness"
    [itemId: string]: string;     // e.g., "item_001": "pass"
  };
}

// Example stored data in ComplianceAssessment.checklistResults:
{
  "e2_weathertightness": {
    "item_001": "pass",
    "item_002": "fail",
    "item_003": "na"
  },
  "b2_durability": {
    "item_001": "pass",
    "item_002": "partial"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side list filtering | Server-side Prisma queries with pagination | v1.0 baseline | Essential for performance with 100+ reports |
| Single date filter | Multi-field date filtering needed | This phase | Allows filtering by any date field |
| Template creation only | Template application during report creation | This phase | Speeds up report creation workflow |
| Basic search (address/client) | Multi-dimensional filtering | Phase 8 | Precision finding of reports by any attribute |

**Deprecated/outdated:**
- None identified. The existing filter architecture is current and well-designed.

## Open Questions

Things that couldn't be fully resolved:

1. **Compliance Status Filter Complexity**
   - What we know: `checklistResults` is nested JSON, Prisma JSON queries are limited
   - What's unclear: Whether Prisma can efficiently query nested JSON for "any item = status"
   - Recommendation: Start with in-memory filtering after fetch, optimize with Prisma JSON query if possible later

2. **Inspector List Source**
   - What we know: Reports reference `User` via `inspectorId`, users have names and roles
   - What's unclear: Whether to fetch full user list or populate dropdown from existing report data
   - Recommendation: Add `GET /api/users?role=INSPECTOR` endpoint for admin users, return `{ id, name }` pairs

3. **Default Date Field**
   - What we know: Reports have `inspectionDate`, `createdAt`, `submittedAt`, `approvedAt`
   - What's unclear: Which date field is most intuitive default for users
   - Recommendation: Default to `inspectionDate` (matches current behavior), but add selector to switch

4. **Template Selection Persistence**
   - What we know: Template applies pre-filled data to report on creation
   - What's unclear: Should template choice persist for the user (auto-select last used template)?
   - Recommendation: No persistence initially, keep it simple. Track in user preferences later if requested.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/components/reports/ReportSearch.tsx` (lines 1-804)
- Existing codebase: `src/app/api/reports/route.ts` (lines 1-269)
- Existing codebase: `src/app/api/templates/[id]/apply/route.ts` (lines 1-182)
- Prisma schema: `prisma/schema.prisma` (Report model lines 110-207, Defect model lines 315-358, ComplianceAssessment lines 675-691)
- shadcn/ui components: `src/components/ui/select.tsx` (already in use)

### Secondary (MEDIUM confidence)
- Compliance UI patterns: `src/app/(dashboard)/reports/[id]/compliance/compliance-content.tsx` (status enum and display logic)
- Report wizard structure: `src/app/(dashboard)/reports/new/page.tsx` (3-step wizard pattern)
- Template admin UI: `src/app/(admin)/admin/templates/page.tsx` (template listing and management)

### Tertiary (LOW confidence)
- None. All research based on existing codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all dependencies already in place
- Architecture: HIGH - existing patterns are proven and well-tested
- Pitfalls: HIGH - based on actual schema complexity and existing filter code
- Template flow: MEDIUM - API exists but not yet integrated into wizard

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stable domain)

## Implementation Notes

**Filterable fields summary:**

From Prisma schema analysis:

1. **Defect Severity** (SRCH-01)
   - Location: `Defect.severity` (enum: CRITICAL, HIGH, MEDIUM, LOW)
   - Filter type: Relation filter via `where.defects = { some: { severity } }`
   - Data already structured, ready to filter

2. **Compliance Status** (SRCH-02)
   - Location: `ComplianceAssessment.checklistResults` (JSON)
   - Filter type: Complex JSON query or post-fetch filter
   - Status values: "pass", "fail", "partial", "na"
   - Challenge: Nested structure may require in-memory filtering

3. **Inspector Assignment** (SRCH-03)
   - Location: `Report.inspectorId` → `User.id` relation
   - Filter type: Direct where clause `where.inspectorId = userId`
   - RBAC: Only admins/reviewers can filter by other inspectors
   - Existing support: Line 57-60 in `/api/reports/route.ts` already supports `inspectorId` param

4. **Date Ranges** (SRCH-04)
   - Available fields:
     - `Report.createdAt` (when report record created)
     - `Report.inspectionDate` (when inspection performed)
     - `Report.submittedAt` (when submitted for review)
     - `Report.approvedAt` (when approved)
   - Filter type: Date range with field selector
   - Existing pattern: Lines 107-116 in `/api/reports/route.ts` already filter by `inspectionDate`

5. **Template Application** (TMPL-01)
   - Location: `ReportTemplate` model with full CRUD
   - Apply endpoint: `/api/templates/[id]/apply` (POST with reportId)
   - Integration point: Add step 0 to report creation wizard
   - Pre-fills: `inspectionType`, `scopeOfWorks`, `methodology`, `equipment`

**UI Component Inventory:**
- ✅ `<Select>` and `<NativeSelect>` - used throughout app
- ✅ `<Input type="date">` - already used in existing date filter (line 517-528)
- ✅ `<Card>` with collapsible content - filter panel pattern (lines 453-543)
- ✅ Badge for status display - severity, compliance status
- ✅ Pagination controls - already implemented (lines 752-800)
- ⚠️ Multi-select for inspectors - may need if allowing multiple inspector filter (use shadcn/ui multi-select)

**No blockers identified.** All required infrastructure exists.
