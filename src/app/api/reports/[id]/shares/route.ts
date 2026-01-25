import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import crypto from "crypto";

const createShareSchema = z.object({
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  accessLevel: z.enum(["VIEW_ONLY", "VIEW_DOWNLOAD"]).optional().default("VIEW_ONLY"),
  expiresInDays: z.number().min(1).max(365).optional(),
  password: z.string().min(4).optional(),
});

/**
 * GET /api/reports/[id]/shares - List all share links for a report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check report exists and user has access
    const report = await prisma.report.findFirst({
      where: {
        id,
        OR: [
          { inspectorId: user.id },
          ...(['ADMIN', 'SUPER_ADMIN'].includes(user.role) ? [{}] : []),
        ],
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const shares = await prisma.reportShare.findMany({
      where: { reportId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        token: true,
        recipientEmail: true,
        recipientName: true,
        accessLevel: true,
        expiresAt: true,
        viewCount: true,
        lastViewedAt: true,
        downloadCount: true,
        isActive: true,
        revokedAt: true,
        createdAt: true,
        createdById: true,
      },
    });

    // Generate full share URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const sharesWithUrls = shares.map((share) => ({
      ...share,
      shareUrl: `${baseUrl}/shared/${share.token}`,
      hasPassword: false, // Don't expose actual password presence
    }));

    return NextResponse.json(sharesWithUrls);
  } catch (error) {
    console.error("Error fetching shares:", error);
    return NextResponse.json(
      { error: "Failed to fetch shares" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports/[id]/shares - Create a new share link
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(request, RATE_LIMIT_PRESETS.standard);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check report exists and user has access
    const report = await prisma.report.findFirst({
      where: {
        id,
        OR: [
          { inspectorId: user.id },
          ...(['ADMIN', 'SUPER_ADMIN'].includes(user.role) ? [{}] : []),
        ],
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Only allow sharing of finalized or approved reports
    if (!["FINALISED", "APPROVED"].includes(report.status)) {
      return NextResponse.json(
        { error: "Only finalized or approved reports can be shared" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { recipientEmail, recipientName, accessLevel, expiresInDays, password } =
      createShareSchema.parse(body);

    // Calculate expiry date
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Hash password if provided
    const hashedPassword = password
      ? crypto.createHash("sha256").update(password).digest("hex")
      : null;

    // Generate unique token
    const token = crypto.randomBytes(32).toString("hex");

    const share = await prisma.reportShare.create({
      data: {
        reportId: id,
        token,
        createdById: user.id,
        recipientEmail,
        recipientName,
        accessLevel,
        expiresAt,
        password: hashedPassword,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "SHARED",
        details: {
          shareId: share.id,
          recipientEmail,
          recipientName,
          accessLevel,
          expiresAt: expiresAt?.toISOString(),
          hasPassword: !!password,
        },
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/shared/${token}`;

    return NextResponse.json({
      id: share.id,
      token: share.token,
      shareUrl,
      recipientEmail,
      recipientName,
      accessLevel,
      expiresAt,
      hasPassword: !!password,
      createdAt: share.createdAt,
    });
  } catch (error) {
    console.error("Error creating share:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}
