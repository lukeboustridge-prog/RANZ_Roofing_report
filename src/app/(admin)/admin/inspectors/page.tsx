import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { fetchInspectorsFromSharedAuth, type SharedAuthUser } from "@/lib/api/shared-auth";
import { canManageInspectors } from "@/lib/role-mapping";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Users, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { InspectorTable } from "./_components/inspector-table";

export default async function InspectorsPage() {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/sign-in");
  }

  if (!canManageInspectors(authUser.role)) {
    redirect("/dashboard");
  }

  // Fetch inspectors from Quality Program (shared auth)
  let inspectors: SharedAuthUser[] = [];
  let error: string | null = null;

  try {
    inspectors = await fetchInspectorsFromSharedAuth();
  } catch (err) {
    console.error("[Inspectors] Failed to fetch from shared auth:", err);
    error = err instanceof Error ? err.message : "Failed to load inspectors";
  }

  // Calculate stats
  const stats = {
    total: inspectors.length,
    active: inspectors.filter(i => i.status === 'ACTIVE').length,
    pending: inspectors.filter(i => i.status === 'PENDING_ACTIVATION').length,
    suspended: inspectors.filter(i => i.status === 'SUSPENDED').length,
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inspector Management</h1>
          <p className="text-muted-foreground">
            View inspectors from the RANZ system and manage report assignments
          </p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Failed to load inspectors</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Inspector data is managed in the Quality Program. Ensure the internal API connection is configured.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {!error && (
        <div className="flex gap-4 flex-wrap">
          <Badge variant="outline" className="px-3 py-1.5">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Total: {stats.total}
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 text-green-600 border-green-200">
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            Active: {stats.active}
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 text-orange-600 border-orange-200">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Pending: {stats.pending}
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 text-yellow-600 border-yellow-200">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
            Suspended: {stats.suspended}
          </Badge>
        </div>
      )}

      {/* Info banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-3">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Inspector accounts are managed in the{" "}
            <a
              href="https://portal.ranz.org.nz/admin/users"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              Quality Program
            </a>
            . This page shows inspector data for report assignment purposes.
          </p>
        </CardContent>
      </Card>

      {/* Inspector table */}
      {!error && <InspectorTable inspectors={inspectors} />}
    </div>
  );
}
