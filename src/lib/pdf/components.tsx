import "server-only";
import React from "react";
import { Text, View, Image } from "./react-pdf-wrapper";
import { styles, colors, getSeverityColor, getConditionColor } from "./styles";

// Header component
export function Header({ reportNumber }: { reportNumber: string }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerText}>RANZ Roofing Inspection Report</Text>
      <Text style={styles.headerText}>{reportNumber}</Text>
    </View>
  );
}

// Footer component
export function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>CONFIDENTIAL - RANZ Roofing Report</Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

// Section heading
export function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <View style={{ marginTop: 24, marginBottom: 12 }}>
      <Text style={styles.h2}>
        {number}. {title}
      </Text>
      <View style={styles.dividerThick} />
    </View>
  );
}

// Subsection heading
export function SubsectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <Text style={styles.h3}>
      {number} {title}
    </Text>
  );
}

// Info row (label + value)
export function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { width: 120 }]}>{label}</Text>
      <Text style={styles.body}>{value || "N/A"}</Text>
    </View>
  );
}

// Two column info
export function InfoGrid({ items }: { items: { label: string; value: string | null | undefined }[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {items.map((item, index) => (
        <View key={index} style={[styles.col2, { marginBottom: 8 }]}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.body}>{item.value || "N/A"}</Text>
        </View>
      ))}
    </View>
  );
}

// Bullet list
export function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={styles.listBullet}>•</Text>
          <Text style={styles.listContent}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// Numbered list
export function NumberedList({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={styles.listBullet}>{index + 1}.</Text>
          <Text style={styles.listContent}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// Severity badge
export function SeverityBadge({ severity }: { severity: string }) {
  const color = getSeverityColor(severity);
  const bgColor = severity === "CRITICAL" ? "#fef2f2" :
                  severity === "HIGH" ? "#fff7ed" :
                  severity === "MEDIUM" ? "#fefce8" : "#f0fdf4";

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={{ color, fontSize: 8, fontWeight: 600 }}>
        {severity}
      </Text>
    </View>
  );
}

// Condition badge
export function ConditionBadge({ condition }: { condition: string }) {
  const color = getConditionColor(condition);
  const bgColor = condition === "GOOD" ? "#f0fdf4" :
                  condition === "FAIR" ? "#fefce8" :
                  condition === "POOR" ? "#fff7ed" : "#fef2f2";

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={{ color, fontSize: 8, fontWeight: 600 }}>
        {condition?.replace("_", " ")}
      </Text>
    </View>
  );
}

// Classification badge
export function ClassificationBadge({ classification }: { classification: string }) {
  const labels: Record<string, string> = {
    MAJOR_DEFECT: "Major Defect",
    MINOR_DEFECT: "Minor Defect",
    SAFETY_HAZARD: "Safety Hazard",
    MAINTENANCE_ITEM: "Maintenance",
    WORKMANSHIP_ISSUE: "Workmanship",
  };

  const bgColors: Record<string, string> = {
    MAJOR_DEFECT: "#fef2f2",
    MINOR_DEFECT: "#fefce8",
    SAFETY_HAZARD: "#fef2f2",
    MAINTENANCE_ITEM: "#eff6ff",
    WORKMANSHIP_ISSUE: "#fff7ed",
  };

  const textColors: Record<string, string> = {
    MAJOR_DEFECT: colors.critical,
    MINOR_DEFECT: colors.medium,
    SAFETY_HAZARD: colors.critical,
    MAINTENANCE_ITEM: colors.primary,
    WORKMANSHIP_ISSUE: colors.high,
  };

  return (
    <View style={[styles.badge, { backgroundColor: bgColors[classification] || colors.gray100 }]}>
      <Text style={{ color: textColors[classification] || colors.gray700, fontSize: 8, fontWeight: 600 }}>
        {labels[classification] || classification}
      </Text>
    </View>
  );
}

// Info box
export function InfoBox({ children }: { children: React.ReactNode }) {
  return <View style={styles.infoBox}>{children}</View>;
}

// Warning box
export function WarningBox({ children }: { children: React.ReactNode }) {
  return <View style={styles.warningBox}>{children}</View>;
}

// Table component
interface TableColumn {
  header: string;
  width: string;
  key: string;
}

