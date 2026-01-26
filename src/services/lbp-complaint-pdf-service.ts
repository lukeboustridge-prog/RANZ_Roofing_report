/**
 * LBP Complaint PDF Generation Service
 *
 * Generates PDF documents that match the official LBP complaint form structure
 * for submission to the Building Practitioners Board.
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";
import { prisma } from "@/lib/db";
import type { LBPComplaint, Report, Photo, Defect, User } from "@prisma/client";
import { GROUNDS_FOR_DISCIPLINE } from "@/types/lbp-complaint";
import { RANZ_DETAILS } from "@/lib/constants/lbp";

// Colors
const RANZ_BLUE = rgb(0.176, 0.361, 0.561); // #2d5c8f
const GRAY = rgb(0.4, 0.4, 0.4);

// Type for complaint with relations
type ComplaintWithRelations = LBPComplaint & {
  report: Report & {
    photos: Photo[];
    defects: Defect[];
    inspector: User;
  };
};

export class LBPComplaintPDFService {
  private font!: PDFFont;
  private boldFont!: PDFFont;

  /**
   * Generate LBP complaint PDF matching official form structure
   */
  async generateComplaintPDF(complaintId: string): Promise<Buffer> {
    const complaint = await prisma.lBPComplaint.findUnique({
      where: { id: complaintId },
      include: {
        report: {
          include: {
            photos: true,
            defects: true,
            inspector: true,
          },
        },
      },
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    this.font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    this.boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Page 1: Cover Page
    await this.addCoverPage(pdfDoc, complaint);

    // Page 2: Complainant Details (PART 1)
    await this.addComplainantPage(pdfDoc, complaint);

    // Page 3: Subject LBP Details (PART 2)
    await this.addSubjectLBPPage(pdfDoc, complaint);

    // Page 4: Property and Work Details (PART 3)
    await this.addWorkDetailsPage(pdfDoc, complaint);

    // Page 5+: Grounds for Discipline (PART 4)
    await this.addGroundsPage(pdfDoc, complaint);

    // Page: Evidence Summary (PART 5)
    await this.addEvidencePage(pdfDoc, complaint);

    // Final Page: Declaration and Signature
    await this.addDeclarationPage(pdfDoc, complaint);

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Add cover page
   */
  private async addCoverPage(pdfDoc: PDFDocument, complaint: ComplaintWithRelations) {
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    let y = height - 100;

    // Header
    page.drawRectangle({
      x: 0,
      y: height - 150,
      width: width,
      height: 150,
      color: RANZ_BLUE,
    });

    // Title
    page.drawText("LICENSED BUILDING PRACTITIONER", {
      x: 50,
      y: height - 70,
      size: 24,
      font: this.boldFont,
      color: rgb(1, 1, 1),
    });
    page.drawText("COMPLAINT FORM", {
      x: 50,
      y: height - 100,
      size: 24,
      font: this.boldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText("Building Act 2004 - Section 317", {
      x: 50,
      y: height - 130,
      size: 12,
      font: this.font,
      color: rgb(0.9, 0.9, 0.9),
    });

    y = height - 200;

    // Complaint details box
    this.drawBox(page, 50, y - 150, width - 100, 150);
    y -= 30;

    page.drawText("Complaint Number:", {
      x: 70,
      y,
      size: 12,
      font: this.boldFont,
    });
    page.drawText(complaint.complaintNumber, {
      x: 200,
      y,
      size: 12,
      font: this.font,
    });

    y -= 25;
    page.drawText("Date Prepared:", { x: 70, y, size: 12, font: this.boldFont });
    page.drawText(this.formatDate(complaint.preparedAt), {
      x: 200,
      y,
      size: 12,
      font: this.font,
    });

    y -= 25;
    page.drawText("Subject LBP:", { x: 70, y, size: 12, font: this.boldFont });
    page.drawText(complaint.subjectLbpName || "Not specified", {
      x: 200,
      y,
      size: 12,
      font: this.font,
    });

    y -= 25;
    page.drawText("LBP Number:", { x: 70, y, size: 12, font: this.boldFont });
    page.drawText(complaint.subjectLbpNumber || "Not specified", {
      x: 200,
      y,
      size: 12,
      font: this.font,
    });

    y -= 25;
    page.drawText("Property Address:", {
      x: 70,
      y,
      size: 12,
      font: this.boldFont,
    });
    page.drawText(complaint.workAddress, { x: 200, y, size: 12, font: this.font });

    // Source report info
    y -= 60;
    page.drawText("Source Report:", { x: 50, y, size: 11, font: this.boldFont });
    y -= 20;
    page.drawText(`Report Number: ${complaint.report.reportNumber}`, {
      x: 50,
      y,
      size: 10,
      font: this.font,
    });
    y -= 15;
    page.drawText(
      `Inspection Date: ${this.formatDate(complaint.report.inspectionDate)}`,
      {
        x: 50,
        y,
        size: 10,
        font: this.font,
      }
    );
    y -= 15;
    page.drawText(`Inspector: ${complaint.report.inspector.name}`, {
      x: 50,
      y,
      size: 10,
      font: this.font,
    });

    // Footer
    this.addFooter(page, complaint.complaintNumber, 1);
  }

  /**
   * Add complainant details page (PART 1)
   */
  private async addComplainantPage(pdfDoc: PDFDocument, complaint: ComplaintWithRelations) {
    const page = pdfDoc.addPage([595, 842]);
    let y = 800;

    // Section header
    this.drawSectionHeader(page, "PART 1: YOUR DETAILS (COMPLAINANT)", y);
    y -= 50;

    page.drawText(
      "The following organisation is lodging this complaint on behalf of a certified inspector:",
      { x: 50, y, size: 10, font: this.font }
    );
    y -= 30;

    // Complainant details
    this.addField(page, "Organisation:", complaint.complainantName, 50, y);
    y -= 25;
    this.addField(
      page,
      "Address:",
      complaint.complainantAddress || RANZ_DETAILS.address,
      50,
      y
    );
    y -= 25;
    this.addField(
      page,
      "Phone:",
      complaint.complainantPhone || RANZ_DETAILS.phone,
      50,
      y
    );
    y -= 25;
    this.addField(
      page,
      "Email:",
      complaint.complainantEmail || RANZ_DETAILS.email,
      50,
      y
    );
    y -= 25;
    this.addField(
      page,
      "Relationship to matter:",
      complaint.complainantRelation,
      50,
      y
    );

    y -= 50;
    page.drawText("Inspector who conducted the assessment:", {
      x: 50,
      y,
      size: 11,
      font: this.boldFont,
    });
    y -= 25;
    this.addField(page, "Name:", complaint.report.inspector.name, 50, y);
    y -= 25;
    this.addField(page, "Email:", complaint.report.inspector.email, 50, y);
    y -= 25;
    this.addField(
      page,
      "LBP Number:",
      complaint.report.inspector.lbpNumber || "N/A",
      50,
      y
    );

    this.addFooter(page, complaint.complaintNumber, 2);
  }

  /**
   * Add subject LBP details page (PART 2)
   */
  private async addSubjectLBPPage(pdfDoc: PDFDocument, complaint: ComplaintWithRelations) {
    const page = pdfDoc.addPage([595, 842]);
    let y = 800;

    this.drawSectionHeader(
      page,
      "PART 2: DETAILS OF LBP YOU ARE COMPLAINING ABOUT",
      y
    );
    y -= 50;

    this.addField(page, "LBP Number:", complaint.subjectLbpNumber, 50, y);
    y -= 25;
    this.addField(page, "Full Name:", complaint.subjectLbpName, 50, y);
    y -= 25;
    this.addField(
      page,
      "Email:",
      complaint.subjectLbpEmail || "Unknown",
      50,
      y
    );
    y -= 25;
    this.addField(
      page,
      "Phone:",
      complaint.subjectLbpPhone || "Unknown",
      50,
      y
    );
    y -= 25;
    this.addField(
      page,
      "Company:",
      complaint.subjectLbpCompany || "N/A",
      50,
      y
    );
    y -= 25;
    this.addField(
      page,
      "Address:",
      complaint.subjectLbpAddress || "Unknown",
      50,
      y
    );
    y -= 25;

    const licenseTypes = complaint.subjectLbpLicenseTypes?.join(", ") || "Unknown";
    this.addField(page, "License Classes:", licenseTypes, 50, y);
    y -= 25;

    this.addField(
      page,
      "License Sighted:",
      complaint.subjectSightedLicense ? "Yes" : "No",
      50,
      y
    );
    y -= 25;

    const workType = complaint.subjectWorkType || "Unknown";
    this.addField(page, "Work Type:", workType, 50, y);

    this.addFooter(page, complaint.complaintNumber, 3);
  }

  /**
   * Add work details page (PART 3)
   */
  private async addWorkDetailsPage(pdfDoc: PDFDocument, complaint: ComplaintWithRelations) {
    const page = pdfDoc.addPage([595, 842]);
    let y = 800;

    this.drawSectionHeader(page, "PART 3: PROPERTY AND WORK DETAILS", y);
    y -= 50;

    this.addField(page, "Property Address:", complaint.workAddress, 50, y);
    y -= 25;
    this.addField(page, "Suburb:", complaint.workSuburb || "", 50, y);
    y -= 25;
    this.addField(page, "City:", complaint.workCity || "", 50, y);
    y -= 25;
    this.addField(
      page,
      "Work Start Date:",
      complaint.workStartDate
        ? this.formatDate(complaint.workStartDate)
        : "Unknown",
      50,
      y
    );
    y -= 25;
    this.addField(
      page,
      "Work End Date:",
      complaint.workEndDate
        ? this.formatDate(complaint.workEndDate)
        : "Ongoing/Unknown",
      50,
      y
    );
    y -= 25;
    this.addField(
      page,
      "Building Consent:",
      complaint.buildingConsentNumber || "N/A",
      50,
      y
    );
    y -= 40;

    page.drawText("Work Description:", {
      x: 50,
      y,
      size: 11,
      font: this.boldFont,
    });
    y -= 20;
    y = this.addWrappedText(
      page,
      complaint.workDescription || "Not provided",
      50,
      y,
      495
    );

    this.addFooter(page, complaint.complaintNumber, 4);
  }

  /**
   * Add grounds for discipline page (PART 4)
   */
  private async addGroundsPage(pdfDoc: PDFDocument, complaint: ComplaintWithRelations) {
    let page = pdfDoc.addPage([595, 842]);
    let y = 800;
    let pageNum = 5;

    this.drawSectionHeader(page, "PART 4: GROUNDS FOR DISCIPLINE", y);
    y -= 40;

    page.drawText(
      "Under Section 317 of the Building Act 2004, the following grounds for discipline apply:",
      { x: 50, y, size: 10, font: this.font }
    );
    y -= 30;

    for (const ground of complaint.groundsForDiscipline || []) {
      const groundInfo =
        GROUNDS_FOR_DISCIPLINE[ground as keyof typeof GROUNDS_FOR_DISCIPLINE];
      if (groundInfo) {
        // Check if we need a new page
        if (y < 150) {
          this.addFooter(page, complaint.complaintNumber, pageNum);
          page = pdfDoc.addPage([595, 842]);
          y = 800;
          pageNum++;
        }

        // Checkbox
        page.drawText("☑", { x: 50, y, size: 14, font: this.font });
        y = this.addWrappedText(page, groundInfo.label, 70, y, 475, this.font);
        y -= 5;
        page.drawText(`(Section ${groundInfo.section} Building Act 2004)`, {
          x: 70,
          y,
          size: 8,
          font: this.font,
          color: GRAY,
        });
        y -= 25;
      }
    }

    y -= 20;
    page.drawText("Detailed Description of Conduct:", {
      x: 50,
      y,
      size: 11,
      font: this.boldFont,
    });
    y -= 20;
    y = this.addWrappedText(
      page,
      complaint.conductDescription || "Not provided",
      50,
      y,
      495
    );

    this.addFooter(page, complaint.complaintNumber, pageNum);
  }

  /**
   * Add evidence summary page (PART 5)
   */
  private async addEvidencePage(pdfDoc: PDFDocument, complaint: ComplaintWithRelations) {
    const page = pdfDoc.addPage([595, 842]);
    let y = 800;

    this.drawSectionHeader(page, "PART 5: EVIDENCE SUMMARY", y);
    y -= 40;

    y = this.addWrappedText(
      page,
      complaint.evidenceSummary || "Not provided",
      50,
      y,
      495
    );

    y -= 40;
    page.drawText("Attached Evidence:", {
      x: 50,
      y,
      size: 11,
      font: this.boldFont,
    });
    y -= 20;

    const photoCount = complaint.attachedPhotoIds?.length || 0;
    const defectCount = complaint.attachedDefectIds?.length || 0;

    page.drawText(`• ${photoCount} photographs with GPS and EXIF metadata`, {
      x: 70,
      y,
      size: 10,
      font: this.font,
    });
    y -= 18;
    page.drawText(`• ${defectCount} documented defects`, {
      x: 70,
      y,
      size: 10,
      font: this.font,
    });
    y -= 18;
    page.drawText(
      `• Inspector's technical report (${complaint.report.reportNumber})`,
      {
        x: 70,
        y,
        size: 10,
        font: this.font,
      }
    );
    y -= 18;
    page.drawText("• Chain of custody documentation", {
      x: 70,
      y,
      size: 10,
      font: this.font,
    });

    // Witnesses if any
    if (complaint.witnesses && Array.isArray(complaint.witnesses)) {
      const witnesses = complaint.witnesses as Array<{
        name: string;
        role?: string;
      }>;
      if (witnesses.length > 0) {
        y -= 30;
        page.drawText("Witnesses:", { x: 50, y, size: 11, font: this.boldFont });
        y -= 20;
        for (const witness of witnesses) {
          page.drawText(`• ${witness.name}${witness.role ? ` (${witness.role})` : ""}`, {
            x: 70,
            y,
            size: 10,
            font: this.font,
          });
          y -= 18;
        }
      }
    }

    // Steps to resolve if provided
    if (complaint.stepsToResolve) {
      y -= 30;
      page.drawText("Steps Taken to Resolve:", {
        x: 50,
        y,
        size: 11,
        font: this.boldFont,
      });
      y -= 20;
      this.addWrappedText(page, complaint.stepsToResolve, 50, y, 495);
    }

    this.addFooter(page, complaint.complaintNumber, 6);
  }

  /**
   * Add declaration and signature page
   */
  private async addDeclarationPage(pdfDoc: PDFDocument, complaint: ComplaintWithRelations) {
    const page = pdfDoc.addPage([595, 842]);
    let y = 800;

    this.drawSectionHeader(page, "DECLARATION", y);
    y -= 50;

    const declaration = `I declare that the information provided in this complaint is true and correct to the best of my knowledge. I understand that it is an offence under the Building Act 2004 to provide false or misleading information.

I confirm that:
• The evidence attached to this complaint has not been altered or manipulated
• The photographs were captured at the stated location and time
• The observations and findings are based on an independent inspection conducted by a qualified inspector
• This complaint is made in good faith and in the public interest

I acknowledge that this complaint may result in disciplinary proceedings against the named Licensed Building Practitioner.`;

    y = this.addWrappedText(page, declaration, 50, y, 495);

    y -= 40;
    page.drawText("Declaration Accepted:", {
      x: 50,
      y,
      size: 11,
      font: this.boldFont,
    });
    page.drawText(complaint.declarationAccepted ? "Yes" : "No", {
      x: 200,
      y,
      size: 11,
      font: this.font,
    });

    if (complaint.signedByName) {
      y -= 40;
      page.drawText("Signed by:", { x: 50, y, size: 11, font: this.boldFont });
      y -= 20;
      page.drawText(complaint.signedByName, { x: 50, y, size: 10, font: this.font });
      y -= 15;
      page.drawText(
        `Date: ${complaint.signedAt ? this.formatDate(complaint.signedAt) : ""}`,
        { x: 50, y, size: 10, font: this.font }
      );
    }

    y -= 50;
    page.drawText("Submitted by:", { x: 50, y, size: 11, font: this.boldFont });
    y -= 20;
    page.drawText(complaint.preparedByName, {
      x: 50,
      y,
      size: 10,
      font: this.font,
    });
    y -= 15;
    page.drawText(complaint.preparedByEmail, {
      x: 50,
      y,
      size: 10,
      font: this.font,
    });
    y -= 15;
    page.drawText(`On behalf of: ${RANZ_DETAILS.name}`, {
      x: 50,
      y,
      size: 10,
      font: this.font,
    });

    // Generated timestamp
    y -= 40;
    page.drawText(`Document generated: ${this.formatDate(new Date())}`, {
      x: 50,
      y,
      size: 8,
      font: this.font,
      color: GRAY,
    });

    this.addFooter(page, complaint.complaintNumber, 7);
  }

  // ============================================
  // Helper methods
  // ============================================

  private drawSectionHeader(page: PDFPage, title: string, y: number) {
    page.drawRectangle({
      x: 40,
      y: y - 5,
      width: page.getSize().width - 80,
      height: 30,
      color: RANZ_BLUE,
    });
    page.drawText(title, {
      x: 50,
      y: y + 2,
      size: 14,
      font: this.boldFont,
      color: rgb(1, 1, 1),
    });
  }

  private drawBox(
    page: PDFPage,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });
  }

  private addField(
    page: PDFPage,
    label: string,
    value: string,
    x: number,
    y: number
  ) {
    page.drawText(label, { x, y, size: 10, font: this.boldFont });
    page.drawText(value || "", { x: x + 150, y, size: 10, font: this.font });
  }

  private addWrappedText(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    font?: PDFFont
  ): number {
    const useFont = font || this.font;
    const words = text.split(" ");
    let line = "";
    let currentY = y;

    for (const word of words) {
      const testLine = line + word + " ";
      const width = useFont.widthOfTextAtSize(testLine, 10);

      if (width > maxWidth && line !== "") {
        page.drawText(line.trim(), { x, y: currentY, size: 10, font: useFont });
        line = word + " ";
        currentY -= 15;
      } else {
        line = testLine;
      }
    }

    if (line.trim() !== "") {
      page.drawText(line.trim(), { x, y: currentY, size: 10, font: useFont });
      currentY -= 15;
    }

    return currentY;
  }

  private addFooter(page: PDFPage, complaintNumber: string, pageNum: number) {
    const { width } = page.getSize();

    page.drawLine({
      start: { x: 50, y: 50 },
      end: { x: width - 50, y: 50 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });

    page.drawText(`Complaint: ${complaintNumber}`, {
      x: 50,
      y: 35,
      size: 8,
      font: this.font,
      color: GRAY,
    });

    page.drawText(`Page ${pageNum}`, {
      x: width - 80,
      y: 35,
      size: 8,
      font: this.font,
      color: GRAY,
    });

    page.drawText("CONFIDENTIAL", {
      x: width / 2 - 30,
      y: 35,
      size: 8,
      font: this.boldFont,
      color: GRAY,
    });
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString("en-NZ", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
}

export const lbpComplaintPDFService = new LBPComplaintPDFService();
