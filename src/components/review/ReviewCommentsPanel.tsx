"use client";

/**
 * ReviewCommentsPanel Component
 * Displays reviewer feedback/comments for a report
 * Used by both inspectors (to see feedback) and reviewers (to view their comments)
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  CheckCircle2,
  Clock,
  MessageSquare,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types
interface ReviewComment {
  id: string;
  reportId: string;
  reviewerId: string;
  comment: string;
  severity: "CRITICAL" | "ISSUE" | "NOTE" | "SUGGESTION";
  defectId: string | null;
  roofElementId: string | null;
  photoId: string | null;
  section: string | null;
  resolved: boolean;
  revisionRound: number;
  createdAt: string;
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
}

interface CommentsSummary {
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

interface ReviewCommentsPanelProps {
  reportId: string;
  canResolve?: boolean; // Inspector can mark as addressed
  onCommentResolved?: (commentId: string) => void;
  className?: string;
}

// Severity configuration
const SEVERITY_CONFIG = {
  CRITICAL: {
    label: "Critical",
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    badgeVariant: "destructive" as const,
  },
  ISSUE: {
    label: "Issue",
    icon: AlertTriangle,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    badgeVariant: "default" as const,
  },
  NOTE: {
    label: "Note",
    icon: Info,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    badgeVariant: "secondary" as const,
  },
  SUGGESTION: {
    label: "Suggestion",
    icon: Lightbulb,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    badgeVariant: "outline" as const,
  },
};

export function ReviewCommentsPanel({
  reportId,
  canResolve = false,
  onCommentResolved,
  className = "",
}: ReviewCommentsPanelProps) {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [summary, setSummary] = useState<CommentsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "CRITICAL",
    "ISSUE",
  ]);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [resolvedFilter, setResolvedFilter] = useState<string>("all");
  const [roundFilter, setRoundFilter] = useState<string>("all");

  // Get unique revision rounds
  const revisionRounds = [...new Set(comments.map((c) => c.revisionRound))].sort(
    (a, b) => b - a
  );

  // Fetch comments
  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (resolvedFilter !== "all") params.set("resolved", resolvedFilter);
      if (roundFilter !== "all") params.set("revisionRound", roundFilter);

      const response = await fetch(
        `/api/reports/${reportId}/comments?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      const data = await response.json();
      setComments(data.comments);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }, [reportId, severityFilter, resolvedFilter, roundFilter]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Toggle section expansion
  const toggleSection = (severity: string) => {
    setExpandedSections((prev) =>
      prev.includes(severity)
        ? prev.filter((s) => s !== severity)
        : [...prev, severity]
    );
  };

  // Mark comment as resolved
  const handleResolve = async (commentId: string, resolved: boolean) => {
    try {
      const response = await fetch(
        `/api/reports/${reportId}/comments/${commentId}/resolve`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolved }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update comment");
      }

      // Update local state
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, resolved } : c))
      );

      if (onCommentResolved) {
        onCommentResolved(commentId);
      }
    } catch (err) {
      console.error("Failed to resolve comment:", err);
    }
  };

  // Group comments by severity for display
  const groupedComments = {
    CRITICAL: comments.filter((c) => c.severity === "CRITICAL"),
    ISSUE: comments.filter((c) => c.severity === "ISSUE"),
    NOTE: comments.filter((c) => c.severity === "NOTE"),
    SUGGESTION: comments.filter((c) => c.severity === "SUGGESTION"),
  };

  // Get target label for a comment
  const getTargetLabel = (comment: ReviewComment): string | null => {
    if (comment.defectId) return `Defect`;
    if (comment.roofElementId) return `Roof Element`;
    if (comment.photoId) return `Photo`;
    if (comment.section) return comment.section;
    return null;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading comments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button variant="outline" onClick={fetchComments} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Review Comments
            {summary && (
              <Badge variant="secondary" className="ml-2">
                {summary.total}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchComments}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary Stats */}
        {summary && summary.total > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              {summary.resolved} resolved
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3 text-amber-600" />
              {summary.unresolved} pending
            </Badge>
          </div>
        )}

        {/* Filters */}
        {comments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[130px] h-8">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="ISSUE">Issue</SelectItem>
                <SelectItem value="NOTE">Note</SelectItem>
                <SelectItem value="SUGGESTION">Suggestion</SelectItem>
              </SelectContent>
            </Select>

            <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="false">Pending</SelectItem>
                <SelectItem value="true">Resolved</SelectItem>
              </SelectContent>
            </Select>

            {revisionRounds.length > 1 && (
              <Select value={roundFilter} onValueChange={setRoundFilter}>
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue placeholder="Round" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rounds</SelectItem>
                  {revisionRounds.map((round) => (
                    <SelectItem key={round} value={round.toString()}>
                      Round {round}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No review comments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(["CRITICAL", "ISSUE", "NOTE", "SUGGESTION"] as const).map(
              (severity) => {
                const severityComments = groupedComments[severity];
                if (severityComments.length === 0) return null;

                const config = SEVERITY_CONFIG[severity];
                const Icon = config.icon;
                const isExpanded = expandedSections.includes(severity);

                return (
                  <div key={severity} className="border rounded-lg">
                    {/* Section Header */}
                    <button
                      className={`w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors ${
                        isExpanded ? "border-b" : ""
                      }`}
                      onClick={() => toggleSection(severity)}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span className="font-medium">{config.label}</span>
                        <Badge variant={config.badgeVariant} className="ml-1">
                          {severityComments.length}
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {/* Comments List */}
                    {isExpanded && (
                      <div className="p-3 space-y-3">
                        {severityComments.map((comment) => {
                          const targetLabel = getTargetLabel(comment);

                          return (
                            <div
                              key={comment.id}
                              className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor} ${
                                comment.resolved ? "opacity-60" : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  {/* Target and Round */}
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    {targetLabel && (
                                      <Badge variant="outline" className="text-xs">
                                        {targetLabel}
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      Round {comment.revisionRound}
                                    </Badge>
                                    {comment.resolved && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs text-green-600 border-green-300"
                                      >
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Resolved
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Comment Text */}
                                  <p
                                    className={`text-sm ${
                                      comment.resolved
                                        ? "line-through text-muted-foreground"
                                        : ""
                                    }`}
                                  >
                                    {comment.comment}
                                  </p>

                                  {/* Meta */}
                                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                    <span>{comment.reviewer.name}</span>
                                    <span>-</span>
                                    <span>{formatDate(comment.createdAt)}</span>
                                  </div>
                                </div>

                                {/* Resolve Checkbox */}
                                {canResolve && (
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={comment.resolved}
                                      onCheckedChange={(checked) =>
                                        handleResolve(comment.id, checked as boolean)
                                      }
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      Addressed
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReviewCommentsPanel;
