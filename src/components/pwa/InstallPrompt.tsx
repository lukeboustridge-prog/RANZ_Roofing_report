"use client";

/**
 * PWA Install Prompt
 *
 * Prompts users to install the PWA for better offline experience
 */

import { useState, useEffect } from "react";
import { Download, X, Smartphone, Wifi, WifiOff, Camera, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOfflineContext } from "@/contexts/offline-context";

interface InstallPromptProps {
  showAfterMs?: number; // Delay before showing prompt
}

export function InstallPrompt({ showAfterMs = 30000 }: InstallPromptProps) {
  const { canInstall, installPWA } = useOfflineContext();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if already dismissed
  useEffect(() => {
    const wasDismissed = localStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) {
      const dismissedAt = new Date(wasDismissed);
      const daysSinceDismissed =
        (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setDismissed(true);
      }
    }
  }, []);

  // Show prompt after delay
  useEffect(() => {
    if (!canInstall || dismissed) return;

    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, showAfterMs);

    return () => clearTimeout(timer);
  }, [canInstall, dismissed, showAfterMs]);

  const handleInstall = async () => {
    try {
      await installPWA();
      setShowPrompt(false);
    } catch (error) {
      console.error("Install failed:", error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
  };

  if (!canInstall || dismissed) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Install RANZ Reports
          </DialogTitle>
          <DialogDescription>
            Install the app for a better experience on your device
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <WifiOff className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Work Offline</div>
                <div className="text-sm text-muted-foreground">
                  Create and edit reports without internet connection
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Quick Photo Capture</div>
                <div className="text-sm text-muted-foreground">
                  Launch directly to camera from your home screen
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Push Notifications</div>
                <div className="text-sm text-muted-foreground">
                  Get notified about report approvals and updates
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Native App Experience</div>
                <div className="text-sm text-muted-foreground">
                  Full-screen mode with no browser chrome
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDismiss} className="w-full sm:w-auto">
            Maybe Later
          </Button>
          <Button onClick={handleInstall} className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Install App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline banner version
 */
export function InstallBanner({ className }: { className?: string }) {
  const { canInstall, installPWA } = useOfflineContext();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("pwa-install-banner-dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-install-banner-dismissed", new Date().toISOString());
  };

  if (!canInstall || dismissed) return null;

  return (
    <div className={`bg-primary/10 border border-primary/20 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Download className="w-5 h-5 text-primary" />
          <div>
            <div className="font-medium">Install RANZ Reports</div>
            <div className="text-sm text-muted-foreground">
              For offline access and a better experience
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleDismiss}>
            <X className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={installPWA}>
            Install
          </Button>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
