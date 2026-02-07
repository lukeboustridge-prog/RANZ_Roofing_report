# Milestones

## v1.1 — Pre-Pilot Hardening (Phases 6-10)

**Shipped:** 2026-02-08
**Phases:** 5 (PDF Court-Readiness, Notifications & Sharing, Search/Filtering/Templates, Export/Bulk/Admin, Admin Polish & Email Wire-Up)
**Plans:** 12 total
**Timeline:** 16 days (2026-01-23 to 2026-02-08)

### What shipped

- Court-admissible PDF output with ISO 17020 sections (methodology, equipment, limitations, access method, compliance assessment)
- Complete notification pipeline: email + in-app + web push for all inspection workflow events (assignment, review, submission)
- Shared report password protection enforcement
- Evidence package ZIP export with PDF, photos, chain of custody, and SHA-256 integrity
- Advanced report filtering (severity, compliance status, inspector, date range)
- Template selection in report creation wizard
- Batch PDF generation for admin
- Notification auto-archiving (configurable threshold)
- Email template CRUD with admin UI, live preview, and variable substitution
- All 8 email senders wired to template service (admin edits affect actual emails)
- OpenAPI/Swagger API documentation
- Admin dashboard with 9 quick action cards (full navigation)
- Admin reports page with full filtering + batch PDF panel

### Key metrics

- 74 files modified
- ~16,000 lines added
- 19/19 requirements shipped
- 15/15 integration points connected
- 3/3 E2E flows verified
- 0 anti-patterns across all phases
- 61 commits

### Audit

- Initial audit (2026-02-07): 3 integration gaps found
- Gap closure Phase 10 created and executed
- Re-audit (2026-02-08): All gaps closed, status PASSED

### Last phase number: 10

---

## v1.0 — Feature-Complete Web App (Phases 1-5)

**Shipped:** February 2026
**Phases:** 5 (Foundation, Report Builder, Mobile App*, Review & Quality, Polish & Launch)

*Note: Mobile App (Phase 3) developed in separate session, not tracked here.

### What shipped

- Full report creation/editing wizard (7 steps)
- Photo upload with EXIF, GPS, SHA-256 chain of custody
- Photo annotation tools
- Defect management (Observation/Analysis/Opinion)
- Roof element tracking with condition ratings
- Compliance engine (E2/B2/COP)
- Professional ISO 17020 PDF output
- Review workflow with comments
- Inspector management and assignment
- Report templates (CRUD)
- Analytics dashboard
- Audit trail
- Evidence integrity verification
- LBP complaint system
- PWA/offline support
- Report sharing (token-based)
- Notifications (in-app + web push subscribe + email)
- Onboarding wizard
- Address autocomplete + weather integration
- Report export (CSV), duplication, revision history
- Accessibility audit (ARIA, focus traps, keyboard nav)
- Performance optimisation (dynamic imports, loading states)
- Security hardening (Upstash rate limiting, file validation, error sanitisation)
- E2E test suite (Playwright + Clerk auth fixtures)
- End-user documentation (5 guides)

### Key metrics

- 88 API routes
- 30 dashboard/admin pages
- 22 Prisma models
- 171 unit tests passing
- 6 pre-existing lint warnings (non-blocking)

### Last phase number: 5
