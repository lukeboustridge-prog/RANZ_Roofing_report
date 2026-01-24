import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  FileText,
  MapPin,
  User,
  Camera,
  AlertTriangle,
  ArrowRight,
  Filter,
} from "lucide-react";
import type { ReportStatus } from "@prisma/client";

const statusConfig: Record<ReportStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "Draft", variant: "outline" },
  IN_PROGRESS: { label: "In Progress", variant: "outline" },
  PENDING_REVIEW: { label: "Pending Review", variant: "secondary" },
  UNDER_REVIEW: { label: "Under Review", variant: "secondary" },
  REVISION_REQUIRED: { label: "Revision Required", variant: "destructive" },
  APPROVED: { label: "Approved", variant: "default" },
  FINALISED: { label: "Finalised", variant: "default" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

async function getAllReports(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || !["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      inspector: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          photos: true,
          defects: true,
        },
      },
    },
  });

  // Get status counts
  const statusCounts = await prisma.report.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  return {
    reports,
    statusCounts: statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>),
    total: await prisma.report.count(),
  };
}

export default async function AdminReportsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const data = await getAllReports(userId);

  if (!data) {
    redirect("/dashboard");
  }

  const { reports, statusCounts, total } = data;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Reports</h1>
        <p className="text-muted-foreground">
          View and manage all inspection reports ({total} total)
        </p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Badge
            key={status}
            variant={statusConfig[status as ReportStatus]?.variant || "outline"}
            className="px-3 py-1.5"
          >
            {statusConfig[status as ReportStatus]?.label || status}: {count}
          </Badge>
        ))}
      </div>

      {/* Reports list */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No reports yet</h3>
              <p className="mt-2 text-muted-foreground">
                Reports will appear here once inspectors create them.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-lg">{report.reportNumber}</span>
                      <Badge variant={statusConfig[report.status]?.variant || "outline"}>
                        {statusConfig[report.status]?.label || report.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {report.inspectionType.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {/* Property */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{report.propertyAddress}, {report.propertyCity}</span>
                    </div>

                    {/* Inspector */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4 shrink-0" />
                        <span>{report.inspector.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Camera className="h-4 w-4" />
                        <span>{report._count.photos} photos</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{report._count.defects} defects</span>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="text-xs text-muted-foreground">
                      Created: {formatDate(report.createdAt)}
                      {report.submittedAt && ` | Submitted: ${formatDate(report.submittedAt)}`}
                      {report.approvedAt && ` | Approved: ${formatDate(report.approvedAt)}`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0">
                    <Button variant="outline" asChild>
                      <Link href={`/admin/reviews/${report.id}`}>
                        View
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
