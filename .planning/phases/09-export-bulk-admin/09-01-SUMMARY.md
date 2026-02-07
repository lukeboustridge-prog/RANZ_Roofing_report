---
phase: 09-export-bulk-admin
plan: 01
subsystem: export
tags: [zip, evidence-package, jszip, r2, sha256, pdf, court-admissible]

# Dependency graph
requires:
  - phase: 06-pdf-court-readiness
    provides: "PDF generation with @react-pdf/renderer, dynamic imports, report-template"
  - phase: 07-notifications-sharing
    provides: "ShareReportButton pattern for client component in server page"
provides:
  - "Evidence export service generating ZIP with PDF, photos, chain of custody, manifest"
  - "GET /api/reports/[id]/export endpoint with auth, rate limiting, audit logging"
  - "Export Evidence Package button on report detail page for approved/finalised reports"
affects:
  - "09-04: may reference export service for admin bulk export features"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ZIP generation with JSZip + DEFLATE compression level 6"
    - "SHA-256 hash of generated ZIP for integrity verification"
    - "Client component button with idle/loading/success/error state machine"

key-files:
  created:
    - "src/services/evidence-export-service.ts"
    - "src/app/api/reports/[id]/export/route.ts"
    - "src/components/reports/ExportEvidenceButton.tsx"
  modified:
    - "src/app/(dashboard)/reports/[id]/page.tsx"
    - "src/services/index.ts"
    - "prisma/schema.prisma"

key-decisions:
  - "EVIDENCE_EXPORTED added to AuditAction enum for dedicated audit trail"
  - "PDF generation error in export does not fail the whole package -- adds error notice file instead"
  - "Export button uses inline error tooltip instead of toast (no Toaster in dashboard layout)"
  - "Compression level 6 (not 9) for speed/size balance on potentially large evidence packages"

patterns-established:
  - "Evidence export pattern: fetch report with relations, generate ZIP with PDF + photos + metadata + chain of custody + manifest, hash, upload to R2"

# Metrics
duration: 10min
completed: 2026-02-07
---

# Phase 9 Plan 1: Evidence Export Package Summary

**ZIP evidence export with report PDF, original photos, chain of custody, and manifest uploaded to R2 with SHA-256 integrity hash**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-07T06:26:26Z
- **Completed:** 2026-02-07T06:36:19Z
- **Tasks:** 2
- **Files created:** 3
- **Files modified:** 3

## Accomplishments
- EvidenceExportService generates ZIP containing: report PDF (via dynamic import of react-pdf), all report photos with descriptive filenames, photo metadata JSON, chain of custody document (ISO 17020/NZ Evidence Act 2006), and manifest.json
- API endpoint at GET /api/reports/[id]/export with Clerk auth, rate limiting (5/min matching PDF preset), owner/reviewer/admin access control, and EVIDENCE_EXPORTED audit logging
- ExportEvidenceButton client component with loading spinner, success checkmark, error tooltip, and auto-reset states

## Task Commits

Each task was committed atomically:

1. **Task 1: Create evidence export service and API endpoint** - `29cb5ce` (feat)
2. **Task 2: Add Export Evidence Package button to report detail page** - `579ebbd` (feat)

## Files Created/Modified
- `src/services/evidence-export-service.ts` - EvidenceExportService class (368 lines) with createExportPackage method generating ZIP with PDF, photos, chain of custody, manifest
- `src/app/api/reports/[id]/export/route.ts` - GET endpoint with auth, rate limiting, audit logging, returns {url, hash, filename}
- `src/components/reports/ExportEvidenceButton.tsx` - Client component with idle/loading/success/error states and inline error display
- `src/app/(dashboard)/reports/[id]/page.tsx` - Added ExportEvidenceButton for APPROVED/FINALISED reports in header actions
- `src/services/index.ts` - Added evidenceExportService export
- `prisma/schema.prisma` - Added EVIDENCE_EXPORTED to AuditAction enum

## Decisions Made
- EVIDENCE_EXPORTED added to AuditAction enum rather than reusing DOWNLOADED, for clear audit differentiation between PDF downloads and full evidence package exports
- PDF generation error within the export service is caught gracefully -- adds an error notice text file to the ZIP instead of failing the entire package, allowing photos and chain of custody to still be exported
- Export button uses inline error tooltip rather than toast notifications because the dashboard layout does not include a Toaster component
- Compression level 6 chosen over level 9 (used in LBP service) for better speed/size balance on potentially large evidence packages with many photos

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added EVIDENCE_EXPORTED to AuditAction enum**
- **Found during:** Task 1
- **Issue:** Plan specifies EVIDENCE_EXPORTED audit action but enum did not include it
- **Fix:** Added EVIDENCE_EXPORTED to AuditAction enum in schema.prisma and regenerated Prisma client
- **Files modified:** prisma/schema.prisma

**2. [Rule 2 - Missing Critical] Created ExportEvidenceButton as separate client component**
- **Found during:** Task 2
- **Issue:** Report detail page is a Server Component; export button needs client-side interactivity (loading state, fetch, window.open)
- **Fix:** Created ExportEvidenceButton as a "use client" component following DuplicateReportButton/ShareReportButton pattern
- **Files created:** src/components/reports/ExportEvidenceButton.tsx

## Issues Encountered
None

## User Setup Required

- Run `npx prisma migrate dev` or `npx prisma db push` to apply the EVIDENCE_EXPORTED enum addition to the database

## Next Phase Readiness
- Evidence export service is ready and can be extended for bulk exports in future plans
- Export button pattern can be reused for other download-type actions
- Chain of custody template can be customised with additional compliance standards as needed

---
*Phase: 09-export-bulk-admin*
*Completed: 2026-02-07*
