"use client";

import { ReactNode } from "react";

/**
 * Visually Hidden Component
 * Hides content visually while keeping it accessible to screen readers
 * Useful for providing additional context to assistive technologies
 */

interface VisuallyHiddenProps {
  children: ReactNode;
  /** If true, content becomes visible when focused (useful for skip links) */
  focusable?: boolean;
  /** HTML element to render as */
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export function VisuallyHidden({
  children,
  focusable = false,
  as: Component = "span",
}: VisuallyHiddenProps) {
  return (
    <Component
      className={focusable ? "sr-only focus:not-sr-only" : "sr-only"}
    >
      {children}
    </Component>
  );
}

export default VisuallyHidden;
