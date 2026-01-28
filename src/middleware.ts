import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Import from the auth module created in this plan
import { verifyTokenStateless, parseSessionCookie, AUTH_CONFIG } from '@/lib/auth';

// AUTH_MODE determines which auth system is primary
const AUTH_MODE = process.env.AUTH_MODE || 'clerk';

// Protected pages that require authentication AND onboarding completion
const isProtectedPage = createRouteMatcher([
  "/dashboard(.*)",
  "/reports(.*)",
  "/admin(.*)",
  "/analytics(.*)",
  "/assignments(.*)",
  "/settings(.*)",
  "/profile(.*)",
  "/review(.*)",
]);

// Onboarding page - requires auth but NOT onboarding completion
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

// Public routes - no auth required
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/onboarding/bypass(.*)",
  "/shared/(.*)",
  "/inspectors(.*)",
]);

// API routes - handle their own auth
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Public routes: allow without auth
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // API routes: let them handle their own authentication
  if (isApiRoute(req)) {
    return NextResponse.next();
  }

  if (AUTH_MODE === 'custom') {
    return customAuthMiddleware(req);
  } else {
    return clerkMiddlewareHandler(req);
  }
}

async function customAuthMiddleware(req: NextRequest): Promise<NextResponse> {
  const url = req.nextUrl.clone();

  // Get session cookie using the auth module
  const cookieHeader = req.headers.get('cookie');
  const token = parseSessionCookie(cookieHeader);

  if (!token) {
    // Redirect to primary domain for sign-in
    const signInUrl = new URL(AUTH_CONFIG.signInUrl);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Verify token using the auth module (stateless - no database call)
  const payload = await verifyTokenStateless(token);

  if (!payload) {
    // Invalid token - redirect to sign-in
    const signInUrl = new URL(AUTH_CONFIG.signInUrl);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Check onboarding status from JWT claims (if applicable)
  // Note: Custom auth users are considered onboarded
  const onboardingCompleted = true;

  // Onboarding page access
  if (isOnboardingRoute(req)) {
    if (onboardingCompleted) {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Protected pages: require authentication (already verified above)
  const response = NextResponse.next();

  // Add user info to headers for route handlers
  response.headers.set('x-user-id', payload.sub);
  response.headers.set('x-user-email', payload.email);
  response.headers.set('x-user-role', payload.role);
  response.headers.set('x-auth-source', 'custom');
  if (payload.companyId) {
    response.headers.set('x-company-id', payload.companyId);
  }

  return response;
}

// Clerk middleware handler (existing functionality)
function clerkMiddlewareHandler(req: NextRequest) {
  return clerkMiddleware(async (auth, request) => {
    const url = request.nextUrl.clone();

    // All non-public routes require authentication
    await auth.protect();

    // Get session info after protection
    const { userId, sessionClaims } = await auth();

    // Check onboarding status
    const onboardingCompleted =
      (sessionClaims?.publicMetadata as { onboardingCompleted?: boolean })
        ?.onboardingCompleted === true;

    // Onboarding page access
    if (isOnboardingRoute(request)) {
      if (onboardingCompleted) {
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Protected pages: require onboarding completion
    if (isProtectedPage(request) && !onboardingCompleted) {
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  })(req, {} as any);
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
