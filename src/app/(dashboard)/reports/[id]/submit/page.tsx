"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SignaturePad, type SignaturePadRef } from "@/components/signature";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Send,
  FileCheck,
  Camera,
  Layers,
  Shield,
  MapPin,
  Calendar,
  AlertOctagon,
  PenTool,
  RefreshCw,
  Scale,
  AlertCircle,
} from "lucide-react";

interface ValidationDetails {
  propertyDetails: { complete: boolean; missing: string[] };
  inspectionDetails: { complete: boolean; missing: string[] };
  roofElements: { complete: boolean; count: number; minimum: number };
  defects: { documented: boolean; count: number };
  photos: { sufficient: boolean; count: number; minimum: number; withExif: number };
  compliance: { complete: boolean; coverage: number; required: number };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completionPercentage: number;
  missingRequiredItems: string[];
  validationDetails: ValidationDetails;
}

interface ValidationResponse {
  success: boolean;
  validation: ValidationResult;
  currentStatus?: string;
  newStatus?: string;
  message?: string;
}

interface SignatureStatus {
  declarationSigned: boolean;
  signedAt: string | null;
  signatureUrl: string | null;
}

interface ExpertDeclaration {
  expertiseConfirmed: boolean;
  codeOfConductAccepted: boolean;
  courtComplianceAccepted: boolean;
  falseEvidenceUnderstood: boolean;
  impartialityConfirmed: boolean;
  inspectionConducted: boolean;
  evidenceIntegrity: boolean;
}

