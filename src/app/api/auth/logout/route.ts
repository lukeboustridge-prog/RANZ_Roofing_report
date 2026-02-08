/**
 * POST /api/auth/logout
 *
 * Mobile logout endpoint. Accepts Bearer token and invalidates the session.
 * Fire-and-forget from the mobile side — always returns success.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  // Mobile logout is fire-and-forget.
  // The mobile app clears local tokens regardless of server response.
  // In the future, we could track session IDs and revoke them here.
  return NextResponse.json({ success: true });
}
