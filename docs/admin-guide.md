# Admin Guide

This guide covers platform administration for users with **Admin** or **Super Admin** roles.

## Role Permissions

| Capability | Admin | Super Admin |
|-----------|-------|-------------|
| Admin dashboard | Yes | Yes |
| Review queue | Yes | Yes |
| User management | Yes | Yes |
| Inspector management | Yes | Yes |
| Report templates | Yes | Yes |
| Analytics | Yes | Yes |
| Audit logs | Yes | Yes |
| LBP complaints (create, edit, review) | Yes | Yes |
| LBP complaints (submit to BPB) | No | **Yes** |
| System settings | No | **Yes** |

---

## Admin Dashboard

Navigate to **Admin** (`/admin`) from the sidebar. The dashboard provides a platform-wide overview.

### Stats Cards

Four summary cards across the top:

| Card | What It Shows |
|------|---------------|
| **Pending Review** | Reports awaiting review |
| **Under Review** | Reports currently being reviewed |
| **Total Reports** | All-time report count across all inspectors |
| **Total Users** | Registered user count (with pending approval count highlighted in orange) |

### Quick Action Cards

Six function cards with direct links:

| Card | Route | Purpose |
|------|-------|---------|
| **Review Queue** | `/admin/reviews` | Review and approve submitted reports |
| **LBP Complaints** | `/admin/complaints` | Manage Building Practitioners Board complaints |
| **User Management** | `/admin/users` | Manage inspectors, reviewers, and admins |
| **Analytics** | `/admin/analytics` | View platform statistics and defect trends |
| **Templates** | `/admin/templates` | Manage report templates |
| **Audit Logs** | `/admin/audit-logs` | View system-wide activity logs |

### Recent Activity

Two panels at the bottom:
- **Reports Needing Review** — The 5 most recently submitted reports awaiting review, with links to the review page
- **Users Pending Approval** — New registrations that need admin approval, with links to the user detail page

---

## User Management

### Viewing All Users

Navigate to **Users** (`/admin/users`). The page lists all registered users with:
- Name, email, role
- Account status (Active, Suspended, Pending Approval)
- Registration date

### Approving Pending Users

New users register through the RANZ Quality Program portal and appear with **Pending Approval** status. To approve:

1. Click on the user from the admin dashboard or user list
2. Review their profile details on the user detail page (`/admin/users/[id]`)
3. Set their role and approve their account

### Editing User Roles

On the user detail page (`/admin/users/[id]`), you can change a user's role:

| Role | What They Can Do |
|------|-----------------|
| **Inspector** | Create reports, submit for review, view own reports |
| **Reviewer** | All Inspector permissions + review queue access |
| **Admin** | All Reviewer permissions + user management, templates, analytics, audit logs, LBP complaints |
| **Super Admin** | All Admin permissions + submit complaints to BPB, system settings |

### User Detail View

Each user's detail page shows:
- Profile information (name, email, phone, company, address)
- Inspector credentials (LBP number, qualifications, years of experience, specialisations)
- Their reports (list with status badges)
- Their assignments (if any)

---

## Inspector Management

### Inspector Directory

Navigate to **Inspectors** (`/admin/inspectors`). This page lists all users with the Inspector role, including:
- Name and contact details
- LBP number
- Specialisations
- Availability status (Available, Busy, On Leave, Not Accepting)
- Service areas

### Creating Assignments

From an inspector's detail page (`/admin/inspectors/[id]/assignments`), you can create new inspection assignments:

1. Enter client details (name, email, phone)
2. Enter the property address
3. Select the inspection type (Full Inspection, Visual Only, Non-Invasive, Invasive, Dispute Resolution, Pre-Purchase, Maintenance Review, Warranty Claim)
4. Set the urgency level:

| Urgency | When to Use |
|---------|-------------|
| **Standard** | Normal turnaround time |
| **Priority** | Faster than standard, client has expressed urgency |
| **Urgent** | Time-sensitive matter, needs attention within days |
| **Emergency** | Immediate response required (e.g., active leak, safety hazard) |

5. Add any notes for the inspector
6. Set a scheduled date (optional)

The inspector receives a notification about the new assignment.

### Assignment Lifecycle

Assignments progress through these statuses:

```
Pending → Accepted → Scheduled → In Progress → Completed
                                              ↘ Cancelled
```

---

## Report Templates

### Managing Templates

Navigate to **Templates** (`/admin/templates`). Templates pre-configure report structures for common inspection types.

### Template List

The page shows all templates with:
- Template name
- Associated inspection type
- Active/inactive status
- Creation and last update dates

### Creating a Template

Click **Create Template** to add a new template:

1. **Name** — Descriptive name (e.g., "Standard Residential Full Inspection")
2. **Description** — Brief explanation of when to use this template
3. **Inspection Type** — Which inspection type this template applies to
4. **Sections** — Pre-configured report sections and checklists (JSON structure)
5. **Active** — Whether inspectors can use this template

### Editing Templates

Click on any template to open the editor (`/admin/templates/[id]`). You can modify all fields and toggle the active status.

### Default Templates

Mark a template as **Default** to have it automatically applied when an inspector creates a report of the matching inspection type. Only one template per inspection type can be the default.

---

## Analytics

Navigate to **Analytics** (`/admin/analytics`). The dashboard provides platform-wide insights through Recharts visualisations:

### Defect Trends

