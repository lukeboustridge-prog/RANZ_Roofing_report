import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: { status: "up" | "down"; latency?: number };
    memory: { status: "ok" | "warning"; used: number; total: number };
  };
}

/**
 * GET /api/health
 * Health check endpoint - rate limited to prevent abuse
 * Note: This endpoint is intentionally public for monitoring services,
 * but rate limited to prevent information disclosure attacks.
 */
export async function GET(request: NextRequest) {
  // Apply strict rate limiting to prevent abuse
  const rateLimitResult = await checkRateLimit(
    request,
    RATE_LIMIT_PRESETS.strict
  );
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }
  const startTime = Date.now();
  const checks: HealthStatus["checks"] = {
    database: { status: "down" },
    memory: { status: "ok", used: 0, total: 0 },
  };

  // Check database connectivity
  let dbError: string | undefined;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "up",
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = { status: "down" };
    dbError = error instanceof Error ? error.message : String(error);
    console.error("[Health] Database check failed:", error);
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  checks.memory = {
    status: usedMB / totalMB > 0.9 ? "warning" : "ok",
    used: usedMB,
    total: totalMB,
  };

  // Determine overall status
  let status: HealthStatus["status"] = "healthy";
  if (checks.database.status === "down") {
    status = "unhealthy";
  } else if (checks.memory.status === "warning") {
    status = "degraded";
  }

  // Return minimal info publicly - don't expose internal details
  const response = {
    status,
    timestamp: new Date().toISOString(),
  };

  const statusCode = status === "healthy" ? 200 : status === "degraded" ? 200 : 503;

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store",
      "X-Response-Time": `${Date.now() - startTime}ms`,
    },
  });
}
