import { z } from "zod";
import { InspectionTypeEnum } from "./report";

/**
 * Template Validation Schemas
 * Zod schemas for validating template-related API requests
 */

// Template section schema
export const TemplateSectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Section title is required").max(200),
  description: z.string().max(1000).optional(),
  required: z.boolean().default(false),
  order: z.number().int().min(0),
  fields: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().min(1).max(200),
        type: z.enum(["text", "textarea", "select", "checkbox", "number", "date"]),
        required: z.boolean().default(false),
        options: z.array(z.string()).optional(),
        placeholder: z.string().max(200).optional(),
        helpText: z.string().max(500).optional(),
      })
    )
    .optional(),
});

// Template checklist item schema
export const TemplateChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Checklist item text is required").max(500),
  category: z.string().max(100).optional(),
  required: z.boolean().default(false),
  codeReference: z.string().max(200).optional(),
});

// Template checklist schema
export const TemplateChecklistSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Checklist name is required").max(200),
  description: z.string().max(1000).optional(),
  items: z.array(TemplateChecklistItemSchema),
});

// Create template schema
export const CreateTemplateSchema = z.object({
  name: z
    .string()
    .min(2, "Template name must be at least 2 characters")
    .max(100, "Template name must not exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .optional()
    .nullable(),
  type: InspectionTypeEnum,
  sections: z
    .array(TemplateSectionSchema)
    .min(1, "At least one section is required"),
  checklists: z.array(TemplateChecklistSchema).optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// Update template schema
export const UpdateTemplateSchema = CreateTemplateSchema.partial().extend({
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Apply template schema
export const ApplyTemplateSchema = z.object({
  reportId: z.string().cuid("Invalid report ID"),
  overwriteExisting: z.boolean().default(false),
});

// Clone template schema
export const CloneTemplateSchema = z.object({
  name: z
    .string()
    .min(2, "Template name must be at least 2 characters")
    .max(100, "Template name must not exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .optional()
    .nullable(),
});

export type TemplateSectionInput = z.infer<typeof TemplateSectionSchema>;
export type TemplateChecklistInput = z.infer<typeof TemplateChecklistSchema>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
export type ApplyTemplateInput = z.infer<typeof ApplyTemplateSchema>;
export type CloneTemplateInput = z.infer<typeof CloneTemplateSchema>;
