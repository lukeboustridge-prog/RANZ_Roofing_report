import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  FileText,
  Camera,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Award,
} from "lucide-react";

async function getAnalytics(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }

  // Get date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers,
    totalReports,
    totalPhotos,
    totalDefects,
    usersByRole,
    reportsByStatus,
    reportsByType,
    reportsLast30Days,
    topInspectors,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.report.count(),
    prisma.photo.count(),
    prisma.defect.count(),
    prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    }),
    prisma.report.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.report.groupBy({
      by: ["inspectionType"],
      _count: { inspectionType: true },
    }),
    prisma.report.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.user.findMany({
      where: {
        role: "INSPECTOR",
        reports: { some: {} },
      },
      select: {
        id: true,
        name: true,
        _count: { select: { reports: true } },
      },
      orderBy: {
        reports: { _count: "desc" },
      },
      take: 5,
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        report: {
          select: {
            reportNumber: true,
          },
        },
      },
    }),
  ]);

  // Calculate averages
  const avgPhotosPerReport = totalReports > 0 ? Math.round(totalPhotos / totalReports) : 0;
  const avgDefectsPerReport = totalReports > 0 ? Math.round((totalDefects / totalReports) * 10) / 10 : 0;

  return {
    overview: {
      totalUsers,
      totalReports,
      totalPhotos,
      totalDefects,
      reportsLast30Days,
      avgPhotosPerReport,
      avgDefectsPerReport,
    },
    usersByRole: usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {} as Record<string, number>),
    reportsByStatus: reportsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>),
    reportsByType: reportsByType.reduce((acc, item) => {
      acc[item.inspectionType] = item._count.inspectionType;
      return acc;
    }, {} as Record<string, number>),
    topInspectors,
    recentActivity,
  };
}

export default async function AnalyticsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const data = await getAnalytics(userId);

  if (!data) {
    redirect("/dashboard");
  }

  const { overview, usersByRole, reportsByStatus, reportsByType, topInspectors, recentActivity } = data;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Platform statistics and performance metrics
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalReports}</div>
            <p className="text-xs text-muted-foreground">
              +{overview.reportsLast30Days} in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {usersByRole.INSPECTOR || 0} inspectors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalPhotos.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ~{overview.avgPhotosPerReport} per report
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Defects</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalDefects.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ~{overview.avgDefectsPerReport} per report
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reports by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Reports by Status</CardTitle>
            <CardDescription>Distribution of report statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(reportsByStatus).map(([status, count]) => {
                const percentage = overview.totalReports > 0
                  ? Math.round((count / overview.totalReports) * 100)
                  : 0;
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{status.replace(/_/g, " ")}</span>
                      <span className="font-medium">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[var(--ranz-blue-500)]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Reports by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Reports by Inspection Type</CardTitle>
            <CardDescription>Types of inspections performed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(reportsByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const percentage = overview.totalReports > 0
                    ? Math.round((count / overview.totalReports) * 100)
                    : 0;
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{type.replace(/_/g, " ")}</span>
                        <span className="font-medium">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[var(--ranz-orange-500)]"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Top Inspectors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Inspectors
            </CardTitle>
            <CardDescription>Most active inspectors by report count</CardDescription>
          </CardHeader>
          <CardContent>
            {topInspectors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-4">
                {topInspectors.map((inspector, index) => (
                  <div key={inspector.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{inspector.name}</span>
                    </div>
                    <Badge variant="secondary">
                      {inspector._count.reports} reports
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users by Role */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users by Role
            </CardTitle>
            <CardDescription>Distribution of user roles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(usersByRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={role === "ADMIN" || role === "SUPER_ADMIN" ? "default" : "outline"}>
                      {role.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest actions across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                      {log.report && (
                        <span className="text-sm font-medium">{log.report.reportNumber}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
