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

    if (!declarationChecked) {
      setError("Please accept the declaration before signing");
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
          declarationAccepted: declarationChecked,
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

          {/* Declaration and Signature */}
          {!isAlreadySubmitted && validation.isValid && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  Declaration & Signature
                </CardTitle>
                <CardDescription>
                  Please read and accept the declaration, then sign below to certify this report.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Declaration Text */}
                <div className="p-4 bg-muted rounded-lg space-y-4 text-sm">
                  <p className="font-semibold">Inspector Declaration</p>
                  <p>
                    I, the undersigned inspector, hereby declare that:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>
                      The inspection was conducted in accordance with the scope defined in this report
                      and to the best of my professional ability.
                    </li>
                    <li>
                      All observations, findings, and opinions expressed in this report are based on
                      the conditions observed at the time of inspection.
                    </li>
                    <li>
                      I have no personal or financial interest in the property or its sale/purchase
                      that could constitute a conflict of interest.
                    </li>
                    <li>
                      The photographs and evidence included in this report have not been altered or
                      manipulated beyond standard optimization.
                    </li>
                    <li>
                      I understand that this report may be relied upon for legal, insurance, or
                      dispute resolution purposes.
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground italic">
                    This declaration is made in accordance with the High Court Rules Schedule 4
                    requirements for expert witnesses.
                  </p>
                </div>

                {/* Declaration Checkbox */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="declaration"
                    checked={declarationChecked}
                    onCheckedChange={(checked) => setDeclarationChecked(checked === true)}
                    disabled={signatureStatus?.declarationSigned}
                  />
                  <Label
                    htmlFor="declaration"
                    className="text-sm font-medium leading-relaxed cursor-pointer"
                  >
                    I have read and accept the above declaration. I certify that all information
                    in this report is true and accurate to the best of my knowledge and professional
                    judgment.
                  </Label>
                </div>

                {/* Signature Section */}
                {signatureStatus?.declarationSigned ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Report Signed</span>
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
                      Re-sign
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Your Signature</Label>
                    <SignaturePad
                      ref={signaturePadRef}
                      width={500}
                      height={200}
                      disabled={!declarationChecked}
                      onSign={() => setHasSignature(true)}
                    />
                    {!declarationChecked && (
                      <p className="text-sm text-muted-foreground">
                        Please accept the declaration above to enable signing.
                      </p>
                    )}
                    {declarationChecked && hasSignature && (
                      <Button
                        onClick={saveSignature}
                        disabled={savingSignature}
                        variant="outline"
                      >
                        {savingSignature ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Save Signature
                          </>
                        )}
                      </Button>
                    )}
                  </div>
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
                      (!signatureStatus?.declarationSigned && (!declarationChecked || !hasSignature))
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
