import type { Page } from "@playwright/test";

/**
 * Common Test Utilities for RANZ Roofing Report E2E Tests
 *
 * Shared helpers, route constants, and test data generators used across
 * functional and visual test suites.
 */

// ─── Route Path Constants ────────────────────────────────────────────────────

/**
 * Application route paths used across E2E tests.
 * Centralised here so route changes only need updating in one place.
 */
export const ROUTES = {
  // Public routes (no auth required)
  HOME: "/",
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
  INSPECTORS: "/inspectors",
  SHARED_REPORT: "/shared",
  REQUEST_INSPECTION: "/request-inspection",

  // Protected routes (auth required)
  DASHBOARD: "/dashboard",
  REPORTS: "/reports",
  REPORTS_NEW: "/reports/new",
  PROFILE: "/profile",
  SETTINGS: "/settings",
  REVIEW: "/review",

  // Admin routes (admin role required)
  ADMIN: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_REPORTS: "/admin/reports",
  ADMIN_REVIEWS: "/admin/reviews",
  ADMIN_INSPECTORS: "/admin/inspectors",
  ADMIN_TEMPLATES: "/admin/templates",
  ADMIN_SETTINGS: "/admin/settings",
  ADMIN_ANALYTICS: "/admin/analytics",
  ADMIN_AUDIT_LOGS: "/admin/audit-logs",
  ADMIN_COMPLAINTS: "/admin/complaints",

  // API routes
  API_HEALTH: "/api/health",
  API_REPORTS: "/api/reports",
  API_ADMIN_USERS: "/api/admin/users",
  API_ADMIN_INSPECTORS: "/api/admin/inspectors",
} as const;

// ─── Page Ready Helpers ──────────────────────────────────────────────────────

/**
 * Waits for the page to be fully ready: network idle and DOM hydrated.
 * Follows the same `networkidle` pattern used throughout the existing test suite.
 *
 * @param page - Playwright Page object
 * @param options - Optional timeout override (default: 10000ms)
 */
export async function waitForPageReady(
  page: Page,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 10000;

  // Wait for network to become idle (no pending requests for 500ms)
  await page.waitForLoadState("networkidle", { timeout });

  // Wait for hydration by checking that the document is interactive/complete
  await page.waitForFunction(
    () => document.readyState === "complete",
    { timeout }
  );
}

/**
 * Navigates to a path and waits for the page to be fully ready.
 * Combines `page.goto()` with `waitForPageReady()` for concise test steps.
 *
 * @param page - Playwright Page object
 * @param path - URL path to navigate to (relative to baseURL)
 * @param options - Optional timeout override
 * @returns The Playwright Response from the navigation
 */
export async function navigateAndWait(
  page: Page,
  path: string,
  options?: { timeout?: number }
): Promise<void> {
  await page.goto(path);
  await waitForPageReady(page, options);
}

// ─── Test Data Generators ────────────────────────────────────────────────────

/**
 * Generates a test report data object with realistic values for New Zealand
 * roofing inspections. Suitable for API-level and form-level tests.
 *
 * @param overrides - Partial fields to override defaults
 * @returns A complete report data object
 */
export function generateTestReport(overrides?: Record<string, unknown>): {
  propertyAddress: string;
  propertyCity: string;
  propertyRegion: string;
  propertyPostcode: string;
  propertyType: string;
  inspectionDate: string;
  inspectionType: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  weatherConditions: string;
  accessMethod: string;
} {
  const timestamp = Date.now();
  return {
    propertyAddress: `${Math.floor(Math.random() * 200) + 1} Test Street`,
    propertyCity: "Auckland",
    propertyRegion: "Auckland",
    propertyPostcode: "1010",
    propertyType: "RESIDENTIAL_1",
    inspectionDate: new Date().toISOString().split("T")[0],
    inspectionType: "FULL_INSPECTION",
    clientName: `Test Client ${timestamp}`,
    clientEmail: `test.client.${timestamp}@example.com`,
    clientPhone: "021 123 4567",
    weatherConditions: "Fine, light winds, 18°C",
    accessMethod: "Ladder access to all areas",
    ...overrides,
  };
}

/**
 * Generates a test defect data object for defect creation tests.
 *
 * @param overrides - Partial fields to override defaults
 * @returns A defect data object
 */
export function generateTestDefect(overrides?: Record<string, unknown>): {
  description: string;
  severity: string;
  location: string;
  observation: string;
  analysis: string;
  opinion: string;
} {
  return {
    description: "Corroded flashing at parapet junction",
    severity: "HIGH",
    location: "North-facing parapet wall, roof level",
    observation:
      "Visible corrosion and perforation of lead flashing at the parapet-to-roof junction",
    analysis:
      "Corrosion consistent with galvanic reaction between dissimilar metals (lead and galvanised steel)",
    opinion:
      "Flashing requires replacement to prevent moisture ingress into the building envelope",
    ...overrides,
  };
}

// ─── Assertion Helpers ───────────────────────────────────────────────────────

/**
 * Checks whether the current page URL indicates the user was redirected to
 * the sign-in page. Useful for auth-guard assertions.
 *
 * @param page - Playwright Page object
 * @returns true if the URL contains "sign-in"
 */
export function isRedirectedToSignIn(page: Page): boolean {
  return page.url().includes("sign-in");
}

/**
 * Returns a URL pattern string for matching a report detail page.
 *
 * @param reportId - The report ID to include in the pattern
 * @returns URL path string
 */
export function reportDetailPath(reportId: string): string {
  return `/reports/${reportId}`;
}

/**
 * Returns a URL pattern string for matching a shared report page.
 *
 * @param token - The share token
 * @returns URL path string
 */
export function sharedReportPath(token: string): string {
  return `/shared/${token}`;
}
