"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Info,
  Lightbulb,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReviewComment {
  id: string;
  comment: string;
  severity: "CRITICAL" | "ISSUE" | "NOTE" | "SUGGESTION";
  resolved: boolean;
  resolvedAt: string | null;
  section: string | null;
  defectId: string | null;
  roofElementId: string | null;
  photoId: string | null;
  revisionRound: number;
  createdAt: string;
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
}

interface CommentSummary {
  total: number;
  resolved: number;
  unresolved: number;
  bySeverity: {
    CRITICAL: number;
    ISSUE: number;
    NOTE: number;
    SUGGESTION: number;
  };
}

interface Report {
  id: string;
  reportNumber: string;
  status: string;
  propertyAddress: string;
  revisionRound: number;
}

const severityConfig = {
  CRITICAL: {
    icon: AlertTriangle,
    label: "Critical",
    description: "Must be fixed before approval",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
    textColor: "text-red-800",
  },
  ISSUE: {
    icon: AlertCircle,
    label: "Issue",
    description: "Should be addressed",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    iconColor: "text-orange-600",
    textColor: "text-orange-800",
  },
  NOTE: {
    icon: Info,
    label: "Note",
    description: "Informational feedback",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    textColor: "text-blue-800",
  },
  SUGGESTION: {
    icon: Lightbulb,
    label: "Suggestion",
    description: "Optional improvement",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-600",
    textColor: "text-green-800",
  },
};

