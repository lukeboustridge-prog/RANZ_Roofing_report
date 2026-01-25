"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Plus,
  X,
  UserCircle,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "New Report", href: "/reports/new", icon: Plus },
  { name: "Assignments", href: "/assignments", icon: ClipboardList },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Profile", href: "/profile", icon: UserCircle },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
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
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-[var(--ranz-charcoal)]">
          {/* Close button */}
          <div className="absolute right-0 top-0 flex w-16 justify-center pt-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="-m-2.5 text-white hover:bg-[var(--ranz-charcoal-dark)]"
            >
              <span className="sr-only">Close sidebar</span>
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Logo */}
          <div className="flex h-20 shrink-0 items-center px-6 border-b border-[var(--ranz-charcoal-light)]/20">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
              <Image
                src="/logo.png"
                alt="RANZ Logo"
                width={40}
                height={40}
                className="h-10 w-auto"
                onError={(e) => {
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
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col px-6 pb-4 pt-4">
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
                          onClick={onClose}
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
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
