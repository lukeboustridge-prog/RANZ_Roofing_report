"use client";

/**
 * Defect Trends Component
 * Shows defect pattern analysis over time and by category
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
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DefectData {
  classification: string;
  count: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  trendValue: number;
}

interface SeverityData {
  severity: string;
  count: number;
  percentage: number;
}

interface MonthlyTrend {
  month: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface DefectTrendsData {
  byClassification: DefectData[];
  bySeverity: SeverityData[];
  monthlyTrends: MonthlyTrend[];
  topDefectTypes: { type: string; count: number }[];
  totalDefects: number;
  avgPerReport: number;
}

interface DefectTrendsProps {
  className?: string;
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  MAJOR_DEFECT: "bg-red-500",
  MINOR_DEFECT: "bg-amber-500",
  SAFETY_HAZARD: "bg-red-700",
  MAINTENANCE_ITEM: "bg-blue-500",
  WORKMANSHIP_ISSUE: "bg-purple-500",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-amber-500",
  LOW: "bg-green-500",
};

export function DefectTrends({ className }: DefectTrendsProps) {
  const [data, setData] = useState<DefectTrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6months");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/defects?period=${period}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch defect trends:", error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No defect data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxMonthlyTotal = Math.max(...data.monthlyTrends.map(m => m.total), 1);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Total Defects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalDefects.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ~{data.avgPerReport.toFixed(1)} per report
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Most Common</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topDefectTypes.length > 0 ? (
              <div className="space-y-1">
                {data.topDefectTypes.slice(0, 3).map((item, i) => (
                  <div key={item.type} className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      {i + 1}. {item.type.replace(/_/g, " ")}
                    </span>
                    <Badge variant="secondary" className="ml-2">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time Period</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Classification Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Defects by Classification</CardTitle>
          <CardDescription>Distribution of defect types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.byClassification.map((item) => (
              <div key={item.classification} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full",
                        CLASSIFICATION_COLORS[item.classification] || "bg-gray-500"
                      )}
                    />
                    <span className="text-sm font-medium">
                      {item.classification.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(item.trend)}
                    <span className="text-sm">
                      {item.trendValue > 0 ? "+" : ""}
                      {item.trendValue}%
                    </span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      CLASSIFICATION_COLORS[item.classification] || "bg-gray-500"
                    )}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Severity Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Defects by Severity</CardTitle>
          <CardDescription>Priority distribution of identified issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            {data.bySeverity.map((item) => (
              <div
                key={item.severity}
                className="flex-1 text-center"
              >
                <div
                  className={cn(
                    "h-24 rounded-lg flex items-end justify-center pb-2",
                    SEVERITY_COLORS[item.severity] || "bg-gray-500"
                  )}
                  style={{ opacity: 0.2 + (item.percentage / 100) * 0.8 }}
                >
                  <span className="text-2xl font-bold text-white mix-blend-difference">
                    {item.count}
                  </span>
                </div>
                <p className="text-xs mt-2 font-medium">
                  {item.severity}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.percentage.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Defect Trends</CardTitle>
          <CardDescription>Defect counts over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-48">
            {data.monthlyTrends.map((month) => (
              <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col-reverse gap-0.5">
                  {/* Stacked bar */}
                  <div
                    className="w-full bg-green-500 rounded-t"
                    style={{ height: `${(month.low / maxMonthlyTotal) * 150}px` }}
                  />
                  <div
                    className="w-full bg-amber-500"
                    style={{ height: `${(month.medium / maxMonthlyTotal) * 150}px` }}
                  />
                  <div
                    className="w-full bg-orange-500"
                    style={{ height: `${(month.high / maxMonthlyTotal) * 150}px` }}
                  />
                  <div
                    className="w-full bg-red-500 rounded-t"
                    style={{ height: `${(month.critical / maxMonthlyTotal) * 150}px` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground mt-2">{month.month}</span>
                <span className="text-xs font-medium">{month.total}</span>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-red-500" />
              <span>Critical</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-orange-500" />
              <span>High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-amber-500" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-green-500" />
              <span>Low</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DefectTrends;
