import "dotenv/config";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requiredSecret(name: string, minLength = 32): string {
  const value = required(name);
  if (value.length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters`);
  }
  return value;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "true" || raw === "1";
}

function sameSite(raw: string | undefined): "lax" | "strict" | "none" {
  const value = raw?.trim().toLowerCase();
  if (value === "strict" || value === "none") return value;
  return "lax";
}

const NODE_ENV = process.env.NODE_ENV ?? "development";
const isProd = NODE_ENV === "production";

export const env = {
  NODE_ENV,
  PORT: Number(process.env.PORT ?? 3000),
  LOG_LEVEL: process.env.LOG_LEVEL,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  FRONTEND_URL: (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, ""),
  /** Express "trust proxy" setting, needed behind nginx/a load balancer so req.ip is the client IP. */
  TRUST_PROXY: bool("TRUST_PROXY", false),

  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  REDIS_KEY_PREFIX: process.env.REDIS_KEY_PREFIX ?? "webbuilder:",

  JWT_ACCESS_SECRET: requiredSecret("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: requiredSecret("JWT_REFRESH_SECRET"),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",

  COOKIE_SECURE: bool("COOKIE_SECURE", isProd),
  COOKIE_SAMESITE: sameSite(process.env.COOKIE_SAMESITE),
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN?.trim() || undefined,

  /** Encrypts secrets stored in the database (e.g. the Resend API key). */
  APP_ENCRYPTION_KEY: requiredSecret("APP_ENCRYPTION_KEY"),

  SEED_SUPER_ADMIN_EMAIL: required("SEED_SUPER_ADMIN_EMAIL").toLowerCase(),
  SEED_SUPER_ADMIN_PASSWORD: required("SEED_SUPER_ADMIN_PASSWORD"),
  SEED_SUPER_ADMIN_NAME: process.env.SEED_SUPER_ADMIN_NAME?.trim() || "Super Admin",
};

export const isProduction = isProd;
