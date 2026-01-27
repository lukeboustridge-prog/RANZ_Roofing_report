/**
 * Cover Page Section
 *
 * Professional cover page for RANZ Roofing Inspection Reports
 * Features RANZ branding, classification banner, and key report details
 */

import { Page, View, Text } from "../react-pdf-wrapper";
import { styles, colors } from "../styles";

interface CoverPageProps {
  reportNumber: string;
  propertyAddress: string;
  propertyCity: string;
  propertyRegion: string;
  inspectionDate: Date;
  inspectionType: string;
  clientName: string;
  inspector: {
    name: string;
    lbpNumber?: string | null;
    qualifications?: string | null;
  };
  classification?: "CONFIDENTIAL" | "RESTRICTED" | "INTERNAL";
}

const coverStyles = {
  page: {
    ...styles.page,
    padding: 0,
    backgroundColor: colors.white,
  },
  classificationBanner: {
    backgroundColor: colors.charcoalDark,
    paddingVertical: 8,
    paddingHorizontal: 40,
  },
  classificationText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 700,
    textAlign: "center" as const,
    letterSpacing: 2,
  },
  headerSection: {
    backgroundColor: colors.charcoal,
    paddingVertical: 50,
    paddingHorizontal: 40,
    alignItems: "center" as const,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoText: {
    fontSize: 42,
    fontWeight: 700,
    color: colors.white,
    letterSpacing: 4,
  },
  logoSubtext: {
    fontSize: 12,
    color: colors.charcoalLight,
    textAlign: "center" as const,
    marginTop: 8,
    letterSpacing: 1,
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.white,
    textAlign: "center" as const,
    marginTop: 30,
    textTransform: "uppercase" as const,
    letterSpacing: 2,
  },
  reportNumber: {
    fontSize: 14,
    color: colors.charcoalLight,
    textAlign: "center" as const,
    marginTop: 10,
    letterSpacing: 1,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 60,
    paddingVertical: 40,
  },
  propertySection: {
    marginBottom: 30,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.charcoalLight,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  propertyAddress: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.charcoal,
    marginBottom: 4,
  },
  propertyLocation: {
    fontSize: 14,
    color: colors.charcoalLight,
  },
  detailsGrid: {
    flexDirection: "row" as const,
    marginBottom: 30,
  },
  detailColumn: {
    flex: 1,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.charcoalLight,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    color: colors.charcoal,
  },
  inspectorSection: {
    backgroundColor: colors.backgroundLight,
    padding: 20,
    marginTop: "auto" as const,
  },
  inspectorLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.charcoalLight,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inspectorName: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.charcoal,
    marginBottom: 4,
  },
  inspectorCredentials: {
    fontSize: 10,
    color: colors.charcoalLight,
  },
  footer: {
    backgroundColor: colors.charcoal,
    paddingVertical: 15,
    paddingHorizontal: 40,
  },
  footerText: {
    fontSize: 8,
    color: colors.charcoalLight,
    textAlign: "center" as const,
  },
  footerBrand: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.white,
    textAlign: "center" as const,
    marginTop: 4,
  },
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatInspectionType(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CoverPage({
  reportNumber,
  propertyAddress,
  propertyCity,
  propertyRegion,
  inspectionDate,
  inspectionType,
  clientName,
  inspector,
  classification = "CONFIDENTIAL",
}: CoverPageProps) {
  return (
    <Page size="A4" style={coverStyles.page}>
      {/* Classification Banner */}
      <View style={coverStyles.classificationBanner}>
        <Text style={coverStyles.classificationText}>
          {classification} - PREPARED FOR {clientName.toUpperCase()}
        </Text>
      </View>

      {/* Header with RANZ Branding */}
      <View style={coverStyles.headerSection}>
        <View style={coverStyles.logoContainer}>
          <Text style={coverStyles.logoText}>RANZ</Text>
          <Text style={coverStyles.logoSubtext}>
            ROOFING ASSOCIATION NEW ZEALAND
          </Text>
        </View>
        <Text style={coverStyles.reportTitle}>Roofing Inspection Report</Text>
        <Text style={coverStyles.reportNumber}>{reportNumber}</Text>
      </View>

      {/* Main Content */}
      <View style={coverStyles.mainContent}>
        {/* Property Address */}
        <View style={coverStyles.propertySection}>
          <Text style={coverStyles.sectionLabel}>Property Address</Text>
          <Text style={coverStyles.propertyAddress}>{propertyAddress}</Text>
          <Text style={coverStyles.propertyLocation}>
            {propertyCity}, {propertyRegion}
          </Text>
        </View>

        {/* Details Grid */}
        <View style={coverStyles.detailsGrid}>
          <View style={coverStyles.detailColumn}>
            <View style={coverStyles.detailItem}>
              <Text style={coverStyles.detailLabel}>Inspection Date</Text>
              <Text style={coverStyles.detailValue}>
                {formatDate(inspectionDate)}
              </Text>
            </View>
            <View style={coverStyles.detailItem}>
              <Text style={coverStyles.detailLabel}>Inspection Type</Text>
              <Text style={coverStyles.detailValue}>
                {formatInspectionType(inspectionType)}
              </Text>
            </View>
          </View>
          <View style={coverStyles.detailColumn}>
            <View style={coverStyles.detailItem}>
              <Text style={coverStyles.detailLabel}>Prepared For</Text>
              <Text style={coverStyles.detailValue}>{clientName}</Text>
            </View>
            <View style={coverStyles.detailItem}>
              <Text style={coverStyles.detailLabel}>Report Number</Text>
              <Text style={coverStyles.detailValue}>{reportNumber}</Text>
            </View>
          </View>
        </View>

        {/* Inspector Section */}
        <View style={coverStyles.inspectorSection}>
          <Text style={coverStyles.inspectorLabel}>Inspected By</Text>
          <Text style={coverStyles.inspectorName}>{inspector.name}</Text>
          <Text style={coverStyles.inspectorCredentials}>
            {inspector.lbpNumber && `LBP #${inspector.lbpNumber}`}
            {inspector.lbpNumber && inspector.qualifications && " • "}
            {inspector.qualifications}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={coverStyles.footer}>
        <Text style={coverStyles.footerText}>
          This report is confidential and intended solely for the use of the
          named recipient.
        </Text>
        <Text style={coverStyles.footerText}>
          Unauthorized distribution or reproduction is prohibited.
        </Text>
        <Text style={coverStyles.footerBrand}>
          © {new Date().getFullYear()} Roofing Association New Zealand
        </Text>
      </View>
    </Page>
  );
}

export default CoverPage;
