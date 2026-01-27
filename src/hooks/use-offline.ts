"use client";

/**
 * useOffline Hook
 *
 * React hook for managing offline state and network status
 */

import { useState, useEffect, useCallback } from "react";

export interface OfflineState {
  isOnline: boolean;
  wasOffline: boolean; // True if user was recently offline
  connectionType: string | null;
  effectiveType: string | null; // e.g., "4g", "3g", "2g", "slow-2g"
  downlink: number | null; // Mbps
  rtt: number | null; // Round-trip time in ms
}

interface NetworkInformation extends EventTarget {
  downlink: number;
  effectiveType: string;
  rtt: number;
  saveData: boolean;
  type: string;
  onchange: ((this: NetworkInformation, ev: Event) => void) | null;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

/**
 * Hook for tracking online/offline status and network quality
 */
export function useOffline(): OfflineState {
  const [state, setState] = useState<OfflineState>(() => ({
    isOnline: typeof window !== "undefined" ? navigator.onLine : true,
    wasOffline: false,
    connectionType: null,
    effectiveType: null,
    downlink: null,
    rtt: null,
  }));

  const updateNetworkInfo = useCallback(() => {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    setState((prev) => ({
      ...prev,
      connectionType: connection?.type || null,
      effectiveType: connection?.effectiveType || null,
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
    }));
  }, []);

  const handleOnline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: true,
    }));
    updateNetworkInfo();
  }, [updateNetworkInfo]);

  const handleOffline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: false,
      wasOffline: true,
    }));
  }, []);

  useEffect(() => {
    // Initial network info
    updateNetworkInfo();

    // Listen for online/offline events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for connection changes
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (connection) {
      connection.addEventListener("change", updateNetworkInfo);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      if (connection) {
        connection.removeEventListener("change", updateNetworkInfo);
      }
    };
  }, [handleOnline, handleOffline, updateNetworkInfo]);

  return state;
}

/**
 * Check if the connection is metered (e.g., mobile data)
 */
export function useIsMeteredConnection(): boolean {
  const [isMetered, setIsMetered] = useState(false);

  useEffect(() => {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (connection) {
      setIsMetered(connection.saveData || connection.type === "cellular");

      const handleChange = () => {
        setIsMetered(connection.saveData || connection.type === "cellular");
      };

      connection.addEventListener("change", handleChange);
      return () => connection.removeEventListener("change", handleChange);
    }
  }, []);

  return isMetered;
}

/**
 * Check if the connection is slow
 */
export function useIsSlowConnection(): boolean {
  const { effectiveType, downlink } = useOffline();

  return (
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    (downlink !== null && downlink < 1)
  );
}

/**
 * Reset the "was offline" flag
 */
export function useClearWasOffline() {
  const [, setState] = useState(0);

  return useCallback(() => {
    setState((prev) => prev + 1);
  }, []);
}

export default useOffline;
