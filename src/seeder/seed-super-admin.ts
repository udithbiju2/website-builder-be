import { UserRole, UserStatus } from "../common/constants/roles.js";
import { hashPassword } from "../common/utils/hash.js";
import { env, isProduction } from "../config/env.js";
import { logger } from "../config/logger.js";
import { prisma } from "../config/prisma.js";

const DEFAULT_PASSWORD = "SuperAdmin@123";

/**
 * Creates the Super Admin from SEED_SUPER_ADMIN_* on first start.
 * An existing account is left untouched, so changing the env later never resets a password.
 */
export async function seedSuperAdmin(): Promise<void> {
  const email = env.SEED_SUPER_ADMIN_EMAIL;
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });

  if (existing) {
    if (existing.role !== UserRole.SUPER_ADMIN) {
      logger.warn({ email }, "SEED_SUPER_ADMIN_EMAIL belongs to a non-admin account; not seeding");
    } else {
      logger.debug({ email }, "Super admin already exists");
    }
    return;
  }

  if (isProduction && env.SEED_SUPER_ADMIN_PASSWORD === DEFAULT_PASSWORD) {
    logger.warn("Seeding the Super Admin with the default password in production. Change it immediately.");
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(env.SEED_SUPER_ADMIN_PASSWORD),
      fullName: env.SEED_SUPER_ADMIN_NAME,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });
  logger.info({ email }, "Seeded SUPER_ADMIN");
}
