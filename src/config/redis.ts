import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

/** All keys are namespaced with REDIS_KEY_PREFIX so this app can share a Redis instance. */
export const redis = new Redis(env.REDIS_URL, {
  keyPrefix: env.REDIS_KEY_PREFIX,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (error: Error) => {
  logger.error({ err: error }, "Redis client error");
});

export async function connectRedis(): Promise<void> {
  if (redis.status === "ready" || redis.status === "connecting") return;
  await redis.connect();
  logger.info("Redis connected");
}
