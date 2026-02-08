/**
 * GET /api/admin/repair-photos?reportId=xxx
 * Repair endpoint for photos with mismatched R2 keys.
 * Lists actual R2 objects and reconciles with DB records.
 * Admin-only.
 */

import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { listR2Objects, getPublicUrl } from "@/lib/r2";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: getUserWhereClause(authUser.userId, authUser.authSource),
    });

    if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reportId = request.nextUrl.searchParams.get("reportId");

    // Find photos to check — either for a specific report or all with hashVerified=false
    const photos = await prisma.photo.findMany({
      where: reportId
        ? { reportId, hashVerified: false }
        : { hashVerified: false },
      select: {
        id: true,
        filename: true,
        originalFilename: true,
        reportId: true,
        url: true,
      },
    });

    if (photos.length === 0) {
      return NextResponse.json({ message: "No unverified photos found", repaired: 0 });
    }

    // Group by reportId to batch R2 listing
    const byReport = new Map<string, typeof photos>();
    for (const photo of photos) {
      const list = byReport.get(photo.reportId) ?? [];
      list.push(photo);
      byReport.set(photo.reportId, list);
    }

    const results: { id: string; status: string; oldUrl?: string; newUrl?: string }[] = [];

    for (const [rId, reportPhotos] of byReport) {
      const prefix = `reports/${rId}/photos/`;
      const r2Objects = await listR2Objects(prefix);

      for (const photo of reportPhotos) {
        // Match by original filename suffix (sanitised)
        const sanitised = photo.originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
        const matchingObj = r2Objects.find((obj) => obj.key.endsWith(`-${sanitised}`));

        if (!matchingObj) {
          results.push({ id: photo.id, status: "not_found_in_r2" });
          continue;
        }

        const correctFilename = matchingObj.key.split("/").pop()!;
        const correctUrl = getPublicUrl(matchingObj.key);

        // Check if already correct
        if (photo.filename === correctFilename && photo.url === correctUrl) {
          results.push({ id: photo.id, status: "already_correct" });
          continue;
        }

        await prisma.photo.update({
          where: { id: photo.id },
          data: {
            filename: correctFilename,
            url: correctUrl,
          },
        });

        results.push({
          id: photo.id,
          status: "repaired",
          oldUrl: photo.url,
          newUrl: correctUrl,
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${photos.length} photo(s)`,
      repaired: results.filter((r) => r.status === "repaired").length,
      results,
    });
  } catch (error) {
    console.error("Error in repair-photos:", error);
    return NextResponse.json(
      { error: "Failed to repair photos" },
      { status: 500 }
    );
  }
}
