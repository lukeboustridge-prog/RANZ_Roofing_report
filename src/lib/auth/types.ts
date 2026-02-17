/**
 * Auth Types for Satellite App (Roofing Report)
 *
 * Minimal types needed for JWT verification.
 * These mirror the Quality Program types for compatibility.
 */

// JWT Payload structure - must match Quality Program
export interface JWTPayload {
  sub: string;          // User ID
  iat?: number;         // Issued at
  exp?: number;         // Expiration
  jti?: string;         // JWT ID
  iss?: string;         // Issuer
  aud?: string[];       // Audience

  email: string;
  name: string;
  role: AuthUserRole;
  companyId?: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

export type AuthUserRole =
  | 'MEMBER_COMPANY_ADMIN'
  | 'MEMBER_COMPANY_USER'
  | 'RANZ_ADMIN'
  | 'RANZ_STAFF'
  | 'RANZ_INSPECTOR'
  | 'EXTERNAL_INSPECTOR';

// Auth configuration for satellite app
export const AUTH_CONFIG = {
  jwtIssuer: 'https://portal.ranz.co.nz',
  jwtAudience: ['portal.ranz.co.nz', 'reports.ranz.co.nz'],
  sessionCookieName: 'ranz_session',
  // Satellite apps redirect to primary for sign-in
  signInUrl: 'https://portal.ranz.co.nz/sign-in',
} as const;
