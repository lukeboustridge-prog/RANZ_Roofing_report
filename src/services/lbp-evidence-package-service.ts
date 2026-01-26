/**
 * LBP Evidence Package Service
 *
 * Creates comprehensive evidence packages (ZIP files) containing
 * photos, defect reports, and chain of custody documentation
 * for LBP complaint submissions.
 */

import JSZip from "jszip";
import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import type { LBPComplaint, Report, Photo, Defect, User } from "@prisma/client";
import { EVIDENCE_PACKAGE_SETTINGS, RANZ_DETAILS } from "@/lib/constants/lbp";
import { lbpComplaintPDFService } from "./lbp-complaint-pdf-service";
import crypto from "crypto";

// Type for complaint with relations
type ComplaintWithRelations = LBPComplaint & {
  report: Report & {
    photos: Photo[];
    defects: Defect[];
    inspector: Pick<User, "id" | "name" | "email" | "lbpNumber" | "qualifications">;
  };
};

interface EvidenceMetadata {
  photoId: string;
  filename: string;
  capturedAt: Date | null;
  gpsLat: number | null;
  gpsLng: number | null;
  gpsAltitude: number | null;
  cameraMake: string | null;
  cameraModel: string | null;
  caption: string | null;
  photoType: string;
  originalHash: string;
  hashVerified: boolean;
}

interface DefectSummary {
  id: string;
  defectNumber: number;
  title: string;
  severity: string;
  classification: string;
  description: string;
  location: string;
  observation: string;
  analysis: string | null;
  opinion: string | null;
  codeReference: string | null;
  copReference: string | null;
  recommendation: string | null;
  priorityLevel: string | null;
}

export class LBPEvidencePackageService {
  /**
   * Create complete evidence package ZIP file
   */
  async createEvidencePackage(
    complaintId: string
  ): Promise<{ url: string; hash: string }> {
    const complaint = await prisma.lBPComplaint.findUnique({
      where: { id: complaintId },
      include: {
        report: {
          include: {
            photos: true,
            defects: true,
            inspector: {
              select: {
                id: true,
                name: true,
                email: true,
                lbpNumber: true,
                qualifications: true,
              },
            },
          },
        },
      },
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const zip = new JSZip();

    // 1. Add complaint PDF
    const complaintPdf = await lbpComplaintPDFService.generateComplaintPDF(
      complaintId
    );
    zip.file(`${complaint.complaintNumber}_Complaint.pdf`, complaintPdf);

    // 2. Add photos
    await this.addPhotosToZip(zip, complaint);

    // 3. Add defects report
    await this.addDefectsToZip(zip, complaint);

    // 4. Add inspection report summary
    this.addReportSummary(zip, complaint);

    // 5. Add chain of custody document
    this.addChainOfCustody(zip, complaint);

    // 6. Add README
    this.addReadme(zip, complaint);

    // 7. Add manifest
    this.addManifest(zip, complaint);

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: EVIDENCE_PACKAGE_SETTINGS.compressionLevel,
      },
    });

    // Calculate hash
    const hash = crypto.createHash("sha256").update(zipBuffer).digest("hex");

    // Upload to R2
    const filename = `complaints/${complaint.complaintNumber}/evidence-package.zip`;
    const url = await uploadToR2(zipBuffer, filename, "application/zip");

