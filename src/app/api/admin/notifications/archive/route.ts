import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/admin/notifications/archive - Archive old read notifications
// This endpoint can also be called by Vercel Cron or a scheduled job
// e.g., vercel.json: { "crons": [{ "path": "/api/admin/notifications/archive", "schedule": "0 3 * * 0" }] }
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

    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse optional threshold from request body
    let thresholdDays = 30;
    try {
      const body = await request.json();
      if (body.thresholdDays && typeof body.thresholdDays === "number" && body.thresholdDays > 0) {
        thresholdDays = body.thresholdDays;
      }
    } catch {
      // No body or invalid JSON -- use defaults
    }

    // Check environment variable fallback
    const envDays = process.env.NOTIFICATION_ARCHIVE_DAYS;
    if (envDays && thresholdDays === 30) {
      const parsed = parseInt(envDays, 10);
      if (!isNaN(parsed) && parsed > 0) {
        thresholdDays = parsed;
      }
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

    // Archive old, read, non-dismissed notifications
    const result = await prisma.notification.updateMany({
      where: {
        read: true,
        createdAt: { lt: cutoffDate },
        dismissed: false,
      },
      data: {
        dismissed: true,
      },
    });

    console.log(
      `[Notification Archive] Archived ${result.count} notifications older than ${thresholdDays} days`
    );

    return NextResponse.json({
      archived: result.count,
      thresholdDays,
      cutoffDate: cutoffDate.toISOString(),
    });
  } catch (error) {
    console.error("[Notification Archive] Error:", error);
    return NextResponse.json(
      { error: "Failed to archive notifications" },
      { status: 500 }
    );
  }
}