- Time-series chart showing defect counts over time
- Filterable by severity (Critical, High, Medium, Low) and classification (Major Defect, Minor Defect, Safety Hazard, Maintenance Item, Workmanship Issue)
- Useful for identifying systemic issues in specific regions or time periods

### Regional Heatmap

- Geographic distribution of inspection reports and defects across New Zealand regions
- Helps identify areas with higher defect concentrations

### Inspector Performance Metrics

- Reports completed per inspector
- Average review turnaround time
- Revision rate (percentage of reports requiring revision)
- Defect documentation quality indicators

---

## LBP Complaints

The LBP (Licensed Building Practitioner) complaint system allows administrators to prepare and submit formal complaints to the **Building Practitioners Board (BPB)** under the Building Act 2004.

### Creating a Complaint

Complaints are created from **Dispute Resolution** reports:

1. Navigate to **LBP Complaints** (`/admin/complaints`)
2. Click **Create Complaint** and select the source report
3. The system auto-populates:
   - Subject LBP details (from the report)
   - Property and work address
   - Defects and evidence
   - Inspector report reference

### Complaint Form

The complaint detail page (`/admin/complaints/[id]`) contains:

**Subject LBP Information**
- LBP number, name, email, phone, company, address
- License types (Roofing, Design, Site, Carpentry, etc.)
- Whether the license was sighted
- Work type (Carried out, Supervised, or Both)

**Work Details**
- Work address and dates
- Description of the work
- Building consent number and date

**Grounds for Discipline**
Select from Building Act 2004, Section 317 grounds:
- Negligent or incompetent work (s317(1)(b))
- Non-compliant with building consent (s317(1)(c))
- Misrepresented license (s317(1)(d))
- Conviction affecting fitness (s317(1)(da))
- False information for license (s317(1)(e))
- Failed to provide design certificate (s317(1)(f))
- Failed to provide record of work (s317(1)(g))
- Misrepresented competence (s317(1)(h))
- Worked outside competence (s317(1)(h))
- Failed to produce license (s317(1)(i))
- Disreputable conduct (s317(1)(j))

**Evidence**
- Conduct description (what happened)
- Evidence summary
- Steps taken to resolve before complaint
- Attached photos and defects (selected from the source report)
- Witness details (name, contact, role, what they witnessed)

### Complaint Lifecycle

```
Draft → Pending Review → Ready to Submit → Submitted → Acknowledged
                                                          ↓
                                                  Under Investigation
                                                          ↓
                                                  Hearing Scheduled
                                                          ↓
                                                       Decided → Closed
```

At any point before submission, a complaint can be **Withdrawn**.

### Internal Review

Before submission, a senior administrator reviews the complaint:

1. Status moves from **Draft** to **Pending Review**
2. A reviewer examines the complaint and adds review notes
3. If approved, status moves to **Ready to Submit**
4. If changes needed, status returns to **Draft** with feedback

### Digital Signature

Before submission, an authorised signatory must:
1. Accept the declaration
2. Provide a digital signature
3. The signature and timestamp are recorded

### Generating the Complaint PDF

The system generates a BPB-compliant PDF containing:
- Complainant details (RANZ)
- Subject LBP details
- Grounds for discipline with section references
- Conduct description and evidence summary
- Evidence references
- Digital signature
- SHA-256 hash for document integrity

### Assembling Evidence Packages

An evidence package bundles:
- The complaint PDF
- All attached photos (with EXIF data preserved)
- The inspector's report PDF
- Defect documentation
- Any additional attachments

### Submitting to BPB

**Super Admin only.** Once a complaint is in **Ready to Submit** status:

1. Click **Submit to BPB**
2. The system records the submission details (method, date, confirmation)
3. Status moves to **Submitted**

### Tracking BPB Responses

After submission, track the BPB's response:
- BPB reference number
- Acknowledgement date
- Decision (Proceed to Hearing, Dismissed, etc.)
- Decision date
- Outcome details and notes

---

## Audit Logs

### System-Wide Activity Log

Navigate to **Audit Logs** (`/admin/audit-logs`). This page shows all platform activity across every report and user.

### Per-Report Audit Trail

Each report has its own audit trail at `/reports/[id]/audit-log`, accessible from the report detail page.

### What Gets Logged

Every mutation is recorded:

| Action | Logged Details |
|--------|---------------|
| **Report created** | Creator, initial field values |
| **Report updated** | Changed fields, old and new values |
| **Photo added** | Photo filename, hash, EXIF metadata summary |
| **Photo deleted** | Photo ID, reason |
| **Video added** | Video filename, hash |
| **Defect added** | Defect details, severity, classification |
| **Defect updated** | Changed fields |
| **Status changed** | Old status, new status, who changed it |
| **Submitted** | Submitter, timestamp |
| **Reviewed** | Reviewer, decision, comments |
| **Approved** | Approver, comments |
| **PDF generated** | Version number, generation timestamp |
| **Downloaded** | Who downloaded, what format |
| **Shared** | Share recipient, access level, expiry |

Each entry includes the **user ID**, **IP address**, **user agent**, and **timestamp**.

---

## System Settings

**Super Admin only.** Navigate to **Settings** (`/admin/settings`) to configure platform-wide settings.

---

## Related Guides

- [Quick Start Guide](./quick-start.md) — Get started in 5 minutes
- [Inspector Guide](./inspector-guide.md) — Full inspector workflow
- [Reviewer Guide](./reviewer-guide.md) — Review queue and decisions
- [FAQ](./faq.md) — Common questions and troubleshooting
