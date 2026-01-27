/**
 * Photo Store
 *
 * CRUD operations for offline photos in IndexedDB
 * Handles blob storage and metadata
 */

import { db } from "../db";
import type { OfflinePhoto, PhotoType, PhotoSyncStatus } from "../types";

/**
 * Generate a unique photo ID
 */
function generateId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate SHA-256 hash of a blob
 */
async function generateHash(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a thumbnail from an image blob
 */
async function createThumbnail(
  blob: Blob,
  maxSize: number = 300
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Calculate dimensions maintaining aspect ratio
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (thumbnailBlob) => {
          if (thumbnailBlob) {
            resolve(thumbnailBlob);
          } else {
            reject(new Error("Could not create thumbnail"));
          }
        },
        "image/jpeg",
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };

    img.src = url;
  });
}

/**
 * Create a new offline photo
 */
export async function createPhoto(data: {
  reportId: string;
  blob: Blob;
  originalFilename: string;
  photoType: PhotoType;
  defectId?: string | null;
  roofElementId?: string | null;
  caption?: string | null;
  sortOrder?: number;
  capturedAt?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  cameraMake?: string | null;
  cameraModel?: string | null;
  cameraSerial?: string | null;
}): Promise<OfflinePhoto> {
  const now = new Date().toISOString();
  const id = generateId();

  // Generate hash for evidence integrity
  const originalHash = await generateHash(data.blob);

  // Create thumbnail
  let thumbnailBlob: Blob | undefined;
  try {
    thumbnailBlob = await createThumbnail(data.blob);
  } catch (error) {
    console.warn("Could not create thumbnail:", error);
  }

  // Generate filename
  const timestamp = Date.now();
  const extension = data.originalFilename.split(".").pop() || "jpg";
  const filename = `${timestamp}-${data.originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .substring(0, 50)}.${extension}`;

  const photo: OfflinePhoto = {
    id,
    reportId: data.reportId,
    defectId: data.defectId ?? null,
    roofElementId: data.roofElementId ?? null,
    filename,
    originalFilename: data.originalFilename,
    mimeType: data.blob.type || "image/jpeg",
    fileSize: data.blob.size,
    blob: data.blob,
    thumbnailBlob,
    photoType: data.photoType,
    capturedAt: data.capturedAt ?? null,
    gpsLat: data.gpsLat ?? null,
    gpsLng: data.gpsLng ?? null,
    cameraMake: data.cameraMake ?? null,
    cameraModel: data.cameraModel ?? null,
    cameraSerial: data.cameraSerial ?? null,
    originalHash,
    hashVerified: true,
    isEdited: false,
    caption: data.caption ?? null,
    sortOrder: data.sortOrder ?? 0,
    localCreatedAt: now,
    localUpdatedAt: now,
    syncStatus: "pending_upload",
  };

  await db.photos.add(photo);
  return photo;
}

/**
 * Get a photo by ID
 */
export async function getPhoto(id: string): Promise<OfflinePhoto | undefined> {
  return db.photos.get(id);
}

/**
 * Get all photos for a report
 */
export async function getPhotosByReport(reportId: string): Promise<OfflinePhoto[]> {
  return db.photos.where("reportId").equals(reportId).sortBy("sortOrder");
}

/**
 * Get photos for a defect
 */
export async function getPhotosByDefect(defectId: string): Promise<OfflinePhoto[]> {
  return db.photos.where("defectId").equals(defectId).sortBy("sortOrder");
}

/**
 * Get photos for a roof element
 */
export async function getPhotosByElement(
  roofElementId: string
): Promise<OfflinePhoto[]> {
  return db.photos.where("roofElementId").equals(roofElementId).sortBy("sortOrder");
}

/**
 * Get photos pending upload
 */
export async function getPendingUploadPhotos(): Promise<OfflinePhoto[]> {
  return db.photos.where("syncStatus").equals("pending_upload").toArray();
}

/**
 * Get photos pending upload for a specific report
 */
export async function getPendingUploadPhotosForReport(
  reportId: string
): Promise<OfflinePhoto[]> {
  return db.photos
    .where(["reportId", "syncStatus"])
    .equals([reportId, "pending_upload"])
    .toArray();
}

/**
 * Update photo metadata
 */
