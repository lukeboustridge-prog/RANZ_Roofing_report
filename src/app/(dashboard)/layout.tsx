"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { OfflineProvider } from "@/contexts/offline-context";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { SyncStatusBar } from "@/components/offline/SyncStatusBar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <OfflineProvider>
      <div className="min-h-screen bg-background">
        {/* Offline banner - shows when offline */}
        <OfflineIndicator variant="banner" />

        {/* Sidebar for desktop */}
        <Sidebar />

        {/* Mobile navigation */}
        <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

        {/* Main content area */}
        <div className="lg:pl-64">
          <Header onMenuClick={() => setMobileNavOpen(true)} />

          {/* Sync status bar - shows when there are pending items */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
            <SyncStatusBar className="mb-4" />
          </div>

          <main id="main-content" className="py-4" tabIndex={-1}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>

        {/* PWA Install Prompt */}
        <InstallPrompt showAfterMs={60000} />
      </div>
    </OfflineProvider>
  );
}
