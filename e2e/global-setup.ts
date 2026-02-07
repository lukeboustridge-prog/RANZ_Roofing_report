import type { FullConfig } from "@playwright/test";

/**
 * Global Setup for RANZ Roofing Report E2E Tests
 *
 * Runs once before all test suites. Performs environment checks and
 * logs configuration information to help with debugging test runs.
 *
 * This setup file:
 * - Verifies the dev server is accessible at the configured base URL
 * - Logs the test environment configuration
 * - Does NOT perform any CI-specific setup (safe to run locally)
 */

async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    config.projects[0]?.use?.baseURL ||
    process.env.BASE_URL ||
    "http://localhost:3000";

  console.log("\n========================================");
  console.log("  RANZ Roofing Report — E2E Test Setup");
  console.log("========================================\n");

  // Log configuration
  console.log(`  Base URL:         ${baseURL}`);
  console.log(`  Projects:         ${config.projects.map((p) => p.name).join(", ")}`);
  console.log(`  Workers:          ${config.workers}`);
  console.log(`  Retries:          ${config.projects[0]?.retries ?? 0}`);
  console.log(`  Auth mode:        ${process.env.AUTH_MODE || "clerk (default)"}`);
  console.log(`  Clerk testing:    ${process.env.CLERK_TESTING_TOKEN ? "configured" : "not configured"}`);
  console.log(`  CI environment:   ${process.env.CI ? "yes" : "no"}`);
  console.log("");

  // Check if the dev server is accessible
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(baseURL, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 307 || response.status === 302) {
      console.log(`  Server check:     OK (status ${response.status})`);
    } else {
      console.warn(
        `  Server check:     WARNING (status ${response.status})` +
          "\n  The dev server responded but with an unexpected status." +
          "\n  Tests may still work if routes respond correctly."
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("abort") || message.includes("timeout")) {
      console.warn(
        "  Server check:     TIMEOUT" +
          `\n  Could not reach ${baseURL} within 10 seconds.` +
          "\n  Playwright's webServer config will attempt to start the server." +
          "\n  If tests fail, ensure the dev server is running."
      );
    } else {
      console.warn(
        "  Server check:     UNREACHABLE" +
          `\n  Could not connect to ${baseURL}` +
          `\n  Error: ${message}` +
          "\n  Playwright's webServer config will attempt to start the server."
      );
    }
  }

  console.log("\n========================================\n");
}

export default globalSetup;
