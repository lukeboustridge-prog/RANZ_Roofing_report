/**
 * Simple in-memory cache for API responses
 * In production, replace with Redis for multi-instance support
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

// Default TTL values in seconds
export const CACHE_TTL = {
  SHORT: 30,      // 30 seconds - for frequently changing data
  MEDIUM: 300,    // 5 minutes - for moderately stable data
  LONG: 3600,     // 1 hour - for stable data
  DAY: 86400,     // 24 hours - for static data
} as const;

/**
 * Get a cached value
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set a cached value
 */
export function setCached<T>(key: string, data: T, ttlSeconds: number = CACHE_TTL.MEDIUM): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Invalidate a cached value
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cached values matching a pattern
 */
export function invalidateCachePattern(pattern: string): void {
  const regex = new RegExp(pattern);
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cached values
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get or set cached value with automatic fetching
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<T> {
  const cached = getCached<T>(key);

  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  setCached(key, data, ttlSeconds);
  return data;
}

/**
 * Cache key generators for consistent key naming
 */
export const cacheKeys = {
  report: (id: string) => `report:${id}`,
  reportsList: (userId: string, page: number) => `reports:${userId}:${page}`,
  userReports: (userId: string) => `user-reports:${userId}`,
  templates: () => `templates:all`,
  template: (id: string) => `template:${id}`,
  analytics: (period: string) => `analytics:${period}`,
  auditLogs: (page: number, reportId?: string) =>
    reportId ? `audit:${reportId}:${page}` : `audit:all:${page}`,
} as const;

/**
 * Stale-while-revalidate pattern
 * Returns cached data immediately and revalidates in background
 */
export async function staleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<T> {
  const cached = getCached<T>(key);

  // Start background revalidation
  const revalidate = async () => {
    try {
      const fresh = await fetcher();
      setCached(key, fresh, ttlSeconds);
    } catch (error) {
      console.error(`Cache revalidation failed for key: ${key}`, error);
    }
  };

  if (cached !== null) {
    // Return stale data immediately, revalidate in background
    revalidate();
    return cached;
  }

  // No cached data, must wait for fresh data
  const data = await fetcher();
  setCached(key, data, ttlSeconds);
  return data;
}

// Cleanup expired entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) {
        cache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
