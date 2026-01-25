"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/contexts/user-context";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Plus,
  Shield,
  UserCircle,
  BarChart3,
  ClipboardList,
  ClipboardCheck,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "New Report", href: "/reports/new", icon: Plus },
  { name: "Assignments", href: "/assignments", icon: ClipboardList },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Profile", href: "/profile", icon: UserCircle },
  { name: "Settings", href: "/settings", icon: Settings },
];

const adminNavigation = [
  { name: "Review Queue", href: "/review", icon: ClipboardCheck },
  { name: "Admin Portal", href: "/admin", icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isReviewer, isLoading } = useCurrentUser();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[var(--ranz-charcoal)] px-6 pb-4">
        {/* Logo area with diagonal accent */}
        <div className="flex h-20 shrink-0 items-center border-b border-[var(--ranz-charcoal-light)]/20 relative">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="RANZ Logo"
              width={48}
              height={48}
              className="h-12 w-auto"
              priority
              onError={(e) => {
                // Fallback if logo doesn't exist
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            {/* Fallback logo */}
            <div className="hidden h-10 w-10 rounded bg-white/10 items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-white tracking-wide">
                RANZ
              </span>
              <span className="text-xs text-[var(--ranz-silver)] tracking-wider">
                INSPECTION REPORTS
              </span>
            </div>
          </Link>
          {/* Diagonal accent */}
          <div className="absolute top-0 right-0 w-16 h-full bg-[var(--ranz-charcoal-dark)] opacity-50"
               style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex gap-x-3 rounded-md p-2.5 text-sm font-medium leading-6 transition-colors",
                          isActive
                            ? "bg-[var(--ranz-charcoal-dark)] text-white border-l-2 border-[var(--ranz-yellow)]"
                            : "text-[var(--ranz-silver)] hover:bg-[var(--ranz-charcoal-dark)] hover:text-white"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            isActive
                              ? "text-[var(--ranz-yellow)]"
                              : "text-[var(--ranz-silver)] group-hover:text-white"
                          )}
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* Admin Section - Only show for reviewers, admins, and super admins */}
            {!isLoading && isReviewer && (
              <li>
                <div className="text-xs font-semibold leading-6 text-[var(--ranz-silver)] uppercase tracking-wider">
                  Administration
                </div>
                <ul role="list" className="-mx-2 mt-2 space-y-1">
                  {adminNavigation.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            "group flex gap-x-3 rounded-md p-2.5 text-sm font-medium leading-6 transition-colors",
                            isActive
                              ? "bg-[var(--ranz-charcoal-dark)] text-white border-l-2 border-[var(--ranz-yellow)]"
                              : "text-[var(--ranz-silver)] hover:bg-[var(--ranz-charcoal-dark)] hover:text-white"
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-5 w-5 shrink-0",
                              isActive
                                ? "text-[var(--ranz-yellow)]"
                                : "text-[var(--ranz-silver)] group-hover:text-white"
                            )}
                          />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
