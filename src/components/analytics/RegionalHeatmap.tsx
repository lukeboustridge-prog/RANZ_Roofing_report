"use client";

/**
 * Regional Heatmap Component
 * Shows geographic distribution of inspections across NZ regions
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Loader2, TrendingUp, Users, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegionData {
  region: string;
  regionLabel: string;
  totalReports: number;
  totalInspectors: number;
  totalDefects: number;
  avgDefectsPerReport: number;
  mostCommonDefect: string;
  trend: number; // Percentage change from previous period
}

interface RegionalSummary {
  regions: RegionData[];
  totals: {
    reports: number;
    inspectors: number;
    defects: number;
  };
  topRegion: string;
  growthRegion: string;
}

interface RegionalHeatmapProps {
  className?: string;
}

// NZ Regions with display labels
const NZ_REGIONS: Record<string, string> = {
  northland: "Northland",
  auckland: "Auckland",
  waikato: "Waikato",
  "bay-of-plenty": "Bay of Plenty",
  gisborne: "Gisborne",
  "hawkes-bay": "Hawke's Bay",
  taranaki: "Taranaki",
  "manawatu-whanganui": "Manawatu-Whanganui",
  wellington: "Wellington",
  tasman: "Tasman",
  nelson: "Nelson",
  marlborough: "Marlborough",
  "west-coast": "West Coast",
  canterbury: "Canterbury",
  otago: "Otago",
  southland: "Southland",
};

// Intensity colors (cold to hot)
function getIntensityColor(value: number, max: number): string {
  const intensity = max > 0 ? value / max : 0;

  if (intensity === 0) return "bg-gray-100";
  if (intensity < 0.2) return "bg-blue-100";
  if (intensity < 0.4) return "bg-blue-300";
  if (intensity < 0.6) return "bg-amber-300";
  if (intensity < 0.8) return "bg-orange-400";
  return "bg-red-500";
}

function getTextColor(value: number, max: number): string {
  const intensity = max > 0 ? value / max : 0;
  return intensity > 0.6 ? "text-white" : "text-gray-900";
}

export function RegionalHeatmap({ className }: RegionalHeatmapProps) {
  const [data, setData] = useState<RegionalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<"reports" | "defects" | "inspectors">("reports");
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/analytics/regions");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch regional data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getMetricValue = (region: RegionData): number => {
    switch (metric) {
      case "reports":
        return region.totalReports;
      case "defects":
        return region.totalDefects;
      case "inspectors":
        return region.totalInspectors;
      default:
        return region.totalReports;
    }
  };

  const getMetricLabel = (): string => {
    switch (metric) {
      case "reports":
        return "Reports";
      case "defects":
        return "Defects";
      case "inspectors":
        return "Inspectors";
      default:
        return "Reports";
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">No regional data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.regions.map(r => getMetricValue(r)), 1);
  const sortedRegions = [...data.regions].sort((a, b) => getMetricValue(b) - getMetricValue(a));

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Top Region
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{NZ_REGIONS[data.topRegion] || data.topRegion}</div>
            <p className="text-xs text-muted-foreground">Most inspection activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Fastest Growing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{NZ_REGIONS[data.growthRegion] || data.growthRegion}</div>
            <p className="text-xs text-muted-foreground">Highest growth rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Display Metric</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reports">Reports</SelectItem>
                <SelectItem value="defects">Defects</SelectItem>
                <SelectItem value="inspectors">Inspectors</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Distribution</CardTitle>
          <CardDescription>{getMetricLabel()} by New Zealand region</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Grid layout representing NZ regions (simplified) */}
          <div className="grid grid-cols-4 gap-2">
            {/* North Island */}
            <div className="col-span-4 text-xs font-medium text-muted-foreground mb-2">
              North Island
            </div>
            {["northland", "auckland", "waikato", "bay-of-plenty", "gisborne", "hawkes-bay", "taranaki", "manawatu-whanganui", "wellington"].map((regionKey) => {
              const region = data.regions.find(r => r.region === regionKey);
              const value = region ? getMetricValue(region) : 0;

              return (
                <button
                  key={regionKey}
                  onClick={() => setSelectedRegion(region || null)}
                  className={cn(
                    "p-3 rounded-lg text-center transition-all hover:ring-2 hover:ring-ring",
                    getIntensityColor(value, maxValue),
                    getTextColor(value, maxValue),
                    selectedRegion?.region === regionKey && "ring-2 ring-ring"
                  )}
                >
                  <div className="text-xs font-medium truncate">
                    {NZ_REGIONS[regionKey]}
                  </div>
                  <div className="text-lg font-bold">{value}</div>
                </button>
              );
            })}

            {/* South Island */}
            <div className="col-span-4 text-xs font-medium text-muted-foreground mt-4 mb-2">
              South Island
            </div>
            {["tasman", "nelson", "marlborough", "west-coast", "canterbury", "otago", "southland"].map((regionKey) => {
              const region = data.regions.find(r => r.region === regionKey);
              const value = region ? getMetricValue(region) : 0;

              return (
                <button
                  key={regionKey}
                  onClick={() => setSelectedRegion(region || null)}
                  className={cn(
                    "p-3 rounded-lg text-center transition-all hover:ring-2 hover:ring-ring",
                    getIntensityColor(value, maxValue),
                    getTextColor(value, maxValue),
                    selectedRegion?.region === regionKey && "ring-2 ring-ring"
                  )}
                >
                  <div className="text-xs font-medium truncate">
                    {NZ_REGIONS[regionKey]}
                  </div>
                  <div className="text-lg font-bold">{value}</div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-2 mt-6 text-xs">
            <span>Low</span>
            <div className="flex gap-1">
              <div className="h-4 w-8 rounded bg-gray-100" />
              <div className="h-4 w-8 rounded bg-blue-100" />
              <div className="h-4 w-8 rounded bg-blue-300" />
              <div className="h-4 w-8 rounded bg-amber-300" />
              <div className="h-4 w-8 rounded bg-orange-400" />
              <div className="h-4 w-8 rounded bg-red-500" />
            </div>
            <span>High</span>
          </div>
        </CardContent>
      </Card>

      {/* Selected Region Details */}
      {selectedRegion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {selectedRegion.regionLabel}
            </CardTitle>
            <CardDescription>Detailed statistics for this region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-2xl font-bold">{selectedRegion.totalReports}</div>
                <div className="text-xs text-muted-foreground">Reports</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-2xl font-bold">{selectedRegion.totalInspectors}</div>
                <div className="text-xs text-muted-foreground">Inspectors</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{selectedRegion.totalDefects}</div>
                <div className="text-xs text-muted-foreground">Defects Found</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{selectedRegion.avgDefectsPerReport.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Avg Defects/Report</div>
              </div>
            </div>
            {selectedRegion.mostCommonDefect && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                <div className="text-sm font-medium">Most Common Issue</div>
                <div className="text-sm text-muted-foreground">
                  {selectedRegion.mostCommonDefect.replace(/_/g, " ")}
                </div>
              </div>
            )}
            {selectedRegion.trend !== 0 && (
              <div className="mt-4 flex items-center gap-2">
                <TrendingUp className={cn(
                  "h-4 w-4",
                  selectedRegion.trend > 0 ? "text-green-500" : "text-red-500"
                )} />
                <span className="text-sm">
                  {selectedRegion.trend > 0 ? "+" : ""}{selectedRegion.trend}% from previous period
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Region Rankings</CardTitle>
          <CardDescription>All regions sorted by {getMetricLabel().toLowerCase()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedRegions.map((region, index) => (
              <div
                key={region.region}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer",
                  selectedRegion?.region === region.region && "bg-muted"
                )}
                onClick={() => setSelectedRegion(region)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium">{region.regionLabel}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">
                    {getMetricValue(region)} {getMetricLabel().toLowerCase()}
                  </Badge>
                  {region.trend !== 0 && (
                    <span className={cn(
                      "text-xs",
                      region.trend > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {region.trend > 0 ? "+" : ""}{region.trend}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegionalHeatmap;
