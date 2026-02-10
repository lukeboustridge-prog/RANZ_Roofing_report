# Reviewer Guide

This guide covers the review workflow for users with **Reviewer**, **Admin**, or **Super Admin** roles.

## Role Requirements

Only users with one of the following roles can access the review queue:

| Role | Can Review | Can Also |
|------|-----------|----------|
| **Reviewer** | Yes | — |
| **Admin** | Yes | Manage users, templates, analytics |
| **Super Admin** | Yes | All admin functions + LBP complaint submission |

If you see an "Access Denied" message when navigating to the review queue, your account does not have a reviewer role. Contact a Super Admin to update your permissions.

---

## Accessing the Review Queue

Navigate to **Review Queue** (`/review`) from the sidebar. The page displays:

### Stats Cards

Three summary cards at the top of the page:

- **Pending Review** — Reports submitted and waiting for someone to start reviewing
- **Under Review** — Reports currently being reviewed by someone
- **Total in Queue** — Combined count of all reports in the queue

### Filter

Use the dropdown to filter between:
- **Pending Review** — Reports waiting for a reviewer to pick them up
- **Under Review** — Reports someone has started reviewing

### Report Cards

Each report in the queue shows:
- Report number (e.g., `RR-2026-00042`)
- Property address and city
- Inspector name
- Inspection type (Full Inspection, Dispute Resolution, etc.)
- Submission date
- Content summary (photo count, defect count)
- Status badge (Pending or Under Review)

---

## Reviewing a Report

### Starting a Review

1. Find a report with **Pending Review** status in the queue
2. Click **Start Review**
3. The report status changes to **Under Review**, indicating that you have claimed it

### What to Check

When reviewing a report, assess the following areas:

**Property & Inspection Details**
- Address is complete and correct
- Inspection type matches the scope of work
- Weather conditions and limitations are documented
- Access method is noted

**Photographic Evidence**
- Sufficient photos are included (check the count)
- Photos follow the three-level method (Overview, Context, Detail)
- EXIF metadata is present (GPS coordinates, timestamps, camera data)
- For court reports (Dispute Resolution, Warranty Claim): GPS data is mandatory

**Defect Documentation**
- Each defect follows the three-part structure: Observation, Analysis, Opinion
- Severity classifications are appropriate (Critical, High, Medium, Low)
- Defect classifications are correct (Major Defect, Minor Defect, Safety Hazard, Maintenance Item, Workmanship Issue)
- Code references are provided where applicable (E2, B2, COP)
- Recommendations include priority levels and estimated costs where relevant

**Compliance Assessment**
- E2, B2, and COP checklists are completed to the required coverage level
- Non-compliance items are clearly described

**Evidence Integrity**
- SHA-256 hashes are verified for all photos
- No evidence of tampering
- Chain of custody is maintained

**Court Compliance** (for Dispute Resolution and Warranty Claim reports)
- Expert Witness Declaration is fully signed
- All 7 declaration checkboxes are confirmed
- Conflict of interest disclosure is addressed
- Digital signature is present

You can view the full report by clicking **View Report**, which opens the report detail page (`/reports/[id]`).

---

## Making a Decision

Once you have reviewed the report, you have three options:

### Approve

Click the green **Approve** button. A dialog opens where you can:
- Add optional comments for the inspector
- Confirm the approval

The report moves to **Approved** status. The inspector receives a notification.

### Request Revision

Click **Request Revision**. A dialog opens with:

1. **Revision checklist** — Select the items that need attention:
   - Missing photos for documented defects
   - Incomplete defect descriptions
   - Missing GPS/location data
   - Unclear severity classifications
   - Missing code references
   - Insufficient evidence for conclusions
   - Formatting issues
   - Missing inspector signature

2. **Comments** — Add specific feedback explaining what needs to change

Click **Request Revision** to confirm. The report moves to **Revision Required** status. The inspector receives a notification with your feedback and can view it on the revisions page (`/reports/[id]/revisions`).

### Reject

Click the red **Reject** button. A dialog opens where you must:
- Provide a written reason for rejection

The report is rejected and returned to the inspector. Use this sparingly — prefer **Request Revision** in most cases, as it provides structured feedback.

---

## After Review

### Notification

The inspector receives an in-app notification (and email, if enabled in their preferences) with:
- The decision (Approved, Revision Required, or Rejected)
- Your comments
- For revisions: the specific checklist items that need fixing

### Revision Rounds

When you request a revision:

1. The report's **revision round** counter increments
2. The inspector makes changes and resubmits
3. The report returns to **Pending Review** in your queue
4. You can compare changes between revision rounds

Each revision round preserves the previous review comments, creating a full history of feedback and responses.

### Tracking

All review actions are recorded in the report's **Audit Trail** (`/reports/[id]/audit-log`), including:
- When the review started
- Who reviewed it
- The decision made
- Comments and revision items
- Timestamps for every action

---

## Best Practices

- **Start reviews promptly** — Reports in Pending Review are visible to all reviewers. Clicking Start Review claims it and prevents duplicate reviews.
- **Be specific in feedback** — When requesting revisions, use the checklist items and add clear comments about exactly what needs to change.
- **Check court compliance** — For Dispute Resolution and Warranty Claim reports, pay extra attention to EXIF data, GPS coordinates, and the Expert Witness Declaration.
- **Review the audit trail** — If a report has been through multiple revision rounds, check the audit log to understand the history.

---

## Related Guides

- [Inspector Guide](./inspector-guide.md) — How inspectors create and submit reports
- [Admin Guide](./admin-guide.md) — Platform administration and user management
- [FAQ](./faq.md) — Common questions and troubleshooting
