# Inspector Guide

Complete guide for RANZ-appointed inspectors using the Roofing Report platform.

---

## Getting Started

### Logging In

1. Navigate to **reports.ranz.org.nz**
2. You will be redirected to **portal.ranz.org.nz** (the RANZ Quality Program portal) for authentication
3. Sign in with your RANZ credentials (email and password, or SSO)
4. You are automatically redirected back to the Roofing Report platform

If you are already signed in to the Quality Program portal, you will be authenticated automatically — no additional sign-in required.

### Completing Onboarding

First-time users are directed to the **Onboarding Wizard** (`/onboarding`). This is a 6-step process:

**Step 1: Welcome**
An overview of the platform, what it does, and what you will set up.

**Step 2: Profile**
- Your name (pre-filled from your Clerk account)
- Email address (pre-filled)
- Phone number

**Step 3: Qualifications**
- LBP number (if you hold one)
- Years of roofing experience
- Specialisations (select all that apply)

**Step 4: Company**
- Company name
- Business address

**Step 5: Preferences**
- Default inspection type (pre-fills when creating new reports)
- Default region (pre-fills the region field)
- Notification preferences (email alerts for submissions, approvals, revisions, comments)

**Step 6: Complete**
Confirmation that your profile is set up. Click to proceed to the dashboard.

Your progress is saved after each step. If you close the browser mid-way, you will resume at the step where you left off.

### Dashboard Overview

The **Dashboard** (`/dashboard`) is your home page. It shows:

**Stats Cards** (4 cards across the top)

| Card | What It Shows |
|------|---------------|
| Total Reports | Your all-time report count |
| Drafts | Reports in Draft status |
| In Progress | Reports you are actively working on |
| Completed | Reports that are Approved or Finalised |

**Recent Reports**
A list of your 5 most recent reports, showing:
- Report number (e.g., `RR-2026-00042`)
- Status badge
- Property address and city
- Inspection date

Click any report to open its detail page. Click **New Report** in the top right to start a new inspection.

---

## Creating a Report

Click **New Report** from the dashboard or navigate to `/reports/new`. The 3-step wizard collects the essential information to create a report.

### Step 1: Property Details

| Field | Required | Notes |
|-------|----------|-------|
| Street Address | Yes | Full street address of the property |
| City | Yes | City or town |
| Region | Yes | Select from the 16 NZ regions dropdown |
| Postcode | Yes | 4-digit NZ postcode |
| Property Type | Yes | Residential (1/2/3+ storey), Commercial (Low/High rise), Industrial |
| Building Age | No | Approximate age in years |

### Step 2: Inspection Details

| Field | Required | Notes |
|-------|----------|-------|
| Inspection Date | Yes | Defaults to today |
| Inspection Type | Yes | Full Inspection, Visual Only, Non-Invasive, Invasive, Dispute Resolution, Pre-Purchase, Maintenance Review, Warranty Claim |
| Weather Conditions | No | e.g., "Fine, 18C, light wind" |
| Inspection Methodology | No | ISO 17020 required. Describe the inspection approach, process, and standards followed |
| Equipment Used | No | ISO 17020 required. List all instruments and tools, separated by commas or new lines |
| Access Method | No | e.g., "Ladder, drone, scaffold" |
| Limitations | No | Any areas not inspected or constraints encountered |

**ISO 17020 Fields: Inspection Methodology and Equipment Used**

These two fields appear in the Inspection Details section of the report edit form. While not mandatory to save a report, they are required for ISO 17020 compliance and will appear prominently in the generated PDF report.

**Inspection Methodology** -- Describe your inspection approach in free text. Include the process followed, standards referenced, and scope of the inspection. Example:

> "Visual inspection of all accessible roof areas conducted in accordance with RANZ Roofing Inspection Methodology 2025 and ISO/IEC 17020:2012. Non-invasive assessment with drone supplement for inaccessible areas."

