import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { uploadToR2, generateAnnotatedKey } from "@/lib/r2";

// POST /api/photos/[id]/annotate - Save annotations for a photo
// Accepts either JSON body (legacy) or FormData (preferred for large images)
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

    let annotations: Prisma.InputJsonValue | undefined;
    let imageBuffer: Buffer | null = null;
    let imageContentType = "image/png";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // FormData approach (preferred — avoids body size limits)
      const formData = await request.formData();
      const annotationsStr = formData.get("annotations") as string;
      annotations = annotationsStr ? JSON.parse(annotationsStr) : [];

      const imageFile = formData.get("annotatedImage") as File | null;
      if (imageFile) {
        const arrayBuffer = await imageFile.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        imageContentType = imageFile.type || "image/png";
      }
    } else {
      // JSON body (legacy — may fail for large images)
      const body = await request.json();
      annotations = body.annotations;
      const dataUrl = body.dataUrl as string | undefined;

      if (dataUrl && dataUrl.startsWith("data:image/")) {
        const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          imageContentType = matches[1];
          imageBuffer = Buffer.from(matches[2], "base64");
        }
      }
    }

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

    // Upload the annotated image if provided
    if (imageBuffer) {
      try {
        const annotatedKey = generateAnnotatedKey(photo.filename);
        annotatedUrl = await uploadToR2(imageBuffer, annotatedKey, imageContentType);
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
