# RANZ Roofing Report

## What This Is

ISO 17020-compliant roofing inspection platform for RANZ-appointed inspectors to produce legally defensible reports for disputes, court proceedings, and LBP Board complaints in New Zealand. Web app (Next.js 16) with mobile companion (React Native/Expo).

## Core Value

Inspectors can produce court-admissible roofing reports with tamper-evident photo chains, compliance assessments, and professional PDF output that meet ISO 17020, NZ Evidence Act 2006, and High Court Rules Schedule 4 requirements.

## Requirements

### Validated

<!-- Shipped in v1.0 (Phases 1-5) -->

- ✓ Multi-step report wizard (7 steps) — Phase 2
- ✓ Photo upload with EXIF extraction, SHA-256 hashing, R2 storage — Phase 1
- ✓ Photo annotation (pen, line, arrow, circle, rectangle, text) — Phase 2
- ✓ Defect management (3-part structure: Observation/Analysis/Opinion) — Phase 2
- ✓ Roof element tracking with condition ratings — Phase 2
- ✓ Compliance engine (E2/B2/COP assessment) — Phase 2
- ✓ Professional PDF output (ISO 17020 layout) — Phase 2
- ✓ Review workflow (comments, approve/reject/revision) — Phase 4
- ✓ Inspector management and assignment — Phase 4
- ✓ Report templates (CRUD + admin editor) — Phase 4
- ✓ Analytics dashboard (defect trends, heatmap, inspector metrics) — Phase 4
- ✓ Audit trail (per-report + system-wide) — Phase 4
- ✓ Evidence integrity verification (SHA-256, chain of custody) — Phase 4
- ✓ LBP complaint system (auto-populate, PDF, evidence packaging) — Beyond-spec
- ✓ PWA/offline support (IndexedDB, sync queue, auto-sync) — Beyond-spec
- ✓ Report sharing (token-based, access levels, expiry) — Beyond-spec
- ✓ Notifications (in-app + web push subscribe + email via Resend) — Beyond-spec
- ✓ Onboarding wizard (6-step) — Beyond-spec
- ✓ Address autocomplete (Google/NZ API) — Beyond-spec
- ✓ Weather integration (OpenWeather/NIWA) — Beyond-spec
- ✓ Report export (CSV) — Beyond-spec
- ✓ Report duplication — Beyond-spec
- ✓ Revision history with diff view — Beyond-spec
- ✓ Accessibility (skip links, ARIA, focus traps, keyboard nav) — Phase 5
- ✓ Performance (dynamic imports, loading states, Lighthouse CI) — Phase 5
- ✓ Security (Upstash Redis rate limiting, file validation, error sanitisation) — Phase 5
- ✓ E2E tests (Playwright with Clerk auth fixtures) — Phase 5
- ✓ End-user documentation (5 guides) — Phase 5

### Active

<!-- Current scope: v1.1 Pre-Pilot Hardening -->

- [ ] Complete inspection request email notifications
- [ ] Add missing ISO 17020 PDF sections (methodology, equipment, limitations, access)
- [ ] Include compliance assessment results in PDF output
- [ ] Implement web push notification sending
- [ ] Enforce password protection on shared reports
- [ ] Evidence package ZIP export for court/tribunal submissions
- [ ] Advanced search and filtering for reports
- [ ] Bulk PDF generation
- [ ] Wire report templates into creation wizard
- [ ] Admin email template management
- [ ] OpenAPI/Swagger API documentation
- [ ] Notification cleanup and archival

### Out of Scope

- Real-time collaboration on reports — Complexity vs value; inspectors work solo
- AI-powered defect detection — No AI dependency in production (design principle)
- Multi-language support — NZ-only platform, English sufficient
- Custom domain per organisation — Single-tenant model (reports.ranz.org.nz)
- Stripe/payment integration — Reports included with RANZ membership

## Context

- **Stack**: Next.js 16, TypeScript, Tailwind v4, Prisma 7.3, Clerk auth, Cloudflare R2
- **Database**: PostgreSQL (Neon), 22 Prisma models
- **88 API routes** covering full CRUD for reports, defects, photos, templates, admin
- **30 dashboard/admin pages** — all functional
- **Audit identified 12 gaps** ranging from stubbed notifications to missing PDF sections
- **UAT with real inspectors** is the next major milestone after these fixes
- Mobile app (Expo 54) developed separately; core features built, admin/review UI scaffolded

## Constraints

- **Legal compliance**: PDF output must meet ISO 17020, NZ Evidence Act 2006, High Court Rules Schedule 4
- **Evidence integrity**: Original photos never modified; SHA-256 hashes immutable
- **No AI in production**: All tools built with AI assistance but deploy as conventional web apps
- **Clerk auth**: SSO satellite of RANZ Quality Program portal — auth changes must be compatible
- **Serverless**: Deployed on Vercel — no long-running processes, stateless functions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| @react-pdf/renderer for PDF | Server-side rendering, React component model | ✓ Good |
| Upstash Redis for rate limiting | Serverless-compatible, graceful fallback to in-memory | ✓ Good |
| Clerk for auth | SSO with Quality Program portal, satellite domain support | ✓ Good |
| Cloudflare R2 for storage | Zero egress fees, AES-256 encryption | ✓ Good |
| IndexedDB (Dexie) for offline | PWA-compatible, no native dependency | ✓ Good |
| Dynamic imports for heavy pages | Reduced initial bundle, loading skeletons | ✓ Good |

## Current Milestone: v1.1 Pre-Pilot Hardening

**Goal:** Close all functional gaps identified in the codebase audit before UAT with real inspectors.

**Target features:**
- Complete PDF output (ISO 17020 sections + compliance results)
- Finish notification pipeline (inspection request emails + web push sending)
- Evidence package export for court submissions
- Advanced search, bulk operations, template wiring
- API documentation and notification lifecycle management

---
*Last updated: 2026-02-07 after v1.1 milestone start*
