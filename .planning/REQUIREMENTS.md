# Requirements: RANZ Roofing Report

**Defined:** 2026-02-07
**Core Value:** Court-admissible roofing reports with tamper-evident evidence chains and ISO 17020 compliance

## v1.1 Requirements

Requirements for pre-pilot hardening. Each maps to roadmap phases.

### PDF & Report Output

- [ ] **PDF-01**: PDF includes methodology section describing inspection approach
- [ ] **PDF-02**: PDF includes equipment/tools section listing instruments used
- [ ] **PDF-03**: PDF includes limitations section documenting access restrictions and caveats
- [ ] **PDF-04**: PDF includes access method section describing how roof was accessed
- [ ] **PDF-05**: PDF includes compliance assessment results (B2/E2/COP analysis with pass/fail/NA)
- [ ] **PDF-06**: User can export evidence package as ZIP (report PDF + original photos + chain of custody certificates)
- [ ] **PDF-07**: Admin can generate PDFs for multiple reports in a single batch operation

### Notifications & Emails

- [ ] **NOTIF-01**: Client receives confirmation email when inspection request is created
- [ ] **NOTIF-02**: Inspector receives notification when assigned to an inspection request
- [ ] **NOTIF-03**: Web push notifications are sent to subscribed users for relevant events
- [ ] **NOTIF-04**: Notifications older than a configurable threshold are automatically archived
- [ ] **NOTIF-05**: Admin can view and customise email notification templates

### Search & Filtering

- [ ] **SRCH-01**: User can filter reports by defect severity level
- [ ] **SRCH-02**: User can filter reports by compliance assessment status
- [ ] **SRCH-03**: User can filter reports by assigned inspector
- [ ] **SRCH-04**: User can filter reports by date range (creation, inspection, review dates)

### Sharing & Access

- [ ] **SHARE-01**: Shared report with password requires password entry before granting access

### Templates & Workflow

- [ ] **TMPL-01**: User can select and apply a saved template when creating a new report

### API Documentation

- [ ] **API-01**: OpenAPI/Swagger specification is generated from API routes and served at a documentation endpoint

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Export & Integrations

- **EXP-01**: User can export reports as formatted XLSX with multiple sheets
- **EXP-02**: User can export reports as JSON-LD for semantic data exchange
- **EXP-03**: API supports webhook callbacks for report lifecycle events

### Search

- **SRCH-05**: Full-text search across defect descriptions and report content
- **SRCH-06**: User can save and recall search filters

### Admin

- **ADM-01**: Admin can configure organisation-level settings (logo, branding in reports)
- **ADM-02**: Admin can manage custom roles and permissions
- **ADM-03**: Admin can view email delivery tracking and retry failed sends

### Mobile Integration

- **MOB-01**: Web app shows sync conflict resolution UI when mobile conflicts occur
- **MOB-02**: API key authentication for mobile offline request queuing

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time collaboration | Inspectors work solo; complexity vs value |
| AI-powered defect detection | No AI dependency in production (design principle) |
| Multi-language support | NZ-only platform, English sufficient |
| Custom domains per org | Single-tenant model (reports.ranz.org.nz) |
| Payment integration | Reports included with RANZ membership |
| Elasticsearch/vector search | Overkill for current scale; Prisma text search sufficient |
| SMS notifications | Email + web push sufficient for pilot |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PDF-01 | — | Pending |
| PDF-02 | — | Pending |
| PDF-03 | — | Pending |
| PDF-04 | — | Pending |
| PDF-05 | — | Pending |
| PDF-06 | — | Pending |
| PDF-07 | — | Pending |
| NOTIF-01 | — | Pending |
| NOTIF-02 | — | Pending |
| NOTIF-03 | — | Pending |
| NOTIF-04 | — | Pending |
| NOTIF-05 | — | Pending |
| SRCH-01 | — | Pending |
| SRCH-02 | — | Pending |
| SRCH-03 | — | Pending |
| SRCH-04 | — | Pending |
| SHARE-01 | — | Pending |
| TMPL-01 | — | Pending |
| API-01 | — | Pending |

**Coverage:**
- v1.1 requirements: 19 total
- Mapped to phases: 0
- Unmapped: 19

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after initial definition*
