import { z } from "zod";

/**
 * Roof Element Validation Schemas
 * Zod schemas for validating roof element-related API requests
 */

// Element type enum
export const ElementTypeEnum = z.enum([
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
  "FLASHING_PARAPET",
  "SKYLIGHT",
  "VENT",
  "ANTENNA_MOUNT",
  "SOLAR_PANEL",
  "UNDERLAY",
  "INSULATION",
  "ROOF_STRUCTURE",
  "OTHER",
]);

// Condition rating enum
export const ConditionRatingEnum = z.enum([
  "GOOD",
  "FAIR",
  "POOR",
  "CRITICAL",
  "NOT_INSPECTED",
]);

// Create roof element schema
export const CreateRoofElementSchema = z.object({
  elementType: ElementTypeEnum,
  location: z
    .string()
    .min(2, "Location must be at least 2 characters")
    .max(200, "Location must not exceed 200 characters"),
  claddingType: z
    .string()
    .max(100, "Cladding type must not exceed 100 characters")
    .optional()
    .nullable(),
  claddingProfile: z
    .string()
    .max(100, "Cladding profile must not exceed 100 characters")
    .optional()
    .nullable(),
  material: z
    .string()
    .max(100, "Material must not exceed 100 characters")
    .optional()
    .nullable(),
  manufacturer: z
    .string()
    .max(100, "Manufacturer must not exceed 100 characters")
    .optional()
    .nullable(),
  colour: z
    .string()
    .max(50, "Colour must not exceed 50 characters")
    .optional()
    .nullable(),
  pitch: z
    .number()
    .min(0, "Pitch must be at least 0 degrees")
    .max(90, "Pitch must not exceed 90 degrees")
    .optional()
    .nullable(),
  area: z
    .number()
    .min(0, "Area must be a positive number")
    .max(100000, "Area must not exceed 100,000 sqm")
    .optional()
    .nullable(),
  ageYears: z
    .number()
    .int()
    .min(0, "Age must be a positive number")
    .max(200, "Age must not exceed 200 years")
    .optional()
    .nullable(),
  conditionRating: ConditionRatingEnum.optional().nullable(),
  conditionNotes: z
    .string()
    .max(2000, "Condition notes must not exceed 2000 characters")
    .optional()
    .nullable(),
  meetsCop: z.boolean().optional().nullable(),
  meetsE2: z.boolean().optional().nullable(),
});

// Update roof element schema (all fields optional)
export const UpdateRoofElementSchema = CreateRoofElementSchema.partial();

// Bulk create roof elements schema
export const BulkCreateRoofElementsSchema = z.object({
  elements: z
    .array(CreateRoofElementSchema)
    .min(1, "At least one element is required")
    .max(50, "Cannot create more than 50 elements at once"),
});

export type CreateRoofElementInput = z.infer<typeof CreateRoofElementSchema>;
export type UpdateRoofElementInput = z.infer<typeof UpdateRoofElementSchema>;
export type BulkCreateRoofElementsInput = z.infer<typeof BulkCreateRoofElementsSchema>;
