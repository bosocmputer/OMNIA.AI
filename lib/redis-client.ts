import Redis from "ioredis";

let client: Redis | null = null;
let connectionFailed = false;

export function getRedisClient(): Redis | null {
  if (connectionFailed) return null;
  if (client) return client;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });

    client.on("error", (err) => {
      console.warn("[redis] connection error:", err.message);
      connectionFailed = true;
      client = null;
    });

    return client;
  } catch (err) {
    console.warn("[redis] failed to initialize:", err);
    connectionFailed = false;
    return null;
  }
}
