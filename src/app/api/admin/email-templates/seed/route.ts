import { getAuthUser, getUserWhereClause } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { emailTemplateService } from "@/services/email-template-service";

// POST /api/admin/email-templates/seed - Seed default templates from hardcoded email functions
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const userId = authUser?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: getUserWhereClause(userId),
    });

    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const defaults = emailTemplateService.getDefaultTemplates();

    let seeded = 0;
    let skipped = 0;

    for (const template of defaults) {
      const result = await prisma.emailTemplate.upsert({
        where: { type: template.type },
        create: {
          type: template.type,
          name: template.name,
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          bodyText: template.bodyText,
          variables: template.variables,
        },
        update: {
          // Only update if not already customised — skip existing records
          // Using upsert ensures idempotency: first run creates, subsequent runs skip
        },
      });

      // If the record was just created (no updatedAt change), count as seeded
      // Since upsert with empty update still touches updatedAt, we check by comparing
      // creation time proximity
      const isNew =
        Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) <
        1000;
      if (isNew) {
        seeded++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      seeded,
      skipped,
      total: defaults.length,
    });
  } catch (error) {
    console.error("Error seeding email templates:", error);
    return NextResponse.json(
      { error: "Failed to seed email templates" },
      { status: 500 }
    );
  }
}
