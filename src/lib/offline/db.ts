/**
 * RANZ Offline Database
 *
 * Dexie IndexedDB wrapper for offline-first functionality
 * Provides local storage for reports, photos, defects, and sync queue
 */

import Dexie, { type Table } from "dexie";
import type {
  OfflineReport,
  OfflinePhoto,
  OfflineDefect,
  OfflineRoofElement,
  OfflineComplianceAssessment,
  SyncQueueItem,
  OfflineMetadata,
  OfflineChecklist,
  OfflineTemplate,
} from "./types";

/**
 * RANZ Offline Database Schema
 *
 * IndexedDB provides:
 * - Persistent storage (survives browser close)
 * - Large storage capacity (GB of data)
 * - Blob storage for photos
 * - Indexed queries for fast lookups
 */
class RanzOfflineDatabase extends Dexie {
  // Tables
  reports!: Table<OfflineReport>;
  photos!: Table<OfflinePhoto>;
  defects!: Table<OfflineDefect>;
  elements!: Table<OfflineRoofElement>;
  compliance!: Table<OfflineComplianceAssessment>;
  syncQueue!: Table<SyncQueueItem>;
  metadata!: Table<OfflineMetadata>;
  checklists!: Table<OfflineChecklist>;
  templates!: Table<OfflineTemplate>;

  constructor() {
    super("ranz-offline");

    // Schema version 1
    this.version(1).stores({
      // Reports table - main inspection reports
      // Indexed by: id (primary), reportNumber, status, syncStatus, localUpdatedAt
      reports: "id, reportNumber, status, syncStatus, localUpdatedAt, inspectionDate",

      // Photos table - photo blobs and metadata
      // Indexed by: id (primary), reportId, syncStatus, defectId, roofElementId
      photos: "id, reportId, syncStatus, defectId, roofElementId, capturedAt",

      // Defects table - identified defects
      // Indexed by: id (primary), reportId, syncStatus, severity
      defects: "id, reportId, syncStatus, severity, defectNumber",

      // Elements table - roof elements
      // Indexed by: id (primary), reportId, syncStatus, elementType
      elements: "id, reportId, syncStatus, elementType",

      // Compliance assessments
      // Indexed by: id (primary), reportId
      compliance: "id, reportId, syncStatus",

      // Sync queue - pending operations
      // Indexed by: id (primary), type, createdAt, priority
      syncQueue: "id, type, createdAt, priority, entityId",

      // Metadata - key-value store for settings
      // Primary key: key
      metadata: "key",

      // Cached checklists from server
      checklists: "id, category, name",

      // Cached templates from server
      templates: "id, inspectionType, isDefault",
    });

    // Future schema migrations would go here
    // this.version(2).stores({...}).upgrade(...)
  }

  /**
   * Clear all offline data
   * Use with caution - this deletes everything!
   */
  async clearAll(): Promise<void> {
    await this.transaction(
      "rw",
      [
        this.reports,
        this.photos,
        this.defects,
        this.elements,
        this.compliance,
        this.syncQueue,
        this.metadata,
        this.checklists,
        this.templates,
      ],
      async () => {
        await this.reports.clear();
        await this.photos.clear();
        await this.defects.clear();
        await this.elements.clear();
        await this.compliance.clear();
        await this.syncQueue.clear();
        await this.metadata.clear();
        await this.checklists.clear();
        await this.templates.clear();
      }
    );
  }

  /**
   * Get database storage usage estimate
   */
  async getStorageEstimate(): Promise<{
    usage: number;
    quota: number;
    percentUsed: number;
  }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      return {
        usage,
        quota,
        percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
      };
    }
    return { usage: 0, quota: 0, percentUsed: 0 };
  }

  /**
   * Get counts of all stored items
   */
  async getCounts(): Promise<{
    reports: number;
    photos: number;
    defects: number;
    elements: number;
    pendingSync: number;
  }> {
    const [reports, photos, defects, elements, pendingSync] = await Promise.all([
      this.reports.count(),
      this.photos.count(),
      this.defects.count(),
      this.elements.count(),
      this.syncQueue.count(),
    ]);

    return { reports, photos, defects, elements, pendingSync };
  }

  /**
   * Get all pending sync items count by status
   */
  async getSyncStatusCounts(): Promise<{
    pending: number;
    synced: number;
    conflict: number;
    error: number;
  }> {
    const [pending, synced, conflict, error] = await Promise.all([
      this.reports.where("syncStatus").equals("pending").count(),
      this.reports.where("syncStatus").equals("synced").count(),
      this.reports.where("syncStatus").equals("conflict").count(),
      this.reports.where("syncStatus").equals("error").count(),
    ]);

    return { pending, synced, conflict, error };
  }

  /**
   * Get pending photo upload count
   */
  async getPendingPhotoUploadCount(): Promise<number> {
    return this.photos.where("syncStatus").equals("pending_upload").count();
  }
}

// Singleton database instance
export const db = new RanzOfflineDatabase();

// Export the class for type information
export type { RanzOfflineDatabase };

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== "undefined" && "indexedDB" in window;
  } catch {
    return false;
  }
}

/**
 * Request persistent storage to prevent browser from clearing data
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    if (isPersisted) {
      console.log("Storage is now persistent");
    } else {
      console.warn("Storage persistence request denied");
    }
    return isPersisted;
  }
  return false;
}

/**
 * Check if storage is already persistent
 */
export async function isStoragePersistent(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persisted) {
    return navigator.storage.persisted();
  }
  return false;
}
