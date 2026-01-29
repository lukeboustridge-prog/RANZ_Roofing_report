"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  Mail,
} from "lucide-react";
import type { SharedAuthUser } from "@/lib/api/shared-auth";
import { getAuthRoleLabel, getRoleBadgeVariant } from "@/lib/role-mapping";

interface InspectorTableProps {
  inspectors: SharedAuthUser[];
}

const statusConfig = {
  ACTIVE: { label: "Active", icon: CheckCircle, className: "text-green-600" },
  PENDING_ACTIVATION: { label: "Pending", icon: Clock, className: "text-orange-600" },
  SUSPENDED: { label: "Suspended", icon: AlertTriangle, className: "text-yellow-600" },
  DEACTIVATED: { label: "Deactivated", icon: XCircle, className: "text-red-600" },
};

export function InspectorTable({ inspectors }: InspectorTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredInspectors = inspectors.filter((inspector) => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${inspector.firstName} ${inspector.lastName}`.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      inspector.email.toLowerCase().includes(searchLower) ||
      (inspector.company?.name || "").toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-NZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardContent className="p-0">
        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search inspectors by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Inspector</th>
                <th className="text-left p-4 font-medium">Role</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Company</th>
                <th className="text-left p-4 font-medium">Last Login</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspectors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    {searchQuery
                      ? "No inspectors match your search"
                      : "No inspectors found"}
                  </td>
                </tr>
              ) : (
                filteredInspectors.map((inspector) => {
                  const statusInfo = statusConfig[inspector.status] || statusConfig.DEACTIVATED;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr
                      key={inspector.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {inspector.firstName} {inspector.lastName}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {inspector.email}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={getRoleBadgeVariant(inspector.userType)}>
                          {getAuthRoleLabel(inspector.userType)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className={`flex items-center gap-1.5 ${statusInfo.className}`}>
                          <StatusIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {statusInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {inspector.company?.name || "-"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(inspector.lastLoginAt)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/inspectors/${inspector.id}/assignments`}>
                            <FileText className="h-4 w-4 mr-1" />
                            Assignments
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-sm text-muted-foreground">
          Showing {filteredInspectors.length} of {inspectors.length} inspectors
        </div>
      </CardContent>
    </Card>
  );
}
