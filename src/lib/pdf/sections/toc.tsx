/**
 * Table of Contents Section
 *
 * Generates a professional table of contents for the report
 * With section numbers, titles, and page references
 */

import { Page, View, Text } from "../react-pdf-wrapper";
import { styles, colors } from "../styles";
import { Header, Footer } from "../components";

interface TocEntry {
  number: string;
  title: string;
  page: number;
  level?: 1 | 2;
}

interface TableOfContentsProps {
  reportNumber: string;
  entries?: TocEntry[];
  defectCount?: number;
  elementCount?: number;
  photoCount?: number;
  hasComplianceAssessment?: boolean;
}

const tocStyles = {
  page: {
    ...styles.page,
    paddingTop: 80,
    paddingBottom: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.charcoal,
    marginBottom: 8,
    textTransform: "uppercase" as const,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 10,
    color: colors.charcoalLight,
    marginBottom: 30,
  },
  divider: {
    height: 3,
    backgroundColor: colors.charcoal,
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.charcoalLight,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryRow: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    marginBottom: 8,
    paddingVertical: 4,
  },
  entryNumber: {
    width: 40,
    fontSize: 10,
    fontWeight: 700,
    color: colors.charcoal,
  },
  entryTitle: {
    flex: 1,
    fontSize: 10,
    color: colors.charcoal,
  },
  entryTitleLevel2: {
    flex: 1,
    fontSize: 10,
    color: colors.charcoalLight,
    paddingLeft: 20,
  },
  entryDots: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderBottomStyle: "dotted" as const,
    marginHorizontal: 8,
    marginBottom: 3,
  },
  entryPage: {
    width: 30,
    fontSize: 10,
    fontWeight: 700,
    color: colors.charcoal,
    textAlign: "right" as const,
  },
  appendixSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statsBox: {
    marginTop: 30,
    padding: 15,
    backgroundColor: colors.backgroundLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.charcoal,
  },
  statsTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.charcoal,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
  },
  statItem: {
    width: "50%",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 9,
    color: colors.charcoalLight,
  },
  statValue: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.charcoal,
  },
};

// Default table of contents entries with estimated page numbers
function getDefaultEntries(
  defectCount: number,
  elementCount: number,
  hasCompliance: boolean
): TocEntry[] {
  let currentPage = 3; // Start after cover and TOC

  const entries: TocEntry[] = [
    { number: "", title: "Expert Witness Declaration", page: currentPage++ },
    { number: "1", title: "Executive Summary", page: currentPage++ },
    { number: "2", title: "Scope & Methodology", page: currentPage++ },
    { number: "2.1", title: "Scope of Works", page: currentPage, level: 2 },
    { number: "2.2", title: "Methodology", page: currentPage, level: 2 },
    { number: "2.3", title: "Equipment Used", page: currentPage++, level: 2 },
    { number: "3", title: "Inspector Credentials", page: currentPage++ },
  ];

  // Roof elements section
  if (elementCount > 0) {
    entries.push({
      number: "4",
      title: "Roof Elements Assessment",
      page: currentPage,
    });
    // Estimate 3 elements per page
    currentPage += Math.ceil(elementCount / 3);
  }

  // Defects section
  if (defectCount > 0) {
    entries.push({ number: "5", title: "Defects Register", page: currentPage });
    // Estimate 2 defects per page
    currentPage += Math.ceil(defectCount / 2);
  }

  // Compliance section
  if (hasCompliance) {
    entries.push({
      number: "6",
      title: "Building Code Compliance",
      page: currentPage,
    });
    entries.push({
      number: "6.1",
      title: "E2/AS1 External Moisture",
      page: currentPage,
      level: 2,
    });
    entries.push({
      number: "6.2",
      title: "Metal Roof COP v25.12",
      page: currentPage,
      level: 2,
    });
    entries.push({
      number: "6.3",
      title: "B2 Durability Assessment",
      page: currentPage++,
      level: 2,
    });
  }

  // Conclusions
  entries.push({
    number: "7",
    title: "Conclusions & Recommendations",
    page: currentPage++,
  });

  // Declaration
  entries.push({
    number: "8",
    title: "Declaration & Signature",
    page: currentPage++,
  });

  return entries;
}