export default function RevisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [summary, setSummary] = useState<CommentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch report details
      const reportRes = await fetch(`/api/reports/${id}`);
      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setReport(reportData);
      }

      // Fetch comments
      const commentsRes = await fetch(`/api/reports/${id}/comments`);
      if (commentsRes.ok) {
        const data = await commentsRes.json();
        setComments(data.comments || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    setResolvingId(commentId);
    try {
      const res = await fetch(`/api/reports/${id}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      });

      if (res.ok) {
        // Update local state
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, resolved, resolvedAt: resolved ? new Date().toISOString() : null }
              : c
          )
        );
        // Update summary
        if (summary) {
          setSummary({
            ...summary,
            resolved: summary.resolved + (resolved ? 1 : -1),
            unresolved: summary.unresolved + (resolved ? -1 : 1),
          });
        }
      }
    } catch (error) {
      console.error("Error resolving comment:", error);
    } finally {
      setResolvingId(null);
    }
  };

  const filteredComments = showResolved
    ? comments
    : comments.filter((c) => !c.resolved);

  const groupedComments = filteredComments.reduce(
    (acc, comment) => {
      const severity = comment.severity;
      if (!acc[severity]) acc[severity] = [];
      acc[severity].push(comment);
      return acc;
    },
    {} as Record<string, ReviewComment[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ranz-charcoal)]" />
      </div>
    );
  }

  const hasUnresolvedCritical = comments.some(
    (c) => c.severity === "CRITICAL" && !c.resolved
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--ranz-charcoal-extra-dark)]">
            Revision Feedback
          </h1>
          <p className="text-sm text-muted-foreground">
            {report?.reportNumber} - {report?.propertyAddress}
          </p>
        </div>
      </div>

      {/* Status Banner */}
      {report?.status === "REVISION_REQUIRED" && (
        <div className={cn(
          "rounded-lg border p-4",
          hasUnresolvedCritical
            ? "bg-red-50 border-red-200"
            : "bg-yellow-50 border-yellow-200"
        )}>
          <div className="flex items-start gap-3">
            <Clock className={cn(
              "h-5 w-5 mt-0.5",
              hasUnresolvedCritical ? "text-red-600" : "text-yellow-600"
            )} />
            <div>
              <h3 className={cn(
                "font-semibold",
                hasUnresolvedCritical ? "text-red-800" : "text-yellow-800"
              )}>
                Revisions Required
              </h3>
              <p className={cn(
                "text-sm mt-1",
                hasUnresolvedCritical ? "text-red-700" : "text-yellow-700"
              )}>
                {hasUnresolvedCritical
                  ? "You have critical issues that must be resolved before resubmitting."
                  : "Please address the feedback below and resubmit your report."}
              </p>
              {summary && (
                <p className="text-sm mt-2">
                  <span className="font-medium">{summary.unresolved}</span> items remaining
                  {summary.resolved > 0 && (
                    <span className="text-green-600 ml-2">
                      ({summary.resolved} resolved)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["CRITICAL", "ISSUE", "NOTE", "SUGGESTION"] as const).map((severity) => {
            const config = severityConfig[severity];
            const Icon = config.icon;
            const count = summary.bySeverity[severity];
            const unresolvedCount = comments.filter(
              (c) => c.severity === severity && !c.resolved
            ).length;

            return (
              <div
                key={severity}
                className={cn(
                  "rounded-lg border p-4",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("h-4 w-4", config.iconColor)} />
                  <span className={cn("text-sm font-medium", config.textColor)}>
                    {config.label}
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {unresolvedCount}
                  {count !== unresolvedCount && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / {count}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Feedback Items</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowResolved(!showResolved)}
        >
          {showResolved ? "Hide Resolved" : "Show Resolved"}
        </Button>
      </div>

      {/* Comments List */}
      {filteredComments.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-medium">
            {showResolved ? "No feedback items" : "All items resolved!"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {showResolved
              ? "No review feedback has been added yet."
              : "You've addressed all the reviewer feedback."}
          </p>
          {!showResolved && summary && summary.resolved > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setShowResolved(true)}
            >
              View {summary.resolved} resolved items
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {(["CRITICAL", "ISSUE", "NOTE", "SUGGESTION"] as const).map((severity) => {
            const items = groupedComments[severity];
            if (!items || items.length === 0) return null;

            const config = severityConfig[severity];
            const Icon = config.icon;

            return (
              <div key={severity} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-5 w-5", config.iconColor)} />
                  <h3 className={cn("font-medium", config.textColor)}>
                    {config.label} ({items.length})
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    - {config.description}
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((comment) => (
                    <div
                      key={comment.id}
                      className={cn(
                        "rounded-lg border p-4 transition-all",
                        comment.resolved
                          ? "bg-gray-50 border-gray-200 opacity-60"
                          : config.bgColor + " " + config.borderColor
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm",
                            comment.resolved ? "text-gray-600" : "text-foreground"
                          )}>
                            {comment.comment}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>
                              By {comment.reviewer.name}
                            </span>
                            <span>
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                            {comment.section && (
                              <span className="bg-secondary px-2 py-0.5 rounded">
                                {comment.section.replace("_", " ")}
                              </span>
                            )}
                            {comment.defectId && (
                              <Link
                                href={`/reports/${id}/defects/${comment.defectId}`}
                                className="text-[var(--ranz-charcoal)] hover:underline flex items-center gap-1"
                              >
                                <FileText className="h-3 w-3" />
                                View Defect
                              </Link>
                            )}
                          </div>
                        </div>
                        <Button
                          variant={comment.resolved ? "outline" : "default"}
                          size="sm"
                          disabled={resolvingId === comment.id}
                          onClick={() => handleResolve(comment.id, !comment.resolved)}
                          className={cn(
                            comment.resolved
                              ? ""
                              : "bg-[var(--ranz-charcoal)] hover:bg-[var(--ranz-charcoal-dark)]"
                          )}
                        >
                          {resolvingId === comment.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          ) : comment.resolved ? (
                            <>
                              <Circle className="h-4 w-4 mr-1" />
                              Unresolve
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Mark Resolved
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Link href={`/reports/${id}`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Report
          </Button>
        </Link>

        {report?.status === "REVISION_REQUIRED" && (
          <div className="flex items-center gap-4">
            {hasUnresolvedCritical && (
              <p className="text-sm text-red-600">
                Resolve all critical items before resubmitting
              </p>
            )}
            <Link href={`/reports/${id}/submit`}>
              <Button
                disabled={hasUnresolvedCritical}
                className="bg-[var(--ranz-charcoal)] hover:bg-[var(--ranz-charcoal-dark)]"
              >
                Resubmit for Review
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
