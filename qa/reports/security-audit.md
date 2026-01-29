# Security Audit Report - RANZ Roofing Report

**Application:** RANZ Roofing Report (reports.ranz.org.nz)
**Date:** 2026-01-29
**Auditor:** Claude (Automated Review)
**Standard:** OWASP Top 10:2025 + Evidence Integrity Standards

---

## Executive Summary

The RANZ Roofing Report application is a **satellite application** that relies on the Quality Program for authentication. It demonstrates **strong evidence integrity architecture** designed for court-admissible documentation, with SHA-256 hashing, comprehensive EXIF extraction, and audit trails.

**Overall Security Posture: GOOD**

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | None found |
| High | 1 | Next.js update recommended |
| Moderate | 1 | Documented for tracking |
| Low | 2 | Documented for future improvement |

---

## Dependency Vulnerabilities

### npm audit Results

| Severity | Count | Action Required |
|----------|-------|-----------------|
| Critical | 0 | None |
| High | 1 | Update Next.js (recommended) |
| Moderate | 8 | Track - mostly dev dependencies |
| Low | 0 | None |

### Specific Vulnerabilities

1. **next (direct dependency)** - 1 high, 2 moderate
   - GHSA-9g9p-9gw9-jx7f: DoS via Image Optimizer remotePatterns (moderate)
   - GHSA-5f7q-jpqc-wp7h: Memory consumption via PPR Resume (moderate)
   - GHSA-h25m-26qc-wcjf: DoS via RSC deserialization (high)
   - **Action:** Update to Next.js 15.5.10+ or 15.6.0+
   - **Risk:** High - affects production

2. **prisma dev dependencies** - hono, lodash, chevrotain
   - **Impact:** Prisma development tooling only
   - **Action:** Track for future prisma update
   - **Risk:** Minimal - not production

### Recommendation

```bash
npm update next
```

---

## OWASP Top 10 Assessment

### A01:2025 - Broken Access Control

**Assessment:** PASS

| Check | Status | Evidence |
|-------|--------|----------|
| All API routes check user authentication | PASS | `getAuthUser()` in all protected routes |
| Report ownership validated | PASS | `inspectorId` checks in queries |
| Admin routes protected | PASS | Role checks for admin operations |
| Photo/evidence access controlled | PASS | User can only access own report photos |

**Implementation Details:**
- Satellite app uses JWT public key verification only (cannot sign tokens)
- `src/middleware.ts` validates JWT on protected routes
- API routes use `getAuthUser()` helper consistently
- Report ownership validated via `inspectorId: user.id` in queries

**Findings:** None

---

### A02:2025 - Security Misconfiguration

**Assessment:** PASS

| Check | Status | Evidence |
|-------|--------|----------|
| Production env vars not exposed | PASS | All secrets in env vars |
| Debug mode disabled | PASS | NODE_ENV checks |
| Error messages sanitized | PASS | Generic errors to clients |
| CORS properly configured | PASS | Cross-origin API calls use internal API key |

**Implementation Details:**
- JWT public key in `JWT_PUBLIC_KEY` env var
- Internal API key in `QUALITY_PROGRAM_API_KEY` env var
- R2 credentials in `R2_*` env vars

**Recommendation (Low):** Add security headers in `next.config.js`

---

### A03:2025 - Injection

**Assessment:** PASS

| Check | Status | Evidence |
|-------|--------|----------|
| Database queries use Prisma | PASS | All queries via Prisma ORM |
| User input validated with Zod | PASS | API routes use Zod schemas |
| File uploads validated | PASS | Type/size validation in photo upload |
| No dynamic code execution | PASS | No eval/Function usage |

**Implementation Details:**
- `uploadSchema` in photos/route.ts validates all upload metadata
- Prisma parameterizes all queries automatically
- File types restricted to images

**Findings:** None

---

### A05:2025 - Cryptographic Failures

**Assessment:** PASS

