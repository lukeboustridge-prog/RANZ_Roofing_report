"use client";

/**
 * Conflict Dialog
 *
 * Dialog for resolving sync conflicts
 */

import { useState, useEffect } from "react";
import { AlertTriangle, Clock, Server, Smartphone, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/lib/offline/db";
import { syncEngine } from "@/lib/offline/sync-engine";
import type { OfflineReport, ConflictResolution } from "@/lib/offline/types";

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConflictDialog({ open, onOpenChange }: ConflictDialogProps) {
  const [conflicts, setConflicts] = useState<OfflineReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<OfflineReport | null>(null);
  const [resolution, setResolution] = useState<ConflictResolution>("keep_local");
  const [isResolving, setIsResolving] = useState(false);

  // Load conflicts when dialog opens
  useEffect(() => {
    if (open) {
      loadConflicts();
    }
  }, [open]);

  const loadConflicts = async () => {
    const conflictReports = await db.reports
      .where("syncStatus")
      .equals("conflict")
      .toArray();
    setConflicts(conflictReports);
    if (conflictReports.length > 0 && !selectedReport) {
      setSelectedReport(conflictReports[0]);
    }
  };

  const handleResolve = async () => {
    if (!selectedReport) return;

    setIsResolving(true);
    try {
      await syncEngine.resolveReportConflict(selectedReport.id, resolution);
      await loadConflicts();

      // Select next conflict or close
      const remaining = conflicts.filter((c) => c.id !== selectedReport.id);
      if (remaining.length > 0) {
        setSelectedReport(remaining[0]);
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleResolveAll = async () => {
    setIsResolving(true);
    try {
      for (const conflict of conflicts) {
        await syncEngine.resolveReportConflict(conflict.id, resolution);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to resolve conflicts:", error);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Sync Conflicts
          </DialogTitle>
          <DialogDescription>
            The following reports have conflicting changes. Choose which version to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 min-h-[300px]">
          {/* Conflict List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-3 py-2 text-sm font-medium">
              Conflicts ({conflicts.length})
            </div>
            <ScrollArea className="h-[250px]">
              <div className="p-2 space-y-1">
                {conflicts.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedReport?.id === report.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium truncate">{report.reportNumber}</div>
                    <div className="text-xs truncate opacity-70">
                      {report.propertyAddress}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Conflict Details */}
          <div className="col-span-2 border rounded-lg overflow-hidden">
            {selectedReport ? (
              <>
                <div className="bg-muted px-3 py-2 text-sm font-medium">
                  {selectedReport.reportNumber}
                </div>
                <div className="p-4 space-y-4">
                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Smartphone className="w-4 h-4" />
                        Local Version
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(selectedReport.localUpdatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Server className="w-4 h-4" />
                        Server Version
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {selectedReport.serverUpdatedAt
                          ? new Date(selectedReport.serverUpdatedAt).toLocaleString()
                          : "Unknown"}
                      </div>
                    </div>
                  </div>

                  {/* Resolution Options */}
                  <RadioGroup
                    value={resolution}
                    onValueChange={(value) => setResolution(value as ConflictResolution)}
                  >
                    <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value="keep_local" id="keep_local" />
                      <Label htmlFor="keep_local" className="cursor-pointer">
                        <div className="font-medium">Keep Local Version</div>
                        <div className="text-sm text-muted-foreground">
                          Your changes will overwrite the server version
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value="keep_server" id="keep_server" />
                      <Label htmlFor="keep_server" className="cursor-pointer">
                        <div className="font-medium">Keep Server Version</div>
                        <div className="text-sm text-muted-foreground">
                          Your local changes will be discarded
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value="merge" id="merge" />
                      <Label htmlFor="merge" className="cursor-pointer">
                        <div className="font-medium">Merge Changes</div>
                        <div className="text-sm text-muted-foreground">
                          Combine both versions (newer fields win)
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a conflict to resolve
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleResolveAll}
            disabled={isResolving || conflicts.length === 0}
          >
            Apply to All ({conflicts.length})
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={isResolving || !selectedReport}
            >
              {isResolving ? (
                "Resolving..."
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Resolve
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConflictDialog;
