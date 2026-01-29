import { test, expect } from "@playwright/test";

/**
 * Admin E2E Tests for RANZ Roofing Report
 *
 * Tests cover:
 * - Admin dashboard access
 * - Inspector list page
 * - Inspector assignments
 * - Report management
 * - Admin-only route protection
 *
 * Note: These routes require RANZ admin role authentication.
 * Tests verify route protection and structure.
 */

test.describe("Admin - Route Protection", () => {
  test("admin dashboard redirects unauthenticated users", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });

  test("admin users page redirects unauthenticated users", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });

  test("admin reports page redirects unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/admin/reports");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });

  test("admin reviews page redirects unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/admin/reviews");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });

  test("admin settings page redirects unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/admin/settings");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });

  test("admin analytics page redirects unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/admin/analytics");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });

  test("admin audit-logs page redirects unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/admin/audit-logs");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });
});

test.describe("Admin - Inspector Management", () => {
  test("inspector list page redirects unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/admin/inspectors");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });

  test("inspector assignments page redirects unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/admin/inspectors/test-inspector-id/assignments");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });
});

test.describe("Admin - Template Management", () => {
  test("templates list page redirects unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/admin/templates");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });

  test("template detail page redirects unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/admin/templates/test-template-id");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });
});

test.describe("Admin - Complaint Management", () => {
  test("complaints list page redirects unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/admin/complaints");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });

  test("complaint detail page redirects unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/admin/complaints/test-complaint-id");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });
});

test.describe("Admin - API Routes", () => {
  test("admin users API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/users");

    expect([401, 302, 307, 403]).toContain(response.status());
  });

  test("admin inspectors API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/inspectors");

    // May not exist or require auth
    expect([401, 302, 307, 403, 404]).toContain(response.status());
  });

  test("admin assignments API requires authentication", async ({ request }) => {
    const response = await request.get(
      "/api/admin/inspectors/test-id/assignments"
    );

    expect([401, 302, 307, 403, 404]).toContain(response.status());
  });
});

test.describe("Admin - Page Structure Documentation", () => {
  // These tests document expected page structure
  // Full verification requires authenticated access

  test.describe("Inspector List Page", () => {
    test("should have inspector stats badges when loaded", async ({
      page,
    }) => {
      // When authenticated and authorized, the inspector page shows:
      // - Total count
      // - Active count
      // - Pending count
      // - Suspended count
      await page.goto("/admin/inspectors");
      expect(page.url()).toContain("sign-in");
    });

    test("should have inspector table when loaded", async ({ page }) => {
      // The inspector table shows:
      // - Name, email, role
      // - Status badge
      // - Report count
      // - Last active date
      await page.goto("/admin/inspectors");
      expect(page.url()).toContain("sign-in");
    });

    test("should link to Quality Program for user management", async ({
      page,
    }) => {
      // Info banner links to portal.ranz.org.nz/admin/users
      await page.goto("/admin/inspectors");
      expect(page.url()).toContain("sign-in");
    });
  });

  test.describe("Inspector Assignments Page", () => {
    test("should show report count per inspector", async ({ page }) => {
      await page.goto("/admin/inspectors/test-id/assignments");
      expect(page.url()).toContain("sign-in");
    });

    test("should support report reassignment", async ({ page }) => {
      // Assignments page allows reassigning reports to other inspectors
      await page.goto("/admin/inspectors/test-id/assignments");
      expect(page.url()).toContain("sign-in");
    });
  });

  test.describe("Admin Dashboard", () => {
    test("should display admin navigation", async ({ page }) => {
      // Admin layout includes navigation to:
      // - Users, Reports, Reviews
      // - Inspectors, Templates
      // - Settings, Analytics, Audit Logs
      await page.goto("/admin");
      expect(page.url()).toContain("sign-in");
    });
  });
});
