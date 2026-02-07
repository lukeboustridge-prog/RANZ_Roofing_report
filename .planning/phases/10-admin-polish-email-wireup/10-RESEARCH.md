# Phase 10: Admin Polish & Email Template Wire-Up - Research

**Researched:** 2026-02-08
**Domain:** Integration wiring (email templates, admin navigation, filtering)
**Confidence:** HIGH

## Summary

Phase 10 closes three integration gaps identified in the v1.1 audit. All necessary infrastructure exists — the email template service, admin pages, and filter components are already implemented and working. This phase requires surgical wiring changes to connect existing systems, not building new features.

**Gap 1 (Email template wiring):** The `emailTemplateService.renderTemplate()` method exists and works perfectly, with fallback to hardcoded defaults. The 8 email functions in `src/lib/email.ts` currently use inline HTML templates. We need to refactor each function to call `renderTemplate()` first, then fall back to the existing hardcoded template if the service fails. This is a pure integration task with zero new functionality.

**Gap 2 (Admin dashboard navigation):** The admin dashboard has 6 quick action cards in a responsive grid. We need to add 3 more cards following the exact same pattern: Email Templates, API Docs, and All Reports. The structure, styling, and icon pattern are already established.

**Gap 3 (Admin reports filtering):** The `ReportSearch.tsx` component implements comprehensive filters (status, type, severity, compliance, inspector, date ranges). The admin reports page uses a simplified display component. We need to either reuse `ReportSearch` directly or extract its filter controls into the admin page.

**Primary recommendation:** Wire existing components together following established patterns. No new architectural decisions needed — all patterns exist in the codebase.

## Standard Stack

All infrastructure already exists. No new libraries required.

### Core
| Library | Version | Purpose | Already Integrated |
|---------|---------|---------|-------------------|
| Prisma | 7.3 | Database access for email templates | ✓ Fully integrated |
| @react-pdf/renderer | Latest | PDF generation (not needed this phase) | ✓ Existing |
| Resend | Latest | Email sending via `src/lib/email.ts` | ✓ Working |
| Next.js | 16 | App Router, Server Components | ✓ Framework |

### Supporting
No additional libraries needed. All functionality uses existing dependencies.

## Architecture Patterns

### Email Template Integration Pattern

The email template service follows a **fallback-first** pattern to ensure reliability:

1. **Try database template first** via `emailTemplateService.renderTemplate(type, variables)`
2. **Fall back to hardcoded default** if DB lookup fails
3. **Wrap rendered content** in RANZ branded HTML wrapper
4. **Return** `{ subject, html, text }` object

**Current email.ts functions** directly construct HTML and call `sendEmail()`:
```typescript
// Current pattern (hardcoded)
export async function sendReportSubmittedNotification(reviewerEmail: string, report: ReportInfo) {
  const content = `<h2>...</h2>...`; // 30+ lines of inline HTML
  return sendEmail({
    to: reviewerEmail,
    subject: `[Review Required] Report ${report.reportNumber}...`,
    text: `Report ${report.reportNumber}...`,
    html: wrapInTemplate(content, "Report Submitted for Review"),
  });
}
```

**Target pattern** (template service with fallback):
```typescript
// Target pattern (service-first, fallback to hardcoded)
export async function sendReportSubmittedNotification(reviewerEmail: string, report: ReportInfo) {
  // 1. Try template service
  let rendered;
  try {
    rendered = await emailTemplateService.renderTemplate("REPORT_SUBMITTED", {
      reportNumber: report.reportNumber,
      propertyAddress: report.propertyAddress,
      inspectorName: report.inspectorName,
      reportUrl: report.reportUrl,
    });
  } catch (error) {
    console.warn("[Email] Template service failed, using hardcoded fallback:", error);
    // 2. Fall back to hardcoded template (keep existing code)
    const content = `<h2>...</h2>...`; // Original hardcoded template
    rendered = {
      subject: `[Review Required] Report ${report.reportNumber}...`,
      text: `Report ${report.reportNumber}...`,
      html: wrapInTemplate(content, "Report Submitted for Review"),
    };
  }

  // 3. Send email with rendered template
  return sendEmail({
    to: reviewerEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html, // Already wrapped by renderTemplate()
  });
}
```

