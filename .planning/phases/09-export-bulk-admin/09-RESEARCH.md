# Phase 9: Export, Bulk & Admin - Research

**Researched:** 2026-02-07
**Domain:** Evidence packaging, batch operations, notification lifecycle management, API documentation
**Confidence:** HIGH

## Summary

Phase 9 focuses on production-ready administrative tools spanning four distinct technical domains:

1. **Evidence Package Export (PDF-06)**: Building on the existing LBP evidence package service, extend ZIP export to general report use. The codebase already has `lbp-evidence-package-service.ts` with comprehensive ZIP generation using JSZip, including original photos, PDFs, chain of custody documents, and manifests. This pattern can be generalized for non-LBP reports.

2. **Bulk PDF Generation (PDF-07)**: Add batch PDF generation for multiple reports. The existing PDF generation uses @react-pdf/renderer with dynamic imports to prevent build issues. A new batch endpoint can leverage Prisma's bulk operations and parallel PDF generation with appropriate rate limiting and progress tracking.

3. **Notification Archiving (NOTIF-04)**: Implement automatic archiving for old notifications using database queries with date thresholds. The Notification model already has createdAt, read, and dismissed fields. A scheduled cleanup job (using pg_cron or external scheduler) can move old notifications to an archive state.

4. **Email Template Management (NOTIF-05)**: Create admin UI for viewing and customizing email templates. Currently, email templates are hardcoded in `lib/email.ts` as functions. Migration to database-stored templates with variable substitution enables admin customization without code changes.

5. **API Documentation (API-01)**: Generate OpenAPI/Swagger specification from Next.js API routes. Multiple tools exist for this: next-openapi-gen (modern, supports Zod), next-swagger-doc (JSDoc-based), or manual OpenAPI spec with Swagger UI.

**Primary recommendation:** Leverage existing patterns (JSZip for exports, @react-pdf/renderer for PDFs, Prisma batch operations) while adding new infrastructure for notification archiving and template management.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jszip | ^3.10.1 | ZIP file generation | Already in package.json, proven in LBP evidence service |
| @react-pdf/renderer | ^4.3.2 | PDF generation | Current PDF solution, React-based templates |
| next-swagger-doc | latest | API documentation | Most compatible with Next.js 15 App Router |
| pg_cron | via Neon | Scheduled jobs | PostgreSQL-native scheduler for notification archiving |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| archiver | ^7.0.1 | Alternative ZIP library | If JSZip memory issues with large files (not expected) |
| swagger-ui-react | ^5.x | Swagger UI renderer | For API docs endpoint display |
| next-openapi-gen | latest | Modern OpenAPI generator | Alternative if Zod schema extraction needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_cron | Vercel Cron Jobs | pg_cron is PostgreSQL-native, works with Neon; Vercel Cron requires Edge Functions |
| Database templates | React Email + Resend Templates | React Email is for creating templates, not runtime customization; database approach gives admin UI control |
| next-swagger-doc | Manual OpenAPI spec | Manual spec is more work but gives full control; auto-generation is faster |

**Installation:**
```bash
npm install next-swagger-doc swagger-ui-react
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── reports/
│   │   │   │   └── batch-pdf/         # New: Bulk PDF generation
│   │   │   ├── notifications/
│   │   │   │   ├── archive/           # New: Archive old notifications
│   │   │   │   └── templates/         # New: Email template CRUD
│   │   │   └── docs/                  # New: API documentation endpoint
│   │   └── reports/
│   │       └── [id]/
│   │           └── export/            # New: Evidence package export
│   ├── (admin)/admin/
│   │   ├── notifications/
│   │   │   └── templates/             # New: Template management UI
│   │   └── api-docs/                  # New: API docs viewer
├── services/
│   ├── evidence-export-service.ts     # New: Generalized from LBP service
│   ├── bulk-pdf-service.ts            # New: Batch PDF generation logic
│   └── email-template-service.ts      # New: Template rendering with variables
├── lib/
│   ├── cron/
│   │   └── archive-notifications.ts   # New: Scheduled archiving job
│   └── swagger/
│       └── api-spec.ts                # New: OpenAPI specification
```

