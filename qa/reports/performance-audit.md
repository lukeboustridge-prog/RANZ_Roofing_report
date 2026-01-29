# Performance Audit Report - RANZ Roofing Report

**Application:** RANZ Roofing Report (reports.ranz.org.nz)
**Date:** 2026-01-29
**Tool:** Lighthouse CI
**Requirement:** QCTL-05 - Page load <2s, API response <500ms

## Executive Summary

This document establishes the performance baseline and targets for the RANZ Roofing Report application. As a PWA (Progressive Web App), special attention is given to service worker performance and offline capability.

## Performance Targets (QCTL-05)

| Metric | Target | Lighthouse Assertion |
|--------|--------|---------------------|
| First Contentful Paint (FCP) | <2000ms | error if exceeded |
| Largest Contentful Paint (LCP) | <2500ms | error if exceeded |
| Time to Interactive (TTI) | <3500ms | error if exceeded |
| Cumulative Layout Shift (CLS) | <0.1 | error if exceeded |
| Total Blocking Time (TBT) | <300ms | warning if exceeded |
| Performance Score | >80% | error if below |
| Accessibility Score | >90% | error if below |
| Best Practices Score | >90% | error if below |
| SEO Score | >80% | warning if below |

## Pages Under Test

The following pages are included in the Lighthouse CI configuration:

### 1. Home Page (/)
| Metric | Target | Baseline | Status |
|--------|--------|----------|--------|
| First Contentful Paint | <2000ms | TBD | Pending |
| Largest Contentful Paint | <2500ms | TBD | Pending |
| Time to Interactive | <3500ms | TBD | Pending |
| Cumulative Layout Shift | <0.1 | TBD | Pending |
| Total Blocking Time | <300ms | TBD | Pending |

### 2. Sign-in Page (/sign-in)
| Metric | Target | Baseline | Status |
|--------|--------|----------|--------|
| First Contentful Paint | <2000ms | TBD | Pending |
| Largest Contentful Paint | <2500ms | TBD | Pending |
| Time to Interactive | <3500ms | TBD | Pending |
| Cumulative Layout Shift | <0.1 | TBD | Pending |
| Total Blocking Time | <300ms | TBD | Pending |

### 3. Dashboard (/dashboard)
| Metric | Target | Baseline | Status |
|--------|--------|----------|--------|
| First Contentful Paint | <2000ms | TBD | Pending |
| Largest Contentful Paint | <2500ms | TBD | Pending |
| Time to Interactive | <3500ms | TBD | Pending |
| Cumulative Layout Shift | <0.1 | TBD | Pending |
| Total Blocking Time | <300ms | TBD | Pending |

### 4. Reports Page (/reports)
| Metric | Target | Baseline | Status |
|--------|--------|----------|--------|
| First Contentful Paint | <2000ms | TBD | Pending |
| Largest Contentful Paint | <2500ms | TBD | Pending |
| Time to Interactive | <3500ms | TBD | Pending |
| Cumulative Layout Shift | <0.1 | TBD | Pending |
| Total Blocking Time | <300ms | TBD | Pending |

## Lighthouse Scores Summary

| Page | Performance | Accessibility | Best Practices | SEO | PWA |
|------|-------------|---------------|----------------|-----|-----|
| / | TBD | TBD | TBD | TBD | TBD |
| /sign-in | TBD | TBD | TBD | TBD | TBD |
| /dashboard | TBD | TBD | TBD | TBD | TBD |
| /reports | TBD | TBD | TBD | TBD | TBD |

**Note:** Baseline values will be captured during first Lighthouse CI run.

## API Response Time Targets

| Endpoint | Method | Target | Notes |
|----------|--------|--------|-------|
| /api/auth/login | POST | <500ms | Authentication endpoint |
| /api/auth/logout | POST | <500ms | Session termination |
| /api/reports | GET | <500ms | Report list |
| /api/reports | POST | <500ms | Create report |
| /api/reports/[id] | GET | <500ms | Report detail |
| /api/reports/[id]/photos | POST | <2000ms | Photo upload (larger payload) |
| /api/reports/[id]/pdf | GET | <5000ms | PDF generation (compute-intensive) |
| /api/admin/inspectors | GET | <500ms | Inspector list |

