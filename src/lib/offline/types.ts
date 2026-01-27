/**
 * Offline Data Types
 *
 * Type definitions for IndexedDB offline storage
 * These types mirror the Prisma schema but with offline-specific extensions
 */

// ============================================================================
// Sync Status Types
// ============================================================================

export type SyncStatus = "synced" | "pending" | "conflict" | "error";
export type PhotoSyncStatus = "pending_upload" | "uploaded" | "error";

// ============================================================================
// Report Types
// ============================================================================

export interface OfflineReport {
  id: string;
  reportNumber: string;
  status: ReportStatus;

  // Property Details
  propertyAddress: string;
  propertyCity: string;
  propertyRegion: string;
  propertyPostcode: string;
  propertyType: PropertyType;
  buildingAge?: number | null;
  gpsLat?: number | null;
  gpsLng?: number | null;

  // Inspection Details
  inspectionDate: string; // ISO string
  inspectionType: InspectionType;
  weatherConditions?: string | null;
  accessMethod?: string | null;
  limitations?: string | null;

  // Client Information
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;

  // Report Content (JSON)
  scopeOfWorks?: Record<string, unknown> | null;
  methodology?: Record<string, unknown> | null;
  findings?: Record<string, unknown> | null;
  conclusions?: Record<string, unknown> | null;
  recommendations?: Record<string, unknown> | null;

  // Sign-off
  declarationSigned: boolean;
  signedAt?: string | null;

  // Timestamps
  localCreatedAt: string;
  localUpdatedAt: string;
  serverUpdatedAt?: string | null;

  // Sync tracking
  syncStatus: SyncStatus;
  lastSyncAttempt?: string | null;
  syncError?: string | null;
}

export type ReportStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "REVISION_REQUIRED"
  | "APPROVED"
  | "FINALISED"
  | "ARCHIVED";

export type PropertyType =
  | "RESIDENTIAL_1"
  | "RESIDENTIAL_2"
  | "RESIDENTIAL_3"
  | "COMMERCIAL_LOW"
  | "COMMERCIAL_HIGH"
  | "INDUSTRIAL";

export type InspectionType =
  | "FULL_INSPECTION"
  | "VISUAL_ONLY"
  | "NON_INVASIVE"
  | "INVASIVE"
  | "DISPUTE_RESOLUTION"
  | "PRE_PURCHASE"
  | "MAINTENANCE_REVIEW"
  | "WARRANTY_CLAIM";

// ============================================================================
// Roof Element Types
// ============================================================================

export interface OfflineRoofElement {
  id: string;
  reportId: string;

  elementType: ElementType;
  location: string;

  // Cladding Details
  claddingType?: string | null;
  claddingProfile?: string | null;
  material?: string | null;
  manufacturer?: string | null;
  colour?: string | null;

  // Technical Specs
  pitch?: number | null;
  area?: number | null;
  ageYears?: number | null;

  // Condition Rating
  conditionRating?: ConditionRating | null;
  conditionNotes?: string | null;

  // Compliance
  meetsCop?: boolean | null;
  meetsE2?: boolean | null;

  // Timestamps
  localCreatedAt: string;
  localUpdatedAt: string;

  // Sync tracking
  syncStatus: SyncStatus;
  _deleted?: boolean;
}

export type ElementType =
  | "ROOF_CLADDING"
  | "RIDGE"
  | "VALLEY"
  | "HIP"
  | "BARGE"
  | "FASCIA"
  | "GUTTER"
  | "DOWNPIPE"
  | "FLASHING_WALL"
  | "FLASHING_PENETRATION"
  | "FLASHING_PARAPET"
  | "SKYLIGHT"
  | "VENT"
  | "ANTENNA_MOUNT"
  | "SOLAR_PANEL"
  | "UNDERLAY"
  | "INSULATION"
  | "ROOF_STRUCTURE"
  | "OTHER";

export type ConditionRating =
  | "GOOD"
  | "FAIR"
  | "POOR"
  | "CRITICAL"
  | "NOT_INSPECTED";

// ============================================================================
// Defect Types
// ============================================================================

export interface OfflineDefect {
  id: string;
  reportId: string;
  roofElementId?: string | null;