export async function updatePhoto(
  id: string,
  updates: Partial<
    Pick<
      OfflinePhoto,
      | "caption"
      | "sortOrder"
      | "defectId"
      | "roofElementId"
      | "annotations"
      | "scaleReference"
    >
  >
): Promise<void> {
  const now = new Date().toISOString();
  await db.photos.update(id, {
    ...updates,
    localUpdatedAt: now,
  });
}

/**
 * Update photo sync status
 */
export async function updatePhotoSyncStatus(
  id: string,
  syncStatus: PhotoSyncStatus,
  url?: string,
  thumbnailUrl?: string
): Promise<void> {
  await db.photos.update(id, {
    syncStatus,
    url: url ?? undefined,
    thumbnailUrl: thumbnailUrl ?? undefined,
  });
}

/**
 * Update photo upload progress
 */
export async function updatePhotoUploadProgress(
  id: string,
  progress: number
): Promise<void> {
  await db.photos.update(id, { uploadProgress: progress });
}

/**
 * Delete a photo
 */
export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id);
}

/**
 * Delete all photos for a report
 */
export async function deletePhotosByReport(reportId: string): Promise<void> {
  await db.photos.where("reportId").equals(reportId).delete();
}

/**
 * Reorder photos in a report
 */
export async function reorderPhotos(
  reportId: string,
  photoIds: string[]
): Promise<void> {
  await db.transaction("rw", db.photos, async () => {
    for (let i = 0; i < photoIds.length; i++) {
      await db.photos.update(photoIds[i], {
        sortOrder: i,
        localUpdatedAt: new Date().toISOString(),
      });
    }
  });
}

/**
 * Get photo count for a report
 */
export async function getPhotoCountForReport(reportId: string): Promise<number> {
  return db.photos.where("reportId").equals(reportId).count();
}

/**
 * Get total storage used by photos for a report
 */
export async function getPhotoStorageForReport(reportId: string): Promise<number> {
  const photos = await db.photos.where("reportId").equals(reportId).toArray();
  return photos.reduce((total, photo) => total + photo.fileSize, 0);
}

/**
 * Get photo blob as object URL (for display)
 */
export function getPhotoBlobUrl(photo: OfflinePhoto): string {
  return URL.createObjectURL(photo.blob);
}

/**
 * Get thumbnail blob as object URL (for display)
 */
export function getThumbnailBlobUrl(photo: OfflinePhoto): string | null {
  if (photo.thumbnailBlob) {
    return URL.createObjectURL(photo.thumbnailBlob);
  }
  return null;
}

/**
 * Verify photo integrity by comparing hash
 */
export async function verifyPhotoIntegrity(photo: OfflinePhoto): Promise<boolean> {
  const currentHash = await generateHash(photo.blob);
  return currentHash === photo.originalHash;
}

/**
 * Create an edited copy of a photo
 */
export async function createEditedPhoto(
  originalId: string,
  editedBlob: Blob,
  annotations?: Record<string, unknown>
): Promise<OfflinePhoto> {
  const original = await getPhoto(originalId);
  if (!original) {
    throw new Error("Original photo not found");
  }

  const now = new Date().toISOString();
  const id = generateId();
  const originalHash = await generateHash(editedBlob);

  let thumbnailBlob: Blob | undefined;
  try {
    thumbnailBlob = await createThumbnail(editedBlob);
  } catch (error) {
    console.warn("Could not create thumbnail:", error);
  }

  const editedPhoto: OfflinePhoto = {
    ...original,
    id,
    blob: editedBlob,
    thumbnailBlob,
    fileSize: editedBlob.size,
    originalHash,
    isEdited: true,
    editedFrom: originalId,
    annotations: annotations ?? original.annotations,
    localCreatedAt: now,
    localUpdatedAt: now,
    syncStatus: "pending_upload",
    url: null,
    thumbnailUrl: null,
  };

  await db.photos.add(editedPhoto);
  return editedPhoto;
}

export const photoStore = {
  createPhoto,
  getPhoto,
  getPhotosByReport,
  getPhotosByDefect,
  getPhotosByElement,
  getPendingUploadPhotos,
  getPendingUploadPhotosForReport,
  updatePhoto,
  updatePhotoSyncStatus,
  updatePhotoUploadProgress,
  deletePhoto,
  deletePhotosByReport,
  reorderPhotos,
  getPhotoCountForReport,
  getPhotoStorageForReport,
  getPhotoBlobUrl,
  getThumbnailBlobUrl,
  verifyPhotoIntegrity,
  createEditedPhoto,
};
