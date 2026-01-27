"use client";

/**
 * Offline Context
 *
 * React context for managing offline state across the application
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useOffline, type OfflineState } from "@/hooks/use-offline";
import { useSyncStatus, type SyncStatusState } from "@/hooks/use-sync-status";
import {
  db,
  isIndexedDBAvailable,
  requestPersistentStorage,
} from "@/lib/offline/db";
import { syncEngine } from "@/lib/offline/sync-engine";

// ============================================================================
// Types
// ============================================================================

export interface OfflineContextValue {
  // Network status
  network: OfflineState;

  // Sync status
  sync: SyncStatusState;

  // Feature flags
  isOfflineCapable: boolean;
  isPersistentStorage: boolean;

  // Storage info
  storageUsage: {
    usage: number;
    quota: number;
    percentUsed: number;
  } | null;

  // Actions
  enableOfflineMode: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
  triggerSync: () => Promise<void>;

  // PWA
  installPrompt: BeforeInstallPromptEvent | null;
  canInstall: boolean;
  installPWA: () => Promise<void>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ============================================================================
// Context
// ============================================================================

const OfflineContext = createContext<OfflineContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface OfflineProviderProps {
  children: ReactNode;
  enableAutoSync?: boolean;
  autoSyncInterval?: number;
}

export function OfflineProvider({
  children,
  enableAutoSync = true,
  autoSyncInterval = 5 * 60 * 1000, // 5 minutes
}: OfflineProviderProps) {
  const network = useOffline();
  const sync = useSyncStatus();

  const [isOfflineCapable, setIsOfflineCapable] = useState(false);
  const [isPersistentStorage, setIsPersistentStorage] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{
    usage: number;
    quota: number;
    percentUsed: number;
  } | null>(null);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // Check offline capability on mount
  useEffect(() => {
    const checkCapability = async () => {
      const hasIndexedDB = isIndexedDBAvailable();
      setIsOfflineCapable(hasIndexedDB);

      if (hasIndexedDB) {
        try {
          // Check storage persistence
          if (navigator.storage?.persisted) {
            const persisted = await navigator.storage.persisted();
            setIsPersistentStorage(persisted);
          }

          // Get storage usage
          const usage = await db.getStorageEstimate();
          setStorageUsage(usage);
        } catch (error) {
          console.error("Error checking storage:", error);
        }
      }
    };

    checkCapability();
  }, []);

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (!enableAutoSync || !network.isOnline) return;

    // If we were offline and are now online, trigger sync
    if (network.wasOffline && network.isOnline && !sync.isSyncing) {
      syncEngine.fullSync().catch(console.error);
    }
  }, [network.isOnline, network.wasOffline, sync.isSyncing, enableAutoSync]);

  // Start auto-sync interval
  useEffect(() => {
    if (!enableAutoSync) return;

    syncEngine.startAutoSync(autoSyncInterval);

    return () => {
      syncEngine.stopAutoSync();
    };
  }, [enableAutoSync, autoSyncInterval]);

  // Update storage usage periodically
  useEffect(() => {
    const updateStorage = async () => {
      try {
        const usage = await db.getStorageEstimate();
        setStorageUsage(usage);
      } catch (error) {
        console.error("Error getting storage estimate:", error);
      }
    };

    const interval = setInterval(updateStorage, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Actions
  const enableOfflineMode = useCallback(async () => {
    if (!isOfflineCapable) {
      throw new Error("Offline mode not supported");
    }

    // Request persistent storage
    const persisted = await requestPersistentStorage();
    setIsPersistentStorage(persisted);

    // Bootstrap initial data
    await syncEngine.bootstrap();
  }, [isOfflineCapable]);

  const clearOfflineData = useCallback(async () => {
    await db.clearAll();
    setStorageUsage({ usage: 0, quota: storageUsage?.quota || 0, percentUsed: 0 });
  }, [storageUsage?.quota]);

  const triggerSync = useCallback(async () => {
    if (!network.isOnline) {
      throw new Error("Cannot sync while offline");
    }

    await sync.sync();
  }, [network.isOnline, sync]);

  const installPWA = useCallback(async () => {
    if (!installPrompt) {
      throw new Error("PWA install not available");
    }

    await installPrompt.prompt();
    const result = await installPrompt.userChoice;

    if (result.outcome === "accepted") {
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  const value: OfflineContextValue = {
    network,
    sync,
    isOfflineCapable,
    isPersistentStorage,
    storageUsage,
    enableOfflineMode,
    clearOfflineData,
    triggerSync,
    installPrompt,
    canInstall: !!installPrompt,
    installPWA,
  };

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useOfflineContext(): OfflineContextValue {
  const context = useContext(OfflineContext);

  if (!context) {
    throw new Error("useOfflineContext must be used within OfflineProvider");
  }

  return context;
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Quick check if app is online
 */
export function useIsOnline(): boolean {
  const context = useContext(OfflineContext);
  return context?.network.isOnline ?? navigator.onLine;
}

/**
 * Quick check if there are pending syncs
 */
export function useHasPendingSync(): boolean {
  const context = useContext(OfflineContext);
  return (context?.sync.pendingTotal ?? 0) > 0;
}

/**
 * Quick check if currently syncing
 */
export function useIsSyncing(): boolean {
  const context = useContext(OfflineContext);
  return context?.sync.isSyncing ?? false;
}

export default OfflineContext;
