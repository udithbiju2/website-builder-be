import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../../config/env.js";

const VERSION = "v1";

function key(): Buffer {
  return createHash("sha256").update(`secret-box:${env.APP_ENCRYPTION_KEY}`).digest();
}

/** AES-256-GCM; output is `v1:<iv>:<tag>:<ciphertext>` in base64url. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(":");
}

/** Returns null when the payload is malformed or was encrypted with a different key. */
export function decryptSecret(payload: string): string | null {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== VERSION || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}
