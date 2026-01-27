"use client";

/**
 * Sync Status Bar
 *
 * Shows sync progress and status with actions
 */

import { useContext } from "react";
import { RefreshCw, Check, AlertCircle, X, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import OfflineContext from "@/contexts/offline-context";
import { formatLastSync } from "@/hooks/use-sync-status";

interface SyncStatusBarProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncStatusBar({
  className,
  showDetails = true,
}: SyncStatusBarProps) {
  const context = useContext(OfflineContext);

  // Return null if used outside OfflineProvider
  if (!context) return null;

  const { network, sync, triggerSync } = context;

  const { isSyncing, progress, message, pendingReports, pendingPhotos, conflicts, errors, lastSyncAt } = sync;

  // Don't show if nothing to display
  if (!isSyncing && pendingReports === 0 && pendingPhotos === 0 && conflicts === 0 && errors === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-muted/50 border rounded-lg p-4",
        className
      )}
    >
      {/* Syncing State */}
      {isSyncing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium">{message || "Syncing..."}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={sync.cancelSync}
              className="h-7 px-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Pending State */}
      {!isSyncing && (pendingReports > 0 || pendingPhotos > 0) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">
                {pendingReports > 0 && `${pendingReports} report${pendingReports > 1 ? "s" : ""}`}
                {pendingReports > 0 && pendingPhotos > 0 && ", "}
                {pendingPhotos > 0 && `${pendingPhotos} photo${pendingPhotos > 1 ? "s" : ""}`}
                {" pending sync"}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={triggerSync}
            disabled={!network.isOnline}
            className="h-8"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Now
          </Button>
        </div>
      )}

      {/* Conflicts */}
      {!isSyncing && conflicts > 0 && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-700">
              {conflicts} conflict{conflicts > 1 ? "s" : ""} need resolution
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-8">
            Resolve
          </Button>
        </div>
      )}

      {/* Errors */}
      {!isSyncing && errors > 0 && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">
              {errors} sync error{errors > 1 ? "s" : ""}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={triggerSync}
            disabled={!network.isOnline}
            className="h-8"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Success State */}
      {!isSyncing &&
        pendingReports === 0 &&
        pendingPhotos === 0 &&
        conflicts === 0 &&
        errors === 0 && (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="w-4 h-4" />
            <span className="text-sm">All changes synced</span>
            {showDetails && lastSyncAt && (
              <span className="text-xs text-muted-foreground ml-2">
                Last sync: {formatLastSync(lastSyncAt)}
              </span>
            )}
          </div>
        )}
    </div>
  );
}

/**
 * Compact version for header
 */
export function SyncStatusCompact({ className }: { className?: string }) {
  const context = useContext(OfflineContext);

  // Return null if used outside OfflineProvider
  if (!context) return null;

  const { network, sync, triggerSync } = context;

  if (sync.isSyncing) {
    return (
      <Button variant="ghost" size="sm" className={cn("gap-2", className)} disabled>
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="hidden sm:inline">Syncing...</span>
      </Button>
    );
  }

  if (sync.pendingTotal > 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("gap-2", className)}
        onClick={triggerSync}
        disabled={!network.isOnline}
      >
        <div className="relative">
          <RefreshCw className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500 text-[8px] text-white items-center justify-center font-bold">
              {sync.pendingTotal > 9 ? "9+" : sync.pendingTotal}
            </span>
          </span>
        </div>
        <span className="hidden sm:inline">Sync</span>
      </Button>
    );
  }

  if (sync.conflicts > 0) {
    return (
      <Button variant="ghost" size="sm" className={cn("gap-2 text-orange-500", className)}>
        <AlertCircle className="w-4 h-4" />
        <span className="hidden sm:inline">{sync.conflicts} conflict{sync.conflicts > 1 ? "s" : ""}</span>
      </Button>
    );
  }

  return null;
}

export default SyncStatusBar;
