# RANZ Roofing Report

## What This Is

ISO 17020-compliant roofing inspection platform for RANZ-appointed inspectors to produce legally defensible reports for disputes, court proceedings, and LBP Board complaints in New Zealand. Web app (Next.js 16) with mobile companion (React Native/Expo).

## Core Value

Inspectors can produce court-admissible roofing reports with tamper-evident photo chains, compliance assessments, and professional PDF output that meet ISO 17020, NZ Evidence Act 2006, and High Court Rules Schedule 4 requirements.

## Requirements

### Validated

<!-- Shipped in v1.0 (Phases 1-5) -->

- ✓ Multi-step report wizard (7 steps) — v1.0
- ✓ Photo upload with EXIF extraction, SHA-256 hashing, R2 storage — v1.0
- ✓ Photo annotation (pen, line, arrow, circle, rectangle, text) — v1.0
- ✓ Defect management (3-part structure: Observation/Analysis/Opinion) — v1.0
- ✓ Roof element tracking with condition ratings — v1.0
- ✓ Compliance engine (E2/B2/COP assessment) — v1.0
- ✓ Professional PDF output (ISO 17020 layout) — v1.0
- ✓ Review workflow (comments, approve/reject/revision) — v1.0
- ✓ Inspector management and assignment — v1.0
- ✓ Report templates (CRUD + admin editor) — v1.0
- ✓ Analytics dashboard (defect trends, heatmap, inspector metrics) — v1.0
- ✓ Audit trail (per-report + system-wide) — v1.0
- ✓ Evidence integrity verification (SHA-256, chain of custody) — v1.0
- ✓ LBP complaint system (auto-populate, PDF, evidence packaging) — v1.0
- ✓ PWA/offline support (IndexedDB, sync queue, auto-sync) — v1.0
- ✓ Report sharing (token-based, access levels, expiry) — v1.0
- ✓ Notifications (in-app + web push subscribe + email via Resend) — v1.0
- ✓ Onboarding wizard (6-step) — v1.0
- ✓ Address autocomplete (Google/NZ API) — v1.0
- ✓ Weather integration (OpenWeather/NIWA) — v1.0
- ✓ Report export (CSV) — v1.0
- ✓ Report duplication — v1.0
- ✓ Revision history with diff view — v1.0
- ✓ Accessibility (skip links, ARIA, focus traps, keyboard nav) — v1.0
- ✓ Performance (dynamic imports, loading states, Lighthouse CI) — v1.0
- ✓ Security (Upstash Redis rate limiting, file validation, error sanitisation) — v1.0
- ✓ E2E tests (Playwright with Clerk auth fixtures) — v1.0
- ✓ End-user documentation (5 guides) — v1.0

<!-- Shipped in v1.1 (Phases 6-10) -->

- ✓ PDF includes ISO 17020 sections (methodology, equipment, limitations, access) — v1.1
- ✓ PDF includes compliance assessment results (B2/E2/COP with pass/fail/NA) — v1.1
- ✓ Evidence package ZIP export (PDF + photos + chain of custody) — v1.1
- ✓ Batch PDF generation for admin — v1.1
- ✓ Client confirmation email on inspection request — v1.1
- ✓ Inspector assignment notification (email + in-app + push) — v1.1
- ✓ Web push notification sending for workflow events — v1.1
- ✓ Notification auto-archiving (configurable threshold) — v1.1
- ✓ Email template management (admin CRUD + live preview) — v1.1
- ✓ Email templates wired to senders (admin edits affect actual emails) — v1.1
- ✓ Report filtering (severity, compliance, inspector, date range) — v1.1
- ✓ Template selection in report creation wizard — v1.1
- ✓ Shared report password protection enforcement — v1.1
- ✓ OpenAPI/Swagger API documentation — v1.1

### Active

(No active requirements — next milestone not yet defined)

### Out of Scope

- Real-time collaboration on reports — Complexity vs value; inspectors work solo
- AI-powered defect detection — No AI dependency in production (design principle)
- Multi-language support — NZ-only platform, English sufficient
- Custom domain per organisation — Single-tenant model (reports.ranz.org.nz)
- Stripe/payment integration — Reports included with RANZ membership

## Context

- **Stack**: Next.js 16, TypeScript, Tailwind v4, Prisma 7.3, Clerk auth, Cloudflare R2
- **Database**: PostgreSQL (Neon), 23 Prisma models (EmailTemplate added in v1.1)
- **88+ API routes** covering full CRUD for reports, defects, photos, templates, admin, email templates, evidence export, batch operations
- **33+ dashboard/admin pages** including email template editor, API docs, evidence export
- v1.0 MVP shipped with beyond-spec features; v1.1 closed all 12 audit gaps
- **UAT with real inspectors** is the next major activity
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
| Fire-and-forget notifications | Prevents notification failures from breaking API responses | ✓ Good |
| DB-first email templates with hardcoded fallback | Admin customisation + zero-downtime resilience | ✓ Good |
| Hand-crafted OpenAPI spec | 88 routes, manual spec more practical than auto-generation | ✓ Good |
| Post-fetch compliance filtering | Nested JSON structure makes Prisma-level filtering impractical | ✓ Good |
| Self-contained BatchPdfPanel | No cross-component state management complexity | ✓ Good |

## Current State

**Shipped:** v1.1 Pre-Pilot Hardening (2026-02-08)
**Next:** UAT with real inspectors, production deployment, then v1.2 planning

---
*Last updated: 2026-02-08 after v1.1 milestone*
