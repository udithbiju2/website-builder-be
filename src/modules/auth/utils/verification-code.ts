import { randomInt, timingSafeEqual } from "node:crypto";
import { sha256 } from "../../../common/utils/hash.js";
import { redis } from "../../../config/redis.js";

export const VERIFICATION_CODE_TTL_SECONDS = 10 * 60;
export const RESEND_COOLDOWN_SECONDS = 45;
const MAX_ATTEMPTS = 5;

const codeKey = (userId: string) => `auth:verify:code:${userId}`;
const attemptsKey = (userId: string) => `auth:verify:attempts:${userId}`;
const cooldownKey = (userId: string) => `auth:verify:cooldown:${userId}`;

export function generateVerificationCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

/** Seconds left before another code may be sent; 0 when allowed. */
export async function getResendCooldownSeconds(userId: string): Promise<number> {
  const ttl = await redis.ttl(cooldownKey(userId));
  return ttl > 0 ? ttl : 0;
}

/** Stores only a hash of the code; replaces any previous code and resets attempts. */
export async function storeVerificationCode(userId: string, code: string): Promise<void> {
  await redis
    .multi()
    .set(codeKey(userId), sha256(code), "EX", VERIFICATION_CODE_TTL_SECONDS)
    .del(attemptsKey(userId))
    .set(cooldownKey(userId), "1", "EX", RESEND_COOLDOWN_SECONDS)
    .exec();
}

export type VerifyCodeResult = "valid" | "invalid" | "expired" | "too_many_attempts";

export async function checkVerificationCode(userId: string, code: string): Promise<VerifyCodeResult> {
  const storedHash = await redis.get(codeKey(userId));
  if (!storedHash) return "expired";

  const attempts = await redis.incr(attemptsKey(userId));
  if (attempts === 1) {
    await redis.expire(attemptsKey(userId), VERIFICATION_CODE_TTL_SECONDS);
  }
  if (attempts > MAX_ATTEMPTS) {
    await clearVerificationCode(userId);
    return "too_many_attempts";
  }

  const matches = timingSafeEqual(Buffer.from(storedHash), Buffer.from(sha256(code.trim())));
  if (!matches) return "invalid";

  await clearVerificationCode(userId);
  return "valid";
}

export async function clearVerificationCode(userId: string): Promise<void> {
  await redis.del(codeKey(userId), attemptsKey(userId));
}
