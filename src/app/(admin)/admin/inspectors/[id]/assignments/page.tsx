import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { fetchInspectorsFromSharedAuth } from "@/lib/api/shared-auth";
import { canManageInspectors, getAuthRoleLabel } from "@/lib/role-mapping";
import prisma from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, FileText } from "lucide-react";
import { AssignmentsList } from "./_components/assignments-list";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InspectorAssignmentsPage({ params }: PageProps) {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/sign-in");
  }

  if (!canManageInspectors(authUser.role)) {
    redirect("/dashboard");
  }

  const { id: inspectorId } = await params;

  // Fetch inspector details from shared auth
  let inspector;
  try {
    const inspectors = await fetchInspectorsFromSharedAuth();
    inspector = inspectors.find((i) => i.id === inspectorId);
  } catch (error) {
    console.error("[Assignments] Failed to fetch inspector:", error);
  }

  if (!inspector) {
    notFound();
  }

  // Fetch assigned reports from local database
  const assignedReports = await prisma.report.findMany({
    where: { inspectorId },
    select: {
      id: true,
      reportNumber: true,
      status: true,
      propertyAddress: true,
      propertyCity: true,
      inspectionDate: true,
      createdAt: true,
      clientName: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch reports from OTHER inspectors (available for reassignment)
  // Note: Report.inspectorId is required, so there are no "unassigned" reports
  // Instead, we show reports that could be reassigned to this inspector
  const otherReports = await prisma.report.findMany({
    where: {
      inspectorId: { not: inspectorId },
      status: { in: ["DRAFT", "IN_PROGRESS", "PENDING_REVIEW"] },
    },
    select: {
      id: true,
      reportNumber: true,
      propertyAddress: true,
      propertyCity: true,
      clientName: true,
      inspectorId: true,
      inspector: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-8">
      {/* Back link */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/inspectors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Inspectors
          </Link>
        </Button>
      </div>

      {/* Inspector header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {inspector.firstName} {inspector.lastName}
            </h1>
            <p className="text-muted-foreground">{inspector.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{getAuthRoleLabel(inspector.userType)}</Badge>
              {inspector.company && (
                <Badge variant="outline">{inspector.company.name}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="h-5 w-5" />
          <span className="font-medium">{assignedReports.length} assigned reports</span>
        </div>
      </div>

      {/* Assignments list */}
      <AssignmentsList
        inspectorId={inspectorId}
        inspectorName={`${inspector.firstName} ${inspector.lastName}`}
        assignedReports={assignedReports}
        otherReports={otherReports}
      />
    </div>
  );
}