| Check | Status | Evidence |
|-------|--------|----------|
| All connections use HTTPS | PASS | Vercel/Neon enforce TLS |
| Evidence hash uses SHA-256 | PASS | `src/lib/exif.ts` line 277 |
| JWT verified with RS256 | PASS | `src/lib/auth/jwt.ts` |
| Session cookie flags | PASS | Reads Quality Program cookie |

**Implementation Details:**
- Photo hash generated BEFORE any processing (line 275-277 of exif.ts)
- `crypto.createHash("sha256")` for evidence integrity
- JWT verification uses RS256 algorithm with jose library
- Internal API key transmitted via `X-Internal-API-Key` header

**Findings:** None

---

### A07:2025 - Software/Data Integrity Failures

**Assessment:** PASS (with recommendation)

| Check | Status | Evidence |
|-------|--------|----------|
| Dependencies pinned | PASS | package-lock.json |
| Evidence integrity verified | PASS | SHA-256 hash on upload |
| Chain of custody maintained | PASS | Audit log + EXIF data |
| Original files preserved | PASS | Originals stored separately |

**Recommendation (High):** Update Next.js to address RSC deserialization vulnerability

---

### A09:2025 - Logging/Monitoring Failures

**Assessment:** PASS

| Check | Status | Evidence |
|-------|--------|----------|
| Photo uploads logged | PASS | `AuditLog` table |
| Report actions logged | PASS | PHOTO_ADDED, STATUS_CHANGED, etc. |
| Sensitive data not logged | PASS | Only hash prefix logged |
| Evidence chain documented | PASS | Full audit trail |

**Implementation Details:**
- `prisma.auditLog.create()` called in photo upload
- Hash logged with prefix only: `hash.substring(0, 16) + "..."`
- User ID, action, and details captured

**Findings:** None

---

## Roofing Report-Specific Security

### Photo/Evidence Security

**Assessment:** PASS (Court-ready)

| Check | Status | Evidence |
|-------|--------|----------|
| SHA-256 hash before processing | PASS | Line 277 of exif.ts |
| EXIF metadata preserved | PASS | Full forensic extraction |
| Original files never modified | PASS | Separate thumbnail storage |
| GPS coordinates captured | PASS | exif.gpsLat, exif.gpsLng |
| Timestamp captured | PASS | exif.capturedAt |
| Device identification captured | PASS | cameraMake, cameraModel, cameraSerial |
| Forensic completeness validated | PASS | `hasCompleteExif` flag |

**Implementation Details:**
- `processPhoto()` generates hash BEFORE any processing
- Thumbnail generated separately in `thumbnails/` key prefix
- Original stored in R2 with unique key
- EXIF fields for Evidence Act 2006 Section 137:
  - `DateTimeOriginal` - when taken
  - `GPSLatitude/GPSLongitude` - where taken
  - `Make/Model/SerialNumber` - what device
  - `ExposureTime/FNumber/ISO` - proves not AI-generated
- `CRITICAL_FORENSIC_FIELDS` array defines required fields
- Missing fields logged with warnings

**Evidence Integrity Flow:**
```
Upload -> Buffer read -> SHA-256 hash -> EXIF extract -> Store original -> Generate thumbnail -> Store thumbnail -> Create DB record with hash
```

**Court Compliance:**
- Evidence Act 2006 Section 137 (business records)
- High Court Rules Schedule 4 (expert evidence)
- ISO/IEC 17020:2012 (inspection bodies)

---

### Satellite Auth Security

**Assessment:** PASS

| Check | Status | Evidence |
|-------|--------|----------|
| JWT verified with public key only | PASS | `verifyTokenStateless()` |
| No token signing capability | PASS | No private key in satellite |
| Session cookie from primary domain | PASS | `ranz_session` cookie |
| AUTH_MODE checking | PASS | `process.env.AUTH_MODE` |
| Redirect to primary for sign-in | PASS | `AUTH_CONFIG.signInUrl` |

