import { getAuthUser, getUserLookupField } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const updateElementSchema = z.object({
  elementType: z.enum([
    "ROOF_CLADDING",
    "RIDGE",
    "VALLEY",
    "HIP",
    "BARGE",
    "FASCIA",
    "GUTTER",
    "DOWNPIPE",
    "FLASHING_WALL",
    "FLASHING_PENETRATION",
    "SKYLIGHT",
    "VENT",
    "OTHER",
  ]).optional(),
  location: z.string().min(1).optional(),
  claddingType: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  pitch: z.number().optional().nullable(),
  area: z.number().optional().nullable(),
  conditionRating: z.enum(["GOOD", "FAIR", "POOR", "CRITICAL", "NOT_INSPECTED"]).optional().nullable(),
  conditionNotes: z.string().optional().nullable(),
});

// GET /api/elements/[id] - Get single element
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lookupField = getUserLookupField();
    const user = await prisma.user.findUnique({
      where: { [lookupField]: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const element = await prisma.roofElement.findUnique({
      where: { id },
      include: {
        report: true,
        defects: true,
        photos: true,
      },
    });

    if (!element) {
      return NextResponse.json({ error: "Element not found" }, { status: 404 });
    }

    // Verify ownership
    if (element.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(element);
  } catch (error) {
    console.error("Error fetching element:", error);
    return NextResponse.json(
      { error: "Failed to fetch element" },
      { status: 500 }
    );
  }
}

// PATCH /api/elements/[id] - Update element
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lookupField = getUserLookupField();
    const user = await prisma.user.findUnique({
      where: { [lookupField]: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const element = await prisma.roofElement.findUnique({
      where: { id },
      include: { report: true },
    });

    if (!element) {
      return NextResponse.json({ error: "Element not found" }, { status: 404 });
    }

    // Verify ownership
    if (element.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateElementSchema.parse(body);

    const updatedElement = await prisma.roofElement.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(updatedElement);
  } catch (error) {
    console.error("Error updating element:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update element" },
      { status: 500 }
    );
  }
}

// DELETE /api/elements/[id] - Delete element
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lookupField = getUserLookupField();
    const user = await prisma.user.findUnique({
      where: { [lookupField]: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const element = await prisma.roofElement.findUnique({
      where: { id },
      include: { report: true },
    });

    if (!element) {
      return NextResponse.json({ error: "Element not found" }, { status: 404 });
    }

    // Verify ownership
    if (element.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.roofElement.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting element:", error);
    return NextResponse.json(
      { error: "Failed to delete element" },
      { status: 500 }
    );
  }
}
