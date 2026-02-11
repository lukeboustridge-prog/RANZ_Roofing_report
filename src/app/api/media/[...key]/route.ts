/**
 * GET /api/media/[...key] - Stream media files from R2
 * Proxies R2 objects with proper Content-Type, range request support,
 * and caching headers for reliable video/audio playback in browsers.
 */

import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { r2 } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key } = await params;
    const objectKey = key.join("/");

    if (!objectKey || objectKey.includes("..")) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    if (!r2) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 503 }
      );
    }

    const rangeHeader = request.headers.get("range");

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    });

    const response = await r2.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      response.ContentType || "application/octet-stream"
    );
    if (response.ContentLength != null) {
      headers.set("Content-Length", String(response.ContentLength));
    }
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    if (response.ContentRange) {
      headers.set("Content-Range", response.ContentRange);
    }

    // Stream the body
    const webStream = response.Body.transformToWebStream();
    const status = rangeHeader && response.ContentRange ? 206 : 200;

    return new Response(webStream, { status, headers });
  } catch (error: unknown) {
    const errName =
      error instanceof Error ? error.name : String(error);
    if (errName === "NoSuchKey") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    console.error("[media proxy] Error:", error);
    return NextResponse.json(
      { error: "Failed to stream media" },
      { status: 500 }
    );
  }
}