function getAppendixEntries(photoCount: number): TocEntry[] {
  let page = 20; // Estimated start of appendices

  const entries: TocEntry[] = [
    { number: "A", title: "Evidence Integrity Certificate", page: page++ },
    { number: "B", title: "Photographic Evidence Registry", page: page++ },
  ];

  if (photoCount > 0) {
    entries.push({ number: "C", title: "Photo Appendix", page: page });
  }

  entries.push({ number: "D", title: "Glossary of Terms", page: page + 2 });
  entries.push({ number: "E", title: "Standards & References", page: page + 3 });

  return entries;
}

export function TableOfContents({
  reportNumber,
  entries,
  defectCount = 0,
  elementCount = 0,
  photoCount = 0,
  hasComplianceAssessment = true,
}: TableOfContentsProps) {
  const mainEntries =
    entries ||
    getDefaultEntries(defectCount, elementCount, hasComplianceAssessment);
  const appendixEntries = getAppendixEntries(photoCount);

  return (
    <Page size="A4" style={tocStyles.page}>
      <Header reportNumber={reportNumber} />

      <Text style={tocStyles.title}>Table of Contents</Text>
      <Text style={tocStyles.subtitle}>
        Quick reference guide to report sections
      </Text>
      <View style={tocStyles.divider} />

      {/* Main Sections */}
      <View style={tocStyles.section}>
        <Text style={tocStyles.sectionTitle}>Report Sections</Text>
        {mainEntries.map((entry, index) => (
          <View key={index} style={tocStyles.entryRow}>
            <Text style={tocStyles.entryNumber}>{entry.number}</Text>
            <Text
              style={
                entry.level === 2
                  ? tocStyles.entryTitleLevel2
                  : tocStyles.entryTitle
              }
            >
              {entry.title}
            </Text>
            <View style={tocStyles.entryDots} />
            <Text style={tocStyles.entryPage}>{entry.page}</Text>
          </View>
        ))}
      </View>

      {/* Appendices */}
      <View style={tocStyles.appendixSection}>
        <Text style={tocStyles.sectionTitle}>Appendices</Text>
        {appendixEntries.map((entry, index) => (
          <View key={index} style={tocStyles.entryRow}>
            <Text style={tocStyles.entryNumber}>{entry.number}</Text>
            <Text style={tocStyles.entryTitle}>{entry.title}</Text>
            <View style={tocStyles.entryDots} />
            <Text style={tocStyles.entryPage}>{entry.page}</Text>
          </View>
        ))}
      </View>

      {/* Report Statistics */}
      <View style={tocStyles.statsBox}>
        <Text style={tocStyles.statsTitle}>Report Statistics</Text>
        <View style={tocStyles.statsGrid}>
          <View style={tocStyles.statItem}>
            <Text style={tocStyles.statLabel}>Roof Elements Assessed</Text>
            <Text style={tocStyles.statValue}>{elementCount}</Text>
          </View>
          <View style={tocStyles.statItem}>
            <Text style={tocStyles.statLabel}>Defects Identified</Text>
            <Text style={tocStyles.statValue}>{defectCount}</Text>
          </View>
          <View style={tocStyles.statItem}>
            <Text style={tocStyles.statLabel}>Photos Captured</Text>
            <Text style={tocStyles.statValue}>{photoCount}</Text>
          </View>
          <View style={tocStyles.statItem}>
            <Text style={tocStyles.statLabel}>Compliance Items</Text>
            <Text style={tocStyles.statValue}>
              {hasComplianceAssessment ? "35" : "N/A"}
            </Text>
          </View>
        </View>
      </View>

      <Footer />
    </Page>
  );
}

export default TableOfContents;
