import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Camera,
  AlertTriangle,
  FileText,
  MapPin,
  Calendar,
  User,
  Layers,
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

async function getReport(reportId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) return null;

  return prisma.report.findFirst({
    where: {
      id: reportId,
      inspectorId: user.id,
    },
    include: {
      inspector: true,
      photos: {
        orderBy: { sortOrder: "asc" },
        take: 6,
      },
      defects: {
        orderBy: { defectNumber: "asc" },
      },
      roofElements: true,
      _count: {
        select: {
          photos: true,
          defects: true,
        },
      },
    },
  });
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    redirect("/sign-in");
  }

  const report = await getReport(id, userId);

  if (!report) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Back button and header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/reports"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {report.reportNumber}
            </h1>
            <Badge variant={statusBadgeVariants[report.status]}>
              {statusLabels[report.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {report.propertyAddress}, {report.propertyCity}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/reports/${report.id}/pdf`}>
              <FileText className="mr-2 h-4 w-4" />
              Preview PDF
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[var(--ranz-blue-50)] rounded-lg">
                <Camera className="h-5 w-5 text-[var(--ranz-blue-600)]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{report._count.photos}</p>
                <p className="text-sm text-muted-foreground">Photos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{report._count.defects}</p>
                <p className="text-sm text-muted-foreground">Defects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {formatDate(report.inspectionDate)}
                </p>
                <p className="text-sm text-muted-foreground">Inspection Date</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{report.clientName}</p>
                <p className="text-sm text-muted-foreground">Client</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Address</p>
                <p className="font-medium">{report.propertyAddress}</p>
              </div>
              <div>
                <p className="text-muted-foreground">City</p>
                <p className="font-medium">{report.propertyCity}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Region</p>
                <p className="font-medium">{report.propertyRegion}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Postcode</p>
                <p className="font-medium">{report.propertyPostcode}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Property Type</p>
                <p className="font-medium">
                  {report.propertyType.replace(/_/g, " ")}
                </p>
              </div>
              {report.buildingAge && (
                <div>
                  <p className="text-muted-foreground">Building Age</p>
                  <p className="font-medium">{report.buildingAge} years</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inspection Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Inspection Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(report.inspectionDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">
                  {report.inspectionType.replace(/_/g, " ")}
                </p>
              </div>
              {report.weatherConditions && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Weather</p>
                  <p className="font-medium">{report.weatherConditions}</p>
                </div>
              )}
              {report.accessMethod && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Access Method</p>
                  <p className="font-medium">{report.accessMethod}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Button variant="outline" asChild className="h-auto py-4">
          <Link href={`/reports/${report.id}/elements`}>
            <div className="flex flex-col items-center gap-2">
              <Layers className="h-6 w-6" />
              <span>Roof Elements</span>
              <span className="text-xs text-muted-foreground">
                {report.roofElements.length} documented
              </span>
            </div>
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-auto py-4">
          <Link href={`/reports/${report.id}/defects`}>
            <div className="flex flex-col items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              <span>Defects</span>
              <span className="text-xs text-muted-foreground">
                {report._count.defects} recorded
              </span>
            </div>
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-auto py-4">
          <Link href={`/reports/${report.id}/photos`}>
            <div className="flex flex-col items-center gap-2">
              <Camera className="h-6 w-6" />
              <span>Photos</span>
              <span className="text-xs text-muted-foreground">
                {report._count.photos} uploaded
              </span>
            </div>
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-auto py-4">
          <Link href={`/reports/${report.id}/pdf`}>
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-6 w-6" />
              <span>Generate PDF</span>
              <span className="text-xs text-muted-foreground">
                Preview and download
              </span>
            </div>
          </Link>
        </Button>
      </div>
    </div>
  );
}