  defectNumber: number;
  title: string;
  description: string;
  location: string;

  classification: DefectClass;
  severity: DefectSeverity;

  // Three-part assessment
  observation: string;
  analysis?: string | null;
  opinion?: string | null;

  // Compliance References
  codeReference?: string | null;
  copReference?: string | null;

  // Causation
  probableCause?: string | null;
  contributingFactors?: string | null;

  // Recommendations
  recommendation?: string | null;
  priorityLevel?: PriorityLevel | null;
  estimatedCost?: string | null;

  // Measurements (flexible JSON)
  measurements?: Record<string, unknown> | null;

  // Timestamps
  localCreatedAt: string;
  localUpdatedAt: string;

  // Sync tracking
  syncStatus: SyncStatus;
  _deleted?: boolean;
}

export type DefectClass =
  | "MAJOR_DEFECT"
  | "MINOR_DEFECT"
  | "SAFETY_HAZARD"
  | "MAINTENANCE_ITEM"
  | "WORKMANSHIP_ISSUE";

export type DefectSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type PriorityLevel =
  | "IMMEDIATE"
  | "SHORT_TERM"
  | "MEDIUM_TERM"
  | "LONG_TERM";

// ============================================================================
// Photo Types
// ============================================================================

export interface OfflinePhoto {
  id: string;
  reportId: string;
  defectId?: string | null;
  roofElementId?: string | null;

  // File Info
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;

  // Binary data (stored in IndexedDB)
  blob: Blob;
  thumbnailBlob?: Blob;

  // URLs (populated after sync)
  url?: string | null;
  thumbnailUrl?: string | null;

  // Photo Type
  photoType: PhotoType;

  // EXIF Metadata
  capturedAt?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  gpsAltitude?: number | null;
  cameraMake?: string | null;
  cameraModel?: string | null;
  cameraSerial?: string | null;

  // Evidence Integrity
  originalHash: string;
  hashVerified: boolean;
  isEdited: boolean;
  editedFrom?: string | null;

  // Annotations
  caption?: string | null;
  annotations?: Record<string, unknown> | null;
  scaleReference?: string | null;

  // Display Order
  sortOrder: number;

  // Timestamps
  localCreatedAt: string;
  localUpdatedAt: string;

  // Sync tracking
  syncStatus: PhotoSyncStatus;
  uploadProgress?: number;
  _deleted?: boolean;
}

export type PhotoType =
  | "OVERVIEW"
  | "CONTEXT"
  | "DETAIL"
  | "SCALE_REFERENCE"
  | "INACCESSIBLE"
  | "EQUIPMENT"
  | "GENERAL";

// ============================================================================
// Compliance Types
// ============================================================================

export interface OfflineComplianceAssessment {
  id: string;
  reportId: string;

  checklistResults: Record<string, ChecklistItemResult>;
  nonComplianceSummary?: string | null;

  // Timestamps
  localCreatedAt: string;
  localUpdatedAt: string;

  // Sync tracking
  syncStatus: SyncStatus;
}

export interface ChecklistItemResult {
  itemId: string;
  status: "compliant" | "non_compliant" | "not_applicable" | "not_inspected";
  notes?: string;
  photoIds?: string[];
}

// ============================================================================
// Sync Queue Types
// ============================================================================

export interface SyncQueueItem {
  id: string;
  type: "report" | "photo" | "defect" | "element" | "compliance";
  action: "create" | "update" | "delete";
  entityId: string;
  payload: unknown;
  createdAt: string;
  retryCount: number;
  lastError?: string | null;
  priority: number; // Lower number = higher priority
}

// ============================================================================
// Metadata Types
// ============================================================================

export interface OfflineMetadata {
  key: string;
  value: unknown;
}

// Common metadata keys
export type MetadataKey =
  | "lastSyncAt"
  | "lastBootstrapAt"
  | "userId"
  | "deviceId"
  | "syncInProgress"
  | "offlineModeEnabled";

// ============================================================================
// Checklist & Template Types (cached from server)
// ============================================================================

export interface OfflineChecklist {
  id: string;
  name: string;
  category: string;
  standard: string;
  items: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  section: string;
  item: string;
  description: string;
  required?: boolean;
}

