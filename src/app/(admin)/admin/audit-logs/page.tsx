"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  User,
  Clock,
  Filter,
} from "lucide-react";

const AUDIT_ACTIONS = [
  { value: "", label: "All Actions" },
  { value: "CREATED", label: "Created" },
  { value: "UPDATED", label: "Updated" },
  { value: "PHOTO_ADDED", label: "Photo Added" },
  { value: "PHOTO_DELETED", label: "Photo Deleted" },
  { value: "DEFECT_ADDED", label: "Defect Added" },
  { value: "DEFECT_UPDATED", label: "Defect Updated" },
  { value: "STATUS_CHANGED", label: "Status Changed" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "APPROVED", label: "Approved" },
  { value: "PDF_GENERATED", label: "PDF Generated" },
  { value: "DOWNLOADED", label: "Downloaded" },
];

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  reportId: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  report: {
    reportNumber: string | null;
    propertyAddress: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    action: "",
    reportId: "",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.action) params.set("action", filters.action);
      if (filters.reportId) params.set("reportId", filters.reportId);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch audit logs");

      const data = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const getActionBadgeColor = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case "APPROVED":
        return "default";
      case "SUBMITTED":
      case "REVIEWED":
        return "secondary";
      case "PHOTO_DELETED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatDetails = (details: Record<string, unknown> | null): string => {
    if (!details) return "";

    const parts: string[] = [];
    if (details.previousStatus && details.newStatus) {
      parts.push(`${details.previousStatus} → ${details.newStatus}`);
    }
    if (details.comment) {
      parts.push(`"${details.comment}"`);
    }
    if (details.filename) {
      parts.push(`File: ${details.filename}`);
    }
    if (details.batchOperation) {
      parts.push("(Batch operation)");
    }

    return parts.join(" | ");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          View all system activity and changes.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <NativeSelect
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
              >
                {AUDIT_ACTIONS.map((action) => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <Input
                placeholder="Report ID"
                value={filters.reportId}
                onChange={(e) => handleFilterChange("reportId", e.target.value)}
              />
            </div>

            <div>
              <Input
                type="date"
                placeholder="From date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              />
            </div>

            <div>
              <Input
                type="date"
                placeholder="To date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {pagination.total} Audit Log Entries
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.pages}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No audit logs found matching your filters.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getActionBadgeColor(log.action)}>
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                      {log.report && (
                        <Link
                          href={`/reports/${log.reportId}`}
                          className="text-sm text-[var(--ranz-blue-500)] hover:underline"
                        >
                          {log.report.reportNumber || "Report"}
                        </Link>
                      )}
                    </div>

                    <div className="mt-1 text-sm">
                      <span className="font-medium">{log.user.name}</span>
                      <span className="text-muted-foreground">
                        {" "}({log.user.email})
                      </span>
                    </div>

                    {log.report && (
                      <div className="mt-1 text-sm text-muted-foreground truncate">
                        {log.report.propertyAddress}
                      </div>
                    )}

                    {log.details && (
                      <div className="mt-1 text-sm text-muted-foreground">
                        {formatDetails(log.details)}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                    {log.ipAddress && (
                      <div className="text-xs text-muted-foreground mt-1">
                        IP: {log.ipAddress}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page - 1 })
                }
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page + 1 })
                }
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
