import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const sql = `
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_logs_clientId_fkey'
    ) THEN
        ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_clientId_fkey" 
        FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_logs_websiteId_fkey'
    ) THEN
        ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_websiteId_fkey" 
        FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_logs_userId_fkey'
    ) THEN
        ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
`;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  console.log("Connected to PostgreSQL");
  await client.query(sql);
  console.log("ai_usage_logs table and indexes verified/created successfully.");
  await client.end();
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
