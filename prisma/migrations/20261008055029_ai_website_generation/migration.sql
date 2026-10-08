-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "website_generations" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL,
    "step" VARCHAR(120),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" VARCHAR(500),
    "requestedById" UUID,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "website_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "website_generations_websiteId_key" ON "website_generations"("websiteId");

-- CreateIndex
CREATE INDEX "website_generations_status_createdAt_idx" ON "website_generations"("status", "createdAt");

-- CreateIndex
CREATE INDEX "website_generations_clientId_status_idx" ON "website_generations"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "website_generations_websiteId_clientId_key" ON "website_generations"("websiteId", "clientId");

-- AddForeignKey
ALTER TABLE "website_generations" ADD CONSTRAINT "website_generations_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_generations" ADD CONSTRAINT "website_generations_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
