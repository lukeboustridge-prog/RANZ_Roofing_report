import webpush from "web-push";
import prisma from "@/lib/db";
import type { NotificationType } from "@prisma/client";

// Initialize web-push with VAPID keys
// Generate keys with: npx web-push generate-vapid-keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@ranz.co.nz";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Send a push notification to a specific user
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("VAPID keys not configured, skipping push notification");
    return { success: 0, failed: 0 };
  }

  // Get all active subscriptions for this user
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId,
      isActive: true,
    },
  });

  if (subscriptions.length === 0) {
    return { success: 0, failed: 0 };
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/badge-72x72.png",
    data: {
      url: payload.url || "/",
      ...payload.data,
    },
    tag: payload.tag,
  });

  let success = 0;
  let failed = 0;

  // Send to all subscriptions
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          notificationPayload
        );

        // Update last used timestamp
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsed: new Date() },
        });

        return { success: true };
      } catch (error) {
        // Handle expired/invalid subscriptions
        if (
          error &&
          typeof error === "object" &&
          "statusCode" in error &&
          (error.statusCode === 404 || error.statusCode === 410)
        ) {
          // Subscription is no longer valid, deactivate it
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { isActive: false },
          });
        }
        throw error;
      }
    })
  );

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      success++;
    } else {
      failed++;
      console.error("Push notification failed:", result.reason);
    }
  });

  return { success, failed };
}

/**
 * Create a database notification and send push notification
 */
export async function createAndPushNotification(
  userId: string,
  notification: {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    reportId?: string;
    assignmentId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  // Create the database notification
  const dbNotification = await prisma.notification.create({
    data: {
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      reportId: notification.reportId,
      assignmentId: notification.assignmentId,
      metadata: notification.metadata as object | undefined,
    },
  });

  // Check user preferences for this notification type
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  // Map notification types to preference fields
  const preferenceMap: Partial<Record<NotificationType, string | null>> = {
    REPORT_SUBMITTED: "emailReportSubmitted",
    REPORT_APPROVED: "emailReportApproved",
    REPORT_REJECTED: "emailReportRejected",
    REPORT_COMMENTS: "emailReportComments",
    REPORT_FINALIZED: "emailReportFinalized",
    REPORT_SHARED: null, // Always send
    NEW_ASSIGNMENT: "emailAssignmentNew",
    ASSIGNMENT_REMINDER: "emailAssignmentNew",
    ASSIGNMENT_CANCELLED: "emailAssignmentNew",
    SYSTEM_ANNOUNCEMENT: null, // Always send
    SYSTEM_MAINTENANCE: null, // Always send
    ACCOUNT_UPDATE: null, // Always send
    WELCOME: null, // Always send
  };

  // Check if push notifications are enabled for this type
  const preferenceKey = preferenceMap[notification.type];
  const shouldPush =
    !preferenceKey ||
    !preferences ||
    (preferences as unknown as Record<string, boolean>)[preferenceKey] !== false;

  if (shouldPush) {
    // Send push notification
    await sendPushNotification(userId, {
      title: notification.title,
      body: notification.message,
      url: notification.link,
      tag: `notification-${dbNotification.id}`,
      data: {
        notificationId: dbNotification.id,
        type: notification.type,
      },
    });
  }
}

/**
 * Send notification to multiple users
 */
export async function broadcastNotification(
  userIds: string[],
  notification: {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await Promise.allSettled(
    userIds.map((userId) =>
      createAndPushNotification(userId, notification)
    )
  );
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return vapidPublicKey || null;
}
