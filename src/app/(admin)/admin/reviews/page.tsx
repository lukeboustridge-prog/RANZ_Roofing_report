import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  ClipboardCheck,
  Clock,
  MapPin,
  User,
  Camera,
  AlertTriangle,
  ArrowRight,
  Filter,
} from "lucide-react";
import type { ReportStatus } from "@prisma/client";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING_REVIEW: { label: "Pending Review", variant: "outline" },
  UNDER_REVIEW: { label: "Under Review", variant: "secondary" },
  REVISION_REQUIRED: { label: "Revision Required", variant: "destructive" },
};

async function getReviewQueue(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || !["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }

  const reports = await prisma.report.findMany({
    where: {
      status: { in: ["PENDING_REVIEW", "UNDER_REVIEW", "REVISION_REQUIRED"] },
    },
    orderBy: [
      { status: "asc" }, // PENDING_REVIEW first
      { submittedAt: "asc" }, // Oldest first
    ],
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
          roofElements: true,
        },
      },
    },
  });

  // Get counts by status
  const statusCounts = await prisma.report.groupBy({
    by: ["status"],
    where: {
      status: { in: ["PENDING_REVIEW", "UNDER_REVIEW", "REVISION_REQUIRED"] },
    },
    _count: { status: true },
  });

  const counts = statusCounts.reduce((acc, item) => {
    acc[item.status] = item._count.status;
    return acc;
  }, {} as Record<string, number>);

  return { user, reports, counts };
}

export default async function ReviewQueuePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const data = await getReviewQueue(userId);

  if (!data) {
    redirect("/dashboard");
  }

  const { reports, counts } = data;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-muted-foreground">
            Review and approve submitted inspection reports
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="px-3 py-1.5 text-sm">
          <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
          Pending: {counts.PENDING_REVIEW || 0}
        </Badge>
        <Badge variant="secondary" className="px-3 py-1.5 text-sm">
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Under Review: {counts.UNDER_REVIEW || 0}
        </Badge>
        <Badge variant="destructive" className="px-3 py-1.5 text-sm bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
          Revision Required: {counts.REVISION_REQUIRED || 0}
        </Badge>
      </div>

      {/* Reports list */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ClipboardCheck className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-semibold">All caught up!</h3>
              <p className="mt-2 text-muted-foreground">
                There are no reports waiting for review.
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4 shrink-0" />
                      <span>Submitted by {report.inspector.name}</span>
                      {report.submittedAt && (
                        <span className="text-xs">
                          on {formatDate(report.submittedAt)}
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Camera className="h-4 w-4 text-muted-foreground" />
                        <span>{report._count.photos} photos</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        <span>{report._count.defects} defects</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0">
                    <Button asChild>
                      <Link href={`/admin/reviews/${report.id}`}>
                        Review
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
