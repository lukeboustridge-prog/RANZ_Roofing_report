"use client";

/**
 * Notification Item Component
 * Individual notification display with actions
 */

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Calendar,
  Bell,
  Megaphone,
  User,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  reportId?: string | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationItemProps {
  notification: NotificationData;
  onMarkAsRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const notificationIcons: Record<string, React.ElementType> = {
  REPORT_SUBMITTED: FileText,
  REPORT_APPROVED: CheckCircle2,
  REPORT_REJECTED: AlertCircle,
  REPORT_COMMENTS: MessageSquare,
  REPORT_FINALIZED: CheckCircle2,
  REPORT_SHARED: FileText,
  NEW_ASSIGNMENT: Calendar,
  ASSIGNMENT_REMINDER: Calendar,
  ASSIGNMENT_CANCELLED: AlertCircle,
  SYSTEM_ANNOUNCEMENT: Megaphone,
  SYSTEM_MAINTENANCE: AlertCircle,
  ACCOUNT_UPDATE: User,
  WELCOME: Bell,
};

const notificationColors: Record<string, string> = {
  REPORT_APPROVED: "text-green-500",
  REPORT_REJECTED: "text-red-500",
  REPORT_FINALIZED: "text-green-500",
  ASSIGNMENT_CANCELLED: "text-red-500",
  SYSTEM_MAINTENANCE: "text-amber-500",
  WELCOME: "text-blue-500",
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
}: NotificationItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const Icon = notificationIcons[notification.type] || Bell;
  const iconColor = notificationColors[notification.type] || "text-gray-500";

  const handleMarkAsRead = async () => {
    if (notification.read || isLoading) return;
    setIsLoading(true);
    try {
      await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      onMarkAsRead?.(notification.id);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;
    setIsLoading(true);
    try {
      await fetch(`/api/notifications/${notification.id}`, {
        method: "DELETE",
      });
      onDismiss?.(notification.id);
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div
      className={cn(
        "group relative flex gap-3 p-3 rounded-lg transition-colors",
        !notification.read && "bg-blue-50 dark:bg-blue-900/10",
        notification.read && "hover:bg-gray-50 dark:hover:bg-gray-800/50"
      )}
      onClick={handleMarkAsRead}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
          !notification.read ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-800"
        )}
      >
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium truncate",
              !notification.read
                ? "text-gray-900 dark:text-white"
                : "text-gray-700 dark:text-gray-300"
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleMarkAsRead();
            }}
            disabled={isLoading}
            title="Mark as read"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-400 hover:text-red-500"
          onClick={handleDismiss}
          disabled={isLoading}
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export default NotificationItem;
