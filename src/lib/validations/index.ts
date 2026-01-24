/**
 * Validation Schemas Index
 * Central export for all Zod validation schemas
 */

// Report validations
export {
  PropertyTypeEnum,
  InspectionTypeEnum,
  ReportStatusEnum,
  CreateReportSchema,
  UpdateReportSchema,
  SubmitReportSchema,
  type CreateReportInput,
  type UpdateReportInput,
  type SubmitReportInput,
} from "./report";

// Defect validations
export {
  DefectClassEnum,
  DefectSeverityEnum,
  PriorityLevelEnum,
  CreateDefectSchema,
  UpdateDefectSchema,
  DefectPhotoLinkSchema,
  type CreateDefectInput,
  type UpdateDefectInput,
  type DefectPhotoLinkInput,
} from "./defect";

// Photo validations
export {
  PhotoTypeEnum,
  UploadPhotoSchema,
  UpdatePhotoSchema,
  BulkPhotoUpdateSchema,
  PhotoReorderSchema,
  type UploadPhotoInput,
  type UpdatePhotoInput,
  type BulkPhotoUpdateInput,
  type PhotoReorderInput,
} from "./photo";

// Roof element validations
export {
  ElementTypeEnum,
  ConditionRatingEnum,
  CreateRoofElementSchema,
  UpdateRoofElementSchema,
  BulkCreateRoofElementsSchema,
  type CreateRoofElementInput,
  type UpdateRoofElementInput,
  type BulkCreateRoofElementsInput,
} from "./roof-element";

// Template validations
export {
  TemplateSectionSchema,
  TemplateChecklistSchema,
  TemplateChecklistItemSchema,
  CreateTemplateSchema,
  UpdateTemplateSchema,
  ApplyTemplateSchema,
  CloneTemplateSchema,
  type TemplateSectionInput,
  type TemplateChecklistInput,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type ApplyTemplateInput,
  type CloneTemplateInput,
} from "./template";

// Utility function to format Zod errors for API responses
import { ZodError, ZodIssue } from "zod";

export function formatZodError(error: ZodError): {
  message: string;
  errors: Array<{ field: string; message: string }>;
} {
  const errors = error.issues.map((issue: ZodIssue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

  return {
    message: "Validation failed",
    errors,
  };
}

// Utility function for safe parsing with formatted errors
export function validateWithSchema<T>(
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: ZodError } },
  data: unknown
): { success: true; data: T } | { success: false; error: ReturnType<typeof formatZodError> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as T };
  }

  return { success: false, error: formatZodError(result.error as ZodError) };
}
