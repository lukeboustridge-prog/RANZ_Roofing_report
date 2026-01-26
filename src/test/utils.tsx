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

/**
 * Create mock LBP complaint data for tests
 */
export function createMockLBPComplaint(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-complaint-id",
    complaintNumber: "RANZ-LBP-2025-00001",
    reportId: "test-report-id",
    status: "DRAFT",
    workAddress: "123 Test Street",
    workCity: "Auckland",
    workStartDate: new Date("2024-06-15"),
    workDescription: "Roof installation work",
    conductDescription: "Description of conduct issues",
    evidenceSummary: "Summary of evidence",
    groundsForDiscipline: ["NEGLIGENCE", "INCOMPETENCE"],
    subjectLbpNumber: "BP123456",
    subjectLbpName: "Test Builder",
    subjectLbpLicenseTypes: ["ROOFING"],
    complainantName: "Roofing Association of New Zealand",
    complainantAddress: "PO Box 12345, Auckland",
    complainantPhone: "+64 9 123 4567",
    complainantEmail: "admin@ranz.org.nz",
    complainantRelation: "Industry body representing roofing professionals",
    preparedBy: "admin-user-id",
    preparedByName: "Admin User",
    preparedByEmail: "admin@ranz.org.nz",
    attachedPhotoIds: ["photo-1", "photo-2"],
    attachedDefectIds: ["defect-1"],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock roof element data for tests
 */
export function createMockRoofElement(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-element-id",
    reportId: "test-report-id",
    elementType: "ROOF_CLADDING",
    location: "Main roof - North elevation",
    claddingType: "Corrugated",
    claddingProfile: "Corrugate",
    material: "Steel",
    manufacturer: "Steel & Tube",
    colour: "Grey Friars",
    pitch: 15.0,
    area: 120.5,
    ageYears: 5,
    conditionRating: "FAIR",
    conditionNotes: "Minor surface corrosion observed",
    meetsCop: true,
    meetsE2: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock compliance assessment data for tests
 */
export function createMockComplianceAssessment(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-compliance-id",
    reportId: "test-report-id",
    assessmentType: "E2_EXTERNAL_MOISTURE",
    overallCompliance: "COMPLIANT",
    checklistData: {
      items: [
        { id: "1", description: "Roof pitch meets minimum", compliant: true },
        { id: "2", description: "Flashings properly installed", compliant: true },
      ],
    },
    notes: "All E2 requirements met",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { userEvent };

// Use custom render as default
export { customRender as render };
