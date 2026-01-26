import { NextRequest, NextResponse } from "next/server";

/**
 * Rate Limiting Utility
 *
 * This implementation uses an in-memory store suitable for:
 * - Development environments
 * - Single-instance deployments
 * - Low-traffic applications
 *
 * PRODUCTION DEPLOYMENT WARNING:
 * For production with multiple server instances or serverless deployments
 * (e.g., Vercel, AWS Lambda), this in-memory implementation will NOT work
 * correctly because each instance has its own memory space.
 *
 * For production, replace with a distributed rate limiter using:
 * - Upstash Redis (@upstash/ratelimit) - Recommended for serverless
 * - Redis with ioredis
 * - Cloudflare Rate Limiting (at edge)
 *
 * Example with Upstash:
 * ```typescript
 * import { Ratelimit } from "@upstash/ratelimit";
 * import { Redis } from "@upstash/redis";
 *
 * const redis = new Redis({
 *   url: process.env.UPSTASH_REDIS_URL,
 *   token: process.env.UPSTASH_REDIS_TOKEN,
 * });
 *
 * const ratelimit = new Ratelimit({
 *   redis,
 *   limiter: Ratelimit.slidingWindow(100, "1m"),
 * });
 * ```
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowInSeconds: number;
  /** Identifier function - extracts unique identifier from request */
  identifier?: (request: NextRequest) => string;
}

// In-memory store for rate limit data
// Key: identifier, Value: { count, resetTime }
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let cleanupScheduled = false;

function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Default identifier extraction - uses IP address or falls back to "anonymous"
 */
function defaultIdentifier(request: NextRequest): string {
  // Try to get IP from various headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // For Vercel
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return vercelIp.split(",")[0].trim();
  }

  return "anonymous";
}

/**
 * Rate limit result
 */
interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): RateLimitResult {
  scheduleCleanup();

  const { limit, windowInSeconds, identifier = defaultIdentifier } = options;
  const id = identifier(request);
  const now = Date.now();
  const windowMs = windowInSeconds * 1000;

  let entry = rateLimitStore.get(id);

  // If no entry or entry has expired, create new one
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(id, entry);

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Rate limit response with proper headers
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const headers = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
    "Retry-After": Math.ceil((result.reset - Date.now()) / 1000).toString(),
  };

  return NextResponse.json(
    {
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    },
    { status: 429, headers }
  );
}

/**
 * Add rate limit headers to a successful response
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
 * Rate limit middleware for API routes
 * Returns null if within limit, or a 429 response if exceeded
 */
export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  const result = checkRateLimit(request, options);

  if (!result.success) {
    return rateLimitResponse(result);
  }

  return null;
}

/**
 * Higher-order function to wrap an API handler with rate limiting
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  options: RateLimitOptions
): T {
  return (async (request: NextRequest, ...args: unknown[]) => {
    const rateLimitResult = rateLimit(request, options);
    if (rateLimitResult) {
      return rateLimitResult;
    }
    return handler(request, ...args);
  }) as T;
}

// Preset configurations for common use cases
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
 * Create an identifier that combines IP and user ID for authenticated routes
 */
export function createUserIdentifier(userId: string | null) {
  return (request: NextRequest): string => {
    const ip = defaultIdentifier(request);
    return userId ? `${ip}:${userId}` : ip;
  };
}