**Key insight:** The `renderTemplate()` method already wraps content in the template (line 75-77 in email-template-service.ts), so we don't need to call `wrapInTemplate()` on the result from the service. Only the fallback needs wrapping.

### Email Function → Template Type Mapping

The email template service defines 8 template types that map 1:1 to the email functions:

| Email Function | Template Type | Variables Required |
|----------------|---------------|-------------------|
| `sendReportSubmittedNotification()` | `REPORT_SUBMITTED` | reportNumber, propertyAddress, inspectorName, reportUrl |
| `sendReportApprovedNotification()` | `REPORT_APPROVED` | reportNumber, propertyAddress, reviewerName, reportUrl |
| `sendRevisionRequiredNotification()` | `REVISION_REQUIRED` | reportNumber, propertyAddress, reviewerName, reportUrl, criticalCount, issueCount, noteCount, suggestionCount, totalComments |
| `sendReportRejectedNotification()` | `REPORT_REJECTED` | reportNumber, propertyAddress, reviewerName, reason, reportUrl |
| `sendReportFinalizedNotification()` | `REPORT_FINALIZED` | reportNumber, propertyAddress, inspectorName, inspectorEmail, reportUrl |
| `sendAssignmentConfirmationEmail()` | `ASSIGNMENT_CONFIRMATION` | clientName, propertyAddress, requestType, urgency, scheduledDate, inspectorName |
| `sendInspectorAssignmentEmail()` | `INSPECTOR_ASSIGNMENT` | inspectorName, clientName, clientEmail, propertyAddress, requestType, urgency, scheduledDate, notes, assignmentUrl |
| `sendNewCommentsNotification()` | `NEW_COMMENTS` | reportNumber, propertyAddress, reviewerName, commentCount, reportUrl |

**Variable transformation notes:**
- `requestType` values have underscores (e.g., `FULL_INSPECTION`) — transform with `.replace(/_/g, " ")` before passing to template
- Optional fields (e.g., `scheduledDate`, `notes`) — pass empty string if undefined
- Numeric fields (counts) — convert to strings before passing to template service

### Admin Dashboard Card Pattern

The admin dashboard uses a consistent card structure in a responsive grid:

```typescript
// Grid container (already exists at line 179)
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

// Card pattern (6 existing examples)
<Card className="hover:shadow-md transition-shadow">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <IconComponent className="h-5 w-5 text-[color]" />
      Title Text
    </CardTitle>
    <CardDescription>
      Brief description of the page
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Button asChild variant="outline" className="w-full">
      <Link href="/admin/[route]">
        Action Label
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  </CardContent>
</Card>
```

**Three cards to add:**
1. **Email Templates** — Link to `/admin/email-templates`, icon: `Mail` (lucide-react), color: `text-indigo-500`
2. **API Docs** — Link to `/admin/api-docs`, icon: `Code` (lucide-react), color: `text-teal-500`
3. **All Reports** — Link to `/admin/reports`, icon: `FileText` (already imported), color: `text-slate-500`

**Placement:** Insert after the existing 6 cards, before the "Recent activity" section (line 301).

### Admin Reports Filtering Pattern

Two approaches identified:

**Approach A: Reuse ReportSearch component directly** (Recommended)
```typescript
// src/app/(admin)/admin/reports/page.tsx
import { ReportSearch } from "@/components/reports/ReportSearch";

export default async function AdminReportsPage() {
  // Remove server-side data fetching
  // ReportSearch component handles all fetching, filtering, pagination

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Reports</h1>
        <p className="text-muted-foreground">
          View and manage all inspection reports
        </p>
      </div>

      <ReportSearch />
    </div>
  );
}
```

**Approach B: Extract filter controls into AdminReportsContent** (More work)
- Copy filter UI from ReportSearch (lines 436-685)
- Add state management for filter values
- Pass filters to server-side data fetching
- Requires pagination state management
- More complex, duplicates code

**Recommendation:** Use Approach A. The `ReportSearch` component is already a complete, tested solution with all required filters. The admin reports page can simply render this component. The existing admin-reports-content.tsx can be removed or archived.

