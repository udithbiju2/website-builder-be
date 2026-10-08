-- CreateTable
CREATE TABLE "ai_config" (
    "id" VARCHAR(50) NOT NULL DEFAULT 'default',
    "openaiApiKeyCipher" TEXT,
    "model" VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_config_pkey" PRIMARY KEY ("id")
);
