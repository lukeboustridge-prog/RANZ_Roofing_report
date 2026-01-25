import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
import crypto from "crypto";

const accessSchema = z.object({
  password: z.string().optional(),
});

/**
 * GET /api/shared/[token] - Access a shared report
 * This is a public endpoint - no authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Apply rate limiting (stricter for public endpoints)
  const rateLimitResult = rateLimit(request, RATE_LIMIT_PRESETS.strict);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { token } = await params;

    // Find the share by token
    const share = await prisma.reportShare.findUnique({
      where: { token },
      include: {
        report: {
          include: {
            inspector: {
              select: {
                name: true,
                email: true,
                company: true,
                qualifications: true,
                lbpNumber: true,
              },
            },
            defects: {
              orderBy: { defectNumber: "asc" },
              include: {
                photos: {
                  select: {
                    id: true,
                    url: true,
                    thumbnailUrl: true,
                    caption: true,
                    photoType: true,
                  },
                },
              },
            },
            roofElements: {
              orderBy: { createdAt: "asc" },
            },
            photos: {
              where: { defectId: null },
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                url: true,
                thumbnailUrl: true,
                caption: true,
                photoType: true,
              },
            },
          },
        },
      },
    });

    if (!share) {
      return NextResponse.json(
        { error: "Share link not found or invalid" },
        { status: 404 }
      );
    }

    // Check if share is active
    if (!share.isActive) {
      return NextResponse.json(
        { error: "This share link has been revoked" },
        { status: 403 }
      );
    }

    // Check if share has expired
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 403 }
      );
    }

    // Check password if required
    const url = new URL(request.url);
    const password = url.searchParams.get("password");

    if (share.password) {
      if (!password) {
        return NextResponse.json(
          { error: "Password required", requiresPassword: true },
          { status: 401 }
        );
      }

      const hashedPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

      if (hashedPassword !== share.password) {
        return NextResponse.json(
          { error: "Invalid password", requiresPassword: true },
          { status: 401 }
        );
      }
    }

    // Update view count and last viewed
    await prisma.reportShare.update({
      where: { id: share.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    const report = share.report;

    // Return report data (sanitized for public view)
    return NextResponse.json({
      share: {
        accessLevel: share.accessLevel,
        expiresAt: share.expiresAt,
        recipientName: share.recipientName,
      },
      report: {
        reportNumber: report.reportNumber,
        status: report.status,
        propertyAddress: report.propertyAddress,
        propertyCity: report.propertyCity,
        propertyRegion: report.propertyRegion,
        propertyPostcode: report.propertyPostcode,
        propertyType: report.propertyType,
        buildingAge: report.buildingAge,
        inspectionDate: report.inspectionDate,
        inspectionType: report.inspectionType,
        weatherConditions: report.weatherConditions,
        accessMethod: report.accessMethod,
        limitations: report.limitations,
        clientName: report.clientName,
        scopeOfWorks: report.scopeOfWorks,
        methodology: report.methodology,
        equipment: report.equipment,
        executiveSummary: report.executiveSummary,
        conclusions: report.conclusions,
        recommendations: report.recommendations,
        declarationSigned: report.declarationSigned,
        signedAt: report.signedAt,
        pdfUrl: share.accessLevel === "VIEW_DOWNLOAD" ? report.pdfUrl : null,
        inspector: report.inspector,
        defects: report.defects,
        roofElements: report.roofElements,
        photos: report.photos,
      },
    });
  } catch (error) {
    console.error("Error accessing shared report:", error);
    return NextResponse.json(
      { error: "Failed to access shared report" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shared/[token] - Verify password for a shared report
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(request, RATE_LIMIT_PRESETS.strict);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { token } = await params;
    const body = await request.json();
    const { password } = accessSchema.parse(body);

    const share = await prisma.reportShare.findUnique({
      where: { token },
    });

    if (!share || !share.isActive) {
      return NextResponse.json(
        { error: "Share link not found or invalid" },
        { status: 404 }
      );
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 403 }
      );
    }

    if (!share.password) {
      return NextResponse.json({ verified: true });
    }

    if (!password) {
      return NextResponse.json(
        { error: "Password required" },
        { status: 401 }
      );
    }

    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    if (hashedPassword !== share.password) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("Error verifying password:", error);
    return NextResponse.json(
      { error: "Failed to verify password" },
      { status: 500 }
    );
  }
}
