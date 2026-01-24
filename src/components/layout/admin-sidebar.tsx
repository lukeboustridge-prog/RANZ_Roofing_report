"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Settings,
  ArrowLeft,
  Shield,
  ClipboardCheck,
} from "lucide-react";

const navigation = [
  { name: "Admin Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Review Queue", href: "/admin/reviews", icon: ClipboardCheck },
  { name: "All Reports", href: "/admin/reports", icon: FileText },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-card px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-[var(--ranz-blue-500)] flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              RANZ Admin
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin" && pathname.startsWith(item.href));
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6",
                          isActive
                            ? "bg-[var(--ranz-blue-50)] text-[var(--ranz-blue-600)]"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            isActive
                              ? "text-[var(--ranz-blue-600)]"
                              : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* Back to Dashboard */}
            <li className="mt-auto">
              <Link
                href="/dashboard"
                className="group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5 shrink-0" />
                Back to Dashboard
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}
