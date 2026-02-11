import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const updateVoiceNoteSchema = z.object({
  transcription: z.string().nullable().optional(),
});

// GET /api/voice-notes/[id] - Get single voice note
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
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId, authUser.authSource),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const voiceNote = await prisma.voiceNote.findUnique({
      where: { id },
      include: { report: true },
    });

    if (!voiceNote) {
      return NextResponse.json({ error: "Voice note not found" }, { status: 404 });
    }

    if (voiceNote.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(voiceNote);
  } catch (error) {
    console.error("Error fetching voice note:", error);
    return NextResponse.json(
      { error: "Failed to fetch voice note" },
      { status: 500 }
    );
  }
}

// PATCH /api/voice-notes/[id] - Update voice note (transcription)
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
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId, authUser.authSource),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const voiceNote = await prisma.voiceNote.findUnique({
      where: { id },
      include: { report: true },
    });

    if (!voiceNote) {
      return NextResponse.json({ error: "Voice note not found" }, { status: 404 });
    }

    if (voiceNote.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateVoiceNoteSchema.parse(body);

    const updatedVoiceNote = await prisma.voiceNote.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(updatedVoiceNote);
  } catch (error) {
    console.error("Error updating voice note:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update voice note" },
      { status: 500 }
    );
  }
}

// DELETE /api/voice-notes/[id] - Delete voice note
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
    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId, authUser.authSource),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const voiceNote = await prisma.voiceNote.findUnique({
      where: { id },
      include: { report: true },
    });

    if (!voiceNote) {
      return NextResponse.json({ error: "Voice note not found" }, { status: 404 });
    }

    if (voiceNote.report.inspectorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.voiceNote.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting voice note:", error);
    return NextResponse.json(
      { error: "Failed to delete voice note" },
      { status: 500 }
    );
  }
}
