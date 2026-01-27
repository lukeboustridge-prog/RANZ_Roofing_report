import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define protected routes that require authentication (pages)
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

// Define protected API routes (need auth but no onboarding redirect)
const isProtectedApiRoute = createRouteMatcher([
  "/api/onboarding(.*)",
  "/api/user(.*)",
  "/api/auth/me(.*)",
  "/api/reports(.*)",
  "/api/photos(.*)",
  "/api/defects(.*)",
  "/api/elements(.*)",
  "/api/documents(.*)",
  "/api/notifications(.*)",
  "/api/assignments(.*)",
  "/api/analytics(.*)",
  "/api/admin(.*)",
  "/api/compliance(.*)",
  "/api/defect-templates(.*)",
  "/api/templates(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl.clone();

  // Allow public routes without any checks
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protected API routes: require auth but skip onboarding redirect
  // This ensures auth context is properly set up for route handlers
  if (isProtectedApiRoute(req)) {
    await auth.protect();
    return NextResponse.next();
  }

  // For protected pages and onboarding, require authentication
  if (isProtectedRoute(req) || isOnboardingRoute(req)) {
    await auth.protect();
  }

  // Get auth info after protection is established
  const { userId, sessionClaims } = await auth();

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
