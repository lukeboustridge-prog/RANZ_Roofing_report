# FAQ & Troubleshooting

Common questions and solutions for the RANZ Roofing Report platform.

---

## Account & Access

### How do I reset my password?

Your account is managed through **Clerk** via the RANZ Quality Program portal. To reset your password:

1. Go to **portal.ranz.org.nz**
2. Click **Sign In**, then **Forgot Password**
3. Follow the email instructions to set a new password

Your new password applies to both the Quality Program portal and the Roofing Report platform (SSO).

### Why does the platform redirect me to portal.ranz.org.nz?

The Roofing Report app operates as a **satellite domain** of the RANZ Quality Program. Authentication is handled by the primary portal. Once signed in at portal.ranz.org.nz, you are automatically authenticated on reports.ranz.org.nz.

---

## Reports & Submission

### Why can't I submit my report?

The **pre-submission checklist** (`/reports/[id]/submit`) validates 6 areas before allowing submission. Common blockers:

| Check | Common Fix |
|-------|------------|
| Property details incomplete | Fill in all required fields (address, city, region, postcode, property type) |
| Inspection details incomplete | Ensure inspection date and type are set |
| Insufficient roof elements | Add at least the minimum number of roof elements |
| Not enough photos | Upload more photos — check the minimum count shown |
| Compliance not assessed | Complete the E2/B2/COP compliance checklists |
| Declaration not signed | Complete all 7 Expert Declaration checkboxes and sign |

Each failing section has a direct link to the relevant page so you can fix it quickly.

### Can I edit a report after submission?

**No.** Once submitted, a report is locked and moves to **Pending Review**. Only a reviewer can unlock it by requesting a revision, which changes the status to **Revision Required**. You can then make changes and resubmit.

If you notice an error immediately after submitting, contact your reviewer or an administrator.

### How do I duplicate a report?

On any report with **Approved** or **Finalised** status, click the **Duplicate** button in the report header. This creates a new draft pre-filled with the original report's property details, inspection settings, and structure — but with a fresh report number and no photos or signatures.

This is useful for inspecting similar properties (e.g., a townhouse development).

---

## Photos & Evidence

### What EXIF data is required for court reports?

For reports of type **Dispute Resolution** or **Warranty Claim**, the system enforces strict EXIF requirements:

| EXIF Field | Why It Matters |
|------------|----------------|
| **GPS coordinates** (latitude, longitude) | Proves the photo was taken at the property |
| **Timestamp** (date and time captured) | Establishes when the evidence was captured |
| **Camera make and model** | Identifies the capture device for chain of custody |

Photos without GPS data will trigger a warning during pre-submission validation. Use the mobile app or ensure location services are enabled on your camera.

### How does evidence integrity work?

Every photo uploaded to the platform is processed as follows:

1. A **SHA-256 hash** is computed from the original file before any processing
2. The **original file** is stored unmodified in encrypted cloud storage (Cloudflare R2)
3. A **display version** and **thumbnail** are generated separately for the UI
4. The hash is stored in the database and can be verified at any time

This creates a verifiable **chain of custody**. The Evidence Integrity panel on each report (`/reports/[id]/evidence`) shows hash verification status for all photos.

### What is the three-level photo method?

The platform uses a three-level documentation method for photographic evidence:

| Level | Purpose | Example |
|-------|---------|---------|
| **Overview** | Establishes the overall context of the property and roof | Wide shot of the entire building from the street |
| **Context** | Shows the specific area where a defect is located | Photo of the affected roof section or element |
| **Detail** | Close-up of the specific defect or issue | Macro shot of the cracked flashing or corroded fixing |

When uploading photos, select the appropriate **Photo Type** (Overview, Context, or Detail) to categorise them correctly. This structure is required for ISO 17020 compliance and helps courts understand the spatial relationship between the property and the defect.

---

## Compliance & Standards

### What building codes does the compliance check cover?

The compliance assessment covers three standards:

| Standard | Full Name | Scope |
|----------|-----------|-------|
| **E2** | NZBC Clause E2 — External Moisture | Weathertightness of the building envelope |
| **B2** | NZBC Clause B2 — Durability | Expected service life of building elements |
| **Metal Roof COP** | NZ Metal Roofing Manufacturers Association Code of Practice | Installation standards for metal roofing systems |

Each standard has a checklist of items assessed as **Pass**, **Fail**, **Partial**, or **N/A**. The compliance page (`/reports/[id]/compliance`) shows progress and overall coverage percentage.

---

## Sharing & Export

### How do I share a report with a client?

On any **Approved** or **Finalised** report, click the **Share** button in the report header:

1. Choose an **access level**:
   - **View Only** — recipient can view the report online
   - **View & Download** — recipient can also download the PDF
2. Optionally set an **expiry date** and **password**
3. Enter the recipient's **name and email** (optional, for audit purposes)
4. Click **Create Share Link**

The system generates a unique token-based URL (`/shared/[token]`) that you can send to the client. You can revoke access at any time from the report's share settings.

---

## Status & Workflow

### What do the status colours mean?

| Status | Colour | Meaning |
|--------|--------|---------|
| **Draft** | Grey | Report created but not yet started |
| **In Progress** | Orange | Inspector is actively working on the report |
| **Pending Review** | Yellow | Submitted and waiting for a reviewer |
| **Under Review** | Blue | A reviewer is currently examining the report |
| **Revision Required** | Red/Orange | Reviewer has requested changes |
| **Approved** | Green | Report has passed review |
| **Finalised** | Dark Green | Report is locked and PDF is generated |
| **Archived** | Grey | Report has been archived |

### What is the full status flow?

```
Draft → In Progress → Pending Review → Under Review → Approved → Finalised
                                                    ↓
                                           Revision Required
                                            (back to editing)
```

---

## Offline & PWA

### How do I work offline?

The platform is a **Progressive Web App (PWA)**. To install it:

1. Open the platform in Chrome, Edge, or Safari
2. Look for the **Install** prompt in the browser address bar (or use the browser menu)
3. Click **Install** to add it to your device

Once installed, you can work offline. Changes are saved locally and synced when you reconnect. A **sync status indicator** in the navigation bar shows your connection state and any pending uploads.

### What works offline?

- Viewing previously loaded reports
- Adding photos from your device
- Editing report content (defects, elements, notes)
- Drafting new entries

What requires a connection:
- Creating new reports
- Submitting for review
- Generating PDFs
- Sharing reports
- Admin functions

### How are sync conflicts resolved?

If the same report is edited on multiple devices while offline, the system uses **last-write-wins** with the following safeguards:

- Each change is timestamped
- Conflicting edits are flagged in the sync queue
- You are prompted to review conflicts before they are applied
- The audit trail preserves the full history of all changes

---

## Need More Help?

- **Full Inspector Guide**: [inspector-guide.md](./inspector-guide.md)
- **Reviewer Guide**: [reviewer-guide.md](./reviewer-guide.md)
- **Admin Guide**: [admin-guide.md](./admin-guide.md)
- **Platform support**: Contact your RANZ administrator or email support@ranz.org.nz
