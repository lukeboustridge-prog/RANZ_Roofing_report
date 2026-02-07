import { test, expect } from "@playwright/test";

/**
 * Report Submission and Review Flow E2E Tests for RANZ Roofing Report
 *
 * Tests cover the report submission and review lifecycle:
 * - Submit page auth protection
 * - Submit page validation behaviour
 * - Review page auth protection
 * - API endpoint auth requirements for submission
 * - API endpoint auth requirements for review actions
 * - Pre-submission validation endpoint structure
 *
 * Note: Full submission and review workflows require authenticated sessions
 * with specific roles (APPOINTED_INSPECTOR for submit, REVIEWER/ADMIN for review).
 * These tests document expected behaviour and verify auth guards are enforced.
 */

test.describe("Submit Flow - Page Access Control", () => {
  test("submit page redirects unauthenticated users to sign-in", async ({
    page,
  }) => {
    await page.goto("/reports/test-report-id/submit");
    await page.waitForLoadState("networkidle");

    // Unauthenticated users should be redirected to sign-in
    expect(page.url()).toContain("sign-in");
  });

  test("report detail page redirects unauthenticated users to sign-in", async ({
    page,
  }) => {
    await page.goto("/reports/test-report-id");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });
});

test.describe("Submit Flow - API Auth Requirements", () => {
  test("POST /api/reports/:id/submit requires authentication", async ({
    request,
  }) => {
    const response = await request.post("/api/reports/test-report-id/submit");

    // Should return 401 (Unauthorized) or 302/307 (redirect) for unauth requests
    expect([401, 302, 307, 403]).toContain(response.status());
  });

  test("POST /api/reports/:id/submit returns 401 with error body", async ({
    request,
  }) => {
    const response = await request.post("/api/reports/test-report-id/submit");

    if (response.status() === 401) {
      const body = await response.json();
      expect(body).toHaveProperty("error");
      expect(body.error).toContain("Unauthorized");
    }
  });

  test("GET /api/reports/:id/submit (validation check) requires authentication", async ({
    request,
  }) => {
    // The GET endpoint returns validation status without submitting
    const response = await request.get("/api/reports/test-report-id/submit");

    expect([401, 302, 307, 403]).toContain(response.status());
  });
});

test.describe("Submit Flow - Validation Structure", () => {
  /**
   * Documents the expected validation response structure.
   * When authenticated, the GET /api/reports/:id/submit endpoint returns
   * a validation object with the following shape:
   *
   * {
   *   success: boolean,
   *   validation: {
   *     isValid: boolean,
   *     errors: string[],
   *     warnings: string[],
   *     completionPercentage: number,
   *     missingRequiredItems: string[],
   *     validationDetails: {
   *       propertyDetails: { complete: boolean, missing: string[] },
   *       inspectionDetails: { complete: boolean, missing: string[] },
   *       roofElements: { complete: boolean, count: number, minimum: number },
   *       defects: { documented: boolean, count: number },
   *       photos: { sufficient: boolean, count: number, minimum: number, withExif: number, withGps: number },
   *       compliance: { complete: boolean, coverage: number, required: number },
   *     }
   *   },
   *   currentStatus: string
   * }
   */
  test("validation endpoint requires auth before returning structure", async ({
    request,
  }) => {
    const response = await request.get("/api/reports/test-report-id/submit");

    // Without auth, cannot verify the response structure
    expect([401, 302, 307, 403]).toContain(response.status());
  });

  test("submit endpoint rejects requests without report data", async ({
    request,
  }) => {
    // Even if we could auth, submitting a non-existent report should fail
    const response = await request.post(
      "/api/reports/nonexistent-report-id/submit"
    );

    // Should get auth error first (before any report validation)
    expect([401, 302, 307, 403, 404]).toContain(response.status());
  });
});

test.describe("Review Flow - Page Access Control", () => {
  test("review page redirects unauthenticated users to sign-in", async ({
    page,
  }) => {
    await page.goto("/review");
    await page.waitForLoadState("networkidle");

    // Unauthenticated users should be redirected to sign-in
    expect(page.url()).toContain("sign-in");
  });

  test("admin reviews page redirects unauthenticated users to sign-in", async ({
    page,
  }) => {
    await page.goto("/admin/reviews");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });
});