## PWA Performance Considerations

### Service Worker Caching
The application uses Workbox for service worker caching:
- **Precaching:** Critical assets cached on install
- **Runtime caching:** API responses cached with stale-while-revalidate
- **Offline support:** Core functionality available offline

### PWA Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Service Worker Registration | <1000ms | From page load |
| Precache Size | <5MB | Initial cache budget |
| Offline Load Time | <1000ms | From service worker cache |
| Background Sync Queue | <100 items | Pending sync limit |

### Offline Mode Performance
| Feature | Target | Notes |
|---------|--------|-------|
| Report viewing (cached) | <500ms | From IndexedDB |
| Photo viewing (cached) | <200ms | From IndexedDB/Cache API |
| Form submission (offline) | <100ms | Queued for sync |
| Sync resume | <5000ms | Per batch of 10 items |

## Photo Upload Performance

Photo upload is a critical workflow for inspectors in the field:

| Scenario | Target | Notes |
|----------|--------|-------|
| Single photo upload (3MB) | <3000ms | With compression |
| Batch upload (10 photos) | <15000ms | Sequential with progress |
| EXIF extraction | <100ms | Per photo |
| Thumbnail generation | <200ms | Per photo |
| Hash verification | <50ms | Per photo |

## PDF Generation Performance

| Scenario | Target | Notes |
|----------|--------|-------|
| Simple report (10 photos) | <5000ms | Server-side rendering |
| Complex report (50 photos) | <15000ms | With pagination |
| PDF download (10MB) | <3000ms | Depends on network |

## Core Web Vitals Summary

### Targets
- **FCP (First Contentful Paint):** <2000ms - Time until first content rendered
- **LCP (Largest Contentful Paint):** <2500ms - Time until largest element rendered
- **CLS (Cumulative Layout Shift):** <0.1 - Visual stability score
- **TBT (Total Blocking Time):** <300ms - Main thread blocking time

### Current Status
Baseline measurements pending initial Lighthouse CI run.

## Running Performance Audits

### Local Development
```bash
# Build the application first
npm run build

# Run Lighthouse CI
npm run lighthouse
```

### CI Pipeline
The `npm run lighthouse` command will:
1. Start the production server
2. Run 3 Lighthouse audits per URL
3. Assert against defined performance budgets
4. Upload results to temporary public storage
5. Fail the build if assertions are not met

## Performance Optimization Recommendations

### Pre-emptive Optimizations (Applied)
1. **Next.js App Router** - Server components reduce client-side JavaScript
2. **Workbox PWA** - Efficient service worker caching
3. **Image optimization** - Sharp for server-side compression
4. **Dexie IndexedDB** - Fast local data storage for offline mode

### Recommended if Targets Not Met
1. **Photo compression** - Reduce upload size before transmission
2. **Lazy loading** - Defer loading of photos not in viewport
3. **Virtual scrolling** - For long report lists
4. **Skeleton loading** - Improve perceived performance
5. **Bundle analysis** - Identify and code-split large dependencies
6. **Font subsetting** - Load only required character sets

### PWA-Specific Optimizations
1. **Selective caching** - Cache critical routes, defer others
2. **Background sync** - Queue operations when offline
3. **Compression** - Brotli/gzip for cached resources
4. **Cache versioning** - Efficient cache invalidation

## Issues Found

### Critical (Blocking Release)
None identified - baseline pending

### High Priority (Should Fix)
None identified - baseline pending

### Recommendations
1. Run `npm run lighthouse` after initial production build
2. Test offline mode performance separately
3. Monitor photo upload times on slow connections

## Conclusion

Performance infrastructure is in place with Lighthouse CI configured to enforce QCTL-05 requirements. As a PWA, additional consideration has been given to offline performance and service worker caching strategies. The configuration will automatically fail builds that exceed performance budgets.

---

*Report generated: 2026-01-29*
*Next review: After initial Lighthouse CI run*
