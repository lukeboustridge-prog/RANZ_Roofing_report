/**
 * Photo Uploader
 *
 * Handles uploading photo blobs to R2 via presigned URLs
 * with progress tracking and retry logic
 */

import { db } from "./db";
import { photoStore } from "./stores/photo-store";

export interface PendingPhotoUpload {
  reportId: string;
  photoId: string;
  uploadUrl: string;
}

export interface PhotoUploadResult {
  uploaded: number;
  failed: Array<{ photoId: string; error: string }>;
}

/**
 * Upload a single photo to the presigned URL
 */
async function uploadSinglePhoto(
  photoId: string,
  uploadUrl: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    const photo = await photoStore.getPhoto(photoId);

    if (!photo) {
      return { success: false, error: "Photo not found in local storage" };
    }

    if (photo.syncStatus === "uploaded") {
      return { success: true }; // Already uploaded
    }

    // Update status to show we're uploading
    await photoStore.updatePhotoUploadProgress(photoId, 0);

    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          photoStore.updatePhotoUploadProgress(photoId, progress);
          onProgress?.(progress);
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Success - update photo status
          const photoUrl = uploadUrl.split("?")[0]; // Remove query params for final URL
          await photoStore.updatePhotoSyncStatus(
            photoId,
            "uploaded",
            photoUrl,
            undefined // Thumbnail URL handled separately if needed
          );
          resolve({ success: true });
        } else {
          await photoStore.updatePhotoSyncStatus(photoId, "error");
          resolve({
            success: false,
            error: `Upload failed with status ${xhr.status}`,
          });
        }
      };

      xhr.onerror = async () => {
        await photoStore.updatePhotoSyncStatus(photoId, "error");
        resolve({ success: false, error: "Network error during upload" });
      };

      xhr.ontimeout = async () => {
        await photoStore.updatePhotoSyncStatus(photoId, "error");
        resolve({ success: false, error: "Upload timed out" });
      };

      // Open connection
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", photo.mimeType);

      // Set timeout (5 minutes for large files)
      xhr.timeout = 5 * 60 * 1000;

      // Send the blob
      xhr.send(photo.blob);
    });
  } catch (error) {
    await photoStore.updatePhotoSyncStatus(photoId, "error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Upload multiple photos with concurrency control
 */
export async function uploadPhotos(
  uploads: PendingPhotoUpload[],
  onProgress?: (progress: {
    completed: number;
    total: number;
    currentPhotoProgress: number;
  }) => void,
  concurrency: number = 3
): Promise<PhotoUploadResult> {
  const result: PhotoUploadResult = {
    uploaded: 0,
    failed: [],
  };

  if (uploads.length === 0) {
    return result;
  }

  let completed = 0;
  const total = uploads.length;

  // Process in batches for concurrency control
  const batches: PendingPhotoUpload[][] = [];
  for (let i = 0; i < uploads.length; i += concurrency) {
    batches.push(uploads.slice(i, i + concurrency));
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (upload) => {
        const uploadResult = await uploadSinglePhoto(
          upload.photoId,
          upload.uploadUrl,
          (photoProgress) => {
            onProgress?.({
              completed,
              total,
              currentPhotoProgress: photoProgress,
            });
          }
        );

        completed++;
        onProgress?.({
          completed,
          total,
          currentPhotoProgress: 100,
        });

        return {
          photoId: upload.photoId,
          ...uploadResult,
        };
      })
    );

    for (const batchResult of batchResults) {
      if (batchResult.success) {
        result.uploaded++;
      } else {
        result.failed.push({
          photoId: batchResult.photoId,
          error: batchResult.error || "Unknown error",
        });
      }
    }
  }

  return result;
}

/**
 * Retry failed photo uploads
 */
export async function retryFailedUploads(
  maxRetries: number = 3
): Promise<PhotoUploadResult> {
  const failedPhotos = await db.photos
    .where("syncStatus")
    .equals("error")
    .toArray();

  if (failedPhotos.length === 0) {
    return { uploaded: 0, failed: [] };
  }

  // Request new presigned URLs for failed photos
  const photoIds = failedPhotos.map((p) => p.id);
  const reportIds = [...new Set(failedPhotos.map((p) => p.reportId))];

  const response = await fetch("/api/photos/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ photoIds, reportIds }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get presigned URLs: ${response.status}`);
  }

  const { uploads } = await response.json();

  return uploadPhotos(uploads);
}

/**
 * Get upload progress for all pending photos
 */
export async function getPendingUploadProgress(): Promise<{
  total: number;
  pending: number;
  uploading: number;
  uploaded: number;
  failed: number;
}> {
  const photos = await db.photos.toArray();

  return photos.reduce(
    (acc, photo) => {
      acc.total++;
      switch (photo.syncStatus) {
        case "pending_upload":
          if (photo.uploadProgress && photo.uploadProgress > 0) {
            acc.uploading++;
          } else {
            acc.pending++;
          }
          break;
        case "uploaded":
          acc.uploaded++;
          break;
        case "error":
          acc.failed++;
          break;
      }
      return acc;
    },
    { total: 0, pending: 0, uploading: 0, uploaded: 0, failed: 0 }
  );
}

/**
 * Calculate total size of pending uploads
 */
export async function getPendingUploadSize(): Promise<number> {
  const pendingPhotos = await db.photos
    .where("syncStatus")
    .equals("pending_upload")
    .toArray();

  return pendingPhotos.reduce((total, photo) => total + photo.fileSize, 0);
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