export default function SubmitReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const signaturePadRef = useRef<SignaturePadRef>(null);

  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Declaration and signature state
  const [signatureStatus, setSignatureStatus] = useState<SignatureStatus | null>(null);
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Expert Declaration state (High Court Rules Schedule 4)
  const [expertDeclaration, setExpertDeclaration] = useState<ExpertDeclaration>({
    expertiseConfirmed: false,
    codeOfConductAccepted: false,
    courtComplianceAccepted: false,
    falseEvidenceUnderstood: false,
    impartialityConfirmed: false,
    inspectionConducted: false,
    evidenceIntegrity: false,
  });
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictDisclosure, setConflictDisclosure] = useState("");

  // Check if all declarations are complete
  const allDeclarationsComplete =
    expertDeclaration.expertiseConfirmed &&
    expertDeclaration.codeOfConductAccepted &&
    expertDeclaration.courtComplianceAccepted &&
    expertDeclaration.falseEvidenceUnderstood &&
    expertDeclaration.impartialityConfirmed &&
    expertDeclaration.inspectionConducted &&
    expertDeclaration.evidenceIntegrity &&
    (!hasConflict || conflictDisclosure.trim().length > 0);

  useEffect(() => {
    fetchValidation();
    fetchSignatureStatus();
  }, [reportId]);

  const fetchSignatureStatus = async () => {
    try {
      const response = await fetch(`/api/reports/${reportId}/signature`);
      if (response.ok) {
        const data = await response.json();
        setSignatureStatus(data);
        if (data.declarationSigned) {
          setDeclarationChecked(true);
          setHasSignature(true);
        }
      }
    } catch {
      // Ignore errors - signature is optional until submission
    }
  };

  const fetchValidation = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/reports/${reportId}/submit`);
      const data: ValidationResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch validation status");
      }

      setValidation(data.validation);
      setCurrentStatus(data.currentStatus || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const saveSignature = async () => {
    const signatureDataUrl = signaturePadRef.current?.toDataURL();

    if (!signatureDataUrl) {
      setError("Please sign above before continuing");
      return false;
    }

    if (!allDeclarationsComplete) {
      setError("Please complete all declaration items before signing");
      return false;
    }

    setSavingSignature(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${reportId}/signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureDataUrl,
          declarationAccepted: true,
          expertDeclaration,
          hasConflict,
          conflictDisclosure: hasConflict ? conflictDisclosure : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save signature");
      }

      const data = await response.json();
      setSignatureStatus({
        declarationSigned: true,
        signedAt: data.signedAt,
        signatureUrl: data.signatureUrl,
      });
      setHasSignature(true);
      setDeclarationChecked(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save signature");
      return false;
    } finally {
      setSavingSignature(false);
    }
  };

  const clearSignature = async () => {
    try {
      await fetch(`/api/reports/${reportId}/signature`, {
        method: "DELETE",
      });
      setSignatureStatus(null);
      setHasSignature(false);
      setDeclarationChecked(false);
      signaturePadRef.current?.clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear signature");
    }
  };

  const handleSubmit = async () => {
    // Check if signature is already saved or needs to be saved
    if (!signatureStatus?.declarationSigned) {
      const saved = await saveSignature();
      if (!saved) return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/reports/${reportId}/submit`, {
        method: "POST",
      });
      const data: ValidationResponse = await response.json();

      if (!response.ok && !data.validation) {
        throw new Error(data.message || "Failed to submit report");
      }

      setValidation(data.validation);

      if (data.success) {
        setSubmitSuccess(true);
        setCurrentStatus(data.newStatus || "PENDING_REVIEW");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href={`/reports/${reportId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Report
        </Link>
        <Alert variant="destructive">
          <AlertOctagon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchValidation}>Try Again</Button>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="space-y-6">
        <Link
          href={`/reports/${reportId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Report
        </Link>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-green-800">
                  Report Submitted Successfully
                </h2>
                <p className="text-green-700">
                  Your report has been submitted for review. You will be notified
                  once it has been approved.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" asChild>
                  <Link href={`/reports/${reportId}`}>View Report</Link>
                </Button>
                <Button asChild>
                  <Link href={`/reports/${reportId}/pdf`}>Preview PDF</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAlreadySubmitted = ["PENDING_REVIEW", "APPROVED", "FINALISED"].includes(currentStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href={`/reports/${reportId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Report
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Submit Report</h1>
            <p className="text-muted-foreground">
              Review validation results before submitting for review
            </p>
          </div>
          <Badge
            variant={
              currentStatus === "FINALISED"
                ? "finalised"
                : currentStatus === "APPROVED"
                ? "approved"
                : currentStatus === "PENDING_REVIEW"
                ? "pendingReview"
                : "draft"
            }
          >
            {currentStatus.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      {isAlreadySubmitted && (
        <Alert>
          <FileCheck className="h-4 w-4" />
          <AlertTitle>Report Already Submitted</AlertTitle>
          <AlertDescription>
            This report has already been submitted and is currently{" "}
            {currentStatus.replace(/_/g, " ").toLowerCase()}.
          </AlertDescription>
        </Alert>
      )}

      {validation && (
        <>
          {/* Completion Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Report Completion</span>
                <span className="text-2xl font-bold">
                  {validation.completionPercentage}%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={validation.completionPercentage} className="h-3" />
              <p className="mt-2 text-sm text-muted-foreground">
                {validation.isValid
                  ? "All required items are complete. Ready for submission."
                  : `${validation.missingRequiredItems.length} required item(s) need attention.`}
              </p>
            </CardContent>
          </Card>

          {/* Validation Details Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Property Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  Property Details
                  {validation.validationDetails.propertyDetails.complete ? (
                    <CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="ml-auto h-5 w-5 text-red-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {validation.validationDetails.propertyDetails.complete ? (
                  <p className="text-sm text-green-600">All details complete</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-red-600">Missing:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {validation.validationDetails.propertyDetails.missing.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inspection Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Inspection Details
                  {validation.validationDetails.inspectionDetails.complete ? (
                    <CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="ml-auto h-5 w-5 text-red-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {validation.validationDetails.inspectionDetails.complete ? (
                  <p className="text-sm text-green-600">All details complete</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-red-600">Missing:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {validation.validationDetails.inspectionDetails.missing.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Roof Elements */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4" />
                  Roof Elements
                  {validation.validationDetails.roofElements.complete ? (
                    <CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="ml-auto h-5 w-5 text-red-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  <span
                    className={
                      validation.validationDetails.roofElements.complete
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {validation.validationDetails.roofElements.count}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    / {validation.validationDetails.roofElements.minimum} minimum
                  </span>
                </p>
                {!validation.validationDetails.roofElements.complete && (
                  <Button variant="link" className="h-auto p-0 text-sm" asChild>
                    <Link href={`/reports/${reportId}/elements`}>
                      Add more elements
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Photos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="h-4 w-4" />
                  Photos
                  {validation.validationDetails.photos.sufficient ? (
                    <CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="ml-auto h-5 w-5 text-red-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span
                      className={
                        validation.validationDetails.photos.sufficient
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {validation.validationDetails.photos.count}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      / {validation.validationDetails.photos.minimum} minimum
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {validation.validationDetails.photos.withExif} with EXIF metadata
                  </p>
                  {!validation.validationDetails.photos.sufficient && (
                    <Button variant="link" className="h-auto p-0 text-sm" asChild>
                      <Link href={`/reports/${reportId}/photos`}>
                        Upload more photos
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Defects */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4" />
                  Defects
                  <CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  <span className="text-green-600">
                    {validation.validationDetails.defects.count}
                  </span>
                  <span className="text-muted-foreground"> documented</span>
                </p>
                <Button variant="link" className="h-auto p-0 text-sm" asChild>
                  <Link href={`/reports/${reportId}/defects`}>
                    Manage defects
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Compliance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  Compliance
                  {validation.validationDetails.compliance.complete ? (
                    <CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="ml-auto h-5 w-5 text-red-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span
                      className={
                        validation.validationDetails.compliance.complete
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {validation.validationDetails.compliance.coverage}%
                    </span>
                    <span className="text-muted-foreground"> coverage</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {validation.validationDetails.compliance.required} checklist(s) required
                  </p>
                  {!validation.validationDetails.compliance.complete && (
                    <Button variant="link" className="h-auto p-0 text-sm" asChild>
                      <Link href={`/reports/${reportId}/compliance`}>
                        Complete assessment
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Errors */}
          {validation.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Expert Witness Declaration - High Court Rules Schedule 4 */}
          {!isAlreadySubmitted && validation.isValid && (
            <Card className="border-[var(--ranz-blue-200)]">
              <CardHeader className="bg-[var(--ranz-blue-50)] rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-[var(--ranz-blue-600)]" />
                  Expert Witness Declaration
                </CardTitle>
                <CardDescription>
                  In accordance with High Court Rules Schedule 4 and the Evidence Act 2006
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {signatureStatus?.declarationSigned ? (
                  /* Already Signed View */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Declaration Signed</span>
                    </div>
                    {signatureStatus.signatureUrl && (
                      <div className="relative w-full max-w-md h-32 border rounded-lg overflow-hidden bg-white">
                        <Image
                          src={signatureStatus.signatureUrl}
                          alt="Signature"
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Signed on: {signatureStatus.signedAt
                        ? new Date(signatureStatus.signedAt).toLocaleString()
                        : "Unknown"}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSignature}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Re-sign Declaration
                    </Button>
                  </div>
                ) : (
                  /* Declaration Form */
                  <>
                    {/* Introduction */}
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">
                        I, the undersigned expert witness, make the following declaration:
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This declaration is required under High Court Rules Schedule 4, Part 3
                        for expert witness reports that may be used in court proceedings,
                        Disputes Tribunal hearings, or LBP Board complaints.
                      </p>
                    </div>

                    {/* Section 1: Expertise Confirmation */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[var(--ranz-blue-100)] text-[var(--ranz-blue-700)] flex items-center justify-center text-xs font-bold">1</span>
                        Expertise & Qualifications
                      </h4>
                      <div className="flex items-start space-x-3 pl-8">
                        <Checkbox
                          id="expertiseConfirmed"
                          checked={expertDeclaration.expertiseConfirmed}
                          onCheckedChange={(checked) =>
                            setExpertDeclaration(prev => ({ ...prev, expertiseConfirmed: checked === true }))
                          }
                        />
                        <Label htmlFor="expertiseConfirmed" className="text-sm leading-relaxed cursor-pointer">
                          I confirm that I am an expert in <strong>roofing inspection, assessment, and building compliance</strong>.
                          My qualifications, training, and experience that qualify me to give this opinion are set out
                          in the Inspector Credentials section of this report and in Appendix E (CV).
                        </Label>
                      </div>
                    </div>

                    {/* Section 2: Code of Conduct */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[var(--ranz-blue-100)] text-[var(--ranz-blue-700)] flex items-center justify-center text-xs font-bold">2</span>
                        Expert Witness Code of Conduct
                      </h4>
                      <div className="flex items-start space-x-3 pl-8">
                        <Checkbox
                          id="codeOfConductAccepted"
                          checked={expertDeclaration.codeOfConductAccepted}
                          onCheckedChange={(checked) =>
                            setExpertDeclaration(prev => ({ ...prev, codeOfConductAccepted: checked === true }))
                          }
                        />
                        <Label htmlFor="codeOfConductAccepted" className="text-sm leading-relaxed cursor-pointer">
                          I have read and agree to comply with the <strong>Expert Witness Code of Conduct</strong> as
                          set out in Schedule 4 of the High Court Rules. I understand my duty is to assist the
                          Court impartially on matters within my area of expertise.
                        </Label>
                      </div>
                    </div>

                    {/* Section 3: Impartiality */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[var(--ranz-blue-100)] text-[var(--ranz-blue-700)] flex items-center justify-center text-xs font-bold">3</span>
                        Impartiality & Independence
                      </h4>
                      <div className="flex items-start space-x-3 pl-8">
                        <Checkbox
                          id="impartialityConfirmed"
                          checked={expertDeclaration.impartialityConfirmed}
                          onCheckedChange={(checked) =>
                            setExpertDeclaration(prev => ({ ...prev, impartialityConfirmed: checked === true }))
                          }
                        />
                        <Label htmlFor="impartialityConfirmed" className="text-sm leading-relaxed cursor-pointer">
                          I confirm that this report represents my <strong>independent, impartial opinion</strong> and
                          has not been influenced by the party engaging me or any other person. My opinions are
                          based solely on the evidence and my professional expertise.
                        </Label>
                      </div>
                    </div>

                    {/* Section 4: Conflict of Interest */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[var(--ranz-blue-100)] text-[var(--ranz-blue-700)] flex items-center justify-center text-xs font-bold">4</span>
                        Conflict of Interest Disclosure
                      </h4>
                      <div className="pl-8 space-y-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="noConflict"
                            checked={!hasConflict}
                            onCheckedChange={(checked) => setHasConflict(checked !== true)}
                          />
                          <Label htmlFor="noConflict" className="text-sm cursor-pointer">
                            I have <strong>no conflict of interest</strong> to declare regarding this inspection or report.
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="hasConflict"
                            checked={hasConflict}
                            onCheckedChange={(checked) => setHasConflict(checked === true)}
                          />
                          <Label htmlFor="hasConflict" className="text-sm cursor-pointer">
                            I have a <strong>potential conflict of interest</strong> to disclose (details below).
                          </Label>
                        </div>
                        {hasConflict && (
                          <div className="space-y-2">
                            <Label htmlFor="conflictDetails" className="text-sm font-medium">
                              Please describe the conflict of interest:
                            </Label>
                            <Textarea
                              id="conflictDetails"
                              value={conflictDisclosure}
                              onChange={(e) => setConflictDisclosure(e.target.value)}
                              placeholder="Describe any actual or potential conflict of interest, prior relationship with the property/parties, or financial interest..."
                              rows={3}
                              className={hasConflict && !conflictDisclosure.trim() ? "border-red-300" : ""}
                            />
                            {hasConflict && !conflictDisclosure.trim() && (
                              <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Conflict disclosure is required when a conflict is declared.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 5: Inspection Conduct */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[var(--ranz-blue-100)] text-[var(--ranz-blue-700)] flex items-center justify-center text-xs font-bold">5</span>
                        Inspection Methodology
                      </h4>
                      <div className="flex items-start space-x-3 pl-8">
                        <Checkbox
                          id="inspectionConducted"
                          checked={expertDeclaration.inspectionConducted}
                          onCheckedChange={(checked) =>
                            setExpertDeclaration(prev => ({ ...prev, inspectionConducted: checked === true }))
                          }
                        />
                        <Label htmlFor="inspectionConducted" className="text-sm leading-relaxed cursor-pointer">
                          The inspection was conducted in accordance with the <strong>scope defined in this report</strong>,
                          to the best of my professional ability, and in compliance with relevant New Zealand standards
                          including ISO/IEC 17020:2012 and applicable Building Code requirements.
                        </Label>
                      </div>
                    </div>

                    {/* Section 6: Evidence Integrity */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[var(--ranz-blue-100)] text-[var(--ranz-blue-700)] flex items-center justify-center text-xs font-bold">6</span>
                        Evidence Integrity
                      </h4>
                      <div className="flex items-start space-x-3 pl-8">
                        <Checkbox
                          id="evidenceIntegrity"
                          checked={expertDeclaration.evidenceIntegrity}
                          onCheckedChange={(checked) =>
                            setExpertDeclaration(prev => ({ ...prev, evidenceIntegrity: checked === true }))
                          }
                        />
                        <Label htmlFor="evidenceIntegrity" className="text-sm leading-relaxed cursor-pointer">
                          All photographs and documentary evidence included in this report are <strong>genuine and unaltered</strong>
                          (except for standard optimization). Digital hashes have been computed to verify integrity.
                          Chain of custody has been maintained as documented in Appendix C.
                        </Label>
                      </div>
                    </div>

                    {/* Section 7: Court Compliance */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[var(--ranz-blue-100)] text-[var(--ranz-blue-700)] flex items-center justify-center text-xs font-bold">7</span>
                        Court Compliance
                      </h4>
                      <div className="flex items-start space-x-3 pl-8">
                        <Checkbox
                          id="courtComplianceAccepted"
                          checked={expertDeclaration.courtComplianceAccepted}
                          onCheckedChange={(checked) =>
                            setExpertDeclaration(prev => ({ ...prev, courtComplianceAccepted: checked === true }))
                          }
                        />
                        <Label htmlFor="courtComplianceAccepted" className="text-sm leading-relaxed cursor-pointer">
                          I agree to <strong>comply with any direction of the Court</strong> regarding my evidence and
                          to promptly notify the Court and all parties if I change my opinion on a material matter.
                        </Label>
                      </div>
                    </div>

                    {/* Section 8: False Evidence Warning */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">!</span>
                        Acknowledgment
                      </h4>
                      <div className="flex items-start space-x-3 pl-8">
                        <Checkbox
                          id="falseEvidenceUnderstood"
                          checked={expertDeclaration.falseEvidenceUnderstood}
                          onCheckedChange={(checked) =>
                            setExpertDeclaration(prev => ({ ...prev, falseEvidenceUnderstood: checked === true }))
                          }
                        />
                        <Label htmlFor="falseEvidenceUnderstood" className="text-sm leading-relaxed cursor-pointer">
                          I understand that <strong>giving false evidence may constitute perjury</strong> and may
                          expose me to criminal prosecution under the Crimes Act 1961. I confirm that all
                          statements in this report are true and accurate to the best of my knowledge and belief.
                        </Label>
                      </div>
                    </div>

                    {/* Completion Status */}
                    <div className={`p-4 rounded-lg ${allDeclarationsComplete ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                      <div className="flex items-center gap-2">
                        {allDeclarationsComplete ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-800">All declarations complete</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                            <span className="font-medium text-orange-800">Please complete all declaration items above</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Signature Section */}
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-semibold flex items-center gap-2">
                        <PenTool className="h-4 w-4" />
                        Inspector Signature
                      </h4>
                      <SignaturePad
                        ref={signaturePadRef}
                        width={500}
                        height={200}
                        disabled={!allDeclarationsComplete}
                        onSign={() => setHasSignature(true)}
                      />
                      {!allDeclarationsComplete && (
                        <p className="text-sm text-muted-foreground">
                          Please complete all declaration items above to enable signing.
                        </p>
                      )}
                      {allDeclarationsComplete && hasSignature && (
                        <Button
                          onClick={saveSignature}
                          disabled={savingSignature}
                          className="bg-[var(--ranz-blue-600)] hover:bg-[var(--ranz-blue-700)]"
                        >
                          {savingSignature ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving Declaration...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Sign & Save Declaration
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          {!isAlreadySubmitted && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Ready to Submit?</CardTitle>
                    <CardDescription>
                      {!validation.isValid
                        ? "Please resolve all errors before submitting."
                        : !signatureStatus?.declarationSigned && !hasSignature
                        ? "Please sign the declaration above before submitting."
                        : "All validation checks passed. Your report is ready for submission."}
                    </CardDescription>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={
                      !validation.isValid ||
                      submitting ||
                      (!signatureStatus?.declarationSigned && (!allDeclarationsComplete || !hasSignature))
                    }
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit for Review
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
