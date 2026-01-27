"use client";

/**
 * Notification Center Component
 * Dropdown/panel showing all notifications
 */

import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NotificationItem, type NotificationData } from "./NotificationItem";
import { cn } from "@/lib/utils";

interface NotificationsResponse {
  notifications: NotificationData[];
  pagination: {
    total: number;
    unread: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchNotifications = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      const response = await fetch(
        `/api/notifications?limit=20&offset=${currentOffset}`
      );
      if (!response.ok) throw new Error("Failed to fetch notifications");

      const data: NotificationsResponse = await response.json();

      if (reset) {
        setNotifications(data.notifications);
        setOffset(data.notifications.length);
      } else {
        setNotifications((prev) => [...prev, ...data.notifications]);
        setOffset((prev) => prev + data.notifications.length);
      }

      setUnreadCount(data.pagination.unread);
      setHasMore(data.pagination.hasMore);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [offset]);

  // Fetch notifications when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
    }
  }, [isOpen]);

  // Polling for unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch("/api/notifications?limit=1");
        if (response.ok) {
          const data: NotificationsResponse = await response.json();
          setUnreadCount(data.pagination.unread);
        }
      } catch {
        // Silently fail
      }
    };

    // Initial fetch
    fetchUnreadCount();

    // Poll every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleDismiss = (id: string) => {
    const notification = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (notification && !notification.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchNotifications(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 flex items-center justify-center",
                "min-w-5 h-5 px-1 text-xs font-medium rounded-full",
                "bg-red-500 text-white"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Inbox className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="py-2">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDismiss={handleDismiss}
                  />
                  {index < notifications.length - 1 && (
                    <Separator className="mx-4" />
                  )}
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="px-4 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={loadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationCenter;
