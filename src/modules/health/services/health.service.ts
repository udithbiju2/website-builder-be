import { prisma } from "../../../config/prisma.js";
import { redis } from "../../../config/redis.js";

type ServiceState = "up" | "down";

export type HealthReport = {
  status: "ok" | "degraded";
  database: ServiceState;
  redis: ServiceState;
  uptimeSeconds: number;
};

async function probe(check: () => Promise<unknown>): Promise<ServiceState> {
  try {
    await check();
    return "up";
  } catch {
    return "down";
  }
}

export class HealthService {
  async check(): Promise<HealthReport> {
    const [database, cache] = await Promise.all([
      probe(() => prisma.$queryRaw`SELECT 1`),
      probe(() => redis.ping()),
    ]);
    return {
      status: database === "up" && cache === "up" ? "ok" : "degraded",
      database,
      redis: cache,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}

export const healthService = new HealthService();
