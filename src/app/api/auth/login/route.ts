/**
 * POST /api/auth/login
 *
 * Mobile login endpoint. Accepts email + password, verifies via Clerk,
 * and returns a signed JWT for offline-capable mobile authentication.
 *
 * Headers:
 *   X-Application: MOBILE (identifies mobile client)
 *
 * Body:
 *   { email: string, password: string }
 *
 * Returns:
 *   { success: true, accessToken: string, mustChangePassword?: boolean }
 *   { success: false, error: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { SignJWT, importPKCS8 } from 'jose';
import prisma from '@/lib/db';
import type { AuthUserRole } from '@/lib/auth/types';

const ALGORITHM = 'RS256';
const TOKEN_LIFETIME = '8h';
const JWT_ISSUER = 'https://portal.ranz.org.nz';
const JWT_AUDIENCE = ['portal.ranz.org.nz', 'reports.ranz.org.nz'];

// Cache the private key
let cachedPrivateKey: CryptoKey | null = null;

async function getPrivateKey(): Promise<CryptoKey> {
  if (cachedPrivateKey) return cachedPrivateKey;

  const privateKeyPem = process.env.JWT_PRIVATE_KEY;
  if (!privateKeyPem) {
    throw new Error('JWT_PRIVATE_KEY environment variable is not set');
  }

  const normalizedKey = privateKeyPem.replace(/\\n/g, '\n');
  cachedPrivateKey = await importPKCS8(normalizedKey, ALGORITHM);
  return cachedPrivateKey;
}

/**
 * Map Prisma UserRole to AuthUserRole for JWT payload
 */
function mapPrismaRole(role: string): AuthUserRole {
  const roleMap: Record<string, AuthUserRole> = {
    SUPER_ADMIN: 'RANZ_ADMIN',
    ADMIN: 'RANZ_STAFF',
    APPOINTED_INSPECTOR: 'RANZ_INSPECTOR',
    INSPECTOR: 'RANZ_INSPECTOR',
    MEMBER: 'MEMBER_COMPANY_USER',
  };
  return roleMap[role] || 'MEMBER_COMPANY_USER';
}

/**
 * Map Clerk publicMetadata role to AuthUserRole
 */
function mapClerkRole(clerkRole: string | undefined): AuthUserRole {
  if (!clerkRole) return 'MEMBER_COMPANY_USER';
  const roleMap: Record<string, AuthUserRole> = {
    admin: 'RANZ_ADMIN',
    ranz_admin: 'RANZ_ADMIN',
    staff: 'RANZ_STAFF',
    ranz_staff: 'RANZ_STAFF',
    inspector: 'RANZ_INSPECTOR',
    ranz_inspector: 'RANZ_INSPECTOR',
    external_inspector: 'EXTERNAL_INSPECTOR',
    company_admin: 'MEMBER_COMPANY_ADMIN',
    member_admin: 'MEMBER_COMPANY_ADMIN',
    member: 'MEMBER_COMPANY_USER',
    user: 'MEMBER_COMPANY_USER',
  };
  return roleMap[clerkRole.toLowerCase()] || 'MEMBER_COMPANY_USER';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user in Clerk by email
    const clerk = await clerkClient();
    const users = await clerk.users.getUserList({
      emailAddress: [email.toLowerCase()],
    });

    if (users.totalCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const clerkUser = users.data[0];

    // Verify password via Clerk
    let verified = false;
    try {
      const result = await clerk.users.verifyPassword({
        userId: clerkUser.id,
        password,
      });
      verified = result.verified;
    } catch {
      // verifyPassword throws on invalid password in some SDK versions
      verified = false;
    }

    if (!verified) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Look up user in local database for role info
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        company: true,
        status: true,
      },
    });

    // Determine role and user info
    const userName = dbUser?.name
      || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
      || 'Unknown';
    const userRole = dbUser
      ? mapPrismaRole(dbUser.role)
      : mapClerkRole(clerkUser.publicMetadata?.role as string | undefined);
    const userId = dbUser?.id || clerkUser.id;

    // Check if user is active
    if (dbUser?.status && dbUser.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Account is not active. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Sign JWT
    const privateKey = await getPrivateKey();
    const accessToken = await new SignJWT({
      email: email.toLowerCase(),
      name: userName,
      role: userRole,
      companyId: (clerkUser.publicMetadata?.companyId as string) || undefined,
      sessionId,
      type: 'access' as const,
    })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(TOKEN_LIFETIME)
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setJti(crypto.randomUUID())
      .sign(privateKey);

    return NextResponse.json({
      success: true,
      accessToken,
      mustChangePassword: false,
    });
  } catch (error) {
    console.error('[API /auth/login] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
