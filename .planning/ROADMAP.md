# Roadmap: RANZ Roofing Report

## Milestones

- **v1.0 MVP** - Phases 1-5 (shipped)
- **v1.1 Pre-Pilot Hardening** - Phases 6-10 (complete)

## Phases

### v1.1 Pre-Pilot Hardening (Complete)

**Milestone Goal:** Close all functional gaps identified in the codebase audit before UAT with real inspectors. Court-ready PDF output, complete notification pipeline, advanced filtering, and admin tooling.

- [x] **Phase 6: PDF Court-Readiness** - ISO 17020 sections and compliance results in PDF output
- [x] **Phase 7: Notifications & Sharing** - Email notifications, web push sending, and shared report security
- [x] **Phase 8: Search, Filtering & Templates** - Report filtering by severity, compliance, inspector, date; template wiring
- [x] **Phase 9: Export, Bulk & Admin** - Evidence ZIP export, bulk PDF generation, notification management, API docs
- [x] **Phase 10: Admin Polish & Email Template Wire-Up** - Wire email templates into senders, admin nav links, admin report filters

## Phase Details

### Phase 6: PDF Court-Readiness
**Goal**: Generated PDF reports contain all ISO 17020 required sections and compliance assessment results, making them court-admissible without manual additions
**Depends on**: Nothing (builds on existing PDF infrastructure from v1.0)
**Requirements**: PDF-01, PDF-02, PDF-03, PDF-04, PDF-05
**Success Criteria** (what must be TRUE):
  1. PDF output includes a methodology section describing the inspection approach used
  2. PDF output includes an equipment/tools section listing all instruments used during inspection
  3. PDF output includes a limitations section documenting access restrictions and caveats
  4. PDF output includes an access method section describing how the roof was accessed
  5. PDF output includes compliance assessment results showing B2/E2/COP analysis with pass/fail/NA status for each clause
**Plans:** 2 plans

Plans:
- [x] 06-01-PLAN.md -- Add methodology and equipment form fields to report edit page
- [x] 06-02-PLAN.md -- Create PDF methodology section component and wire into report template

### Phase 7: Notifications & Sharing
**Goal**: Users receive timely email and push notifications for inspection workflow events, and shared reports enforce password protection
**Depends on**: Nothing (builds on existing notification stubs and sharing infrastructure from v1.0)
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, SHARE-01
**Success Criteria** (what must be TRUE):
  1. Client receives a confirmation email when their inspection request is created
  2. Inspector receives a notification (email or in-app) when assigned to an inspection request
  3. Subscribed users receive web push notifications for relevant events (assignment, review status changes)
  4. Shared report with password protection requires password entry before displaying any report content
**Plans:** 2 plans

Plans:
- [x] 07-01-PLAN.md -- Wire assignment notifications (client confirmation email + inspector in-app/push/email)
- [x] 07-02-PLAN.md -- Wire review decision notifications + harden shared report password protection

### Phase 8: Search, Filtering & Templates
**Goal**: Users can efficiently find reports using multiple filter criteria and apply saved templates when creating new reports
**Depends on**: Nothing (builds on existing report list and template CRUD from v1.0)
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04, TMPL-01
**Success Criteria** (what must be TRUE):
  1. User can filter the report list by defect severity level and see only matching reports
  2. User can filter the report list by compliance assessment status (pass/fail/NA)
  3. User can filter the report list by assigned inspector
  4. User can filter the report list by date range (creation date, inspection date, or review date)
  5. User can select a saved template during report creation and have its fields pre-populated
**Plans:** 2 plans

Plans:
- [x] 08-01-PLAN.md -- Add severity, compliance, inspector, and date field filters to report list API and UI
- [x] 08-02-PLAN.md -- Wire template selection into report creation wizard

### Phase 9: Export, Bulk & Admin
**Goal**: Admins have production-ready tools for evidence packaging, bulk operations, notification lifecycle management, and API documentation
**Depends on**: Phase 6 (PDF generation must be complete before bulk PDF and ZIP export)
**Requirements**: PDF-06, PDF-07, NOTIF-04, NOTIF-05, API-01
**Success Criteria** (what must be TRUE):
  1. User can export an evidence package as a ZIP file containing the report PDF, original photos, and chain of custody certificates
  2. Admin can select multiple reports and generate PDFs for all of them in a single batch operation
  3. Notifications older than a configurable threshold are automatically archived and no longer appear in the active notification list
  4. Admin can view and customise email notification templates from the admin panel
  5. An OpenAPI/Swagger specification is generated from API routes and accessible at a documentation endpoint
**Plans:** 4 plans

Plans:
- [x] 09-01-PLAN.md -- Evidence package ZIP export (service + API + UI button)
- [x] 09-02-PLAN.md -- Bulk PDF generation + notification archiving
- [x] 09-03-PLAN.md -- Email template model, rendering service, and CRUD API
- [x] 09-04-PLAN.md -- Email template admin UI + OpenAPI/Swagger documentation

### Phase 10: Admin Polish & Email Template Wire-Up
**Goal**: Admin email template edits take effect on actual emails sent, admin dashboard provides full navigation, and admin reports page supports filtering
**Depends on**: Phase 9 (email template service and admin pages must exist)
**Requirements**: None (gap closure — all requirements already satisfied)
**Gap Closure**: Closes 3 integration gaps from v1.1 audit
**Success Criteria** (what must be TRUE):
  1. Email-sending functions use emailTemplateService.renderTemplate() so admin template edits affect actual emails
  2. Admin dashboard has quick action cards linking to Email Templates, API Docs, and All Reports pages
  3. Admin reports page supports filtering by severity, compliance status, inspector, and date range
**Plans:** 2 plans

Plans:
- [x] 10-01-PLAN.md -- Wire all 8 email functions to use emailTemplateService.renderTemplate() with hardcoded fallback
- [x] 10-02-PLAN.md -- Add 3 admin dashboard quick action cards + refactor admin reports to use ReportSearch with batch PDF

## Progress

**Execution Order:**
Phases execute in numeric order: 6 -> 7 -> 8 -> 9 -> 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 6. PDF Court-Readiness | v1.1 | 2/2 | Complete | 2026-02-07 |
| 7. Notifications & Sharing | v1.1 | 2/2 | Complete | 2026-02-07 |
| 8. Search, Filtering & Templates | v1.1 | 2/2 | Complete | 2026-02-07 |
| 9. Export, Bulk & Admin | v1.1 | 4/4 | Complete | 2026-02-07 |
| 10. Admin Polish & Email Wire-Up | v1.1 | 2/2 | Complete | 2026-02-08 |
