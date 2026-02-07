/**
 * Evidence Export Service
 *
 * Creates comprehensive evidence packages (ZIP files) containing the report PDF,
 * original photographs, photo metadata, chain of custody documentation, and a
 * manifest for court and tribunal submissions.
 *
 * Generalised from LBPEvidencePackageService for all report types.
 */

import JSZip from "jszip";
import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import type { Report, Photo, Defect, User, RoofElement, ComplianceAssessment } from "@prisma/client";
import crypto from "crypto";

// Type for report with all relations needed for the evidence package
type ReportWithRelations = Report & {
  inspector: Pick<User, "id" | "name" | "email" | "lbpNumber" | "qualifications" | "yearsExperience">;
  photos: Photo[];
  defects: (Defect & {
    photos: Photo[];
    roofElement: RoofElement | null;
  })[];
  roofElements: (RoofElement & {
    photos: Photo[];
  })[];
  complianceAssessment: ComplianceAssessment | null;
};

interface PhotoMetadata {
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

const RANZ_ORG = {
  name: "Roofing Association of New Zealand",
  email: process.env.RANZ_EMAIL || "",
  phone: process.env.RANZ_PHONE || "",
  website: "https://www.ranz.org.nz",
} as const;

export class EvidenceExportService {
  /**
   * Create a complete evidence export package ZIP for a report.
   */
  async createExportPackage(
    reportId: string
  ): Promise<{ url: string; hash: string; filename: string }> {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        inspector: {
          select: {
            id: true,
            name: true,
            email: true,
            lbpNumber: true,
            qualifications: true,
            yearsExperience: true,
          },
        },
        photos: {
          orderBy: { sortOrder: "asc" },
        },
        defects: {
          orderBy: { defectNumber: "asc" },
          include: {
            photos: true,
            roofElement: true,
          },
        },
        roofElements: {
          orderBy: { createdAt: "asc" },
          include: {
            photos: {
              orderBy: { sortOrder: "asc" },
              take: 5,
            },
          },
        },
        complianceAssessment: true,
      },
    });

    if (!report) {
      throw new Error("Report not found");
    }

    const zip = new JSZip();

    // 1. Generate and add Report PDF
    await this.addReportPdf(zip, report);

    // 2. Add original photos
    await this.addPhotosToZip(zip, report);

    // 3. Add chain of custody document
    this.addChainOfCustody(zip, report);

    // 4. Add manifest
    this.addManifest(zip, report);

    // Generate ZIP with DEFLATE compression (level 6 for speed/size balance)
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    });

    // Calculate SHA-256 hash of the ZIP
    const hash = crypto.createHash("sha256").update(zipBuffer).digest("hex");

    // Upload to R2
    const zipFilename = `${report.reportNumber}_evidence_package.zip`;
    const r2Key = `exports/${report.reportNumber}.zip`;
    const url = await uploadToR2(zipBuffer, r2Key, "application/zip");

    return { url, hash, filename: zipFilename };
  }

  /**
   * Generate and add the report PDF to the ZIP
   */
  private async addReportPdf(
    zip: JSZip,
    report: ReportWithRelations
  ): Promise<void> {
    try {
      // Dynamic imports to prevent @react-pdf/renderer from being analysed during build
      const [{ renderToBuffer }, { ReportPDF }] = await Promise.all([
        import("@/lib/pdf/react-pdf-wrapper"),
        import("@/lib/pdf/report-template"),
      ]);

      // Type for expert declaration data
      interface ExpertDeclarationData {
        expertiseConfirmed: boolean;
        codeOfConductAccepted: boolean;
        courtComplianceAccepted: boolean;
        falseEvidenceUnderstood: boolean;
        impartialityConfirmed: boolean;
        inspectionConducted: boolean;
        evidenceIntegrity: boolean;
      }

      // Transform report data for PDF generation (same as PDF route)
      const reportData = {
        ...report,
        scopeOfWorks: report.scopeOfWorks ? String(report.scopeOfWorks) : null,
        methodology: report.methodology ? String(report.methodology) : null,
        equipment: Array.isArray(report.equipment)
          ? (report.equipment as string[])
          : null,
        conclusions: report.conclusions ? String(report.conclusions) : null,
        expertDeclaration:
          report.expertDeclaration as ExpertDeclarationData | null,
        roofElements: report.roofElements.map((element) => ({
          ...element,
          photos: element.photos.map((photo) => ({
            url: photo.url,
            caption: photo.caption,
            photoType: photo.photoType,
          })),
        })),
        complianceAssessment: report.complianceAssessment
          ? {
              checklistResults:
                report.complianceAssessment.checklistResults as Record<
                  string,
                  Record<string, string>
                >,
              nonComplianceSummary:
                report.complianceAssessment.nonComplianceSummary,
            }
          : null,
      };

      const pdfBuffer = await renderToBuffer(ReportPDF({ report: reportData }));
      zip.file(`${report.reportNumber}.pdf`, pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF for evidence package:", error);
      // Add an error notice instead of failing the whole package
      zip.file(
        "_PDF_GENERATION_ERROR.txt",
        `PDF generation failed. Please download the PDF separately from the report page.\nError: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Add all report photos to the ZIP with metadata
   */
  private async addPhotosToZip(
    zip: JSZip,
    report: ReportWithRelations
  ): Promise<void> {
    const photosFolder = zip.folder("photos");
    if (!photosFolder) return;

    const photoMetadata: PhotoMetadata[] = [];
    let photoIndex = 1;

    for (const photo of report.photos) {
      try {
        const response = await fetch(photo.url);
        if (!response.ok) {
          console.error(
            `Failed to fetch photo ${photo.id}: ${response.status}`
          );
          continue;
        }

        const photoBuffer = await response.arrayBuffer();

        // Generate descriptive filename
        const extension = photo.mimeType?.split("/")[1] || "jpg";
        const sanitizedCaption = photo.caption
          ? `_${photo.caption
              .replace(/[^a-zA-Z0-9]/g, "_")
              .substring(0, 30)}`
          : "";
        const filename = `${String(photoIndex).padStart(3, "0")}_${photo.photoType}${sanitizedCaption}.${extension}`;

        photosFolder.file(filename, photoBuffer);

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
  }

  /**
   * Add chain of custody documentation
   */
  private addChainOfCustody(
    zip: JSZip,
    report: ReportWithRelations
  ): void {
    const content = `CHAIN OF CUSTODY DOCUMENTATION
==============================

Report Number: ${report.reportNumber}
Property: ${report.propertyAddress}, ${report.propertyCity}, ${report.propertyRegion}

This document certifies the chain of custody for all evidence
included in this evidence export package.

EVIDENCE COLLECTION
-------------------
Inspector: ${report.inspector.name}
Inspector LBP Number: ${report.inspector.lbpNumber || "N/A"}
Qualifications: ${report.inspector.qualifications || "N/A"}
Inspection Date: ${new Date(report.inspectionDate).toISOString()}
Location: ${report.propertyAddress}, ${report.propertyCity}

EVIDENCE PROCESSING
-------------------
All photographs were:
1. Captured using devices with GPS and timestamp capabilities
2. Hashed (SHA-256) immediately upon upload to preserve integrity
3. Stored in secure, encrypted cloud storage (Cloudflare R2, AES-256)
4. Never modified after initial capture -- originals preserved
5. EXIF metadata (GPS, timestamps, camera data) extracted and recorded

EVIDENCE INTEGRITY
------------------
Total Photos: ${report.photos.length}
Total Defects: ${report.defects.length}
Photos with verified hash: ${report.photos.filter((p) => p.hashVerified).length} of ${report.photos.length}

STANDARDS COMPLIANCE
--------------------
All evidence has been captured and preserved in accordance with:
- ISO 17020:2012 (Conformity assessment -- Requirements for inspection bodies)
- NZ Evidence Act 2006 (Business records and computer-generated evidence)
- Best practices for digital evidence handling and chain of custody

CERTIFICATION
-------------
This evidence package was generated on ${new Date().toISOString()}
by the RANZ Roofing Report Platform.

Organisation: ${RANZ_ORG.name}
Contact: ${RANZ_ORG.email}
Website: ${RANZ_ORG.website}
`;

    zip.file("chain_of_custody.txt", content);
  }

  /**
   * Add manifest file with report metadata and file listing
   */
  private addManifest(
    zip: JSZip,
    report: ReportWithRelations
  ): void {
    // Collect file listing from the ZIP
    const files: string[] = [];
    zip.forEach((relativePath) => {
      files.push(relativePath);
    });

    const manifest = {
      packageVersion: "1.0",
      generatedAt: new Date().toISOString(),
      report: {
        reportNumber: report.reportNumber,
        inspectionDate: report.inspectionDate,
        propertyAddress: report.propertyAddress,
        propertyCity: report.propertyCity,
        propertyRegion: report.propertyRegion,
        inspector: report.inspector.name,
        status: report.status,
      },
      evidence: {
        photoCount: report.photos.length,
        defectCount: report.defects.length,
        roofElementCount: report.roofElements.length,
      },
      files: [...files, "manifest.json"],
      generator: {
        platform: "RANZ Roofing Report Platform",
        organisation: RANZ_ORG.name,
        version: "1.0.0",
      },
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  }
}

export const evidenceExportService = new EvidenceExportService();
