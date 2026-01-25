import "server-only";
import { StyleSheet, Font } from "./react-pdf-wrapper";

// Register fonts (using system fonts for now)
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff2", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2", fontWeight: 700 },
  ],
});

// RANZ Brand Colors
export const colors = {
  primary: "#2d5c8f",
  primaryDark: "#1c3a5c",
  primaryLight: "#4a7ab0",
  accent: "#e65100",

  // Status colors
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#16a34a",

  // Condition colors
  good: "#16a34a",
  fair: "#ca8a04",
  poor: "#ea580c",

  // Neutrals
  black: "#111827",
  gray700: "#374151",
  gray500: "#6b7280",
  gray300: "#d1d5db",
  gray100: "#f3f4f6",
  white: "#ffffff",

  // Borders
  border: "#e5e7eb",
};

// Shared styles
export const styles = StyleSheet.create({
  // Page layouts
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 50,
    backgroundColor: colors.white,
    color: colors.black,
  },

  coverPage: {
    fontFamily: "Inter",
    fontSize: 10,
    padding: 0,
    backgroundColor: colors.white,
  },

  // Header/Footer
  header: {
    position: "absolute",
    top: 20,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerLogo: {
    width: 80,
    height: 30,
  },

  headerText: {
    fontSize: 8,
    color: colors.gray500,
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  footerText: {
    fontSize: 8,
    color: colors.gray500,
  },

  pageNumber: {
    fontSize: 8,
    color: colors.gray500,
  },

  // Typography
  h1: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 16,
  },

  h2: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 12,
    marginTop: 20,
  },

  h3: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.primaryDark,
    marginBottom: 8,
    marginTop: 16,
  },

  h4: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.black,
    marginBottom: 6,
    marginTop: 12,
  },

  body: {
    fontSize: 10,
    lineHeight: 1.5,
    color: colors.black,
    marginBottom: 8,
  },

  bodySmall: {
    fontSize: 9,
    lineHeight: 1.4,
    color: colors.gray700,
  },

  label: {
    fontSize: 9,
    fontWeight: 600,
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  // Layout
  section: {
    marginBottom: 20,
  },

  row: {
    flexDirection: "row",
    marginBottom: 8,
  },

  col2: {
    width: "50%",
  },

  col3: {
    width: "33.33%",
  },

  col4: {
    width: "25%",
  },

  // Tables
  table: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.gray100,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  tableHeaderCell: {
    padding: 8,
    fontSize: 9,
    fontWeight: 600,
    color: colors.gray700,
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.gray100,
  },

  tableCell: {
    padding: 8,
    fontSize: 9,
    color: colors.black,
  },

  // Cards/Boxes
  card: {
    backgroundColor: colors.gray100,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },

  infoBox: {
    backgroundColor: "#eff6ff",
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: 12,
    marginVertical: 10,
  },

  warningBox: {
    backgroundColor: "#fef3c7",
    borderLeftWidth: 4,
    borderLeftColor: colors.medium,
    padding: 12,
    marginVertical: 10,
  },

  errorBox: {
    backgroundColor: "#fef2f2",
    borderLeftWidth: 4,
    borderLeftColor: colors.critical,
    padding: 12,
    marginVertical: 10,
  },

  successBox: {
    backgroundColor: "#f0fdf4",
    borderLeftWidth: 4,
    borderLeftColor: colors.good,
    padding: 12,
    marginVertical: 10,
  },

  // Badges
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 600,
  },

  badgeCritical: {
    backgroundColor: "#fef2f2",
    color: colors.critical,
  },

  badgeHigh: {
    backgroundColor: "#fff7ed",
    color: colors.high,
  },

  badgeMedium: {
    backgroundColor: "#fefce8",
    color: colors.medium,
  },

  badgeLow: {
    backgroundColor: "#f0fdf4",
    color: colors.low,
  },

  // Images
  photo: {
    marginVertical: 8,
    maxWidth: "100%",
  },

  photoCaption: {
    fontSize: 8,
    color: colors.gray500,
    marginTop: 4,
    fontStyle: "italic",
  },

  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  photoGridItem: {
    width: "48%",
    marginBottom: 8,
  },

  // Lists
  list: {
    marginLeft: 16,
    marginBottom: 8,
  },

  listItem: {
    flexDirection: "row",
    marginBottom: 4,
  },

  listBullet: {
    width: 16,
    fontSize: 10,
    color: colors.primary,
  },

  listContent: {
    flex: 1,
    fontSize: 10,
  },

  // Dividers
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 16,
  },

  dividerThick: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    marginVertical: 20,
  },

  // Signatures
  signatureBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 16,
    marginTop: 20,
  },

  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
    marginTop: 40,
    marginBottom: 8,
  },

  // Cover page specific
  coverContainer: {
    flex: 1,
    padding: 50,
  },

  coverHeader: {
    alignItems: "center",
    marginBottom: 40,
  },

  coverLogo: {
    width: 150,
    height: 60,
    marginBottom: 20,
  },

  coverTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.primary,
    textAlign: "center",
    marginBottom: 8,
  },

  coverSubtitle: {
    fontSize: 16,
    color: colors.gray700,
    textAlign: "center",
  },

  coverDetails: {
    backgroundColor: colors.gray100,
    borderRadius: 8,
    padding: 24,
    marginVertical: 30,
  },

  coverDetailRow: {
    flexDirection: "row",
    marginBottom: 12,
  },

  coverDetailLabel: {
    width: 140,
    fontSize: 10,
    fontWeight: 600,
    color: colors.gray500,
  },

  coverDetailValue: {
    flex: 1,
    fontSize: 10,
    color: colors.black,
  },

  coverConfidential: {
    backgroundColor: colors.primaryDark,
    padding: 12,
    marginTop: 30,
  },

  coverConfidentialText: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.white,
    textAlign: "center",
  },

  coverFooter: {
    position: "absolute",
    bottom: 50,
    left: 50,
    right: 50,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    paddingTop: 20,
  },

  coverFooterText: {
    fontSize: 9,
    color: colors.gray500,
    textAlign: "center",
  },
});

// Severity color helper
export const getSeverityColor = (severity: string) => {
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
      return colors.gray500;
  }
};

// Condition color helper
export const getConditionColor = (condition: string) => {
  switch (condition) {
    case "GOOD":
      return colors.good;
    case "FAIR":
      return colors.fair;
    case "POOR":
      return colors.poor;
    case "CRITICAL":
      return colors.critical;
    default:
      return colors.gray500;
  }
};