export interface OfflineTemplate {
  id: string;
  name: string;
  description?: string | null;
  inspectionType: InspectionType;
  sections: string[];
  checklists?: { compliance?: string[] } | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Sync Response Types
// ============================================================================

export interface SyncUploadPayload {
  reports: ReportSyncData[];
  deviceId: string;
  syncTimestamp: string;
}

export interface ReportSyncData {
  id: string;
  reportNumber: string;
  status: ReportStatus;
  propertyAddress: string;
  propertyCity: string;
  propertyRegion: string;
  propertyPostcode: string;
  propertyType: PropertyType;
  buildingAge?: number | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  inspectionDate: string;
  inspectionType: InspectionType;
  weatherConditions?: string | null;
  accessMethod?: string | null;
  limitations?: string | null;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  scopeOfWorks?: unknown;
  methodology?: unknown;
  findings?: unknown;
  conclusions?: unknown;
  recommendations?: unknown;
  declarationSigned?: boolean;
  signedAt?: string | null;
  clientUpdatedAt: string;
  elements?: ElementSyncData[];
  defects?: DefectSyncData[];
  compliance?: ComplianceSyncData | null;
  photoMetadata?: PhotoMetadataSyncData[];
}

export interface ElementSyncData {
  id: string;
  elementType: ElementType;
  location: string;
  claddingType?: string | null;
  material?: string | null;
  manufacturer?: string | null;
  pitch?: number | null;
  area?: number | null;
  conditionRating?: ConditionRating | null;
  conditionNotes?: string | null;
  clientUpdatedAt?: string;
  _deleted?: boolean;
}

export interface DefectSyncData {
  id: string;
  defectNumber: number;
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
  recommendation?: string | null;
  priorityLevel?: PriorityLevel | null;
  roofElementId?: string | null;
  clientUpdatedAt?: string;
  _deleted?: boolean;
}

export interface ComplianceSyncData {
  id: string;
  checklistResults: Record<string, unknown>;
  nonComplianceSummary?: string | null;
  clientUpdatedAt?: string;
}

export interface PhotoMetadataSyncData {
  id: string;
  photoType: PhotoType;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  capturedAt?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  cameraMake?: string | null;
  cameraModel?: string | null;
  originalHash: string;
  caption?: string | null;
  sortOrder?: number;
  defectId?: string | null;
  roofElementId?: string | null;
  needsUpload?: boolean;
  clientUpdatedAt?: string;
  _deleted?: boolean;
}

export interface SyncUploadResponse {
  success: boolean;
  timestamp: string;
  processingTimeMs: number;
  stats: {
    total: number;
    succeeded: number;
    failed: number;
    conflicts: number;
  };
  results: {
    syncedReports: string[];
    failedReports: Array<{ reportId: string; error: string }>;
    conflicts: Array<{
      reportId: string;
      resolution: string;
      serverUpdatedAt: string;
      clientUpdatedAt: string;
    }>;
    pendingPhotoUploads: Array<{
      reportId: string;
      photoId: string;
      uploadUrl: string;
    }>;
  };
}

export interface BootstrapResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      clerkId: string;
      email: string;
      name: string;
      role: string;
      qualifications?: string | null;
      lbpNumber?: string | null;
      yearsExperience?: number | null;
    };
    checklists: OfflineChecklist[];
    templates: OfflineTemplate[];
    recentReports: Array<{
      id: string;
      reportNumber: string;
      propertyAddress: string;
      propertyCity: string;
      inspectionType: InspectionType;
      status: ReportStatus;
      createdAt: string;
      updatedAt: string;
      photoCount: number;
      defectCount: number;
    }>;
    lastSyncAt: string;
  };
}

// ============================================================================
// Conflict Resolution Types
// ============================================================================

export interface ConflictInfo {
  reportId: string;
  field: string;
  localValue: unknown;
  serverValue: unknown;
  localUpdatedAt: string;
  serverUpdatedAt: string;
}

export type ConflictResolution = "keep_local" | "keep_server" | "merge";

export interface ResolvedConflict {
  reportId: string;
  resolution: ConflictResolution;
  resolvedAt: string;
}
