import { z } from "zod";

/**
 * Photo Validation Schemas
 * Zod schemas for validating photo-related API requests
 */

// Photo type enum
export const PhotoTypeEnum = z.enum([
  "OVERVIEW",
  "CONTEXT",
  "DETAIL",
  "SCALE_REFERENCE",
  "INACCESSIBLE",
  "EQUIPMENT",
  "GENERAL",
]);

// Upload photo metadata schema
export const UploadPhotoSchema = z.object({
  photoType: PhotoTypeEnum.default("GENERAL"),
  caption: z
    .string()
    .max(500, "Caption must not exceed 500 characters")
    .optional()
    .nullable(),
  defectId: z.string().cuid().optional().nullable(),
  roofElementId: z.string().cuid().optional().nullable(),
  scaleReference: z
    .string()
    .max(100, "Scale reference must not exceed 100 characters")
    .optional()
    .nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

// Update photo schema
export const UpdatePhotoSchema = z.object({
  photoType: PhotoTypeEnum.optional(),
  caption: z
    .string()
    .max(500, "Caption must not exceed 500 characters")
    .optional()
    .nullable(),
  defectId: z.string().cuid().optional().nullable(),
  roofElementId: z.string().cuid().optional().nullable(),
  scaleReference: z
    .string()
    .max(100, "Scale reference must not exceed 100 characters")
    .optional()
    .nullable(),
  sortOrder: z.number().int().min(0).optional(),
  annotations: z.record(z.string(), z.unknown()).optional().nullable(),
});

// Bulk photo update schema
export const BulkPhotoUpdateSchema = z.object({
  photoIds: z.array(z.string().cuid()).min(1, "At least one photo ID is required"),
  updates: z.object({
    photoType: PhotoTypeEnum.optional(),
    defectId: z.string().cuid().optional().nullable(),
    roofElementId: z.string().cuid().optional().nullable(),
  }),
});

// Photo reorder schema
export const PhotoReorderSchema = z.object({
  photoOrders: z
    .array(
      z.object({
        id: z.string().cuid(),
        sortOrder: z.number().int().min(0),
      })
    )
    .min(1, "At least one photo order is required"),
});

export type UploadPhotoInput = z.infer<typeof UploadPhotoSchema>;
export type UpdatePhotoInput = z.infer<typeof UpdatePhotoSchema>;
export type BulkPhotoUpdateInput = z.infer<typeof BulkPhotoUpdateSchema>;
export type PhotoReorderInput = z.infer<typeof PhotoReorderSchema>;
