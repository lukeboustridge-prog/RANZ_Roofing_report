/**
 * Export Utilities
 * Functions for exporting data to CSV and Excel formats
 */

// CSV escape function
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  // If the value contains a comma, newline, or quote, wrap it in quotes
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Format date for export
function formatExportDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

// Format datetime for export
function formatExportDateTime(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().replace("T", " ").substring(0, 19);
}

export interface ReportExportData {
  id: string;
  reportNumber: string;
  status: string;
  propertyAddress: string;
  propertyCity: string;
  propertyRegion: string;
  propertyPostcode: string;
  propertyType: string;
  inspectionDate: Date | string;
  inspectionType: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  weatherConditions: string | null;
  accessMethod: string | null;
  inspectorName: string;
  inspectorEmail: string;
  defectsCount: number;
  photosCount: number;
  roofElementsCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  submittedAt: Date | string | null;
  approvedAt: Date | string | null;
}

export interface DefectExportData {
  reportNumber: string;
  defectNumber: number;
  title: string;
  description: string;
  location: string;
  classification: string;
  severity: string;
  observation: string;
  analysis: string | null;
  opinion: string | null;
  codeReference: string | null;
  copReference: string | null;
  probableCause: string | null;
  recommendation: string | null;
  priorityLevel: string | null;
  photosCount: number;
  createdAt: Date | string;
}

/**
 * Generate CSV content from report data
 */
