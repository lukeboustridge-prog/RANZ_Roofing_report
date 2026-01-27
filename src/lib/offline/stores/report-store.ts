/**
 * Report Store
 *
 * CRUD operations for offline reports in IndexedDB
 */

import { db } from "../db";
import type {
  OfflineReport,
  ReportStatus,
  SyncStatus,
  InspectionType,
  PropertyType,
} from "../types";

/**
 * Generate a unique report ID (CUID-like)
 */
function generateId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate report number in RANZ format
 */
export function generateReportNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `RANZ-${year}-${random}`;
}

/**
 * Create a new offline report
 */
export async function createReport(
  data: Omit<
    OfflineReport,
    | "id"
    | "reportNumber"
    | "localCreatedAt"
    | "localUpdatedAt"
    | "syncStatus"
  >
): Promise<OfflineReport> {
  const now = new Date().toISOString();
  const report: OfflineReport = {
    ...data,
    id: generateId(),
    reportNumber: generateReportNumber(),
    localCreatedAt: now,
    localUpdatedAt: now,
    syncStatus: "pending",
  };

  await db.reports.add(report);
  return report;
}

/**
 * Get a report by ID
 */
export async function getReport(id: string): Promise<OfflineReport | undefined> {
  return db.reports.get(id);
}

/**
 * Get a report by report number
 */
export async function getReportByNumber(
  reportNumber: string
): Promise<OfflineReport | undefined> {
  return db.reports.where("reportNumber").equals(reportNumber).first();
}

/**
 * Get all reports
 */
export async function getAllReports(): Promise<OfflineReport[]> {
  return db.reports.orderBy("localUpdatedAt").reverse().toArray();
}

/**
 * Get reports by status
 */
export async function getReportsByStatus(
  status: ReportStatus
): Promise<OfflineReport[]> {
  return db.reports
    .where("status")
    .equals(status)
    .reverse()
    .sortBy("localUpdatedAt");
}

/**
 * Get reports by sync status
 */
export async function getReportsBySyncStatus(
  syncStatus: SyncStatus
): Promise<OfflineReport[]> {
  return db.reports.where("syncStatus").equals(syncStatus).toArray();
}

/**
 * Get pending sync reports
 */
export async function getPendingReports(): Promise<OfflineReport[]> {
  return db.reports.where("syncStatus").anyOf(["pending", "error"]).toArray();
}

/**
 * Get reports with conflicts
 */
export async function getConflictReports(): Promise<OfflineReport[]> {
  return db.reports.where("syncStatus").equals("conflict").toArray();
}

/**
 * Update a report
 */
export async function updateReport(
  id: string,
  updates: Partial<Omit<OfflineReport, "id" | "reportNumber" | "localCreatedAt">>
): Promise<void> {
  const now = new Date().toISOString();
  await db.reports.update(id, {
    ...updates,
    localUpdatedAt: now,
    syncStatus: "pending", // Mark as needing sync
  });
}

/**
 * Update report sync status
 */
export async function updateReportSyncStatus(
  id: string,
  syncStatus: SyncStatus,
  serverUpdatedAt?: string,
  syncError?: string
): Promise<void> {
  await db.reports.update(id, {
    syncStatus,
    serverUpdatedAt: serverUpdatedAt ?? undefined,
    lastSyncAttempt: new Date().toISOString(),
    syncError: syncError ?? null,
  });
}

/**
 * Update report status
 */
export async function updateReportStatus(
  id: string,
  status: ReportStatus
): Promise<void> {
  await updateReport(id, { status });
}

/**
 * Delete a report and all associated data
 */
export async function deleteReport(id: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.reports, db.photos, db.defects, db.elements, db.compliance],
    async () => {
      // Delete associated data first
      await db.photos.where("reportId").equals(id).delete();
      await db.defects.where("reportId").equals(id).delete();
      await db.elements.where("reportId").equals(id).delete();
      await db.compliance.where("reportId").equals(id).delete();

      // Delete the report
      await db.reports.delete(id);
    }
  );
}

