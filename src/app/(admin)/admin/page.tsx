import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  ScrollText,
  LayoutTemplate,
} from "lucide-react";

async function getAdminDashboardData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || !["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }

  const [
    userStats,
    reportStats,
    pendingReviewCount,
    underReviewCount,
    recentReports,
    recentUsers,
  ] = await Promise.all([
    // User stats by role
    prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    }),
    // Report stats by status
    prisma.report.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    // Pending review count
    prisma.report.count({
      where: { status: "PENDING_REVIEW" },
    }),
    // Under review count
    prisma.report.count({
      where: { status: "UNDER_REVIEW" },
    }),
    // Recent reports needing review
    prisma.report.findMany({
      where: {
        status: { in: ["PENDING_REVIEW", "UNDER_REVIEW"] },
      },
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: {
        inspector: {
          select: { name: true },
        },
      },
    }),
    // Recently registered users
    prisma.user.findMany({
      where: { status: "PENDING_APPROVAL" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const totalUsers = userStats.reduce((acc, stat) => acc + stat._count.role, 0);
  const totalReports = reportStats.reduce((acc, stat) => acc + stat._count.status, 0);

  return {
    user,
    stats: {
      totalUsers,
      totalReports,
      pendingReviewCount,
      underReviewCount,
      pendingApprovalUsers: recentUsers.length,
    },
    userStats,
    reportStats,
    recentReports,
    recentUsers,
  };
}

export default async function AdminDashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const data = await getAdminDashboardData(userId);

  if (!data) {
    redirect("/dashboard");
  }

  const { stats, recentReports, recentUsers } = data;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform overview and management tools
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReviewCount}</div>
            <p className="text-xs text-muted-foreground">
              Reports awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.underReviewCount}</div>
            <p className="text-xs text-muted-foreground">
              Currently being reviewed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-muted-foreground">
              All time reports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            {stats.pendingApprovalUsers > 0 && (
              <p className="text-xs text-orange-500">
                {stats.pendingApprovalUsers} pending approval
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-orange-500" />
              Review Queue
            </CardTitle>
            <CardDescription>
              Review and approve submitted reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/reviews">
                View Queue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              LBP Complaints
            </CardTitle>
            <CardDescription>
              Manage Building Practitioners Board complaints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/complaints">
                View Complaints
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage inspectors and reviewers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/users">
                Manage Users
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Analytics
            </CardTitle>
            <CardDescription>
              View platform statistics and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/analytics">
                View Analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-purple-500" />
              Templates
            </CardTitle>
            <CardDescription>
              Manage report templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/templates">
                Manage Templates
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-gray-500" />
              Audit Logs
            </CardTitle>
            <CardDescription>
              View system activity logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/audit-logs">
                View Logs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reports needing review */}
        <Card>
          <CardHeader>
            <CardTitle>Reports Needing Review</CardTitle>
            <CardDescription>
              Recently submitted reports awaiting approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-2 text-sm text-muted-foreground">
                  All caught up! No reports pending review.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/admin/reviews/${report.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{report.reportNumber}</span>
                        <Badge variant={report.status === "PENDING_REVIEW" ? "outline" : "secondary"}>
                          {report.status === "PENDING_REVIEW" ? "Pending" : "In Review"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {report.propertyAddress}, {report.propertyCity}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        By {report.inspector.name}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users pending approval */}
        <Card>
          <CardHeader>
            <CardTitle>Users Pending Approval</CardTitle>
            <CardDescription>
              New user registrations awaiting approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No users pending approval.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <Link
                    key={user.id}
                    href={`/admin/users/${user.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name}</span>
                        <Badge variant="outline" className="text-orange-500 border-orange-200">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Applied as {user.role}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
