import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  FileText,
  MapPin,
  User,
  ArrowRight,
  AlertCircle,
  Clock,
  CheckCircle,
  Send,
} from "lucide-react";
import type { LBPComplaintStatus } from "@prisma/client";

const statusConfig: Record<LBPComplaintStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }> = {
  DRAFT: { label: "Draft", variant: "outline", icon: <FileText className="h-3 w-3" /> },
  PENDING_REVIEW: { label: "Pending Review", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  READY_TO_SUBMIT: { label: "Ready to Submit", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  SUBMITTED: { label: "Submitted", variant: "default", icon: <Send className="h-3 w-3" /> },
  ACKNOWLEDGED: { label: "Acknowledged", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  UNDER_INVESTIGATION: { label: "Under Investigation", variant: "secondary", icon: <AlertCircle className="h-3 w-3" /> },
  HEARING_SCHEDULED: { label: "Hearing Scheduled", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  DECIDED: { label: "Decided", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  CLOSED: { label: "Closed", variant: "outline", icon: <CheckCircle className="h-3 w-3" /> },
  WITHDRAWN: { label: "Withdrawn", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
};

async function getAllComplaints(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }

  const complaints = await prisma.lBPComplaint.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      report: {
        select: {
          id: true,
          reportNumber: true,
          propertyAddress: true,
          propertyCity: true,
          inspector: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Get status counts
  const statusCounts = await prisma.lBPComplaint.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  return {
    complaints,
    statusCounts: statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>),
    total: await prisma.lBPComplaint.count(),
    isSuperAdmin: user.role === "SUPER_ADMIN",
  };
}

export default async function AdminComplaintsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const data = await getAllComplaints(userId);

  if (!data) {
    redirect("/dashboard");
  }

  const { complaints, statusCounts, total, isSuperAdmin } = data;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LBP Complaints</h1>
          <p className="text-muted-foreground">
            Manage complaints to the Building Practitioners Board ({total} total)
          </p>
        </div>
      </div>

      {/* Status summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts["DRAFT"] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts["PENDING_REVIEW"] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Submit</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts["READY_TO_SUBMIT"] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(statusCounts["SUBMITTED"] || 0) +
               (statusCounts["ACKNOWLEDGED"] || 0) +
               (statusCounts["UNDER_INVESTIGATION"] || 0) +
               (statusCounts["HEARING_SCHEDULED"] || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Badge
            key={status}
            variant={statusConfig[status as LBPComplaintStatus]?.variant || "outline"}
            className="px-3 py-1.5 gap-1"
          >
            {statusConfig[status as LBPComplaintStatus]?.icon}
            {statusConfig[status as LBPComplaintStatus]?.label || status}: {count}
          </Badge>
        ))}
      </div>

      {/* Complaints list */}
      {complaints.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No complaints yet</h3>
              <p className="mt-2 text-muted-foreground">
                LBP complaints can be created from dispute reports.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <Card key={complaint.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-lg">{complaint.complaintNumber}</span>
                      <Badge
                        variant={statusConfig[complaint.status]?.variant || "outline"}
                        className="gap-1"
                      >
                        {statusConfig[complaint.status]?.icon}
                        {statusConfig[complaint.status]?.label || complaint.status}
                      </Badge>
                    </div>

                    {/* Subject LBP */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4 shrink-0" />
                      <span>
                        <strong>Subject:</strong> {complaint.subjectLbpName}
                        {complaint.subjectLbpNumber && ` (LBP #${complaint.subjectLbpNumber})`}
                      </span>
                    </div>

                    {/* Property */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{complaint.workAddress}</span>
                    </div>

                    {/* Related Report */}
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span>From Report: {complaint.report.reportNumber}</span>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Created: {formatDate(complaint.createdAt)}</span>
                      {complaint.submittedAt && (
                        <span>Submitted: {formatDate(complaint.submittedAt)}</span>
                      )}
                    </div>

                    {/* Grounds for discipline */}
                    {complaint.groundsForDiscipline.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {complaint.groundsForDiscipline.slice(0, 2).map((ground) => (
                          <Badge key={ground} variant="outline" className="text-xs">
                            {ground}
                          </Badge>
                        ))}
                        {complaint.groundsForDiscipline.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{complaint.groundsForDiscipline.length - 2} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button asChild>
                      <Link href={`/admin/complaints/${complaint.id}`}>
                        View Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    {isSuperAdmin && complaint.status === "READY_TO_SUBMIT" && (
                      <Button variant="secondary" asChild>
                        <Link href={`/admin/complaints/${complaint.id}?action=submit`}>
                          Submit to BPB
                        </Link>
                      </Button>
                    )}
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
