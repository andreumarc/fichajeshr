-- Migration: add slug to companies for hub sync
ALTER TABLE "companies" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");
