import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Plus, FileText } from "lucide-react";
import type { ReportStatus } from "@prisma/client";

const statusBadgeVariants: Record<ReportStatus, "draft" | "inProgress" | "pendingReview" | "approved" | "finalised"> = {
  DRAFT: "draft",
  IN_PROGRESS: "inProgress",
  PENDING_REVIEW: "pendingReview",
  UNDER_REVIEW: "pendingReview",
  REVISION_REQUIRED: "draft",
  APPROVED: "approved",
  FINALISED: "finalised",
  ARCHIVED: "finalised",
};

const statusLabels: Record<ReportStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  PENDING_REVIEW: "Pending Review",
  UNDER_REVIEW: "Under Review",
  REVISION_REQUIRED: "Revision Required",
  APPROVED: "Approved",
  FINALISED: "Finalised",
  ARCHIVED: "Archived",
};

async function getReports(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) return [];

  return prisma.report.findMany({
    where: { inspectorId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      reportNumber: true,
      propertyAddress: true,
      propertyCity: true,
      propertyRegion: true,
      status: true,
      inspectionDate: true,
      clientName: true,
      updatedAt: true,
      _count: {
        select: {
          defects: true,
          photos: true,
        },
      },
    },
  });
}

export default async function ReportsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const reports = await getReports(userId);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Manage your roofing inspection reports.
          </p>
        </div>
        <Button asChild>
          <Link href="/reports/new">
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Link>
        </Button>
      </div>

      {/* Reports list */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
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
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Link key={report.id} href={`/reports/${report.id}`}>
              <Card className="hover:bg-secondary/50 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">
                          {report.reportNumber}
                        </span>
                        <Badge variant={statusBadgeVariants[report.status]}>
                          {statusLabels[report.status]}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {report.propertyAddress}, {report.propertyCity},{" "}
                        {report.propertyRegion}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Client: {report.clientName}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Inspected: {formatDate(report.inspectionDate)}</p>
                      <p className="mt-1">
                        {report._count.defects} defects &bull;{" "}
                        {report._count.photos} photos
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
