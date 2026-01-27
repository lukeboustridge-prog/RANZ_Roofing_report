/**
 * Defect Store
 *
 * CRUD operations for offline defects in IndexedDB
 */

import { db } from "../db";
import type {
  OfflineDefect,
  DefectClass,
  DefectSeverity,
  PriorityLevel,
  SyncStatus,
} from "../types";

/**
 * Generate a unique defect ID
 */
function generateId(): string {
  return `defect_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get the next defect number for a report
 */
async function getNextDefectNumber(reportId: string): Promise<number> {
  const defects = await db.defects.where("reportId").equals(reportId).toArray();
  if (defects.length === 0) return 1;
  return Math.max(...defects.map((d) => d.defectNumber)) + 1;
}

/**
 * Create a new offline defect
 */
export async function createDefect(data: {
  reportId: string;
  roofElementId?: string | null;
  title: string;
  description: string;
  location: string;
  classification: DefectClass;
  severity: DefectSeverity;
  observation: string;
  analysis?: string | null;
  opinion?: string | null;
  codeReference?: string | null;
  copReference?: string | null;
  probableCause?: string | null;
  contributingFactors?: string | null;
  recommendation?: string | null;
  priorityLevel?: PriorityLevel | null;
  estimatedCost?: string | null;
  measurements?: Record<string, unknown> | null;
}): Promise<OfflineDefect> {
  const now = new Date().toISOString();
  const id = generateId();
  const defectNumber = await getNextDefectNumber(data.reportId);

  const defect: OfflineDefect = {
    id,
    reportId: data.reportId,
    roofElementId: data.roofElementId ?? null,
    defectNumber,
    title: data.title,
    description: data.description,
    location: data.location,
    classification: data.classification,
    severity: data.severity,
    observation: data.observation,
    analysis: data.analysis ?? null,
    opinion: data.opinion ?? null,
    codeReference: data.codeReference ?? null,
    copReference: data.copReference ?? null,
    probableCause: data.probableCause ?? null,
    contributingFactors: data.contributingFactors ?? null,
    recommendation: data.recommendation ?? null,
    priorityLevel: data.priorityLevel ?? null,
    estimatedCost: data.estimatedCost ?? null,
    measurements: data.measurements ?? null,
    localCreatedAt: now,
    localUpdatedAt: now,
    syncStatus: "pending",
  };

  await db.defects.add(defect);
  return defect;
}

/**
 * Get a defect by ID
 */
export async function getDefect(id: string): Promise<OfflineDefect | undefined> {
  return db.defects.get(id);
}

/**
 * Get all defects for a report
 */
export async function getDefectsByReport(reportId: string): Promise<OfflineDefect[]> {
  return db.defects
    .where("reportId")
    .equals(reportId)
    .filter((d) => !d._deleted)
    .sortBy("defectNumber");
}

/**
 * Get defects by severity
 */
export async function getDefectsBySeverity(
  reportId: string,
  severity: DefectSeverity
): Promise<OfflineDefect[]> {
  return db.defects
    .where(["reportId", "severity"])
    .equals([reportId, severity])
    .filter((d) => !d._deleted)
    .sortBy("defectNumber");
}

/**
 * Get defects for a roof element
 */
export async function getDefectsByElement(
  roofElementId: string
): Promise<OfflineDefect[]> {
  return db.defects
    .filter((d) => d.roofElementId === roofElementId && !d._deleted)
    .sortBy("defectNumber");
}

/**
 * Get critical defects for a report
 */
export async function getCriticalDefects(reportId: string): Promise<OfflineDefect[]> {
  return db.defects
    .where("reportId")
    .equals(reportId)
    .filter((d) => d.severity === "CRITICAL" && !d._deleted)
    .toArray();
}

/**
 * Get defects pending sync
 */
export async function getPendingDefects(): Promise<OfflineDefect[]> {
  return db.defects.where("syncStatus").anyOf(["pending", "error"]).toArray();
}

/**
 * Update a defect
 */
export async function updateDefect(
  id: string,
  updates: Partial<
    Omit<OfflineDefect, "id" | "reportId" | "defectNumber" | "localCreatedAt">
  >
): Promise<void> {
  const now = new Date().toISOString();
  await db.defects.update(id, {
    ...updates,
    localUpdatedAt: now,
    syncStatus: "pending",
  });
}

/**
 * Update defect sync status
 */
export async function updateDefectSyncStatus(
  id: string,
  syncStatus: SyncStatus
): Promise<void> {
  await db.defects.update(id, { syncStatus });
}

/**
 * Soft delete a defect
 */
export async function deleteDefect(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.defects.update(id, {
    _deleted: true,
    localUpdatedAt: now,
    syncStatus: "pending",
  });
}

/**
 * Hard delete a defect (use with caution)
 */
export async function hardDeleteDefect(id: string): Promise<void> {
  // Also delete associated photos
  await db.photos.where("defectId").equals(id).delete();
  await db.defects.delete(id);
}

/**
 * Delete all defects for a report
 */
export async function deleteDefectsByReport(reportId: string): Promise<void> {
  const defects = await db.defects.where("reportId").equals(reportId).toArray();
  for (const defect of defects) {
    await db.photos.where("defectId").equals(defect.id).delete();
  }
  await db.defects.where("reportId").equals(reportId).delete();
}

/**
 * Renumber defects after deletion
 */
export async function renumberDefects(reportId: string): Promise<void> {
  const defects = await db.defects
    .where("reportId")
    .equals(reportId)
    .filter((d) => !d._deleted)
    .sortBy("defectNumber");

  await db.transaction("rw", db.defects, async () => {
    for (let i = 0; i < defects.length; i++) {
      if (defects[i].defectNumber !== i + 1) {
        await db.defects.update(defects[i].id, {
          defectNumber: i + 1,
          localUpdatedAt: new Date().toISOString(),
          syncStatus: "pending",
        });
      }
    }
  });
}

/**
 * Get defect count for a report
 */
export async function getDefectCountForReport(reportId: string): Promise<number> {
  return db.defects
    .where("reportId")
    .equals(reportId)
    .filter((d) => !d._deleted)
    .count();
}

/**
 * Get defect summary for a report
 */
export async function getDefectSummary(reportId: string): Promise<{
  total: number;
  bySeverity: Record<DefectSeverity, number>;
  byClassification: Record<DefectClass, number>;
}> {
  const defects = await db.defects
    .where("reportId")
    .equals(reportId)
    .filter((d) => !d._deleted)
    .toArray();

  const bySeverity: Record<DefectSeverity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  const byClassification: Record<DefectClass, number> = {
    MAJOR_DEFECT: 0,
    MINOR_DEFECT: 0,
    SAFETY_HAZARD: 0,
    MAINTENANCE_ITEM: 0,
    WORKMANSHIP_ISSUE: 0,
  };

  for (const defect of defects) {
    bySeverity[defect.severity]++;
    byClassification[defect.classification]++;
  }

  return {
    total: defects.length,
    bySeverity,
    byClassification,
  };
}

/**
 * Import defect from server
 */
export async function importDefectFromServer(
  serverDefect: Partial<OfflineDefect> & { id: string; reportId: string }
): Promise<void> {
  const existing = await db.defects.get(serverDefect.id);

  if (existing) {
    await db.defects.update(serverDefect.id, {
      ...serverDefect,
      syncStatus: "synced",
    });
  } else {
    const now = new Date().toISOString();
    await db.defects.add({
      ...serverDefect,
      localCreatedAt: serverDefect.localCreatedAt ?? now,
      localUpdatedAt: serverDefect.localUpdatedAt ?? now,
      syncStatus: "synced",
    } as OfflineDefect);
  }
}

export const defectStore = {
  createDefect,
  getDefect,
  getDefectsByReport,
  getDefectsBySeverity,
  getDefectsByElement,
  getCriticalDefects,
  getPendingDefects,
  updateDefect,
  updateDefectSyncStatus,
  deleteDefect,
  hardDeleteDefect,
  deleteDefectsByReport,
  renumberDefects,
  getDefectCountForReport,
  getDefectSummary,
  importDefectFromServer,
};
