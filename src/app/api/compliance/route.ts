import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/compliance - Fetch all active compliance checklists
 *
 * Returns checklists grouped by standard for use in the compliance assessment wizard.
 * Supports optional filtering by standard query parameter.
 *
 * Query params:
 *   - standard: Optional filter for specific standard (e.g., "E2/AS1")
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const standardFilter = searchParams.get("standard");

    // Build query conditions
    const whereClause = standardFilter
      ? { standard: standardFilter }
      : {};

    // Fetch all checklists
    const checklists = await prisma.checklist.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
    });

    // Group by standard for easier consumption
    const grouped: Record<string, {
      id: string;
      name: string;
      category: string;
      standard: string | null;
      items: unknown[];
    }> = {};

    for (const checklist of checklists) {
      const key = checklist.standard?.toLowerCase().replace(/[^a-z0-9]/g, "_") || "other";
      grouped[key] = {
        id: checklist.id,
        name: checklist.name,
        category: checklist.category,
        standard: checklist.standard,
        items: checklist.items as unknown[],
      };
    }

    return NextResponse.json({
      success: true,
      data: grouped,
    });
  } catch (error) {
    console.error("Error fetching checklists:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklists" },
      { status: 500 }
    );
  }
}
