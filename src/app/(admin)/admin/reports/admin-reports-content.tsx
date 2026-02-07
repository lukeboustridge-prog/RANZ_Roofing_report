"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Files, Loader2, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportLabel {
  id: string;
  reportNumber: string;
  address: string;
}

interface BatchPdfPanelProps {
  reportLabels: ReportLabel[];
}

export function BatchPdfPanel({ reportLabels }: BatchPdfPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const allSelected =
    reportLabels.length > 0 && selectedIds.size === reportLabels.length;

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
      setSelectedIds(new Set(reportLabels.map((r) => r.id)));
    }
  }, [allSelected, reportLabels]);

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

  if (reportLabels.length === 0) return null;

  return (
    <>
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Batch PDF Generation
                </CardTitle>
                <CardDescription>
                  Select reports and generate PDFs in bulk ({reportLabels.length}{" "}
                  reports available)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
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
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="ml-1 text-sm">
                      {isOpen ? "Hide" : "Select reports"}
                    </span>
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Select all toggle */}
              <div className="flex items-center gap-2 pb-3 border-b mb-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all reports for PDF generation"
                />
                <span className="text-sm font-medium">
                  {allSelected
                    ? "Deselect all"
                    : `Select all ${reportLabels.length} reports`}
                </span>
                {selectedIds.size > 0 && !allSelected && (
                  <span className="text-sm text-muted-foreground">
                    ({selectedIds.size} selected)
                  </span>
                )}
              </div>

              {/* Scrollable report checklist */}
              <div className="max-h-64 overflow-y-auto space-y-1">
                {reportLabels.map((report) => (
                  <label
                    key={report.id}
                    className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.has(report.id)}
                      onCheckedChange={() => toggleSelect(report.id)}
                      aria-label={`Select report ${report.reportNumber}`}
                    />
                    <span className="text-sm font-medium">
                      {report.reportNumber}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {report.address}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <AlertDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
      >
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
    </>
  );
}
