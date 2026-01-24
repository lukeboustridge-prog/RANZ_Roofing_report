import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadToR2, generateFileKey } from "@/lib/r2";

// POST /api/reports/[id]/signature - Save signature and mark as signed
export async function POST(
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

    const report = await prisma.report.findFirst({
      where: {
        id,
        inspectorId: user.id,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check if report is already finalised
    if (report.status === "FINALISED") {
      return NextResponse.json(
        { error: "Report is already finalised" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { signatureDataUrl, declarationAccepted } = body;

    if (!signatureDataUrl) {
      return NextResponse.json(
        { error: "Signature is required" },
        { status: 400 }
      );
    }

    if (!declarationAccepted) {
      return NextResponse.json(
        { error: "Declaration must be accepted" },
        { status: 400 }
      );
    }

    // Convert base64 data URL to buffer
    const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Upload signature to R2
    const signatureKey = generateFileKey(id, "signature.png", "signatures");
    const signatureUrl = await uploadToR2(buffer, signatureKey, "image/png");

    // Update report with signature
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        declarationSigned: true,
        signedAt: new Date(),
        signatureUrl,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: id,
        userId: user.id,
        action: "UPDATED",
        details: {
          action: "signature_added",
          signedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      signatureUrl: updatedReport.signatureUrl,
      signedAt: updatedReport.signedAt,
    });
  } catch (error) {
    console.error("Error saving signature:", error);
    return NextResponse.json(
      { error: "Failed to save signature" },
      { status: 500 }
    );
  }
}

// GET /api/reports/[id]/signature - Get signature status
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

    const report = await prisma.report.findFirst({
      where: {
        id,
        inspectorId: user.id,
      },
      select: {
        declarationSigned: true,
        signedAt: true,
        signatureUrl: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      declarationSigned: report.declarationSigned,
      signedAt: report.signedAt,
      signatureUrl: report.signatureUrl,
    });
  } catch (error) {
    console.error("Error fetching signature status:", error);
    return NextResponse.json(
      { error: "Failed to fetch signature status" },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/[id]/signature - Remove signature (allow re-signing)
export async function DELETE(
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

    const report = await prisma.report.findFirst({
      where: {
        id,
        inspectorId: user.id,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Don't allow removing signature from finalised reports
    if (report.status === "FINALISED") {
      return NextResponse.json(
        { error: "Cannot remove signature from finalised report" },
        { status: 400 }
      );
    }

    // Update report to remove signature
    await prisma.report.update({
      where: { id },
      data: {
        declarationSigned: false,
        signedAt: null,
        signatureUrl: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing signature:", error);
    return NextResponse.json(
      { error: "Failed to remove signature" },
      { status: 500 }
    );
  }
}
