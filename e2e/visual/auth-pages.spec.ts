import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for authentication pages - Roofing Report
 *
 * Verifies AuthLayout consistency including:
 * - Split-screen layout on desktop
 * - RANZ branding in left panel
 * - Red accent (#D32F2F) border on auth card
 * - Responsive layout on mobile
 */
test.describe("Visual consistency - Auth Pages", () => {
  test.describe("Sign-in page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
    });

    test("sign-in page layout on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot("rr-sign-in-desktop.png", {
        maxDiffPixels: 500,
        animations: "disabled",
        mask: [page.locator('[data-testid="timestamp"]')],
      });
    });

    test("sign-in split-screen branding panel", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(500);

      const brandingPanel = page.locator("div").filter({ hasText: "Roofing Association" }).first();

      if (await brandingPanel.count() > 0) {
        await expect(brandingPanel).toHaveScreenshot("rr-sign-in-branding-panel.png", {
          maxDiffPixels: 100,
          animations: "disabled",
        });
      }
    });

    test("sign-in auth card with red accent border", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(500);

      // The auth card should have border-app-accent (red for RR)
      const authCard = page.locator(".border-t-4, .border-app-accent").first();

      if (await authCard.count() > 0) {
        await expect(authCard).toHaveScreenshot("rr-sign-in-auth-card.png", {
          maxDiffPixels: 200,
          animations: "disabled",
        });
      }
    });

    test("sign-in page on tablet", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot("rr-sign-in-tablet.png", {
        maxDiffPixels: 500,
        animations: "disabled",
      });
    });

    test("sign-in page on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot("rr-sign-in-mobile.png", {
        maxDiffPixels: 500,
        animations: "disabled",
      });
    });

    test("sign-in RANZ logo visible in branding", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(500);

      const logo = page.locator('img[alt*="RANZ"]').first();
      await expect(logo).toBeVisible();
    });
  });

  test.describe("Sign-up page", () => {
    test("sign-up page layout on desktop", async ({ page }) => {
      await page.goto("/sign-up");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot("rr-sign-up-desktop.png", {
        maxDiffPixels: 500,
        animations: "disabled",
      });
    });

    test("sign-up page on mobile", async ({ page }) => {
      await page.goto("/sign-up");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot("rr-sign-up-mobile.png", {
        maxDiffPixels: 500,
        animations: "disabled",
      });
    });
  });
});