**Filter capabilities already in ReportSearch:**
- Text search (report number, address, client)
- Status filter (all 8 report statuses)
- Inspection type filter (8 types)
- Property type filter (6 types)
- Defect severity filter (CRITICAL, HIGH, MEDIUM, LOW)
- Compliance status filter (pass, fail, partial, n/a)
- Inspector filter (dropdown of all inspectors)
- Date range filter (with field selector: inspection/created/submitted/approved)
- Sort by multiple fields with asc/desc toggle
- Pagination (20 results per page)
- Batch actions (select, export, archive, delete)

**The GET /api/reports endpoint already supports all these filters** (verified in route.ts lines 38-145).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email template rendering | Custom template engine | `emailTemplateService.renderTemplate()` | Already implements variable substitution, DB lookup, fallback pattern, wrapping |
| Filter UI for reports | New filter component | `ReportSearch` component | 300+ lines of tested filter logic, pagination, batch actions already working |
| Admin card layout | Custom grid system | Existing card pattern (6 examples) | Consistent styling, responsive breakpoints, hover states already defined |

## Common Pitfalls

### Pitfall 1: Double-Wrapping Email Templates
**What goes wrong:** Calling `wrapInTemplate()` on the result from `renderTemplate()` creates nested RANZ headers/footers
**Why it happens:** The service already wraps content (line 75-77 in email-template-service.ts), but it's not obvious from the method signature
**How to avoid:** Only wrap the fallback template, not the service result
**Warning signs:** Email preview shows two headers, doubled footer text

### Pitfall 2: Missing Variable Transformations
**What goes wrong:** Template variables like `{{requestType}}` show `FULL_INSPECTION` instead of `Full Inspection`
**Why it happens:** Enum values use underscores, templates expect human-readable text
**How to avoid:** Transform enums with `.replace(/_/g, " ")` before passing to renderTemplate()
**Warning signs:** Template preview shows underscores or uppercase enum values

### Pitfall 3: Undefined Optional Variables
**What goes wrong:** Templates show `{{scheduledDate}}` or `undefined` in rendered output
**Why it happens:** Optional fields passed as `undefined` instead of empty string
**How to avoid:** Use `scheduledDate: details.scheduledDate || ""` when building variables object
**Warning signs:** Template preview shows literal `{{varName}}` or the word `undefined`

### Pitfall 4: Forgetting to Import Icons
**What goes wrong:** Dashboard cards fail to render due to missing icon components
**Why it happens:** Adding new cards requires importing new icons from lucide-react
**How to avoid:** Check lucide-react imports at top of file, add `Mail` and `Code` icons
**Warning signs:** TypeScript error "Cannot find name 'Mail'", runtime error in dashboard

### Pitfall 5: Breaking Server Component Patterns
**What goes wrong:** Adding `ReportSearch` (client component) directly to page.tsx causes hydration errors
**Why it happens:** Admin reports page.tsx is a Server Component, ReportSearch is `"use client"`
**How to avoid:** ReportSearch is already client component, can be imported into Server Component — this is correct Next.js 16 pattern
**Warning signs:** Hydration mismatch errors, "use client" warnings

### Pitfall 6: Removing Needed Functionality
**What goes wrong:** Removing admin-reports-content.tsx breaks batch PDF generation feature
**Why it happens:** ReportSearch doesn't have bulk PDF generation, only bulk export
**How to avoid:** Check if admin-reports-content.tsx has unique features (it does — batch PDF generation at line 115-158)
**Warning signs:** Missing "Generate PDFs" button in admin reports page

**Correction to Approach A:** Keep batch PDF generation feature from admin-reports-content.tsx. Either:
1. Add batch PDF generation to ReportSearch component, or
2. Render both ReportSearch (for filters) and a separate bulk PDF action panel

## Code Examples

### Email Template Integration (Gap 1)

**Pattern for all 8 email functions:**

