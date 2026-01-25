"use client";

import { ReactNode, useEffect, useRef } from "react";

/**
 * Focus Trap Component
 * Traps focus within a container (useful for modals, dialogs)
 */

interface FocusTrapProps {
  children: ReactNode;
  /** Whether the focus trap is active */
  active?: boolean;
  /** Element to return focus to when trap is deactivated */
  returnFocusOnDeactivate?: boolean;
}

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function FocusTrap({
  children,
  active = true,
  returnFocusOnDeactivate = true,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!active) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Focus the first focusable element
    const focusableElements = container.querySelectorAll(FOCUSABLE_SELECTORS);
    const firstElement = focusableElements[0] as HTMLElement | undefined;
    firstElement?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        container.querySelectorAll(FOCUSABLE_SELECTORS)
      ) as HTMLElement[];

      if (focusable.length === 0) return;

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: if on first element, go to last
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab: if on last element, go to first
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      // Return focus to previously focused element
      if (returnFocusOnDeactivate && previousActiveElement.current) {
        (previousActiveElement.current as HTMLElement).focus?.();
      }
    };
  }, [active, returnFocusOnDeactivate]);

  return (
    <div ref={containerRef} data-focus-trap={active ? "active" : "inactive"}>
      {children}
    </div>
  );
}

export default FocusTrap;
