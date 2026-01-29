import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/auth/me
 * Get current user information
 * Returns user data directly at root level for compatibility with onboarding
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const lookupField = getUserLookupField();
    const user = await prisma.user.findUnique({
      where: { [lookupField]: userId },
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

    if (!user) {
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