```typescript
// Source: email-template-service.ts renderTemplate() method (line 62-106)
// Source: email.ts existing functions (lines 120-485)

export async function sendReportSubmittedNotification(
  reviewerEmail: string,
  report: ReportInfo
): Promise<SendResult> {
  // Build variables object from report data
  const variables = {
    reportNumber: report.reportNumber,
    propertyAddress: report.propertyAddress,
    inspectorName: report.inspectorName,
    reportUrl: report.reportUrl,
  };

  // Try template service first
  let rendered;
  try {
    rendered = await emailTemplateService.renderTemplate("REPORT_SUBMITTED", variables);
  } catch (error) {
    console.warn(
      "[Email] Template service failed for REPORT_SUBMITTED, using hardcoded fallback:",
      error instanceof Error ? error.message : error
    );

    // Fall back to original hardcoded template
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

  // Send email with rendered template
  return sendEmail({
    to: reviewerEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}
```

**Special case: REVISION_REQUIRED (comment counts)**

```typescript
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

  // Build variables object
  const variables = {
    reportNumber: report.reportNumber,
    propertyAddress: report.propertyAddress,
    reviewerName: reviewerName,
    reportUrl: report.reportUrl,
    criticalCount: commentsSummary.critical.toString(),
    issueCount: commentsSummary.issue.toString(),
    noteCount: commentsSummary.note.toString(),
    suggestionCount: commentsSummary.suggestion.toString(),
    totalComments: totalComments.toString(),
  };

  // Try template service first
  let rendered;
  try {
    rendered = await emailTemplateService.renderTemplate("REVISION_REQUIRED", variables);
  } catch (error) {
    console.warn("[Email] Template service failed for REVISION_REQUIRED, using hardcoded fallback:", error);

    // Fall back to original hardcoded template (lines 191-244 in email.ts)
    // [Keep existing hardcoded template code]
  }

  return sendEmail({
    to: report.inspectorEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}
```

**Special case: ASSIGNMENT_CONFIRMATION (enum transformation)**

```typescript
export async function sendAssignmentConfirmationEmail(
  clientEmail: string,
  details: AssignmentDetails
): Promise<SendResult> {
  // Transform enum to human-readable format
  const requestTypeFormatted = details.requestType.replace(/_/g, " ");

  const variables = {
    clientName: details.clientName,
    propertyAddress: details.propertyAddress,
    requestType: requestTypeFormatted, // Transform here
    urgency: details.urgency,
    scheduledDate: details.scheduledDate || "", // Handle optional field
    inspectorName: details.inspectorName,
  };

  // Try template service first
  let rendered;
  try {
    rendered = await emailTemplateService.renderTemplate("ASSIGNMENT_CONFIRMATION", variables);
  } catch (error) {
    console.warn("[Email] Template service failed for ASSIGNMENT_CONFIRMATION, using hardcoded fallback:", error);

    // Fall back to original hardcoded template (lines 417-448)
    // [Keep existing hardcoded template code]
  }

  return sendEmail({
    to: clientEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}
```

### Admin Dashboard Navigation (Gap 2)

```typescript
// Source: src/app/(admin)/admin/page.tsx lines 179-299

// Add to imports at top
import {
  // ... existing imports ...
  Mail,
  Code,
} from "lucide-react";

// Insert after line 298 (after Audit Logs card), before line 300 (Recent activity section)

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-500" />
              Email Templates
            </CardTitle>
            <CardDescription>
              Customize email notification templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/email-templates">
                Manage Templates
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-teal-500" />
              API Documentation
            </CardTitle>
            <CardDescription>
              View API endpoints and integration docs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/api-docs">
                View Docs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              All Reports
            </CardTitle>
            <CardDescription>
              Search and filter all inspection reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/reports">
                Browse Reports
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
```

### Admin Reports Filtering (Gap 3)

**Option 1: Use ReportSearch directly (Recommended)**

```typescript
// Source: src/app/(admin)/admin/reports/page.tsx
// Replace entire file with:

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { ReportSearch } from "@/components/reports/ReportSearch";

async function checkAdminAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || !["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return false;
  }

  return true;
}

export default async function AdminReportsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const hasAccess = await checkAdminAccess(userId);

  if (!hasAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Reports</h1>
        <p className="text-muted-foreground">
          Search, filter, and manage all inspection reports
        </p>
      </div>

      {/* ReportSearch component handles all filtering, pagination, and display */}
      <ReportSearch />
    </div>
  );
}
```

