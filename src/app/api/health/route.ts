import { NextResponse } from "next/server";
import prisma from "@/lib/db";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: { status: "up" | "down"; latency?: number };
    memory: { status: "ok" | "warning"; used: number; total: number };
  };
}

export async function GET() {
  const startTime = Date.now();
  const checks: HealthStatus["checks"] = {
    database: { status: "down" },
    memory: { status: "ok", used: 0, total: 0 },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "up",
      latency: Date.now() - dbStart,
    };
  } catch {
    checks.database = { status: "down" };
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

  const response: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    checks,
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
