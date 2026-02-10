/**
 * JWT Verification for Satellite App (Roofing Report)
 *
 * Stateless verification using PUBLIC KEY ONLY.
 * The satellite app cannot sign tokens - only verify them.
 *
 * Requirements:
 * - XAPP-04: Cross-app authentication via shared JWT
 * - XAPP-06: Public key verification only
 */

import { jwtVerify, importSPKI, type JWTVerifyResult } from 'jose';
import { JWTPayload, AUTH_CONFIG } from './types';

const ALGORITHM = 'RS256';

// Cache the public key to avoid re-parsing on every request
let cachedPublicKey: CryptoKey | null = null;

/**
 * Get the public key from environment, with caching.
 * Satellite apps only have the PUBLIC key - they cannot sign tokens.
 */
async function getPublicKey(): Promise<CryptoKey> {
  if (cachedPublicKey) return cachedPublicKey;

  const publicKeyPem = process.env.JWT_PUBLIC_KEY;
  if (!publicKeyPem) {
    throw new Error(
      'JWT_PUBLIC_KEY environment variable is not set. ' +
      'This is required for satellite app JWT verification. ' +
      'Copy the public key from Quality Program.'
    );
  }

  // Handle escaped newlines in env vars
  const normalizedKey = publicKeyPem.replace(/\\n/g, '\n');
  cachedPublicKey = await importSPKI(normalizedKey, ALGORITHM);
  return cachedPublicKey;
}

/**
 * Clear the key cache. Useful for testing or key rotation.
 */
export function clearKeyCache(): void {
  cachedPublicKey = null;
}

/**
 * Verify a JWT and extract the payload.
 * Stateless verification - no database access required.
 *
 * @param token - The JWT string to verify
 * @returns Verified payload or null if invalid
 */
export async function verifyTokenStateless(token: string): Promise<JWTPayload | null> {
  try {
    const publicKey = await getPublicKey();

    const result: JWTVerifyResult = await jwtVerify(token, publicKey, {
      issuer: AUTH_CONFIG.jwtIssuer,
      audience: [...AUTH_CONFIG.jwtAudience],
    });

    return result.payload as unknown as JWTPayload;
  } catch (error) {
    console.warn('[Satellite] JWT verification failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Decode a JWT without verification.
 * Useful for extracting claims for logging/debugging.
 * DO NOT use for authorization decisions.
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    return payload as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired without full verification.
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;

  const expirationTime = payload.exp * 1000;
  return Date.now() >= expirationTime;
}
