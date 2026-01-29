"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, ArrowRightLeft, ExternalLink, Loader2 } from "lucide-react";

interface Report {
  id: string;
  reportNumber: string;
  status?: string;
  propertyAddress: string;
  propertyCity?: string;
  inspectionDate?: Date;
  createdAt?: Date;
  clientName?: string;
}

interface OtherReport extends Report {
  inspectorId: string;
  inspector?: {
    name: string;
  };
}

interface AssignmentsListProps {
  inspectorId: string;
  inspectorName: string;
  assignedReports: Report[];
  otherReports: OtherReport[];
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  UNDER_REVIEW: "bg-purple-100 text-purple-800",
  APPROVED: "bg-green-100 text-green-800",
  FINALISED: "bg-green-200 text-green-900",
};

export function AssignmentsList({
  inspectorId,
  inspectorName,
  assignedReports: initialAssigned,
  otherReports: initialOther,
}: AssignmentsListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [assignedReports, setAssignedReports] = useState(initialAssigned);
  const [otherReports, setOtherReports] = useState(initialOther);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isReassigning, setIsReassigning] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!selectedReportId) return;

    setIsAssigning(true);
    try {
      const response = await fetch(`/api/admin/inspectors/${inspectorId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: selectedReportId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign");
      }

      const data = await response.json();
      toast({
        title: "Report assigned",
        description: data.message,
      });

      // Move report from other to assigned
      const report = otherReports.find((r) => r.id === selectedReportId);
      if (report) {
        setAssignedReports([report, ...assignedReports]);
        setOtherReports(otherReports.filter((r) => r.id !== selectedReportId));
      }
      setSelectedReportId("");
      router.refresh();
    } catch (error) {
      toast({
        title: "Failed to assign report",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-NZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Reassign report to this inspector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assign Report to {inspectorName}</CardTitle>
        </CardHeader>
        <CardContent>
          {otherReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reports available for reassignment. All active reports are already assigned to this inspector.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Select a report from another inspector to reassign to {inspectorName}:
              </p>
              <div className="flex gap-4">
                <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select a report to reassign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {otherReports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        {report.reportNumber} - {report.propertyAddress}
                        {report.inspector?.name && (
                          <span className="text-muted-foreground ml-1">
                            (from {report.inspector.name})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedReportId || isAssigning}
                >
                  {isAssigning ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  Assign
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Assigned reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assigned Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {assignedReports.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No reports assigned to {inspectorName}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Report</th>
                    <th className="text-left p-4 font-medium">Property</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedReports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-medium">{report.reportNumber}</div>
                        {report.clientName && (
                          <div className="text-sm text-muted-foreground">
                            {report.clientName}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div>{report.propertyAddress}</div>
                        {report.propertyCity && (
                          <div className="text-sm text-muted-foreground">
                            {report.propertyCity}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {report.status && (
                          <Badge className={statusColors[report.status] || ""}>
                            {report.status.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(report.inspectionDate || report.createdAt)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/reports/${report.id}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-3">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Reports must always have an assigned inspector.
            To change an assignment, select a report from the list above and reassign it to this inspector.
            Reports can also be reassigned from the original inspector&apos;s assignments page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