export function generateReportsCSV(reports: ReportExportData[]): string {
  const headers = [
    "Report Number",
    "Status",
    "Property Address",
    "City",
    "Region",
    "Postcode",
    "Property Type",
    "Inspection Date",
    "Inspection Type",
    "Client Name",
    "Client Email",
    "Client Phone",
    "Weather Conditions",
    "Access Method",
    "Inspector Name",
    "Inspector Email",
    "Defects",
    "Photos",
    "Roof Elements",
    "Created",
    "Updated",
    "Submitted",
    "Approved",
  ];

  const rows = reports.map((report) => [
    escapeCSV(report.reportNumber),
    escapeCSV(report.status),
    escapeCSV(report.propertyAddress),
    escapeCSV(report.propertyCity),
    escapeCSV(report.propertyRegion),
    escapeCSV(report.propertyPostcode),
    escapeCSV(report.propertyType),
    escapeCSV(formatExportDate(report.inspectionDate)),
    escapeCSV(report.inspectionType),
    escapeCSV(report.clientName),
    escapeCSV(report.clientEmail),
    escapeCSV(report.clientPhone),
    escapeCSV(report.weatherConditions),
    escapeCSV(report.accessMethod),
    escapeCSV(report.inspectorName),
    escapeCSV(report.inspectorEmail),
    escapeCSV(report.defectsCount),
    escapeCSV(report.photosCount),
    escapeCSV(report.roofElementsCount),
    escapeCSV(formatExportDateTime(report.createdAt)),
    escapeCSV(formatExportDateTime(report.updatedAt)),
    escapeCSV(formatExportDateTime(report.submittedAt)),
    escapeCSV(formatExportDateTime(report.approvedAt)),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Generate CSV content from defect data
 */
export function generateDefectsCSV(defects: DefectExportData[]): string {
  const headers = [
    "Report Number",
    "Defect #",
    "Title",
    "Description",
    "Location",
    "Classification",
    "Severity",
    "Observation",
    "Analysis",
    "Opinion",
    "Code Reference",
    "COP Reference",
    "Probable Cause",
    "Recommendation",
    "Priority",
    "Photos",
    "Created",
  ];

  const rows = defects.map((defect) => [
    escapeCSV(defect.reportNumber),
    escapeCSV(defect.defectNumber),
    escapeCSV(defect.title),
    escapeCSV(defect.description),
    escapeCSV(defect.location),
    escapeCSV(defect.classification),
    escapeCSV(defect.severity),
    escapeCSV(defect.observation),
    escapeCSV(defect.analysis),
    escapeCSV(defect.opinion),
    escapeCSV(defect.codeReference),
    escapeCSV(defect.copReference),
    escapeCSV(defect.probableCause),
    escapeCSV(defect.recommendation),
    escapeCSV(defect.priorityLevel),
    escapeCSV(defect.photosCount),
    escapeCSV(formatExportDateTime(defect.createdAt)),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Generate a single report detailed CSV (for individual export)
 */
export function generateSingleReportCSV(
  report: ReportExportData,
  defects: DefectExportData[]
): string {
  const sections: string[] = [];

  // Report details section
  sections.push("REPORT DETAILS");
  sections.push(`Report Number,${escapeCSV(report.reportNumber)}`);
  sections.push(`Status,${escapeCSV(report.status)}`);
  sections.push(`Property Address,"${report.propertyAddress}, ${report.propertyCity}, ${report.propertyRegion} ${report.propertyPostcode}"`);
  sections.push(`Property Type,${escapeCSV(report.propertyType)}`);
  sections.push(`Inspection Date,${escapeCSV(formatExportDate(report.inspectionDate))}`);
  sections.push(`Inspection Type,${escapeCSV(report.inspectionType)}`);
  sections.push(`Client Name,${escapeCSV(report.clientName)}`);
  sections.push(`Client Email,${escapeCSV(report.clientEmail)}`);
  sections.push(`Client Phone,${escapeCSV(report.clientPhone)}`);
  sections.push(`Weather Conditions,${escapeCSV(report.weatherConditions)}`);
  sections.push(`Access Method,${escapeCSV(report.accessMethod)}`);
  sections.push(`Inspector,${escapeCSV(report.inspectorName)}`);
  sections.push("");

  // Summary section
  sections.push("SUMMARY");
  sections.push(`Total Defects,${report.defectsCount}`);
  sections.push(`Total Photos,${report.photosCount}`);
  sections.push(`Roof Elements,${report.roofElementsCount}`);
  sections.push("");

  // Defects section
  if (defects.length > 0) {
    sections.push("DEFECTS");
    sections.push(generateDefectsCSV(defects));
  }

  return sections.join("\n");
}

/**
 * Map Prisma report to export format
 */
export function mapReportToExport(report: {
  id: string;
  reportNumber: string;
  status: string;
  propertyAddress: string;
  propertyCity: string;
  propertyRegion: string;
  propertyPostcode: string;
  propertyType: string;
  inspectionDate: Date;
  inspectionType: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  weatherConditions: string | null;
  accessMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  inspector: { name: string; email: string };
  _count: { defects: number; photos: number; roofElements: number };
}): ReportExportData {
  return {
    id: report.id,
    reportNumber: report.reportNumber,
    status: report.status,
    propertyAddress: report.propertyAddress,
    propertyCity: report.propertyCity,
    propertyRegion: report.propertyRegion,
    propertyPostcode: report.propertyPostcode,
    propertyType: report.propertyType,
    inspectionDate: report.inspectionDate,
    inspectionType: report.inspectionType,
    clientName: report.clientName,
    clientEmail: report.clientEmail,
    clientPhone: report.clientPhone,
    weatherConditions: report.weatherConditions,
    accessMethod: report.accessMethod,
    inspectorName: report.inspector.name,
    inspectorEmail: report.inspector.email,
    defectsCount: report._count.defects,
    photosCount: report._count.photos,
    roofElementsCount: report._count.roofElements,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    submittedAt: report.submittedAt,
    approvedAt: report.approvedAt,
  };
}

/**
 * Map Prisma defect to export format
 */
export function mapDefectToExport(
  defect: {
    defectNumber: number;
    title: string;
    description: string;
    location: string;
    classification: string;
    severity: string;
    observation: string;
    analysis: string | null;
    opinion: string | null;
    codeReference: string | null;
    copReference: string | null;
    probableCause: string | null;
    recommendation: string | null;
    priorityLevel: string | null;
    createdAt: Date;
    _count: { photos: number };
  },
  reportNumber: string
): DefectExportData {
  return {
    reportNumber,
    defectNumber: defect.defectNumber,
    title: defect.title,
    description: defect.description,
    location: defect.location,
    classification: defect.classification,
    severity: defect.severity,
    observation: defect.observation,
    analysis: defect.analysis,
    opinion: defect.opinion,
    codeReference: defect.codeReference,
    copReference: defect.copReference,
    probableCause: defect.probableCause,
    recommendation: defect.recommendation,
    priorityLevel: defect.priorityLevel,
    photosCount: defect._count.photos,
    createdAt: defect.createdAt,
  };
}
