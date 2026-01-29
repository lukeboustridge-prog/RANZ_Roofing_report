# Functional Gap Analysis - RANZ Roofing Report

**Application:** RANZ Roofing Report (reports.ranz.org.nz)
**Date:** 2026-01-29
**Tester:** Claude (Automated Analysis)
**Priority:** HIGH - Not GSD-built, requires thorough verification
**Plan Reference:** Phase 09 Plan 02

---

## Overview

This document provides a comprehensive functional gap analysis checklist for the RANZ Roofing Report application. As a satellite application that was not fully built through the GSD (Get Shit Done) planning process, it requires additional verification to ensure feature completeness and integration correctness.

The Roofing Report platform enables RANZ inspectors to create legally defensible, ISO 17020-compliant roofing inspection reports for disputes, court proceedings, and LBP Board complaints.

---

## Authentication Flows

### SSO Integration (Phase 3 Implementation)

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| AUTH-01 | Session cookie from Quality Program recognized | [ ] Pending | ranz_session cookie with JWT |
| AUTH-02 | Dual-auth middleware accepts Clerk tokens | [ ] Pending | Legacy auth support |
| AUTH-03 | Dual-auth middleware accepts custom JWT tokens | [ ] Pending | New custom auth flow |
| AUTH-04 | Auth mode switching works per-user | [ ] Pending | AUTH_MODE env + per-user authMode |
| AUTH-05 | Sign-out broadcasts to all apps | [ ] Pending | Cross-app logout |
| AUTH-06 | Token verification uses public key only | [ ] Pending | Satellite cannot sign tokens |
| AUTH-07 | Invalid tokens redirect to Quality Program sign-in | [ ] Pending | Redirect to portal.ranz.org.nz |

