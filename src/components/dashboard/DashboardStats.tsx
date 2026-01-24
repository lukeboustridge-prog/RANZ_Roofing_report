"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Camera,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard Statistics Component
 * Displays key metrics and statistics for the user's reports
 */

interface DashboardStatsData {
  overview: {
    totalReports: number;
    reportsThisMonth: number;
    reportsThisWeek: number;
    totalPhotos: number;
    photosThisMonth: number;
    totalDefects: number;
    averageDefectsPerReport: number;
    completionRate: number;
  };
  reportsByStatus: Record<string, number>;
  defectsBySeverity: Record<string, number>;
  reportsByInspectionType: Record<string, number>;
  trends: {
    dailyReports: Array<{ date: string; count: number }>;
  };
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  PENDING_REVIEW: "Pending Review",
  UNDER_REVIEW: "Under Review",
  REVISION_REQUIRED: "Revision Required",
  APPROVED: "Approved",
  FINALISED: "Finalised",
  ARCHIVED: "Archived",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-green-500",
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trend && (
          <div
            className={`flex items-center text-xs ${
              trend.positive ? "text-green-600" : "text-red-600"
            }`}
          >
            <TrendingUp
              className={`h-3 w-3 mr-1 ${!trend.positive && "rotate-180"}`}
            />
            {trend.positive ? "+" : ""}
            {trend.value}% from last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) {
          throw new Error("Failed to fetch statistics");
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>Failed to load statistics</p>
          <p className="text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  const { overview, reportsByStatus, defectsBySeverity } = stats;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Reports"
          value={overview.totalReports}
          subtitle={`${overview.reportsThisMonth} this month`}
          icon={FileText}
        />
        <StatCard
          title="Total Photos"
          value={overview.totalPhotos}
          subtitle={`${overview.photosThisMonth} this month`}
          icon={Camera}
        />
        <StatCard
          title="Total Defects"
          value={overview.totalDefects}
          subtitle={`~${overview.averageDefectsPerReport} per report`}
          icon={AlertTriangle}
        />
        <StatCard
          title="Completion Rate"
          value={`${overview.completionRate}%`}
          subtitle="Reports approved or finalised"
          icon={CheckCircle}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Reports by Status */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Reports by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(reportsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {STATUS_LABELS[status] || status}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
              {Object.keys(reportsByStatus).length === 0 && (
                <p className="text-sm text-muted-foreground">No reports yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Defects by Severity */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Defects by Severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((severity) => {
                const count = defectsBySeverity[severity] || 0;
                const total = overview.totalDefects || 1;
                const percentage = Math.round((count / total) * 100);

                return (
                  <div key={severity}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm capitalize">
                        {severity.toLowerCase()}
                      </span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${SEVERITY_COLORS[severity]} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Activity */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Reports Created
                </span>
                <span className="text-2xl font-bold">
                  {overview.reportsThisWeek}
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">
                  Recent Activity
                </div>
                <div className="flex gap-1">
                  {stats.trends.dailyReports.slice(-7).map((day, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        className={`w-full rounded-sm ${
                          day.count > 0 ? "bg-primary" : "bg-muted"
                        }`}
                        style={{
                          height: `${Math.max(4, day.count * 8)}px`,
                          opacity: day.count > 0 ? 1 : 0.3,
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(day.date).toLocaleDateString("en-NZ", {
                          weekday: "narrow",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardStats;
