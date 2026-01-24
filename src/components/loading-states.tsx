"use client";

import { Loader2, FileText, Image, Upload, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Full page loading spinner
 */
export function PageLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Inline loading spinner for buttons or small areas
 */
export function InlineLoading({
  size = "default",
  className,
}: {
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-3 w-3",
    default: "h-4 w-4",
    lg: "h-6 w-6",
  };

  return (
    <Loader2
      className={cn("animate-spin text-muted-foreground", sizeClasses[size], className)}
    />
  );
}

/**
 * Loading spinner with optional text
 */
export function LoadingSpinner({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}

/**
 * Card loading state
 */
export function CardLoading() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-muted" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-1/3 bg-muted rounded" />
          <div className="h-3 w-2/3 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Report loading state with icon
 */
export function ReportLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <FileText className="h-12 w-12 text-muted-foreground/30" />
        <Loader2 className="h-6 w-6 animate-spin text-primary absolute -bottom-1 -right-1" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Loading report...</p>
    </div>
  );
}

/**
 * Photo gallery loading state
 */
export function PhotosLoading({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-lg bg-muted animate-pulse flex items-center justify-center"
        >
          <Image className="h-8 w-8 text-muted-foreground/30" />
        </div>
      ))}
    </div>
  );
}

/**
 * Upload progress indicator
 */
export function UploadLoading({
  progress,
  filename,
}: {
  progress?: number;
  filename?: string;
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <Upload className="h-5 w-5 text-muted-foreground animate-pulse" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {filename || "Uploading..."}
          </p>
          {progress !== undefined && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        {progress !== undefined && (
          <span className="text-sm text-muted-foreground">{progress}%</span>
        )}
      </div>
    </div>
  );
}

/**
 * PDF generation loading state
 */
export function PdfLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative">
        <FileText className="h-16 w-16 text-muted-foreground/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium">Generating PDF...</p>
      <p className="text-xs text-muted-foreground mt-1">
        This may take a moment
      </p>
    </div>
  );
}

/**
 * Settings/processing loading state
 */
export function ProcessingLoading({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <Settings className="h-5 w-5 text-blue-600 animate-spin" />
      <span className="text-sm text-blue-700">{message}</span>
    </div>
  );
}

/**
 * Table row loading shimmer
 */
export function TableRowLoading({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-muted rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Suspense fallback wrapper
 */
export function SuspenseFallback({
  children,
  loading,
}: {
  children: React.ReactNode;
  loading: React.ReactNode;
}) {
  return <>{loading}</>;
}

/**
 * Empty state when no data is available
 */
export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
