/**
 * Expert Witness Declaration Section
 *
 * High Court Rules Schedule 4 compliant expert witness declaration
 * Required for reports used in legal proceedings
 */

import { Page, View, Text } from "../react-pdf-wrapper";
import { styles, colors } from "../styles";
import { Header, Footer } from "../components";

interface DeclarationProps {
  reportNumber: string;
  inspector: {
    name: string;
    qualifications?: string | null;
    lbpNumber?: string | null;
    yearsExperience?: number | null;
  };
  inspectionDate: Date;
  propertyAddress: string;
  expertDeclaration?: {
    expertiseConfirmed?: boolean;
    codeOfConductAccepted?: boolean;
    courtComplianceAccepted?: boolean;
    falseEvidenceUnderstood?: boolean;
    impartialityConfirmed?: boolean;
    inspectionConducted?: boolean;
    evidenceIntegrity?: boolean;
  };
  signedAt?: Date | null;
}

const declarationStyles = {
  page: {
    ...styles.page,
    paddingTop: 80,
    paddingBottom: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.charcoal,
    marginBottom: 5,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.charcoalLight,
    marginBottom: 20,
  },
  legalReference: {
    fontSize: 9,
    color: colors.charcoalLight,
    fontStyle: "italic" as const,
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.charcoal,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.charcoal,
    marginBottom: 10,
    textTransform: "uppercase" as const,
  },
  paragraph: {
    fontSize: 10,
    color: colors.charcoal,
    lineHeight: 1.5,
    marginBottom: 10,
    textAlign: "justify" as const,
  },
  declarationBox: {
    backgroundColor: colors.backgroundLight,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: colors.charcoal,
  },
  declarationItem: {
    flexDirection: "row" as const,
    marginBottom: 8,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: colors.charcoal,
    marginRight: 10,
    marginTop: 2,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  checkmark: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.green,
  },
  declarationText: {
    flex: 1,
    fontSize: 10,
    color: colors.charcoal,
    lineHeight: 1.4,
  },
  qualificationsBox: {
    backgroundColor: colors.white,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qualificationsTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.charcoalLight,
    marginBottom: 8,
    textTransform: "uppercase" as const,
  },
  qualificationsText: {
    fontSize: 10,
    color: colors.charcoal,
    marginBottom: 4,
  },
  signatureSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  signatureRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 20,
  },
  signatureBlock: {
    width: "45%",
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: colors.charcoal,
    height: 40,
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 9,
    color: colors.charcoalLight,
  },
  attestation: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.charcoal,
    marginBottom: 15,
  },
  warningBox: {
    backgroundColor: "#fef3c7",
    padding: 12,
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
  },
  warningTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#92400e",
    marginBottom: 5,
    textTransform: "uppercase" as const,
  },
  warningText: {
    fontSize: 9,
    color: "#92400e",
    lineHeight: 1.4,
  },
};

