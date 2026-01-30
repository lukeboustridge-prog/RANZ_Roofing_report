/**
 * POST /api/sync/upload
 * Upload sync endpoint for mobile app data synchronization
 * Handles reports, elements, defects, compliance, and photo metadata
 */

import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getPresignedUploadUrl, generatePhotoKey } from "@/lib/r2";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ============================================================================
// Zod Schemas
// ============================================================================

const ReportStatusEnum = z.enum([
  "DRAFT",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "APPROVED",
  "FINALISED",
]);

const PropertyTypeEnum = z.enum([
  "RESIDENTIAL_1",
  "RESIDENTIAL_2",
  "RESIDENTIAL_3",
  "COMMERCIAL_LOW",
  "COMMERCIAL_HIGH",
  "INDUSTRIAL",
]);

const InspectionTypeEnum = z.enum([
  "FULL_INSPECTION",
  "VISUAL_ONLY",
  "NON_INVASIVE",
  "INVASIVE",
  "DISPUTE_RESOLUTION",
  "PRE_PURCHASE",
  "MAINTENANCE_REVIEW",
]);

const ElementTypeEnum = z.enum([
  "ROOF_CLADDING",
  "RIDGE",
  "VALLEY",
  "HIP",
  "BARGE",
  "FASCIA",
  "GUTTER",
  "DOWNPIPE",
  "FLASHING_WALL",
  "FLASHING_PENETRATION",
  "SKYLIGHT",
  "VENT",
  "OTHER",
]);

const ConditionRatingEnum = z.enum([
  "GOOD",
  "FAIR",
  "POOR",
  "CRITICAL",
  "NOT_INSPECTED",
]);

const DefectClassEnum = z.enum([
  "MAJOR_DEFECT",
  "MINOR_DEFECT",
  "SAFETY_HAZARD",
  "MAINTENANCE_ITEM",
]);

const DefectSeverityEnum = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

const PriorityLevelEnum = z.enum([
  "IMMEDIATE",
  "SHORT_TERM",
  "MEDIUM_TERM",
  "LONG_TERM",
]);

const PhotoTypeEnum = z.enum([
  "OVERVIEW",
  "CONTEXT",
  "DETAIL",
  "SCALE_REFERENCE",
  "GENERAL",
]);

// Photo metadata schema (no binary, just metadata for sync)
const photoMetadataSchema = z.object({
  id: z.string(),
  photoType: PhotoTypeEnum,
  filename: z.string(),
  originalFilename: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  capturedAt: z.string().nullable().optional(),
  gpsLat: z.number().nullable().optional(),
  gpsLng: z.number().nullable().optional(),
  cameraMake: z.string().nullable().optional(),
  cameraModel: z.string().nullable().optional(),
  originalHash: z.string(),
  caption: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  defectId: z.string().nullable().optional(),
  roofElementId: z.string().nullable().optional(),
  needsUpload: z.boolean().optional(), // True if binary needs to be uploaded
  clientUpdatedAt: z.string().optional(),
  _deleted: z.boolean().optional(),
});

// Roof element schema
const roofElementSchema = z.object({
  id: z.string(),
  elementType: ElementTypeEnum,
  location: z.string(),
  claddingType: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  manufacturer: z.string().nullable().optional(),
  pitch: z.number().nullable().optional(),
  area: z.number().nullable().optional(),
  conditionRating: ConditionRatingEnum.nullable().optional(),
  conditionNotes: z.string().nullable().optional(),
  clientUpdatedAt: z.string().optional(),
  _deleted: z.boolean().optional(),
});

