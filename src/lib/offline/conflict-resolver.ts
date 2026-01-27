/**
 * Conflict Resolver
 *
 * Handles detection and resolution of sync conflicts
 * between local and server data
 */

import { db } from "./db";
import { reportStore } from "./stores/report-store";
import type {
  ConflictInfo,
  ConflictResolution,
  OfflineReport,
} from "./types";

/**
 * Detect conflicts between local and server reports
 */
export async function detectConflicts(
  localReport: OfflineReport,
  serverReport: Partial<OfflineReport>
): Promise<ConflictInfo[]> {
  const conflicts: ConflictInfo[] = [];

  // Fields to check for conflicts
  const fieldsToCheck: (keyof OfflineReport)[] = [
    "status",
    "propertyAddress",
    "propertyCity",
    "propertyRegion",
    "propertyPostcode",
    "propertyType",
    "inspectionDate",
    "inspectionType",
    "weatherConditions",
    "accessMethod",
    "limitations",
    "clientName",
    "clientEmail",
    "clientPhone",
    "scopeOfWorks",
    "methodology",
    "findings",
    "conclusions",
    "recommendations",
    "declarationSigned",
  ];

  for (const field of fieldsToCheck) {
    const localValue = localReport[field];
    const serverValue = serverReport[field];

    // Skip if server doesn't have this field
    if (serverValue === undefined) continue;

    // Check if values differ
    if (!deepEqual(localValue, serverValue)) {
      conflicts.push({
        reportId: localReport.id,
        field,
        localValue,
        serverValue,
        localUpdatedAt: localReport.localUpdatedAt,
        serverUpdatedAt: serverReport.serverUpdatedAt || "",
      });
    }
  }

  return conflicts;
}

/**
 * Resolve a conflict for a specific report
 */
export async function resolveConflict(
  reportId: string,
  resolution: ConflictResolution
): Promise<void> {
  const report = await reportStore.getReport(reportId);

  if (!report) {
    throw new Error(`Report ${reportId} not found`);
  }

  if (report.syncStatus !== "conflict") {
    throw new Error(`Report ${reportId} is not in conflict state`);
  }

  switch (resolution) {
    case "keep_local":
      // Mark as pending to re-upload local version
      await reportStore.updateReportSyncStatus(reportId, "pending");
      break;

    case "keep_server":
      // Fetch latest from server and overwrite local
      await fetchAndReplaceReport(reportId);
      break;

    case "merge":
      // For now, merge just keeps local version
      // A more sophisticated merge could be implemented later
      await reportStore.updateReportSyncStatus(reportId, "pending");
      break;
  }
}

/**
 * Fetch a report from the server and replace local version
 */
async function fetchAndReplaceReport(reportId: string): Promise<void> {
  const response = await fetch(`/api/reports/${reportId}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch report: ${response.status}`);
  }

  const serverReport = await response.json();

  // Update local report with server data
  await db.reports.update(reportId, {
    ...serverReport,
    localUpdatedAt: new Date().toISOString(),
    serverUpdatedAt: serverReport.updatedAt,
    syncStatus: "synced",
  });
}

/**
 * Get all reports with conflicts
 */
export async function getConflictReports(): Promise<OfflineReport[]> {
  return reportStore.getConflictReports();
}

/**
 * Get conflict count
 */
export async function getConflictCount(): Promise<number> {
  return db.reports.where("syncStatus").equals("conflict").count();
}

/**
 * Batch resolve all conflicts with the same resolution
 */
export async function batchResolveConflicts(
  resolution: ConflictResolution
): Promise<number> {
  const conflictReports = await getConflictReports();

  for (const report of conflictReports) {
    await resolveConflict(report.id, resolution);
  }

  return conflictReports.length;
}

/**
 * Auto-resolve conflicts based on timestamps
 * Server wins if newer, local wins if newer
 */
export async function autoResolveConflicts(): Promise<{
  resolved: number;
  serverWins: number;
  localWins: number;
}> {
  const conflictReports = await getConflictReports();

  let serverWins = 0;
  let localWins = 0;

  for (const report of conflictReports) {
    const localTime = new Date(report.localUpdatedAt).getTime();
    const serverTime = report.serverUpdatedAt
      ? new Date(report.serverUpdatedAt).getTime()
      : 0;

    if (serverTime > localTime) {
      await resolveConflict(report.id, "keep_server");
      serverWins++;
    } else {
      await resolveConflict(report.id, "keep_local");
      localWins++;
    }
  }

  return {
    resolved: conflictReports.length,
    serverWins,
    localWins,
  };
}

/**
 * Deep equality check for conflict detection
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;

  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
  }

  // For dates, compare timestamps
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  return false;
}

/**
 * Create a merged version of conflicting reports
 * Takes the most recent value for each field
 */
export function createMergedReport(
  local: OfflineReport,
  server: Partial<OfflineReport>
): OfflineReport {
  const localTime = new Date(local.localUpdatedAt).getTime();
  const serverTime = server.serverUpdatedAt
    ? new Date(server.serverUpdatedAt).getTime()
    : 0;

  // Start with local as base
  const merged = { ...local };

  // If server is newer overall, use server values for most fields
  if (serverTime > localTime) {
    const serverFields: (keyof OfflineReport)[] = [
      "status",
      "propertyAddress",
      "propertyCity",
      "propertyRegion",
      "propertyPostcode",
      "propertyType",
      "inspectionDate",
      "inspectionType",
      "weatherConditions",
      "accessMethod",
      "limitations",
      "clientName",
      "clientEmail",
      "clientPhone",
    ];

    for (const field of serverFields) {
      if (server[field] !== undefined) {
        (merged as Record<string, unknown>)[field] = server[field];
      }
    }
  }

  // Always merge content fields (combine local and server observations)
  // This is a simple approach - a more sophisticated merge could be implemented

  merged.localUpdatedAt = new Date().toISOString();
  merged.syncStatus = "pending"; // Needs to be re-synced

  return merged;
}
