import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * POST /api/onboarding/bypass
 * Emergency bypass to complete onboarding when the main flow is broken.
 * This is a temporary workaround - remove after fixing the auth issue.
 */
export async function POST(request: NextRequest) {
  console.log("=== ONBOARDING BYPASS CALLED ===");

  try {
    // Try to get auth, but don't require it for bypass
    let userId: string | null = null;
    let userEmail: string | null = null;

    try {
      const authResult = await auth();
      userId = authResult.userId;
      console.log("Bypass: Auth result", { userId: userId || "NONE" });
    } catch (authError) {
      console.log("Bypass: Auth failed, trying email lookup", authError);
    }

    // If no userId from auth, try to get email from request body
    const body = await request.json().catch(() => ({}));
    userEmail = body.email;

    console.log("Bypass: Looking up user", { userId, userEmail });

    // Find user by clerkId or email
    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
    }

    if (!user && userEmail) {
      user = await prisma.user.findUnique({
        where: { email: userEmail },
      });
    }

    if (!user) {
      console.error("Bypass: User not found");
      return NextResponse.json(
        { error: "User not found. Provide email in body: { email: 'your@email.com' }" },
        { status: 404 }
      );
    }

    console.log("Bypass: Found user", { id: user.id, email: user.email, clerkId: user.clerkId });

    // Update user to mark onboarding complete
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: true,
        onboardingStep: 6,
        onboardingCompletedAt: new Date(),
        // Set default name if missing
        name: user.name || "Inspector",
      },
    });

    console.log("Bypass: Updated user in database");

    // Try to update Clerk metadata
    if (user.clerkId) {
      try {
        const clerk = await clerkClient();
        await clerk.users.updateUserMetadata(user.clerkId, {
          publicMetadata: {
            onboardingCompleted: true,
            onboardingCompletedAt: new Date().toISOString(),
          },
        });
        console.log("Bypass: Updated Clerk metadata");
      } catch (clerkError) {
        console.error("Bypass: Failed to update Clerk metadata", clerkError);
        // Continue anyway - database is updated
      }
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding bypassed successfully. Please sign out and sign back in to refresh your session.",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        onboardingCompleted: updatedUser.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error("Bypass: Error", error);
    return NextResponse.json(
      { error: "Failed to bypass onboarding", details: String(error) },
      { status: 500 }
    );
  }
}
