import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  getAllDefectTemplates,
  getTemplatesByCategory,
  searchTemplates,
  getCategories,
  type DefectCategory,
  DEFECT_CATEGORIES,
} from "@/lib/defect-templates";

/**
 * GET /api/defect-templates - Get defect templates
 *
 * Query params:
 * - category: Filter by category
 * - search: Search query
 * - categories: If "true", return list of categories instead of templates
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    const listCategories = url.searchParams.get("categories") === "true";

    // Return list of categories
    if (listCategories) {
      return NextResponse.json({
        categories: getCategories(),
        allCategories: DEFECT_CATEGORIES,
      });
    }

    // Filter by search query
    if (search) {
      const templates = searchTemplates(search);
      return NextResponse.json({
        templates,
        count: templates.length,
        query: search,
      });
    }

    // Filter by category
    if (category) {
      if (!DEFECT_CATEGORIES.includes(category as DefectCategory)) {
        return NextResponse.json(
          { error: "Invalid category", validCategories: DEFECT_CATEGORIES },
          { status: 400 }
        );
      }
      const templates = getTemplatesByCategory(category as DefectCategory);
      return NextResponse.json({
        templates,
        count: templates.length,
        category,
      });
    }

    // Return all templates
    const templates = getAllDefectTemplates();
    return NextResponse.json({
      templates,
      count: templates.length,
      categories: getCategories(),
    });
  } catch (error) {
    console.error("Error fetching defect templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch defect templates" },
      { status: 500 }
    );
  }
}
