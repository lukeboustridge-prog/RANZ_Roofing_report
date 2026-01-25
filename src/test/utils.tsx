import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Test Utilities
 * Helpers for testing React components
 */

// Wrapper component for providers
function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Custom render function that wraps components with necessary providers
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
}

/**
 * Create a mock fetch response
 */
export function mockFetchResponse<T>(data: T, options?: Partial<Response>) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    ...options,
  } as Response);
}

/**
 * Create a mock fetch error response
 */
export function mockFetchError(
  message: string,
  status: number = 500
): Promise<Response> {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(JSON.stringify({ error: message })),
  } as Response);
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 1000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Create mock report data for tests
 */
export function createMockReport(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-report-id",
    reportNumber: "RANZ-2025-00001",
    status: "DRAFT",
    propertyAddress: "123 Test Street",
    propertyCity: "Auckland",
    propertyRegion: "Auckland",
    propertyPostcode: "1010",
    propertyType: "RESIDENTIAL_1",
    inspectionDate: new Date("2025-01-15"),
    inspectionType: "FULL_INSPECTION",
    clientName: "Test Client",
    clientEmail: "client@test.com",
    inspectorId: "test-inspector-id",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock user data for tests
 */
export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-user-id",
    clerkId: "clerk-test-id",
    email: "test@example.com",
    name: "Test User",
    role: "INSPECTOR",
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock defect data for tests
 */
export function createMockDefect(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-defect-id",
    reportId: "test-report-id",
    defectNumber: 1,
    title: "Test Defect",
    description: "This is a test defect description",
    location: "North elevation",
    classification: "MINOR_DEFECT",
    severity: "MEDIUM",
    observation: "Test observation",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock photo data for tests
 */
export function createMockPhoto(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-photo-id",
    reportId: "test-report-id",
    filename: "test-photo.jpg",
    originalFilename: "original.jpg",
    mimeType: "image/jpeg",
    fileSize: 1024000,
    url: "https://example.com/photos/test.jpg",
    thumbnailUrl: "https://example.com/photos/test-thumb.jpg",
    photoType: "DETAIL",
    originalHash: "abc123hash",
    hashVerified: true,
    sortOrder: 1,
    createdAt: new Date(),
    uploadedAt: new Date(),
    ...overrides,
  };
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { userEvent };

// Use custom render as default
export { customRender as render };