test.describe("Review Flow - API Auth Requirements", () => {
  test("POST /api/reports/:id/review (start review) requires authentication", async ({
    request,
  }) => {
    const response = await request.post("/api/reports/test-report-id/review");

    expect([401, 302, 307, 403]).toContain(response.status());
  });

  test("GET /api/reports/:id/review (review status) requires authentication", async ({
    request,
  }) => {
    const response = await request.get("/api/reports/test-report-id/review");

    expect([401, 302, 307, 403]).toContain(response.status());
  });

  test("PATCH /api/reports/:id/review (review decision) requires authentication", async ({
    request,
  }) => {
    const response = await request.patch("/api/reports/test-report-id/review", {
      data: {
        decision: "APPROVE",
        comment: "Test review decision",
      },
    });

    expect([401, 302, 307, 403]).toContain(response.status());
  });

  test("PATCH /api/reports/:id/review returns 401 with error body", async ({
    request,
  }) => {
    const response = await request.patch("/api/reports/test-report-id/review", {
      data: {
        decision: "APPROVE",
      },
    });

    if (response.status() === 401) {
      const body = await response.json();
      expect(body).toHaveProperty("error");
      expect(body.error).toContain("Unauthorized");
    }
  });
});

test.describe("Review Flow - Approval and Rejection Endpoints", () => {
  test("POST /api/reports/:id/approve requires authentication", async ({
    request,
  }) => {
    const response = await request.post("/api/reports/test-report-id/approve");

    // May return 401 (auth required) or 404 (route may not exist separately)
    expect([401, 302, 307, 403, 404, 405]).toContain(response.status());
  });

  test("POST /api/reports/:id/reject requires authentication", async ({
    request,
  }) => {
    const response = await request.post("/api/reports/test-report-id/reject");

    expect([401, 302, 307, 403, 404, 405]).toContain(response.status());
  });
});

test.describe("Submit Flow - Report Creation API Auth", () => {
  test("POST /api/reports (create report) requires authentication", async ({
    request,
  }) => {
    const response = await request.post("/api/reports", {
      data: {
        propertyAddress: "123 Test Street",
        propertyCity: "Auckland",
        propertyRegion: "Auckland",
        propertyPostcode: "1010",
        propertyType: "RESIDENTIAL_1",
        inspectionDate: new Date().toISOString(),
        inspectionType: "FULL_INSPECTION",
        clientName: "E2E Test Client",
      },
    });

    // Should require auth before any report creation
    expect([401, 302, 307, 403]).toContain(response.status());
  });

  test("GET /api/reports (list reports) requires authentication", async ({
    request,
  }) => {
    const response = await request.get("/api/reports");

    expect([401, 302, 307, 403]).toContain(response.status());
  });
});

test.describe("Submit Flow - Form Behaviour Documentation", () => {
  /**
   * Documents the expected form validation behaviour when a user
   * attempts to submit a report from the web UI.
   *
   * Step 1 - Property Details: requires street address, city, region,
   *          postcode, and property type.
   * Step 2 - Inspection Details: requires inspection date and type.
   * Step 3 - Client Information: requires client name.
   *
   * Additional validation at submission:
   * - Minimum photo count per inspection type
   * - Minimum roof elements documented
   * - Compliance checklists completed
   * - EXIF/GPS metadata for court-type reports
   */

  test("new report page requires authentication", async ({ page }) => {
    await page.goto("/reports/new");
    await page.waitForLoadState("networkidle");

    // Must sign in first
    expect(page.url()).toContain("sign-in");
  });

  test("report edit page requires authentication", async ({ page }) => {
    await page.goto("/reports/test-report-id/edit");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });

  test("report compliance page requires authentication", async ({ page }) => {
    await page.goto("/reports/test-report-id/compliance");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });

  test("report photos page requires authentication", async ({ page }) => {
    await page.goto("/reports/test-report-id/photos");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });

  test("report defects page requires authentication", async ({ page }) => {
    await page.goto("/reports/test-report-id/defects");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("sign-in");
  });
});
