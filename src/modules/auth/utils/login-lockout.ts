import { redis } from "../../../config/redis.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_SECONDS = 15 * 60;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;

const attemptsKey = (email: string) => `auth:login:attempts:${email}`;
const lockKey = (email: string) => `auth:login:lock:${email}`;

export type LoginLockStatus = { locked: false } | { locked: true; lockedUntil: Date };

export async function getLoginLockStatus(email: string): Promise<LoginLockStatus> {
  const ttl = await redis.ttl(lockKey(email));
  return ttl > 0 ? { locked: true, lockedUntil: new Date(Date.now() + ttl * 1000) } : { locked: false };
}

export async function recordFailedLoginAttempt(email: string): Promise<LoginLockStatus> {
  const attempts = await redis.incr(attemptsKey(email));
  if (attempts === 1) {
    await redis.expire(attemptsKey(email), ATTEMPT_WINDOW_SECONDS);
  }
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    await redis.multi().set(lockKey(email), "1", "EX", LOCK_SECONDS).del(attemptsKey(email)).exec();
    return { locked: true, lockedUntil: new Date(Date.now() + LOCK_SECONDS * 1000) };
  }
  return { locked: false };
}

export async function clearLoginLockout(email: string): Promise<void> {
  await redis.del(attemptsKey(email), lockKey(email));
}
