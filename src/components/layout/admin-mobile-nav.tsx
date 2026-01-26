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
  X,
  Shield,
  ClipboardCheck,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Admin Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Review Queue", href: "/admin/reviews", icon: ClipboardCheck },
  { name: "All Reports", href: "/admin/reports", icon: FileText },
  { name: "LBP Complaints", href: "/admin/complaints", icon: AlertTriangle },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

interface AdminMobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function AdminMobileNav({ open, onClose }: AdminMobileNavProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="relative z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 flex w-full max-w-xs">
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-card border-r">
          {/* Close button */}
          <div className="absolute right-0 top-0 flex w-16 justify-center pt-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="-m-2.5"
            >
              <span className="sr-only">Close sidebar</span>
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center px-6 border-b">
            <Link href="/admin" className="flex items-center gap-2" onClick={onClose}>
              <div className="h-8 w-8 rounded-md bg-[var(--ranz-blue-500)] flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-foreground">
                RANZ Admin
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col px-6 pb-4 pt-4">
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
                          onClick={onClose}
                          className={cn(
                            "group flex gap-x-3 rounded-md p-2.5 text-sm font-medium leading-6 transition-colors",
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
                  onClick={onClose}
                  className="group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <ArrowLeft className="h-5 w-5 shrink-0" />
                  Back to Dashboard
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