/**
 * Get report with all related data
 */
export async function getReportWithRelations(id: string): Promise<{
  report: OfflineReport | undefined;
  photos: import("../types").OfflinePhoto[];
  defects: import("../types").OfflineDefect[];
  elements: import("../types").OfflineRoofElement[];
  compliance: import("../types").OfflineComplianceAssessment | undefined;
} | null> {
  const report = await db.reports.get(id);
  if (!report) return null;

  const [photos, defects, elements, compliance] = await Promise.all([
    db.photos.where("reportId").equals(id).toArray(),
    db.defects.where("reportId").equals(id).sortBy("defectNumber"),
    db.elements.where("reportId").equals(id).toArray(),
    db.compliance.where("reportId").equals(id).first(),
  ]);

  return { report, photos, defects, elements, compliance };
}

/**
 * Search reports by address
 */
export async function searchReportsByAddress(
  query: string
): Promise<OfflineReport[]> {
  const lowerQuery = query.toLowerCase();
  return db.reports
    .filter(
      (report) =>
        report.propertyAddress.toLowerCase().includes(lowerQuery) ||
        report.propertyCity.toLowerCase().includes(lowerQuery)
    )
    .toArray();
}

/**
 * Get recent reports (last N)
 */
export async function getRecentReports(limit: number = 10): Promise<OfflineReport[]> {
  return db.reports.orderBy("localUpdatedAt").reverse().limit(limit).toArray();
}

/**
 * Count reports by status
 */
export async function countReportsByStatus(): Promise<Record<ReportStatus, number>> {
  const statuses: ReportStatus[] = [
    "DRAFT",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "UNDER_REVIEW",
    "REVISION_REQUIRED",
    "APPROVED",
    "FINALISED",
    "ARCHIVED",
  ];

  const counts: Record<ReportStatus, number> = {} as Record<ReportStatus, number>;

  for (const status of statuses) {
    counts[status] = await db.reports.where("status").equals(status).count();
  }

  return counts;
}

/**
 * Mark all pending reports as needing sync
 */
export async function markAllPendingForSync(): Promise<number> {
  const draftAndInProgress = await db.reports
    .where("status")
    .anyOf(["DRAFT", "IN_PROGRESS"])
    .toArray();

  for (const report of draftAndInProgress) {
    if (report.syncStatus === "synced") {
      await db.reports.update(report.id, { syncStatus: "pending" });
    }
  }

  return draftAndInProgress.length;
}

/**
 * Import a report from server (bootstrap/sync)
 */
export async function importReportFromServer(
  serverReport: Partial<OfflineReport> & { id: string }
): Promise<void> {
  const existing = await db.reports.get(serverReport.id);

  if (existing) {
    // Update if server version is newer
    if (
      serverReport.serverUpdatedAt &&
      (!existing.serverUpdatedAt ||
        new Date(serverReport.serverUpdatedAt) > new Date(existing.serverUpdatedAt))
    ) {
      await db.reports.update(serverReport.id, {
        ...serverReport,
        syncStatus: "synced",
      });
    }
  } else {
    // Create new
    const now = new Date().toISOString();
    await db.reports.add({
      ...serverReport,
      localCreatedAt: serverReport.localCreatedAt ?? now,
      localUpdatedAt: serverReport.localUpdatedAt ?? now,
      syncStatus: "synced",
    } as OfflineReport);
  }
}

export const reportStore = {
  generateReportNumber,
  createReport,
  getReport,
  getReportByNumber,
  getAllReports,
  getReportsByStatus,
  getReportsBySyncStatus,
  getPendingReports,
  getConflictReports,
  updateReport,
  updateReportSyncStatus,
  updateReportStatus,
  deleteReport,
  getReportWithRelations,
  searchReportsByAddress,
  getRecentReports,
  countReportsByStatus,
  markAllPendingForSync,
  importReportFromServer,
};
