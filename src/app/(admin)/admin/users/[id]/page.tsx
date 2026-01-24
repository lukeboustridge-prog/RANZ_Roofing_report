import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { UserActions } from "./user-actions";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  MapPin,
  FileText,
  Award,
  Calendar,
  Shield,
  User as UserIcon,
} from "lucide-react";
import type { UserRole, UserStatus } from "@prisma/client";

const roleConfig: Record<UserRole, { label: string; variant: "default" | "secondary" | "outline" }> = {
  INSPECTOR: { label: "Inspector", variant: "outline" },
  REVIEWER: { label: "Reviewer", variant: "secondary" },
  ADMIN: { label: "Admin", variant: "default" },
  SUPER_ADMIN: { label: "Super Admin", variant: "default" },
};

const statusConfig: Record<UserStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-green-100 text-green-700 border-green-200" },
  SUSPENDED: { label: "Suspended", className: "bg-red-100 text-red-700 border-red-200" },
  PENDING_APPROVAL: { label: "Pending Approval", className: "bg-orange-100 text-orange-700 border-orange-200" },
};

async function getUserDetails(targetUserId: string, currentUserId: string) {
  const currentUser = await prisma.user.findUnique({
    where: { clerkId: currentUserId },
  });

  if (!currentUser || !["ADMIN", "SUPER_ADMIN"].includes(currentUser.role)) {
    return null;
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      reports: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          reportNumber: true,
          status: true,
          propertyAddress: true,
          propertyCity: true,
          createdAt: true,
        },
      },
      _count: {
        select: { reports: true },
      },
    },
  });

  if (!targetUser) {
    return null;
  }

  return { currentUser, targetUser };
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    redirect("/sign-in");
  }

  const data = await getUserDetails(id, userId);

  if (!data) {
    notFound();
  }

  const { currentUser, targetUser } = data;
  const canEdit = currentUser.role === "SUPER_ADMIN" ||
    (currentUser.role === "ADMIN" && targetUser.role !== "ADMIN" && targetUser.role !== "SUPER_ADMIN");

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{targetUser.name}</h1>
            <Badge variant={roleConfig[targetUser.role].variant}>
              {roleConfig[targetUser.role].label}
            </Badge>
            <Badge variant="outline" className={statusConfig[targetUser.status].className}>
              {statusConfig[targetUser.status].label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{targetUser.email}</span>
          </div>
        </div>

        {canEdit && (
          <UserActions
            userId={targetUser.id}
            currentStatus={targetUser.status}
            currentRole={targetUser.role}
            isSuperAdmin={currentUser.role === "SUPER_ADMIN"}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p className="font-medium">{targetUser.email}</p>
                </div>
                {targetUser.phone && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Phone className="h-4 w-4" />
                      Phone
                    </div>
                    <p className="font-medium">{targetUser.phone}</p>
                  </div>
                )}
                {targetUser.company && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Building className="h-4 w-4" />
                      Company
                    </div>
                    <p className="font-medium">{targetUser.company}</p>
                  </div>
                )}
                {targetUser.address && (
                  <div className="space-y-1 col-span-2">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <MapPin className="h-4 w-4" />
                      Address
                    </div>
                    <p className="font-medium">{targetUser.address}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Credentials (for inspectors) */}
          {targetUser.role === "INSPECTOR" && (
            <Card>
              <CardHeader>
                <CardTitle>Inspector Credentials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {targetUser.lbpNumber && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Award className="h-4 w-4" />
                        LBP Number
                      </div>
                      <p className="font-medium">{targetUser.lbpNumber}</p>
                    </div>
                  )}
                  {targetUser.yearsExperience && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="h-4 w-4" />
                        Years Experience
                      </div>
                      <p className="font-medium">{targetUser.yearsExperience} years</p>
                    </div>
                  )}
                </div>
                {targetUser.qualifications && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-sm">Qualifications</span>
                    <p className="text-sm whitespace-pre-wrap">{targetUser.qualifications}</p>
                  </div>
                )}
                {targetUser.specialisations && targetUser.specialisations.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-muted-foreground text-sm">Specialisations</span>
                    <div className="flex flex-wrap gap-2">
                      {targetUser.specialisations.map((spec) => (
                        <Badge key={spec} variant="secondary">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Reports
              </CardTitle>
              <CardDescription>
                {targetUser._count.reports} total reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {targetUser.reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports yet</p>
              ) : (
                <div className="space-y-3">
                  {targetUser.reports.map((report) => (
                    <Link
                      key={report.id}
                      href={`/admin/reports/${report.id}`}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{report.reportNumber}</span>
                          <Badge variant="outline" className="text-xs">
                            {report.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {report.propertyAddress}, {report.propertyCity}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(report.createdAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">User ID</span>
                <p className="text-sm font-mono">{targetUser.id}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Created</span>
                <p className="text-sm">{formatDate(targetUser.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Last Updated</span>
                <p className="text-sm">{formatDate(targetUser.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Role & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Current Role</span>
                <div>
                  <Badge variant={roleConfig[targetUser.role].variant}>
                    {roleConfig[targetUser.role].label}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Permissions</span>
                <ul className="text-sm space-y-1">
                  {targetUser.role === "INSPECTOR" && (
                    <>
                      <li>Create reports</li>
                      <li>Upload photos</li>
                      <li>Submit for review</li>
                    </>
                  )}
                  {targetUser.role === "REVIEWER" && (
                    <>
                      <li>All inspector permissions</li>
                      <li>Review reports</li>
                      <li>Approve/reject reports</li>
                    </>
                  )}
                  {(targetUser.role === "ADMIN" || targetUser.role === "SUPER_ADMIN") && (
                    <>
                      <li>All reviewer permissions</li>
                      <li>Manage users</li>
                      <li>View analytics</li>
                      <li>System configuration</li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