### Pattern 1: Evidence Package Export (ZIP)
**What:** Generate ZIP files containing report PDF, original photos, chain of custody certificates
**When to use:** User clicks "Export Evidence Package" button on report detail page
**Example:**
```typescript
// Source: Existing lbp-evidence-package-service.ts (generalized)
import JSZip from "jszip";
import { uploadToR2 } from "@/lib/r2";

export class EvidenceExportService {
  async createExportPackage(reportId: string): Promise<{ url: string; hash: string }> {
    const zip = new JSZip();

    // Add report PDF
    const reportPdf = await generateReportPDF(reportId);
    zip.file(`${reportNumber}.pdf`, reportPdf);

    // Add original photos (not thumbnails)
    const photos = await fetchOriginalPhotos(reportId);
    const photosFolder = zip.folder("photos");
    for (const photo of photos) {
      const photoBuffer = await fetch(photo.url).then(r => r.arrayBuffer());
      photosFolder.file(photo.filename, photoBuffer);
    }

    // Add chain of custody certificate
    const custodyCert = generateCustodyCertificate(report);
    zip.file("chain_of_custody.pdf", custodyCert);

    // Add manifest
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 }
    });

    // Calculate hash for integrity
    const hash = crypto.createHash("sha256").update(zipBuffer).digest("hex");

    // Upload to R2
    const url = await uploadToR2(zipBuffer, `exports/${reportNumber}.zip`, "application/zip");

    return { url, hash };
  }
}
```

### Pattern 2: Bulk PDF Generation
**What:** Generate PDFs for multiple reports in parallel with progress tracking
**When to use:** Admin selects multiple reports and clicks "Generate PDFs"
**Example:**
```typescript
// Source: Adapted from existing PDF route + Prisma batch patterns
export async function POST(request: NextRequest) {
  const { reportIds } = await request.json();

  // Fetch all reports in one query
  const reports = await prisma.report.findMany({
    where: { id: { in: reportIds } },
    include: { inspector: true, photos: true, defects: true }
  });

  // Generate PDFs in batches to avoid memory issues
  const BATCH_SIZE = 5;
  const results = [];

  for (let i = 0; i < reports.length; i += BATCH_SIZE) {
    const batch = reports.slice(i, i + BATCH_SIZE);

    // Parallel generation within batch
    const batchResults = await Promise.allSettled(
      batch.map(report => generateReportPDF(report))
    );

    results.push(...batchResults);
  }

  // Update pdfGeneratedAt for successful reports
  const successfulIds = results
    .map((r, i) => r.status === "fulfilled" ? reports[i].id : null)
    .filter(Boolean);

  await prisma.report.updateMany({
    where: { id: { in: successfulIds } },
    data: { pdfGeneratedAt: new Date() }
  });

  return { successful: successfulIds.length, failed: results.length - successfulIds.length };
}
```

### Pattern 3: Notification Archiving
**What:** Move old notifications to archived state based on configurable threshold
**When to use:** Daily cron job or manual admin trigger
**Example:**
```typescript
// Source: PostgreSQL partitioning best practices + Prisma soft delete pattern
export async function archiveOldNotifications(thresholdDays: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

  // Archive read notifications older than threshold
  const result = await prisma.notification.updateMany({
    where: {
      read: true,
      createdAt: { lt: cutoffDate },
      dismissed: false
    },
    data: {
      dismissed: true // Soft delete/archive
    }
  });

  return { archived: result.count };
}
```

