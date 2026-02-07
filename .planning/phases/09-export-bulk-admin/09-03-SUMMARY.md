---
phase: 09-export-bulk-admin
plan: 03
subsystem: api
tags: [prisma, email-templates, crud, admin, resend]

# Dependency graph
requires:
  - phase: 07-notifications-sharing
    provides: "Hardcoded email notification functions in src/lib/email.ts"
provides:
  - "EmailTemplate Prisma model for storing customisable email templates"
  - "Email template rendering service with variable substitution and fallback"
  - "Admin CRUD API endpoints for email template management"
  - "Seed endpoint to populate default templates from hardcoded email functions"
affects: [09-04 email template admin UI]

# Tech tracking
tech-stack:
  added: []
  patterns: ["{{variable}} substitution in email templates", "DB-first with hardcoded fallback pattern"]

key-files:
  created:
    - "src/services/email-template-service.ts"
    - "src/app/api/admin/email-templates/route.ts"
    - "src/app/api/admin/email-templates/[id]/route.ts"
    - "src/app/api/admin/email-templates/seed/route.ts"
  modified:
    - "prisma/schema.prisma"

key-decisions:
  - "Template service looks up DB first, falls back to hardcoded defaults from email.ts"
  - "Seed endpoint uses upsert on type field for idempotent seeding"
  - "PUT endpoint warns but does not block when required variables are missing from bodyHtml"
  - "Email template type field is immutable after creation (unique identifier)"

patterns-established:
  - "DB-first template lookup with hardcoded fallback: renderTemplate checks DB, falls back to getDefaultTemplates()"
  - "Admin CRUD pattern: list/create on collection route, get/update on [id] route, action endpoints on named subroutes"

# Metrics
duration: 10min
completed: 2026-02-07
---

# Phase 9 Plan 3: Email Template Model, Service & CRUD API Summary

**EmailTemplate Prisma model with {{variable}} substitution service and admin CRUD API, seeded from 8 hardcoded email.ts templates**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-07T06:15:07Z
- **Completed:** 2026-02-07T06:24:53Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- EmailTemplate model added to Prisma schema with type (unique), subject, bodyHtml, bodyText, variables (Json), isActive fields
- Template rendering service with DB-first lookup, {{variable}} substitution, hardcoded fallback for all 8 email types, and admin preview with sample data
- Full CRUD API: list all templates, create new template, get by ID, update (with variable presence warnings), seed defaults from email.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add EmailTemplate model and create template service** - `928f288` (feat)
2. **Task 2: Create email template CRUD API routes and seed endpoint** - `eb16469` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added EmailTemplate model with type, subject, bodyHtml, bodyText, variables, isActive
- `src/services/email-template-service.ts` - Template rendering with DB lookup, {{variable}} substitution, hardcoded fallback, preview
- `src/app/api/admin/email-templates/route.ts` - GET (list) and POST (create) endpoints
- `src/app/api/admin/email-templates/[id]/route.ts` - GET (detail) and PUT (update) with variable warnings
- `src/app/api/admin/email-templates/seed/route.ts` - POST seed endpoint using upsert for idempotency

## Decisions Made
- Template service looks up DB first with `findUnique({ type, isActive: true })`, falls back to hardcoded defaults extracted from email.ts when no DB template found or DB unavailable
- Seed endpoint uses `prisma.emailTemplate.upsert` on type field so it is idempotent and safe to run multiple times
- PUT endpoint validates that bodyHtml contains all required variables from the template's variables field, but returns warnings rather than blocking the update (admin may intentionally remove variables)
- Template type field cannot be changed via PUT (it is the unique identifier linking to email sending code)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Database schema change requires `npx prisma db push` on deployment.

## Next Phase Readiness
- Email template CRUD API is ready for the admin UI (09-04)
- Seed endpoint can be called to populate initial templates
- Template rendering service is ready to be integrated into existing email sending functions

---
*Phase: 09-export-bulk-admin*
*Completed: 2026-02-07*
