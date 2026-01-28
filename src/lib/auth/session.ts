/**
 * Session Cookie Utilities for Satellite App (Roofing Report)
 *
 * Parses the shared session cookie set by Quality Program.
 * The cookie Domain is .ranz.org.nz so it's readable across subdomains.
 */

import { parse } from 'cookie';
import { AUTH_CONFIG } from './types';

export const SESSION_COOKIE_NAME = AUTH_CONFIG.sessionCookieName;

/**
 * Parse session token from cookie header.
 *
 * @param cookieHeader - The Cookie header string
 * @returns Session token or null if not found
 */
export function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = parse(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] || null;
}

/**
 * Extract session token from request.
 *
 * @param request - Request object with headers
 * @returns Session token or null
 */
export function getSessionFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  return parseSessionCookie(cookieHeader);
}
