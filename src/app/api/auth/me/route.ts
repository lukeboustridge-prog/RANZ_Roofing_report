import { getAuthUser, getUserWhereClause, getAuthMode } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/auth/me
 * Get current user information
 *
 * For SSO users (custom auth mode):
 * - Returns JWT-based user info if user is authenticated via SSO
 * - Returns full profile from local database if user has been provisioned
 *
 * For Clerk users:
 * - Returns user from local database by Clerk ID
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lbpNumber: true,
        qualifications: true,
        phone: true,
        company: true,
        address: true,
        yearsExperience: true,
        specialisations: true,
        onboardingCompleted: true,
        onboardingStep: true,
      },
    });

    // If user not found in local database but is authenticated via SSO,
    // return basic user info from the JWT to indicate authenticated state
    if (!user) {
      // In custom auth mode, the user might be authenticated via SSO
      // but not yet provisioned in this app's database
      if (getAuthMode() === 'custom' && authUser) {
        // Return SSO user info - they're authenticated but need provisioning
        const ssoUser = {
          id: authUser.userId,
          email: authUser.email,
          name: authUser.name,
          role: authUser.role,
          status: 'ACTIVE',
          companyId: authUser.companyId,
          // Flags to indicate this is an SSO user without local profile
          ssoAuthenticated: true,
          needsProvisioning: true,
          onboardingCompleted: false,
          authSource: authUser.authSource,
        };
        return NextResponse.json({ ...ssoUser, user: ssoUser });
      }
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Return user data at root level for onboarding page compatibility
    // Also include nested { user } for other consumers
    return NextResponse.json({ ...user, user });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
