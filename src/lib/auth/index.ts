/**
 * Auth Module for Satellite App (Roofing Report)
 *
 * Provides authentication utilities for verifying JWTs
 * signed by the primary domain (Quality Program).
 *
 * Note: This is a SATELLITE app - it can only VERIFY tokens,
 * not sign them. All sign-in flows redirect to Quality Program.
 */

// Re-export types
export * from './types';

// Re-export JWT utilities
export { verifyTokenStateless, decodeToken, isTokenExpired, clearKeyCache } from './jwt';

// Re-export session utilities
export { parseSessionCookie, getSessionFromRequest, SESSION_COOKIE_NAME } from './session';