**Equipment Used** -- List all instruments and tools used during the inspection. Enter items separated by commas or on new lines. The system stores these as individual items for structured display in the PDF. Example:

> "Moisture meter (Tramex MRH III), DJI Mini 3 Pro drone, 6m extension ladder, digital camera (Canon EOS R6), measuring tape, spirit level"

Both fields auto-save as you type and persist when you reload the page.

### Step 3: Client Information

| Field | Required | Notes |
|-------|----------|-------|
| Client Name | Yes | Full name of the client |
| Client Email | No | For correspondence and report sharing |
| Client Phone | No | Contact number |

Click **Create Report** to generate the draft. A report number is automatically assigned in the format `RR-YYYY-NNNNN` (e.g., `RR-2026-00042`).

You are redirected to the **Report Detail** page.

---

## Building Your Report

The **Report Detail** page (`/reports/[id]`) is your central hub. It displays:

- Report number and status badge
- Property and inspection summaries
- Quick stats (photo count, defect count, inspection date, client name)
- Quick-action tiles linking to each section
- Preview of recent defects and roof elements

### Adding Roof Elements

Navigate to **Roof Elements** (`/reports/[id]/elements`) from the report detail page.

Roof elements describe each component of the roofing system you inspected. For each element, record:

**Element Type** — Select from:
- Roof Cladding, Ridge, Valley, Hip, Barge, Fascia
- Gutter, Downpipe
- Flashing (Wall), Flashing (Penetration), Flashing (Parapet)
- Skylight, Vent, Antenna Mount, Solar Panel
- Underlay, Insulation, Roof Structure
- Other

**Location** — Where on the roof this element is (e.g., "North-facing slope", "Kitchen extension")

**Cladding Details** (optional)
- Cladding type, profile, material, manufacturer, colour

**Technical Specs** (optional)
- Pitch (degrees), area (m2), age (years)

**Condition Rating** — Rate the overall condition:

| Rating | Meaning |
|--------|---------|
| Good | No defects, performing as intended |
| Fair | Minor wear or cosmetic issues, functional |
| Poor | Significant deterioration, repairs needed |
| Critical | Failure imminent or occurred, immediate action required |
| Not Inspected | Element was inaccessible or outside the scope |

**Compliance Flags** (optional)
- Meets Code of Practice (COP)
- Meets E2 requirements

### Documenting Defects

Navigate to **Defects** (`/reports/[id]/defects`) from the report detail page.

Each defect follows a structured three-part format designed for ISO 17020 compliance and court admissibility:

**Observation** (required) — Factual description of what you see. No interpretation.
> "Corroded fixings observed on the north-facing ridge flashing. Approximately 40% of visible fixings show surface rust with 10% showing significant section loss."

**Analysis** (recommended) — Your professional interpretation of the observation.
> "The corrosion pattern is consistent with the use of mild steel fixings in a coastal environment where stainless steel fixings are required. The rate of deterioration suggests the fixings have been exposed for approximately 5-8 years."

**Opinion** (recommended) — Your expert judgement on consequences and significance.
> "In my opinion, the corroded fixings present an unacceptable risk of cladding detachment during high winds. This constitutes a failure to comply with NZBC Clause E2 and the NZ Metal Roofing COP Section 7.3."

**Additional Fields**

| Field | Required | Notes |
|-------|----------|-------|
| Title | Yes | Short descriptor (e.g., "Corroded ridge fixings") |
| Description | Yes | General description |
| Location | Yes | Where on the property |
| Classification | Yes | Major Defect, Minor Defect, Safety Hazard, Maintenance Item, Workmanship Issue |
| Severity | Yes | Critical, High, Medium, Low |
| Code Reference | No | Building Code clause (e.g., "E2/AS1 9.1.2") |
| COP Reference | No | Code of Practice section (e.g., "COP Section 7.3") |
| Probable Cause | No | What likely caused the defect |
| Contributing Factors | No | Environmental or other factors |
| Recommendation | No | Recommended remediation |
| Priority Level | No | Immediate, Short Term, Medium Term, Long Term |
| Estimated Cost | No | Approximate remediation cost |
| Linked Roof Element | No | Associate with a specific roof element |

