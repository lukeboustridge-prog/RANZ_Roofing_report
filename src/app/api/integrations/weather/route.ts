import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentWeather,
  getWeatherForecast,
  assessInspectionConditions,
} from "@/lib/integrations";

/**
 * GET /api/integrations/weather - Get weather data for a location
 * Query params:
 * - lat: latitude (required)
 * - lng: longitude (required)
 * - forecast: include forecast (optional, default false)
 * - days: number of forecast days (optional, default 5)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    const includeForecast = searchParams.get("forecast") === "true";
    const forecastDays = parseInt(searchParams.get("days") || "5", 10);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Valid latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Validate NZ bounds
    if (lat < -47.5 || lat > -34.0 || lng < 166.0 || lng > 179.0) {
      return NextResponse.json(
        { error: "Coordinates must be within New Zealand" },
        { status: 400 }
      );
    }

    // Fetch current weather
    const current = await getCurrentWeather(lat, lng);

    if (!current) {
      return NextResponse.json(
        { error: "Unable to fetch weather data. Please check API configuration." },
        { status: 503 }
      );
    }

    // Assess inspection conditions
    const assessment = assessInspectionConditions(current);

    // Build response
    const response: Record<string, unknown> = {
      current,
      assessment,
    };

    // Include forecast if requested
    if (includeForecast) {
      const forecast = await getWeatherForecast(lat, lng, Math.min(forecastDays, 7));
      response.forecast = forecast;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
