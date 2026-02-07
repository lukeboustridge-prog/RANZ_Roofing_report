import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { AdminReportsContent } from "./admin-reports-content";

async function getAllReports(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || !["REVIEWER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      inspector: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          photos: true,
          defects: true,
        },
      },
    },
  });

  // Get status counts
  const statusCounts = await prisma.report.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  return {
    reports,
    statusCounts: statusCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>
    ),
    total: await prisma.report.count(),
  };
}

export default async function AdminReportsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const data = await getAllReports(userId);

  if (!data) {
    redirect("/dashboard");
  }

  const { reports, statusCounts, total } = data;

  // Serialize dates to strings for client component
  const serializedReports = reports.map((report) => ({
    id: report.id,
    reportNumber: report.reportNumber,
    status: report.status,
    inspectionType: report.inspectionType,
    propertyAddress: report.propertyAddress,
    propertyCity: report.propertyCity,
    createdAt: report.createdAt.toISOString(),
    submittedAt: report.submittedAt?.toISOString() ?? null,
    approvedAt: report.approvedAt?.toISOString() ?? null,
    inspector: report.inspector,
    _count: report._count,
  }));

  return (
    <AdminReportsContent
      reports={serializedReports}
      statusCounts={statusCounts}
      total={total}
    />
  );
}
