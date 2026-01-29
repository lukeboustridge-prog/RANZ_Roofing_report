/**
 * Auth Helpers for Satellite App (Roofing Report)
 *
 * Provides a unified getAuthUser() function that abstracts
 * the auth mode (Clerk vs Custom JWT) from route handlers.
 *
 * Route handlers can simply call getAuthUser() without
 * knowing which auth system is active.
 *
 * Requirements:
 * - XAPP-GAP: Route handler auth abstraction
 */

import { headers } from 'next/headers';
import { verifyTokenStateless } from './jwt';
import { getSessionFromRequest } from './session';
import type { AuthUserRole, JWTPayload } from './types';

// Auth mode from environment (defaults to 'clerk' for graceful transition)
const AUTH_MODE = process.env.AUTH_MODE || 'clerk';

/**
 * Unified auth user shape returned regardless of auth mode.
 *
 * - In custom mode: userId is the internal database ID (query by { id: userId })
 * - In clerk mode: userId is the Clerk ID (query by { clerkId: userId })
 */
export interface AuthUser {
  /** Internal user ID (for custom) or Clerk ID (for clerk mode) */
  userId: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** User's role in the system */
  role: AuthUserRole;
  /** Associated company ID (if applicable) */
  companyId?: string;
  /** Which auth system provided this user */
  authSource: 'custom' | 'clerk';
}

/**
 * Get the field name to use when looking up users in the database.
 *
 * - In custom mode: returns 'id' (internal database ID)
 * - In clerk mode: returns 'clerkId' (Clerk's external ID)
 *
 * @example
 * const field = getUserLookupField();
 * const user = await prisma.user.findUnique({
 *   where: { [field]: authUser.userId }
 * });
 */
export function getUserLookupField(): 'id' | 'clerkId' {
  return AUTH_MODE === 'custom' ? 'id' : 'clerkId';
}

/**
 * Get the current AUTH_MODE setting.
 * Useful for conditional logic in route handlers.
 */
export function getAuthMode(): 'clerk' | 'custom' | 'oidc' {
  const mode = AUTH_MODE as string;
  if (mode === 'custom' || mode === 'oidc') {
    return mode;
  }
  return 'clerk';
}

/**
 * Get the authenticated user from the current request.
 *
 * This function abstracts the auth mode, allowing route handlers
 * to authenticate users without knowing whether Clerk or custom
 * JWT auth is active.
 *
 * @param request - Optional Request object. If not provided, headers() is used (server-side).
 * @returns AuthUser if authenticated, null if not
 *
 * @example
 * // In a route handler:
 * export async function GET(request: Request) {
 *   const user = await getAuthUser(request);
 *   if (!user) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *
 *   // User is authenticated - look up in database
 *   const field = getUserLookupField();
 *   const dbUser = await prisma.user.findUnique({
 *     where: { [field]: user.userId }
 *   });
 *
 *   // ... rest of handler
 * }
 */
export async function getAuthUser(request?: Request): Promise<AuthUser | null> {
  if (AUTH_MODE === 'custom') {
    return getAuthUserFromCustomAuth(request);
  }

  // Default to Clerk mode
  return getAuthUserFromClerk();
}

/**
 * Get authenticated user from custom JWT auth.
 * Uses the ranz_session cookie containing a JWT signed by Quality Program.
 */
async function getAuthUserFromCustomAuth(request?: Request): Promise<AuthUser | null> {
  try {
    let token: string | null = null;

    if (request) {
      // Get token from request object
      token = getSessionFromRequest(request);
    } else {
      // Get token from Next.js headers() (server component context)
      const headersList = await headers();
      const cookieHeader = headersList.get('cookie');
      if (cookieHeader) {
        // Parse cookie header to extract ranz_session
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, string>);
        token = cookies['ranz_session'] || null;
      }
    }

    if (!token) {
      return null;
    }

    // Verify the JWT using public key
    const payload = await verifyTokenStateless(token);
    if (!payload) {
      return null;
    }

    // Only accept access tokens, not refresh tokens
    if (payload.type !== 'access') {
      return null;
    }

    return mapPayloadToAuthUser(payload);
  } catch (error) {
    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[getAuthUser] Custom auth error:', error);
    }
    return null;
  }
}

/**
 * Get authenticated user from Clerk.
 * Falls back to Clerk's auth() function for existing Clerk-based routes.
 */
async function getAuthUserFromClerk(): Promise<AuthUser | null> {
  try {
    // Dynamic import to avoid bundling Clerk when not needed
    const { auth, currentUser } = await import('@clerk/nextjs/server');

    const { userId } = await auth();
    if (!userId) {
      return null;
    }

    // Get full user details from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return null;
    }

    // Map Clerk user to AuthUser
    // Note: Role mapping would need to come from Clerk metadata or database
    return {
      userId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Unknown',
      role: mapClerkRoleToAuthRole(clerkUser.publicMetadata?.role as string | undefined),
      companyId: clerkUser.publicMetadata?.companyId as string | undefined,
      authSource: 'clerk',
    };
  } catch (error) {
    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[getAuthUser] Clerk auth error:', error);
    }
    return null;
  }
}

/**
 * Map JWT payload to AuthUser shape.
 */
function mapPayloadToAuthUser(payload: JWTPayload): AuthUser {
  return {
    userId: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    companyId: payload.companyId,
    authSource: 'custom',
  };
}

/**
 * Map Clerk role metadata to AuthUserRole.
 * Default to MEMBER_COMPANY_USER if no role is set.
 */
function mapClerkRoleToAuthRole(clerkRole: string | undefined): AuthUserRole {
  if (!clerkRole) {
    return 'MEMBER_COMPANY_USER';
  }

  // Map common Clerk role names to AuthUserRole
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
