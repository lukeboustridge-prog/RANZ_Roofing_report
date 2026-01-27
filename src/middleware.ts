import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
  "/shared/(.*)",
  "/inspectors(.*)",
]);

// API routes - these handle their own auth, middleware just passes through
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl.clone();

  // Public routes: allow without auth
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // API routes: let them handle their own authentication
  // Don't call auth.protect() - just pass through and let route handlers use auth()
  if (isApiRoute(req)) {
    return NextResponse.next();
  }

  // All other routes require authentication
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    // Not authenticated - redirect to sign in
    return auth.redirectToSignIn({ returnBackUrl: req.url });
  }

  // Check onboarding status
  const onboardingCompleted =
    (sessionClaims?.publicMetadata as { onboardingCompleted?: boolean })
      ?.onboardingCompleted === true;

  // Onboarding page access
  if (isOnboardingRoute(req)) {
    if (onboardingCompleted) {
      // Already completed - redirect to dashboard
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    // Not completed - allow access to onboarding
    return NextResponse.next();
  }

  // Protected pages: require onboarding completion
  if (isProtectedPage(req) && !onboardingCompleted) {
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
