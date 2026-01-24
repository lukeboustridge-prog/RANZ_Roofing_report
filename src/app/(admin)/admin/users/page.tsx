import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  FileText,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { UserRole, UserStatus } from "@prisma/client";

const roleConfig: Record<UserRole, { label: string; variant: "default" | "secondary" | "outline" }> = {
  INSPECTOR: { label: "Inspector", variant: "outline" },
  REVIEWER: { label: "Reviewer", variant: "secondary" },
  ADMIN: { label: "Admin", variant: "default" },
  SUPER_ADMIN: { label: "Super Admin", variant: "default" },
};

const statusConfig: Record<UserStatus, { label: string; icon: typeof CheckCircle; className: string }> = {
  ACTIVE: { label: "Active", icon: CheckCircle, className: "text-green-600" },
  SUSPENDED: { label: "Suspended", icon: XCircle, className: "text-red-600" },
  PENDING_APPROVAL: { label: "Pending", icon: Clock, className: "text-orange-600" },
};

async function getUsers(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }

  const users = await prisma.user.findMany({
    orderBy: [
      { status: "asc" }, // Pending first
      { createdAt: "desc" },
    ],
    include: {
      _count: {
        select: { reports: true },
      },
    },
  });

  // Get counts by status and role
  const [statusCounts, roleCounts] = await Promise.all([
    prisma.user.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    }),
  ]);

  return {
    currentUser: user,
    users,
    statusCounts: statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>),
    roleCounts: roleCounts.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {} as Record<string, number>),
  };
}

export default async function UsersPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const data = await getUsers(userId);

  if (!data) {
    redirect("/dashboard");
  }

  const { users, statusCounts, roleCounts } = data;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage inspectors, reviewers, and administrators
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        <Badge variant="outline" className="px-3 py-1.5">
          <Users className="h-3.5 w-3.5 mr-1.5" />
          Total: {users.length}
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-green-600 border-green-200">
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Active: {statusCounts.ACTIVE || 0}
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-orange-600 border-orange-200">
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Pending: {statusCounts.PENDING_APPROVAL || 0}
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-red-600 border-red-200">
          <XCircle className="h-3.5 w-3.5 mr-1.5" />
          Suspended: {statusCounts.SUSPENDED || 0}
        </Badge>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Reports</th>
                  <th className="text-left p-4 font-medium">Joined</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const StatusIcon = statusConfig[user.status].icon;
                  return (
                    <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-medium">{user.name}</div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={roleConfig[user.role].variant}>
                          {roleConfig[user.role].label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className={`flex items-center gap-1.5 ${statusConfig[user.status].className}`}>
                          <StatusIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {statusConfig[user.status].label}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {user._count.reports}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/users/${user.id}`}>
                            View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