### Protected Routes

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| AUTH-08 | /dashboard requires authentication | [ ] Pending | |
| AUTH-09 | /reports requires authentication | [ ] Pending | |
| AUTH-10 | /reports/new requires authentication | [ ] Pending | |
| AUTH-11 | /reports/:id/* requires authentication | [ ] Pending | |
| AUTH-12 | /admin/* requires RANZ admin role | [ ] Pending | |
| AUTH-13 | /profile requires authentication | [ ] Pending | |
| AUTH-14 | /settings requires authentication | [ ] Pending | |
| AUTH-15 | /analytics requires authentication | [ ] Pending | |
| AUTH-16 | /review requires authentication | [ ] Pending | |
| AUTH-17 | API routes validate auth headers | [ ] Pending | |

### Public Routes

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| AUTH-18 | / (home) accessible without auth | [ ] Pending | |
| AUTH-19 | /sign-in accessible without auth | [ ] Pending | |
| AUTH-20 | /inspectors (public list) accessible without auth | [ ] Pending | |
| AUTH-21 | /shared/:token accessible without auth | [ ] Pending | Token-based access |
| AUTH-22 | /request-inspection accessible without auth | [ ] Pending | |

---

## Report Workflow

### Report Creation (3-Step Wizard)

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| RPT-01 | Create new report from dashboard | [ ] Pending | "New Report" button |
| RPT-02 | Step 1: Property address required | [ ] Pending | |
| RPT-03 | Step 1: City required | [ ] Pending | |
| RPT-04 | Step 1: Region dropdown populated with NZ regions | [ ] Pending | 16 regions |
| RPT-05 | Step 1: Postcode required | [ ] Pending | |
| RPT-06 | Step 1: Property type selection works | [ ] Pending | 6 types |
| RPT-07 | Step 1: Building age optional | [ ] Pending | |
| RPT-08 | Step 2: Inspection date required | [ ] Pending | Date picker |
| RPT-09 | Step 2: Inspection type selection works | [ ] Pending | 7 types |
| RPT-10 | Step 2: Weather conditions optional | [ ] Pending | |
| RPT-11 | Step 2: Access method optional | [ ] Pending | |
| RPT-12 | Step 2: Limitations textarea | [ ] Pending | |
| RPT-13 | Step 3: Client name required | [ ] Pending | |
| RPT-14 | Step 3: Client email optional | [ ] Pending | |
| RPT-15 | Step 3: Client phone optional | [ ] Pending | |
| RPT-16 | Next button disabled until step complete | [ ] Pending | Validation |
| RPT-17 | Back button navigates to previous step | [ ] Pending | |
| RPT-18 | Create Report submits to API | [ ] Pending | POST /api/reports |
| RPT-19 | Successful creation redirects to report page | [ ] Pending | |
| RPT-20 | Error handling shows user-friendly message | [ ] Pending | |

### Report Detail Pages

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| RPT-21 | Report overview page loads | [ ] Pending | /reports/:id |
| RPT-22 | Report edit page loads | [ ] Pending | /reports/:id/edit |
| RPT-23 | Report photos page loads | [ ] Pending | /reports/:id/photos |
| RPT-24 | Report defects page loads | [ ] Pending | /reports/:id/defects |
| RPT-25 | Report elements page loads | [ ] Pending | /reports/:id/elements |
| RPT-26 | Report compliance page loads | [ ] Pending | /reports/:id/compliance |
| RPT-27 | Report evidence page loads | [ ] Pending | /reports/:id/evidence |
| RPT-28 | Report audit log page loads | [ ] Pending | /reports/:id/audit |
| RPT-29 | Report submit page loads | [ ] Pending | /reports/:id/submit |
| RPT-30 | Report PDF page loads | [ ] Pending | /reports/:id/pdf |
| RPT-31 | Report revisions page loads | [ ] Pending | /reports/:id/revisions |
| RPT-32 | Executive summary page loads | [ ] Pending | /reports/:id/executive-summary |

### Report List/Search

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| RPT-33 | Reports list page shows report cards | [ ] Pending | |
| RPT-34 | Search/filter functionality works | [ ] Pending | ReportSearch component |
| RPT-35 | Report status badges display correctly | [ ] Pending | DRAFT, IN_PROGRESS, etc. |
| RPT-36 | Pagination works for large lists | [ ] Pending | |

---

## Photo Management

### Photo Upload

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| PHT-01 | Photo upload accepts JPEG files | [ ] Pending | |
| PHT-02 | Photo upload accepts PNG files | [ ] Pending | |
| PHT-03 | EXIF metadata extracted and displayed | [ ] Pending | exifr library |
| PHT-04 | GPS coordinates captured from EXIF | [ ] Pending | |
| PHT-05 | Photo hash generated for integrity | [ ] Pending | SHA-256 |
| PHT-06 | Thumbnail generation works | [ ] Pending | sharp library |
| PHT-07 | Photo type selection works | [ ] Pending | OVERVIEW, CONTEXT, DETAIL |
| PHT-08 | Photo can be linked to roof element | [ ] Pending | |
| PHT-09 | Photo can be linked to defect | [ ] Pending | |

### Photo Annotation

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| PHT-10 | Photo annotation interface loads | [ ] Pending | /reports/:id/photos/:photoId/annotate |
| PHT-11 | Draw on photo functionality | [ ] Pending | |
| PHT-12 | Add markers/arrows | [ ] Pending | |
| PHT-13 | Save annotations | [ ] Pending | |

### Photo Evidence Integrity

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| PHT-14 | Original file hash preserved | [ ] Pending | |
| PHT-15 | Hash verification on retrieval | [ ] Pending | |
| PHT-16 | Edited photos tracked separately | [ ] Pending | isEdited, editedFrom fields |
| PHT-17 | Chain of custody audit trail | [ ] Pending | |

---

## Defect Management

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| DEF-01 | Create new defect | [ ] Pending | |
| DEF-02 | Defect classification selection | [ ] Pending | MAJOR_DEFECT, MINOR_DEFECT, etc. |
| DEF-03 | Defect severity selection | [ ] Pending | CRITICAL, HIGH, MEDIUM, LOW |
| DEF-04 | Observation field (required) | [ ] Pending | Factual description |
| DEF-05 | Analysis field | [ ] Pending | Technical interpretation |
| DEF-06 | Opinion field (clearly labelled) | [ ] Pending | Professional judgment |
| DEF-07 | Code reference linking | [ ] Pending | E2/AS1, COP references |
| DEF-08 | Priority level selection | [ ] Pending | IMMEDIATE, SHORT_TERM, etc. |
| DEF-09 | Recommendation text | [ ] Pending | |
| DEF-10 | Link photos to defect | [ ] Pending | |
| DEF-11 | Edit existing defect | [ ] Pending | |
| DEF-12 | Delete defect | [ ] Pending | |

---

## Roof Elements

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| ELM-01 | Add roof element | [ ] Pending | |
| ELM-02 | Element type selection | [ ] Pending | 18 element types |
| ELM-03 | Location description | [ ] Pending | |
| ELM-04 | Cladding details | [ ] Pending | Type, profile, material |
| ELM-05 | Technical specs | [ ] Pending | Pitch, area, age |
| ELM-06 | Condition rating | [ ] Pending | GOOD, FAIR, POOR, CRITICAL |
| ELM-07 | Compliance checkboxes | [ ] Pending | meetsCop, meetsE2 |
| ELM-08 | Link photos to element | [ ] Pending | |
| ELM-09 | Edit existing element | [ ] Pending | |
| ELM-10 | Delete element | [ ] Pending | |

---

## Compliance Checklists

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| CMP-01 | E2 External Moisture checklist | [ ] Pending | |
| CMP-02 | B2 Durability checklist | [ ] Pending | |
| CMP-03 | Metal Roof COP checklist | [ ] Pending | |
| CMP-04 | Checklist items toggle | [ ] Pending | |
| CMP-05 | Non-compliance summary generated | [ ] Pending | |
| CMP-06 | Checklist progress indicator | [ ] Pending | |

---

## PDF Generation

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| PDF-01 | PDF generates from report data | [ ] Pending | @react-pdf/renderer |
| PDF-02 | RANZ branding applied | [ ] Pending | Logo, colors |
| PDF-03 | All sections included | [ ] Pending | Per report structure |
| PDF-04 | Photos embedded correctly | [ ] Pending | |
| PDF-05 | Executive summary included | [ ] Pending | |
| PDF-06 | Defects register formatted | [ ] Pending | |
| PDF-07 | Compliance summary included | [ ] Pending | |
| PDF-08 | Evidence integrity certificate | [ ] Pending | Hash list |
| PDF-09 | PDF download works | [ ] Pending | |
| PDF-10 | PDF version tracking | [ ] Pending | pdfVersion field |

---

## Admin Functions

### Inspector Management (Phase 5 Implementation)

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| ADM-01 | Inspector list loads from shared auth | [ ] Pending | Quality Program API |
| ADM-02 | Inspector stats badges display | [ ] Pending | Total, Active, Pending, Suspended |
| ADM-03 | Inspector search works | [ ] Pending | |
| ADM-04 | Info banner links to Quality Program | [ ] Pending | portal.ranz.org.nz |
| ADM-05 | Inspector assignments displayed | [ ] Pending | Report count |
| ADM-06 | Report reassignment works | [ ] Pending | |
| ADM-07 | Cannot create inspectors in satellite app | [ ] Pending | Read-only |

### Report Administration

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| ADM-08 | Admin reports list page | [ ] Pending | |
| ADM-09 | Admin can view all reports | [ ] Pending | |
| ADM-10 | Admin can filter by status | [ ] Pending | |
| ADM-11 | Admin can filter by inspector | [ ] Pending | |

### Review Workflow

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| ADM-12 | Reviews list page | [ ] Pending | |
| ADM-13 | Review detail page | [ ] Pending | |
| ADM-14 | Approve report action | [ ] Pending | |
| ADM-15 | Reject/revision required action | [ ] Pending | |
| ADM-16 | Review comments | [ ] Pending | |

### Templates

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| ADM-17 | Templates list page | [ ] Pending | |
| ADM-18 | Template detail/edit page | [ ] Pending | |
| ADM-19 | Create new template | [ ] Pending | |
| ADM-20 | Template sections editor | [ ] Pending | |

### Complaints (LBP)

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| ADM-21 | Complaints list page | [ ] Pending | |
| ADM-22 | Complaint detail page | [ ] Pending | |
| ADM-23 | LBP form auto-fill | [ ] Pending | |

---

## PWA Features

### Service Worker

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| PWA-01 | Service worker registered | [ ] Pending | @ducanh2912/next-pwa |
| PWA-02 | Assets cached for offline | [ ] Pending | Workbox strategies |
| PWA-03 | Offline fallback page works | [ ] Pending | |
| PWA-04 | API responses cached appropriately | [ ] Pending | |

### Offline Mode

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| PWA-05 | Offline indicator shows correct status | [ ] Pending | |
| PWA-06 | Data syncs when back online | [ ] Pending | Dexie IndexedDB |
| PWA-07 | Sync conflicts handled | [ ] Pending | |
| PWA-08 | Draft reports saved offline | [ ] Pending | |
| PWA-09 | Photos queued for upload when offline | [ ] Pending | |

### Push Notifications

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| PWA-10 | Push subscription configured | [ ] Pending | web-push library |
| PWA-11 | Notification permission requested | [ ] Pending | |
| PWA-12 | Report status notifications | [ ] Pending | |

---

## Data Integrity & Audit

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| AUD-01 | Audit log records created | [ ] Pending | AuditAction enum |
| AUD-02 | Report creation logged | [ ] Pending | |
| AUD-03 | Report updates logged | [ ] Pending | |
| AUD-04 | Photo actions logged | [ ] Pending | PHOTO_ADDED, PHOTO_DELETED |
| AUD-05 | Status changes logged | [ ] Pending | |
| AUD-06 | PDF generation logged | [ ] Pending | |
| AUD-07 | Audit log viewable by admin | [ ] Pending | |

---

## API Endpoints

### Reports API

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| API-01 | GET /api/reports (list) | [ ] Pending | |
| API-02 | POST /api/reports (create) | [ ] Pending | |
| API-03 | GET /api/reports/:id (detail) | [ ] Pending | |
| API-04 | PUT /api/reports/:id (update) | [ ] Pending | |
| API-05 | DELETE /api/reports/:id (delete draft) | [ ] Pending | |
| API-06 | POST /api/reports/:id/submit | [ ] Pending | |
| API-07 | GET /api/reports/:id/pdf | [ ] Pending | |

### Photos API

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| API-08 | GET /api/reports/:id/photos | [ ] Pending | |
| API-09 | POST /api/reports/:id/photos | [ ] Pending | |
| API-10 | PUT /api/reports/:id/photos/:photoId | [ ] Pending | |
| API-11 | DELETE /api/reports/:id/photos/:photoId | [ ] Pending | |

### Defects API

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| API-12 | GET /api/reports/:id/defects | [ ] Pending | |
| API-13 | POST /api/reports/:id/defects | [ ] Pending | |
| API-14 | PUT /api/reports/:id/defects/:defectId | [ ] Pending | |
| API-15 | DELETE /api/reports/:id/defects/:defectId | [ ] Pending | |

### Elements API

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| API-16 | GET /api/reports/:id/elements | [ ] Pending | |
| API-17 | POST /api/reports/:id/elements | [ ] Pending | |
| API-18 | PUT /api/reports/:id/elements/:elementId | [ ] Pending | |
| API-19 | DELETE /api/reports/:id/elements/:elementId | [ ] Pending | |

---

## Known Issues / Observations

Document any issues found during testing here.

### Critical Issues
_None documented yet_

### High Priority
_None documented yet_

### Medium Priority
_None documented yet_

### Low Priority
_None documented yet_

---

## Coverage Summary

| Category | Total Tests | Passed | Failed | Pending |
|----------|-------------|--------|--------|---------|
| Authentication | 22 | 0 | 0 | 22 |
| Report Workflow | 36 | 0 | 0 | 36 |
| Photo Management | 17 | 0 | 0 | 17 |
| Defect Management | 12 | 0 | 0 | 12 |
| Roof Elements | 10 | 0 | 0 | 10 |
| Compliance Checklists | 6 | 0 | 0 | 6 |
| PDF Generation | 10 | 0 | 0 | 10 |
| Admin Functions | 23 | 0 | 0 | 23 |
| PWA Features | 12 | 0 | 0 | 12 |
| Data Integrity | 7 | 0 | 0 | 7 |
| API Endpoints | 19 | 0 | 0 | 19 |
| **TOTAL** | **174** | **0** | **0** | **174** |

---

## Next Steps

1. Execute E2E tests in development environment
2. Manual verification of checklist items
3. Document any issues found in Known Issues section
4. Create bug tickets for failures
5. Retest after fixes
6. Sign off on functional completeness

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |

---

*Document generated: 2026-01-29*
*Phase: 09-quality-control*
*Plan: 02*