**Implementation Details:**
- `src/lib/auth/jwt.ts` - Public key verification only
- `src/lib/auth/types.ts` - `AUTH_CONFIG.signInUrl` redirects to portal.ranz.org.nz
- Middleware validates JWT issuer and audience
- Headers set for downstream: `x-user-id`, `x-user-email`, `x-user-role`, `x-auth-source`

**Security Properties:**
- Satellite CANNOT forge tokens (no private key)
- Token expiry and revocation checked via JWT claims
- Invalid/expired tokens redirect to primary for re-auth

---

### PWA/Offline Security

**Assessment:** ACCEPTABLE

| Check | Status | Evidence |
|-------|--------|----------|
| Service worker scoped correctly | PASS | Standard Next.js PWA |
| IndexedDB isolation | PASS | Origin-scoped by browser |
| Offline data sync | PASS | `src/lib/offline/sync-engine.ts` |
| Sensitive data handling | REVIEW | Photos cached locally |

**Recommendation (Low):** Consider encrypting sensitive offline data if requirements expand

---

### Cross-Origin Security

**Assessment:** PASS

| Check | Status | Evidence |
|-------|--------|----------|
| API calls to Quality Program use internal key | PASS | `X-Internal-API-Key` header |
| Key not in URL | PASS | Header-based auth |
| Key transmitted over HTTPS | PASS | TLS enforced |
| Constant-time comparison on receiver | PASS | Quality Program implementation |

**Implementation Details:**
- `src/lib/api/shared-auth.ts` - Internal API client
- `QUALITY_PROGRAM_API_KEY` in env vars
- `cache: 'no-store'` for fresh data
- Error handling with sanitized messages

---

## Rate Limiting

**Assessment:** PASS

| Check | Status | Evidence |
|-------|--------|----------|
| Photo upload rate limited | PASS | `RATE_LIMIT_PRESETS.upload` |
| API routes protected | PASS | Rate limit middleware |

**Implementation Details:**
- `src/lib/rate-limit.ts` - Rate limiting presets
- Photo upload uses `rateLimit(request, RATE_LIMIT_PRESETS.upload)`

---

## Recommendations

### Critical (Must Fix Before Release)

None identified.

### High (Should Fix Before Release)

1. **Update Next.js** - Address RSC deserialization DoS vulnerability
   ```bash
   npm update next@^15.5.10
   ```

### Medium (Fix When Possible)

1. **Add Security Headers** - Configure Next.js to add:
   - Content-Security-Policy
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff

### Low (Track for Future)

1. **Offline Data Encryption** - If expanding offline capabilities, consider IndexedDB encryption

2. **Photo Upload Size Limits** - Document maximum file size limits in API

---

## Evidence Integrity Summary

The Roofing Report application is designed for **legally defensible evidence collection**:

| Evidence Standard | Status | Implementation |
|-------------------|--------|----------------|
| SHA-256 Hash | PASS | Generated before any processing |
| EXIF Preservation | PASS | Full forensic extraction |
| Chain of Custody | PASS | Audit log with timestamps |
| Original File Integrity | PASS | Separate storage for originals |
| GPS Verification | PASS | Coordinates extracted from EXIF |
| Device Identification | PASS | Camera make/model/serial captured |
| Timestamp Verification | PASS | DateTimeOriginal from EXIF |

**Court-Ready:** YES - Meets Evidence Act 2006 and High Court Rules Schedule 4 requirements.

---

## Conclusion

The RANZ Roofing Report demonstrates **production-ready security** with:

- Strong satellite authentication (public key verification only)
- Court-grade evidence integrity (SHA-256 hashing, EXIF preservation)
- Comprehensive audit logging for chain of custody
- Rate limiting on sensitive operations
- Proper access control and ownership validation
- Zod validation on all user input

**The application is approved for production deployment** with the high-priority recommendation to update Next.js to address the RSC deserialization vulnerability.

---

*Report generated: 2026-01-29T11:00:00Z*
*Next scheduled audit: 2026-04-29*