### Using Defect Templates

Pre-built defect templates are available for common defect types. When adding a defect, you can select a template to pre-fill the title, description, observation, classification, severity, and code references. Edit the pre-filled content to match your specific findings.

### Uploading Photos

Navigate to **Photos** (`/reports/[id]/photos`) from the report detail page.

**How to Upload**
- Drag and drop photos into the upload area, or click to browse
- Multiple photos can be uploaded at once
- Supported formats: JPEG, PNG, HEIC

**What Happens on Upload**
1. A **SHA-256 hash** is computed from the original file (before any processing)
2. **EXIF metadata** is extracted: GPS coordinates, timestamp, camera make/model/serial, exposure settings
3. The **original file** is stored unmodified in encrypted storage
4. A **display version** and **thumbnail** are generated for the UI

**Photo Types**
When uploading, assign each photo a type:

| Type | Purpose |
|------|---------|
| **Overview** | Wide shot establishing the property and roof context |
| **Context** | Shows the area where a defect or element is located |
| **Detail** | Close-up of a specific defect or feature |
| **Scale Reference** | Photo with a ruler, coin, or other scale indicator |
| **Inaccessible** | Documents an area that could not be accessed |
| **Equipment** | Documents equipment used (drone, moisture meter, etc.) |
| **General** | Any other relevant photo |

**Linking Photos**
Photos can be linked to specific defects or roof elements for direct association in the report.

**Captioning**
Add a caption to each photo describing what it shows. Captions appear in the PDF report beneath each photo.

### Annotating Photos

From the photo gallery, click on a photo and select **Annotate** to open the annotation editor (`/reports/[id]/photos/[photoId]/annotate`).

Available drawing tools:
- **Pen** — Freehand drawing
- **Arrow** — Point to specific features
- **Circle** — Highlight an area
- **Rectangle** — Box an area of interest
- **Text** — Add labels directly on the photo

Annotations are saved as a separate layer. The original photo is never modified — a new annotated version is generated and stored alongside the original.

### Uploading Videos

Navigate to **Videos** (`/reports/[id]/videos`) from the report detail page.

Upload supporting video evidence with:
- Title and description
- The system extracts metadata (timestamp, GPS if available)
- A SHA-256 hash is computed for evidence integrity

### Uploading Documents

Navigate to **Documents** (`/reports/[id]/documents`) from the report detail page.

Attach supporting documents such as:

| Document Type | Examples |
|--------------|---------|
| Building Consent | The building consent document for the property |
| Code of Compliance | Code Compliance Certificate (CCC) |
| Manufacturer Spec | Product data sheets, installation guides |
| Previous Report | Earlier inspection reports for comparison |
| Correspondence | Emails, letters related to the inspection |
| Calibration Cert | Calibration certificates for testing equipment |
| Other | Any other supporting document |

### Compliance Assessment

Navigate to **Compliance** (`/reports/[id]/compliance`) from the report detail page.

The compliance assessment evaluates the roof against three standards:

**E2 — External Moisture (NZBC Clause E2)**
Checklist items covering weathertightness of the building envelope.

**B2 — Durability (NZBC Clause B2)**
Checklist items covering the expected service life of building elements.

**Metal Roof COP — Code of Practice**
Checklist items covering NZ Metal Roofing Manufacturers Association installation standards.

For each checklist item, select:
- **Pass** — Compliant
- **Fail** — Non-compliant
- **Partial** — Partially compliant (requires explanation)
- **N/A** — Not applicable to this property

The compliance page shows your overall **coverage percentage** — how many items you have assessed out of the total. The pre-submission checklist requires minimum coverage.

### Writing the Executive Summary

