import { z } from "zod";

/**
 * Defect Validation Schemas
 * Zod schemas for validating defect-related API requests
 */

// Defect classification enum
export const DefectClassEnum = z.enum([
  "MAJOR_DEFECT",
  "MINOR_DEFECT",
  "SAFETY_HAZARD",
  "MAINTENANCE_ITEM",
  "WORKMANSHIP_ISSUE",
]);

// Defect severity enum
export const DefectSeverityEnum = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
]);

// Priority level enum
export const PriorityLevelEnum = z.enum([
  "IMMEDIATE",
  "SHORT_TERM",
  "MEDIUM_TERM",
  "LONG_TERM",
]);

// Create defect schema
export const CreateDefectSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must not exceed 200 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must not exceed 5000 characters"),
  location: z
    .string()
    .min(2, "Location must be at least 2 characters")
    .max(200, "Location must not exceed 200 characters"),
  classification: DefectClassEnum,
  severity: DefectSeverityEnum,
  observation: z
    .string()
    .min(10, "Observation must be at least 10 characters")
    .max(5000, "Observation must not exceed 5000 characters"),
  analysis: z
    .string()
    .max(5000, "Analysis must not exceed 5000 characters")
    .optional()
    .nullable(),
  opinion: z
    .string()
    .max(5000, "Opinion must not exceed 5000 characters")
    .optional()
    .nullable(),
  codeReference: z
    .string()
    .max(200, "Code reference must not exceed 200 characters")
    .optional()
    .nullable(),
  copReference: z
    .string()
    .max(200, "COP reference must not exceed 200 characters")
    .optional()
    .nullable(),
  probableCause: z
    .string()
    .max(2000, "Probable cause must not exceed 2000 characters")
    .optional()
    .nullable(),
  contributingFactors: z
    .string()
    .max(2000, "Contributing factors must not exceed 2000 characters")
    .optional()
    .nullable(),
  recommendation: z
    .string()
    .max(2000, "Recommendation must not exceed 2000 characters")
    .optional()
    .nullable(),
  priorityLevel: PriorityLevelEnum.optional().nullable(),
  estimatedCost: z
    .string()
    .max(100, "Estimated cost must not exceed 100 characters")
    .optional()
    .nullable(),
  roofElementId: z.string().cuid().optional().nullable(),
  photoIds: z.array(z.string().cuid()).optional(),
  measurements: z.record(z.string(), z.unknown()).optional().nullable(),
});

// Update defect schema (all fields optional)
export const UpdateDefectSchema = CreateDefectSchema.partial();

// Defect photo link schema
export const DefectPhotoLinkSchema = z.object({
  photoIds: z.array(z.string().cuid()).min(1, "At least one photo ID is required"),
});

export type CreateDefectInput = z.infer<typeof CreateDefectSchema>;
export type UpdateDefectInput = z.infer<typeof UpdateDefectSchema>;
export type DefectPhotoLinkInput = z.infer<typeof DefectPhotoLinkSchema>;
