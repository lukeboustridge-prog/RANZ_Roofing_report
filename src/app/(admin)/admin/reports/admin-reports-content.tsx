"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  MapPin,
  User,
  Camera,
  AlertTriangle,
  ArrowRight,
  Files,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ReportStatus } from "@prisma/client";

const statusConfig: Record<
  ReportStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  DRAFT: { label: "Draft", variant: "outline" },
  IN_PROGRESS: { label: "In Progress", variant: "outline" },
  PENDING_REVIEW: { label: "Pending Review", variant: "secondary" },
  UNDER_REVIEW: { label: "Under Review", variant: "secondary" },
  REVISION_REQUIRED: { label: "Revision Required", variant: "destructive" },
  APPROVED: { label: "Approved", variant: "default" },
  FINALISED: { label: "Finalised", variant: "default" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

interface ReportItem {
  id: string;
  reportNumber: string;
  status: ReportStatus;
  inspectionType: string;
  propertyAddress: string;
  propertyCity: string;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  inspector: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    photos: number;
    defects: number;
  };
}

interface AdminReportsContentProps {
  reports: ReportItem[];
  statusCounts: Record<string, number>;
  total: number;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminReportsContent({
  reports: initialReports,
  statusCounts,
  total,
}: AdminReportsContentProps) {
  const [reports] = useState(initialReports);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const allSelected = reports.length > 0 && selectedIds.size === reports.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < reports.length;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map((r) => r.id)));
    }
  }, [allSelected, reports]);

  const handleGeneratePdfs = useCallback(async () => {
    setShowConfirmDialog(false);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/admin/reports/batch-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportIds: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to generate PDFs");
      }

      const data = await response.json();

      if (data.failed > 0) {
        toast({
          title: "Batch PDF Generation",
          description: `Generated ${data.successful} PDFs successfully. ${data.failed} failed.`,
          variant: "info",
        });
      } else {
        toast({
          title: "Success",
          description: `Generated ${data.successful} PDFs successfully`,
          variant: "success",
        });
      }

      setSelectedIds(new Set());
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate PDFs",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedIds, toast]);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Reports</h1>
        <p className="text-muted-foreground">
          View and manage all inspection reports ({total} total)
        </p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Badge
            key={status}
            variant={
              statusConfig[status as ReportStatus]?.variant || "outline"
            }
            className="px-3 py-1.5"
          >
            {statusConfig[status as ReportStatus]?.label || status}: {count}
          </Badge>
        ))}
      </div>

      {/* Batch action bar */}
      {reports.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              ref={(el) => {
                if (el) {
                  // Set indeterminate state for "some selected"
                  const input = el.querySelector("button");
                  if (input) {
                    (input as HTMLButtonElement).dataset.state = someSelected
                      ? "indeterminate"
                      : allSelected
                        ? "checked"
                        : "unchecked";
                  }
                }
              }}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all reports"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : "Select all"}
            </span>
          </div>

          {selectedIds.size > 0 && (
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isGenerating}
              variant="outline"
              size="sm"
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Files className="mr-2 h-4 w-4" />
              )}
              {isGenerating
                ? "Generating..."
                : `Generate PDFs (${selectedIds.size})`}
            </Button>
          )}
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate PDFs</AlertDialogTitle>
            <AlertDialogDescription>
              Generate PDFs for {selectedIds.size} report
              {selectedIds.size !== 1 ? "s" : ""}? This may take a moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGeneratePdfs}>
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reports list */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No reports yet</h3>
              <p className="mt-2 text-muted-foreground">
                Reports will appear here once inspectors create them.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card
              key={report.id}
              className={`hover:shadow-md transition-shadow ${
                selectedIds.has(report.id) ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedIds.has(report.id)}
                      onCheckedChange={() => toggleSelect(report.id)}
                      aria-label={`Select report ${report.reportNumber}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-lg">
                        {report.reportNumber}
                      </span>
                      <Badge
                        variant={
                          statusConfig[report.status]?.variant || "outline"
                        }
                      >
                        {statusConfig[report.status]?.label || report.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {report.inspectionType.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {/* Property */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>
                        {report.propertyAddress}, {report.propertyCity}
                      </span>
                    </div>

                    {/* Inspector */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4 shrink-0" />
                        <span>{report.inspector.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Camera className="h-4 w-4" />
                        <span>{report._count.photos} photos</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{report._count.defects} defects</span>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="text-xs text-muted-foreground">
                      Created: {formatDate(report.createdAt)}
                      {report.submittedAt &&
                        ` | Submitted: ${formatDate(report.submittedAt)}`}
                      {report.approvedAt &&
                        ` | Approved: ${formatDate(report.approvedAt)}`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0">
                    <Button variant="outline" asChild>
                      <Link href={`/admin/reviews/${report.id}`}>
                        View
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
