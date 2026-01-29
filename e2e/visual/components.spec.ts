import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for UI components - Roofing Report
 *
 * Verifies component styling including:
 * - Button variants with red app-accent
 * - Form inputs with red focus ring
 * - Report status badges
 * - Defect severity badges
 * - Card shadows and borders
 */
test.describe("Visual consistency - Components", () => {
  test.describe("Button components", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test("button default state with red accent", async ({ page }) => {
      const button = page.locator('button[type="submit"], button.bg-app-accent').first();

      if (await button.count() > 0) {
        await expect(button).toHaveScreenshot("rr-button-default.png", {
          maxDiffPixels: 50,
          animations: "disabled",
        });
      }
    });

    test("button hover state", async ({ page }) => {
      const button = page.locator('button[type="submit"], button.bg-app-accent').first();

      if (await button.count() > 0) {
        await button.hover();
        await page.waitForTimeout(200);

        await expect(button).toHaveScreenshot("rr-button-hover.png", {
          maxDiffPixels: 50,
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Form inputs", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test("input default state", async ({ page }) => {
      const input = page.locator('input[type="email"], input[type="text"]').first();

      if (await input.count() > 0) {
        await expect(input).toHaveScreenshot("rr-input-default.png", {
          maxDiffPixels: 30,
          animations: "disabled",
        });
      }
    });

    test("input focus state with red app-accent ring", async ({ page }) => {
      const input = page.locator('input[type="email"], input[type="text"]').first();

      if (await input.count() > 0) {
        await input.focus();
        await page.waitForTimeout(200);

        await expect(input).toHaveScreenshot("rr-input-focus.png", {
          maxDiffPixels: 50,
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Status and severity badges", () => {
    test("defect severity badges styled correctly", async ({ page }) => {
      // Navigate to a page with status badges (if accessible without auth)
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1280, height: 720 });

      // Look for severity badge elements
      const criticalBadge = page.locator('[class*="critical"], [class*="status-critical"]').first();
      const highBadge = page.locator('[class*="high"], [class*="status-high"]').first();
      const mediumBadge = page.locator('[class*="medium"], [class*="status-medium"]').first();
      const lowBadge = page.locator('[class*="low"], [class*="status-low"]').first();

      if (await criticalBadge.count() > 0) {
        await expect(criticalBadge).toHaveScreenshot("rr-badge-critical.png", {
          maxDiffPixels: 20,
          animations: "disabled",
        });
      }

      if (await highBadge.count() > 0) {
        await expect(highBadge).toHaveScreenshot("rr-badge-high.png", {
          maxDiffPixels: 20,
          animations: "disabled",
        });
      }

      if (await mediumBadge.count() > 0) {
        await expect(mediumBadge).toHaveScreenshot("rr-badge-medium.png", {
          maxDiffPixels: 20,
          animations: "disabled",
        });
      }

      if (await lowBadge.count() > 0) {
        await expect(lowBadge).toHaveScreenshot("rr-badge-low.png", {
          maxDiffPixels: 20,
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Cards and containers", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test("card with shadow", async ({ page }) => {
      const card = page.locator(".shadow-lg, .shadow-md, .rounded-lg").first();

      if (await card.count() > 0) {
        await expect(card).toHaveScreenshot("rr-card-shadow.png", {
          maxDiffPixels: 100,
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Color consistency", () => {
    test("red accent color applied correctly", async ({ page }) => {
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1280, height: 720 });

      // Find elements with app-accent background
      const accentElements = page.locator('[class*="bg-app-accent"], [class*="border-app-accent"]');
      const count = await accentElements.count();

      if (count > 0) {
        await expect(accentElements.first()).toHaveScreenshot("rr-accent-element.png", {
          maxDiffPixels: 30,
          animations: "disabled",
        });
      }
    });

    test("RANZ charcoal colors applied to header", async ({ page }) => {
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1280, height: 720 });

      const header = page.locator("header, .ranz-header").first();

      if (await header.count() > 0) {
        await expect(header).toHaveScreenshot("rr-charcoal-header.png", {
          maxDiffPixels: 100,
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Condition rating colors", () => {
    test("condition colors match design system", async ({ page }) => {
      // This test verifies condition rating colors are available in CSS
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Look for condition-rated elements
      const goodCondition = page.locator('[class*="condition-good"]').first();
      const fairCondition = page.locator('[class*="condition-fair"]').first();
      const poorCondition = page.locator('[class*="condition-poor"]').first();
      const criticalCondition = page.locator('[class*="condition-critical"]').first();

      if (await goodCondition.count() > 0) {
        await expect(goodCondition).toHaveScreenshot("rr-condition-good.png", {
          maxDiffPixels: 20,
          animations: "disabled",
        });
      }

      if (await fairCondition.count() > 0) {
        await expect(fairCondition).toHaveScreenshot("rr-condition-fair.png", {
          maxDiffPixels: 20,
          animations: "disabled",
        });
      }

      if (await poorCondition.count() > 0) {
        await expect(poorCondition).toHaveScreenshot("rr-condition-poor.png", {
          maxDiffPixels: 20,
          animations: "disabled",
        });
      }

      if (await criticalCondition.count() > 0) {
        await expect(criticalCondition).toHaveScreenshot("rr-condition-critical.png", {
          maxDiffPixels: 20,
          animations: "disabled",
        });
      }
    });
  });
});
