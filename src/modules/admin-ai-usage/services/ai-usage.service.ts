import { prisma } from "../../../config/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import type {
  AiUsageListQuery,
  AiUsageListResult,
  AiUsageTotals,
  ClientAiUsageSummary,
} from "../types/ai-usage.types.js";

export async function ensureAiUsageTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
        "id" UUID NOT NULL,
        "clientId" UUID NOT NULL,
        "websiteId" UUID,
        "userId" UUID,
        "model" VARCHAR(100) NOT NULL,
        "scope" VARCHAR(50) NOT NULL,
        "promptTokens" INTEGER NOT NULL DEFAULT 0,
        "completionTokens" INTEGER NOT NULL DEFAULT 0,
        "totalTokens" INTEGER NOT NULL DEFAULT 0,
        "durationMs" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "ai_usage_logs_clientId_createdAt_idx" ON "ai_usage_logs"("clientId", "createdAt");
    CREATE INDEX IF NOT EXISTS "ai_usage_logs_createdAt_idx" ON "ai_usage_logs"("createdAt");
  `);
}

export class AiUsageService {
  async list(query: AiUsageListQuery): Promise<AiUsageListResult> {
    const now = new Date();
    const selectedYear = query.year ? Number(query.year) : now.getFullYear();
    const selectedMonth =
      query.month !== undefined && query.month !== null && String(query.month) !== ""
        ? Number(query.month)
        : null;

    let startDate: Date;
    let endDate: Date;

    if (selectedMonth !== null) {
      startDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0, 0));
    } else {
      startDate = new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(selectedYear + 1, 0, 1, 0, 0, 0, 0));
    }

    const search = query.search?.trim();
    const searchCondition = search
      ? Prisma.sql`AND (
          c."businessName" ILIKE ${`%${search}%`}
          OR co."ownerEmail" ILIKE ${`%${search}%`}
          OR co."ownerFullName" ILIKE ${`%${search}%`}
        )`
      : Prisma.empty;

    let orderSql: Prisma.Sql;
    const isAsc = query.sortOrder === "asc";

    switch (query.sortBy) {
      case "estimatedCost":
        orderSql = isAsc
          ? Prisma.sql`"estimatedCost" ASC, "totalTokens" ASC, "businessName" ASC`
          : Prisma.sql`"estimatedCost" DESC, "totalTokens" DESC, "businessName" ASC`;
        break;
      case "totalRequests":
        orderSql = isAsc
          ? Prisma.sql`"totalRequests" ASC, "businessName" ASC`
          : Prisma.sql`"totalRequests" DESC, "businessName" ASC`;
        break;
      case "businessName":
        orderSql = isAsc
          ? Prisma.sql`"businessName" ASC`
          : Prisma.sql`"businessName" DESC`;
        break;
      case "lastUsedAt":
        orderSql = isAsc
          ? Prisma.sql`"lastUsedAt" ASC NULLS FIRST, "totalTokens" ASC`
          : Prisma.sql`"lastUsedAt" DESC NULLS LAST, "totalTokens" DESC`;
        break;
      case "totalTokens":
      default:
        orderSql = isAsc
          ? Prisma.sql`"totalTokens" ASC, "totalRequests" ASC, "businessName" ASC`
          : Prisma.sql`"totalTokens" DESC, "totalRequests" DESC, "businessName" ASC`;
        break;
    }

    const offset = (query.page - 1) * query.pageSize;
    const limit = query.pageSize;

    const mainCte = Prisma.sql`
      WITH usage_agg AS (
        SELECT
          l."clientId",
          COUNT(l.id)::int AS "totalRequests",
          COALESCE(SUM(l."promptTokens"), 0)::int AS "promptTokens",
          COALESCE(SUM(l."completionTokens"), 0)::int AS "completionTokens",
          COALESCE(SUM(l."totalTokens"), 0)::int AS "totalTokens",
          COALESCE(SUM(
            CASE 
              WHEN l.model ILIKE '%gpt-4o-mini%' THEN (l."promptTokens" * 0.00000015 + l."completionTokens" * 0.0000006)
              WHEN l.model ILIKE '%gpt-4o%' THEN (l."promptTokens" * 0.0000025 + l."completionTokens" * 0.00001)
              WHEN l.model ILIKE '%gpt-4%' THEN (l."promptTokens" * 0.00001 + l."completionTokens" * 0.00003)
              ELSE (l."promptTokens" * 0.00000015 + l."completionTokens" * 0.0000006)
            END
          ), 0)::float AS "estimatedCost",
          MAX(l."createdAt") AS "lastUsedAt",
          MODE() WITHIN GROUP (ORDER BY l.model) AS "topModel"
        FROM "ai_usage_logs" l
        WHERE l."createdAt" >= ${startDate} AND l."createdAt" < ${endDate}
        GROUP BY l."clientId"
      ),
      client_owners AS (
        SELECT DISTINCT ON (u."clientId")
          u."clientId",
          u.id AS "ownerId",
          u."fullName" AS "ownerFullName",
          u.email AS "ownerEmail"
        FROM users u
        WHERE u.role = 'CLIENT'
        ORDER BY u."clientId", u."createdAt" ASC
      ),
      matched_clients AS (
        SELECT
          c.id AS "clientId",
          c."businessName",
          co."ownerId",
          co."ownerFullName",
          co."ownerEmail",
          COALESCE(ua."totalRequests", 0)::int AS "totalRequests",
          COALESCE(ua."promptTokens", 0)::int AS "promptTokens",
          COALESCE(ua."completionTokens", 0)::int AS "completionTokens",
          COALESCE(ua."totalTokens", 0)::int AS "totalTokens",
          COALESCE(ua."estimatedCost", 0)::float AS "estimatedCost",
          ua."lastUsedAt",
          ua."topModel"
        FROM clients c
        LEFT JOIN client_owners co ON co."clientId" = c.id
        LEFT JOIN usage_agg ua ON ua."clientId" = c.id
        WHERE 1=1
        ${searchCondition}
      )
    `;

    const [rows, countAndSummary] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          clientId: string;
          businessName: string;
          ownerId: string | null;
          ownerFullName: string | null;
          ownerEmail: string | null;
          totalRequests: number;
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
          estimatedCost: number;
          lastUsedAt: Date | null;
          topModel: string | null;
        }>
      >(Prisma.sql`
        ${mainCte}
        SELECT * FROM matched_clients
        ORDER BY ${orderSql}
        LIMIT ${limit} OFFSET ${offset}
      `),
      prisma.$queryRaw<
        Array<{
          totalClients: number | bigint;
          totalRequests: number | bigint;
          promptTokens: number | bigint;
          completionTokens: number | bigint;
          totalTokens: number | bigint;
          totalEstimatedCost: number;
          activeClientsCount: number | bigint;
        }>
      >(Prisma.sql`
        ${mainCte}
        SELECT
          COUNT(*)::bigint AS "totalClients",
          COALESCE(SUM("totalRequests"), 0)::bigint AS "totalRequests",
          COALESCE(SUM("promptTokens"), 0)::bigint AS "promptTokens",
          COALESCE(SUM("completionTokens"), 0)::bigint AS "completionTokens",
          COALESCE(SUM("totalTokens"), 0)::bigint AS "totalTokens",
          COALESCE(SUM("estimatedCost"), 0)::float AS "totalEstimatedCost",
          COUNT(CASE WHEN "totalRequests" > 0 THEN 1 END)::bigint AS "activeClientsCount"
        FROM matched_clients
      `),
    ]);

    const summaryRow = countAndSummary[0];
    const total = Number(summaryRow?.totalClients ?? 0);
    const summary: AiUsageTotals = {
      totalRequests: Number(summaryRow?.totalRequests ?? 0),
      promptTokens: Number(summaryRow?.promptTokens ?? 0),
      completionTokens: Number(summaryRow?.completionTokens ?? 0),
      totalTokens: Number(summaryRow?.totalTokens ?? 0),
      totalEstimatedCost: Number(summaryRow?.totalEstimatedCost ?? 0),
      activeClientsCount: Number(summaryRow?.activeClientsCount ?? 0),
    };

    const items: ClientAiUsageSummary[] = rows.map((r) => ({
      clientId: r.clientId,
      businessName: r.businessName,
      owner: r.ownerId
        ? {
            id: r.ownerId,
            fullName: r.ownerFullName || "",
            email: r.ownerEmail || "",
          }
        : null,
      totalRequests: Number(r.totalRequests || 0),
      promptTokens: Number(r.promptTokens || 0),
      completionTokens: Number(r.completionTokens || 0),
      totalTokens: Number(r.totalTokens || 0),
      estimatedCost: Number(r.estimatedCost || 0),
      topModel: r.topModel || null,
      lastUsedAt: r.lastUsedAt ? new Date(r.lastUsedAt).toISOString() : null,
    }));

    return {
      items,
      summary,
      total,
      page: query.page,
      pageSize: query.pageSize,
      selectedMonth,
      selectedYear,
    };
  }
}

export const aiUsageService = new AiUsageService();
