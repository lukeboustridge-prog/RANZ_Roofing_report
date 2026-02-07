import { test, expect } from "@playwright/test";

/**
 * Public Pages E2E Tests for RANZ Roofing Report
 *
 * Tests cover all pages that should be accessible WITHOUT authentication:
 * - Landing / home page
 * - Sign-in and sign-up pages
 * - Public inspector directory
 * - Shared report access (token-based)
 * - 404 not-found page
 * - Health API endpoint
 *
 * These tests use the base Playwright test (no auth fixture) to verify
 * that public routes load correctly for anonymous users.
 */

test.describe("Public Pages - Landing Page", () => {
  test("landing page loads with correct title and heading", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should not redirect to sign-in (home is public)
    expect(page.url()).not.toContain("sign-in");

    // Verify the main heading is present
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/RANZ/i);
  });

  test("landing page has sign-in link", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for a sign-in link or button
    const signInLink = page.locator('a[href="/sign-in"]');
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toContainText(/Sign In/i);
  });

  test("landing page has sign-up / create account link", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for a sign-up link or button
    const signUpLink = page.locator('a[href="/sign-up"]');
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toContainText(/Create Account|Sign Up/i);
  });

  test("landing page displays RANZ branding element", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The landing page should have the RANZ branding icon or logo
    const brandingElement = page.locator("h1, .text-4xl, img[alt*='RANZ']").first();
    await expect(brandingElement).toBeVisible();
  });

  test("landing page description mentions roofing inspections", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The descriptive paragraph should reference inspections
    const description = page.locator("p").filter({ hasText: /inspection|roofing|report/i }).first();
    await expect(description).toBeVisible();
  });
});

test.describe("Public Pages - Sign-In Page", () => {
  test("sign-in page renders without redirect loop", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    // Should stay on sign-in page
    expect(page.url()).toContain("sign-in");
  });

  test("sign-in page renders Clerk component or auth form", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    // Wait for the page to be interactive
    await page.waitForLoadState("domcontentloaded");

    // Clerk renders inside a container; look for common Clerk or form elements
    // This is resilient to Clerk's internal DOM structure changes
    const hasClerkRoot = await page.locator('[id*="clerk"], .cl-rootBox, .cl-card').count();
    const hasFormInputs = await page.locator('input[type="email"], input[type="text"], input[name*="email"]').count();
    const hasHeading = await page.locator("h1, h2").count();

    // At least one of these should be present on a functioning sign-in page
    expect(hasClerkRoot + hasFormInputs + hasHeading).toBeGreaterThan(0);
  });

  test("sign-in page has appropriate title", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveTitle(/RANZ|Sign In|Login|Roofing/i);
  });
});

test.describe("Public Pages - Sign-Up Page", () => {
  test("sign-up page renders correctly", async ({ page }) => {
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");

    // Should load the sign-up page (may redirect to Clerk-hosted or stay on /sign-up)
    expect(page.url()).toContain("sign-up");
  });

  test("sign-up page has form elements or Clerk component", async ({
    page,
  }) => {
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("domcontentloaded");

    const hasClerkRoot = await page.locator('[id*="clerk"], .cl-rootBox, .cl-card').count();
    const hasFormInputs = await page.locator('input[type="email"], input[type="text"], input[name*="email"]').count();
    const hasHeading = await page.locator("h1, h2").count();

    expect(hasClerkRoot + hasFormInputs + hasHeading).toBeGreaterThan(0);
  });
});

test.describe("Public Pages - Inspector Directory", () => {
  test("inspector directory page is accessible without authentication", async ({
    page,
  }) => {
    await page.goto("/inspectors");
    await page.waitForLoadState("networkidle");

    // Should stay on inspectors page (not redirected to sign-in)
    expect(page.url()).toContain("inspectors");
    expect(page.url()).not.toContain("sign-in");
  });

  test("inspector directory page renders content", async ({ page }) => {
    await page.goto("/inspectors");
    await page.waitForLoadState("networkidle");

    // The page should have some visible content (heading, list, or message)
    const bodyContent = await page.locator("body").innerText();
    expect(bodyContent.length).toBeGreaterThan(0);
  });
});

test.describe("Public Pages - Shared Report Access", () => {
  test("shared report route is accessible without authentication", async ({
    page,
  }) => {
    // Shared reports use token-based access (no auth redirect)
    await page.goto("/shared/test-token");
    await page.waitForLoadState("networkidle");

    // Should stay on shared route, NOT redirect to sign-in
    expect(page.url()).toContain("shared");
    expect(page.url()).not.toContain("sign-in");
  });

  test("shared report with invalid token shows error or empty state", async ({
    page,
  }) => {
    await page.goto("/shared/invalid-nonexistent-token");
    await page.waitForLoadState("networkidle");

    // Should still be on the shared route (not sign-in)
    expect(page.url()).toContain("shared");

    // Page should render something (error message, not found, etc.)
    const bodyContent = await page.locator("body").innerText();
    expect(bodyContent.length).toBeGreaterThan(0);
  });
});

test.describe("Public Pages - 404 Not Found", () => {
  test("404 page renders for invalid routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-at-all");
    await page.waitForLoadState("networkidle");

    // The not-found page should contain recognisable 404 content
    const pageText = await page.locator("body").innerText();
    const has404Content =
      pageText.includes("Not Found") ||
      pageText.includes("not found") ||
      pageText.includes("404") ||
      pageText.includes("doesn't exist") ||
      pageText.includes("does not exist");

    expect(has404Content).toBe(true);
  });

  test("404 page has navigation links back to home or dashboard", async ({
    page,
  }) => {
    await page.goto("/this-page-does-not-exist-at-all");
    await page.waitForLoadState("networkidle");

    // The not-found page should have links to navigate away
    const homeLink = page.locator('a[href="/"], a[href="/dashboard"]').first();
    await expect(homeLink).toBeVisible();
  });
});

test.describe("Public Pages - Health API Endpoint", () => {
  test("health API endpoint returns 200 or 503 with JSON body", async ({
    request,
  }) => {
    const response = await request.get("/api/health");

    // Health endpoint should return 200 (healthy/degraded) or 503 (unhealthy)
    // It may also return 429 if rate-limited
    expect([200, 503, 429]).toContain(response.status());

    // If not rate-limited, body should be valid JSON with status field
    if (response.status() !== 429) {
      const body = await response.json();
      expect(body).toHaveProperty("status");
      expect(body).toHaveProperty("timestamp");
      expect(["healthy", "degraded", "unhealthy"]).toContain(body.status);
    }
  });

  test("health API returns correct content type", async ({ request }) => {
    const response = await request.get("/api/health");

    // Should return JSON content type
    const contentType = response.headers()["content-type"];
    if (response.status() !== 429) {
      expect(contentType).toContain("application/json");
    }
  });

  test("health API response has no-store cache header", async ({ request }) => {
    const response = await request.get("/api/health");

    if (response.status() !== 429) {
      const cacheControl = response.headers()["cache-control"];
      expect(cacheControl).toContain("no-store");
    }
  });
});

test.describe("Public Pages - Navigation Between Public Routes", () => {
  test("can navigate from home to sign-in via link", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const signInLink = page.locator('a[href="/sign-in"]');
    await signInLink.click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });

  test("can navigate from home to sign-up via link", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const signUpLink = page.locator('a[href="/sign-up"]');
    await signUpLink.click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-up");
  });
});
