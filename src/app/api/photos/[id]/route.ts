import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const updatePhotoSchema = z.object({
  defectId: z.string().nullable().optional(),
  roofElementId: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  photoType: z.enum(["OVERVIEW", "CONTEXT", "DETAIL", "SCALE_REFERENCE", "INACCESSIBLE", "EQUIPMENT", "GENERAL"]).optional(),
});

// PATCH /api/photos/[id] - Update photo
export async function PATCH(
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

    const photo = await prisma.photo.findUnique({
      where: { id },
      include: { report: true },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Verify ownership
    if (photo.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updatePhotoSchema.parse(body);

    // If linking to a defect, verify the defect belongs to the same report
    if (validatedData.defectId) {
      const defect = await prisma.defect.findFirst({
        where: {
          id: validatedData.defectId,
          reportId: photo.reportId,
        },
      });
      if (!defect) {
        return NextResponse.json({ error: "Defect not found in this report" }, { status: 400 });
      }
    }

    // If linking to an element, verify it belongs to the same report
    if (validatedData.roofElementId) {
      const element = await prisma.roofElement.findFirst({
        where: {
          id: validatedData.roofElementId,
          reportId: photo.reportId,
        },
      });
      if (!element) {
        return NextResponse.json({ error: "Element not found in this report" }, { status: 400 });
      }
    }

    const updatedPhoto = await prisma.photo.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(updatedPhoto);
  } catch (error) {
    console.error("Error updating photo:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update photo" },
      { status: 500 }
    );
  }
}

// DELETE /api/photos/[id] - Delete photo
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

    const photo = await prisma.photo.findUnique({
      where: { id },
      include: { report: true },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Verify ownership
    if (photo.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete photo from database (R2 cleanup would be done separately)
    await prisma.photo.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        reportId: photo.reportId,
        userId: user.id,
        action: "PHOTO_DELETED",
        details: {
          filename: photo.originalFilename,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