**Note:** This removes the batch PDF generation feature from admin-reports-content.tsx. If batch PDF is required, consider:
1. Adding batch PDF action to ReportSearch component's batch actions dropdown, or
2. Keep a simplified version of admin-reports-content.tsx that works alongside ReportSearch

**Option 2: Keep batch PDF generation**

If bulk PDF generation is a requirement, create a hybrid approach:

```typescript
// page.tsx provides context
export default async function AdminReportsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const hasAccess = await checkAdminAccess(userId);
  if (!hasAccess) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Reports</h1>
        <p className="text-muted-foreground">
          Search, filter, and manage all inspection reports
        </p>
      </div>

      {/* Full filtering and search */}
      <ReportSearch />

      {/* Or keep AdminReportsContent if batch PDF is critical */}
      {/* But note: this duplicates filtering UI */}
    </div>
  );
}
```

**Decision needed:** Confirm if batch PDF generation is required on admin reports page, or if ReportSearch's export functionality is sufficient.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded email templates | DB-driven templates with fallback | Phase 9 (v1.1) | Admins can customize emails without code changes |
| No admin reports filtering | Basic status badges only | v1.0 | Can't search or filter reports |
| Manual template variable substitution | Service-based rendering | Phase 9 | Type-safe variables, preview capability |

**Current state:** All infrastructure exists but is not wired together. This is a pure integration phase, not a feature-building phase.

## Open Questions

1. **Batch PDF generation requirement**
   - What we know: admin-reports-content.tsx has batch PDF feature (lines 115-158)
   - What's unclear: Is this feature critical, or can we use ReportSearch's export instead?
   - Recommendation: If batch PDF is required, add it to ReportSearch component's batch actions. If not critical, simplify to just use ReportSearch.

2. **Email template testing approach**
   - What we know: Template service has preview method (line 416-445 in email-template-service.ts)
   - What's unclear: Should we add test email capability to admin email templates page?
   - Recommendation: Use existing preview, add "Send Test Email" button in future phase if needed

3. **Icon selection for new dashboard cards**
   - What we know: Need `Mail` and `Code` from lucide-react, `FileText` already imported
   - What's unclear: Color choices (suggested indigo, teal, slate)
   - Recommendation: Use suggested colors for consistency with existing cards, adjust in review if needed

## Sources

### Primary (HIGH confidence)
- `src/lib/email.ts` (lines 1-486) — All 8 email functions, signatures, current templates
- `src/services/email-template-service.ts` (lines 1-465) — renderTemplate() interface, template type mapping, variable substitution logic
- `src/app/(admin)/admin/page.tsx` (lines 1-395) — Quick action card pattern, existing 6 cards, grid layout
- `src/app/(admin)/admin/reports/page.tsx` (lines 1-91) — Server Component pattern, data fetching
- `src/app/(admin)/admin/reports/admin-reports-content.tsx` (lines 1-356) — Batch PDF generation, current admin reports UI
- `src/components/reports/ReportSearch.tsx` (lines 1-946) — Complete filter implementation with 10+ filter types
- `src/app/api/reports/route.ts` (lines 1-200) — GET endpoint filter support verification

### Secondary (MEDIUM confidence)
None needed — all research based on direct codebase inspection.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Email template integration: HIGH - Service exists, patterns clear, 8 functions identified
- Admin dashboard navigation: HIGH - Card pattern established, exact insertion point identified
- Admin reports filtering: HIGH - ReportSearch component complete, API endpoint verified

**Research date:** 2026-02-08
**Valid until:** 30 days (stable integration patterns, no fast-moving dependencies)

**Change scope summary:**
- 8 email functions to refactor (email.ts)
- 3 dashboard cards to add (admin/page.tsx)
- 1 page component to simplify (admin/reports/page.tsx)
- 0 new components to build
- 0 new API routes to create
- 0 new database changes

**Estimated task count:** 12-15 tasks total
- Gap 1 (Email wiring): 8 tasks (one per function)
- Gap 2 (Dashboard nav): 2 tasks (add icons import, add 3 cards)
- Gap 3 (Reports filtering): 2-3 tasks (simplify page.tsx, handle batch PDF decision)
