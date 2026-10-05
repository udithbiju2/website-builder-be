import { randomBytes } from "node:crypto";
import { sha256 } from "../../../common/utils/hash.js";
import { redis } from "../../../config/redis.js";

export const RESET_TOKEN_TTL_SECONDS = 60 * 60;
/** Invites for admin-created clients use the same single-use token with a longer lifetime. */
export const INVITE_TOKEN_TTL_SECONDS = 72 * 60 * 60;

const tokenKey = (tokenHash: string) => `auth:reset:token:${tokenHash}`;
const userKey = (userId: string) => `auth:reset:user:${userId}`;

/** Creates a single-use token; any previous reset link for the user stops working. */
export async function createPasswordResetToken(
  userId: string,
  ttlSeconds: number = RESET_TOKEN_TTL_SECONDS,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);

  const previousHash = await redis.get(userKey(userId));
  const tx = redis.multi();
  if (previousHash) tx.del(tokenKey(previousHash));
  tx.set(tokenKey(tokenHash), userId, "EX", ttlSeconds);
  tx.set(userKey(userId), tokenHash, "EX", ttlSeconds);
  await tx.exec();

  return token;
}

/** Invalidates the user's outstanding reset/invite link, if any. */
export async function revokePasswordResetToken(userId: string): Promise<void> {
  const tokenHash = await redis.getdel(userKey(userId));
  if (tokenHash) await redis.del(tokenKey(tokenHash));
}

export async function getPasswordResetUserId(token: string): Promise<string | null> {
  return redis.get(tokenKey(sha256(token)));
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const tokenHash = sha256(token);
  const userId = await redis.getdel(tokenKey(tokenHash));
  if (userId) {
    await redis.del(userKey(userId));
  }
  return userId;
}
