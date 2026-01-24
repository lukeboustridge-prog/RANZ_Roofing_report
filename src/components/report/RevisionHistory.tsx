"use client";

/**
 * RevisionHistory Component
 * Shows comparison between revision rounds with field-level diffs
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  History,
  Camera,
  Trash2,
  AlertTriangle,
  Edit3,
  MessageSquare,
  CheckCircle2,
  Clock,
  FileText,
  ArrowRight,
  Circle,
} from "lucide-react";

// Types
interface FieldChange {
  field: string;
  from: string | null;
  to: string | null;
  changedAt: string;
  changedBy: string;
}

interface RevisionComment {
  id: string;
  comment: string;
  severity: "CRITICAL" | "ISSUE" | "NOTE" | "SUGGESTION";
  resolved: boolean;
  section: string | null;
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface RevisionSummary {
  totalChanges: number;
  fieldChanges: number;
  photosAdded: number;
  photosDeleted: number;
  defectsAdded: number;
  defectsUpdated: number;
  commentsReceived: number;
  commentsResolved: number;
}

interface Revision {
  round: number;
  label: string;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
  summary: RevisionSummary;
  fieldChanges: FieldChange[];
  comments: RevisionComment[];
}

interface RevisionHistoryData {
  reportNumber: string;
  status: string;
  currentRound: number;
  totalRevisions: number;
  revisions: Revision[];
}

interface RevisionHistoryProps {
  reportId: string;
  className?: string;
}

// Field label mapping for display
const FIELD_LABELS: Record<string, string> = {
  propertyAddress: "Property Address",
  propertyCity: "City",
  propertyRegion: "Region",
  propertyPostcode: "Postcode",
  propertyType: "Property Type",
  inspectionDate: "Inspection Date",
  inspectionType: "Inspection Type",
  weatherConditions: "Weather Conditions",
  accessMethod: "Access Method",
  limitations: "Limitations",
  clientName: "Client Name",
  clientEmail: "Client Email",
  clientPhone: "Client Phone",
  scopeOfWorks: "Scope of Works",
  methodology: "Methodology",
  equipment: "Equipment",
  conclusions: "Conclusions",
  recommendations: "Recommendations",
  executiveSummary: "Executive Summary",
  status: "Status",
};

// Severity colors
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-600 bg-red-50 border-red-200",
  ISSUE: "text-orange-600 bg-orange-50 border-orange-200",
  NOTE: "text-blue-600 bg-blue-50 border-blue-200",
  SUGGESTION: "text-green-600 bg-green-50 border-green-200",
};

export function RevisionHistory({
  reportId,
  className = "",
}: RevisionHistoryProps) {
  const [data, setData] = useState<RevisionHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRounds, setExpandedRounds] = useState<number[]>([]);

  // Fetch revision history
  const fetchRevisions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/reports/${reportId}/revisions`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch revision history");
      }

      setData(result);

      // Auto-expand most recent revision
      if (result.revisions.length > 0) {
        setExpandedRounds([result.revisions[0].round]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load revisions");
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  // Toggle round expansion
  const toggleRound = (round: number) => {
    setExpandedRounds((prev) =>
      prev.includes(round)
        ? prev.filter((r) => r !== round)
        : [...prev, round]
    );
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get field label
  const getFieldLabel = (field: string) => {
    return FIELD_LABELS[field] || field.replace(/([A-Z])/g, " $1").trim();
  };

  // Truncate long values
  const truncateValue = (value: string | null, maxLength = 50) => {
    if (!value) return "(empty)";
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + "...";
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading revision history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-red-600 text-sm mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchRevisions}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.revisions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No revision history available</p>
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
            <History className="h-5 w-5" />
            Revision History
            <Badge variant="secondary" className="ml-2">
              {data.totalRevisions} revision{data.totalRevisions !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchRevisions}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {data.revisions.map((revision) => {
            const isExpanded = expandedRounds.includes(revision.round);
            const hasChanges =
              revision.fieldChanges.length > 0 ||
              revision.summary.photosAdded > 0 ||
              revision.summary.photosDeleted > 0 ||
              revision.summary.defectsAdded > 0;

            return (
              <div
                key={revision.round}
                className={`border rounded-lg ${
                  revision.isActive
                    ? "border-blue-200 bg-blue-50/30"
                    : "border-gray-200"
                }`}
              >
                {/* Revision Header */}
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-lg"
                  onClick={() => toggleRound(revision.round)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        revision.isActive
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {revision.round}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{revision.label}</span>
                        {revision.isActive && (
                          <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(revision.startedAt)}
                        {revision.endedAt && (
                          <span> - {formatDate(revision.endedAt)}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Summary badges */}
                    <div className="hidden md:flex items-center gap-2">
                      {revision.summary.fieldChanges > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Edit3 className="h-3 w-3 mr-1" />
                          {revision.summary.fieldChanges}
                        </Badge>
                      )}
                      {revision.summary.photosAdded > 0 && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                          <Camera className="h-3 w-3 mr-1" />+{revision.summary.photosAdded}
                        </Badge>
                      )}
                      {revision.summary.defectsAdded > 0 && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                          <AlertTriangle className="h-3 w-3 mr-1" />+{revision.summary.defectsAdded}
                        </Badge>
                      )}
                      {revision.summary.commentsReceived > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {revision.summary.commentsResolved}/{revision.summary.commentsReceived}
                        </Badge>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4">
                    {/* Field Changes */}
                    {revision.fieldChanges.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                          <Edit3 className="h-4 w-4 text-blue-600" />
                          Field Changes ({revision.fieldChanges.length})
                        </h4>
                        <div className="space-y-2">
                          {revision.fieldChanges.map((change, index) => (
                            <div
                              key={index}
                              className="p-2 bg-white rounded border text-sm"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">
                                  {getFieldLabel(change.field)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {change.changedBy}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded line-through">
                                  {truncateValue(change.from)}
                                </span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                  {truncateValue(change.to)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Changes Summary */}
                    {(revision.summary.photosAdded > 0 ||
                      revision.summary.photosDeleted > 0 ||
                      revision.summary.defectsAdded > 0 ||
                      revision.summary.defectsUpdated > 0) && (
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-purple-600" />
                          Content Changes
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {revision.summary.photosAdded > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200 text-sm">
                              <Camera className="h-4 w-4 text-green-600" />
                              <span>+{revision.summary.photosAdded} photos</span>
                            </div>
                          )}
                          {revision.summary.photosDeleted > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200 text-sm">
                              <Trash2 className="h-4 w-4 text-red-600" />
                              <span>-{revision.summary.photosDeleted} photos</span>
                            </div>
                          )}
                          {revision.summary.defectsAdded > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-orange-50 rounded border border-orange-200 text-sm">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <span>+{revision.summary.defectsAdded} defects</span>
                            </div>
                          )}
                          {revision.summary.defectsUpdated > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                              <Edit3 className="h-4 w-4 text-blue-600" />
                              <span>{revision.summary.defectsUpdated} defects updated</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Review Comments */}
                    {revision.comments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-indigo-600" />
                          Review Comments ({revision.comments.length})
                        </h4>
                        <div className="space-y-2">
                          {revision.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className={`p-2 rounded border ${SEVERITY_COLORS[comment.severity]}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="text-sm">{comment.comment}</p>
                                  <p className="text-xs mt-1 opacity-75">
                                    {comment.reviewer.name}
                                    {comment.section && ` - ${comment.section}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {comment.resolved ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No changes message */}
                    {!hasChanges && revision.comments.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        <Clock className="h-5 w-5 mx-auto mb-2 opacity-50" />
                        <p>No tracked changes in this revision</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default RevisionHistory;
