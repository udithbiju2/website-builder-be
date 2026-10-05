import type { NextFunction, Request, Response } from "express";
import { logger } from "../../config/logger.js";
import { redis } from "../../config/redis.js";
import { AppError } from "../errors/AppError.js";

type RateLimitOptions = {
  /** Unique name for the limited action, e.g. "signup". */
  name: string;
  max: number;
  windowSeconds: number;
};

/** Fixed-window limiter per client IP, backed by Redis. Fails open if Redis is unavailable. */
export function rateLimit({ name, max, windowSeconds }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `ratelimit:${name}:${req.ip ?? "unknown"}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      if (count > max) {
        const ttl = await redis.ttl(key);
        res.setHeader("Retry-After", String(Math.max(ttl, 1)));
        next(new AppError(429, "Too many requests. Please try again later.", "RATE_LIMITED"));
        return;
      }
    } catch (error) {
      logger.warn({ err: error, name }, "Rate limiter unavailable");
    }
    next();
  };
}
