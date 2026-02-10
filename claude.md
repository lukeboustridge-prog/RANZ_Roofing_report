# RANZ Roofing Report — Web Application

Next.js web app for creating, editing, reviewing, and generating ISO 17020-compliant roofing inspection reports.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database**: PostgreSQL (Neon) via Prisma ORM
- **Auth**: Clerk (satellite domain of RANZ Quality Program portal)
- **Storage**: Cloudflare R2
- **PDF**: Puppeteer (server-side rendering)
- **Forms**: React Hook Form + Zod validation
- **Image Processing**: Sharp (EXIF extraction, thumbnails)

## Directory Structure

```
src/
  app/              # Next.js App Router pages and API routes
  components/       # React components
  contexts/         # React context providers
  hooks/            # Custom React hooks
  lib/              # Utility functions, config, shared logic
  middleware.ts      # Clerk auth middleware
  proxy.ts          # Proxy configuration
  services/         # Business logic services
  test/             # Test files
  types/            # TypeScript type definitions
prisma/
  schema.prisma     # Database schema (SOURCE OF TRUTH)
```

## Coding Conventions

- App Router with Server Components by default; `'use client'` only when needed
- API routes in `src/app/api/` following REST conventions
- Prisma for all database access — no raw SQL
- Zod schemas for all form validation and API input
- Clerk `auth()` for server-side auth, `useAuth()` client-side
- shadcn/ui components as the base — extend, don't replace
- Tailwind utility classes — avoid custom CSS unless necessary
- All photos hashed (SHA-256) on upload before any processing

## Key Patterns

- **Report Editor**: Multi-step wizard with auto-save (7 steps: Property > Inspection > Elements > Defects > Compliance > Conclusions > Sign-off)
- **Photo Upload**: Original stored unmodified, display and thumbnail versions generated separately
- **Audit Logging**: All report mutations logged to AuditLog with userId, action, timestamp
- **RBAC**: Checked at API route level using Clerk roles (SUPER_ADMIN, ADMIN, APPOINTED_INSPECTOR, MEMBER)

## Database

Schema at `prisma/schema.prisma`. Run migrations with `npx prisma migrate dev`. Generate client with `npx prisma generate`.

## End-User Documentation

User-facing guides in `docs/`:
- Quick start: `docs/quick-start.md`
- Inspector guide: `docs/inspector-guide.md`
- Reviewer guide: `docs/reviewer-guide.md`
- Admin guide: `docs/admin-guide.md`
- FAQ & troubleshooting: `docs/faq.md`

**Important:** Any changes to UI workflows, form fields, status flows, routes, roles, or user-facing functionality must be accompanied by updates to the relevant `docs/` files. Check which guides are affected and update them to match the new behaviour.

## Reference Docs

For detailed specs, read from `../claude_docs/`:
- API endpoints and DTOs: `../claude_docs/api-design.md`
- PDF report structure: `../claude_docs/pdf-report-structure.md`
- UI design system: `../claude_docs/ui-design-system.md`
- Security and evidence chain: `../claude_docs/security-and-evidence.md`
- LBP complaint automation: `../claude_docs/lbp-complaint-automation.md`
- LBP API and auth: `../claude_docs/lbp-api-and-auth.md`
- Feature specifications: `../claude_docs/feature-specs.md`
- Compliance standards: `../claude_docs/compliance-standards.md`
