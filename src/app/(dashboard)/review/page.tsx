"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  FileText,
  MapPin,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  PlayCircle,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from "lucide-react";
import { useCurrentUser } from "@/contexts/user-context";

interface Report {
  id: string;
  reportNumber: string;
  propertyAddress: string;
  propertyCity: string;
  inspectionType: string;
  status: string;
  submittedAt: string;
  createdAt: string;
  inspector: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    photos: number;
    defects: number;
    roofElements: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_REVIEW: { label: "Pending Review", color: "bg-yellow-100 text-yellow-800" },
  UNDER_REVIEW: { label: "Under Review", color: "bg-blue-100 text-blue-800" },
};

const INSPECTION_TYPES: Record<string, string> = {
  FULL_INSPECTION: "Full Inspection",
  VISUAL_ONLY: "Visual Only",
  NON_INVASIVE: "Non-Invasive",
  INVASIVE: "Invasive",
  DISPUTE_RESOLUTION: "Dispute Resolution",
  PRE_PURCHASE: "Pre-Purchase",
  MAINTENANCE_REVIEW: "Maintenance Review",
  WARRANTY_CLAIM: "Warranty Claim",
};

const REVISION_ITEMS = [
  "Missing photos for documented defects",
  "Incomplete defect descriptions",
  "Missing GPS/location data",
  "Unclear severity classifications",
  "Missing code references",
  "Insufficient evidence for conclusions",
  "Formatting issues",
  "Missing inspector signature",
];

export default function ReviewQueuePage() {
  const { isReviewer, isLoading: userLoading } = useCurrentUser();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING_REVIEW");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Review decision dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [decisionType, setDecisionType] = useState<"APPROVE" | "REJECT" | "REQUEST_REVISION" | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [selectedRevisionItems, setSelectedRevisionItems] = useState<string[]>([]);

  useEffect(() => {
    if (isReviewer) {
      fetchReports();
    }
  }, [statusFilter, isReviewer]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports?status=${statusFilter}&includeAll=true`);
      if (!response.ok) throw new Error("Failed to fetch reports");
      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleStartReview = async (reportId: string) => {
    try {
      setActionLoading(reportId);
      const response = await fetch(`/api/reports/${reportId}/review`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start review");
      }

      fetchReports();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start review");
    } finally {
      setActionLoading(null);
    }
  };

  const openReviewDialog = (report: Report, type: "APPROVE" | "REJECT" | "REQUEST_REVISION") => {
    setSelectedReport(report);
    setDecisionType(type);
    setReviewComment("");
    setSelectedRevisionItems([]);
    setReviewDialogOpen(true);
  };

  const handleSubmitDecision = async () => {
    if (!selectedReport || !decisionType) return;

    try {
      setActionLoading(selectedReport.id);
      const response = await fetch(`/api/reports/${selectedReport.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: decisionType,
          comment: reviewComment || undefined,
          revisionItems: decisionType === "REQUEST_REVISION" ? selectedRevisionItems : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit decision");
      }

      setReviewDialogOpen(false);
      fetchReports();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit decision");
    } finally {
      setActionLoading(null);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isReviewer) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Only reviewers and administrators can access the review queue.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-muted-foreground">
            Review and approve inspection reports submitted by inspectors.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NativeSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-48"
          >
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="UNDER_REVIEW">Under Review</option>
          </NativeSelect>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {reports.filter(r => r.status === "PENDING_REVIEW").length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {reports.filter(r => r.status === "UNDER_REVIEW").length}
                </p>
                <p className="text-sm text-muted-foreground">Under Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports.length}</p>
                <p className="text-sm text-muted-foreground">Total in Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">
              No reports are currently waiting for review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const statusConfig = STATUS_CONFIG[report.status] || { label: report.status, color: "bg-gray-100" };

            return (
              <Card key={report.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {report.reportNumber}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {report.propertyAddress}, {report.propertyCity}
                      </div>
                    </div>
                    <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Inspector:</span>
                      <p className="font-medium">{report.inspector.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <p className="font-medium">
                        {INSPECTION_TYPES[report.inspectionType] || report.inspectionType}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Submitted:</span>
                      <p className="font-medium">
                        {report.submittedAt
                          ? new Date(report.submittedAt).toLocaleDateString()
                          : "Not submitted"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Content:</span>
                      <p className="font-medium">
                        {report._count.photos} photos, {report._count.defects} defects
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Link href={`/reports/${report.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Report
                      </Button>
                    </Link>

                    {report.status === "PENDING_REVIEW" && (
                      <Button
                        size="sm"
                        onClick={() => handleStartReview(report.id)}
                        disabled={actionLoading === report.id}
                      >
                        {actionLoading === report.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <PlayCircle className="h-4 w-4 mr-2" />
                        )}
                        Start Review
                      </Button>
                    )}

                    {report.status === "UNDER_REVIEW" && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => openReviewDialog(report, "APPROVE")}
                          disabled={actionLoading === report.id}
                        >
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReviewDialog(report, "REQUEST_REVISION")}
                          disabled={actionLoading === report.id}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Request Revision
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openReviewDialog(report, "REJECT")}
                          disabled={actionLoading === report.id}
                        >
                          <ThumbsDown className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Decision Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {decisionType === "APPROVE" && "Approve Report"}
              {decisionType === "REJECT" && "Reject Report"}
              {decisionType === "REQUEST_REVISION" && "Request Revision"}
            </DialogTitle>
            <DialogDescription>
              {decisionType === "APPROVE" &&
                "Confirm approval of this report. It will be marked as approved and finalized."}
              {decisionType === "REJECT" &&
                "This will reject the report and return it to draft status."}
              {decisionType === "REQUEST_REVISION" &&
                "Select the items that need revision and add any additional comments."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {decisionType === "REQUEST_REVISION" && (
              <div className="space-y-3">
                <Label>Revision Items</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {REVISION_ITEMS.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Checkbox
                        id={item}
                        checked={selectedRevisionItems.includes(item)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRevisionItems([...selectedRevisionItems, item]);
                          } else {
                            setSelectedRevisionItems(
                              selectedRevisionItems.filter((i) => i !== item)
                            );
                          }
                        }}
                      />
                      <label htmlFor={item} className="text-sm cursor-pointer">
                        {item}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="comment">
                {decisionType === "APPROVE" ? "Comments (Optional)" : "Reason / Feedback"}
              </Label>
              <Textarea
                id="comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={
                  decisionType === "APPROVE"
                    ? "Add any final comments..."
                    : "Provide feedback for the inspector..."
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitDecision}
              disabled={actionLoading !== null}
              className={
                decisionType === "APPROVE"
                  ? "bg-green-600 hover:bg-green-700"
                  : decisionType === "REJECT"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {decisionType === "APPROVE" && "Approve Report"}
              {decisionType === "REJECT" && "Reject Report"}
              {decisionType === "REQUEST_REVISION" && "Request Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
