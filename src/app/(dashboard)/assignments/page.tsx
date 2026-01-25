"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  Calendar,
  MapPin,
  User,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  PlayCircle,
} from "lucide-react";
import { useCurrentUser } from "@/contexts/user-context";

interface Assignment {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  propertyAddress: string;
  requestType: string;
  urgency: string;
  status: string;
  notes?: string;
  scheduledDate?: string;
  completedDate?: string;
  createdAt: string;
  inspector: {
    id: string;
    name: string;
    email: string;
  };
}

interface Inspector {
  id: string;
  name: string;
  email: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  ACCEPTED: { label: "Accepted", color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
  SCHEDULED: { label: "Scheduled", color: "bg-purple-100 text-purple-800", icon: Calendar },
  IN_PROGRESS: { label: "In Progress", color: "bg-indigo-100 text-indigo-800", icon: PlayCircle },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: XCircle },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  STANDARD: { label: "Standard", color: "bg-gray-100 text-gray-800" },
  PRIORITY: { label: "Priority", color: "bg-blue-100 text-blue-800" },
  URGENT: { label: "Urgent", color: "bg-orange-100 text-orange-800" },
  EMERGENCY: { label: "Emergency", color: "bg-red-100 text-red-800" },
};

const INSPECTION_TYPES: Record<string, string> = {
  FULL_INSPECTION: "Full Inspection",
  VISUAL_ONLY: "Visual Only",
  NON_INVASIVE: "Non-Invasive",
  INVASIVE: "Invasive",
  DISPUTE_RESOLUTION: "Dispute Resolution",
  PRE_PURCHASE: "Pre-Purchase",
  MAINTENANCE_REVIEW: "Maintenance Review",
  WARRANTY_CLAIM: "Warranty Claim",
};

