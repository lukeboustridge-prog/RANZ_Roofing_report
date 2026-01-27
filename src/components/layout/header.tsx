"use client";

import dynamic from "next/dynamic";
import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { SyncStatusCompact } from "@/components/offline/SyncStatusBar";

const UserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  {
    ssr: false,
    loading: () => (
      <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
        <User className="h-5 w-5 text-muted-foreground" />
      </div>
    ),
  }
);

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-[var(--ranz-charcoal-light)]/20 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Diagonal accent - matches RANZ brand style */}
      <div
        className="absolute top-0 right-0 w-32 h-full bg-[var(--ranz-charcoal)] opacity-5 pointer-events-none"
        style={{ clipPath: 'polygon(40% 0, 100% 0, 100% 100%, 0 100%)' }}
      />

      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6 text-[var(--ranz-charcoal)]" />
      </Button>

      {/* Separator */}
      <div className="h-6 w-px bg-[var(--ranz-charcoal-light)]/30 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1" />

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Sync status */}
          <SyncStatusCompact />

          {/* Online/Offline indicator */}
          <OfflineIndicator />

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-[var(--ranz-charcoal-light)]/30" />

          {/* User menu */}
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-9 w-9",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
