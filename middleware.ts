import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health(.*)",
  "/api/webhooks(.*)",
]);

// API routes that should return JSON 401 instead of redirect
const isApiRoute = createRouteMatcher(["/api(.*)"]);

// State-changing HTTP methods that require origin validation
const STATE_CHANGING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

/**
 * Validate request origin for CSRF protection
 * Checks that requests come from the same origin
 */
function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // Allow requests without origin header (same-origin requests from browser)
  if (!origin) {
    return true;
  }

  // In development, allow localhost
  if (process.env.NODE_ENV === "development") {
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return true;
    }
  }

  // Check if origin matches host
  try {
    const originUrl = new URL(origin);
    const expectedHost = host?.split(":")[0]; // Remove port if present
    return originUrl.hostname === expectedHost;
  } catch {
    return false;
  }
}

/**
 * Add request ID for tracing
 */
function getRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export default clerkMiddleware(async (auth, request) => {
  const requestId = getRequestId();

  // Add request ID to response headers for tracing
  const response = NextResponse.next();
  response.headers.set("X-Request-ID", requestId);

  // Allow public routes
  if (isPublicRoute(request)) {
    return response;
  }

  // For API routes with state-changing methods, validate origin
  if (isApiRoute(request) && STATE_CHANGING_METHODS.includes(request.method)) {
    if (!validateOrigin(request)) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Invalid request origin",
          requestId,
        },
        {
          status: 403,
          headers: { "X-Request-ID": requestId },
        }
      );
    }
  }

  // For API routes, return JSON 401 instead of redirect
  if (isApiRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication required",
          requestId,
        },
        {
          status: 401,
          headers: { "X-Request-ID": requestId },
        }
      );
    }
  }

  // For non-API routes, protect them (will redirect to sign-in)
  await auth.protect();

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
