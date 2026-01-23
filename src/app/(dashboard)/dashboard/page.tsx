import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from "lucide-react";
import type { ReportStatus } from "@prisma/client";

const statusBadgeVariants: Record<ReportStatus, "draft" | "inProgress" | "pendingReview" | "approved" | "finalised"> = {
  DRAFT: "draft",
  IN_PROGRESS: "inProgress",
  PENDING_REVIEW: "pendingReview",
  APPROVED: "approved",
  FINALISED: "finalised",
};

const statusLabels: Record<ReportStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  FINALISED: "Finalised",
};

async function getDashboardData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    return null;
  }

  const [stats, recentReports] = await Promise.all([
    prisma.report.groupBy({
      by: ["status"],
      where: { inspectorId: user.id },
      _count: true,
    }),
    prisma.report.findMany({
      where: { inspectorId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        reportNumber: true,
        propertyAddress: true,
        propertyCity: true,
        status: true,
        inspectionDate: true,
        updatedAt: true,
      },
    }),
  ]);

  const statusCounts = stats.reduce(
    (acc, { status, _count }) => {
      acc[status] = _count;
      return acc;
    },
    {} as Record<ReportStatus, number>
  );

  return {
    totalReports:
      (statusCounts.DRAFT || 0) +
      (statusCounts.IN_PROGRESS || 0) +
      (statusCounts.PENDING_REVIEW || 0) +
      (statusCounts.APPROVED || 0) +
      (statusCounts.FINALISED || 0),
    draftReports: statusCounts.DRAFT || 0,
    inProgressReports: statusCounts.IN_PROGRESS || 0,
    pendingReviewReports: statusCounts.PENDING_REVIEW || 0,
    completedReports: (statusCounts.APPROVED || 0) + (statusCounts.FINALISED || 0),
    recentReports,
  };
}

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const data = await getDashboardData(userId);

  if (!data) {
    // User not found in database - they need to complete onboarding
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">Welcome to RANZ Reports</h2>
        <p className="text-muted-foreground mb-8">
          Your account is being set up. Please refresh the page in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your reports.
          </p>
        </div>
        <Button asChild>
          <Link href="/reports/new">
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Link>
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalReports}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.draftReports}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-[var(--ranz-orange-500)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.inProgressReports}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completedReports}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No reports yet</h3>
              <p className="mt-2 text-muted-foreground">
                Get started by creating your first inspection report.
              </p>
              <Button asChild className="mt-4">
                <Link href="/reports/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Report
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-secondary/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{report.reportNumber}</span>
                      <Badge variant={statusBadgeVariants[report.status]}>
                        {statusLabels[report.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {report.propertyAddress}, {report.propertyCity}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(report.inspectionDate)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
