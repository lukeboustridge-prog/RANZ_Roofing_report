"use client";

/**
 * Offline Indicator
 *
 * Shows online/offline status with visual feedback
 */

import { useContext, useState, useEffect } from "react";
import { Wifi, WifiOff, Cloud, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import OfflineContext from "@/contexts/offline-context";

interface OfflineIndicatorProps {
  className?: string;
  showLabel?: boolean;
  variant?: "badge" | "icon" | "banner";
}

export function OfflineIndicator({
  className,
  showLabel = false,
  variant = "icon",
}: OfflineIndicatorProps) {
  // Try to use context, but fallback to basic online status if not available
  const context = useContext(OfflineContext);

  // Fallback for when used outside OfflineProvider
  const [fallbackOnline, setFallbackOnline] = useState(true);

  useEffect(() => {
    if (!context) {
      setFallbackOnline(navigator.onLine);

      const handleOnline = () => setFallbackOnline(true);
      const handleOffline = () => setFallbackOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [context]);

  const isOnline = context?.network.isOnline ?? fallbackOnline;
  const pendingTotal = context?.sync.pendingTotal ?? 0;
  const hasPending = pendingTotal > 0;
  const isSyncing = context?.sync.isSyncing ?? false;

  // Determine status
  let status: "online" | "offline" | "syncing" | "pending";
  if (!isOnline) {
    status = "offline";
  } else if (isSyncing) {
    status = "syncing";
  } else if (hasPending) {
    status = "pending";
  } else {
    status = "online";
  }

  if (variant === "banner") {
    if (isOnline) return null; // Only show banner when offline

    return (
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium",
          className
        )}
      >
        <WifiOff className="inline-block w-4 h-4 mr-2" />
        You are offline. Changes will sync when connection is restored.
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          status === "online" && "bg-green-100 text-green-700",
          status === "offline" && "bg-amber-100 text-amber-700",
          status === "syncing" && "bg-blue-100 text-blue-700",
          status === "pending" && "bg-yellow-100 text-yellow-700",
          className
        )}
      >
        {status === "online" && (
          <>
            <Cloud className="w-3.5 h-3.5" />
            {showLabel && <span>Online</span>}
          </>
        )}
        {status === "offline" && (
          <>
            <CloudOff className="w-3.5 h-3.5" />
            {showLabel && <span>Offline</span>}
          </>
        )}
        {status === "syncing" && (
          <>
            <Cloud className="w-3.5 h-3.5 animate-pulse" />
            {showLabel && <span>Syncing...</span>}
          </>
        )}
        {status === "pending" && (
          <>
            <Cloud className="w-3.5 h-3.5" />
            {showLabel && <span>{pendingTotal} pending</span>}
          </>
        )}
      </div>
    );
  }

  // Default: icon variant
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      title={
        status === "online"
          ? "Connected"
          : status === "offline"
          ? "Offline - changes will sync when online"
          : status === "syncing"
          ? "Syncing..."
          : `${pendingTotal} changes pending`
      }
    >
      {isOnline ? (
        <Wifi
          className={cn(
            "w-5 h-5",
            status === "syncing" && "text-blue-500 animate-pulse",
            status === "pending" && "text-yellow-500",
            status === "online" && "text-green-500"
          )}
        />
      ) : (
        <WifiOff className="w-5 h-5 text-amber-500" />
      )}

      {/* Pending indicator dot */}
      {hasPending && isOnline && !isSyncing && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
        </span>
      )}

      {showLabel && (
        <span className="ml-2 text-sm">
          {status === "online" && "Connected"}
          {status === "offline" && "Offline"}
          {status === "syncing" && "Syncing..."}
          {status === "pending" && `${pendingTotal} pending`}
        </span>
      )}
    </div>
  );
}

export default OfflineIndicator;
