"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  History,
  Loader2,
  User,
  Camera,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Download,
  Share2,
  Edit3,
  Plus,
  Trash2,
  Video,
  Send,
} from "lucide-react";

interface AuditUser {
  id: string;
  name: string;
  email: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: AuditUser;
}

interface AuditLogData {
  reportNumber: string;
  logs: AuditLogEntry[];
}

// Action configuration for display
const actionConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  CREATED: { label: "Report Created", icon: Plus, color: "text-green-600 bg-green-50" },
  UPDATED: { label: "Report Updated", icon: Edit3, color: "text-blue-600 bg-blue-50" },
  PHOTO_ADDED: { label: "Photo Added", icon: Camera, color: "text-purple-600 bg-purple-50" },
  PHOTO_DELETED: { label: "Photo Deleted", icon: Trash2, color: "text-red-600 bg-red-50" },
  VIDEO_ADDED: { label: "Video Added", icon: Video, color: "text-purple-600 bg-purple-50" },
  DEFECT_ADDED: { label: "Defect Added", icon: AlertTriangle, color: "text-orange-600 bg-orange-50" },
  DEFECT_UPDATED: { label: "Defect Updated", icon: Edit3, color: "text-orange-600 bg-orange-50" },
  STATUS_CHANGED: { label: "Status Changed", icon: Clock, color: "text-blue-600 bg-blue-50" },
  SUBMITTED: { label: "Submitted for Review", icon: Send, color: "text-indigo-600 bg-indigo-50" },
  REVIEWED: { label: "Reviewed", icon: Eye, color: "text-cyan-600 bg-cyan-50" },
  APPROVED: { label: "Approved", icon: CheckCircle, color: "text-green-600 bg-green-50" },
  PDF_GENERATED: { label: "PDF Generated", icon: FileText, color: "text-gray-600 bg-gray-50" },
  DOWNLOADED: { label: "Downloaded", icon: Download, color: "text-gray-600 bg-gray-50" },
  SHARED: { label: "Shared", icon: Share2, color: "text-blue-600 bg-blue-50" },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-NZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDetails(details: Record<string, unknown> | null): string | null {
  if (!details) return null;

  const parts: string[] = [];

  if (details.field) {
    parts.push(`Field: ${details.field}`);
  }
  if (details.filename) {
    parts.push(`File: ${details.filename}`);
  }
  if (details.action) {
    parts.push(`Action: ${String(details.action).replace(/_/g, " ")}`);
  }
  if (details.from && details.to) {
    parts.push(`${details.from} → ${details.to}`);
  }
  if (details.defectNumber) {
    parts.push(`Defect #${details.defectNumber}`);
  }

  return parts.length > 0 ? parts.join(" • ") : null;
}

// Group logs by date
function groupLogsByDate(logs: AuditLogEntry[]): Map<string, AuditLogEntry[]> {
  const grouped = new Map<string, AuditLogEntry[]>();

  logs.forEach((log) => {
    const dateKey = formatDate(log.createdAt);
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(log);
  });

  return grouped;
}

export default function AuditLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { toast } = useToast();

  const [data, setData] = useState<AuditLogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAuditLog() {
      try {
        const response = await fetch(`/api/reports/${id}/audit-log`);
        if (!response.ok) {
          throw new Error("Failed to load audit log");
        }
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error loading audit log:", error);
        toast({
          title: "Error",
          description: "Failed to load audit log",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadAuditLog();
  }, [id, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Audit log not found</p>
      </div>
    );
  }

  const groupedLogs = groupLogsByDate(data.logs);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href={`/reports/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Report
        </Link>
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-[var(--ranz-blue-600)]" />
          <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
        </div>
        <p className="text-muted-foreground">
          Complete history of changes to report {data.reportNumber}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{data.logs.length}</div>
            <p className="text-sm text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {data.logs.filter((l) => l.action === "UPDATED").length}
            </div>
            <p className="text-sm text-muted-foreground">Updates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {data.logs.filter((l) => l.action === "PHOTO_ADDED").length}
            </div>
            <p className="text-sm text-muted-foreground">Photos Added</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {data.logs.filter((l) => l.action === "DEFECT_ADDED").length}
            </div>
            <p className="text-sm text-muted-foreground">Defects Added</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit log timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            All changes are logged for evidence integrity and compliance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No audit events recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(groupedLogs.entries()).map(([date, logs]) => (
                <div key={date}>
                  <div className="sticky top-0 bg-card py-2 z-10">
                    <Badge variant="outline" className="font-medium">
                      {date}
                    </Badge>
                  </div>
                  <div className="space-y-4 mt-4">
                    {logs.map((log) => {
                      const config = actionConfig[log.action] || {
                        label: log.action,
                        icon: History,
                        color: "text-gray-600 bg-gray-50",
                      };
                      const Icon = config.icon;
                      const details = formatDetails(log.details);

                      return (
                        <div
                          key={log.id}
                          className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                        >
                          <div
                            className={`p-2 rounded-lg shrink-0 ${config.color}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">{config.label}</p>
                                {details && (
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {details}
                                  </p>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {formatTime(log.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{log.user.name}</span>
                              {log.ipAddress && (
                                <>
                                  <span className="text-muted-foreground/50">•</span>
                                  <span className="font-mono text-xs">
                                    {log.ipAddress}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidence integrity notice */}
      <Card className="border-[var(--ranz-blue-200)] bg-[var(--ranz-blue-50)]">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[var(--ranz-blue-100)]">
              <CheckCircle className="h-5 w-5 text-[var(--ranz-blue-600)]" />
            </div>
            <div>
              <p className="font-medium text-[var(--ranz-blue-900)]">
                Evidence Integrity
              </p>
              <p className="text-sm text-[var(--ranz-blue-700)] mt-1">
                This audit trail is maintained for chain of custody documentation
                and compliance with ISO 17020 and High Court Rules Schedule 4. All
                entries are immutable and timestamped.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
