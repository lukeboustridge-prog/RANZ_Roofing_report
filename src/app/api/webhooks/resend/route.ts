import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import prisma from "@/lib/db";

// Resend webhook event types we track
const TRACKED_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
] as const;

interface ResendWebhookPayload {
  type: string;
  data: {
    email_id: string;
    to: string[];
    from: string;
    subject: string;
    created_at: string;
    [key: string]: unknown;
  };
}

// POST /api/webhooks/resend - Handle Resend delivery webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify webhook signature using Svix
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: "Missing Svix headers" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Resend Webhook] RESEND_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    let payload: ResendWebhookPayload;
    try {
      const wh = new Webhook(webhookSecret);
      payload = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ResendWebhookPayload;
    } catch (err) {
      console.error("[Resend Webhook] Signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const eventType = payload.type;
    const data = payload.data;

    // Only store tracked event types
    if (!TRACKED_EVENTS.includes(eventType as typeof TRACKED_EVENTS[number])) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Store event for each recipient
    const recipients = data.to || [];
    for (const email of recipients) {
      await prisma.emailEvent.create({
        data: {
          messageId: data.email_id,
          type: eventType,
          email,
          timestamp: new Date(data.created_at),
          metadata: {
            subject: data.subject,
            from: data.from,
          },
        },
      });
    }

    console.log(
      `[Resend Webhook] ${eventType} for ${data.email_id} (${recipients.length} recipients)`
    );

    return NextResponse.json({ ok: true, processed: recipients.length });
  } catch (error) {
    console.error("[Resend Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
