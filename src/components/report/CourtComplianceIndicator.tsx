"use client";

/**
 * CourtComplianceIndicator Component
 * Shows High Court Rules Schedule 4 compliance status for dispute resolution reports
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Scale,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Shield,
  FileCheck,
  BookOpen,
} from "lucide-react";

// Types
interface ComplianceCheck {
  id: string;
  label: string;
  description: string;
  required: boolean;
  passed: boolean;
  details: string;
  reference: string;
}

interface ComplianceResult {
  isCompliant: boolean;
  score: number;
  requiredChecks: number;
  passedChecks: number;
  checks: ComplianceCheck[];
  inspectionType: string;
  isCourtReport: boolean;
}

interface CourtComplianceIndicatorProps {
  reportId: string;
  compact?: boolean; // Show only badge in compact mode
  className?: string;
}

export function CourtComplianceIndicator({
  reportId,
  compact = false,
  className = "",
}: CourtComplianceIndicatorProps) {
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Fetch compliance status
  const fetchCompliance = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/reports/${reportId}/court-compliance`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check compliance");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load compliance status");
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchCompliance();
  }, [fetchCompliance]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">Checking compliance...</span>
      </div>
    );
  }

  if (error || !result) {
    return null; // Silently fail for non-critical feature
  }

  // Don't show for non-court reports unless they want to see it
  if (!result.isCourtReport && compact) {
    return null;
  }

  // Compact badge mode
  if (compact) {
    return (
      <Badge
        variant="outline"
        className={`gap-1 ${
          result.isCompliant
            ? "text-green-600 border-green-300 bg-green-50"
            : "text-orange-600 border-orange-300 bg-orange-50"
        } ${className}`}
      >
        <Scale className="h-3 w-3" />
        {result.isCompliant ? "Court Ready" : `${result.score}% Compliant`}
      </Badge>
    );
  }

  // Separate required vs optional checks
  const requiredChecks = result.checks.filter((c) => c.required);
  const optionalChecks = result.checks.filter((c) => !c.required);
  const failedRequired = requiredChecks.filter((c) => !c.passed);

  return (
    <Card className={`${className} ${
      result.isCourtReport
        ? result.isCompliant
          ? "border-green-200 bg-green-50/30"
          : "border-orange-200 bg-orange-50/30"
        : ""
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-5 w-5 text-blue-600" />
            High Court Rules Compliance
            {result.isCourtReport && (
              <Badge
                variant={result.isCompliant ? "default" : "secondary"}
                className={
                  result.isCompliant
                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                    : "bg-orange-100 text-orange-700 hover:bg-orange-100"
                }
              >
                {result.isCompliant ? "Compliant" : "Action Required"}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchCompliance}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Court Report Notice */}
        {result.isCourtReport && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-700">
              <strong>Dispute Resolution Report</strong> - This report type may be used in
              court proceedings, Disputes Tribunal hearings, or LBP Board complaints.
              Strict evidence standards apply.
            </p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Compliance Score</span>
            <span className="font-medium">{result.score}%</span>
          </div>
          <Progress
            value={result.score}
            className={`h-2 ${
              result.isCompliant
                ? "[&>div]:bg-green-500"
                : "[&>div]:bg-orange-500"
            }`}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {result.passedChecks} of {result.requiredChecks} required checks passed
          </p>
        </div>
      </CardHeader>

      <CardContent>
        {/* Quick Summary */}
        {!result.isCompliant && failedRequired.length > 0 && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-700 font-medium text-sm mb-2">
              <AlertCircle className="h-4 w-4" />
              Required Actions ({failedRequired.length})
            </div>
            <ul className="space-y-1">
              {failedRequired.slice(0, 3).map((check) => (
                <li key={check.id} className="text-xs text-orange-600 flex items-start gap-1">
                  <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{check.label}: {check.details}</span>
                </li>
              ))}
              {failedRequired.length > 3 && (
                <li className="text-xs text-orange-600">
                  + {failedRequired.length - 3} more required actions
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Expandable Details */}
        <button
          className="w-full flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-sm font-medium">
            View All Compliance Checks ({result.checks.length})
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Required Checks */}
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-blue-600" />
                Required for Court Compliance
              </h4>
              <div className="space-y-2">
                {requiredChecks.map((check) => (
                  <ComplianceCheckItem key={check.id} check={check} />
                ))}
              </div>
            </div>

            {/* Optional Checks */}
            {optionalChecks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <FileCheck className="h-4 w-4 text-gray-600" />
                  Recommended Checks
                </h4>
                <div className="space-y-2">
                  {optionalChecks.map((check) => (
                    <ComplianceCheckItem key={check.id} check={check} />
                  ))}
                </div>
              </div>
            )}

            {/* Legal References */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-gray-600" />
                Legal References
              </h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>- High Court Rules 2016, Schedule 4 (Expert Witnesses)</p>
                <p>- Evidence Act 2006, Sections 25 and 137</p>
                <p>- Crimes Act 1961, Section 108 (Perjury)</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Action */}
        {!result.isCompliant && result.isCourtReport && (
          <div className="mt-4 pt-4 border-t">
            <a
              href={`/reports/${reportId}/submit`}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Complete Declaration on Submit Page
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Individual check item component
function ComplianceCheckItem({ check }: { check: ComplianceCheck }) {
  return (
    <div
      className={`flex items-start gap-3 p-2 rounded-lg border ${
        check.passed
          ? "border-green-200 bg-green-50/50"
          : check.required
          ? "border-red-200 bg-red-50/50"
          : "border-gray-200 bg-gray-50/50"
      }`}
    >
      <div
        className={`mt-0.5 flex-shrink-0 ${
          check.passed
            ? "text-green-600"
            : check.required
            ? "text-red-600"
            : "text-gray-400"
        }`}
      >
        {check.passed ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{check.label}</span>
          {check.required && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              Required
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{check.description}</p>
        <p
          className={`text-xs mt-1 ${
            check.passed ? "text-green-600" : "text-red-600"
          }`}
        >
          {check.details}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          Ref: {check.reference}
        </p>
      </div>
    </div>
  );
}

export default CourtComplianceIndicator;
