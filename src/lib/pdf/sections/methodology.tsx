/**
 * Methodology Section (Section 3)
 *
 * ISO 17020 required section covering inspection process,
 * equipment used, access method, weather conditions, and limitations.
 * Section 3.5 Limitations renders on a dedicated page with prominent
 * amber warning box for court admissibility.
 */

import { Page, View, Text } from "../react-pdf-wrapper";
import { styles, colors } from "../styles";
import { Header, Footer } from "../components";

interface MethodologySectionProps {
  reportNumber: string;
  methodology: string | null;
  equipment: string[] | null;
  accessMethod: string | null;
  weatherConditions: string | null;
  inspectionType: string;
  inspectionDate: Date;
  limitations: string | null;
}

const methodologyStyles = {
  page: {
    ...styles.page,
    paddingTop: 80,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700 as const,
    color: colors.charcoal,
    marginBottom: 5,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  introParagraph: {
    fontSize: 10,
    color: colors.gray700,
    lineHeight: 1.6,
    marginBottom: 20,
    fontStyle: "italic" as const,
  },
  subsectionTitle: {
    fontSize: 12,
    fontWeight: 700 as const,
    color: colors.charcoal,
    marginTop: 15,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: colors.gray700,
  },
  infoBox: {
    backgroundColor: colors.backgroundLight,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.charcoal,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 700 as const,
    color: colors.charcoal,
  },
  infoValue: {
    fontSize: 10,
    color: colors.gray700,
  },
  equipmentRow: {
    flexDirection: "row" as const,
    marginBottom: 4,
    paddingLeft: 8,
  },
  equipmentNumber: {
    width: 20,
    fontSize: 10,
    color: colors.charcoalLight,
    fontWeight: 600 as const,
  },
  equipmentName: {
    flex: 1,
    fontSize: 10,
    color: colors.gray700,
  },
  // Limitations page styles
  amberWarningBox: {
    backgroundColor: "#fffbeb",
    borderLeftWidth: 3,
    borderLeftColor: colors.ranzYellow,
    padding: 16,
  },
  amberHeading: {
    fontSize: 13,
    fontWeight: 700 as const,
    color: "#92400e",
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
  amberSubheading: {
    fontSize: 10,
    color: "#92400e",
    fontStyle: "italic" as const,
    marginBottom: 12,
  },
  limitationsText: {
    fontSize: 11,
    lineHeight: 1.7,
    color: "#78350f",
  },
  courtDisclaimerBox: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 16,
  },
  courtDisclaimerLabel: {
    fontSize: 10,
    fontWeight: 700 as const,
    marginBottom: 6,
    color: colors.charcoal,
  },
  courtDisclaimerText: {
    fontSize: 9,
    lineHeight: 1.6,
    color: colors.gray700,
  },
};

function formatInspectionType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function MethodologySection({
  reportNumber,
  methodology,
  equipment,
  accessMethod,
  weatherConditions,
  inspectionType,
  inspectionDate,
  limitations,
}: MethodologySectionProps) {
  return (
    <>
      {/* Page 1: Methodology (Subsections 3.1 - 3.4) */}
      <Page size="A4" style={methodologyStyles.page}>
        <Header reportNumber={reportNumber} />

        <Text style={methodologyStyles.sectionTitle}>3. Methodology</Text>

        <Text style={methodologyStyles.introParagraph}>
          This section describes the inspection methodology, equipment used, and access
          methods employed during this inspection, in accordance with ISO/IEC 17020:2012
          requirements.
        </Text>

        {/* 3.1 Inspection Process */}
        <Text style={methodologyStyles.subsectionTitle}>3.1 Inspection Process</Text>
        <Text style={methodologyStyles.bodyText}>
          {methodology ||
            "Visual inspection conducted in accordance with RANZ Roofing Inspection Methodology 2025 and ISO/IEC 17020:2012 conformity assessment requirements."}
        </Text>

        <View style={methodologyStyles.infoBox}>
          <View style={{ flexDirection: "row", marginBottom: 4 }}>
            <Text style={methodologyStyles.infoLabel}>Inspection Type: </Text>
            <Text style={methodologyStyles.infoValue}>
              {formatInspectionType(inspectionType)}
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={methodologyStyles.infoLabel}>Date: </Text>
            <Text style={methodologyStyles.infoValue}>
              {formatDate(inspectionDate)}
            </Text>
          </View>
        </View>

        {/* 3.2 Equipment Used */}
        <Text style={methodologyStyles.subsectionTitle}>3.2 Equipment Used</Text>
        {equipment && equipment.length > 0 ? (
          <View style={{ marginLeft: 8 }}>
            {equipment.map((item, index) => (
              <View key={index} style={methodologyStyles.equipmentRow}>
                <Text style={methodologyStyles.equipmentNumber}>{index + 1}.</Text>
                <Text style={methodologyStyles.equipmentName}>{item}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={methodologyStyles.bodyText}>
            Standard visual inspection equipment. No specialist instruments recorded for
            this inspection.
          </Text>
        )}

        {/* 3.3 Access Method */}
        <Text style={methodologyStyles.subsectionTitle}>3.3 Access Method</Text>
        <Text style={methodologyStyles.bodyText}>
          {accessMethod || "Access method not recorded."}
        </Text>

        {/* 3.4 Weather Conditions */}
        <Text style={methodologyStyles.subsectionTitle}>3.4 Weather Conditions</Text>
        <Text style={methodologyStyles.bodyText}>
          {weatherConditions || "Weather conditions not recorded."}
        </Text>

        <Footer />
      </Page>

      {/* Page 2: Limitations (Section 3.5) - Dedicated page for court admissibility */}
      <Page size="A4" style={methodologyStyles.page}>
        <Header reportNumber={reportNumber} />

        <Text style={methodologyStyles.subsectionTitle}>
          3.5 Limitations &amp; Restrictions
        </Text>

        {/* Amber Warning Box */}
        <View style={methodologyStyles.amberWarningBox}>
          <Text style={methodologyStyles.amberHeading}>
            IMPORTANT: LIMITATIONS &amp; RESTRICTIONS
          </Text>
          <Text style={methodologyStyles.amberSubheading}>
            The following limitations apply to this inspection and must be considered
            when relying on this report.
          </Text>
          <Text style={methodologyStyles.limitationsText}>
            {limitations ||
              "No specific limitations were encountered during this inspection. Standard limitations apply as outlined in the scope of works."}
          </Text>
        </View>

        {/* Court & Legal Notice */}
        <View style={methodologyStyles.courtDisclaimerBox}>
          <Text style={methodologyStyles.courtDisclaimerLabel}>
            Court &amp; Legal Notice
          </Text>
          <Text style={methodologyStyles.courtDisclaimerText}>
            Areas not inspected or assessed should not be assumed to be free of defects.
            This report is limited to the scope defined herein. Any party relying on this
            report must consider the stated limitations. The inspector&apos;s opinions are
            based solely on conditions observable at the time of inspection within the
            areas accessed.
          </Text>
        </View>

        <Footer />
      </Page>
    </>
  );
}

export default MethodologySection;