function formatDate(date: Date | null | undefined): string {
  if (!date) return "________________";
  return new Date(date).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function Declaration({
  reportNumber,
  inspector,
  inspectionDate,
  propertyAddress,
  expertDeclaration,
  signedAt,
}: DeclarationProps) {
  const declarations = [
    {
      checked: expertDeclaration?.expertiseConfirmed ?? false,
      text: "I have read the Code of Conduct for Expert Witnesses in the High Court Rules Schedule 4 and agree to comply with it.",
    },
    {
      checked: expertDeclaration?.codeOfConductAccepted ?? false,
      text: "I have set out in this report my qualifications as an expert to provide opinion evidence.",
    },
    {
      checked: expertDeclaration?.courtComplianceAccepted ?? false,
      text: "I have endeavoured to identify all relevant issues having regard to the questions put to me and to the scope of my instructions.",
    },
    {
      checked: expertDeclaration?.impartialityConfirmed ?? false,
      text: "My overriding duty is to assist the Court impartially on matters relevant to my area of expertise. I understand that this duty overrides any obligation to any party who has engaged me.",
    },
    {
      checked: expertDeclaration?.falseEvidenceUnderstood ?? false,
      text: "I understand that giving false evidence constitutes a criminal offence under Section 108 of the Crimes Act 1961.",
    },
    {
      checked: expertDeclaration?.inspectionConducted ?? false,
      text: "I conducted the inspection personally and the observations recorded are my own direct observations.",
    },
    {
      checked: expertDeclaration?.evidenceIntegrity ?? false,
      text: "All photographic evidence was captured during my inspection and has not been materially altered. Original files and hash values are preserved.",
    },
  ];

  return (
    <Page size="A4" style={declarationStyles.page}>
      <Header reportNumber={reportNumber} />

      <Text style={declarationStyles.title}>Expert Witness Declaration</Text>
      <Text style={declarationStyles.subtitle}>
        Code of Conduct Compliance Statement
      </Text>
      <Text style={declarationStyles.legalReference}>
        In accordance with High Court Rules 2016, Schedule 4 - Code of Conduct
        for Expert Witnesses, Evidence Act 2006 (Sections 25 & 137), and the
        Crimes Act 1961 (Section 108)
      </Text>

      {/* Expert Qualifications */}
      <View style={declarationStyles.qualificationsBox}>
        <Text style={declarationStyles.qualificationsTitle}>
          Expert Witness Details
        </Text>
        <Text style={declarationStyles.qualificationsText}>
          <Text style={{ fontWeight: 700 }}>Name: </Text>
          {inspector.name}
        </Text>
        {inspector.lbpNumber && (
          <Text style={declarationStyles.qualificationsText}>
            <Text style={{ fontWeight: 700 }}>LBP Number: </Text>
            {inspector.lbpNumber}
          </Text>
        )}
        {inspector.qualifications && (
          <Text style={declarationStyles.qualificationsText}>
            <Text style={{ fontWeight: 700 }}>Qualifications: </Text>
            {inspector.qualifications}
          </Text>
        )}
        {inspector.yearsExperience && (
          <Text style={declarationStyles.qualificationsText}>
            <Text style={{ fontWeight: 700 }}>Experience: </Text>
            {inspector.yearsExperience} years in roofing inspection
          </Text>
        )}
        <Text style={declarationStyles.qualificationsText}>
          <Text style={{ fontWeight: 700 }}>Inspection Date: </Text>
          {formatDate(inspectionDate)}
        </Text>
        <Text style={declarationStyles.qualificationsText}>
          <Text style={{ fontWeight: 700 }}>Property: </Text>
          {propertyAddress}
        </Text>
      </View>

      {/* Declaration Items */}
      <View style={declarationStyles.section}>
        <Text style={declarationStyles.sectionTitle}>
          I, {inspector.name}, declare that:
        </Text>
        <View style={declarationStyles.declarationBox}>
          {declarations.map((item, index) => (
            <View key={index} style={declarationStyles.declarationItem}>
              <View style={declarationStyles.checkbox}>
                {item.checked && (
                  <Text style={declarationStyles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={declarationStyles.declarationText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Professional Opinion Basis */}
      <View style={declarationStyles.section}>
        <Text style={declarationStyles.sectionTitle}>
          Basis of Professional Opinions
        </Text>
        <Text style={declarationStyles.paragraph}>
          The professional opinions expressed in this report are based upon my
          personal inspection of the property, my training and experience in
          roofing systems and building assessment, and reference to the
          applicable New Zealand Building Code clauses, Acceptable Solutions,
          and industry Codes of Practice.
        </Text>
        <Text style={declarationStyles.paragraph}>
          Where I express an opinion that is not based on direct observation, I
          have clearly identified it as such and stated the basis for that
          opinion. Where there is a range of opinion on any matter, I have
          summarised the range of opinions and provided reasons for preferring
          my opinion.
        </Text>
      </View>

      {/* Warning Box */}
      <View style={declarationStyles.warningBox}>
        <Text style={declarationStyles.warningTitle}>Important Notice</Text>
        <Text style={declarationStyles.warningText}>
          This report may be relied upon in legal proceedings. Any person who
          knowingly provides false or misleading information in connection with
          this report may be subject to prosecution under the Crimes Act 1961.
          The expert witness owes a paramount duty to the Court to provide
          impartial, objective evidence.
        </Text>
      </View>

      {/* Signature Section */}
      <View style={declarationStyles.signatureSection}>
        <Text style={declarationStyles.attestation}>
          I confirm that I have read and understood the above declarations and
          that this report represents my true professional opinions.
        </Text>
        <View style={declarationStyles.signatureRow}>
          <View style={declarationStyles.signatureBlock}>
            <View style={declarationStyles.signatureLine} />
            <Text style={declarationStyles.signatureLabel}>
              Signature of Expert Witness
            </Text>
          </View>
          <View style={declarationStyles.signatureBlock}>
            <View style={declarationStyles.signatureLine}>
              <Text
                style={{
                  fontSize: 10,
                  color: colors.charcoal,
                  paddingTop: 20,
                }}
              >
                {formatDate(signedAt)}
              </Text>
            </View>
            <Text style={declarationStyles.signatureLabel}>Date</Text>
          </View>
        </View>
      </View>

      <Footer />
    </Page>
  );
}

export default Declaration;
