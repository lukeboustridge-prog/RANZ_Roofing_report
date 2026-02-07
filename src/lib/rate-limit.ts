import { NextRequest, NextResponse } from "next/server";

/**
 * Rate Limiting Utility
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * are configured. Falls back to in-memory store for local development.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowInSeconds: number;
  /** Identifier function - extracts unique identifier from request */
  identifier?: (request: NextRequest) => string;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// ---------------------------------------------------------------------------
// Identifier helpers
// ---------------------------------------------------------------------------

function defaultIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();

  return "anonymous";
}

// ---------------------------------------------------------------------------
// Upstash Redis rate limiter (production)
// ---------------------------------------------------------------------------

let upstashLimiters: Map<string, import("@upstash/ratelimit").Ratelimit> | null =
  null;

function getUpstashLimiter(
  key: string,
  limit: number,
  windowInSeconds: number
): import("@upstash/ratelimit").Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  if (!upstashLimiters) upstashLimiters = new Map();

  const cacheKey = `${key}:${limit}:${windowInSeconds}`;
  if (upstashLimiters.has(cacheKey)) return upstashLimiters.get(cacheKey)!;

  // Dynamic import is avoided here since this runs on every request.
  // The packages are imported at module level with lazy init.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Ratelimit } = require("@upstash/ratelimit");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require("@upstash/redis");

    const redis = new Redis({ url, token });
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowInSeconds} s`),
      prefix: `ranz:ratelimit:${key}`,
    });
    upstashLimiters.set(cacheKey, limiter);
    return limiter;
  } catch {
    return null;
  }
}

async function checkUpstashRateLimit(
  id: string,
  limiterKey: string,
  options: RateLimitOptions
): Promise<RateLimitResult | null> {
  const limiter = getUpstashLimiter(
    limiterKey,
    options.limit,
    options.windowInSeconds
  );
  if (!limiter) return null;

  const result = await limiter.limit(id);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

// ---------------------------------------------------------------------------
// In-memory fallback (development / single-instance)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
let cleanupScheduled = false;

function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) rateLimitStore.delete(key);
    }
  }, 60_000);
}

function checkMemoryRateLimit(
  id: string,
  options: RateLimitOptions
): RateLimitResult {
  scheduleCleanup();

  const { limit, windowInSeconds } = options;
  const now = Date.now();
  const windowMs = windowInSeconds * 1000;

  let entry = rateLimitStore.get(id);

  if (!entry || entry.resetTime < now) {
    entry = { count: 1, resetTime: now + windowMs };
    rateLimitStore.set(id, entry);
    return { success: true, limit, remaining: limit - 1, reset: entry.resetTime };
  }

  entry.count++;

  if (entry.count > limit) {
    return { success: false, limit, remaining: 0, reset: entry.resetTime };
  }

  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    reset: entry.resetTime,
  };
}

// ---------------------------------------------------------------------------
// Public API (unchanged surface)
// ---------------------------------------------------------------------------

/**
 * Check rate limit for a request.
 * Uses Upstash when configured, falls back to in-memory.
 */
export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { identifier = defaultIdentifier } = options;
  const id = identifier(request);

  // Try Upstash first
  const upstashResult = await checkUpstashRateLimit(id, "api", options);
  if (upstashResult) return upstashResult;

  // Fallback to in-memory
  return checkMemoryRateLimit(id, options);
}

/**
 * Build a 429 response with proper headers.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
  return NextResponse.json(
    {
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.reset.toString(),
        "Retry-After": retryAfter.toString(),
      },
    }
  );
}

/**
 * Add rate limit headers to a successful response.
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.reset.toString());
  return response;
}

/**
 * Rate limit middleware for API routes.
 * Returns null if within limit, or a 429 response if exceeded.
 */
export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const result = await checkRateLimit(request, options);
  if (!result.success) return rateLimitResponse(result);
  return null;
}

/**
 * Preset configurations for common use cases.
 */
export const RATE_LIMIT_PRESETS = {
  /** Standard API endpoint: 100 requests per minute */
  standard: { limit: 100, windowInSeconds: 60 },
  /** Strict endpoint (auth, uploads): 20 requests per minute */
  strict: { limit: 20, windowInSeconds: 60 },
  /** Relaxed endpoint (reads): 200 requests per minute */
  relaxed: { limit: 200, windowInSeconds: 60 },
  /** Burst protection: 10 requests per 10 seconds */
  burst: { limit: 10, windowInSeconds: 10 },
  /** PDF generation: 5 requests per minute (expensive operation) */
  pdf: { limit: 5, windowInSeconds: 60 },
  /** Photo upload: 30 uploads per minute */
  upload: { limit: 30, windowInSeconds: 60 },
} as const;

/**
 * Create an identifier that combines IP and user ID for authenticated routes.
 */
export function createUserIdentifier(userId: string | null) {
  return (request: NextRequest): string => {
    const ip = defaultIdentifier(request);
    return userId ? `${ip}:${userId}` : ip;
  };
}
