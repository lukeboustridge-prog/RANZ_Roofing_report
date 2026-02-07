# Security Posture — RANZ Roofing Report

This document outlines the security measures in place for the RANZ Roofing Report web application.

## Authentication

- **Provider**: Clerk (satellite domain of RANZ Quality Program portal)
- **Fallback**: Custom JWT verification for offline / Quality Program integration
- **Middleware**: `src/middleware.ts` enforces auth on all protected routes
- **Onboarding**: Users must complete onboarding before accessing protected pages

## Authorisation (RBAC)

Roles: `SUPER_ADMIN`, `ADMIN`, `APPOINTED_INSPECTOR`, `MEMBER`

- API routes check role via `getAuthUser()` and Prisma user lookup
- Admin routes require `ADMIN` or `SUPER_ADMIN`
- Data ownership verified on every request (e.g. reports filtered by `inspectorId`)
- Prevents horizontal privilege escalation

## CSRF Protection

CSRF is mitigated by:

1. **SameSite cookie policy** — Clerk sets `SameSite=Lax` on session cookies
2. **No CORS** — Next.js App Router API routes reject cross-origin requests by default
3. **Auth token required** — All state-changing operations require a valid Clerk session or JWT
4. **JSON API** — No HTML form actions; all mutations use `fetch()` with JSON bodies

## Rate Limiting

- **Production**: Upstash Redis (`@upstash/ratelimit`) with sliding window
- **Development**: In-memory fallback (auto-detected when Upstash env vars absent)
- **Presets**: standard (100/min), strict (20/min), burst (10/10s), pdf (5/min), upload (30/min)
- **Applied to**: All POST endpoints, PDF generation, photo/video/document uploads, admin routes, health check

## Input Validation

- **Zod schemas** validate all API inputs (request bodies, form data, query params)
- **Type coercion** and string length limits enforced
- **File uploads** validated for size and MIME type:
  - Photos: max 25MB, JPEG/PNG/HEIC/WebP only
  - Videos: max 500MB, video/* MIME types only
  - Documents: max 50MB, PDF/images/Word only

## SQL Injection

- **Prisma ORM** used exclusively — all queries are parameterised
- No raw SQL in the codebase (except `SELECT 1` health check)
- No string concatenation in database queries

## XSS Protection

- **React JSX** auto-escapes rendered values
- **Content Security Policy** restricts script sources
- **X-Content-Type-Options: nosniff** prevents MIME sniffing
- **X-XSS-Protection: 1; mode=block** (legacy browsers)
- Sanitisation utilities available in `src/lib/validation.ts`

## Security Headers

Configured in `next.config.ts`:

| Header | Value |
|--------|-------|
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload |
| X-Frame-Options | SAMEORIGIN |
| X-Content-Type-Options | nosniff |
| X-XSS-Protection | 1; mode=block |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(self), microphone=(), geolocation=(self) |
| Content-Security-Policy | Comprehensive CSP (see next.config.ts) |

## Evidence Integrity

- **SHA-256 hashing** of all uploaded files on server receipt
- **EXIF metadata** preserved for chain of custody (GPS, timestamps, camera data)
- **Audit logging** on all report mutations (AuditLog table)
- Original files stored unmodified in Cloudflare R2

## Error Handling

- Generic error messages returned in production
- Detailed errors only in development via `src/lib/api-error.ts`
- Zod validation errors always return field-level details (safe to expose)
- Server-side `console.error` for full error context

## Environment Variables

- Validated on startup via `src/lib/env.ts`
- Application fails immediately if required secrets are missing
- No secrets exposed in client bundles (`NEXT_PUBLIC_` prefix only for safe values)

## Dependencies

- `@clerk/nextjs` — authentication
- `@prisma/client` — database ORM (parameterised queries)
- `zod` — input validation
- `@upstash/ratelimit` + `@upstash/redis` — distributed rate limiting
- `sharp` — image processing (server-only)
- `jose` — JWT handling

## Reporting Security Issues

Contact: luke@ranz.org.nz
