/**
 * RANZ Offline Module
 *
 * Main entry point for offline functionality
 */

// Database
export { db, isIndexedDBAvailable, requestPersistentStorage, isStoragePersistent } from "./db";
export type { RanzOfflineDatabase } from "./db";

// Types
export type {
  SyncStatus,
  PhotoSyncStatus,
  OfflineReport,
  ReportStatus,
  PropertyType,
  InspectionType,
  OfflineRoofElement,
  ElementType,
  ConditionRating,
  OfflineDefect,
  DefectClass,
  DefectSeverity,
  PriorityLevel,
  OfflinePhoto,
  PhotoType,
  OfflineComplianceAssessment,
  SyncQueueItem,
  OfflineChecklist,
  OfflineTemplate,
  ConflictInfo,
  ConflictResolution,
  SyncUploadPayload,
  SyncUploadResponse,
  BootstrapResponse,
} from "./types";

// Stores
export {
  reportStore,
  photoStore,
  defectStore,
  elementStore,
  syncQueueStore,
  SYNC_PRIORITY,
} from "./stores";

// Sync Engine
export { syncEngine } from "./sync-engine";
export type { SyncState, SyncProgress, SyncResult, SyncEventType, SyncEventCallback } from "./sync-engine";

// Photo Uploader
export {
  uploadPhotos,
  retryFailedUploads,
  getPendingUploadProgress,
  getPendingUploadSize,
  formatBytes,
} from "./photo-uploader";
export type { PendingPhotoUpload, PhotoUploadResult } from "./photo-uploader";

// Conflict Resolver
export {
  detectConflicts,
  resolveConflict,
  getConflictReports,
  getConflictCount,
  batchResolveConflicts,
  autoResolveConflicts,
  createMergedReport,
} from "./conflict-resolver";