interface TableProps {
  columns: TableColumn[];
  data: Record<string, string | number | null | undefined>[];
}

export function Table({ columns, data }: TableProps) {
  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeader}>
        {columns.map((col, index) => (
          <View key={index} style={[styles.tableHeaderCell, { width: col.width }]}>
            <Text>{col.header}</Text>
          </View>
        ))}
      </View>
      {/* Rows */}
      {data.map((row, rowIndex) => (
        <View key={rowIndex} style={rowIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          {columns.map((col, colIndex) => (
            <View key={colIndex} style={[styles.tableCell, { width: col.width }]}>
              <Text>{String(row[col.key] ?? "")}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// Photo with caption
interface PhotoProps {
  src: string;
  caption?: string;
  photoNumber?: number;
}

export function Photo({ src, caption, photoNumber }: PhotoProps) {
  return (
    <View style={{ marginVertical: 8 }}>
      <Image src={src} style={{ maxWidth: "100%", maxHeight: 300 }} />
      {caption && (
        <Text style={styles.photoCaption}>
          {photoNumber ? `Photo ${photoNumber}: ` : ""}{caption}
        </Text>
      )}
    </View>
  );
}

// Photo grid (2 columns)
export function PhotoGrid({ photos }: { photos: PhotoProps[] }) {
  return (
    <View style={styles.photoGrid}>
      {photos.map((photo, index) => (
        <View key={index} style={styles.photoGridItem}>
          <Image src={photo.src} style={{ maxWidth: "100%", maxHeight: 150 }} />
          {photo.caption && (
            <Text style={styles.photoCaption}>
              {photo.photoNumber ? `${photo.photoNumber}. ` : ""}{photo.caption}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

// Signature block
interface SignatureBlockProps {
  name: string;
  title?: string;
  qualifications?: string;
  date?: string;
  signatureUrl?: string;
}

export function SignatureBlock({ name, title, qualifications, date, signatureUrl }: SignatureBlockProps) {
  return (
    <View style={styles.signatureBox}>
      <Text style={styles.h4}>Declaration</Text>
      <Text style={styles.body}>
        I declare that the opinions expressed in this report are based on my professional expertise
        and have been formed after careful consideration of the facts observed during my inspection.
        I have no conflict of interest in providing this report.
      </Text>

      <View style={{ marginTop: 20 }}>
        {signatureUrl && (
          <Image src={signatureUrl} style={{ width: 150, height: 50, marginBottom: 8 }} />
        )}
        <View style={styles.signatureLine} />
        <Text style={[styles.body, { fontWeight: 600 }]}>{name}</Text>
        {title && <Text style={styles.bodySmall}>{title}</Text>}
        {qualifications && <Text style={styles.bodySmall}>{qualifications}</Text>}
        {date && <Text style={[styles.bodySmall, { marginTop: 8 }]}>Date: {date}</Text>}
      </View>
    </View>
  );
}

// Compliance check item
interface ComplianceItemProps {
  code: string;
  description: string;
  status: "PASS" | "FAIL" | "PARTIAL" | "NA";
  notes?: string;
}

export function ComplianceItem({ code, description, status, notes }: ComplianceItemProps) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    PASS: { bg: "#f0fdf4", text: colors.good },
    FAIL: { bg: "#fef2f2", text: colors.critical },
    PARTIAL: { bg: "#fefce8", text: colors.medium },
    NA: { bg: colors.gray100, text: colors.gray500 },
  };

  const statusLabels: Record<string, string> = {
    PASS: "Pass",
    FAIL: "Fail",
    PARTIAL: "Partial",
    NA: "N/A",
  };

  const { bg, text } = statusColors[status] || statusColors.NA;

  return (
    <View style={{ flexDirection: "row", marginBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 }}>
      <View style={{ width: "15%" }}>
        <Text style={[styles.bodySmall, { fontWeight: 600 }]}>{code}</Text>
      </View>
      <View style={{ width: "55%" }}>
        <Text style={styles.bodySmall}>{description}</Text>
        {notes && <Text style={[styles.bodySmall, { fontStyle: "italic", marginTop: 2 }]}>{notes}</Text>}
      </View>
      <View style={{ width: "30%", alignItems: "flex-end" }}>
        <View style={[styles.badge, { backgroundColor: bg }]}>
          <Text style={{ color: text, fontSize: 8, fontWeight: 600 }}>{statusLabels[status]}</Text>
        </View>
      </View>
    </View>
  );
}

// Defect card
interface DefectCardProps {
  defectNumber: number;
  title: string;
  location: string;
  classification: string;
  severity: string;
  observation: string;
  analysis?: string | null;
  opinion?: string | null;
  recommendation?: string | null;
  codeReference?: string | null;
  photos?: { src: string; caption?: string }[];
}

export function DefectCard({
  defectNumber,
  title,
  location,
  classification,
  severity,
  observation,
  analysis,
  opinion,
  recommendation,
  codeReference,
  photos,
}: DefectCardProps) {
  return (
    <View style={[styles.card, { marginBottom: 20 }]} wrap={false}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
        <View>
          <Text style={styles.h4}>Defect #{defectNumber}: {title}</Text>
          <Text style={styles.bodySmall}>{location}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <ClassificationBadge classification={classification} />
          <SeverityBadge severity={severity} />
        </View>
      </View>

      {/* Observation */}
      <View style={{ marginBottom: 8 }}>
        <Text style={styles.label}>OBSERVATION</Text>
        <Text style={styles.body}>{observation}</Text>
      </View>

      {/* Analysis */}
      {analysis && (
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.label}>ANALYSIS</Text>
          <Text style={styles.body}>{analysis}</Text>
        </View>
      )}

      {/* Opinion */}
      {opinion && (
        <View style={styles.infoBox}>
          <Text style={[styles.label, { color: colors.primary }]}>PROFESSIONAL OPINION</Text>
          <Text style={styles.body}>{opinion}</Text>
        </View>
      )}

      {/* Code Reference */}
      {codeReference && (
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.label}>CODE REFERENCE</Text>
          <Text style={styles.bodySmall}>{codeReference}</Text>
        </View>
      )}

      {/* Recommendation */}
      {recommendation && (
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.label}>RECOMMENDATION</Text>
          <Text style={styles.body}>{recommendation}</Text>
        </View>
      )}

      {/* Photos */}
      {photos && photos.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>PHOTOGRAPHS</Text>
          <PhotoGrid photos={photos.map((p, i) => ({ ...p, photoNumber: i + 1 }))} />
        </View>
      )}
    </View>
  );
}

// Element card
interface ElementCardProps {
  elementType: string;
  location: string;
  condition: string;
  material?: string | null;
  manufacturer?: string | null;
  notes?: string | null;
}

export function ElementCard({
  elementType,
  location,
  condition,
  material,
  manufacturer,
  notes,
}: ElementCardProps) {
  const elementLabels: Record<string, string> = {
    ROOF_CLADDING: "Roof Cladding",
    RIDGE: "Ridge",
    VALLEY: "Valley",
    HIP: "Hip",
    BARGE: "Barge",
    FASCIA: "Fascia",
    GUTTER: "Gutter",
    DOWNPIPE: "Downpipe",
    FLASHING_WALL: "Wall Flashing",
    FLASHING_PENETRATION: "Penetration Flashing",
    FLASHING_PARAPET: "Parapet Flashing",
    SKYLIGHT: "Skylight",
    VENT: "Vent",
    ANTENNA_MOUNT: "Antenna Mount",
    SOLAR_PANEL: "Solar Panel",
    UNDERLAY: "Underlay",
    INSULATION: "Insulation",
    ROOF_STRUCTURE: "Roof Structure",
    OTHER: "Other",
  };

  return (
    <View style={[styles.tableRow, { padding: 8 }]}>
      <View style={{ width: "25%" }}>
        <Text style={[styles.body, { fontWeight: 600 }]}>{elementLabels[elementType] || elementType}</Text>
      </View>
      <View style={{ width: "25%" }}>
        <Text style={styles.bodySmall}>{location}</Text>
      </View>
      <View style={{ width: "20%" }}>
        <Text style={styles.bodySmall}>{material || "N/A"}</Text>
      </View>
      <View style={{ width: "15%" }}>
        <Text style={styles.bodySmall}>{manufacturer || "N/A"}</Text>
      </View>
      <View style={{ width: "15%", alignItems: "flex-end" }}>
        <ConditionBadge condition={condition} />
      </View>
    </View>
  );
}
