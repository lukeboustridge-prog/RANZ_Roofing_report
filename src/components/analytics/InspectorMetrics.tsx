"use client";

/**
 * Inspector Metrics Component
 * Shows performance metrics for individual inspectors
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  FileText,
  Camera,
  Clock,
  Award,
  TrendingUp,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InspectorStats {
  id: string;
  name: string;
  email: string;
  totalReports: number;
  completedReports: number;
  pendingReports: number;
  totalPhotos: number;
  totalDefects: number;
  avgPhotosPerReport: number;
  avgDefectsPerReport: number;
  avgCompletionDays: number;
  revisionRate: number;
  approvalRate: number;
  regions: string[];
  specialisations: string[];
  lastActive: Date | null;
  memberSince: Date;
  rating: number | null;
}

interface InspectorMetricsData {
  inspectors: InspectorStats[];
  summary: {
    totalInspectors: number;
    activeInspectors: number;
    avgReportsPerInspector: number;
    avgApprovalRate: number;
  };
}

interface InspectorMetricsProps {
  className?: string;
}

export function InspectorMetrics({ className }: InspectorMetricsProps) {
  const [data, setData] = useState<InspectorMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"reports" | "approval" | "speed" | "name">("reports");
  const [selectedInspector, setSelectedInspector] = useState<InspectorStats | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/analytics/inspectors");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch inspector metrics:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredInspectors = data?.inspectors.filter(
    inspector =>
      inspector.name.toLowerCase().includes(search.toLowerCase()) ||
      inspector.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const sortedInspectors = [...filteredInspectors].sort((a, b) => {
    switch (sortBy) {
      case "reports":
        return b.totalReports - a.totalReports;
      case "approval":
        return b.approvalRate - a.approvalRate;
      case "speed":
        return a.avgCompletionDays - b.avgCompletionDays;
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const getPerformanceBadge = (inspector: InspectorStats) => {
    if (inspector.approvalRate >= 90 && inspector.totalReports >= 10) {
      return { label: "Top Performer", variant: "default" as const, color: "bg-green-500" };
    }
    if (inspector.revisionRate > 30) {
      return { label: "Needs Improvement", variant: "destructive" as const, color: "bg-orange-500" };
    }
    if (inspector.totalReports >= 5) {
      return { label: "Experienced", variant: "secondary" as const, color: "bg-blue-500" };
    }
    return { label: "New", variant: "outline" as const, color: "bg-gray-500" };
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
          <p className="text-muted-foreground">No inspector data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Inspectors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.summary.totalInspectors}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.activeInspectors} active this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Avg Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.summary.avgReportsPerInspector.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Per inspector</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Avg Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.summary.avgApprovalRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">First-time approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.inspectors.filter(i => i.approvalRate >= 90 && i.totalReports >= 10).length}
            </div>
            <p className="text-xs text-muted-foreground">90%+ approval rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Sort */}
      <Card>
        <CardHeader>
          <CardTitle>Inspector Performance</CardTitle>
          <CardDescription>Individual performance metrics and rankings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inspectors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reports">Most Reports</SelectItem>
                <SelectItem value="approval">Highest Approval</SelectItem>
                <SelectItem value="speed">Fastest Completion</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inspector List */}
          <div className="space-y-3">
            {sortedInspectors.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No inspectors found</p>
            ) : (
              sortedInspectors.map((inspector, index) => {
                const badge = getPerformanceBadge(inspector);
                return (
                  <div
                    key={inspector.id}
                    onClick={() => setSelectedInspector(
                      selectedInspector?.id === inspector.id ? null : inspector
                    )}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                      selectedInspector?.id === inspector.id && "ring-2 ring-ring bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-[var(--ranz-charcoal)] flex items-center justify-center">
                          <span className="text-white font-medium">
                            {inspector.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{inspector.name}</span>
                            <Badge variant={badge.variant} className="text-xs">
                              {badge.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{inspector.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-bold">{inspector.totalReports}</div>
                          <div className="text-xs text-muted-foreground">Reports</div>
                        </div>
                        <div className="text-center">
                          <div className={cn(
                            "font-bold",
                            inspector.approvalRate >= 90 ? "text-green-600" :
                              inspector.approvalRate >= 70 ? "text-amber-600" : "text-red-600"
                          )}>
                            {inspector.approvalRate.toFixed(0)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Approval</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold">
                            {inspector.avgCompletionDays.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Days</div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {selectedInspector?.id === inspector.id && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Report Statistics</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Completed</span>
                                <span>{inspector.completedReports}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Pending</span>
                                <span>{inspector.pendingReports}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Photos</span>
                                <span>{inspector.totalPhotos}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Defects</span>
                                <span>{inspector.totalDefects}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-2">Quality Metrics</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Avg Photos/Report</span>
                                <span>{inspector.avgPhotosPerReport.toFixed(1)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Avg Defects/Report</span>
                                <span>{inspector.avgDefectsPerReport.toFixed(1)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Revision Rate</span>
                                <span className={cn(
                                  inspector.revisionRate > 30 ? "text-red-600" : ""
                                )}>
                                  {inspector.revisionRate.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-2">Coverage</h4>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {inspector.regions.slice(0, 3).map(region => (
                                <Badge key={region} variant="outline" className="text-xs">
                                  {region}
                                </Badge>
                              ))}
                              {inspector.regions.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{inspector.regions.length - 3}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {inspector.specialisations.slice(0, 3).map(spec => (
                                <Badge key={spec} variant="secondary" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <div className="text-xs text-muted-foreground">
                            Member since {new Date(inspector.memberSince).toLocaleDateString()}
                            {inspector.lastActive && (
                              <> • Last active {new Date(inspector.lastActive).toLocaleDateString()}</>
                            )}
                          </div>
                          {inspector.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{inspector.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Distribution</CardTitle>
          <CardDescription>Approval rate distribution across all inspectors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between h-32 gap-2">
            {[
              { label: "90-100%", min: 90, max: 100, color: "bg-green-500" },
              { label: "80-89%", min: 80, max: 89, color: "bg-green-400" },
              { label: "70-79%", min: 70, max: 79, color: "bg-amber-400" },
              { label: "60-69%", min: 60, max: 69, color: "bg-orange-400" },
              { label: "<60%", min: 0, max: 59, color: "bg-red-400" },
            ].map((bucket) => {
              const count = data.inspectors.filter(
                i => i.approvalRate >= bucket.min && i.approvalRate <= bucket.max
              ).length;
              const percentage = data.inspectors.length > 0
                ? (count / data.inspectors.length) * 100
                : 0;

              return (
                <div key={bucket.label} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={cn("w-full rounded-t transition-all", bucket.color)}
                    style={{ height: `${percentage}%`, minHeight: count > 0 ? "8px" : "0" }}
                  />
                  <span className="text-xs font-medium">{count}</span>
                  <span className="text-xs text-muted-foreground">{bucket.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default InspectorMetrics;
