-- CreateEnum
CREATE TYPE "BuilderType" AS ENUM ('MANUAL', 'AI');

-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "PageType" AS ENUM ('HOME', 'ABOUT', 'SERVICES', 'CONTACT', 'BLOG', 'LANDING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING_DNS', 'ACTIVE', 'FAILED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "canPublish" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "themes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "settings" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_templates" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "description" VARCHAR(500),
    "thumbnailUrl" VARCHAR(2048),
    "themeId" UUID,
    "header" JSONB NOT NULL,
    "footer" JSONB NOT NULL,
    "pages" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "website_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_templates" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "pageType" "PageType" NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "page_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_sections" (
    "id" UUID NOT NULL,
    "clientId" UUID,
    "name" VARCHAR(120) NOT NULL,
    "sectionType" VARCHAR(40) NOT NULL,
    "section" JSONB NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "saved_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "hostname" VARCHAR(253) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING_DNS',
    "verificationToken" VARCHAR(64) NOT NULL,
    "verifiedAt" TIMESTAMPTZ(6),
    "lastCheckedAt" TIMESTAMPTZ(6),
    "lastError" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_folders" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "websiteId" UUID,
    "name" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_files" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "websiteId" UUID,
    "folderId" UUID,
    "kind" "MediaKind" NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(127) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altText" VARCHAR(300),
    "storageKey" VARCHAR(512) NOT NULL,
    "uploadedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "pageType" "PageType" NOT NULL DEFAULT 'CUSTOM',
    "templateKey" VARCHAR(80),
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "showInNav" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" VARCHAR(160),
    "seoDescription" VARCHAR(320),
    "sections" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_versions" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'PENDING',
    "snapshot" JSONB NOT NULL,
    "errorMessage" VARCHAR(1000),
    "publishedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),

    CONSTRAINT "website_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "websites" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "builderType" "BuilderType" NOT NULL,
    "status" "WebsiteStatus" NOT NULL DEFAULT 'DRAFT',
    "subdomain" VARCHAR(63) NOT NULL,
    "businessName" VARCHAR(160),
    "websiteType" VARCHAR(80),
    "industry" VARCHAR(80),
    "description" VARCHAR(2000),
    "contactEmail" VARCHAR(255),
    "contactPhone" VARCHAR(32),
    "address" VARCHAR(500),
    "logoMediaId" UUID,
    "theme" JSONB NOT NULL,
    "header" JSONB NOT NULL,
    "footer" JSONB NOT NULL,
    "draftUpdatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liveVersionId" UUID,
    "publishedAt" TIMESTAMPTZ(6),
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "themes_name_key" ON "themes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "website_templates_key_key" ON "website_templates"("key");

-- CreateIndex
CREATE INDEX "website_templates_isActive_sortOrder_idx" ON "website_templates"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "page_templates_key_key" ON "page_templates"("key");

-- CreateIndex
CREATE INDEX "page_templates_pageType_isActive_idx" ON "page_templates"("pageType", "isActive");

-- CreateIndex
CREATE INDEX "saved_sections_clientId_sectionType_idx" ON "saved_sections"("clientId", "sectionType");

-- CreateIndex
CREATE UNIQUE INDEX "domains_hostname_key" ON "domains"("hostname");

-- CreateIndex
CREATE INDEX "domains_websiteId_idx" ON "domains"("websiteId");

-- CreateIndex
CREATE INDEX "domains_clientId_idx" ON "domains"("clientId");

-- CreateIndex
CREATE INDEX "domains_status_idx" ON "domains"("status");

-- CreateIndex
CREATE INDEX "media_folders_clientId_websiteId_idx" ON "media_folders"("clientId", "websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "media_files_storageKey_key" ON "media_files"("storageKey");

-- CreateIndex
CREATE INDEX "media_files_clientId_websiteId_createdAt_idx" ON "media_files"("clientId", "websiteId", "createdAt");

-- CreateIndex
CREATE INDEX "media_files_folderId_idx" ON "media_files"("folderId");

-- CreateIndex
CREATE INDEX "pages_websiteId_sortOrder_idx" ON "pages"("websiteId", "sortOrder");

-- CreateIndex
CREATE INDEX "pages_clientId_idx" ON "pages"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "pages_websiteId_slug_key" ON "pages"("websiteId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "website_versions_websiteId_version_key" ON "website_versions"("websiteId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "websites_subdomain_key" ON "websites"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "websites_liveVersionId_key" ON "websites"("liveVersionId");

-- CreateIndex
CREATE INDEX "websites_clientId_updatedAt_idx" ON "websites"("clientId", "updatedAt");

-- CreateIndex
CREATE INDEX "websites_status_idx" ON "websites"("status");

-- CreateIndex
CREATE UNIQUE INDEX "websites_id_clientId_key" ON "websites"("id", "clientId");

-- AddForeignKey
ALTER TABLE "website_templates" ADD CONSTRAINT "website_templates_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_sections" ADD CONSTRAINT "saved_sections_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_sections" ADD CONSTRAINT "saved_sections_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_websiteId_clientId_fkey" FOREIGN KEY ("websiteId", "clientId") REFERENCES "websites"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_versions" ADD CONSTRAINT "website_versions_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_versions" ADD CONSTRAINT "website_versions_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_logoMediaId_fkey" FOREIGN KEY ("logoMediaId") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_liveVersionId_fkey" FOREIGN KEY ("liveVersionId") REFERENCES "website_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
