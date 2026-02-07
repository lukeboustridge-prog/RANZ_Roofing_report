"use client";

import { useState, useEffect, useCallback } from "react";
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
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface EmailEvent {
  id: string;
  messageId: string;
  type: string;
  email: string;
  timestamp: string;
  metadata: {
    subject?: string;
    from?: string;
    [key: string]: unknown;
  } | null;
  createdAt: string;
}

const EVENT_TYPE_OPTIONS = [
  { value: "", label: "All Events" },
  { value: "email.sent", label: "Sent" },
  { value: "email.delivered", label: "Delivered" },
  { value: "email.delivery_delayed", label: "Delayed" },
  { value: "email.bounced", label: "Bounced" },
  { value: "email.complained", label: "Complained" },
];

function getEventBadge(type: string) {
  switch (type) {
    case "email.delivered":
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Delivered</Badge>;
    case "email.bounced":
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Bounced</Badge>;
    case "email.complained":
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Complained</Badge>;
    case "email.delivery_delayed":
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Delayed</Badge>;
    case "email.sent":
      return <Badge variant="secondary"><Mail className="w-3 h-3 mr-1" />Sent</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export default function EmailLogsPage() {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (typeFilter) params.set("type", typeFilter);
      if (emailFilter) params.set("email", emailFilter);

      const res = await fetch(`/api/admin/email-events?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setEvents(data.events);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);
    } catch (error) {
      console.error("Failed to fetch email events:", error);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, emailFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Email Delivery Logs</h1>
          <p className="text-muted-foreground text-sm">
            Track email delivery status from Resend webhooks ({totalCount} events)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <NativeSelect
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
              >
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Filter by recipient email..."
                value={emailFilter}
                onChange={(e) => {
                  setEmailFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No email events found</p>
              <p className="text-sm mt-1">
                Events will appear here once the Resend webhook is configured
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Recipient</th>
                    <th className="text-left p-3 font-medium">Subject</th>
                    <th className="text-left p-3 font-medium">Message ID</th>
                    <th className="text-left p-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-muted/30">
                      <td className="p-3">{getEventBadge(event.type)}</td>
                      <td className="p-3 font-mono text-xs">{event.email}</td>
                      <td className="p-3 max-w-[300px] truncate">
                        {event.metadata?.subject || "-"}
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                        {event.messageId}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleString("en-NZ", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
