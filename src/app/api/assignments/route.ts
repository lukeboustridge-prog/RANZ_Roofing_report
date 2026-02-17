import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { createAndPushNotification } from "@/lib/notifications/push-service";
import { sendAssignmentConfirmationEmail, sendInspectorAssignmentEmail } from "@/lib/email";

const createAssignmentSchema = z.object({
  inspectorId: z.string(),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Invalid email address"),
  clientPhone: z.string().optional(),
  propertyAddress: z.string().min(1, "Property address is required"),
  requestType: z.enum([
    "FULL_INSPECTION",
    "VISUAL_ONLY",
    "NON_INVASIVE",
    "INVASIVE",
    "DISPUTE_RESOLUTION",
    "PRE_PURCHASE",
    "MAINTENANCE_REVIEW",
    "WARRANTY_CLAIM",
  ]),
  urgency: z.enum(["STANDARD", "PRIORITY", "URGENT", "EMERGENCY"]),
  notes: z.string().optional(),
  scheduledDate: z.string().optional(),
});

/**
 * GET /api/assignments - List assignments
 */
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    // Build where clause based on role
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(user.role);
    const where: Record<string, unknown> = isAdmin ? {} : { inspectorId: user.id };

    if (status) {
      where.status = status;
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        include: {
          inspector: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { urgency: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.assignment.count({ where }),
    ]);

    return NextResponse.json({
      assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assignments - Create a new assignment
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admins and reviewers can create assignments
    if (!["ADMIN", "SUPER_ADMIN", "REVIEWER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only administrators can create assignments" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = createAssignmentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify inspector exists
    const inspector = await prisma.user.findUnique({
      where: { id: data.inspectorId },
    });

    if (!inspector || inspector.role !== "INSPECTOR") {
      return NextResponse.json(
        { error: "Invalid inspector" },
        { status: 400 }
      );
    }

    const assignment = await prisma.assignment.create({
      data: {
        inspectorId: data.inspectorId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        propertyAddress: data.propertyAddress,
        requestType: data.requestType,
        urgency: data.urgency,
        notes: data.notes,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        status: "PENDING",
      },
      include: {
        inspector: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send notifications (non-blocking, failures won't break assignment creation)

    // 1. In-app + push notification to inspector
    createAndPushNotification(data.inspectorId, {
      type: "NEW_ASSIGNMENT",
      title: "New Inspection Assignment",
      message: `Inspection requested for ${data.propertyAddress}`,
      link: `/assignments/${assignment.id}`,
      assignmentId: assignment.id,
      metadata: {
        urgency: data.urgency,
        requestType: data.requestType,
      },
    }).catch(err => {
      console.error("[Assignment] Failed to send in-app notification:", err);
    });

    // 2. Email to inspector
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://reports.ranz.co.nz";
    sendInspectorAssignmentEmail(inspector.email, {
      inspectorName: inspector.name || "Inspector",
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      propertyAddress: data.propertyAddress,
      requestType: data.requestType,
      urgency: data.urgency,
      scheduledDate: data.scheduledDate || undefined,
      assignmentUrl: `${baseUrl}/assignments/${assignment.id}`,
      notes: data.notes || undefined,
    }).catch(err => {
      console.error("[Assignment] Failed to send inspector email:", err);
    });

    // 3. Confirmation email to client
    sendAssignmentConfirmationEmail(data.clientEmail, {
      clientName: data.clientName,
      propertyAddress: data.propertyAddress,
      inspectorName: inspector.name || "RANZ Inspector",
      requestType: data.requestType,
      urgency: data.urgency,
      scheduledDate: data.scheduledDate || undefined,
    }).catch(err => {
      console.error("[Assignment] Failed to send client confirmation:", err);
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}
