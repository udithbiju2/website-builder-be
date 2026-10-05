-- AlterTable
ALTER TABLE "website_templates" ADD COLUMN     "clientId" UUID,
ADD COLUMN     "createdById" UUID,
ADD COLUMN     "themeSettings" JSONB;

-- CreateIndex
CREATE INDEX "website_templates_clientId_idx" ON "website_templates"("clientId");

-- AddForeignKey
ALTER TABLE "website_templates" ADD CONSTRAINT "website_templates_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_templates" ADD CONSTRAINT "website_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
