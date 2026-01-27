import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/reports(.*)",
  "/admin(.*)",
  "/analytics(.*)",
  "/assignments(.*)",
  "/settings(.*)",
  "/profile(.*)",
  "/review(.*)",
]);

// Define routes that require auth but NOT onboarding completion
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/shared/(.*)", // Public shared report links
  "/inspectors(.*)", // Public inspector directory
]);

// Define API routes - these skip onboarding redirect but still need auth processing
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const url = req.nextUrl.clone();

  // Allow public routes without any checks
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // For protected routes, require authentication
  if (isProtectedRoute(req) || isOnboardingRoute(req)) {
    if (!userId) {
      await auth.protect();
      return;
    }
  }

  // API routes: skip onboarding redirect but let request continue
  // Don't return early - let Clerk fully process auth context
  if (isApiRoute(req)) {
    // API routes handle their own auth via auth() call in route handlers
    // Just skip the onboarding redirect logic below
    return NextResponse.next();
  }

  // Check onboarding status from session claims
  const onboardingCompleted =
    (sessionClaims?.publicMetadata as { onboardingCompleted?: boolean })
      ?.onboardingCompleted === true;

  // If user is authenticated but hasn't completed onboarding
  if (userId && !onboardingCompleted) {
    // Allow access to onboarding page
    if (isOnboardingRoute(req)) {
      return NextResponse.next();
    }

    // Redirect to onboarding for all other protected routes
    if (isProtectedRoute(req)) {
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  // If user has completed onboarding but tries to access onboarding page
  if (userId && onboardingCompleted && isOnboardingRoute(req)) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
