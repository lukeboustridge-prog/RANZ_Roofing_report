"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Copy, Loader2 } from "lucide-react";

interface DuplicateReportButtonProps {
  reportId: string;
  reportNumber: string;
}

export function DuplicateReportButton({
  reportId,
  reportNumber,
}: DuplicateReportButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Options for what to copy
  const [includeRoofElements, setIncludeRoofElements] = useState(true);
  const [includeDefects, setIncludeDefects] = useState(false);
  const [includeCompliance, setIncludeCompliance] = useState(false);

  const handleDuplicate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${reportId}/duplicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeRoofElements,
          includeDefects,
          includeComplianceAssessment: includeCompliance,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to duplicate report");
      }

      const data = await response.json();

      // Close dialog and navigate to the new report
      setOpen(false);
      router.push(`/reports/${data.report.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate report");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Report</DialogTitle>
          <DialogDescription>
            Create a new report using {reportNumber} as a template. Select what data
            to copy to the new report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="roofElements"
              checked={includeRoofElements}
              onCheckedChange={(checked) => setIncludeRoofElements(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="roofElements" className="font-medium cursor-pointer">
                Roof Elements
              </Label>
              <p className="text-sm text-muted-foreground">
                Copy roof element types, locations, and specifications (condition ratings will
                be reset)
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="defects"
              checked={includeDefects}
              onCheckedChange={(checked) => setIncludeDefects(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="defects" className="font-medium cursor-pointer">
                Defect Templates
              </Label>
              <p className="text-sm text-muted-foreground">
                Copy defect structure as templates (observations must be refilled, photos are
                not copied)
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="compliance"
              checked={includeCompliance}
              onCheckedChange={(checked) => setIncludeCompliance(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="compliance" className="font-medium cursor-pointer">
                Compliance Structure
              </Label>
              <p className="text-sm text-muted-foreground">
                Copy compliance assessment structure (results will be reset)
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">The following will always be copied:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Property details and address</li>
              <li>Client information</li>
              <li>Inspection type and methodology</li>
              <li>Scope of works and equipment</li>
            </ul>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">The following will be reset:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Report number (new one generated)</li>
              <li>Inspection date (set to today)</li>
              <li>Weather conditions</li>
              <li>Findings, analysis, and conclusions</li>
              <li>Photos and videos</li>
              <li>Sign-off and declaration</li>
            </ul>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Create Duplicate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
