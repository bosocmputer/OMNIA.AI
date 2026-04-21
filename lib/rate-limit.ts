/**
 * Simple in-memory sliding-window rate limiter.
 * Each key (e.g. IP) gets a list of timestamps; requests exceeding
 * the window are rejected.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 120_000);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 300_000);

/**
 * Check whether a request should be rate-limited.
 * @returns `true` if the request is allowed, `false` if it should be rejected.
 */
export function rateLimit(
  key: string,
  { maxRequests, windowMs }: { maxRequests: number; windowMs: number }
): boolean {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }
  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
  if (entry.timestamps.length >= maxRequests) {
    return false; // rate limited
  }
  entry.timestamps.push(now);
  return true; // allowed
}

/**
 * Get a client identifier from a NextRequest.
 * Uses x-forwarded-for, x-real-ip, or falls back to "anonymous".
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "anonymous"
  );
}