Navigate to **Executive Summary** (`/reports/[id]/executive-summary`) from the report detail page.

The executive summary captures the key findings for the front section of the PDF report:
- Key findings (bullet points)
- Major defects summary
- Overall roof condition assessment
- Critical recommendations

This is typically the last section you complete before submission, summarising everything documented in the report.

---

## Submitting Your Report

### Pre-Submission Checklist

Navigate to **Submit** (`/reports/[id]/submit`) from the report detail page (or click the **Submit** button).

The system runs validation across 6 areas:

| Section | What It Checks |
|---------|---------------|
| **Property Details** | All required fields are filled (address, city, region, postcode, type) |
| **Inspection Details** | Inspection date and type are set |
| **Roof Elements** | Minimum number of elements documented |
| **Photos** | Minimum photo count met; EXIF metadata count shown |
| **Defects** | Number of defects documented (informational — no minimum) |
| **Compliance** | Minimum coverage percentage on compliance checklists |

A **completion percentage** bar shows your overall progress. Each section shows a green tick or red cross, with links to fix any missing items.

### Court Report Requirements

For **Dispute Resolution** and **Warranty Claim** inspection types, the system enforces stricter requirements:

- All photos must have **GPS coordinates** (location data)
- All photos must have **timestamps** (when captured)
- Camera make/model must be recorded
- The Expert Witness Declaration must be fully completed
- Digital signature is mandatory

Photos missing GPS data will be flagged as warnings during validation.

### Expert Witness Declaration

Once all validation checks pass, complete the **Expert Witness Declaration** — 7 mandatory checkboxes required under High Court Rules Schedule 4:

1. **Expertise & Qualifications** — Confirm you are an expert in roofing inspection and your qualifications are documented
2. **Expert Witness Code of Conduct** — Agree to comply with Schedule 4 and your duty to assist the Court impartially
3. **Impartiality & Independence** — Confirm the report is your independent opinion, not influenced by the engaging party
4. **Conflict of Interest Disclosure** — Declare no conflict, or disclose any potential conflict with a written explanation
5. **Inspection Methodology** — Confirm the inspection was conducted per the scope, to professional standards and ISO/IEC 17020
6. **Evidence Integrity** — Confirm all photos and evidence are genuine and unaltered, with digital hashes computed
7. **Court Compliance** — Agree to comply with Court directions and notify parties if your opinion changes

### Conflict of Interest Disclosure

You must declare whether you have a conflict of interest:
- **No conflict** — Check the "no conflict" box
- **Potential conflict** — Check the "potential conflict" box and provide a written disclosure describing the conflict (e.g., prior relationship with the property owner, financial interest)

### Digital Signature

After completing all 7 declaration items:
1. The signature pad becomes active
2. Draw your signature using your mouse or touchscreen
3. Click **Sign & Save Declaration**
4. Your signature, timestamp, and all declaration responses are saved

### Submitting

Once validated and signed, click **Submit for Review**. The report status changes to **Pending Review** and you receive a confirmation.

---

## After Submission

### Report Status Flow

```
Draft → In Progress → Pending Review → Under Review → Approved → Finalised
                                                     ↓
                                            Revision Required
                                          (edit and resubmit)
```

| Status | What It Means |
|--------|---------------|
| **Draft** | Report created, not yet started |
| **In Progress** | You are actively editing the report |
| **Pending Review** | Submitted, waiting for a reviewer to pick it up |
| **Under Review** | A reviewer is currently examining your report |
| **Revision Required** | Reviewer has requested changes — see feedback |
| **Approved** | Report has passed review |
| **Finalised** | Report is locked, PDF generated |
| **Archived** | Report has been archived |

### Handling Revision Requests

If a reviewer requests revisions:

