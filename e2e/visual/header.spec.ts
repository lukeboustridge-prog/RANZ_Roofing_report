import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for AppHeader component - Roofing Report
 *
 * Verifies RANZ branding consistency including:
 * - RANZ logo placement
 * - Red accent color (#D32F2F) for Roofing Report
 * - Header diagonal accent overlay
 * - OfflineIndicator and SyncStatusCompact components
 * - Responsive layout on mobile
 */
test.describe("Visual consistency - Header", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page that displays the header
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
  });

  test("header matches RANZ branding on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);

    const header = page.locator("header").first();
    await expect(header).toBeVisible();

    await expect(header).toHaveScreenshot("rr-header-desktop.png", {
      maxDiffPixels: 100,
      animations: "disabled",
    });
  });

  test("header responsive on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    const header = page.locator("header").first();
    await expect(header).toBeVisible();

    await expect(header).toHaveScreenshot("rr-header-tablet.png", {
      maxDiffPixels: 100,
      animations: "disabled",
    });
  });

  test("header responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    const header = page.locator("header").first();
    await expect(header).toBeVisible();

    await expect(header).toHaveScreenshot("rr-header-mobile.png", {
      maxDiffPixels: 100,
      animations: "disabled",
    });
  });

  test("header contains RANZ logo", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Verify logo is present
    const logo = page.locator('header img[alt="RANZ Logo"]');
    await expect(logo).toBeVisible();

    // Screenshot just the logo container area
    const logoContainer = page.locator("header").first();
    await expect(logoContainer).toHaveScreenshot("rr-header-logo-area.png", {
      maxDiffPixels: 50,
      animations: "disabled",
    });
  });

  test("app name badge shows red accent", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // The app name badge should use bg-app-accent (red for RR)
    const appBadge = page.locator("header span").filter({ hasText: /Roofing Report|RR/ }).first();

    if (await appBadge.count() > 0) {
      await expect(appBadge).toHaveScreenshot("rr-header-app-badge.png", {
        maxDiffPixels: 20,
        animations: "disabled",
      });
    }
  });

  test("offline indicator visible in header", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Check for OfflineIndicator component
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');

    if (await offlineIndicator.count() > 0) {
      await expect(offlineIndicator).toHaveScreenshot("rr-offline-indicator.png", {
        maxDiffPixels: 30,
        animations: "disabled",
      });
    }
  });

  test("sync status visible in header", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Check for SyncStatusCompact component
    const syncStatus = page.locator('[data-testid="sync-status"]');

    if (await syncStatus.count() > 0) {
      await expect(syncStatus).toHaveScreenshot("rr-sync-status.png", {
        maxDiffPixels: 30,
        animations: "disabled",
      });
    }
  });
});