### Pattern 4: Email Template Management
**What:** Store email templates in database with variable substitution
**When to use:** Admin needs to customize email content without code changes
**Example:**
```typescript
// Add new model to Prisma schema
model EmailTemplate {
  id          String   @id @default(cuid())
  type        String   @unique // "REPORT_SUBMITTED", "REPORT_APPROVED", etc.
  subject     String
  bodyHtml    String   @db.Text
  bodyText    String   @db.Text
  variables   Json     // { "reportNumber": "string", "propertyAddress": "string" }
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Template rendering service
export class EmailTemplateService {
  async renderTemplate(type: string, variables: Record<string, string>) {
    const template = await prisma.emailTemplate.findUnique({ where: { type } });
    if (!template) throw new Error("Template not found");

    let html = template.bodyHtml;
    let text = template.bodyText;
    let subject = template.subject;

    // Simple variable substitution
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      html = html.replaceAll(placeholder, value);
      text = text.replaceAll(placeholder, value);
      subject = subject.replaceAll(placeholder, value);
    }

    return { subject, html, text };
  }
}
```

### Pattern 5: API Documentation with OpenAPI
**What:** Auto-generate OpenAPI spec from API routes and serve Swagger UI
**When to use:** Developer needs API documentation endpoint
**Example:**
```typescript
// Source: next-swagger-doc documentation
// pages/api-docs.tsx
import { GetStaticProps, InferGetStaticPropsType } from 'next';
import { createSwaggerSpec } from 'next-swagger-doc';
import dynamic from 'next/dynamic';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDoc({ spec }: InferGetStaticPropsType<typeof getStaticProps>) {
  return <SwaggerUI spec={spec} />;
}

export const getStaticProps: GetStaticProps = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'RANZ Roofing Report API',
        version: '1.0.0',
      },
    },
  });

  return { props: { spec } };
};
```

### Anti-Patterns to Avoid
- **Generating all PDFs in parallel without batching:** Will exhaust memory with 50+ reports; batch in groups of 5-10
- **Hardcoded notification threshold:** Make archive threshold configurable (database or env var)
- **Storing full ZIP files in database:** Store in R2, only keep URL and hash in database
- **Synchronous ZIP generation:** Large exports can timeout; use streaming or background job
- **Deleting old notifications:** Use soft delete (dismissed: true) to preserve audit trail

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP compression | Custom tar/gz implementation | JSZip (already in deps) | Handles in-memory compression, supports folders, cross-platform |
| Template variable substitution | Complex regex parser | Simple string replace or Handlebars | Email templates have predictable, simple variables; avoid over-engineering |
| Batch progress tracking | Custom WebSocket system | Server-sent events or polling | SSE is simpler for unidirectional updates; polling sufficient for admin use |
| PDF memory management | Custom streaming | Batch processing + gc hints | @react-pdf/renderer handles streams internally; batch size + gc() between batches |
| API doc generation | Manual OpenAPI YAML | next-swagger-doc or next-openapi-gen | Automatically extracts routes, reduces maintenance burden |

**Key insight:** Evidence export and bulk operations are inherently resource-intensive. Focus on batching, rate limiting, and proper error handling rather than premature optimization. The existing patterns (LBP evidence service, PDF generation) already handle edge cases well.

## Common Pitfalls

### Pitfall 1: Memory Exhaustion on Bulk PDF Generation
**What goes wrong:** Generating 100 PDFs in parallel crashes the Node.js process with OOM
**Why it happens:** Each PDF generation loads report data, images, and renders full document in memory
**How to avoid:**
- Batch PDF generation in groups of 5-10 reports
- Use Promise.allSettled for parallel batches
- Call global.gc() if available between batches
- Set appropriate rate limits on batch endpoint
**Warning signs:** High memory usage, slow response times, 503 errors

### Pitfall 2: ZIP File Corruption with Large Photos
**What goes wrong:** ZIP files generated with JSZip are corrupted when containing 100+ high-res photos
**Why it happens:** JSZip keeps entire archive in memory; large datasets exceed heap limits
**How to avoid:**
- Use streaming mode: `zip.generateNodeStream()` instead of `generateAsync()`
- Limit export to necessary photos (not all photos, just defect-related)
- Compress photos before adding to ZIP if original size > 5MB
- Consider pagination for very large reports (>200 photos)
**Warning signs:** ZIP files won't open, extraction errors, partial file contents

