/**
 * Auth Module for Satellite App (Roofing Report)
 *
 * Provides authentication utilities for verifying JWTs
 * signed by the primary domain (Quality Program).
 *
 * Note: This is a SATELLITE app - it can only VERIFY tokens,
 * not sign them. All sign-in flows redirect to Quality Program.
 *
 * Main API:
 * - getAuthUser() - Get authenticated user (abstracts Clerk vs Custom)
 * - getUserLookupField() - Get database field for user lookup
 * - verifyTokenStateless() - Low-level JWT verification
 */

// Re-export types
export * from './types';

// Re-export helpers for route handlers
export {
  getAuthUser,
  getUserLookupField,
  getUserWhereClause,
  getAuthMode,
  type AuthUser,
} from './helpers';

// Re-export JWT utilities
export { verifyTokenStateless, decodeToken, isTokenExpired, clearKeyCache } from './jwt';

// Re-export session utilities
export { parseSessionCookie, getSessionFromRequest, SESSION_COOKIE_NAME } from './session';
