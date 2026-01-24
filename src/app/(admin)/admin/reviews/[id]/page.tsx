import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SeverityBadge } from "@/components/badges/SeverityBadge";
import { ClassificationBadge } from "@/components/badges/ClassificationBadge";
import { ConditionBadge } from "@/components/badges/ConditionBadge";
import { formatDate } from "@/lib/utils";
import { ReviewActions } from "./review-actions";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Camera,
  AlertTriangle,
  Layers,
  FileText,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

async function getReportForReview(reportId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || !["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      inspector: {
        select: {
          id: true,
          name: true,
          email: true,
          qualifications: true,
          lbpNumber: true,
          yearsExperience: true,
        },
      },
      photos: {
        orderBy: { sortOrder: "asc" },
        take: 20,
      },
      defects: {
        orderBy: { defectNumber: "asc" },
        include: {
          photos: { take: 3 },
        },
      },
      roofElements: {
        orderBy: { createdAt: "asc" },
      },
      complianceAssessment: true,
      auditLog: {
        where: {
          action: { in: ["SUBMITTED", "REVIEWED", "APPROVED", "STATUS_CHANGED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!report) {
    return null;
  }

  return { user, report };
}

export default async function ReviewReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    redirect("/sign-in");
  }

  const data = await getReportForReview(id, userId);

  if (!data) {
    notFound();
  }

  const { user, report } = data;
  const canReview = ["PENDING_REVIEW", "UNDER_REVIEW"].includes(report.status);

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/reviews">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Review Queue
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{report.reportNumber}</h1>
            <Badge variant={report.status === "PENDING_REVIEW" ? "outline" : "secondary"}>
              {report.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{report.propertyAddress}, {report.propertyCity}, {report.propertyRegion}</span>
          </div>
        </div>

        {canReview && (
          <ReviewActions reportId={report.id} currentStatus={report.status} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Report Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Inspection Type</span>
                  <p className="font-medium">{report.inspectionType.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Property Type</span>
                  <p className="font-medium">{report.propertyType.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Inspection Date</span>
                  <p className="font-medium">{formatDate(report.inspectionDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Client</span>
                  <p className="font-medium">{report.clientName}</p>
                </div>
                {report.weatherConditions && (
                  <div>
                    <span className="text-muted-foreground">Weather</span>
                    <p className="font-medium">{report.weatherConditions}</p>
                  </div>
                )}
                {report.accessMethod && (
                  <div>
                    <span className="text-muted-foreground">Access Method</span>
                    <p className="font-medium">{report.accessMethod}</p>
                  </div>
                )}
              </div>
              {report.limitations && (
                <div>
                  <span className="text-muted-foreground text-sm">Limitations</span>
                  <p className="text-sm mt-1">{report.limitations}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Defects Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Defects ({report.defects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.defects.length === 0 ? (
                <p className="text-muted-foreground text-sm">No defects documented</p>
              ) : (
                <div className="space-y-4">
                  {report.defects.map((defect) => (
                    <div key={defect.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{defect.defectNumber}</span>
                          <span className="font-medium">{defect.title}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <SeverityBadge severity={defect.severity} />
                          <ClassificationBadge classification={defect.classification} />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{defect.location}</p>
                      <p className="text-sm">{defect.observation}</p>
                      {defect.photos.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {defect.photos.map((photo) => (
                            <div key={photo.id} className="w-16 h-16 rounded overflow-hidden bg-muted">
                              <img
                                src={photo.thumbnailUrl || photo.url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Roof Elements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Roof Elements ({report.roofElements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.roofElements.length === 0 ? (
                <p className="text-muted-foreground text-sm">No elements documented</p>
              ) : (
                <div className="space-y-3">
                  {report.roofElements.map((element) => (
                    <div key={element.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">{element.elementType.replace(/_/g, " ")}</span>
                        <p className="text-sm text-muted-foreground">{element.location}</p>
                      </div>
                      {element.conditionRating && (
                        <ConditionBadge condition={element.conditionRating} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Photos ({report.photos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.photos.length === 0 ? (
                <p className="text-muted-foreground text-sm">No photos uploaded</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {report.photos.slice(0, 12).map((photo) => (
                    <div key={photo.id} className="aspect-square rounded overflow-hidden bg-muted">
                      <img
                        src={photo.thumbnailUrl || photo.url}
                        alt={photo.caption || ""}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {report.photos.length > 12 && (
                    <div className="aspect-square rounded bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">
                        +{report.photos.length - 12} more
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Inspector Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Inspector
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{report.inspector.name}</p>
                <p className="text-sm text-muted-foreground">{report.inspector.email}</p>
              </div>
              {report.inspector.lbpNumber && (
                <div>
                  <span className="text-xs text-muted-foreground">LBP Number</span>
                  <p className="text-sm font-medium">{report.inspector.lbpNumber}</p>
                </div>
              )}
              {report.inspector.yearsExperience && (
                <div>
                  <span className="text-xs text-muted-foreground">Experience</span>
                  <p className="text-sm font-medium">{report.inspector.yearsExperience} years</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.complianceAssessment ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Assessment completed</span>
                  </div>
                  {report.complianceAssessment.nonComplianceSummary && (
                    <div className="mt-3 p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-700">
                        {report.complianceAssessment.nonComplianceSummary}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No compliance assessment</p>
              )}
            </CardContent>
          </Card>

          {/* Audit History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.auditLog.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