### Pitfall 3: Race Conditions in Notification Archiving
**What goes wrong:** Multiple cron jobs run simultaneously, archiving same notifications twice
**Why it happens:** Cron scheduler doesn't prevent concurrent execution
**How to avoid:**
- Use database advisory locks: `SELECT pg_advisory_lock(123)`
- Check last run timestamp before executing
- Use idempotent operations (updateMany with specific conditions)
- Set cron job to run at low-traffic time (e.g., 2am)
**Warning signs:** Duplicate archive operations in logs, unexpected notification counts

### Pitfall 4: Template Variable Injection Attacks
**What goes wrong:** Admin enters malicious HTML in email template, leading to XSS in emails
**Why it happens:** Template rendering doesn't escape user input
**How to avoid:**
- Escape HTML entities in template editor UI
- Use allowlist of permitted HTML tags
- Validate template before saving (reject script tags, onclick, etc.)
- Preview templates with sample data before activation
**Warning signs:** Unexpected HTML in sent emails, script tags in templates

### Pitfall 5: Swagger Doc Generation Failing on Build
**What goes wrong:** next build fails with "Cannot read API routes" error from swagger generator
**Why it happens:** Swagger tools try to import API routes during build, but routes use runtime-only features
**How to avoid:**
- Use dynamic import for Swagger UI: `dynamic(() => import('swagger-ui-react'), { ssr: false })`
- Generate OpenAPI spec at runtime, not build time
- Use getStaticProps for spec generation if using Pages Router
- Exclude API docs from static generation if using App Router
**Warning signs:** Build failures, import errors during next build

## Code Examples

Verified patterns from official sources and codebase:

### Evidence Package Export (Generalized from LBP Service)
```typescript
// Source: Existing lbp-evidence-package-service.ts
import JSZip from "jszip";
import crypto from "crypto";

export async function exportReportPackage(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { photos: true, defects: true, inspector: true }
  });

  const zip = new JSZip();

  // 1. Add report PDF
  const pdfBuffer = await generateReportPDF(reportId);
  zip.file(`${report.reportNumber}.pdf`, pdfBuffer);

  // 2. Add original photos
  const photosFolder = zip.folder("photos");
  for (const photo of report.photos) {
    const photoResponse = await fetch(photo.url);
    const photoBuffer = await photoResponse.arrayBuffer();
    photosFolder.file(`${photo.photoNumber}_${photo.photoType}.jpg`, photoBuffer);
  }

  // 3. Add chain of custody
  const custodyDoc = generateCustodyDocument(report);
  zip.file("chain_of_custody.txt", custodyDoc);

  // 4. Add manifest
  const manifest = {
    reportNumber: report.reportNumber,
    exportDate: new Date().toISOString(),
    photoCount: report.photos.length,
    defectCount: report.defects.length
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 5. Generate and hash
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const hash = crypto.createHash("sha256").update(zipBuffer).digest("hex");

  // 6. Upload to R2
  const url = await uploadToR2(zipBuffer, `exports/${report.reportNumber}.zip`, "application/zip");

  return { url, hash, filename: `${report.reportNumber}.zip` };
}
```

### Bulk PDF Generation with Batching
```typescript
// Source: Prisma batch operations + Promise.allSettled pattern
export async function generateBatchPDFs(reportIds: string[]) {
  const BATCH_SIZE = 5;
  const results = [];

  for (let i = 0; i < reportIds.length; i += BATCH_SIZE) {
    const batchIds = reportIds.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batchIds.map(async (id) => {
        const report = await prisma.report.findUnique({
          where: { id },
          include: { inspector: true, photos: true, defects: true }
        });

        const { renderToBuffer, ReportPDF } = await import("@/lib/pdf/react-pdf-wrapper");
        const pdfBuffer = await renderToBuffer(ReportPDF({ report }));

        return { id, buffer: pdfBuffer };
      })
    );

    results.push(...batchResults);
  }

  // Update database for successful generations
  const successfulIds = results
    .filter(r => r.status === "fulfilled")
    .map(r => r.value.id);

  await prisma.report.updateMany({
    where: { id: { in: successfulIds } },
    data: { pdfGeneratedAt: new Date() }
  });

  return {
    successful: successfulIds.length,
    failed: results.length - successfulIds.length,
    results: results.map((r, i) => ({
      id: reportIds[i],
      success: r.status === "fulfilled",
      error: r.status === "rejected" ? r.reason : undefined
    }))
  };
}
```

