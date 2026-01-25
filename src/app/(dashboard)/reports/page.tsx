import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ReportSearch } from "@/components/reports/ReportSearch";

export default async function ReportsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Manage your roofing inspection reports.
          </p>
        </div>
        <Button asChild>
          <Link href="/reports/new">
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Link>
        </Button>
      </div>

      {/* Searchable reports list */}
      <ReportSearch />
    </div>
  );
}
