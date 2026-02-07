/**
 * Hand-maintained OpenAPI 3.0 specification for RANZ Roofing Report API.
 * Run `npm run verify:api-docs` to check this spec against actual route files.
 */

import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/admin/docs - Return OpenAPI 3.0 specification
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(openApiSpec);
  } catch (error) {
    console.error("Error serving OpenAPI spec:", error);
    return NextResponse.json(
      { error: "Failed to serve API documentation" },
      { status: 500 }
    );
  }
}

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "RANZ Roofing Report API",
    version: "1.0.0",
    description:
      "REST API for the RANZ Roofing Report platform. Manages ISO 17020-compliant roofing inspection reports, evidence chains, PDF generation, and admin operations. All endpoints require Clerk JWT authentication.",
    contact: {
      name: "RANZ Technical Support",
      email: "support@ranz.org.nz",
    },
  },
  servers: [
    {
      url: "https://reports.ranz.org.nz",
      description: "Production",
    },
    {
      url: "http://localhost:3000",
      description: "Development",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http" as const,
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Clerk JWT token obtained via Clerk authentication",
      },
    },
    schemas: {
      Error: {
        type: "object" as const,
        properties: {
          error: { type: "string" as const, description: "Error message" },
        },
        required: ["error"],
      },
      Report: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const, format: "uuid" },
          reportNumber: { type: "string" as const, example: "RANZ-2025-000001" },
          status: {
            type: "string" as const,
            enum: [
              "DRAFT",
              "SUBMITTED",
              "IN_REVIEW",
              "REVISIONS_REQUIRED",
              "APPROVED",
              "REJECTED",
              "FINALIZED",
            ],
          },
          reportType: {
            type: "string" as const,
            enum: ["QUOTE_REPORT", "MEMBER_INSPECTION", "DISPUTE_REPORT"],
          },
          propertyAddress: { type: "string" as const },
          inspectionDate: {
            type: "string" as const,
            format: "date-time",
          },
          createdAt: { type: "string" as const, format: "date-time" },
          updatedAt: { type: "string" as const, format: "date-time" },
          userId: { type: "string" as const },
        },
      },
      ReportListItem: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          reportNumber: { type: "string" as const },
          status: { type: "string" as const },
          reportType: { type: "string" as const },
          propertyAddress: { type: "string" as const },
          inspectionDate: { type: "string" as const, format: "date-time" },
          updatedAt: { type: "string" as const, format: "date-time" },
        },
      },
      EmailTemplate: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const, format: "uuid" },
          type: {
            type: "string" as const,
            example: "REPORT_SUBMITTED",
            description: "Unique template type identifier",
          },
          name: { type: "string" as const },
          subject: {
            type: "string" as const,
            description: "Subject line with {{variable}} placeholders",
          },
          bodyHtml: {
            type: "string" as const,
            description: "HTML body with {{variable}} placeholders",
          },
          bodyText: {
            type: "string" as const,
            description: "Plain text body with {{variable}} placeholders",
          },
          variables: {
            type: "object" as const,
            additionalProperties: { type: "string" as const },
            description:
              "Map of variable names to their types for template substitution",
          },
          isActive: { type: "boolean" as const },
          createdAt: { type: "string" as const, format: "date-time" },
          updatedAt: { type: "string" as const, format: "date-time" },
        },
      },
      BatchOperation: {
        type: "object" as const,
        properties: {
          action: {
            type: "string" as const,
            enum: ["approve", "reject", "delete", "archive"],
          },
          reportIds: {
            type: "array" as const,
            items: { type: "string" as const },
          },
          reason: {
            type: "string" as const,
            description: "Required for reject action",
          },
        },
        required: ["action", "reportIds"],
      },
      BatchResult: {
        type: "object" as const,
        properties: {
          success: { type: "boolean" as const },
          processed: { type: "integer" as const },
          failed: { type: "integer" as const },
          results: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                id: { type: "string" as const },
                success: { type: "boolean" as const },
                error: { type: "string" as const },
              },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // --- Reports ---
    "/api/reports": {
      get: {
        tags: ["Reports"],
        summary: "List reports",
        description:
          "Returns paginated list of reports. Inspectors see their own reports; admins see all.",
        parameters: [
          {
            name: "page",
            in: "query" as const,
            schema: { type: "integer" as const, default: 1 },
          },
          {
            name: "limit",
            in: "query" as const,
            schema: { type: "integer" as const, default: 10 },
          },
          {
            name: "status",
            in: "query" as const,
            schema: { type: "string" as const },
            description: "Filter by report status",
          },
          {
            name: "search",
            in: "query" as const,
            schema: { type: "string" as const },
            description: "Search by report number or property address",
          },
        ],
        responses: {
          "200": {
            description: "List of reports",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    reports: {
                      type: "array" as const,
                      items: { $ref: "#/components/schemas/ReportListItem" },
                    },
                    total: { type: "integer" as const },
                    page: { type: "integer" as const },
                    totalPages: { type: "integer" as const },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Reports"],
        summary: "Create a new report",
        description: "Creates a new inspection report in DRAFT status.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                properties: {
                  reportType: {
                    type: "string" as const,
                    enum: [
                      "QUOTE_REPORT",
                      "MEMBER_INSPECTION",
                      "DISPUTE_REPORT",
                    ],
                  },
                  propertyAddress: { type: "string" as const },
                  inspectionDate: {
                    type: "string" as const,
                    format: "date-time",
                  },
                },
                required: ["reportType", "propertyAddress"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Report created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Report" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/reports/{id}": {
      get: {
        tags: ["Reports"],
        summary: "Get report by ID",
        description:
          "Returns full report details including defects, photos, compliance assessments.",
        parameters: [
          {
            name: "id",
            in: "path" as const,
            required: true,
            schema: { type: "string" as const },
          },
        ],
        responses: {
          "200": {
            description: "Report details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Report" },
              },
            },
          },
          "404": {
            description: "Report not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Reports"],
        summary: "Update report",
        description:
          "Updates report fields. Only allowed when report is in DRAFT or REVISIONS_REQUIRED status.",
        parameters: [
          {
            name: "id",
            in: "path" as const,
            required: true,
            schema: { type: "string" as const },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                properties: {
                  propertyAddress: { type: "string" as const },
                  inspectionDate: {
                    type: "string" as const,
                    format: "date-time",
                  },
                  status: { type: "string" as const },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Report updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Report" },
              },
            },
          },
          "400": {
            description: "Validation error or invalid status transition",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Report not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Reports"],
        summary: "Delete report",
        description:
          "Deletes a report. Only allowed for DRAFT reports or by admin.",
        parameters: [
          {
            name: "id",
            in: "path" as const,
            required: true,
            schema: { type: "string" as const },
          },
        ],
        responses: {
          "200": {
            description: "Report deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    message: { type: "string" as const },
                  },
                },
              },
            },
          },
          "403": {
            description: "Not authorized to delete",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/reports/{id}/pdf": {
      get: {
        tags: ["Reports", "PDF"],
        summary: "Generate report PDF",
        description:
          "Generates and returns a court-ready ISO 17020-compliant PDF for the report. Uses Puppeteer server-side rendering.",
        parameters: [
          {
            name: "id",
            in: "path" as const,
            required: true,
            schema: { type: "string" as const },
          },
        ],
        responses: {
          "200": {
            description: "PDF file",
            content: {
              "application/pdf": {
                schema: { type: "string" as const, format: "binary" },
              },
            },
          },
          "404": {
            description: "Report not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "PDF generation failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/reports/{id}/export": {
      get: {
        tags: ["Reports", "Export"],
        summary: "Export evidence package",
        description:
          "Generates a ZIP archive containing the report PDF, all evidence photos (with EXIF data), audit log, and SHA-256 hash manifest.",
        parameters: [
          {
            name: "id",
            in: "path" as const,
            required: true,
            schema: { type: "string" as const },
          },
        ],
        responses: {
          "200": {
            description: "ZIP evidence package",
            content: {
              "application/zip": {
                schema: { type: "string" as const, format: "binary" },
              },
            },
          },
          "404": {
            description: "Report not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },

    // --- Admin Batch Operations ---
    "/api/admin/reports/batch": {
      post: {
        tags: ["Admin", "Batch"],
        summary: "Batch report operations",
        description:
          "Perform batch operations on multiple reports. Requires ADMIN or SUPER_ADMIN role.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BatchOperation" },
            },
          },
        },
        responses: {
          "200": {
            description: "Batch operation results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BatchResult" },
              },
            },
          },
          "403": {
            description: "Admin role required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/admin/reports/batch-pdf": {
      post: {
        tags: ["Admin", "Batch", "PDF"],
        summary: "Batch PDF generation",
        description:
          "Generate PDFs for multiple reports in a single request. PDF modules are loaded once per batch for efficiency. Requires ADMIN or SUPER_ADMIN role.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                properties: {
                  reportIds: {
                    type: "array" as const,
                    items: { type: "string" as const },
                  },
                },
                required: ["reportIds"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Batch PDF results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BatchResult" },
              },
            },
          },
          "403": {
            description: "Admin role required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },

    // --- Email Templates ---
    "/api/admin/email-templates": {
      get: {
        tags: ["Admin", "Email Templates"],
        summary: "List all email templates",
        description:
          "Returns all email templates ordered by type. Requires ADMIN or SUPER_ADMIN role.",
        responses: {
          "200": {
            description: "List of email templates",
            content: {
              "application/json": {
                schema: {
                  type: "array" as const,
                  items: { $ref: "#/components/schemas/EmailTemplate" },
                },
              },
            },
          },
          "403": {
            description: "Admin role required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Admin", "Email Templates"],
        summary: "Create a new email template",
        description:
          "Creates a new email template. The type must be unique. Requires ADMIN or SUPER_ADMIN role.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                properties: {
                  type: { type: "string" as const },
                  name: { type: "string" as const },
                  subject: { type: "string" as const },
                  bodyHtml: { type: "string" as const },
                  bodyText: { type: "string" as const },
                  variables: {
                    type: "object" as const,
                    additionalProperties: { type: "string" as const },
                  },
                },
                required: ["type", "name", "subject", "bodyHtml", "bodyText"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Template created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EmailTemplate" },
              },
            },
          },
          "400": {
            description: "Validation error or duplicate type",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/admin/email-templates/{id}": {
      get: {
        tags: ["Admin", "Email Templates"],
        summary: "Get email template by ID",
        description:
          "Returns a single email template. Requires ADMIN or SUPER_ADMIN role.",
        parameters: [
          {
            name: "id",
            in: "path" as const,
            required: true,
            schema: { type: "string" as const },
          },
        ],
        responses: {
          "200": {
            description: "Email template",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EmailTemplate" },
              },
            },
          },
          "404": {
            description: "Template not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Admin", "Email Templates"],
        summary: "Update email template",
        description:
          "Updates an email template. The type field cannot be changed. Returns warnings if required variables are missing from bodyHtml. Requires ADMIN or SUPER_ADMIN role.",
        parameters: [
          {
            name: "id",
            in: "path" as const,
            required: true,
            schema: { type: "string" as const },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                properties: {
                  name: { type: "string" as const },
                  subject: { type: "string" as const },
                  bodyHtml: { type: "string" as const },
                  bodyText: { type: "string" as const },
                  isActive: { type: "boolean" as const },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Template updated (may include warnings array)",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/EmailTemplate" },
                    {
                      type: "object" as const,
                      properties: {
                        warnings: {
                          type: "array" as const,
                          items: { type: "string" as const },
                          description:
                            "Warnings about missing template variables",
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Attempted to change type",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Template not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },

    // --- Notification Archive ---
    "/api/admin/notifications/archive": {
      post: {
        tags: ["Admin", "Notifications"],
        summary: "Archive read notifications",
        description:
          "Archives all read, non-dismissed notifications. Only targets safe-to-archive notifications. Requires ADMIN or SUPER_ADMIN role.",
        responses: {
          "200": {
            description: "Archive results",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const },
                    archived: {
                      type: "integer" as const,
                      description: "Number of notifications archived",
                    },
                  },
                },
              },
            },
          },
          "403": {
            description: "Admin role required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: "Reports",
      description: "Report CRUD, status management, and data retrieval",
    },
    {
      name: "PDF",
      description: "PDF generation for individual and batch reports",
    },
    {
      name: "Export",
      description: "Evidence package export with photos and audit trail",
    },
    {
      name: "Admin",
      description:
        "Administrative operations requiring ADMIN or SUPER_ADMIN role",
    },
    {
      name: "Batch",
      description: "Batch operations for processing multiple reports",
    },
    {
      name: "Email Templates",
      description: "Email notification template management",
    },
    {
      name: "Notifications",
      description: "Notification management and archival",
    },
  ],
};
