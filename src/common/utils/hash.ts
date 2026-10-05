import { createHash } from "node:crypto";
import bcrypt from "bcrypt";

const ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/** For high-entropy random tokens (refresh tokens, reset tokens); not for passwords. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