### Notification Archiving with Cron
```typescript
// Source: PostgreSQL cleanup patterns
export async function archiveOldNotifications() {
  // Get threshold from settings or env
  const thresholdDays = parseInt(process.env.NOTIFICATION_ARCHIVE_DAYS || "30");
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

  // Archive (soft delete) old read notifications
  const result = await prisma.notification.updateMany({
    where: {
      AND: [
        { read: true },
        { createdAt: { lt: cutoffDate } },
        { dismissed: false }
      ]
    },
    data: { dismissed: true }
  });

  // Log archiving
  console.log(`[Notification Archive] Archived ${result.count} notifications older than ${thresholdDays} days`);

  return { archived: result.count, threshold: thresholdDays };
}
```

### Email Template Rendering
```typescript
// Source: Template pattern with variable substitution
export class EmailTemplateService {
  async renderTemplate(templateType: string, variables: Record<string, string>) {
    const template = await prisma.emailTemplate.findUnique({
      where: { type: templateType, isActive: true }
    });

    if (!template) {
      // Fallback to hardcoded template
      return this.getDefaultTemplate(templateType, variables);
    }

    return {
      subject: this.substituteVariables(template.subject, variables),
      html: this.substituteVariables(template.bodyHtml, variables),
      text: this.substituteVariables(template.bodyText, variables)
    };
  }

  private substituteVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replaceAll(`{{${key}}}`, value);
    }
    return result;
  }
}
```

