import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { ReportSearch } from "@/components/reports/ReportSearch";
import { BatchPdfPanel } from "./admin-reports-content";

async function checkAdminAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || !["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return false;
  }

  return true;
}

async function getReportLabels() {
  const reports = await prisma.report.findMany({
    select: {
      id: true,
      reportNumber: true,
      propertyAddress: true,
      propertyCity: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return reports.map((r) => ({
    id: r.id,
    reportNumber: r.reportNumber,
    address: `${r.propertyAddress}${r.propertyCity ? `, ${r.propertyCity}` : ""}`,
  }));
}

export default async function AdminReportsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const hasAccess = await checkAdminAccess(userId);

  if (!hasAccess) {
    redirect("/dashboard");
  }

  const reportLabels = await getReportLabels();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Reports</h1>
        <p className="text-muted-foreground">
          Search, filter, and manage all inspection reports
        </p>
      </div>

      {/* Batch PDF generation panel (self-contained with own report checklist) */}
      <BatchPdfPanel reportLabels={reportLabels} />

      {/* Full search, filter, and report list */}
      <ReportSearch />
    </div>
  );
}
