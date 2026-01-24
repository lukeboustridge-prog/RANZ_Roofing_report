"use client";

/**
 * PreSubmitChecklist Component
 * Shows validation status in real-time as inspector works on a report.
 * Can be embedded in report detail pages to track progress toward submission.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  MapPin,
  Calendar,
  Layers,
  Camera,
  Shield,
  FileWarning,
  Navigation,
  Clock,
  Scale,
  Send,
} from "lucide-react";

// Types
interface ValidationDetails {
  propertyDetails: { complete: boolean; missing: string[] };
  inspectionDetails: { complete: boolean; missing: string[] };
  roofElements: { complete: boolean; count: number; minimum: number };
  defects: { documented: boolean; count: number };
  photos: {
    sufficient: boolean;
    count: number;
    minimum: number;
    withExif: number;
    withGps: number;
  };
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

interface PreSubmitChecklistProps {
  reportId: string;
  inspectionType?: string;
  compact?: boolean; // Compact mode for sidebar display
  onValidationChange?: (validation: ValidationResult) => void;
  className?: string;
}

// Section configuration
const SECTIONS = [
  {
    key: "propertyDetails",
    label: "Property Details",
    icon: MapPin,
    path: "edit",
    description: "Address, type, and location information",
  },
  {
    key: "inspectionDetails",
    label: "Inspection Details",
    icon: Calendar,
    path: "edit",
    description: "Date, weather, access method",
  },
  {
    key: "roofElements",
    label: "Roof Elements",
    icon: Layers,
    path: "elements",
    description: "Document all roof components",
  },
  {
    key: "photos",
    label: "Photos",
    icon: Camera,
    path: "photos",
    description: "Photo evidence with metadata",
  },
  {
    key: "defects",
    label: "Defects",
    icon: AlertTriangle,
    path: "defects",
    description: "Document any defects found",
  },
  {
    key: "compliance",
    label: "Compliance",
    icon: Shield,
    path: "compliance",
    description: "Building code checklists",
  },
] as const;

// Court report types require stricter evidence
const COURT_REPORT_TYPES = ["DISPUTE_RESOLUTION", "WARRANTY_CLAIM"];

export function PreSubmitChecklist({
  reportId,
  inspectionType,
  compact = false,
  onValidationChange,
  className = "",
}: PreSubmitChecklistProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  const isCourtReport = inspectionType
    ? COURT_REPORT_TYPES.includes(inspectionType)
    : false;

  // Fetch validation status
  const fetchValidation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/reports/${reportId}/submit`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch validation status");
      }

      setValidation(data.validation);
      if (onValidationChange) {
        onValidationChange(data.validation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load checklist");
    } finally {
      setIsLoading(false);
    }
  }, [reportId, onValidationChange]);

  useEffect(() => {
    fetchValidation();
  }, [fetchValidation]);

  // Get section status
  const getSectionStatus = (key: string) => {
    if (!validation) return { complete: false, details: "" };

    const details = validation.validationDetails;

    switch (key) {
      case "propertyDetails":
        return {
          complete: details.propertyDetails.complete,
          details: details.propertyDetails.complete
            ? "Complete"
            : `Missing: ${details.propertyDetails.missing.join(", ")}`,
        };
      case "inspectionDetails":
        return {
          complete: details.inspectionDetails.complete,
          details: details.inspectionDetails.complete
            ? "Complete"
            : `Missing: ${details.inspectionDetails.missing.join(", ")}`,
        };
      case "roofElements":
        return {
          complete: details.roofElements.complete,
          details: `${details.roofElements.count} / ${details.roofElements.minimum} minimum`,
        };
      case "photos": {
        const photoStatus = details.photos;
        const exifWarning =
          isCourtReport && photoStatus.withExif < photoStatus.count;
        const gpsWarning =
          isCourtReport && photoStatus.withGps < photoStatus.count;
        return {
          complete: photoStatus.sufficient && !exifWarning && !gpsWarning,
          details: `${photoStatus.count} / ${photoStatus.minimum} minimum`,
          exifCount: photoStatus.withExif,
          gpsCount: photoStatus.withGps,
          exifWarning,
          gpsWarning,
        };
      }
      case "defects":
        return {
          complete: true, // Defects are always "complete" (0 is valid)
          details: `${details.defects.count} documented`,
        };
      case "compliance":
        return {
          complete: details.compliance.complete,
          details: `${details.compliance.coverage}% coverage (${details.compliance.required} required)`,
        };
      default:
        return { complete: false, details: "" };
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Checking submission readiness...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <div className="text-center">
            <p className="text-red-600 text-sm mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchValidation}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validation) return null;

  // Compact mode for sidebar
  if (compact && !expanded) {
    return (
      <Card className={className}>
        <CardContent className="py-3">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setExpanded(true)}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  validation.isValid
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {validation.completionPercentage}%
              </div>
              <span className="text-sm font-medium">Submission Checklist</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileWarning className="h-4 w-4" />
            Pre-Submit Checklist
            {validation.isValid ? (
              <Badge variant="outline" className="ml-2 text-green-600 border-green-300">
                Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2 text-orange-600 border-orange-300">
                {validation.missingRequiredItems.length} items needed
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchValidation}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {compact && (
              <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-medium">{validation.completionPercentage}%</span>
          </div>
          <Progress
            value={validation.completionPercentage}
            className={`h-2 ${
              validation.isValid ? "[&>div]:bg-green-500" : "[&>div]:bg-orange-500"
            }`}
          />
        </div>

        {/* Court Report Warning */}
        {isCourtReport && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2 text-blue-700 text-xs">
              <Scale className="h-3 w-3" />
              <span className="font-medium">
                Court Report: Strict EXIF and GPS requirements apply
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {SECTIONS.map((section) => {
            const status = getSectionStatus(section.key);
            const Icon = section.icon;
            const isPhotoSection = section.key === "photos";
            const photoStatus = isPhotoSection
              ? status as {
                  complete: boolean;
                  details: string;
                  exifCount?: number;
                  gpsCount?: number;
                  exifWarning?: boolean;
                  gpsWarning?: boolean;
                }
              : status;

            return (
              <Link
                key={section.key}
                href={`/reports/${reportId}/${section.path}`}
                className="block"
              >
                <div
                  className={`flex items-center gap-3 p-2 rounded-lg border transition-colors hover:bg-muted/50 ${
                    status.complete
                      ? "border-green-200 bg-green-50/50"
                      : "border-orange-200 bg-orange-50/50"
                  }`}
                >
                  {/* Status Icon */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      status.complete
                        ? "bg-green-100 text-green-600"
                        : "bg-orange-100 text-orange-600"
                    }`}
                  >
                    {status.complete ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>

                  {/* Section Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{section.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {status.details}
                    </p>

                    {/* Photo section extra info for court reports */}
                    {isPhotoSection && isCourtReport && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        <div
                          className={`flex items-center gap-1 text-xs ${
                            photoStatus.exifWarning
                              ? "text-orange-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          <span>
                            EXIF: {photoStatus.exifCount || 0}/{validation.validationDetails.photos.count}
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-1 text-xs ${
                            photoStatus.gpsWarning
                              ? "text-orange-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Navigation className="h-3 w-3" />
                          <span>
                            GPS: {photoStatus.gpsCount || 0}/{validation.validationDetails.photos.count}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Errors Summary */}
        {validation.errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-2">
              <XCircle className="h-4 w-4" />
              Blocking Issues ({validation.errors.length})
            </div>
            <ul className="space-y-1">
              {validation.errors.slice(0, 3).map((error, index) => (
                <li key={index} className="text-xs text-red-600 flex items-start gap-1">
                  <span className="mt-0.5">-</span>
                  <span>{error}</span>
                </li>
              ))}
              {validation.errors.length > 3 && (
                <li className="text-xs text-red-600">
                  + {validation.errors.length - 3} more issues
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Warnings Summary */}
        {validation.warnings.length > 0 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              Warnings ({validation.warnings.length})
            </div>
            <ul className="space-y-1">
              {validation.warnings.slice(0, 2).map((warning, index) => (
                <li key={index} className="text-xs text-amber-600 flex items-start gap-1">
                  <span className="mt-0.5">-</span>
                  <span>{warning}</span>
                </li>
              ))}
              {validation.warnings.length > 2 && (
                <li className="text-xs text-amber-600">
                  + {validation.warnings.length - 2} more warnings
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-4 pt-4 border-t">
          <Button
            asChild
            className="w-full"
            disabled={!validation.isValid}
            variant={validation.isValid ? "default" : "secondary"}
          >
            <Link href={`/reports/${reportId}/submit`}>
              <Send className="h-4 w-4 mr-2" />
              {validation.isValid
                ? "Review & Submit Report"
                : `Complete ${validation.missingRequiredItems.length} Item${
                    validation.missingRequiredItems.length !== 1 ? "s" : ""
                  } to Submit`}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default PreSubmitChecklist;
