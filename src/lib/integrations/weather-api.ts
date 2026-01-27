/**
 * Weather API Integration
 * Fetches weather data for inspection sites using OpenWeatherMap API
 * Used to auto-fill weather conditions in reports
 */

export interface WeatherData {
  temperature: number; // Celsius
  humidity: number; // Percentage
  windSpeed: number; // km/h
  windDirection: string;
  conditions: string;
  description: string;
  icon: string;
  pressure: number; // hPa
  visibility: number; // km
  cloudCover: number; // Percentage
  precipitation: number | null; // mm in last hour
  timestamp: Date;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
}

export interface WeatherForecast {
  date: Date;
  tempMin: number;
  tempMax: number;
  conditions: string;
  description: string;
  icon: string;
  precipProbability: number;
  windSpeed: number;
}

// Wind direction conversion
function degreesToDirection(degrees: number): string {
  const directions = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW"
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Weather condition mapping to inspection-friendly descriptions
function mapWeatherConditions(main: string, description: string): string {
  const conditionMap: Record<string, string> = {
    "Clear": "Clear sky",
    "Clouds": description.includes("overcast") ? "Overcast" : "Partly cloudy",
    "Rain": description.includes("light") ? "Light rain" : description.includes("heavy") ? "Heavy rain" : "Rain",
    "Drizzle": "Light drizzle",
    "Thunderstorm": "Thunderstorm",
    "Snow": "Snow",
    "Mist": "Mist",
    "Fog": "Fog",
    "Haze": "Hazy",
  };
  return conditionMap[main] || main;
}

/**
 * Fetch current weather for a location
 */
export async function getCurrentWeather(
  lat: number,
  lng: number
): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    console.warn("OpenWeatherMap API key not configured");
    return null;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

    const response = await fetch(url, {
      next: { revalidate: 600 }, // Cache for 10 minutes
    });

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      temperature: Math.round(data.main.temp * 10) / 10,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6 * 10) / 10, // m/s to km/h
      windDirection: degreesToDirection(data.wind.deg || 0),
      conditions: mapWeatherConditions(data.weather[0].main, data.weather[0].description),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      pressure: data.main.pressure,
      visibility: Math.round((data.visibility || 10000) / 1000 * 10) / 10,
      cloudCover: data.clouds?.all || 0,
      precipitation: data.rain?.["1h"] || data.snow?.["1h"] || null,
      timestamp: new Date(data.dt * 1000),
      location: {
        name: data.name,
        lat: data.coord.lat,
        lng: data.coord.lon,
      },
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}

/**
 * Fetch weather forecast for a location
 */
export async function getWeatherForecast(
  lat: number,
  lng: number,
  days: number = 5
): Promise<WeatherForecast[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    console.warn("OpenWeatherMap API key not configured");
    return [];
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Group by day and extract daily forecasts
    const dailyData = new Map<string, {
      temps: number[];
      conditions: string[];
      descriptions: string[];
      icons: string[];
      windSpeeds: number[];
      pop: number[];
    }>();

    for (const item of data.list) {
      const date = new Date(item.dt * 1000).toISOString().split("T")[0];

      if (!dailyData.has(date)) {
        dailyData.set(date, {
          temps: [],
          conditions: [],
          descriptions: [],
          icons: [],
          windSpeeds: [],
          pop: [],
        });
      }

      const day = dailyData.get(date)!;
      day.temps.push(item.main.temp);
      day.conditions.push(item.weather[0].main);
      day.descriptions.push(item.weather[0].description);
      day.icons.push(item.weather[0].icon);
      day.windSpeeds.push(item.wind.speed * 3.6);
      day.pop.push(item.pop || 0);
    }

    const forecasts: WeatherForecast[] = [];

    for (const [date, day] of dailyData) {
      if (forecasts.length >= days) break;

      // Get most common condition
      const conditionCounts = new Map<string, number>();
      for (const c of day.conditions) {
        conditionCounts.set(c, (conditionCounts.get(c) || 0) + 1);
      }
      const mostCommonCondition = [...conditionCounts.entries()]
        .sort((a, b) => b[1] - a[1])[0][0];

      forecasts.push({
        date: new Date(date),
        tempMin: Math.round(Math.min(...day.temps) * 10) / 10,
        tempMax: Math.round(Math.max(...day.temps) * 10) / 10,
        conditions: mapWeatherConditions(mostCommonCondition, day.descriptions[0]),
        description: day.descriptions[0],
        icon: day.icons[Math.floor(day.icons.length / 2)], // Midday icon
        precipProbability: Math.round(Math.max(...day.pop) * 100),
        windSpeed: Math.round(Math.max(...day.windSpeeds) * 10) / 10,
      });
    }

    return forecasts;
  } catch (error) {
    console.error("Error fetching weather forecast:", error);
    return [];
  }
}

/**
 * Format weather for report display
 */
export function formatWeatherForReport(weather: WeatherData): string {
  const parts = [
    weather.conditions,
    `${weather.temperature}°C`,
    `${weather.humidity}% humidity`,
    `Wind ${weather.windDirection} ${weather.windSpeed} km/h`,
  ];

  if (weather.precipitation && weather.precipitation > 0) {
    parts.push(`${weather.precipitation}mm precipitation`);
  }

  return parts.join(", ");
}

/**
 * Check if conditions are suitable for inspection
 */
export function assessInspectionConditions(weather: WeatherData): {
  suitable: boolean;
  warnings: string[];
  recommendation: string;
} {
  const warnings: string[] = [];

  // Check for rain
  if (weather.precipitation && weather.precipitation > 0) {
    warnings.push("Active precipitation may affect inspection");
  }

  // Check wind speed
  if (weather.windSpeed > 40) {
    warnings.push("High winds - exercise caution on elevated areas");
  } else if (weather.windSpeed > 25) {
    warnings.push("Moderate winds present");
  }

  // Check visibility
  if (weather.visibility < 1) {
    warnings.push("Poor visibility conditions");
  }

  // Check for storms
  if (weather.conditions.toLowerCase().includes("thunder")) {
    warnings.push("Thunderstorm activity - postpone roof access");
  }

  // Assess suitability
  const unsuitable =
    (weather.precipitation && weather.precipitation > 2) ||
    weather.windSpeed > 50 ||
    weather.conditions.toLowerCase().includes("thunder") ||
    weather.visibility < 0.5;

  let recommendation: string;
  if (unsuitable) {
    recommendation = "Consider postponing inspection due to adverse conditions";
  } else if (warnings.length > 0) {
    recommendation = "Proceed with caution and appropriate safety measures";
  } else {
    recommendation = "Conditions suitable for inspection";
  }

  return {
    suitable: !unsuitable,
    warnings,
    recommendation,
  };
}
