# UAT Checklist

Pre-pilot human verification items extracted from phases 6-10.
Each item requires manual testing with real data and user accounts.

---

## PDF & Court Readiness (Phase 6)

### 1. Visual PDF Output Check
- [ ] Generate a test PDF from an approved report
- [ ] Confirm the amber warning box in Section 3.5 (Limitations) is visually prominent
- [ ] Confirm the court disclaimer box renders correctly
- **Expected:** Dedicated limitations page with amber background (#fffbeb), bold uppercase heading, separate gray court notice box

### 2. Round-Trip Data Persistence
- [ ] Enter methodology text and equipment list in the report editor
- [ ] Save the report, navigate away, then return
- [ ] Verify methodology and equipment fields display the original values
- **Expected:** Data persists through save/reload cycle without loss or corruption

### 3. Compliance Section PDF Rendering
- [ ] Generate a PDF for a report with compliance assessments completed
- [ ] Verify Section 7 renders E2/AS1, Metal Roof COP, and B2 Durability tables
- [ ] Verify pass/fail/partial/NA badge colours are correct
- **Expected:** Three compliance tables with colour-coded status badges

---

## Notifications & Sharing (Phase 7)

### 4. Email and Push Notification Delivery
- [ ] Submit a report for review and verify the inspector receives an email notification
- [ ] Assign an inspector to an assignment and verify they receive in-app + email notification
- [ ] Approve/reject a report and verify the inspector receives all notification types
- **Expected:** Emails arrive via Resend, in-app notifications appear in the bell icon, push notifications fire if subscribed

---

## Search, Filtering & Templates (Phase 8)

### 5. Severity Filter
- [ ] Create reports with defects of different severities (Critical, High, Medium, Low)
- [ ] Navigate to /reports, expand filters, select "Critical" from Defect Severity
- [ ] Verify only reports containing at least one CRITICAL defect appear
- [ ] Clear filter and verify full list returns
- **Expected:** Prisma relation filter correctly narrows results; pagination recalculates

### 6. Compliance Status Filter
- [ ] Create reports with compliance assessments containing different statuses
- [ ] Select "Fail" from Compliance Status dropdown
- [ ] Verify only reports with at least one failed compliance item appear
- **Expected:** Post-fetch JSON filtering returns matching reports only

### 7. Inspector Filter RBAC
- [ ] As a non-admin user, verify the inspector filter is hidden or non-functional
- [ ] As an admin user, filter by a specific inspector name
- [ ] Verify report list shows only that inspector's reports
- **Expected:** Server-side RBAC prevents non-admin access to other inspectors' reports

### 8. Date Field Selector
- [ ] Create reports with different dates for inspectionDate, createdAt, submittedAt, approvedAt
- [ ] Select "Created Date" from Date Field dropdown, set a date range
- [ ] Verify results match the selected date field
- [ ] Switch to "Inspection Date" and verify results change accordingly
- **Expected:** Dynamic date field mapping applies date range to the correct column

### 9. Template Selection Pre-Populates Fields
- [ ] Create a template with name, inspectionType, and pre-filled scopeOfWorks/methodology/equipment
- [ ] Navigate to /reports/new, select the template on step 1
- [ ] Proceed through wizard and submit
- [ ] Open the created report editor and verify fields contain template content
- **Expected:** Template selection pre-fills inspectionType immediately; after creation, scopeOfWorks/methodology/equipment are populated

### 10. Template Selection is Optional
- [ ] Navigate to /reports/new, skip the Template step (click Next without selecting)
- [ ] Complete remaining steps and submit
- [ ] Verify report is created successfully without any template data
- **Expected:** Wizard allows skipping the optional template step

### 11. Filter Combination and Clear All
- [ ] Apply multiple filters simultaneously (severity + compliance + date range)
- [ ] Verify reports match all criteria (AND logic)
- [ ] Click "Clear all filters" and verify all filters reset
- **Expected:** Filters combine with AND logic; clear button resets everything

---

## Export, Bulk & Admin (Phase 9)

### 12. Evidence ZIP Download
- [ ] Navigate to an APPROVED or FINALISED report
- [ ] Click "Export Evidence Package" button
- [ ] Verify the ZIP downloads containing: PDF, photos folder, chain_of_custody.txt, manifest.json
- **Expected:** ZIP file with all components present; SHA-256 hash in response

### 13. Batch PDF Generation
- [ ] Navigate to /admin/reports
- [ ] Select 3+ reports via checkboxes, click "Generate PDFs", confirm in dialog
- [ ] Verify toast shows success count, all reports have pdfGeneratedAt updated
- **Expected:** Batch processing completes with audit logs created

### 14. Notification Archiving
- [ ] POST to /api/admin/notifications/archive with thresholdDays in body
- [ ] Verify notifications older than threshold with read=true are now dismissed=true
- [ ] Verify notification bell no longer shows archived items
- **Expected:** Archived count in response; notification list excludes archived items

### 15. Email Template Editor
- [ ] Navigate to /admin/email-templates, seed defaults if empty
- [ ] Click Edit on a template, modify the subject
- [ ] Toggle preview and verify variables are substituted with sample data
- [ ] Save and verify changes persist on reload
- **Expected:** RANZ branded preview with sample data; changes saved successfully

### 16. Swagger UI Documentation
- [ ] Navigate to /admin/api-docs
- [ ] Verify Swagger UI renders with all endpoint groups
- [ ] Try expanding a few endpoints and verifying schemas are present
- **Expected:** Interactive API docs with Reports, PDF, Export, Admin, Batch, Email Templates, Notifications

---

## Admin Polish & Email Wire-Up (Phase 10)

### 17. Email Template Edit Propagation
- [ ] Edit an email template via /admin/email-templates (change subject or body text)
- [ ] Trigger the corresponding email (e.g., submit a report for review)
- [ ] Verify the sent email reflects the admin edits, not hardcoded defaults
- **Expected:** Email uses the modified template content from the database

### 18. Template Service Fallback
- [ ] Temporarily deactivate all email templates in the database (set isActive=false)
- [ ] Trigger an email and verify it still sends using the hardcoded fallback
- **Expected:** Email sends successfully with original hardcoded HTML content

### 19. Admin Dashboard Visual Layout
- [ ] Navigate to /admin
- [ ] Verify 9 quick action cards display correctly across viewport sizes
- [ ] Confirm Email Templates, API Documentation, and All Reports cards are visible with correct icons
- **Expected:** Responsive grid layout with all 9 cards and correct descriptions

---

## Sign-Off

| Tester | Date | Items Passed | Items Failed | Notes |
|--------|------|-------------|-------------|-------|
|        |      |             |             |       |
