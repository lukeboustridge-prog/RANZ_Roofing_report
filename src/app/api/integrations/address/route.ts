import { NextRequest, NextResponse } from "next/server";
import {
  searchAddresses,
  getAddressDetails,
  getNZRegions,
} from "@/lib/integrations";

/**
 * GET /api/integrations/address - Search for addresses or get details
 * Query params:
 * - q: search query for autocomplete
 * - placeId: get full details for a specific place
 * - regions: return list of NZ regions
 * - limit: max suggestions (default 5)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q");
    const placeId = searchParams.get("placeId");
    const getRegions = searchParams.get("regions") === "true";
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    // Return NZ regions list
    if (getRegions) {
      return NextResponse.json({
        regions: getNZRegions(),
      });
    }

    // Get details for a specific place
    if (placeId) {
      const details = await getAddressDetails(placeId);

      if (!details) {
        return NextResponse.json(
          { error: "Address not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ address: details });
    }

    // Search for addresses
    if (query) {
      if (query.length < 3) {
        return NextResponse.json({
          suggestions: [],
          message: "Please enter at least 3 characters",
        });
      }

      const suggestions = await searchAddresses(query, Math.min(limit, 10));

      return NextResponse.json({ suggestions });
    }

    return NextResponse.json(
      { error: "Please provide a search query (q) or placeId" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Address API error:", error);
    return NextResponse.json(
      { error: "Failed to search addresses" },
      { status: 500 }
    );
  }
}
