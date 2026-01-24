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
  Clock,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
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
    // Review analytics
    pendingReviewCount,
    underReviewCount,
    revisionRequiredCount,
    approvedCount,
    totalReviewComments,
    unresolvedComments,
    reviewCommentsBySeverity,
    reportsWithRevisions,
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
    // Review analytics queries
    prisma.report.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.report.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.report.count({ where: { status: "REVISION_REQUIRED" } }),
    prisma.report.count({ where: { status: { in: ["APPROVED", "FINALISED"] } } }),
    prisma.reviewComment.count(),
    prisma.reviewComment.count({ where: { resolved: false } }),
    prisma.reviewComment.groupBy({
      by: ["severity"],
      _count: { severity: true },
    }),
    prisma.report.count({ where: { revisionRound: { gt: 0 } } }),
  ]);

  // Calculate averages
  const avgPhotosPerReport = totalReports > 0 ? Math.round(totalPhotos / totalReports) : 0;
  const avgDefectsPerReport = totalReports > 0 ? Math.round((totalDefects / totalReports) * 10) / 10 : 0;

  // Calculate revision rate
  const totalSubmitted = approvedCount + revisionRequiredCount + pendingReviewCount + underReviewCount;
  const revisionRate = totalSubmitted > 0
    ? Math.round((reportsWithRevisions / totalSubmitted) * 100)
    : 0;

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
    // Review analytics
    reviewStats: {
      pendingReview: pendingReviewCount,
      underReview: underReviewCount,
      revisionRequired: revisionRequiredCount,
      approved: approvedCount,
      totalComments: totalReviewComments,
      unresolvedComments,
      revisionRate,
      commentsBySeverity: reviewCommentsBySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count.severity;
        return acc;
      }, {} as Record<string, number>),
    },
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

  const { overview, usersByRole, reportsByStatus, reportsByType, topInspectors, recentActivity, reviewStats } = data;

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

      {/* Review Queue Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[var(--ranz-charcoal)]" />
          Review Queue
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reviewStats.pendingReview}</div>
              <p className="text-xs text-muted-foreground">Awaiting reviewer</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reviewStats.underReview}</div>
              <p className="text-xs text-muted-foreground">Currently being reviewed</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revision Required</CardTitle>
              <RefreshCw className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reviewStats.revisionRequired}</div>
              <p className="text-xs text-muted-foreground">Awaiting inspector updates</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reviewStats.approved}</div>
              <p className="text-xs text-muted-foreground">Ready for delivery</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Metrics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Revision Rate
            </CardTitle>
            <CardDescription>Reports requiring revisions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[var(--ranz-charcoal)]">
              {reviewStats.revisionRate}%
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-orange-500"
                style={{ width: `${reviewStats.revisionRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Lower is better - indicates quality of initial submissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Review Comments
            </CardTitle>
            <CardDescription>Feedback items across all reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[var(--ranz-charcoal)]">
              {reviewStats.totalComments}
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm">
                  {reviewStats.totalComments - reviewStats.unresolvedComments} resolved
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-500" />
                <span className="text-sm">{reviewStats.unresolvedComments} pending</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Comments by Severity
            </CardTitle>
            <CardDescription>Distribution of feedback types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { key: "CRITICAL", label: "Critical", color: "bg-red-500" },
                { key: "ISSUE", label: "Issues", color: "bg-orange-500" },
                { key: "NOTE", label: "Notes", color: "bg-blue-500" },
                { key: "SUGGESTION", label: "Suggestions", color: "bg-green-500" },
              ].map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${color}`} />
                    <span className="text-sm">{label}</span>
                  </div>
                  <span className="font-medium">
                    {reviewStats.commentsBySeverity[key] || 0}
                  </span>
                </div>
              ))}
            </div>
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
