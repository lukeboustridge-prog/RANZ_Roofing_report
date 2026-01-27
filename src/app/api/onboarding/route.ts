import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const onboardingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  lbpNumber: z.string().optional().nullable(),
  yearsExperience: z.number().int().min(0).max(60).optional().nullable(),
  qualifications: z.string().optional().nullable(),
  specialisations: z.array(z.string()).default([]),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  defaultInspectionType: z.string().optional().nullable(),
  defaultRegion: z.string().optional().nullable(),
  emailNotifications: z.boolean().default(true),
});

// GET /api/onboarding - Get current user's onboarding status
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        lbpNumber: true,
        yearsExperience: true,
        qualifications: true,
        specialisations: true,
        company: true,
        address: true,
        onboardingCompleted: true,
        onboardingStep: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching onboarding status:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding status" },
      { status: 500 }
    );
  }
}

// POST /api/onboarding - Complete onboarding
export async function POST(request: NextRequest) {
  try {
    // Log request headers for debugging
    const cookieHeader = request.headers.get("cookie");
    console.log("Onboarding POST: Request received", {
      hasCookies: !!cookieHeader,
      cookieLength: cookieHeader?.length || 0,
      hasClerkSession: cookieHeader?.includes("__session") || cookieHeader?.includes("__clerk"),
    });

    const authResult = await auth();
    const { userId } = authResult;

    console.log("Onboarding POST: Auth result", {
      userId: userId || "NONE",
      hasSessionId: !!authResult.sessionId,
      hasSessionClaims: !!authResult.sessionClaims,
      sessionId: authResult.sessionId || "NONE",
    });

    if (!userId) {
      console.error("Onboarding POST: No userId - returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = onboardingSchema.parse(body);

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        lbpNumber: validatedData.lbpNumber,
        yearsExperience: validatedData.yearsExperience,
        qualifications: validatedData.qualifications,
        specialisations: validatedData.specialisations,
        company: validatedData.company,
        address: validatedData.address,
        onboardingCompleted: true,
        onboardingStep: 6, // Final step
        onboardingCompletedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        onboardingCompleted: true,
      },
    });

    // Update Clerk user metadata to mark onboarding as complete
    // This allows middleware to check without database calls
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
      },
    });

    // Create user preferences if needed
    try {
      const emailEnabled = validatedData.emailNotifications;
      await prisma.userPreferences.upsert({
        where: { userId: user.id },
        update: {
          defaultInspectionType: validatedData.defaultInspectionType,
          defaultRegion: validatedData.defaultRegion,
          // Set all email preferences based on master toggle
          emailReportSubmitted: emailEnabled,
          emailReportApproved: emailEnabled,
          emailReportRejected: emailEnabled,
          emailReportComments: emailEnabled,
          emailReportFinalized: emailEnabled,
          emailAssignmentNew: emailEnabled,
        },
        create: {
          userId: user.id,
          defaultInspectionType: validatedData.defaultInspectionType,
          defaultRegion: validatedData.defaultRegion,
          // Set all email preferences based on master toggle
          emailReportSubmitted: emailEnabled,
          emailReportApproved: emailEnabled,
          emailReportRejected: emailEnabled,
          emailReportComments: emailEnabled,
          emailReportFinalized: emailEnabled,
          emailAssignmentNew: emailEnabled,
        },
      });
    } catch {
      // UserPreferences model might not exist yet, silently continue
      console.log("User preferences not saved - model may not exist yet");
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Onboarding completed successfully",
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}

// PATCH /api/onboarding - Update onboarding progress (save step)
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await auth();
    const { userId } = authResult;

    if (!userId) {
      console.error("Onboarding PATCH: No userId found in auth result", {
        hasSessionId: !!authResult.sessionId,
        hasSessionClaims: !!authResult.sessionClaims,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { step, ...partialData } = body;

    // Validate step number
    if (typeof step !== "number" || step < 0 || step > 6) {
      return NextResponse.json(
        { error: "Invalid step number" },
        { status: 400 }
      );
    }

    // Update user with partial data and current step
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingStep: step,
        ...(partialData.name && { name: partialData.name }),
        ...(partialData.phone !== undefined && { phone: partialData.phone }),
        ...(partialData.lbpNumber !== undefined && { lbpNumber: partialData.lbpNumber }),
        ...(partialData.yearsExperience !== undefined && { yearsExperience: partialData.yearsExperience }),
        ...(partialData.qualifications !== undefined && { qualifications: partialData.qualifications }),
        ...(partialData.specialisations !== undefined && { specialisations: partialData.specialisations }),
        ...(partialData.company !== undefined && { company: partialData.company }),
        ...(partialData.address !== undefined && { address: partialData.address }),
      },
      select: {
        id: true,
        onboardingStep: true,
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({
      success: true,
      step: updatedUser.onboardingStep,
    });
  } catch (error) {
    console.error("Error saving onboarding progress:", error);
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}
