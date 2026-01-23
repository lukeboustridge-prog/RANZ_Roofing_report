import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// RANZ brand colors
const colors = {
  blue: "#2d5c8f",
  orange: "#e65100",
  darkBlue: "#1a3a5c",
  lightGray: "#f5f5f5",
  mediumGray: "#666666",
  borderGray: "#e0e0e0",
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#16a34a",
  pass: "#16a34a",
  fail: "#dc2626",
  partial: "#ea580c",
  na: "#9ca3af",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: colors.blue,
    paddingBottom: 15,
  },
  logo: {
    width: 60,
    height: 60,
  },
  headerText: {
    textAlign: "right",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.blue,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.mediumGray,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.blue,
    backgroundColor: colors.lightGray,
    padding: 8,
    marginBottom: 10,
  },
  subsectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.darkBlue,
    marginBottom: 8,
    marginTop: 15,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    paddingVertical: 6,
  },
  label: {
    width: "35%",
    fontWeight: "bold",
    color: colors.mediumGray,
  },
  value: {
    width: "65%",
    color: "#333333",
  },
  defectCard: {
    border: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 12,
    marginBottom: 15,
  },
  defectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    paddingBottom: 8,
  },
  defectTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.darkBlue,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    color: "white",
    fontSize: 9,
    fontWeight: "bold",
  },
  defectContent: {
    marginBottom: 8,
  },
  defectLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.mediumGray,
    marginBottom: 2,
  },
  defectText: {
    fontSize: 10,
    color: "#333333",
    lineHeight: 1.4,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  photo: {
    width: 120,
    height: 90,
    objectFit: "cover",
    borderRadius: 4,
  },
  photoCaption: {
    fontSize: 8,
    color: colors.mediumGray,
    textAlign: "center",
    marginTop: 3,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    paddingTop: 10,
    fontSize: 8,
    color: colors.mediumGray,
  },
  pageNumber: {
    textAlign: "right",
  },
  disclaimer: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 30,
    padding: 10,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
  },
  // Compliance styles
  complianceItem: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  complianceSection: {
    width: "15%",
    fontSize: 9,
    fontWeight: "bold",
    color: colors.mediumGray,
  },
  complianceDescription: {
    width: "65%",
    fontSize: 9,
    color: "#333333",
  },
  complianceStatus: {
    width: "20%",
    textAlign: "right",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
    color: "white",
  },
  complianceSummary: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#fef3c7",
    borderLeftWidth: 4,
    borderLeftColor: colors.orange,
    borderRadius: 4,
  },
  complianceSummaryTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.orange,
    marginBottom: 8,
  },
  complianceSummaryText: {
    fontSize: 9,
    color: "#92400e",
    lineHeight: 1.5,
  },
  complianceStats: {
    flexDirection: "row",
    marginBottom: 15,
    padding: 10,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 2,
  },
});

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return colors.critical;
    case "HIGH":
      return colors.high;
    case "MEDIUM":
      return colors.medium;
    case "LOW":
      return colors.low;
    default:
      return colors.mediumGray;
  }
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case "pass":
      return colors.pass;
    case "fail":
      return colors.fail;
    case "partial":
      return colors.partial;
    case "na":
      return colors.na;
    default:
      return colors.mediumGray;
  }
}