1. You receive a **notification** (in-app and email if enabled)
2. A yellow **Revisions Required** banner appears on the report detail page
3. Click **View Feedback** or navigate to **Revisions** (`/reports/[id]/revisions`)
4. Review the feedback:
   - Checklist of items flagged by the reviewer (e.g., "Missing photos for documented defects", "Incomplete defect descriptions", "Missing GPS/location data")
   - Written comments from the reviewer
5. Make the required changes to your report
6. Click **Resubmit** to send it back for review

The **revision round** counter tracks how many times the report has been through the review cycle. All previous feedback is preserved.

### Generating and Downloading the PDF

Navigate to **Generate PDF** (`/reports/[id]/pdf`) from the report detail page.

The PDF follows the ISO 17020 report structure:
- Cover page with RANZ branding
- Table of contents
- Inspector credentials and qualifications
- Expert witness declaration and signature
- Property and inspection details
- Roof element assessment
- Defect schedule with photos
- Compliance assessment results
- Executive summary and recommendations
- Evidence integrity certificate (SHA-256 hashes)
- Photo appendix

Click **Download PDF** to save to your device. The PDF version is tracked — each generation increments the version number.

### Sharing Reports

On any **Approved** or **Finalised** report, click the **Share** button in the report header.

1. Set the **access level**:
   - **View Only** — Recipient can view the report online at a unique URL
   - **View & Download** — Recipient can also download the PDF

2. Optional settings:
   - **Expiry date** — Link automatically expires
   - **Password** — Require a password to access
   - **Recipient name and email** — For audit trail purposes

3. Click **Create Share Link** to generate a token-based URL (`/shared/[token]`)

You can revoke any share link at any time. View counts and download counts are tracked.

### Duplicating Reports

On any report, click the **Duplicate** button to create a new draft based on the existing report. The duplicate copies:
- Property details and inspection settings
- Report structure

It does **not** copy:
- Photos, videos, or documents
- Signatures or declarations
- Status (always starts as Draft)
- The report number (a new one is assigned)

This is useful for inspecting multiple units in a development or revisiting a property.

---

## Working Offline (PWA)

### Installing as a PWA

The platform is a Progressive Web App. To install:

1. Open **reports.ranz.org.nz** in Chrome, Edge, or Safari
2. Click the install icon in the browser address bar (or use the browser menu > "Install App")
3. The app is added to your home screen / taskbar

### What Works Offline

- Viewing reports you have previously loaded
- Editing report content (defects, elements, executive summary)
- Adding photos from your device's storage
- Drafting new content

What requires a connection:
- Creating new reports (requires server-side ID generation)
- Submitting reports for review
- Generating PDFs
- Sharing reports
- Admin functions

### Sync Status Indicator

A sync indicator in the navigation bar shows:
- **Online** — Connected and synced
- **Offline** — Working locally, changes queued
- **Syncing** — Uploading queued changes

### Resolving Sync Conflicts

If the same report is edited offline on multiple devices:
- Changes are timestamped and queued
- On reconnection, the system checks for conflicts
- Conflicting edits are flagged for your review
- You can choose which version to keep
- The audit trail preserves all versions

---

## Your Reports List

Navigate to **Reports** (`/reports`) from the sidebar to see all your reports. The list shows:
- Report number and status badge
- Property address and city
- Inspection date
- Last updated date

Use filters and sorting to find specific reports.

---

## Profile & Settings

### Profile

Navigate to **Profile** (`/profile`) to view and update:
- Personal details (name, phone)
- Company information
- Inspector credentials (qualifications, LBP number, experience, specialisations)
- CV upload

### Settings

Navigate to **Settings** (`/settings`) to configure:
- Notification preferences (email alerts for each event type)
- UI preferences (theme, default list view, items per page)
- Default report settings (inspection type, region)

---

## Related Guides

- [Quick Start Guide](./quick-start.md) — Get started in 5 minutes
- [Reviewer Guide](./reviewer-guide.md) — For reviewers
- [Admin Guide](./admin-guide.md) — For administrators
- [FAQ](./faq.md) — Common questions and troubleshooting
