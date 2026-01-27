"use client";

/**
 * Weather Widget Component
 * Displays current weather and inspection suitability
 * Used in report forms to auto-fill weather conditions
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  conditions: string;
  description: string;
  icon: string;
  pressure: number;
  visibility: number;
  cloudCover: number;
  precipitation: number | null;
  timestamp: Date;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
}

interface Assessment {
  suitable: boolean;
  warnings: string[];
  recommendation: string;
}

interface WeatherWidgetProps {
  lat?: number;
  lng?: number;
  onWeatherLoad?: (weather: WeatherData, formatted: string) => void;
  compact?: boolean;
  className?: string;
}

// Weather icon mapping
function getWeatherIcon(conditions: string) {
  const conditionLower = conditions.toLowerCase();
  if (conditionLower.includes("thunder")) return CloudLightning;
  if (conditionLower.includes("rain") || conditionLower.includes("drizzle")) return CloudRain;
  if (conditionLower.includes("snow")) return CloudSnow;
  if (conditionLower.includes("clear")) return Sun;
  return Cloud;
}

export function WeatherWidget({
  lat,
  lng,
  onWeatherLoad,
  compact = false,
  className,
}: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchWeather = useCallback(async (latitude: number, longitude: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/integrations/weather?lat=${latitude}&lng=${longitude}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch weather");
      }

      const data = await response.json();
      setWeather(data.current);
      setAssessment(data.assessment);

      // Notify parent with formatted weather string
      if (onWeatherLoad && data.current) {
        const formatted = formatWeather(data.current);
        onWeatherLoad(data.current, formatted);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weather");
    } finally {
      setLoading(false);
    }
  }, [onWeatherLoad]);

  // Get user's current location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);
        fetchWeather(coords.lat, coords.lng);
      },
      (err) => {
        setError(`Location error: ${err.message}`);
        setLoading(false);
      }
    );
  }, [fetchWeather]);

  // Fetch weather when coordinates are provided
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      fetchWeather(lat, lng);
    }
  }, [lat, lng, fetchWeather]);

  const formatWeather = (w: WeatherData): string => {
    const parts = [
      w.conditions,
      `${w.temperature}°C`,
      `${w.humidity}% humidity`,
      `Wind ${w.windDirection} ${w.windSpeed} km/h`,
    ];
    if (w.precipitation && w.precipitation > 0) {
      parts.push(`${w.precipitation}mm precipitation`);
    }
    return parts.join(", ");
  };

  const handleRefresh = () => {
    if (lat !== undefined && lng !== undefined) {
      fetchWeather(lat, lng);
    } else if (userLocation) {
      fetchWeather(userLocation.lat, userLocation.lng);
    } else {
      getUserLocation();
    }
  };

  const WeatherIcon = weather ? getWeatherIcon(weather.conditions) : Cloud;

  // Compact view
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : weather ? (
          <>
            <WeatherIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {weather.temperature}°C, {weather.conditions}
            </span>
            {assessment && !assessment.suitable && (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-xs"
          >
            <MapPin className="h-3 w-3 mr-1" />
            Get Weather
          </Button>
        )}
      </div>
    );
  }

  // Full view
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather Conditions
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-sm text-red-500 mb-4">{error}</div>
        )}

        {!weather && !loading && !error && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Load weather data for the inspection location
            </p>
            <Button onClick={getUserLocation} variant="outline" size="sm">
              <MapPin className="h-4 w-4 mr-2" />
              Use Current Location
            </Button>
          </div>
        )}

        {loading && !weather && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {weather && (
          <div className="space-y-4">
            {/* Main weather display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <WeatherIcon className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{weather.temperature}°C</p>
                  <p className="text-sm text-muted-foreground">
                    {weather.conditions}
                  </p>
                </div>
              </div>
              {weather.location && (
                <div className="text-right">
                  <p className="text-sm font-medium">{weather.location.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(weather.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>

            {/* Weather details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-muted-foreground" />
                <span>{weather.humidity}% humidity</span>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-muted-foreground" />
                <span>
                  {weather.windDirection} {weather.windSpeed} km/h
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span>{weather.visibility} km visibility</span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <span>{weather.pressure} hPa</span>
              </div>
            </div>

            {/* Assessment */}
            {assessment && (
              <div
                className={cn(
                  "p-3 rounded-lg",
                  assessment.suitable ? "bg-green-50" : "bg-amber-50"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {assessment.suitable ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      assessment.suitable ? "text-green-700" : "text-amber-700"
                    )}
                  >
                    {assessment.recommendation}
                  </span>
                </div>

                {assessment.warnings.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {assessment.warnings.map((warning, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-xs bg-white"
                      >
                        {warning}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WeatherWidget;
