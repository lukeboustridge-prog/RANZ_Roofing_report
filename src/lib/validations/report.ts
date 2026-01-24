import { z } from "zod";

/**
 * Report Validation Schemas
 * Zod schemas for validating report-related API requests
 */

// Property types enum
export const PropertyTypeEnum = z.enum([
  "RESIDENTIAL_1",
  "RESIDENTIAL_2",
  "RESIDENTIAL_3",
  "COMMERCIAL_LOW",
  "COMMERCIAL_HIGH",
  "INDUSTRIAL",
]);

// Inspection types enum
export const InspectionTypeEnum = z.enum([
  "FULL_INSPECTION",
  "VISUAL_ONLY",
  "NON_INVASIVE",
  "INVASIVE",
  "DISPUTE_RESOLUTION",
  "PRE_PURCHASE",
  "MAINTENANCE_REVIEW",
  "WARRANTY_CLAIM",
]);

// Report status enum
export const ReportStatusEnum = z.enum([
  "DRAFT",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "UNDER_REVIEW",
  "REVISION_REQUIRED",
  "APPROVED",
  "FINALISED",
  "ARCHIVED",
]);

// Create report schema
export const CreateReportSchema = z.object({
  propertyAddress: z
    .string()
    .min(1, "Property address is required")
    .max(200, "Property address must not exceed 200 characters"),
  propertyCity: z
    .string()
    .min(1, "City is required")
    .max(100, "City must not exceed 100 characters"),
  propertyRegion: z
    .string()
    .min(1, "Region is required")
    .max(100, "Region must not exceed 100 characters"),
  propertyPostcode: z
    .string()
    .min(1, "Postcode is required")
    .max(10, "Postcode must not exceed 10 characters"),
  propertyType: PropertyTypeEnum,
  buildingAge: z.number().int().min(0).max(200).optional().nullable(),
  inspectionDate: z.coerce.date(),
  inspectionType: InspectionTypeEnum,
  weatherConditions: z.string().max(500).optional(),
  accessMethod: z.string().max(200).optional(),
  limitations: z.string().max(2000).optional(),
  clientName: z
    .string()
    .min(1, "Client name is required")
    .max(100, "Client name must not exceed 100 characters"),
  clientEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  clientPhone: z
    .string()
    .max(20, "Phone number must not exceed 20 characters")
    .optional(),
  clientCompany: z
    .string()
    .max(100, "Company name must not exceed 100 characters")
    .optional()
    .nullable(),
});

// Update report schema (all fields optional)
export const UpdateReportSchema = CreateReportSchema.partial().extend({
  weatherConditions: z.string().max(500).optional().nullable(),
  temperature: z.number().min(-50).max(60).optional().nullable(),
  accessMethod: z.string().max(200).optional().nullable(),
  limitations: z.string().max(2000).optional().nullable(),
  consentNumber: z.string().max(50).optional().nullable(),
  consentDate: z.coerce.date().optional().nullable(),
  codeOfComplianceDate: z.coerce.date().optional().nullable(),
  engagingParty: z.string().max(200).optional().nullable(),
  scopeOfWorks: z.unknown().optional(),
  methodology: z.unknown().optional(),
  findings: z.unknown().optional(),
  conclusions: z.unknown().optional(),
  recommendations: z.unknown().optional(),
  gpsLat: z.number().min(-90).max(90).optional().nullable(),
  gpsLng: z.number().min(-180).max(180).optional().nullable(),
  status: ReportStatusEnum.optional(),
});

// Submit report schema
export const SubmitReportSchema = z.object({
  declarationSigned: z.literal(true, "Declaration must be signed before submission"),
  signatureUrl: z.string().url("Invalid signature URL").optional(),
});

export type CreateReportInput = z.infer<typeof CreateReportSchema>;
export type UpdateReportInput = z.infer<typeof UpdateReportSchema>;
export type SubmitReportInput = z.infer<typeof SubmitReportSchema>;