function getStatusLabel(status: string): string {
  switch (status?.toLowerCase()) {
    case "pass":
      return "PASS";
    case "fail":
      return "FAIL";
    case "partial":
      return "PARTIAL";
    case "na":
      return "N/A";
    default:
      return "—";
  }
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPropertyType(type: string): string {
  const types: Record<string, string> = {
    RESIDENTIAL_1: "Residential - 1 storey",
    RESIDENTIAL_2: "Residential - 2 storey",
    RESIDENTIAL_3: "Residential - 3+ storey",
    COMMERCIAL_LOW: "Commercial - Low rise",
    COMMERCIAL_HIGH: "Commercial - High rise",
    INDUSTRIAL: "Industrial",
  };
  return types[type] || type;
}

function formatInspectionType(type: string): string {
  const types: Record<string, string> = {
    FULL_INSPECTION: "Full Inspection",
    VISUAL_ONLY: "Visual Only",
    NON_INVASIVE: "Non-Invasive",
    INVASIVE: "Invasive",
    DISPUTE_RESOLUTION: "Dispute Resolution",
    PRE_PURCHASE: "Pre-Purchase",
    MAINTENANCE_REVIEW: "Maintenance Review",
  };
  return types[type] || type;
}

interface ChecklistItem {
  id: string;
  section: string;
  item: string;
  description: string;
  required: boolean;
}

interface ComplianceAssessmentData {
  checklistResults: {
    [checklistKey: string]: {
      [itemId: string]: string;
    };
  };
  nonComplianceSummary: string | null;
}

interface ReportData {
  reportNumber: string;
  propertyAddress: string;
  propertyCity: string;
  propertyRegion: string;
  propertyPostcode: string;
  propertyType: string;
  buildingAge: number | null;
  inspectionDate: Date | string;
  inspectionType: string;
  weatherConditions: string | null;
  accessMethod: string | null;
  limitations: string | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  inspector: {
    name: string;
    email: string;
    qualifications: string | null;
    lbpNumber: string | null;
    yearsExperience: number | null;
  };
  defects: Array<{
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
    recommendation: string | null;
    priorityLevel: string | null;
    photos: Array<{
      url: string;
      caption: string | null;
    }>;
  }>;
  photos: Array<{
    url: string;
    caption: string | null;
    photoType: string;
  }>;
  complianceAssessment?: ComplianceAssessmentData | null;
}

// Checklist definitions for PDF rendering
const CHECKLIST_DEFINITIONS: Record<string, { name: string; items: ChecklistItem[] }> = {
  e2_as1: {
    name: "E2/AS1 4th Edition - External Moisture",
    items: [
      { id: "e2_3_1", section: "E2.3.1", item: "Precipitation Shedding", description: "Roof effectively sheds water and snow", required: true },
      { id: "e2_3_2", section: "E2.3.2", item: "Water Penetration Prevention", description: "No dampness or damage from water ingress", required: true },
      { id: "e2_pitch", section: "E2/AS1 Table 1", item: "Roof Pitch Adequacy", description: "Pitch adequate for cladding type", required: true },
      { id: "e2_flashing_junctions", section: "E2/AS1 9.1", item: "Flashing at Junctions", description: "Appropriate flashings at all junctions", required: true },
      { id: "e2_flashing_penetrations", section: "E2/AS1 9.2", item: "Penetration Flashings", description: "Code-compliant penetration flashings", required: true },
      { id: "e2_underlay", section: "E2/AS1 8.5", item: "Underlay Installation", description: "Underlay correctly installed with adequate laps", required: true },
      { id: "e2_gutters", section: "E2/AS1 10.1", item: "Gutter and Drainage", description: "Gutters adequately sized and functional", required: true },
      { id: "e2_clearances", section: "E2/AS1 6.1", item: "Ground Clearances", description: "Required clearances maintained", required: true },
      { id: "e2_ventilation", section: "E2/AS1 8.6", item: "Roof Cavity Ventilation", description: "Adequate ventilation to prevent condensation", required: true },
      { id: "e2_compatibility", section: "E2/AS1 4.1", item: "Material Compatibility", description: "Materials compatible and suitable for exposure", required: true },
      { id: "e2_sealants", section: "E2/AS1 9.4", item: "Sealant Condition", description: "Sealants intact and properly applied", required: true },
    ],
  },
  metal_roof_cop_v25_12: {
    name: "Metal Roof COP v25.12",
    items: [
      { id: "cop_3_1", section: "Section 3.1", item: "Structure Support", description: "Adequate support for cladding", required: true },
      { id: "cop_3_2", section: "Section 3.2", item: "Fastening Patterns", description: "Correct fastening patterns and centres", required: true },
      { id: "cop_4_1", section: "Section 4.1", item: "Environmental Category", description: "Materials appropriate for exposure", required: true },
      { id: "cop_4_2", section: "Section 4.2", item: "Material Expected Life", description: "Meets 15-year minimum durability", required: true },
      { id: "cop_5_1", section: "Section 5.1", item: "Roof Drainage", description: "Effective drainage without overflow", required: true },
      { id: "cop_7_1", section: "Section 7.1", item: "Minimum Roof Pitch", description: "Pitch meets profile requirements", required: true },
      { id: "cop_7_2", section: "Section 7.2", item: "End Lap Requirements", description: "Minimum overlaps with sealant", required: true },
      { id: "cop_7_3", section: "Section 7.3", item: "Side Lap Requirements", description: "Minimum one full rib overlap", required: true },
      { id: "cop_8_1", section: "Section 8.1", item: "Flashing Design", description: "Flashings per COP details", required: true },
      { id: "cop_9_1", section: "Section 9.1", item: "Fastener Type", description: "Appropriate fastener type and material", required: true },
      { id: "cop_9_2", section: "Section 9.2", item: "Fastener Spacing", description: "Complies with wind zone requirements", required: true },
      { id: "cop_10_1", section: "Section 10.1", item: "Condensation Management", description: "Appropriate underlay and ventilation", required: true },
    ],
  },
  b2_durability: {
    name: "B2 Durability Assessment",
    items: [
      { id: "b2_cladding_15", section: "B2.3.1(a)", item: "Roof Cladding Durability", description: "Minimum 15-year expectancy", required: true },
      { id: "b2_flashing_15", section: "B2.3.1(a)", item: "Flashing Durability", description: "Minimum 15-year expectancy", required: true },
      { id: "b2_fastener", section: "B2.3.1", item: "Fastener Durability", description: "No signs of corrosion or failure", required: true },
      { id: "b2_sealant_5", section: "B2.3.1(b)", item: "Sealant Durability", description: "Minimum 5-year expectancy", required: true },
      { id: "b2_coating", section: "B2.3.1(a)", item: "Coating Durability", description: "Adequate durability for age", required: true },
      { id: "b2_structure_50", section: "B2.3.1(c)", item: "Structural Durability", description: "50-year expectancy for structure", required: true },
      { id: "b2_condition_age", section: "B2 General", item: "Condition vs Expected Life", description: "Appropriate for building age", required: true },
      { id: "b2_accelerated_wear", section: "B2 General", item: "Accelerated Wear Signs", description: "No premature failure evidence", required: true },
    ],
  },
};

interface ReportPDFProps {
  report: ReportData;
}

export function ReportPDF({ report }: ReportPDFProps) {
  // Calculate compliance statistics
  const calculateComplianceStats = () => {
    if (!report.complianceAssessment?.checklistResults) {
      return { pass: 0, fail: 0, partial: 0, na: 0, total: 0 };
    }

    const stats = { pass: 0, fail: 0, partial: 0, na: 0, total: 0 };

    Object.values(report.complianceAssessment.checklistResults).forEach((checklist) => {
      Object.values(checklist).forEach((status) => {
        stats.total++;
        const normalizedStatus = status?.toLowerCase();
        if (normalizedStatus === "pass") stats.pass++;
        else if (normalizedStatus === "fail") stats.fail++;
        else if (normalizedStatus === "partial") stats.partial++;
        else if (normalizedStatus === "na") stats.na++;
      });
    });

    return stats;
  };

  const complianceStats = calculateComplianceStats();
  const hasComplianceData = complianceStats.total > 0;

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>ROOFING INSPECTION REPORT</Text>
            <Text style={styles.subtitle}>
              Report Number: {report.reportNumber}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.blue }}>
              RANZ
            </Text>
            <Text style={{ fontSize: 8, color: colors.mediumGray }}>
              Roofing Association NZ
            </Text>
          </View>
        </View>

        {/* Property Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>
              {report.propertyAddress}, {report.propertyCity}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Region</Text>
            <Text style={styles.value}>
              {report.propertyRegion} {report.propertyPostcode}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Property Type</Text>
            <Text style={styles.value}>
              {formatPropertyType(report.propertyType)}
            </Text>
          </View>
          {report.buildingAge && (
            <View style={styles.row}>
              <Text style={styles.label}>Building Age</Text>
              <Text style={styles.value}>{report.buildingAge} years</Text>
            </View>
          )}
        </View>

        {/* Inspection Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspection Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Inspection</Text>
            <Text style={styles.value}>{formatDate(report.inspectionDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Inspection Type</Text>
            <Text style={styles.value}>
              {formatInspectionType(report.inspectionType)}
            </Text>
          </View>
          {report.weatherConditions && (
            <View style={styles.row}>
              <Text style={styles.label}>Weather Conditions</Text>
              <Text style={styles.value}>{report.weatherConditions}</Text>
            </View>
          )}
          {report.accessMethod && (
            <View style={styles.row}>
              <Text style={styles.label}>Access Method</Text>
              <Text style={styles.value}>{report.accessMethod}</Text>
            </View>
          )}
        </View>

        {/* Client Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Client Name</Text>
            <Text style={styles.value}>{report.clientName}</Text>
          </View>
          {report.clientEmail && (
            <View style={styles.row}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{report.clientEmail}</Text>
            </View>
          )}
          {report.clientPhone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{report.clientPhone}</Text>
            </View>
          )}
        </View>

        {/* Inspector Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspector Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Inspector Name</Text>
            <Text style={styles.value}>{report.inspector.name}</Text>
          </View>
          {report.inspector.lbpNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>LBP Number</Text>
              <Text style={styles.value}>{report.inspector.lbpNumber}</Text>
            </View>
          )}
          {report.inspector.qualifications && (
            <View style={styles.row}>
              <Text style={styles.label}>Qualifications</Text>
              <Text style={styles.value}>{report.inspector.qualifications}</Text>
            </View>
          )}
        </View>

        {/* Limitations */}
        {report.limitations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Limitations</Text>
            <Text style={styles.defectText}>{report.limitations}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>Report: {report.reportNumber}</Text>
          <Text style={styles.pageNumber}>Page 1</Text>
        </View>
      </Page>

      {/* Defects Pages */}
      {report.defects.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Defects Identified</Text>

          {report.defects.map((defect, index) => (
            <View key={index} style={styles.defectCard} wrap={false}>
              <View style={styles.defectHeader}>
                <Text style={styles.defectTitle}>
                  Defect #{defect.defectNumber}: {defect.title}
                </Text>
                <Text
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(defect.severity) },
                  ]}
                >
                  {defect.severity}
                </Text>
              </View>

              <View style={styles.defectContent}>
                <Text style={styles.defectLabel}>Location</Text>
                <Text style={styles.defectText}>{defect.location}</Text>
              </View>

              <View style={styles.defectContent}>
                <Text style={styles.defectLabel}>Classification</Text>
                <Text style={styles.defectText}>
                  {defect.classification.replace(/_/g, " ")}
                </Text>
              </View>

              <View style={styles.defectContent}>
                <Text style={styles.defectLabel}>Observation</Text>
                <Text style={styles.defectText}>{defect.observation}</Text>
              </View>

              {defect.analysis && (
                <View style={styles.defectContent}>
                  <Text style={styles.defectLabel}>Analysis</Text>
                  <Text style={styles.defectText}>{defect.analysis}</Text>
                </View>
              )}

              {defect.opinion && (
                <View style={styles.defectContent}>
                  <Text style={styles.defectLabel}>Professional Opinion</Text>
                  <Text style={styles.defectText}>{defect.opinion}</Text>
                </View>
              )}

              {(defect.codeReference || defect.copReference) && (
                <View style={styles.defectContent}>
                  <Text style={styles.defectLabel}>References</Text>
                  <Text style={styles.defectText}>
                    {[defect.codeReference, defect.copReference]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                </View>
              )}

              {defect.recommendation && (
                <View style={styles.defectContent}>
                  <Text style={styles.defectLabel}>Recommendation</Text>
                  <Text style={styles.defectText}>{defect.recommendation}</Text>
                </View>
              )}

              {defect.priorityLevel && (
                <View style={styles.defectContent}>
                  <Text style={styles.defectLabel}>Priority</Text>
                  <Text style={styles.defectText}>
                    {defect.priorityLevel.replace(/_/g, " ")}
                  </Text>
                </View>
              )}

              {defect.photos.length > 0 && (
                <View style={styles.photoGrid}>
                  {defect.photos.slice(0, 4).map((photo, photoIndex) => (
                    <View key={photoIndex}>
                      <Image src={photo.url} style={styles.photo} />
                      {photo.caption && (
                        <Text style={styles.photoCaption}>{photo.caption}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          <View style={styles.footer}>
            <Text>Report: {report.reportNumber}</Text>
            <Text render={({ pageNumber }) => `Page ${pageNumber}`} />
          </View>
        </Page>
      )}

      {/* Compliance Assessment Page */}
      {hasComplianceData && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>7. BUILDING CODE COMPLIANCE ASSESSMENT</Text>

          {/* Summary Statistics */}
          <View style={styles.complianceStats}>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: colors.pass }]}>
                {complianceStats.pass}
              </Text>
              <Text style={styles.statLabel}>Pass</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: colors.fail }]}>
                {complianceStats.fail}
              </Text>
              <Text style={styles.statLabel}>Fail</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: colors.partial }]}>
                {complianceStats.partial}
              </Text>
              <Text style={styles.statLabel}>Partial</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: colors.na }]}>
                {complianceStats.na}
              </Text>
              <Text style={styles.statLabel}>N/A</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: colors.blue }]}>
                {complianceStats.total}
              </Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </View>
          </View>

          {/* E2/AS1 Section */}
          {report.complianceAssessment?.checklistResults?.e2_as1 && (
            <View style={styles.section}>
              <Text style={styles.subsectionTitle}>
                7.1 E2/AS1 4th Edition - External Moisture Assessment
              </Text>
              {CHECKLIST_DEFINITIONS.e2_as1.items.map((item) => {
                const status = report.complianceAssessment?.checklistResults?.e2_as1?.[item.id] || "";
                return (
                  <View key={item.id} style={styles.complianceItem}>
                    <Text style={styles.complianceSection}>{item.section}</Text>
                    <Text style={styles.complianceDescription}>{item.item}</Text>
                    <View style={styles.complianceStatus}>
                      <Text
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(status) },
                        ]}
                      >
                        {getStatusLabel(status)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Metal Roof COP Section */}
          {report.complianceAssessment?.checklistResults?.metal_roof_cop_v25_12 && (
            <View style={styles.section}>
              <Text style={styles.subsectionTitle}>
                7.2 Metal Roof and Wall Cladding COP v25.12 Assessment
              </Text>
              {CHECKLIST_DEFINITIONS.metal_roof_cop_v25_12.items.map((item) => {
                const status = report.complianceAssessment?.checklistResults?.metal_roof_cop_v25_12?.[item.id] || "";
                return (
                  <View key={item.id} style={styles.complianceItem}>
                    <Text style={styles.complianceSection}>{item.section}</Text>
                    <Text style={styles.complianceDescription}>{item.item}</Text>
                    <View style={styles.complianceStatus}>
                      <Text
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(status) },
                        ]}
                      >
                        {getStatusLabel(status)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* B2 Durability Section */}
          {report.complianceAssessment?.checklistResults?.b2_durability && (
            <View style={styles.section}>
              <Text style={styles.subsectionTitle}>
                7.3 B2 Durability Assessment
              </Text>
              {CHECKLIST_DEFINITIONS.b2_durability.items.map((item) => {
                const status = report.complianceAssessment?.checklistResults?.b2_durability?.[item.id] || "";
                return (
                  <View key={item.id} style={styles.complianceItem}>
                    <Text style={styles.complianceSection}>{item.section}</Text>
                    <Text style={styles.complianceDescription}>{item.item}</Text>
                    <View style={styles.complianceStatus}>
                      <Text
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(status) },
                        ]}
                      >
                        {getStatusLabel(status)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Non-Compliance Summary */}
          {report.complianceAssessment?.nonComplianceSummary && (
            <View style={styles.complianceSummary}>
              <Text style={styles.complianceSummaryTitle}>
                7.4 Non-Compliance Summary
              </Text>
              <Text style={styles.complianceSummaryText}>
                {report.complianceAssessment.nonComplianceSummary}
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text>Report: {report.reportNumber}</Text>
            <Text render={({ pageNumber }) => `Page ${pageNumber}`} />
          </View>
        </Page>
      )}

      {/* Overview Photos Page */}
      {report.photos.filter((p) => p.photoType === "OVERVIEW").length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Overview Photographs</Text>
          <View style={styles.photoGrid}>
            {report.photos
              .filter((p) => p.photoType === "OVERVIEW")
              .map((photo, index) => (
                <View key={index} style={{ marginBottom: 15 }}>
                  <Image src={photo.url} style={{ width: 200, height: 150 }} />
                  {photo.caption && (
                    <Text style={styles.photoCaption}>{photo.caption}</Text>
                  )}
                </View>
              ))}
          </View>

          <View style={styles.footer}>
            <Text>Report: {report.reportNumber}</Text>
            <Text render={({ pageNumber }) => `Page ${pageNumber}`} />
          </View>
        </Page>
      )}

      {/* Disclaimer Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Disclaimer & Terms</Text>

        <View style={styles.disclaimer}>
          <Text style={{ fontWeight: "bold", marginBottom: 5 }}>
            Important Notice
          </Text>
          <Text style={{ lineHeight: 1.5 }}>
            This report has been prepared for the exclusive use of the client
            named herein and is based on the conditions observed at the time of
            inspection. The inspection was conducted in accordance with RANZ
            standards and the scope defined in this report.
            {"\n\n"}
            The findings, opinions, and recommendations contained in this report
            are based on the professional judgment of the inspector and represent
            the conditions observed at the time of inspection only. This report
            does not guarantee future performance or condition of the roofing
            system.
            {"\n\n"}
            Areas that were not accessible or could not be inspected are noted in
            the limitations section. The client should be aware that concealed
            defects may exist that were not identifiable during the inspection.
            {"\n\n"}
            This report should not be relied upon by any third party without the
            written consent of the inspector.
          </Text>
        </View>

        <View style={{ marginTop: 30 }}>
          <Text style={styles.sectionTitle}>Report Prepared By</Text>
          <View style={{ padding: 15 }}>
            <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 5 }}>
              {report.inspector.name}
            </Text>
            {report.inspector.lbpNumber && (
              <Text style={{ fontSize: 10, color: colors.mediumGray }}>
                LBP Number: {report.inspector.lbpNumber}
              </Text>
            )}
            <Text style={{ fontSize: 10, color: colors.mediumGray }}>
              {report.inspector.email}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 10, color: colors.mediumGray }}>
            Report generated: {formatDate(new Date())}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>Report: {report.reportNumber}</Text>
          <Text render={({ pageNumber }) => `Page ${pageNumber}`} />
        </View>
      </Page>
    </Document>
  );
}
