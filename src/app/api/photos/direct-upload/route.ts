import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import fs from "fs/promises";
import path from "path";

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function ensureLocalDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory might already exist
  }
}

/**
 * Direct upload endpoint for local development
 * Used when R2 is not configured - allows mobile devices to upload directly
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Missing key parameter" },
        { status: 400 }
      );
    }

    // Validate key format to prevent path traversal
    if (key.includes("..") || !key.startsWith("reports/")) {
      return NextResponse.json(
        { error: "Invalid key format" },
        { status: 400 }
      );
    }

    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await request.arrayBuffer());

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "Empty file" },
        { status: 400 }
      );
    }

    // Max file size: 50MB
    if (buffer.length > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 50MB)" },
        { status: 413 }
      );
    }

    const filePath = path.join(LOCAL_UPLOAD_DIR, key);
    await ensureLocalDir(path.dirname(filePath));
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/${key}`;

    return NextResponse.json({
      success: true,
      url,
      key,
      size: buffer.length,
      contentType,
    });
  } catch (error) {
    console.error("Direct upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

/**
 * PUT method for presigned URL style uploads
 */
export async function PUT(request: NextRequest) {
  return POST(request);
}
