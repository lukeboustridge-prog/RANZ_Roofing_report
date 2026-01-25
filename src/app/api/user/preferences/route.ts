import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const preferencesSchema = z.object({
  // Email notification preferences
  emailReportSubmitted: z.boolean().optional(),
  emailReportApproved: z.boolean().optional(),
  emailReportRejected: z.boolean().optional(),
  emailReportComments: z.boolean().optional(),
  emailReportFinalized: z.boolean().optional(),
  emailAssignmentNew: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional(),

  // UI preferences
  theme: z.enum(["system", "light", "dark"]).optional(),
  defaultListView: z.enum(["grid", "list"]).optional(),
  itemsPerPage: z.number().min(6).max(50).optional(),

  // Default report settings
  defaultInspectionType: z.string().optional().nullable(),
  defaultRegion: z.string().optional().nullable(),
});

/**
 * GET /api/user/preferences - Get current user's preferences
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { preferences: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return preferences or defaults if none exist
    if (!user.preferences) {
      return NextResponse.json({
        // Email notification defaults
        emailReportSubmitted: true,
        emailReportApproved: true,
        emailReportRejected: true,
        emailReportComments: true,
        emailReportFinalized: true,
        emailAssignmentNew: true,
        emailWeeklyDigest: false,
        // UI defaults
        theme: "system",
        defaultListView: "grid",
        itemsPerPage: 12,
        // Report defaults
        defaultInspectionType: null,
        defaultRegion: null,
      });
    }

    return NextResponse.json({
      emailReportSubmitted: user.preferences.emailReportSubmitted,
      emailReportApproved: user.preferences.emailReportApproved,
      emailReportRejected: user.preferences.emailReportRejected,
      emailReportComments: user.preferences.emailReportComments,
      emailReportFinalized: user.preferences.emailReportFinalized,
      emailAssignmentNew: user.preferences.emailAssignmentNew,
      emailWeeklyDigest: user.preferences.emailWeeklyDigest,
      theme: user.preferences.theme,
      defaultListView: user.preferences.defaultListView,
      itemsPerPage: user.preferences.itemsPerPage,
      defaultInspectionType: user.preferences.defaultInspectionType,
      defaultRegion: user.preferences.defaultRegion,
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/preferences - Update current user's preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates = preferencesSchema.parse(body);

    // Upsert preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: updates,
      create: {
        userId: user.id,
        ...updates,
      },
    });

    return NextResponse.json({
      success: true,
      preferences: {
        emailReportSubmitted: preferences.emailReportSubmitted,
        emailReportApproved: preferences.emailReportApproved,
        emailReportRejected: preferences.emailReportRejected,
        emailReportComments: preferences.emailReportComments,
        emailReportFinalized: preferences.emailReportFinalized,
        emailAssignmentNew: preferences.emailAssignmentNew,
        emailWeeklyDigest: preferences.emailWeeklyDigest,
        theme: preferences.theme,
        defaultListView: preferences.defaultListView,
        itemsPerPage: preferences.itemsPerPage,
        defaultInspectionType: preferences.defaultInspectionType,
        defaultRegion: preferences.defaultRegion,
      },
    });
  } catch (error) {
    console.error("Error updating preferences:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
