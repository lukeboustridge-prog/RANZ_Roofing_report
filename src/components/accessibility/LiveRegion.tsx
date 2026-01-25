"use client";

import { ReactNode, useEffect, useState } from "react";

/**
 * Live Region Component
 * Announces dynamic content changes to screen readers
 */

type Politeness = "polite" | "assertive" | "off";

interface LiveRegionProps {
  /** Content to announce */
  children: ReactNode;
  /**
   * politeness level:
   * - "polite": announced when user is idle
   * - "assertive": announced immediately
   * - "off": not announced
   */
  politeness?: Politeness;
  /** Whether the entire region should be read on updates */
  atomic?: boolean;
  /** Which parts of the region should be announced */
  relevant?: "additions" | "removals" | "text" | "all" | "additions text";
  /** Optional role override */
  role?: "status" | "alert" | "log" | "marquee" | "timer";
  /** Whether to visually hide the region */
  visuallyHidden?: boolean;
  /** Custom className */
  className?: string;
}

export function LiveRegion({
  children,
  politeness = "polite",
  atomic = true,
  relevant = "additions text",
  role,
  visuallyHidden = true,
  className = "",
}: LiveRegionProps) {
  // Determine role based on politeness if not explicitly set
  const computedRole = role || (politeness === "assertive" ? "alert" : "status");

  return (
    <div
      role={computedRole}
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={`${visuallyHidden ? "sr-only" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Hook for announcing messages to screen readers
 */
export function useAnnounce() {
  const [message, setMessage] = useState<string>("");
  const [politeness, setPoliteness] = useState<Politeness>("polite");

  const announce = (text: string, level: Politeness = "polite") => {
    // Clear first to ensure re-announcement of same message
    setMessage("");
    setPoliteness(level);

    // Use requestAnimationFrame to ensure the clear takes effect
    requestAnimationFrame(() => {
      setMessage(text);
    });
  };

  const clear = () => {
    setMessage("");
  };

  const AnnouncerRegion = () => (
    <LiveRegion politeness={politeness} visuallyHidden>
      {message}
    </LiveRegion>
  );

  return { announce, clear, message, AnnouncerRegion };
}

/**
 * Status Message Component
 * Pre-styled live region for status updates
 */
export function StatusMessage({
  message,
  type = "info",
}: {
  message: string;
  type?: "info" | "success" | "warning" | "error";
}) {
  if (!message) return null;

  const politeness: Politeness = type === "error" ? "assertive" : "polite";
  const role = type === "error" ? "alert" : "status";

  return (
    <LiveRegion politeness={politeness} role={role} visuallyHidden={false}>
      <span className="sr-only">
        {type === "success" && "Success: "}
        {type === "warning" && "Warning: "}
        {type === "error" && "Error: "}
      </span>
      {message}
    </LiveRegion>
  );
}

export default LiveRegion;
