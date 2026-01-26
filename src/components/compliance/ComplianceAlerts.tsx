"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XOctagon,
  Scale,
  Wrench,
  Info,
  FileText,
  ExternalLink,
} from "lucide-react";
import type {
  ComplianceResult,
  CustomAlert,
} from "@/lib/compliance/engine";
import type { Determination, CaseStudy, AlertType } from "@/lib/compliance/determinations";

// ============================================
// ALERT TYPE STYLING
// ============================================

interface AlertStyle {
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: React.ReactNode;
  iconPrefix: string;
}

const ALERT_STYLES: Record<AlertType, AlertStyle> = {
  "danger-box": {
    bgColor: "bg-red-50",
    borderColor: "border-l-red-600",
    textColor: "text-red-900",
    icon: <XOctagon className="h-5 w-5 text-red-600" />,
    iconPrefix: "NON-COMPLIANT",
  },
  "warning-box": {
    bgColor: "bg-amber-50",
    borderColor: "border-l-amber-500",
    textColor: "text-amber-900",
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    iconPrefix: "WARNING",
  },
  "case-study-box": {
    bgColor: "bg-rose-50",
    borderColor: "border-l-rose-600",
    textColor: "text-rose-900",
    icon: <Scale className="h-5 w-5 text-rose-600" />,
    iconPrefix: "CASE LAW ALERT",
  },
  "tech-alert": {
    bgColor: "bg-blue-50",
    borderColor: "border-l-blue-500",
    textColor: "text-blue-900",
    icon: <Wrench className="h-5 w-5 text-blue-600" />,
    iconPrefix: "TECHNICAL ALERT",
  },
  "precedent-box": {
    bgColor: "bg-purple-50",
    borderColor: "border-l-purple-600",
    textColor: "text-purple-900",
    icon: <FileText className="h-5 w-5 text-purple-600" />,
    iconPrefix: "DETERMINATION",
  },
  "success-box": {
    bgColor: "bg-green-50",
    borderColor: "border-l-green-600",
    textColor: "text-green-900",
    icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    iconPrefix: "PRECEDENT",
  },
  "info-box": {
    bgColor: "bg-slate-50",
    borderColor: "border-l-slate-500",
    textColor: "text-slate-900",
    icon: <Info className="h-5 w-5 text-slate-600" />,
    iconPrefix: "INFO",
  },
};

// ============================================
// HELPER: Type guard functions
// ============================================

function isDetermination(
  item: Determination | CaseStudy | CustomAlert
): item is Determination {
  return "file" in item && "type" in item && item.type !== "case-study-box";
}

function isCaseStudy(
  item: Determination | CaseStudy | CustomAlert
): item is CaseStudy {
  return "file" in item && item.type === "case-study-box";
}

// ============================================
// INDIVIDUAL ALERT COMPONENT
// ============================================

interface AlertItemProps {
  item: Determination | CaseStudy | CustomAlert;
}

