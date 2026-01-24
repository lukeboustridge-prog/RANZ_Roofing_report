"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface AutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  interval?: number; // milliseconds
  debounce?: number; // milliseconds
  enabled?: boolean;
}

interface AutosaveState {
  status: "idle" | "saving" | "saved" | "error";
  lastSaved: Date | null;
  error: string | null;
}

export function useAutosave<T>({
  data,
  onSave,
  interval = 30000, // 30 seconds default
  debounce = 2000, // 2 seconds debounce
  enabled = true,
}: AutosaveOptions<T>) {
  const [state, setState] = useState<AutosaveState>({
    status: "idle",
    lastSaved: null,
    error: null,
  });

  const dataRef = useRef(data);
  const lastSavedDataRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // Update ref when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const save = useCallback(async () => {
    if (isSavingRef.current) return;

    const currentData = dataRef.current;
    const serialized = JSON.stringify(currentData);

    // Skip if data hasn't changed
    if (serialized === lastSavedDataRef.current) {
      return;
    }

    isSavingRef.current = true;
    setState((prev) => ({ ...prev, status: "saving", error: null }));

    try {
      await onSave(currentData);
      lastSavedDataRef.current = serialized;
      setState({
        status: "saved",
        lastSaved: new Date(),
        error: null,
      });

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setState((prev) =>
          prev.status === "saved" ? { ...prev, status: "idle" } : prev
        );
      }, 3000);
    } catch (error) {
      setState({
        status: "error",
        lastSaved: state.lastSaved,
        error: error instanceof Error ? error.message : "Failed to save",
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave, state.lastSaved]);

  // Debounced save on data change
  useEffect(() => {
    if (!enabled) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      save();
    }, debounce);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, debounce, enabled, save]);

  // Interval save
  useEffect(() => {
    if (!enabled) return;

    intervalTimerRef.current = setInterval(() => {
      save();
    }, interval);

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [interval, enabled, save]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (enabled && dataRef.current) {
        const serialized = JSON.stringify(dataRef.current);
        if (serialized !== lastSavedDataRef.current) {
          // Trigger save on unmount (best effort)
          onSave(dataRef.current).catch(console.error);
        }
      }
    };
  }, [enabled, onSave]);

  const forceSave = useCallback(() => {
    save();
  }, [save]);

  return {
    ...state,
    forceSave,
    isSaving: state.status === "saving",
  };
}

// Autosave status indicator component
export function AutosaveIndicator({
  status,
  lastSaved,
  error,
}: AutosaveState) {
  if (status === "idle" && !lastSaved) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-NZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === "saving" && (
        <>
          <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-muted-foreground">
            Saved at {lastSaved && formatTime(lastSaved)}
          </span>
        </>
      )}
      {status === "error" && (
        <>
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-red-600">{error || "Save failed"}</span>
        </>
      )}
      {status === "idle" && lastSaved && (
        <>
          <div className="h-2 w-2 rounded-full bg-gray-300" />
          <span className="text-muted-foreground">
            Last saved {formatTime(lastSaved)}
          </span>
        </>
      )}
    </div>
  );
}