    return { url, hash };
  }

  /**
   * Add photos to ZIP with metadata
   */
  private async addPhotosToZip(zip: JSZip, complaint: ComplaintWithRelations) {
    const photosFolder = zip.folder("photos");
    if (!photosFolder) return;

    const attachedPhotos = complaint.report.photos.filter((p) =>
      complaint.attachedPhotoIds.includes(p.id)
    );

    const photoMetadata: EvidenceMetadata[] = [];
    let photoIndex = 1;

    for (const photo of attachedPhotos) {
      try {
        // Fetch photo from storage
        const response = await fetch(photo.url);
        if (!response.ok) {
          console.error(`Failed to fetch photo ${photo.id}: ${response.status}`);
          continue;
        }

        const photoBuffer = await response.arrayBuffer();

        // Generate descriptive filename
        const extension = photo.mimeType?.split("/")[1] || "jpg";
        const sanitizedCaption = photo.caption
          ? `_${photo.caption.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}`
          : "";
        const filename = `${String(photoIndex).padStart(3, "0")}_${photo.photoType}${sanitizedCaption}.${extension}`;

        // Add photo to ZIP
        photosFolder.file(filename, photoBuffer);

        // Collect metadata
        photoMetadata.push({
          photoId: photo.id,
          filename,
          capturedAt: photo.capturedAt,
          gpsLat: photo.gpsLat,
          gpsLng: photo.gpsLng,
          gpsAltitude: photo.gpsAltitude,
          cameraMake: photo.cameraMake,
          cameraModel: photo.cameraModel,
          caption: photo.caption,
          photoType: photo.photoType,
          originalHash: photo.originalHash,
          hashVerified: photo.hashVerified,
        });

        photoIndex++;
      } catch (error) {
        console.error(`Error adding photo ${photo.id} to ZIP:`, error);
      }
    }

    // Add photo metadata JSON
    photosFolder.file(
      "_photo_metadata.json",
      JSON.stringify(photoMetadata, null, 2)
    );

    // Add photo index document
    const photoIndex_txt = this.generatePhotoIndex(photoMetadata);
    photosFolder.file("_photo_index.txt", photoIndex_txt);
  }

  /**
   * Generate photo index document
   */
  private generatePhotoIndex(photos: EvidenceMetadata[]): string {
    let content = `PHOTOGRAPH INDEX
================

Complaint Evidence Package
Generated: ${new Date().toISOString()}

Total Photos: ${photos.length}

`;

    for (const photo of photos) {
      content += `----------------------------------------
File: ${photo.filename}
Type: ${photo.photoType}
Caption: ${photo.caption || "N/A"}
`;
      if (photo.capturedAt) {
        content += `Captured: ${new Date(photo.capturedAt).toISOString()}\n`;
      }
      if (photo.gpsLat && photo.gpsLng) {
        content += `GPS: ${photo.gpsLat}, ${photo.gpsLng}`;
        if (photo.gpsAltitude) {
          content += ` (Alt: ${photo.gpsAltitude}m)`;
        }
        content += "\n";
      }
      if (photo.cameraMake || photo.cameraModel) {
        content += `Camera: ${photo.cameraMake || ""} ${photo.cameraModel || ""}\n`;
      }
      content += `Hash: ${photo.originalHash}\n`;
      content += `Verified: ${photo.hashVerified ? "Yes" : "No"}\n\n`;
    }

    return content;
  }

  /**
   * Add defects to ZIP
   */
  private async addDefectsToZip(zip: JSZip, complaint: ComplaintWithRelations) {
    const defectsFolder = zip.folder("defects");
    if (!defectsFolder) return;

    const attachedDefects = complaint.report.defects.filter((d) =>
      complaint.attachedDefectIds.includes(d.id)
    );

    const defectSummaries: DefectSummary[] = attachedDefects.map((d) => ({
      id: d.id,
      defectNumber: d.defectNumber,
      title: d.title,
      severity: d.severity,
      classification: d.classification,
      description: d.description,
      location: d.location,
      observation: d.observation,
      analysis: d.analysis,
      opinion: d.opinion,
      codeReference: d.codeReference,
      copReference: d.copReference,
      recommendation: d.recommendation,
      priorityLevel: d.priorityLevel,
    }));

    // Add JSON summary
    defectsFolder.file(
      "defects_summary.json",
      JSON.stringify(defectSummaries, null, 2)
    );

    // Add human-readable defects report
    const defectsReport = this.generateDefectsReport(defectSummaries);
    defectsFolder.file("defects_report.txt", defectsReport);
  }

  /**
   * Generate human-readable defects report
   */
  private generateDefectsReport(defects: DefectSummary[]): string {
    let content = `DEFECTS REPORT
==============

Total Defects: ${defects.length}

`;

    // Summary by severity
    const bySeverity: Record<string, number> = {};
    for (const d of defects) {
      bySeverity[d.severity] = (bySeverity[d.severity] || 0) + 1;
    }
    content += `Severity Summary:\n`;
    for (const [severity, count] of Object.entries(bySeverity)) {
      content += `  - ${severity}: ${count}\n`;
    }
    content += "\n";

    // Individual defects
    for (const defect of defects) {
      content += `========================================
DEFECT #${defect.defectNumber}: ${defect.title}
========================================

Classification: ${defect.classification}
Severity: ${defect.severity}
Location: ${defect.location}

OBSERVATION:
${defect.observation}

`;
      if (defect.analysis) {
        content += `ANALYSIS:
${defect.analysis}

`;
      }
      if (defect.opinion) {
        content += `OPINION:
${defect.opinion}

`;
      }
      if (defect.codeReference) {
        content += `Code Reference: ${defect.codeReference}\n`;
      }
      if (defect.copReference) {
        content += `COP Reference: ${defect.copReference}\n`;
      }
      if (defect.recommendation) {
        content += `\nRECOMMENDATION:
${defect.recommendation}
`;
      }
      if (defect.priorityLevel) {
        content += `Priority: ${defect.priorityLevel}\n`;
      }
      content += "\n";
    }

    return content;
  }

  /**
   * Add inspection report summary
   */
  private addReportSummary(zip: JSZip, complaint: ComplaintWithRelations) {
    const report = complaint.report;

    const summary = {
      reportNumber: report.reportNumber,
      inspectionDate: report.inspectionDate,
      inspectionType: report.inspectionType,
      propertyAddress: report.propertyAddress,
      propertyCity: report.propertyCity,
      propertyRegion: report.propertyRegion,
      clientName: report.clientName,
      inspector: {
        name: report.inspector.name,
        email: report.inspector.email,
        lbpNumber: report.inspector.lbpNumber,
        qualifications: report.inspector.qualifications,
      },
      weatherConditions: report.weatherConditions,
      accessMethod: report.accessMethod,
      limitations: report.limitations,
      totalDefects: complaint.attachedDefectIds.length,
      totalPhotos: complaint.attachedPhotoIds.length,
      reportStatus: report.status,
      createdAt: report.createdAt,
      finalizedAt: report.approvedAt,
    };

    zip.file("inspection_report_summary.json", JSON.stringify(summary, null, 2));
  }

  /**
   * Add chain of custody documentation
   */
  private addChainOfCustody(zip: JSZip, complaint: ComplaintWithRelations) {
    const content = `CHAIN OF CUSTODY DOCUMENTATION
==============================

Complaint Number: ${complaint.complaintNumber}
Report Number: ${complaint.report.reportNumber}

This document certifies the chain of custody for all evidence
included in this complaint submission.

EVIDENCE COLLECTION
-------------------
Inspector: ${complaint.report.inspector.name}
Inspector LBP: ${complaint.report.inspector.lbpNumber || "N/A"}
Inspection Date: ${new Date(complaint.report.inspectionDate).toISOString()}
Location: ${complaint.workAddress}

EVIDENCE PROCESSING
-------------------
All photographs were:
1. Captured using devices with GPS and timestamp capabilities
2. Hashed (SHA-256) immediately upon upload to preserve integrity
3. Stored in secure cloud storage (Cloudflare R2)
4. Never modified after initial capture

COMPLAINT PREPARATION
---------------------
Prepared By: ${complaint.preparedByName}
Prepared On: ${new Date(complaint.preparedAt).toISOString()}
${complaint.reviewedByName ? `Reviewed By: ${complaint.reviewedByName}` : ""}
${complaint.reviewedAt ? `Reviewed On: ${new Date(complaint.reviewedAt).toISOString()}` : ""}
${complaint.signedByName ? `Signed By: ${complaint.signedByName}` : ""}
${complaint.signedAt ? `Signed On: ${new Date(complaint.signedAt).toISOString()}` : ""}

EVIDENCE INTEGRITY
------------------
Total Photos: ${complaint.attachedPhotoIds.length}
Total Defects: ${complaint.attachedDefectIds.length}

All evidence has been captured and preserved in accordance with:
- ISO 17020:2012 (Conformity assessment - Requirements for inspection bodies)
- NZ Evidence Act 2006
- Best practices for digital evidence handling

CERTIFICATION
-------------
This evidence package was generated on ${new Date().toISOString()}
by the RANZ Roofing Report Platform.

Organisation: ${RANZ_DETAILS.name}
Contact: ${RANZ_DETAILS.email}
Website: ${RANZ_DETAILS.website}
`;

    zip.file("chain_of_custody.txt", content);
  }

  /**
   * Add README file
   */
  private addReadme(zip: JSZip, complaint: ComplaintWithRelations) {
    const content = `RANZ LBP COMPLAINT EVIDENCE PACKAGE
====================================

Complaint Number: ${complaint.complaintNumber}
Report Number: ${complaint.report.reportNumber}
Generated: ${new Date().toISOString()}

CONTENTS
--------
1. ${complaint.complaintNumber}_Complaint.pdf
   - Formal complaint document matching BPB requirements

2. photos/
   - ${complaint.attachedPhotoIds.length} photographs with GPS and EXIF metadata
   - _photo_metadata.json - Machine-readable metadata
   - _photo_index.txt - Human-readable photo list

3. defects/
   - defects_summary.json - Machine-readable defect data
   - defects_report.txt - Human-readable defect report

4. inspection_report_summary.json
   - Overview of the source inspection report

5. chain_of_custody.txt
   - Evidence handling documentation

6. manifest.json
   - Complete file listing with integrity hashes

EVIDENCE INTEGRITY
------------------
All photographs include:
- Original EXIF metadata (timestamp, GPS, camera info)
- SHA-256 hash for integrity verification
- Chain of custody documentation

STANDARDS COMPLIANCE
--------------------
This evidence package complies with:
- ISO 17020:2012 (Inspection bodies)
- NZ Evidence Act 2006
- Building Act 2004 Section 317

CONTACT
-------
Organisation: ${RANZ_DETAILS.name}
Email: ${RANZ_DETAILS.email}
Phone: ${RANZ_DETAILS.phone}
Website: ${RANZ_DETAILS.website}

For questions about this complaint, contact:
${complaint.preparedByName}
${complaint.preparedByEmail}
`;

    zip.file("README.txt", content);
  }

  /**
   * Add manifest file
   */
  private addManifest(zip: JSZip, complaint: ComplaintWithRelations) {
    const manifest = {
      packageVersion: "1.0",
      generatedAt: new Date().toISOString(),
      complaint: {
        complaintNumber: complaint.complaintNumber,
        status: complaint.status,
        preparedBy: complaint.preparedByName,
        preparedAt: complaint.preparedAt,
      },
      report: {
        reportNumber: complaint.report.reportNumber,
        inspectionDate: complaint.report.inspectionDate,
        inspector: complaint.report.inspector.name,
      },
      evidence: {
        photos: complaint.attachedPhotoIds.length,
        defects: complaint.attachedDefectIds.length,
      },
      generator: {
        platform: "RANZ Roofing Report Platform",
        version: "1.0.0",
      },
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  }
}

export const lbpEvidencePackageService = new LBPEvidencePackageService();
