import { NextResponse } from "next/server";
import { z } from "zod";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Sanitise an error for API responses.
 *
 * - In production: returns a generic message to avoid leaking internals.
 * - In development: includes the original error message for debugging.
 * - Zod validation errors always return field-level details.
 */
export function handleApiError(
  error: unknown,
  fallbackMessage: string,
  status: number = 500
): NextResponse {
  // Always log the real error server-side
  console.error(`[API Error] ${fallbackMessage}:`, error);

  // Zod validation errors are safe to expose
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.issues },
      { status: 400 }
    );
  }

  // In production, return generic message only
  if (IS_PRODUCTION) {
    return NextResponse.json({ error: fallbackMessage }, { status });
  }

  // In development, include the real error message
  const message =
    error instanceof Error ? error.message : String(error);
  return NextResponse.json(
    { error: fallbackMessage, detail: message },
    { status }
  );
}
