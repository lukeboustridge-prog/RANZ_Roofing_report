import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadToR2, generateAnnotatedKey } from "@/lib/r2";

// POST /api/photos/[id]/annotate - Save annotations for a photo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id: photoId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { annotations, dataUrl } = body;

    // Find the photo
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        report: {
          select: { inspectorId: true, id: true },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Verify ownership
    if (photo.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let annotatedUrl = photo.annotatedUrl;

    // Upload the annotated image if dataUrl is provided
    if (dataUrl && dataUrl.startsWith("data:image/")) {
      try {
        // Extract base64 data and content type
        const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const contentType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");

          // Generate key for annotated image
          const annotatedKey = generateAnnotatedKey(photo.filename);

          // Upload to R2
          annotatedUrl = await uploadToR2(buffer, annotatedKey, contentType);
        }
      } catch (uploadError) {
        console.error("Error uploading annotated image:", uploadError);
        // Continue without saving annotated image URL
      }
    }

    // Update photo with annotations
    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: {
        annotations: annotations,
        annotatedUrl: annotatedUrl,
        isEdited: true,
        editedFrom: photo.editedFrom || photo.id,
      },
    });

    return NextResponse.json(updatedPhoto);
  } catch (error) {
    console.error("Error saving annotations:", error);
    return NextResponse.json(
      { error: "Failed to save annotations" },
      { status: 500 }
    );
  }
}

// GET /api/photos/[id]/annotate - Get annotations for a photo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;
    const { id: photoId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: {
        id: true,
        url: true,
        annotations: true,
        isEdited: true,
        report: {
          select: { inspectorId: true },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Verify ownership
    if (photo.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      id: photo.id,
      url: photo.url,
      annotations: photo.annotations || [],
      isEdited: photo.isEdited,
    });
  } catch (error) {
    console.error("Error fetching annotations:", error);
    return NextResponse.json(
      { error: "Failed to fetch annotations" },
      { status: 500 }
    );
  }
}