export default function AssignmentsPage() {
  const { isReviewer, isLoading: userLoading } = useCurrentUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state for new assignment
  const [formData, setFormData] = useState({
    inspectorId: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    propertyAddress: "",
    requestType: "FULL_INSPECTION",
    urgency: "STANDARD",
    notes: "",
    scheduledDate: "",
  });

  useEffect(() => {
    fetchAssignments();
    if (isReviewer) {
      fetchInspectors();
    }
  }, [statusFilter, isReviewer]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const url = statusFilter === "all"
        ? "/api/assignments"
        : `/api/assignments?status=${statusFilter}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch assignments");
      const data = await response.json();
      setAssignments(data.assignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchInspectors = async () => {
    try {
      const response = await fetch("/api/admin/users?role=INSPECTOR");
      if (!response.ok) return;
      const data = await response.json();
      setInspectors(data.users || []);
    } catch {
      // Silently fail - inspectors list is optional
    }
  };

  const handleCreateAssignment = async () => {
    try {
      setActionLoading("create");
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create assignment");
      }

      setCreateDialogOpen(false);
      setFormData({
        inspectorId: "",
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        propertyAddress: "",
        requestType: "FULL_INSPECTION",
        urgency: "STANDARD",
        notes: "",
        scheduledDate: "",
      });
      fetchAssignments();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create assignment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string, scheduledDate?: string) => {
    try {
      setActionLoading(id);
      const body: Record<string, unknown> = { status: newStatus };
      if (scheduledDate) {
        body.scheduledDate = scheduledDate;
      }
      if (newStatus === "COMPLETED") {
        body.completedDate = new Date().toISOString();
      }

      const response = await fetch(`/api/assignments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update assignment");
      }

      fetchAssignments();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update assignment");
    } finally {
      setActionLoading(null);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">
            {isReviewer
              ? "Manage inspection assignments for inspectors."
              : "View and manage your assigned inspections."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NativeSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </NativeSelect>

          {isReviewer && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Assignment</DialogTitle>
                  <DialogDescription>
                    Assign an inspection to an inspector.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inspectorId">Inspector</Label>
                      <NativeSelect
                        id="inspectorId"
                        value={formData.inspectorId}
                        onChange={(e) =>
                          setFormData({ ...formData, inspectorId: e.target.value })
                        }
                      >
                        <option value="">Select inspector...</option>
                        {inspectors.map((inspector) => (
                          <option key={inspector.id} value={inspector.id}>
                            {inspector.name} ({inspector.email})
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requestType">Inspection Type</Label>
                      <NativeSelect
                        id="requestType"
                        value={formData.requestType}
                        onChange={(e) =>
                          setFormData({ ...formData, requestType: e.target.value })
                        }
                      >
                        {Object.entries(INSPECTION_TYPES).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Client Name</Label>
                      <Input
                        id="clientName"
                        value={formData.clientName}
                        onChange={(e) =>
                          setFormData({ ...formData, clientName: e.target.value })
                        }
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientEmail">Client Email</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        value={formData.clientEmail}
                        onChange={(e) =>
                          setFormData({ ...formData, clientEmail: e.target.value })
                        }
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientPhone">Client Phone (Optional)</Label>
                      <Input
                        id="clientPhone"
                        value={formData.clientPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, clientPhone: e.target.value })
                        }
                        placeholder="021 123 4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="urgency">Urgency</Label>
                      <NativeSelect
                        id="urgency"
                        value={formData.urgency}
                        onChange={(e) =>
                          setFormData({ ...formData, urgency: e.target.value })
                        }
                      >
                        <option value="STANDARD">Standard (2-3 weeks)</option>
                        <option value="PRIORITY">Priority (1 week)</option>
                        <option value="URGENT">Urgent (48 hours)</option>
                        <option value="EMERGENCY">Emergency (Same day)</option>
                      </NativeSelect>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="propertyAddress">Property Address</Label>
                    <Input
                      id="propertyAddress"
                      value={formData.propertyAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, propertyAddress: e.target.value })
                      }
                      placeholder="123 Example Street, Auckland"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate">Scheduled Date (Optional)</Label>
                    <Input
                      id="scheduledDate"
                      type="datetime-local"
                      value={formData.scheduledDate}
                      onChange={(e) =>
                        setFormData({ ...formData, scheduledDate: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Additional notes about this assignment..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateAssignment}
                    disabled={
                      actionLoading === "create" ||
                      !formData.inspectorId ||
                      !formData.clientName ||
                      !formData.clientEmail ||
                      !formData.propertyAddress
                    }
                  >
                    {actionLoading === "create" && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Create Assignment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No assignments found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const statusConfig = STATUS_CONFIG[assignment.status];
            const urgencyConfig = URGENCY_CONFIG[assignment.urgency];
            const StatusIcon = statusConfig?.icon || Clock;

            return (
              <Card key={assignment.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {assignment.propertyAddress}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={statusConfig?.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig?.label}
                        </Badge>
                        <Badge variant="outline" className={urgencyConfig?.color}>
                          {urgencyConfig?.label}
                        </Badge>
                        <Badge variant="outline">
                          {INSPECTION_TYPES[assignment.requestType]}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      Created {new Date(assignment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Client:</span>
                      {assignment.clientName}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Email:</span>
                      {assignment.clientEmail}
                    </div>
                    {assignment.clientPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Phone:</span>
                        {assignment.clientPhone}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Inspector:</span>
                      {assignment.inspector.name}
                    </div>
                    {assignment.scheduledDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Scheduled:</span>
                        {new Date(assignment.scheduledDate).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {assignment.notes && (
                    <p className="text-sm text-muted-foreground mb-4 border-l-2 pl-3">
                      {assignment.notes}
                    </p>
                  )}

                  {/* Action buttons based on status */}
                  <div className="flex gap-2 pt-2 border-t">
                    {assignment.status === "PENDING" && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(assignment.id, "ACCEPTED")}
                        disabled={actionLoading === assignment.id}
                      >
                        {actionLoading === assignment.id && (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        )}
                        Accept Assignment
                      </Button>
                    )}
                    {assignment.status === "ACCEPTED" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(assignment.id, "IN_PROGRESS")}
                          disabled={actionLoading === assignment.id}
                        >
                          {actionLoading === assignment.id && (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          )}
                          Start Inspection
                        </Button>
                        <ScheduleDialog
                          assignmentId={assignment.id}
                          onSchedule={(date) =>
                            handleStatusUpdate(assignment.id, "SCHEDULED", date)
                          }
                          loading={actionLoading === assignment.id}
                        />
                      </>
                    )}
                    {assignment.status === "SCHEDULED" && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(assignment.id, "IN_PROGRESS")}
                        disabled={actionLoading === assignment.id}
                      >
                        {actionLoading === assignment.id && (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        )}
                        Start Inspection
                      </Button>
                    )}
                    {assignment.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(assignment.id, "COMPLETED")}
                        disabled={actionLoading === assignment.id}
                      >
                        {actionLoading === assignment.id && (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        )}
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Schedule Dialog Component
function ScheduleDialog({
  assignmentId,
  onSchedule,
  loading,
}: {
  assignmentId: string;
  onSchedule: (date: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");

  const handleSubmit = () => {
    if (date) {
      onSchedule(date);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Calendar className="h-3 w-3 mr-1" />
          Schedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Inspection</DialogTitle>
          <DialogDescription>
            Set the date and time for this inspection.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="scheduleDate">Date & Time</Label>
          <Input
            id="scheduleDate"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!date || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
