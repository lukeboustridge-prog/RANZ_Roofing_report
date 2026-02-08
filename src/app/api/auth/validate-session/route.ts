/**
 * GET /api/auth/validate-session
 *
 * Validates a mobile JWT token is still valid.
 * Returns 200 if valid, 401 if not.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenStateless } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = await verifyTokenStateless(token);

    if (!payload) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}
