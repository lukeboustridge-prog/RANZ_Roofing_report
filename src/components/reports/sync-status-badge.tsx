"use client";

/**
 * Sync Status Badge Component
 *
 * Displays sync status indicators for photos syncing from mobile app.
 * Shows sync state (synced, pending, syncing, error, offline) and hash verification status.
 */

import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  CloudOff,
  Shield,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Possible sync states for a photo
 */
export type SyncStatus = "synced" | "pending" | "syncing" | "error" | "offline";

/**
 * Props for the SyncStatusBadge component
 */
export interface SyncStatusBadgeProps {
  /** Current sync status */
  status: SyncStatus;
  /** Whether the photo hash has been verified on the server */
  hashVerified?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the status label text */
  showLabel?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

/**
 * Configuration for each sync status
 */
interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

/**
 * Status configuration mapping
 */
const statusConfig: Record<SyncStatus, StatusConfig> = {
  synced: {
    icon: CheckCircle2,
    label: "Synced",
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    description: "Photo has been successfully synced from mobile device",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
    description: "Photo is queued for sync from mobile device",
  },
  syncing: {
    icon: Loader2,
    label: "Syncing",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    description: "Photo is currently being uploaded from mobile device",
  },
  error: {
    icon: AlertCircle,
    label: "Error",
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    description: "Failed to sync photo - will retry automatically",
  },
  offline: {
    icon: CloudOff,
    label: "Offline",
    color: "text-slate-500",
    bgColor: "bg-slate-50 border-slate-200",
    description: "Photo stored offline - will sync when connection restored",
  },
};

/**
 * Size configuration for icon and text
 */
const sizeConfig = {
  sm: {
    icon: "h-3 w-3",
    text: "text-xs",
    padding: "px-1.5 py-0.5",
    gap: "gap-1",
  },
  md: {
    icon: "h-4 w-4",
    text: "text-sm",
    padding: "px-2 py-1",
    gap: "gap-1.5",
  },
  lg: {
    icon: "h-5 w-5",
    text: "text-base",
    padding: "px-2.5 py-1.5",
    gap: "gap-2",
  },
};

/**
 * Hash Verification Icon subcomponent
 * Shows shield icon indicating whether the photo hash has been verified
 */
function HashVerificationIcon({
  verified,
  size = "md",
  className,
}: {
  verified: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = sizeConfig[size].icon;

  if (verified) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full p-0.5 hover:bg-green-100 transition-colors",
              className
            )}
            aria-label="Hash verified - click for details"
          >
            <Shield className={cn(sizeClasses, "text-green-600")} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700">Hash Verified</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Photo integrity confirmed. The SHA-256 hash matches the original
              capture, ensuring evidence has not been modified.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full p-0.5 hover:bg-amber-100 transition-colors",
            className
          )}
          aria-label="Hash not verified - click for details"
        >
          <ShieldAlert className={cn(sizeClasses, "text-amber-500")} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span className="font-medium text-amber-700">Pending Verification</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Photo hash has not yet been verified. This may be because the
            original file is still being uploaded or processed.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Main SyncStatusBadge component
 *
 * Displays the sync status of a photo with optional hash verification indicator.
 */
export function SyncStatusBadge({
  status,
  hashVerified,
  className,
  showLabel = true,
  size = "sm",
}: SyncStatusBadgeProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const Icon = config.icon;
  const isAnimated = status === "syncing";

  return (
    <div className={cn("inline-flex items-center", sizes.gap, className)}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center rounded-full border transition-colors",
              sizes.padding,
              sizes.gap,
              config.bgColor,
              "hover:opacity-80"
            )}
            aria-label={`${config.label} - click for details`}
          >
            <Icon
              className={cn(
                sizes.icon,
                config.color,
                isAnimated && "animate-spin"
              )}
            />
            {showLabel && (
              <span className={cn(sizes.text, config.color, "font-medium")}>
                {config.label}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", config.color)} />
              <span className={cn("font-medium", config.color)}>
                {config.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Hash verification indicator - only show if status is synced */}
      {status === "synced" && hashVerified !== undefined && (
        <HashVerificationIcon verified={hashVerified} size={size} />
      )}
    </div>
  );
}

/**
 * Photo data interface for deriveSyncStatus helper
 */
export interface PhotoSyncData {
  url?: string | null;
  uploadedAt?: Date | string | null;
  hashVerified?: boolean;
  /** Optional error flag from sync process */
  syncError?: boolean;
  /** Optional offline flag */
  isOffline?: boolean;
}

/**
 * Derive sync status from photo data
 *
 * Logic:
 * - If syncError is true: "error"
 * - If isOffline is true: "offline"
 * - If url is empty/null: "pending"
 * - If uploadedAt is null but url exists: "syncing"
 * - If both url and uploadedAt exist: "synced"
 *
 * @param photo - Photo data object
 * @returns Derived sync status
 */
export function deriveSyncStatus(photo: PhotoSyncData): SyncStatus {
  // Error state takes precedence
  if (photo.syncError) {
    return "error";
  }

  // Offline state
  if (photo.isOffline) {
    return "offline";
  }

  // No URL means photo hasn't been uploaded yet
  if (!photo.url) {
    return "pending";
  }

  // Has URL but no uploadedAt means currently syncing
  if (!photo.uploadedAt) {
    return "syncing";
  }

  // Has both URL and uploadedAt - fully synced
  return "synced";
}

export default SyncStatusBadge;
