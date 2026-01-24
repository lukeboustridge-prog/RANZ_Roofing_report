import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMITS = {
  default: 100, // 100 requests per minute
  auth: 10, // 10 auth attempts per minute
  upload: 20, // 20 uploads per minute
  admin: 200, // 200 admin requests per minute
};

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
             request.headers.get("x-real-ip") ||
             "unknown";
  const path = request.nextUrl.pathname;
  return `${ip}:${path}`;
}

function getRateLimit(pathname: string): number {
  if (pathname.startsWith("/api/auth") || pathname.includes("/sign-in") || pathname.includes("/sign-up")) {
    return RATE_LIMITS.auth;
  }
  if (pathname.includes("/upload") || pathname.includes("/photos")) {
    return RATE_LIMITS.upload;
  }
  if (pathname.startsWith("/api/admin")) {
    return RATE_LIMITS.admin;
  }
  return RATE_LIMITS.default;
}

function checkRateLimit(request: NextRequest): { allowed: boolean; remaining: number; resetIn: number } {
  const key = getRateLimitKey(request);
  const limit = getRateLimit(request.nextUrl.pathname);
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: limit - 1, resetIn: RATE_LIMIT_WINDOW };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetTime - now };
}

// Security headers
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // XSS Protection (legacy browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(self), interest-cohort=()"
  );

  // Content Security Policy - relaxed for production compatibility
  // In production, you may want to tighten this based on your specific needs
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com https://*.clerk.accounts.dev https://*.clerk.com https://*.vercel.app",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.r2.dev https://*.r2.cloudflarestorage.com https://*.clerk.com https://*.cloudflare.com https://*.vercel.app",
      "font-src 'self' data:",
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev wss://*.clerk.com https://clerk-telemetry.com https://*.vercel.app",
      "worker-src 'self' blob:",
      "frame-src https://*.clerk.com https://*.clerk.accounts.dev",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  // HSTS (only in production)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  return response;
}

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/health(.*)",
]);

// Define API routes for rate limiting
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  // Apply rate limiting to API routes
  if (isApiRoute(request)) {
    const rateLimit = checkRateLimit(request);

    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        {
          error: "Too many requests",
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        },
        { status: 429 }
      );
      response.headers.set("Retry-After", Math.ceil(rateLimit.resetIn / 1000).toString());
      response.headers.set("X-RateLimit-Remaining", "0");
      return addSecurityHeaders(response);
    }
  }

  // Protect all routes except public ones
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Continue with request and add security headers
  const response = NextResponse.next();
  return addSecurityHeaders(response);
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