### OpenAPI Spec Generation
```typescript
// Source: next-swagger-doc documentation
// lib/swagger/spec.ts
import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  return createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'RANZ Roofing Report API',
        version: '1.0.0',
        description: 'ISO 17020-compliant inspection platform API',
      },
      servers: [
        {
          url: 'https://reports.ranz.org.nz',
          description: 'Production'
        },
        {
          url: 'http://localhost:3000',
          description: 'Development'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
          }
        }
      }
    },
  });
};

// app/api/docs/route.ts
import { NextResponse } from 'next/server';
import { getApiDocs } from '@/lib/swagger/spec';

export async function GET() {
  const spec = getApiDocs();
  return NextResponse.json(spec);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer for PDFs | @react-pdf/renderer | Phase 6 (current) | React-based templates, faster, no Chromium dependency |
| Manual email HTML | React Email components | Industry shift 2024 | Type-safe templates, reusable components |
| Hard-coded templates | Database-stored templates | Phase 9 (new) | Admin customization without deploys |
| Manual API docs | Auto-generated OpenAPI | Industry standard | Reduced maintenance, always in sync |
| pg_cron on managed Postgres | Neon serverless + external cron | Cloud migration 2024+ | Serverless-compatible scheduling |

**Deprecated/outdated:**
- **Puppeteer for PDF generation**: Replaced by @react-pdf/renderer in Phase 6; Puppeteer still valid for other use cases but not used here
- **Manual ZIP with archiver stream**: JSZip is simpler for in-memory operations; archiver better for extremely large files
- **Handlebars for email templates**: Simple string replacement sufficient; Handlebars adds dependency

## Open Questions

Things that couldn't be fully resolved:

1. **Notification Archive Hard Delete Strategy**
   - What we know: Soft delete (dismissed: true) preserves audit trail
   - What's unclear: When/if to hard delete very old notifications (>1 year)
   - Recommendation: Keep soft delete only for v1.1; add hard delete cron in v2 if storage becomes issue

2. **Batch PDF Generation Concurrency Limits**
   - What we know: Batch size of 5-10 recommended, but optimal size depends on report complexity
   - What's unclear: Whether Vercel/Railway serverless limits affect concurrent PDF rendering
   - Recommendation: Start with batch size of 5, add performance monitoring, tune based on real data

3. **Email Template Version Control**
   - What we know: Database templates enable admin editing but lose version history
   - What's unclear: Whether to add template versioning (track changes, rollback capability)
   - Recommendation: Skip versioning for v1.1; admin can manually backup templates before changes

4. **API Documentation Authentication**
   - What we know: Swagger UI should be accessible to developers but not public
   - What's unclear: Whether to require authentication for /api/docs endpoint
   - Recommendation: Protect with admin auth (ADMIN, SUPER_ADMIN roles only)

5. **ZIP Export Performance on Very Large Reports**
   - What we know: JSZip in-memory mode works for typical reports (20-50 photos)
   - What's unclear: Threshold where streaming mode becomes necessary
   - Recommendation: Start with in-memory mode; add streaming if reports regularly exceed 100 photos or 500MB

## Sources

### Primary (HIGH confidence)
- JSZip documentation - https://stuk.github.io/jszip/
- @react-pdf/renderer GitHub - Already in use, verified in codebase
- Prisma batch operations - https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- Existing codebase:
  - `src/services/lbp-evidence-package-service.ts` - ZIP generation pattern
  - `src/app/api/reports/[id]/pdf/route.ts` - PDF generation pattern
  - `src/app/api/admin/reports/batch/route.ts` - Batch operations pattern
  - `src/lib/notifications/push-service.ts` - Notification system
  - `src/lib/email.ts` - Current email templates

### Secondary (MEDIUM confidence)
- [Next.js ZIP generation with JSZip](https://www.mridul.tech/blogs/how-to-generate-zip-with-file-links-in-next-js-and-react-js)
- [JSZip NPM documentation](https://www.npmjs.com/package/jszip)
- [Next.js Swagger documentation generator](https://catalins.tech/generate-swagger-documentation-next-js-api/)
- [next-swagger-doc GitHub](https://github.com/jellydn/next-swagger-doc)
- [next-openapi-gen GitHub](https://github.com/tazo90/next-openapi-gen)
- [Puppeteer PDF generation guide](https://pptr.dev/guides/pdf-generation)
- [Prisma bulk inserts best practices](https://medium.com/@ivanspoljaric22/mastering-bulk-inserts-in-prisma-best-practices-for-performance-integrity-2ba531f86f74)
- [PostgreSQL data archiving best practices](https://dataegret.com/2025/05/data-archiving-and-retention-in-postgresql-best-practices-for-large-datasets/)
- [React Email + Resend integration](https://react.email/docs/integrations/resend)
- [Email template management with React Email](https://www.freecodecamp.org/news/create-and-send-email-templates-using-react-email-and-resend-in-nextjs/)

### Tertiary (LOW confidence)
- WebSearch results for notification archiving strategies - general PostgreSQL patterns, not specific to this stack

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - JSZip, @react-pdf/renderer, Prisma already in use; next-swagger-doc verified with Next.js 15
- Architecture: HIGH - Patterns extracted from existing codebase (LBP evidence service, batch routes, PDF generation)
- Pitfalls: MEDIUM - Derived from general best practices and codebase review, not production experience with this specific implementation

**Research date:** 2026-02-07
**Valid until:** 60 days (stable technologies, established patterns)

**Key technical decisions already made:**
- ZIP generation: JSZip (already in package.json, proven in LBP service)
- PDF generation: @react-pdf/renderer (current solution)
- Notification storage: PostgreSQL with soft delete pattern
- Email delivery: Resend (already configured)
- File storage: Cloudflare R2 (already in use)

**New decisions needed:**
- API documentation tool: next-swagger-doc vs next-openapi-gen vs manual spec
- Notification archive threshold: Default 30 days, make configurable
- Email template storage: New EmailTemplate model in Prisma schema
- Batch PDF concurrency: Start with batch size of 5
- Cron scheduling: pg_cron via Neon vs external scheduler
