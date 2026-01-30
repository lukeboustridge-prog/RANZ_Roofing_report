import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const createNotificationSchema = z.object({
  type: z.enum([
    // Report-related
    "REPORT_SUBMITTED",
    "REPORT_APPROVED",
    "REPORT_REJECTED",
    "REPORT_COMMENTS",
    "REPORT_FINALIZED",
    "REPORT_SHARED",
    // Assignment-related
    "NEW_ASSIGNMENT",
    "ASSIGNMENT_REMINDER",
    "ASSIGNMENT_CANCELLED",
    // System notifications
    "SYSTEM_ANNOUNCEMENT",
    "SYSTEM_MAINTENANCE",
    "ACCOUNT_UPDATE",
    // Onboarding
    "WELCOME",
  ]),
  title: z.string().min(1),
  message: z.string().min(1),
  link: z.string().optional(),
  reportId: z.string().optional(),
  assignmentId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/notifications - List notifications for current user
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Get notifications
    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: user.id,
          dismissed: false,
          ...(unreadOnly && { read: false }),
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 100),
        skip: offset,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          link: true,
          reportId: true,
          assignmentId: true,
          read: true,
          readAt: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: {
          userId: user.id,
          dismissed: false,
        },
      }),
      prisma.notification.count({
        where: {
          userId: user.id,
          dismissed: false,
          read: false,
        },
      }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        total: totalCount,
        unread: unreadCount,
        limit,
        offset,
        hasMore: offset + notifications.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a notification (internal use or admin)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createNotificationSchema.parse(body);

    // For user-created notifications (like welcome), create for self
    // For admin notifications, they can specify targetUserId
    const targetUserId = body.targetUserId || user.id;

    // Only admins can create notifications for other users
    if (targetUserId !== user.id && !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Not authorized to create notifications for other users" },
        { status: 403 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        link: validatedData.link,
        reportId: validatedData.reportId,
        assignmentId: validatedData.assignmentId,
        metadata: validatedData.metadata as object | undefined,
      },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        createdAt: true,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("Error creating notification:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}
