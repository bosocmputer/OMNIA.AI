import { NextResponse } from "next/server";

export async function GET() {
  const result: Record<string, string> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    db: "disabled",
    redis: "disabled",
  };

  if (process.env.DATABASE_URL) {
    try {
      const { db } = await import("@/lib/db");
      await db.$queryRaw`SELECT 1`;
      result.db = "ok";
    } catch (err) {
      result.db = "error";
      result.status = "degraded";
    }
  }

  if (process.env.REDIS_URL) {
    try {
      const { getRedisClient } = await import("@/lib/redis-client");
      const redis = getRedisClient();
      if (redis) {
        await redis.ping();
        result.redis = "ok";
      } else {
        result.redis = "unavailable";
      }
    } catch {
      result.redis = "error";
    }
  }

  return NextResponse.json(result);
}
