import { getRedisClient } from "./redis-client";
import { rateLimit as inMemoryRateLimit, getClientIp } from "./rate-limit";

export { getClientIp };

/**
 * Redis-backed sliding-window rate limiter using sorted sets.
 * Falls back to in-memory limiter if Redis is unavailable.
 *
 * @returns `true` if the request is allowed, `false` if rate-limited.
 */
export async function rateLimit(
  key: string,
  { maxRequests, windowMs }: { maxRequests: number; windowMs: number }
): Promise<boolean> {
  const redis = getRedisClient();

  if (!redis) {
    return inMemoryRateLimit(key, { maxRequests, windowMs });
  }

  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `rl:${key}:${windowMs}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
    pipeline.zcard(redisKey);
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000) + 10);

    const results = await pipeline.exec();
    if (!results) return true;

    const count = results[2][1] as number;
    if (count > maxRequests) {
      // Remove the entry we just added — request is rejected
      await redis.zpopmax(redisKey);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[rate-limit-redis] Redis error, falling back:", err);
    return inMemoryRateLimit(key, { maxRequests, windowMs });
  }
}