// Defect schema
const defectSchema = z.object({
  id: z.string(),
  defectNumber: z.number(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  classification: DefectClassEnum,
  severity: DefectSeverityEnum,
  observation: z.string(),
  analysis: z.string().nullable().optional(),
  opinion: z.string().nullable().optional(),
  codeReference: z.string().nullable().optional(),
  copReference: z.string().nullable().optional(),
  recommendation: z.string().nullable().optional(),
  priorityLevel: PriorityLevelEnum.nullable().optional(),
  roofElementId: z.string().nullable().optional(),
  clientUpdatedAt: z.string().optional(),
  _deleted: z.boolean().optional(),
});

// Compliance assessment schema
const complianceAssessmentSchema = z.object({
  id: z.string(),
  checklistResults: z.record(z.string(), z.unknown()),
  nonComplianceSummary: z.string().nullable().optional(),
  clientUpdatedAt: z.string().optional(),
});

// Report sync schema
const reportSyncSchema = z.object({
  id: z.string(),
  reportNumber: z.string().regex(/^RANZ-\d{4}-\d{5}$/),
  status: ReportStatusEnum,
  propertyAddress: z.string(),
  propertyCity: z.string(),
  propertyRegion: z.string(),
  propertyPostcode: z.string(),
  propertyType: PropertyTypeEnum,
  buildingAge: z.number().nullable().optional(),
  gpsLat: z.number().nullable().optional(),
  gpsLng: z.number().nullable().optional(),
  inspectionDate: z.string(),
  inspectionType: InspectionTypeEnum,
  weatherConditions: z.string().nullable().optional(),
  accessMethod: z.string().nullable().optional(),
  limitations: z.string().nullable().optional(),
  clientName: z.string(),
  clientEmail: z.string().nullable().optional(),
  clientPhone: z.string().nullable().optional(),
  scopeOfWorks: z.unknown().nullable().optional(),
  methodology: z.unknown().nullable().optional(),
  findings: z.unknown().nullable().optional(),
  conclusions: z.unknown().nullable().optional(),
  recommendations: z.unknown().nullable().optional(),
  declarationSigned: z.boolean().optional(),
  signedAt: z.string().nullable().optional(),
  clientUpdatedAt: z.string(),
  elements: z.array(roofElementSchema).optional(),
  defects: z.array(defectSchema).optional(),
  compliance: complianceAssessmentSchema.nullable().optional(),
  photoMetadata: z.array(photoMetadataSchema).optional(),
});

// Main payload schema
const syncUploadPayloadSchema = z.object({
  reports: z.array(reportSyncSchema),
  deviceId: z.string(),
  syncTimestamp: z.string(),
});

// ============================================================================
// Types
// ============================================================================

type SyncUploadPayload = z.infer<typeof syncUploadPayloadSchema>;
type ReportSync = z.infer<typeof reportSyncSchema>;

interface SyncStats {
  total: number;
  succeeded: number;
  failed: number;
  conflicts: number;
}

interface ConflictInfo {
  reportId: string;
  resolution: string;
  serverUpdatedAt: string;
  clientUpdatedAt: string;
}

interface PendingPhotoUpload {
  reportId: string;
  photoId: string;
  uploadUrl: string;
}

interface FailedReport {
  reportId: string;
  error: string;
}

interface SyncUploadResponse {
  success: boolean;
  timestamp: string;
  processingTimeMs: number;
  stats: SyncStats;
  results: {
    syncedReports: string[];
    failedReports: FailedReport[];
    conflicts: ConflictInfo[];
    pendingPhotoUploads: PendingPhotoUpload[];
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a value to Prisma-compatible JSON input
 * Returns Prisma.JsonNull for null/undefined, otherwise returns the value
 */
function toJsonInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

/**
 * Check if a report can be modified based on its status
 */
function canModifyReport(status: string): boolean {
  return !["FINALISED", "APPROVED"].includes(status);
}

/**
 * Detect if there's a conflict between client and server timestamps
 */
function detectConflict(
  serverUpdatedAt: Date,
  clientUpdatedAt: string
): boolean {
  const clientDate = new Date(clientUpdatedAt);
  // Allow 1 second tolerance for timestamp differences
  return serverUpdatedAt.getTime() > clientDate.getTime() + 1000;
}

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse and validate payload
    const body = await request.json();
    const parseResult = syncUploadPayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const payload: SyncUploadPayload = parseResult.data;

    // Initialize tracking
    const stats: SyncStats = {
      total: payload.reports.length,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
    };

    const syncedReports: string[] = [];
    const failedReports: FailedReport[] = [];
    const conflicts: ConflictInfo[] = [];
    const pendingPhotoUploads: PendingPhotoUpload[] = [];

    // Process each report
    for (const reportData of payload.reports) {
      try {
        const result = await processReport(
          reportData,
          user.id,
          payload.deviceId,
          conflicts,
          pendingPhotoUploads
        );

        if (result.success) {
          syncedReports.push(reportData.id);
          stats.succeeded++;
          if (result.hadConflict) {
            stats.conflicts++;
          }
        } else {
          failedReports.push({
            reportId: reportData.id,
            error: result.error || "Unknown error",
          });
          stats.failed++;
        }
      } catch (error) {
        console.error(`Error processing report ${reportData.id}:`, error);
        failedReports.push({
          reportId: reportData.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        stats.failed++;
      }
    }

    const processingTimeMs = Date.now() - startTime;

    const response: SyncUploadResponse = {
      success: stats.failed === 0,
      timestamp: new Date().toISOString(),
      processingTimeMs,
      stats,
      results: {
        syncedReports,
        failedReports,
        conflicts,
        pendingPhotoUploads,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in sync upload endpoint:", error);
    return NextResponse.json(
      { error: "Failed to process sync upload" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Report Processing
// ============================================================================

interface ProcessResult {
  success: boolean;
  hadConflict: boolean;
  error?: string;
}

async function processReport(
  reportData: ReportSync,
  inspectorId: string,
  deviceId: string,
  conflicts: ConflictInfo[],
  pendingPhotoUploads: PendingPhotoUpload[]
): Promise<ProcessResult> {
  // Check if report exists
  const existingReport = await prisma.report.findUnique({
    where: { id: reportData.id },
    include: {
      roofElements: true,
      defects: true,
      photos: true,
      complianceAssessment: true,
    },
  });

  // If report exists, verify ownership
  if (existingReport && existingReport.inspectorId !== inspectorId) {
    return {
      success: false,
      hadConflict: false,
      error: "Access denied: You do not own this report",
    };
  }

  // Check if report can be modified
  if (existingReport && !canModifyReport(existingReport.status)) {
    return {
      success: false,
      hadConflict: false,
      error: `Cannot modify report with status: ${existingReport.status}`,
    };
  }

  // Detect conflict (server has newer data)
  let hadConflict = false;
  if (existingReport) {
    hadConflict = detectConflict(
      existingReport.updatedAt,
      reportData.clientUpdatedAt
    );

    if (hadConflict) {
      conflicts.push({
        reportId: reportData.id,
        resolution: "last-write-wins",
        serverUpdatedAt: existingReport.updatedAt.toISOString(),
        clientUpdatedAt: reportData.clientUpdatedAt,
      });
    }
  }

  // Process in transaction
  await prisma.$transaction(async (tx) => {
    // Upsert report
    await tx.report.upsert({
      where: { id: reportData.id },
      create: {
        id: reportData.id,
        reportNumber: reportData.reportNumber,
        status: reportData.status,
        propertyAddress: reportData.propertyAddress,
        propertyCity: reportData.propertyCity,
        propertyRegion: reportData.propertyRegion,
        propertyPostcode: reportData.propertyPostcode,
        propertyType: reportData.propertyType,
        buildingAge: reportData.buildingAge ?? null,
        gpsLat: reportData.gpsLat ?? null,
        gpsLng: reportData.gpsLng ?? null,
        inspectionDate: new Date(reportData.inspectionDate),
        inspectionType: reportData.inspectionType,
        weatherConditions: reportData.weatherConditions ?? null,
        accessMethod: reportData.accessMethod ?? null,
        limitations: reportData.limitations ?? null,
        clientName: reportData.clientName,
        clientEmail: reportData.clientEmail ?? null,
        clientPhone: reportData.clientPhone ?? null,
        scopeOfWorks: toJsonInput(reportData.scopeOfWorks),
        methodology: toJsonInput(reportData.methodology),
        findings: toJsonInput(reportData.findings),
        conclusions: toJsonInput(reportData.conclusions),
        recommendations: toJsonInput(reportData.recommendations),
        declarationSigned: reportData.declarationSigned ?? false,
        signedAt: reportData.signedAt ? new Date(reportData.signedAt) : null,
        inspectorId,
      },
      update: {
        status: reportData.status,
        propertyAddress: reportData.propertyAddress,
        propertyCity: reportData.propertyCity,
        propertyRegion: reportData.propertyRegion,
        propertyPostcode: reportData.propertyPostcode,
        propertyType: reportData.propertyType,
        buildingAge: reportData.buildingAge ?? null,
        gpsLat: reportData.gpsLat ?? null,
        gpsLng: reportData.gpsLng ?? null,
        inspectionDate: new Date(reportData.inspectionDate),
        inspectionType: reportData.inspectionType,
        weatherConditions: reportData.weatherConditions ?? null,
        accessMethod: reportData.accessMethod ?? null,
        limitations: reportData.limitations ?? null,
        clientName: reportData.clientName,
        clientEmail: reportData.clientEmail ?? null,
        clientPhone: reportData.clientPhone ?? null,
        scopeOfWorks: toJsonInput(reportData.scopeOfWorks),
        methodology: toJsonInput(reportData.methodology),
        findings: toJsonInput(reportData.findings),
        conclusions: toJsonInput(reportData.conclusions),
        recommendations: toJsonInput(reportData.recommendations),
        declarationSigned: reportData.declarationSigned ?? false,
        signedAt: reportData.signedAt ? new Date(reportData.signedAt) : null,
      },
    });

    // Process roof elements
    if (reportData.elements) {
      for (const element of reportData.elements) {
        if (element._deleted) {
          // Delete element
          await tx.roofElement.deleteMany({
            where: { id: element.id, reportId: reportData.id },
          });
        } else {
          // Upsert element
          await tx.roofElement.upsert({
            where: { id: element.id },
            create: {
              id: element.id,
              reportId: reportData.id,
              elementType: element.elementType,
              location: element.location,
              claddingType: element.claddingType ?? null,
              material: element.material ?? null,
              manufacturer: element.manufacturer ?? null,
              pitch: element.pitch ?? null,
              area: element.area ?? null,
              conditionRating: element.conditionRating ?? null,
              conditionNotes: element.conditionNotes ?? null,
            },
            update: {
              elementType: element.elementType,
              location: element.location,
              claddingType: element.claddingType ?? null,
              material: element.material ?? null,
              manufacturer: element.manufacturer ?? null,
              pitch: element.pitch ?? null,
              area: element.area ?? null,
              conditionRating: element.conditionRating ?? null,
              conditionNotes: element.conditionNotes ?? null,
            },
          });
        }
      }
    }

    // Process defects
    if (reportData.defects) {
      for (const defect of reportData.defects) {
        if (defect._deleted) {
          // Delete defect
          await tx.defect.deleteMany({
            where: { id: defect.id, reportId: reportData.id },
          });
        } else {
          // Upsert defect
          await tx.defect.upsert({
            where: { id: defect.id },
            create: {
              id: defect.id,
              reportId: reportData.id,
              defectNumber: defect.defectNumber,
              title: defect.title,
              description: defect.description,
              location: defect.location,
              classification: defect.classification,
              severity: defect.severity,
              observation: defect.observation,
              analysis: defect.analysis ?? null,
              opinion: defect.opinion ?? null,
              codeReference: defect.codeReference ?? null,
              copReference: defect.copReference ?? null,
              recommendation: defect.recommendation ?? null,
              priorityLevel: defect.priorityLevel ?? null,
              roofElementId: defect.roofElementId ?? null,
            },
            update: {
              defectNumber: defect.defectNumber,
              title: defect.title,
              description: defect.description,
              location: defect.location,
              classification: defect.classification,
              severity: defect.severity,
              observation: defect.observation,
              analysis: defect.analysis ?? null,
              opinion: defect.opinion ?? null,
              codeReference: defect.codeReference ?? null,
              copReference: defect.copReference ?? null,
              recommendation: defect.recommendation ?? null,
              priorityLevel: defect.priorityLevel ?? null,
              roofElementId: defect.roofElementId ?? null,
            },
          });
        }
      }
    }

    // Process compliance assessment
    if (reportData.compliance) {
      await tx.complianceAssessment.upsert({
        where: { reportId: reportData.id },
        create: {
          id: reportData.compliance.id,
          reportId: reportData.id,
          checklistResults: toJsonInput(reportData.compliance.checklistResults),
          nonComplianceSummary: reportData.compliance.nonComplianceSummary ?? null,
        },
        update: {
          checklistResults: toJsonInput(reportData.compliance.checklistResults),
          nonComplianceSummary: reportData.compliance.nonComplianceSummary ?? null,
        },
      });
    }

    // Process photo metadata (not binaries)
    if (reportData.photoMetadata) {
      for (const photo of reportData.photoMetadata) {
        if (photo._deleted) {
          // Delete photo record (R2 cleanup handled separately)
          await tx.photo.deleteMany({
            where: { id: photo.id, reportId: reportData.id },
          });
        } else {
          // Check if photo exists
          const existingPhoto = await tx.photo.findUnique({
            where: { id: photo.id },
          });

          if (existingPhoto) {
            // Update metadata only (don't touch URL if exists)
            await tx.photo.update({
              where: { id: photo.id },
              data: {
                photoType: photo.photoType,
                caption: photo.caption ?? null,
                sortOrder: photo.sortOrder ?? 0,
                defectId: photo.defectId ?? null,
                roofElementId: photo.roofElementId ?? null,
              },
            });
          } else if (photo.needsUpload) {
            // New photo - create record with placeholder URL
            // Binary upload will happen via presigned URL
            const photoKey = generatePhotoKey(reportData.id, photo.originalFilename);

            await tx.photo.create({
              data: {
                id: photo.id,
                reportId: reportData.id,
                filename: photoKey.split("/").pop()!,
                originalFilename: photo.originalFilename,
                mimeType: photo.mimeType,
                fileSize: photo.fileSize,
                url: "", // Will be updated after binary upload
                photoType: photo.photoType,
                capturedAt: photo.capturedAt ? new Date(photo.capturedAt) : null,
                gpsLat: photo.gpsLat ?? null,
                gpsLng: photo.gpsLng ?? null,
                cameraMake: photo.cameraMake ?? null,
                cameraModel: photo.cameraModel ?? null,
                originalHash: photo.originalHash,
                hashVerified: false,
                caption: photo.caption ?? null,
                sortOrder: photo.sortOrder ?? 0,
                defectId: photo.defectId ?? null,
                roofElementId: photo.roofElementId ?? null,
              },
            });
          }
        }
      }
    }

    // Create audit log entry
    await tx.auditLog.create({
      data: {
        reportId: reportData.id,
        userId: inspectorId,
        action: existingReport ? "UPDATED" : "CREATED",
        details: {
          source: "mobile_sync",
          deviceId,
          clientUpdatedAt: reportData.clientUpdatedAt,
          hadConflict,
          elementsCount: reportData.elements?.length ?? 0,
          defectsCount: reportData.defects?.length ?? 0,
          photosCount: reportData.photoMetadata?.length ?? 0,
        },
      },
    });
  });

  // Generate presigned URLs for photos that need upload (outside transaction)
  if (reportData.photoMetadata) {
    for (const photo of reportData.photoMetadata) {
      if (photo.needsUpload && !photo._deleted) {
        try {
          const photoKey = generatePhotoKey(reportData.id, photo.originalFilename);
          const uploadUrl = await getPresignedUploadUrl(photoKey, photo.mimeType);

          pendingPhotoUploads.push({
            reportId: reportData.id,
            photoId: photo.id,
            uploadUrl,
          });
        } catch (error) {
          console.error(`Failed to generate presigned URL for photo ${photo.id}:`, error);
        }
      }
    }
  }

  return { success: true, hadConflict };
}
