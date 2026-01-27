"use client";

/**
 * useSyncStatus Hook
 *
 * React hook for tracking synchronization status
 */

import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline/db";
import { syncEngine, type SyncState, type SyncEventType } from "@/lib/offline/sync-engine";

export interface SyncStatusState {
  // Sync state
  state: SyncState;
  isSyncing: boolean;
  lastSyncAt: Date | null;

  // Progress
  progress: number;
  message: string;

  // Pending counts
  pendingReports: number;
  pendingPhotos: number;
  pendingTotal: number;

  // Issues
  conflicts: number;
  errors: number;

  // Actions
  sync: () => Promise<void>;
  cancelSync: () => void;
}

/**
 * Hook for tracking sync status with live updates
 */
export function useSyncStatus(): SyncStatusState {
  const [state, setState] = useState<SyncState>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  // Live queries for pending counts
  const pendingReports = useLiveQuery(
    () => db.reports.where("syncStatus").anyOf(["pending", "error"]).count(),
    [],
    0
  );

  const pendingPhotos = useLiveQuery(
    () => db.photos.where("syncStatus").equals("pending_upload").count(),
    [],
    0
  );

  const conflicts = useLiveQuery(
    () => db.reports.where("syncStatus").equals("conflict").count(),
    [],
    0
  );

  const errors = useLiveQuery(
    () => db.reports.where("syncStatus").equals("error").count(),
    [],
    0
  );

  // Load last sync time
  useEffect(() => {
    db.metadata.get("lastSyncAt").then((meta) => {
      if (meta?.value) {
        setLastSyncAt(new Date(meta.value as string));
      }
    });
  }, []);

  // Subscribe to sync events
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((event) => {
      switch (event.type) {
        case "sync:start":
          setState("syncing");
          setProgress(0);
          setMessage("Starting sync...");
          break;

        case "sync:progress": {
          const data = event.data as {
            state: SyncState;
            message: string;
            progress: number;
          };
          setState(data.state);
          setProgress(data.progress);
          setMessage(data.message);
          break;
        }

        case "sync:complete": {
          setState("idle");
          setProgress(100);
          setMessage("Sync complete");
          setLastSyncAt(new Date());
          break;
        }

        case "sync:error": {
          setState("error");
          const errorData = event.data as { error: string };
          setMessage(errorData?.error || "Sync failed");
          break;
        }

        case "photo:upload:progress": {
          const photoData = event.data as { progress: number };
          setMessage(`Uploading photos... ${photoData.progress}%`);
          break;
        }
      }
    });

    return unsubscribe;
  }, []);

  // Sync action
  const sync = useCallback(async () => {
    if (syncEngine.isSyncing) return;

    try {
      await syncEngine.fullSync();
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }, []);

  // Cancel action
  const cancelSync = useCallback(() => {
    syncEngine.cancelSync();
  }, []);

  return {
    state,
    isSyncing: syncEngine.isSyncing || state === "syncing",
    lastSyncAt,
    progress,
    message,
    pendingReports,
    pendingPhotos,
    pendingTotal: pendingReports + pendingPhotos,
    conflicts,
    errors,
    sync,
    cancelSync,
  };
}

/**
 * Hook for just the pending count (lightweight)
 */
export function usePendingCount(): number {
  const pendingReports = useLiveQuery(
    () => db.reports.where("syncStatus").anyOf(["pending", "error"]).count(),
    [],
    0
  );

  const pendingPhotos = useLiveQuery(
    () => db.photos.where("syncStatus").equals("pending_upload").count(),
    [],
    0
  );

  return pendingReports + pendingPhotos;
}

/**
 * Hook for checking if there are conflicts
 */
export function useHasConflicts(): boolean {
  const conflicts = useLiveQuery(
    () => db.reports.where("syncStatus").equals("conflict").count(),
    [],
    0
  );

  return conflicts > 0;
}

/**
 * Hook for auto-sync when coming back online
 */
export function useAutoSync(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;

    const handleOnline = () => {
      // Small delay to ensure connection is stable
      setTimeout(() => {
        if (navigator.onLine && !syncEngine.isSyncing) {
          syncEngine.fullSync().catch(console.error);
        }
      }, 1000);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [enabled]);
}

/**
 * Format relative time for last sync
 */
export function formatLastSync(date: Date | null): string {
  if (!date) return "Never";

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

export default useSyncStatus;
