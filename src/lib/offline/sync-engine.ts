/**
 * Sync Engine
 *
 * Main orchestrator for offline-to-online synchronization
 * Handles bidirectional sync between IndexedDB and server
 */

import { db } from "./db";
import { reportStore } from "./stores/report-store";
import { photoStore } from "./stores/photo-store";
import { defectStore } from "./stores/defect-store";
import { elementStore } from "./stores/element-store";
import { syncQueueStore } from "./stores/sync-queue";
import { uploadPhotos } from "./photo-uploader";
import { detectConflicts, resolveConflict } from "./conflict-resolver";
import type {
  SyncUploadPayload,
  SyncUploadResponse,
  BootstrapResponse,
  ReportSyncData,
  ElementSyncData,
  DefectSyncData,
  PhotoMetadataSyncData,
  ConflictResolution,
  OfflineReport,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export type SyncState = "idle" | "syncing" | "error" | "offline";

export interface SyncProgress {
  state: SyncState;
  message: string;
  progress: number; // 0-100
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
}

export interface SyncResult {
  success: boolean;
  syncedReports: string[];
  failedReports: Array<{ reportId: string; error: string }>;
  conflicts: Array<{
    reportId: string;
    resolution: string;
    serverUpdatedAt: string;
    clientUpdatedAt: string;
  }>;
  uploadedPhotos: number;
  errors: string[];
  timestamp: string;
}

export type SyncEventType =
  | "sync:start"
  | "sync:progress"
  | "sync:complete"
  | "sync:error"
  | "sync:conflict"
  | "photo:upload:start"
  | "photo:upload:progress"
  | "photo:upload:complete"
  | "photo:upload:error";

export type SyncEventCallback = (event: {
  type: SyncEventType;
  data?: unknown;
}) => void;

// ============================================================================
// Sync Engine Class
// ============================================================================

class SyncEngine {
  private isRunning = false;
  private autoSyncInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<SyncEventCallback> = new Set();
  private abortController: AbortController | null = null;

  /**
   * Subscribe to sync events
   */
  subscribe(callback: SyncEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(type: SyncEventType, data?: unknown): void {
    this.listeners.forEach((callback) => callback({ type, data }));
  }

  /**
   * Check if sync is currently running
   */
  get isSyncing(): boolean {
    return this.isRunning;
  }

  /**
   * Get device ID (or generate one)
   */
  private async getDeviceId(): Promise<string> {
    const metadata = await db.metadata.get("deviceId");
    if (metadata?.value) {
      return metadata.value as string;
    }

    const deviceId = `web_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    await db.metadata.put({ key: "deviceId", value: deviceId });
    return deviceId;
  }

  /**
   * Bootstrap initial data from server
   */
  async bootstrap(): Promise<BootstrapResponse> {
    this.emit("sync:start", { type: "bootstrap" });

    try {
      // Check for last sync timestamp for incremental sync
      const lastSyncMeta = await db.metadata.get("lastSyncAt");
      const lastSyncAt = lastSyncMeta?.value as string | undefined;

      const url = lastSyncAt
        ? `/api/sync/bootstrap?lastSyncAt=${encodeURIComponent(lastSyncAt)}`
        : "/api/sync/bootstrap";

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Bootstrap failed: ${response.status}`);
      }

      const data: BootstrapResponse = await response.json();

      if (!data.success) {
        throw new Error("Bootstrap returned unsuccessful response");
      }

      // Store checklists
      await db.transaction("rw", db.checklists, async () => {
        for (const checklist of data.data.checklists) {
          await db.checklists.put(checklist);
        }
      });

      // Store templates
      await db.transaction("rw", db.templates, async () => {
        for (const template of data.data.templates) {
          await db.templates.put(template);
        }
      });

      // Store user info
      await db.metadata.put({ key: "userId", value: data.data.user.id });

      // Update last sync timestamp
      await db.metadata.put({
        key: "lastBootstrapAt",
        value: data.data.lastSyncAt,
      });
      await db.metadata.put({ key: "lastSyncAt", value: data.data.lastSyncAt });

      this.emit("sync:complete", { type: "bootstrap", data });

      return data;
    } catch (error) {
      this.emit("sync:error", {
        type: "bootstrap",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Perform full sync (upload pending changes, then download updates)
   */
  async fullSync(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error("Sync is already in progress");
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    const result: SyncResult = {
      success: false,
      syncedReports: [],
      failedReports: [],
      conflicts: [],
      uploadedPhotos: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      this.emit("sync:start", { type: "full" });
      this.emit("sync:progress", {
        state: "syncing",
        message: "Preparing data for sync...",
        progress: 0,
      });

      // Step 1: Get pending reports
      const pendingReports = await reportStore.getPendingReports();

      if (pendingReports.length === 0) {
        // No pending changes, just bootstrap
        await this.bootstrap();
        result.success = true;
        return result;
      }

      this.emit("sync:progress", {
        state: "syncing",
        message: `Syncing ${pendingReports.length} reports...`,
        progress: 10,
      });

      // Step 2: Build sync payload
      const payload = await this.buildSyncPayload(pendingReports);

      this.emit("sync:progress", {
        state: "syncing",
        message: "Uploading changes...",
        progress: 30,
      });

      // Step 3: Upload to server
      const response = await fetch("/api/sync/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Sync upload failed: ${response.status}`);
      }

      const syncResponse: SyncUploadResponse = await response.json();

      this.emit("sync:progress", {
        state: "syncing",
        message: "Processing server response...",
        progress: 50,
      });

      // Step 4: Update local state based on response
      await this.processUploadResponse(syncResponse, result);

      this.emit("sync:progress", {
        state: "syncing",
        message: "Uploading photos...",
        progress: 60,
      });

      // Step 5: Upload photos via presigned URLs
      if (syncResponse.results.pendingPhotoUploads.length > 0) {
        const uploadResult = await uploadPhotos(
          syncResponse.results.pendingPhotoUploads,
          (progress) => {
            this.emit("photo:upload:progress", { progress });
          }
        );

        result.uploadedPhotos = uploadResult.uploaded;
        if (uploadResult.failed.length > 0) {
          result.errors.push(
            `${uploadResult.failed.length} photos failed to upload`
          );
        }
      }

      this.emit("sync:progress", {
        state: "syncing",
        message: "Fetching updates...",
        progress: 80,
      });

      // Step 6: Bootstrap to get any server-side updates
      await this.bootstrap();

      this.emit("sync:progress", {
        state: "syncing",
        message: "Sync complete",
        progress: 100,
      });

      result.success = true;
      result.syncedReports = syncResponse.results.syncedReports;
      result.failedReports = syncResponse.results.failedReports;
      result.conflicts = syncResponse.results.conflicts;

      // Update last sync timestamp
      await db.metadata.put({ key: "lastSyncAt", value: result.timestamp });

      this.emit("sync:complete", { result });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      result.errors.push(errorMessage);

      this.emit("sync:error", { error: errorMessage });

      throw error;
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }
  }

  /**
   * Build the sync payload from pending reports
   */
  private async buildSyncPayload(
    reports: OfflineReport[]
  ): Promise<SyncUploadPayload> {
    const deviceId = await this.getDeviceId();
    const reportSyncData: ReportSyncData[] = [];

    for (const report of reports) {
      const relations = await reportStore.getReportWithRelations(report.id);
      if (!relations) continue;

      // Build element sync data
      const elements: ElementSyncData[] = relations.elements.map((e) => ({
        id: e.id,
        elementType: e.elementType,
        location: e.location,
        claddingType: e.claddingType,
        material: e.material,
        manufacturer: e.manufacturer,
        pitch: e.pitch,
        area: e.area,
        conditionRating: e.conditionRating,
        conditionNotes: e.conditionNotes,
        clientUpdatedAt: e.localUpdatedAt,
        _deleted: e._deleted,
      }));

      // Build defect sync data
      const defects: DefectSyncData[] = relations.defects.map((d) => ({
        id: d.id,
        defectNumber: d.defectNumber,
        title: d.title,
        description: d.description,
        location: d.location,
        classification: d.classification,
        severity: d.severity,
        observation: d.observation,
        analysis: d.analysis,
        opinion: d.opinion,
        codeReference: d.codeReference,
        copReference: d.copReference,
        recommendation: d.recommendation,
        priorityLevel: d.priorityLevel,
        roofElementId: d.roofElementId,
        clientUpdatedAt: d.localUpdatedAt,
        _deleted: d._deleted,
      }));

      // Build photo metadata (no blobs)
      const photoMetadata: PhotoMetadataSyncData[] = relations.photos.map((p) => ({
        id: p.id,
        photoType: p.photoType,
        filename: p.filename,
        originalFilename: p.originalFilename,
        mimeType: p.mimeType,
        fileSize: p.fileSize,
        capturedAt: p.capturedAt,
        gpsLat: p.gpsLat,
        gpsLng: p.gpsLng,
        cameraMake: p.cameraMake,
        cameraModel: p.cameraModel,
        originalHash: p.originalHash,
        caption: p.caption,
        sortOrder: p.sortOrder,
        defectId: p.defectId,
        roofElementId: p.roofElementId,
        needsUpload: p.syncStatus === "pending_upload",
        clientUpdatedAt: p.localUpdatedAt,
        _deleted: p._deleted,
      }));

      // Build compliance data
      const compliance = relations.compliance
        ? {
            id: relations.compliance.id,
            checklistResults: relations.compliance.checklistResults,
            nonComplianceSummary: relations.compliance.nonComplianceSummary,
            clientUpdatedAt: relations.compliance.localUpdatedAt,
          }
        : null;

      reportSyncData.push({
        id: report.id,
        reportNumber: report.reportNumber,
        status: report.status,
        propertyAddress: report.propertyAddress,
        propertyCity: report.propertyCity,
        propertyRegion: report.propertyRegion,
        propertyPostcode: report.propertyPostcode,
        propertyType: report.propertyType,
        buildingAge: report.buildingAge,
        gpsLat: report.gpsLat,
        gpsLng: report.gpsLng,
        inspectionDate: report.inspectionDate,
        inspectionType: report.inspectionType,
        weatherConditions: report.weatherConditions,
        accessMethod: report.accessMethod,
        limitations: report.limitations,
        clientName: report.clientName,
        clientEmail: report.clientEmail,
        clientPhone: report.clientPhone,
        scopeOfWorks: report.scopeOfWorks,
        methodology: report.methodology,
        findings: report.findings,
        conclusions: report.conclusions,
        recommendations: report.recommendations,
        declarationSigned: report.declarationSigned,
        signedAt: report.signedAt,
        clientUpdatedAt: report.localUpdatedAt,
        elements,
        defects,
        compliance,
        photoMetadata,
      });
    }

    return {
      reports: reportSyncData,
      deviceId,
      syncTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Process the upload response and update local state
   */
  private async processUploadResponse(
    response: SyncUploadResponse,
    result: SyncResult
  ): Promise<void> {
    // Mark synced reports
    for (const reportId of response.results.syncedReports) {
      await reportStore.updateReportSyncStatus(
        reportId,
        "synced",
        response.timestamp
      );

      // Also update related entities
      const elements = await elementStore.getElementsByReport(reportId);
      for (const element of elements) {
        await elementStore.updateElementSyncStatus(element.id, "synced");
      }

      const defects = await defectStore.getDefectsByReport(reportId);
      for (const defect of defects) {
        await defectStore.updateDefectSyncStatus(defect.id, "synced");
      }
    }

    // Handle conflicts
    for (const conflict of response.results.conflicts) {
      await reportStore.updateReportSyncStatus(
        conflict.reportId,
        "conflict",
        conflict.serverUpdatedAt
      );

      this.emit("sync:conflict", { conflict });
    }

    // Mark failed reports
    for (const failed of response.results.failedReports) {
      await reportStore.updateReportSyncStatus(
        failed.reportId,
        "error",
        undefined,
        failed.error
      );
    }
  }

  /**
   * Resolve a conflict for a specific report
   */
  async resolveReportConflict(
    reportId: string,
    resolution: ConflictResolution
  ): Promise<void> {
    await resolveConflict(reportId, resolution);

    // If keeping local, mark as pending again to trigger re-sync
    if (resolution === "keep_local") {
      await reportStore.updateReportSyncStatus(reportId, "pending");
    }
  }

  /**
   * Start automatic sync interval
   */
  startAutoSync(intervalMs: number = 5 * 60 * 1000): void {
    if (this.autoSyncInterval) {
      return;
    }

    this.autoSyncInterval = setInterval(async () => {
      if (!navigator.onLine || this.isRunning) {
        return;
      }

      try {
        await this.fullSync();
      } catch (error) {
        console.error("Auto-sync failed:", error);
      }
    }, intervalMs);
  }

  /**
   * Stop automatic sync interval
   */
  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  /**
   * Cancel current sync operation
   */
  cancelSync(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Get sync status summary
   */
  async getSyncStatus(): Promise<{
    pendingReports: number;
    pendingPhotos: number;
    conflicts: number;
    errors: number;
    lastSyncAt: string | null;
  }> {
    const [pendingReports, conflicts, errors, pendingPhotos, lastSyncMeta] =
      await Promise.all([
        db.reports.where("syncStatus").equals("pending").count(),
        db.reports.where("syncStatus").equals("conflict").count(),
        db.reports.where("syncStatus").equals("error").count(),
        db.photos.where("syncStatus").equals("pending_upload").count(),
        db.metadata.get("lastSyncAt"),
      ]);

    return {
      pendingReports,
      pendingPhotos,
      conflicts,
      errors,
      lastSyncAt: (lastSyncMeta?.value as string) ?? null,
    };
  }
}

// Export singleton instance
export const syncEngine = new SyncEngine();
