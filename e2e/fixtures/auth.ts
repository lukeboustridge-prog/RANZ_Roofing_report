import { test as base, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

/**
 * Auth Fixture for RANZ Roofing Report E2E Tests
 *
 * Provides authenticated test contexts using Clerk's testing token approach.
 * The `setupClerkTestingToken` function injects a Clerk testing token into
 * the browser page, which bypasses the normal Clerk auth flow during E2E tests.
 *
 * Requirements:
 * - CLERK_TESTING_TOKEN must be set in the environment for token-based auth
 * - Falls back gracefully if Clerk testing tokens are not available
 *
 * Usage:
 *   import { test, expect } from "../fixtures/auth";
 *   test("authenticated test", async ({ page }) => { ... });
 *
 * For admin tests:
 *   import { adminTest, expect } from "../fixtures/auth";
 *   adminTest("admin test", async ({ page }) => { ... });
 */

// ─── Authenticated Test Fixture ─────────────────────────────────────────────

/**
 * Extends the base Playwright test with automatic Clerk testing token setup.
 * Every test using this fixture will have Clerk auth state injected before
 * interacting with the page.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    try {
      await setupClerkTestingToken({ page });
    } catch (error) {
      // Fall back gracefully if Clerk testing token is not configured.
      // Tests that require auth will still redirect to sign-in, which
      // individual tests can assert against.
      console.warn(
        "[Auth Fixture] Clerk testing token setup failed. " +
          "Ensure CLERK_TESTING_TOKEN is set in your environment. " +
          "Falling back to unauthenticated state.",
        error instanceof Error ? error.message : error
      );
    }
    await use(page);
  },
});

// ─── Admin Test Fixture ─────────────────────────────────────────────────────

/**
 * Extends the authenticated test fixture with admin-specific setup.
 * Sets a cookie marker that the middleware can use for admin role resolution
 * in combination with the Clerk testing token.
 *
 * Note: Actual admin role assignment depends on Clerk organisation roles
 * (ranz:admin, SUPER_ADMIN). This fixture ensures the auth token is present
 * and adds metadata that tests can use for admin-level assertions.
 */
export const adminTest = base.extend({
  page: async ({ page, context }, use) => {
    try {
      await setupClerkTestingToken({ page });
    } catch (error) {
      console.warn(
        "[Admin Fixture] Clerk testing token setup failed. " +
          "Admin tests will fall back to unauthenticated state.",
        error instanceof Error ? error.message : error
      );
    }

    // Set a test metadata cookie that admin-aware test helpers can read.
    // This does not grant admin access on its own; it is a signal for tests
    // to know an admin context was intended.
    await context.addCookies([
      {
        name: "ranz_test_role",
        value: "admin",
        domain: "localhost",
        path: "/",
      },
    ]);

    await use(page);
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Checks whether the Clerk testing token environment is available.
 * Useful for conditionally skipping tests that strictly require auth.
 */
export function isClerkTestingAvailable(): boolean {
  return !!process.env.CLERK_TESTING_TOKEN;
}

/**
 * Skips the current test if Clerk testing tokens are not configured.
 * Call at the top of tests that cannot function without real auth state.
 *
 * @example
 *   test("requires auth", async ({ page }) => {
 *     skipWithoutClerkToken(test);
 *     // ... rest of test
 *   });
 */
export function skipWithoutClerkToken(t: typeof base) {
  if (!isClerkTestingAvailable()) {
    t.skip();
  }
}

export { expect } from "@playwright/test";
