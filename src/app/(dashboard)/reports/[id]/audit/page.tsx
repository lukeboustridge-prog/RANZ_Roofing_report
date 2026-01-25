"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ArrowLeft,
  History,
  User,
  Calendar,
  FileText,
  Camera,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  Share2,
  Edit,
  Plus,
  Trash2,
  Clock,
  Filter,
} from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string | null;
  };
}

interface ActionSummary {
  action: string;
  count: number;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  CREATED: { label: "Created", icon: Plus, color: "bg-green-100 text-green-800" },
  UPDATED: { label: "Updated", icon: Edit, color: "bg-blue-100 text-blue-800" },
  PHOTO_ADDED: { label: "Photo Added", icon: Camera, color: "bg-purple-100 text-purple-800" },
  PHOTO_DELETED: { label: "Photo Deleted", icon: Trash2, color: "bg-red-100 text-red-800" },
  VIDEO_ADDED: { label: "Video Added", icon: Camera, color: "bg-purple-100 text-purple-800" },
  DEFECT_ADDED: { label: "Defect Added", icon: AlertTriangle, color: "bg-orange-100 text-orange-800" },
  DEFECT_UPDATED: { label: "Defect Updated", icon: AlertTriangle, color: "bg-orange-100 text-orange-800" },
  STATUS_CHANGED: { label: "Status Changed", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  SUBMITTED: { label: "Submitted", icon: FileText, color: "bg-indigo-100 text-indigo-800" },
  REVIEWED: { label: "Reviewed", icon: Eye, color: "bg-cyan-100 text-cyan-800" },
  APPROVED: { label: "Approved", icon: CheckCircle2, color: "bg-green-100 text-green-800" },
  PDF_GENERATED: { label: "PDF Generated", icon: Download, color: "bg-gray-100 text-gray-800" },
  DOWNLOADED: { label: "Downloaded", icon: Download, color: "bg-gray-100 text-gray-800" },
  SHARED: { label: "Shared", icon: Share2, color: "bg-pink-100 text-pink-800" },
};

export default function AuditTrailPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionSummary, setActionSummary] = useState<ActionSummary[]>([]);
  const [reportNumber, setReportNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [actionFilter, setActionFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchAuditLogs();
  }, [reportId, actionFilter, startDate, endDate, offset]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.set("limit", limit.toString());
      queryParams.set("offset", offset.toString());

      if (actionFilter !== "all") {
        queryParams.set("action", actionFilter);
      }
      if (startDate) {
        queryParams.set("startDate", startDate);
      }
      if (endDate) {
        queryParams.set("endDate", endDate);
      }

      const response = await fetch(`/api/reports/${reportId}/audit?${queryParams}`);
      if (!response.ok) throw new Error("Failed to fetch audit trail");

      const data = await response.json();
      setLogs(data.logs);
      setActionSummary(data.actionSummary);
      setReportNumber(data.report.reportNumber);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatDetails = (details: Record<string, unknown> | null): string => {
    if (!details) return "";

    const parts: string[] = [];

    if (details.previousStatus && details.newStatus) {
      parts.push(`${details.previousStatus} → ${details.newStatus}`);
    }
    if (details.outcome) {
      parts.push(`Outcome: ${details.outcome}`);
    }
    if (details.reason) {
      parts.push(`Reason: ${details.reason}`);
    }
    if (details.reviewerName) {
      parts.push(`Reviewer: ${details.reviewerName}`);
    }

    return parts.join(" | ");
  };

  const clearFilters = () => {
    setActionFilter("all");
    setStartDate("");
    setEndDate("");
    setOffset(0);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href={`/reports/${reportId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Report
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8" />
            Audit Trail
          </h1>
          <p className="text-muted-foreground">
            Complete history of actions for report {reportNumber}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <History className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-muted-foreground">Total Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {actionSummary.slice(0, 3).map((summary) => {
          const config = ACTION_CONFIG[summary.action] || {
            label: summary.action,
            icon: History,
            color: "bg-gray-100 text-gray-800",
          };
          const Icon = config.icon;
          return (
            <Card key={summary.action}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${config.color.split(" ")[0]}`}>
                    <Icon className={`h-5 w-5 ${config.color.split(" ")[1]}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{summary.count}</p>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <Label htmlFor="actionFilter">Action Type</Label>
              <NativeSelect
                id="actionFilter"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setOffset(0);
                }}
              >
                <option value="all">All Actions</option>
                {Object.entries(ACTION_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="w-48">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <div className="w-48">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            Showing {logs.length} of {total} actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found matching the filters.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => {
                const config = ACTION_CONFIG[log.action] || {
                  label: log.action,
                  icon: History,
                  color: "bg-gray-100 text-gray-800",
                };
                const Icon = config.icon;

                return (
                  <div
                    key={log.id}
                    className={`flex gap-4 ${
                      index !== logs.length - 1 ? "pb-4 border-b" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              by {log.user.name}
                            </span>
                          </div>
                          {log.details && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatDetails(log.details)}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(log.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
