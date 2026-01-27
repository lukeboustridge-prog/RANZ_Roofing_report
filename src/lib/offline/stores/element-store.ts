/**
 * Element Store
 *
 * CRUD operations for offline roof elements in IndexedDB
 */

import { db } from "../db";
import type {
  OfflineRoofElement,
  ElementType,
  ConditionRating,
  SyncStatus,
} from "../types";

/**
 * Generate a unique element ID
 */
function generateId(): string {
  return `element_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a new offline roof element
 */
export async function createElement(data: {
  reportId: string;
  elementType: ElementType;
  location: string;
  claddingType?: string | null;
  claddingProfile?: string | null;
  material?: string | null;
  manufacturer?: string | null;
  colour?: string | null;
  pitch?: number | null;
  area?: number | null;
  ageYears?: number | null;
  conditionRating?: ConditionRating | null;
  conditionNotes?: string | null;
  meetsCop?: boolean | null;
  meetsE2?: boolean | null;
}): Promise<OfflineRoofElement> {
  const now = new Date().toISOString();
  const id = generateId();

  const element: OfflineRoofElement = {
    id,
    reportId: data.reportId,
    elementType: data.elementType,
    location: data.location,
    claddingType: data.claddingType ?? null,
    claddingProfile: data.claddingProfile ?? null,
    material: data.material ?? null,
    manufacturer: data.manufacturer ?? null,
    colour: data.colour ?? null,
    pitch: data.pitch ?? null,
    area: data.area ?? null,
    ageYears: data.ageYears ?? null,
    conditionRating: data.conditionRating ?? null,
    conditionNotes: data.conditionNotes ?? null,
    meetsCop: data.meetsCop ?? null,
    meetsE2: data.meetsE2 ?? null,
    localCreatedAt: now,
    localUpdatedAt: now,
    syncStatus: "pending",
  };

  await db.elements.add(element);
  return element;
}

/**
 * Get an element by ID
 */
export async function getElement(
  id: string
): Promise<OfflineRoofElement | undefined> {
  return db.elements.get(id);
}

/**
 * Get all elements for a report
 */
export async function getElementsByReport(
  reportId: string
): Promise<OfflineRoofElement[]> {
  return db.elements
    .where("reportId")
    .equals(reportId)
    .filter((e) => !e._deleted)
    .toArray();
}

/**
 * Get elements by type for a report
 */
export async function getElementsByType(
  reportId: string,
  elementType: ElementType
): Promise<OfflineRoofElement[]> {
  return db.elements
    .where(["reportId", "elementType"])
    .equals([reportId, elementType])
    .filter((e) => !e._deleted)
    .toArray();
}

/**
 * Get elements with poor or critical condition
 */
export async function getElementsWithIssues(
  reportId: string
): Promise<OfflineRoofElement[]> {
  return db.elements
    .where("reportId")
    .equals(reportId)
    .filter(
      (e) =>
        !e._deleted &&
        (e.conditionRating === "POOR" || e.conditionRating === "CRITICAL")
    )
    .toArray();
}

/**
 * Get elements pending sync
 */
export async function getPendingElements(): Promise<OfflineRoofElement[]> {
  return db.elements.where("syncStatus").anyOf(["pending", "error"]).toArray();
}

/**
 * Update an element
 */
export async function updateElement(
  id: string,
  updates: Partial<
    Omit<OfflineRoofElement, "id" | "reportId" | "localCreatedAt">
  >
): Promise<void> {
  const now = new Date().toISOString();
  await db.elements.update(id, {
    ...updates,
    localUpdatedAt: now,
    syncStatus: "pending",
  });
}

/**
 * Update element sync status
 */
export async function updateElementSyncStatus(
  id: string,
  syncStatus: SyncStatus
): Promise<void> {
  await db.elements.update(id, { syncStatus });
}

/**
 * Soft delete an element
 */
export async function deleteElement(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.elements.update(id, {
    _deleted: true,
    localUpdatedAt: now,
    syncStatus: "pending",
  });
}

/**
 * Hard delete an element (use with caution)
 */
export async function hardDeleteElement(id: string): Promise<void> {
  // Update defects that reference this element
  const defects = await db.defects
    .filter((d) => d.roofElementId === id)
    .toArray();

  for (const defect of defects) {
    await db.defects.update(defect.id, {
      roofElementId: null,
      localUpdatedAt: new Date().toISOString(),
      syncStatus: "pending",
    });
  }

  // Update photos that reference this element
  const photos = await db.photos
    .filter((p) => p.roofElementId === id)
    .toArray();

  for (const photo of photos) {
    await db.photos.update(photo.id, {
      roofElementId: null,
      localUpdatedAt: new Date().toISOString(),
    });
  }

  await db.elements.delete(id);
}

/**
 * Delete all elements for a report
 */
export async function deleteElementsByReport(reportId: string): Promise<void> {
  await db.elements.where("reportId").equals(reportId).delete();
}

/**
 * Get element count for a report
 */
export async function getElementCountForReport(reportId: string): Promise<number> {
  return db.elements
    .where("reportId")
    .equals(reportId)
    .filter((e) => !e._deleted)
    .count();
}

/**
 * Get element summary for a report
 */
export async function getElementSummary(reportId: string): Promise<{
  total: number;
  byType: Record<ElementType, number>;
  byCondition: Record<ConditionRating, number>;
}> {
  const elements = await db.elements
    .where("reportId")
    .equals(reportId)
    .filter((e) => !e._deleted)
    .toArray();

  const byType: Record<ElementType, number> = {
    ROOF_CLADDING: 0,
    RIDGE: 0,
    VALLEY: 0,
    HIP: 0,
    BARGE: 0,
    FASCIA: 0,
    GUTTER: 0,
    DOWNPIPE: 0,
    FLASHING_WALL: 0,
    FLASHING_PENETRATION: 0,
    FLASHING_PARAPET: 0,
    SKYLIGHT: 0,
    VENT: 0,
    ANTENNA_MOUNT: 0,
    SOLAR_PANEL: 0,
    UNDERLAY: 0,
    INSULATION: 0,
    ROOF_STRUCTURE: 0,
    OTHER: 0,
  };

  const byCondition: Record<ConditionRating, number> = {
    GOOD: 0,
    FAIR: 0,
    POOR: 0,
    CRITICAL: 0,
    NOT_INSPECTED: 0,
  };

  for (const element of elements) {
    byType[element.elementType]++;
    if (element.conditionRating) {
      byCondition[element.conditionRating]++;
    }
  }

  return {
    total: elements.length,
    byType,
    byCondition,
  };
}

/**
 * Check if element has associated defects
 */
export async function hasDefects(elementId: string): Promise<boolean> {
  const count = await db.defects
    .filter((d) => d.roofElementId === elementId && !d._deleted)
    .count();
  return count > 0;
}

/**
 * Import element from server
 */
export async function importElementFromServer(
  serverElement: Partial<OfflineRoofElement> & { id: string; reportId: string }
): Promise<void> {
  const existing = await db.elements.get(serverElement.id);

  if (existing) {
    await db.elements.update(serverElement.id, {
      ...serverElement,
      syncStatus: "synced",
    });
  } else {
    const now = new Date().toISOString();
    await db.elements.add({
      ...serverElement,
      localCreatedAt: serverElement.localCreatedAt ?? now,
      localUpdatedAt: serverElement.localUpdatedAt ?? now,
      syncStatus: "synced",
    } as OfflineRoofElement);
  }
}

export const elementStore = {
  createElement,
  getElement,
  getElementsByReport,
  getElementsByType,
  getElementsWithIssues,
  getPendingElements,
  updateElement,
  updateElementSyncStatus,
  deleteElement,
  hardDeleteElement,
  deleteElementsByReport,
  getElementCountForReport,
  getElementSummary,
  hasDefects,
  importElementFromServer,
};
