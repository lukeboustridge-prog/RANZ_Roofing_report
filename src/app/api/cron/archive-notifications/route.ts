import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/cron/archive-notifications - Vercel Cron handler
// Scheduled weekly (Sunday 3am UTC) via vercel.json
export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Configurable threshold (default 30 days)
    const envDays = process.env.NOTIFICATION_ARCHIVE_DAYS;
    let thresholdDays = 30;
    if (envDays) {
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
      `[Cron] Archived ${result.count} notifications older than ${thresholdDays} days`
    );

    return NextResponse.json({
      ok: true,
      archived: result.count,
      thresholdDays,
      cutoffDate: cutoffDate.toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Archive notifications error:", error);
    return NextResponse.json(
      { error: "Failed to archive notifications" },
      { status: 500 }
    );
  }
}