function AlertItem({ item }: AlertItemProps) {
  const style = ALERT_STYLES[item.type] || ALERT_STYLES["info-box"];

  // Determine if we have a PDF link
  let pdfUrl: string | undefined;
  let alertId: string | undefined;
  let alertTitle: string;
  let alertContent: string;

  if (isDetermination(item) || isCaseStudy(item)) {
    pdfUrl = item.file ? `/determinations/${item.file}` : undefined;
    alertId = item.id;
    alertTitle = item.title;
    alertContent = item.summary;
  } else {
    // CustomAlert
    pdfUrl = item.pdfLink;
    alertTitle = item.title;
    alertContent = item.content;
  }

  return (
    <div
      className={`border-l-4 ${style.borderColor} ${style.bgColor} rounded-r-md p-4 ${style.textColor}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1">
          {style.icon}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold text-xs uppercase tracking-wide opacity-75">
                {style.iconPrefix}:
              </span>
              {alertId && (
                <Badge variant="outline" className="text-xs font-mono">
                  {alertId}
                </Badge>
              )}
            </div>
            <h4 className="font-semibold text-sm">{alertTitle}</h4>
            <p
              className="text-sm mt-1 opacity-90"
              dangerouslySetInnerHTML={{ __html: alertContent }}
            />
          </div>
        </div>

        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/50 hover:bg-white/80 transition-colors border border-current/20"
          >
            <ExternalLink className="h-3 w-3" />
            PDF
          </a>
        )}
      </div>
    </div>
  );
}

// ============================================
// RESULT BANNER COMPONENT
// ============================================

interface ResultBannerProps {
  result: ComplianceResult;
}

function ResultBanner({ result }: ResultBannerProps) {
  const bannerStyles: Record<string, string> = {
    "res-consent": "bg-red-600 text-white",
    "res-exempt": "bg-green-600 text-white",
    "res-check": "bg-blue-600 text-white",
    "res-commercial": "bg-slate-700 text-white",
  };

  const bgClass = bannerStyles[result.bannerClass] || bannerStyles["res-check"];

  return (
    <div className={`rounded-lg p-4 text-center ${bgClass}`}>
      <h2 className="text-xl font-bold tracking-tight">{result.bannerTitle}</h2>
      {result.bannerSubtitle && (
        <p className="text-sm mt-1 opacity-90">{result.bannerSubtitle}</p>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPLIANCE ALERTS COMPONENT
// ============================================

interface ComplianceAlertsProps {
  result: ComplianceResult | null;
  showBanner?: boolean;
  showReasons?: boolean;
  showActions?: boolean;
  maxWarnings?: number;
}

export function ComplianceAlerts({
  result,
  showBanner = true,
  showReasons = true,
  showActions = true,
  maxWarnings,
}: ComplianceAlertsProps) {
  if (!result) {
    return null;
  }

  const warningsToShow = maxWarnings
    ? result.warnings.slice(0, maxWarnings)
    : result.warnings;
  const hasMoreWarnings = maxWarnings && result.warnings.length > maxWarnings;

  return (
    <div className="space-y-4">
      {/* Result Banner */}
      {showBanner && <ResultBanner result={result} />}

      {/* Warnings & Alerts */}
      {warningsToShow.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Compliance Alerts ({result.warnings.length})
          </h3>
          {warningsToShow.map((warning, index) => (
            <AlertItem key={index} item={warning} />
          ))}
          {hasMoreWarnings && (
            <p className="text-sm text-muted-foreground italic">
              ...and {result.warnings.length - maxWarnings} more alerts
            </p>
          )}
        </div>
      )}

      {/* Required Actions */}
      {showActions && result.requiredActions.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Required Actions</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {result.requiredActions.map((action, index) => (
                <li
                  key={index}
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: action }}
                />
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Reasons / Checklist Items */}
      {showReasons && result.reasons.length > 0 && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
            Compliance Checklist
          </h3>
          <ul className="space-y-2">
            {result.reasons.map((reason, index) => (
              <li
                key={index}
                className="text-sm border-b border-muted pb-2 last:border-0 last:pb-0"
                dangerouslySetInnerHTML={{ __html: reason }}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPACT VERSION FOR SIDEBAR/SUMMARY
// ============================================

interface ComplianceAlertsSummaryProps {
  result: ComplianceResult | null;
}

export function ComplianceAlertsSummary({ result }: ComplianceAlertsSummaryProps) {
  if (!result) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Complete the risk assessment to see compliance status.
      </div>
    );
  }

  const dangerCount = result.warnings.filter(
    (w) => w.type === "danger-box"
  ).length;
  const warningCount = result.warnings.filter(
    (w) => w.type === "warning-box" || w.type === "case-study-box"
  ).length;

  return (
    <div className="flex items-center gap-3">
      <ResultBanner result={result} />
      <div className="flex gap-2">
        {dangerCount > 0 && (
          <Badge variant="destructive">{dangerCount} Critical</Badge>
        )}
        {warningCount > 0 && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            {warningCount} Warnings
          </Badge>
        )}
        {result.requiredActions.length > 0 && (
          <Badge variant="outline">{result.requiredActions.length} Actions</Badge>
        )}
      </div>
    </div>
  );
}
