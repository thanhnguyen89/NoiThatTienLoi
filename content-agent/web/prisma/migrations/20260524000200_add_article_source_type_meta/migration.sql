ALTER TABLE "articles"
ADD COLUMN "sourceType" VARCHAR(50),
ADD COLUMN "meta" JSONB;

CREATE INDEX "articles_sourceType_idx" ON "articles"("sourceType");
