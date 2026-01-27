/**
 * Offline Stores Index
 *
 * Re-exports all store modules for convenient importing
 */

export { reportStore } from "./report-store";
export { photoStore } from "./photo-store";
export { defectStore } from "./defect-store";
export { elementStore } from "./element-store";
export { syncQueueStore, SYNC_PRIORITY } from "./sync-queue";

// Re-export commonly used functions directly
export {
  createReport,
  getReport,
  getAllReports,
  getReportsByStatus,
  updateReport,
  deleteReport,
  getReportWithRelations,
  getPendingReports,
} from "./report-store";

export {
  createPhoto,
  getPhoto,
  getPhotosByReport,
  updatePhoto,
  deletePhoto,
  getPendingUploadPhotos,
  getPhotoBlobUrl,
  getThumbnailBlobUrl,
} from "./photo-store";

export {
  createDefect,
  getDefect,
  getDefectsByReport,
  updateDefect,
  deleteDefect,
  getPendingDefects,
} from "./defect-store";

export {
  createElement,
  getElement,
  getElementsByReport,
  updateElement,
  deleteElement,
  getPendingElements,
} from "./element-store";

export {
  addToQueue,
  getAllQueueItems,
  getNextBatch,
  removeFromQueue,
  getQueueStats,
  hasItemsInQueue,
} from "./sync-queue";
