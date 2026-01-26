/**
 * Utility Function Tests
 *
 * Tests for common utility functions used throughout the application.
 */

import { describe, it, expect } from "vitest";
import { cn, formatDate, formatDateTime } from "./utils";

describe("cn (className merge utility)", () => {
  it("should merge class names", () => {
    const result = cn("px-4", "py-2");
    expect(result).toBe("px-4 py-2");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  it("should filter out falsy values", () => {
    const result = cn("base", false && "hidden", undefined, null, "visible");
    expect(result).toBe("base visible");
  });

  it("should merge Tailwind classes correctly", () => {
    // Later classes should override earlier ones
    const result = cn("px-4", "px-6");
    expect(result).toBe("px-6");
  });

  it("should handle array of classes", () => {
    const result = cn(["px-4", "py-2"], "text-lg");
    expect(result).toBe("px-4 py-2 text-lg");
  });

  it("should handle object syntax", () => {
    const result = cn({ "bg-blue-500": true, "bg-red-500": false });
    expect(result).toBe("bg-blue-500");
  });
});

describe("formatDate", () => {
  it("should format Date object correctly", () => {
    const date = new Date("2025-01-15T00:00:00");
    const result = formatDate(date);
    expect(result).toMatch(/15.*January.*2025/);
  });

  it("should format ISO date string correctly", () => {
    const result = formatDate("2025-06-20");
    expect(result).toMatch(/20.*June.*2025/);
  });

  it("should use en-NZ locale format", () => {
    const result = formatDate("2025-12-25");
    // NZ format: day month year
    expect(result).toMatch(/25.*December.*2025/);
  });
});

describe("formatDateTime", () => {
  it("should format Date object with time", () => {
    const date = new Date("2025-01-15T14:30:00");
    const result = formatDateTime(date);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/2025/);
  });

  it("should format ISO date string with time", () => {
    const result = formatDateTime("2025-06-20T09:45:00");
    expect(result).toMatch(/20/);
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/2025/);
  });

  it("should include hours and minutes", () => {
    const date = new Date("2025-01-15T14:30:00");
    const result = formatDateTime(date);
    // Should contain time component
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});
