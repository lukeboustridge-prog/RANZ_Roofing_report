/**
 * Sync Queue Store
 *
 * Manages the queue of pending synchronization operations
 */

import { db } from "../db";
import type { SyncQueueItem } from "../types";

/**
 * Generate a unique queue item ID
 */
function generateId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Priority levels for sync operations
 * Lower number = higher priority
 */
export const SYNC_PRIORITY = {
  REPORT: 1, // Reports sync first
  ELEMENT: 2, // Then elements
  DEFECT: 3, // Then defects
  COMPLIANCE: 4, // Then compliance
  PHOTO: 5, // Photos last (largest payload)
} as const;

/**
 * Add an item to the sync queue
 */
export async function addToQueue(data: {
  type: "report" | "photo" | "defect" | "element" | "compliance";
  action: "create" | "update" | "delete";
  entityId: string;
  payload: unknown;
}): Promise<SyncQueueItem> {
  const now = new Date().toISOString();
  const id = generateId();

  const item: SyncQueueItem = {
    id,
    type: data.type,
    action: data.action,
    entityId: data.entityId,
    payload: data.payload,
    createdAt: now,
    retryCount: 0,
    priority: SYNC_PRIORITY[data.type.toUpperCase() as keyof typeof SYNC_PRIORITY] ?? 10,
  };

  await db.syncQueue.add(item);
  return item;
}

/**
 * Get all items in the sync queue
 */
export async function getAllQueueItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy("priority").toArray();
}

/**
 * Get queue items by type
 */
export async function getQueueItemsByType(
  type: SyncQueueItem["type"]
): Promise<SyncQueueItem[]> {
  return db.syncQueue.where("type").equals(type).sortBy("createdAt");
}

/**
 * Get queue items for a specific entity
 */
export async function getQueueItemsForEntity(
  entityId: string
): Promise<SyncQueueItem[]> {
  return db.syncQueue.where("entityId").equals(entityId).toArray();
}

/**
 * Get the next batch of items to sync
 */
export async function getNextBatch(batchSize: number = 10): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy("priority").limit(batchSize).toArray();
}

/**
 * Get items that have failed and need retry
 */
export async function getRetryableItems(maxRetries: number = 3): Promise<SyncQueueItem[]> {
  return db.syncQueue
    .filter((item) => item.retryCount > 0 && item.retryCount < maxRetries)
    .sortBy("priority");
}

/**
 * Get items that have exceeded retry limit
 */
export async function getFailedItems(maxRetries: number = 3): Promise<SyncQueueItem[]> {
  return db.syncQueue.filter((item) => item.retryCount >= maxRetries).toArray();
}

/**
 * Update queue item after sync attempt
 */
export async function updateQueueItem(
  id: string,
  updates: Partial<Pick<SyncQueueItem, "retryCount" | "lastError">>
): Promise<void> {
  await db.syncQueue.update(id, updates);
}

/**
 * Increment retry count and set error
 */
export async function markRetry(id: string, error: string): Promise<void> {
  const item = await db.syncQueue.get(id);
  if (item) {
    await db.syncQueue.update(id, {
      retryCount: item.retryCount + 1,
      lastError: error,
    });
  }
}

/**
 * Remove an item from the queue (after successful sync)
 */
export async function removeFromQueue(id: string): Promise<void> {
  await db.syncQueue.delete(id);
}

/**
 * Remove all items for an entity
 */
export async function removeEntityFromQueue(entityId: string): Promise<void> {
  await db.syncQueue.where("entityId").equals(entityId).delete();
}

/**
 * Clear the entire sync queue
 */
export async function clearQueue(): Promise<void> {
  await db.syncQueue.clear();
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number;
  byType: Record<SyncQueueItem["type"], number>;
  byAction: Record<SyncQueueItem["action"], number>;
  pendingRetry: number;
  failed: number;
}> {
  const items = await db.syncQueue.toArray();

  const byType: Record<SyncQueueItem["type"], number> = {
    report: 0,
    photo: 0,
    defect: 0,
    element: 0,
    compliance: 0,
  };

  const byAction: Record<SyncQueueItem["action"], number> = {
    create: 0,
    update: 0,
    delete: 0,
  };

  let pendingRetry = 0;
  let failed = 0;

  for (const item of items) {
    byType[item.type]++;
    byAction[item.action]++;
    if (item.retryCount > 0 && item.retryCount < 3) {
      pendingRetry++;
    }
    if (item.retryCount >= 3) {
      failed++;
    }
  }

  return {
    total: items.length,
    byType,
    byAction,
    pendingRetry,
    failed,
  };
}

/**
 * Check if there are any items in the queue
 */
export async function hasItemsInQueue(): Promise<boolean> {
  const count = await db.syncQueue.count();
  return count > 0;
}

/**
 * Get queue count
 */
export async function getQueueCount(): Promise<number> {
  return db.syncQueue.count();
}

/**
 * Check if a specific entity has pending sync
 */
export async function hasPendingSync(entityId: string): Promise<boolean> {
  const count = await db.syncQueue.where("entityId").equals(entityId).count();
  return count > 0;
}

/**
 * Remove duplicate queue items for the same entity
 * Keeps only the most recent item
 */
export async function deduplicateQueue(): Promise<number> {
  const items = await db.syncQueue.toArray();
  const entityMap = new Map<string, SyncQueueItem[]>();

  // Group by entityId
  for (const item of items) {
    const key = `${item.type}-${item.entityId}`;
    if (!entityMap.has(key)) {
      entityMap.set(key, []);
    }
    entityMap.get(key)!.push(item);
  }

  let removed = 0;

  // Remove duplicates, keep most recent
  for (const [, duplicates] of entityMap) {
    if (duplicates.length > 1) {
      // Sort by createdAt descending
      duplicates.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Remove all but the first (most recent)
      for (let i = 1; i < duplicates.length; i++) {
        await db.syncQueue.delete(duplicates[i].id);
        removed++;
      }
    }
  }

  return removed;
}

/**
 * Batch add items to queue
 */
export async function batchAddToQueue(
  items: Array<{
    type: SyncQueueItem["type"];
    action: SyncQueueItem["action"];
    entityId: string;
    payload: unknown;
  }>
): Promise<void> {
  const now = new Date().toISOString();

  const queueItems: SyncQueueItem[] = items.map((item) => ({
    id: generateId(),
    type: item.type,
    action: item.action,
    entityId: item.entityId,
    payload: item.payload,
    createdAt: now,
    retryCount: 0,
    priority:
      SYNC_PRIORITY[item.type.toUpperCase() as keyof typeof SYNC_PRIORITY] ?? 10,
  }));

  await db.syncQueue.bulkAdd(queueItems);
}

export const syncQueueStore = {
  SYNC_PRIORITY,
  addToQueue,
  getAllQueueItems,
  getQueueItemsByType,
  getQueueItemsForEntity,
  getNextBatch,
  getRetryableItems,
  getFailedItems,
  updateQueueItem,
  markRetry,
  removeFromQueue,
  removeEntityFromQueue,
  clearQueue,
  getQueueStats,
  hasItemsInQueue,
  getQueueCount,
  hasPendingSync,
  deduplicateQueue,
  batchAddToQueue,
};
