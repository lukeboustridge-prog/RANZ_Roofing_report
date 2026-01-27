import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  deviceName: z.string().optional(),
});

// GET /api/notifications/subscribe - Get current user's push subscriptions
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: {
        id: true,
        endpoint: true,
        deviceName: true,
        lastUsed: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

// POST /api/notifications/subscribe - Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = subscribeSchema.parse(body);

    // Extract user agent for device info
    const userAgent = request.headers.get("user-agent") || undefined;

    // Upsert subscription (update if endpoint exists, create if not)
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: validatedData.endpoint },
      update: {
        p256dh: validatedData.keys.p256dh,
        auth: validatedData.keys.auth,
        userAgent,
        deviceName: validatedData.deviceName,
        isActive: true,
        lastUsed: new Date(),
      },
      create: {
        userId: user.id,
        endpoint: validatedData.endpoint,
        p256dh: validatedData.keys.p256dh,
        auth: validatedData.keys.auth,
        userAgent,
        deviceName: validatedData.deviceName,
      },
      select: {
        id: true,
        endpoint: true,
        deviceName: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      subscription,
      message: "Successfully subscribed to push notifications",
    });
  } catch (error) {
    console.error("Error creating subscription:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/subscribe - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required" },
        { status: 400 }
      );
    }

    // Deactivate subscription
    const result = await prisma.pushSubscription.updateMany({
      where: {
        userId: user.id,
        endpoint,
      },
      data: {
        isActive: false,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed from push notifications",
    });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 }
    );
  }
}
