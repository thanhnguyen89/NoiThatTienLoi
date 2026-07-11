-- CreateTable
CREATE TABLE "tiktok_posts" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "videoType" VARCHAR(50) NOT NULL DEFAULT 'product_demo',
    "hookStyle" VARCHAR(50) NOT NULL DEFAULT 'number',
    "ctaStyle" VARCHAR(50) NOT NULL DEFAULT 'inbox',
    "title" VARCHAR(80),
    "content" TEXT NOT NULL,
    "hashtags" TEXT,
    "language" VARCHAR(50) NOT NULL DEFAULT 'Vietnamese',
    "useEmoji" BOOLEAN NOT NULL DEFAULT true,
    "emojiLevel" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "wordCount" INTEGER,
    "charCount" INTEGER,
    "brandProfileId" TEXT,
    "brandName" VARCHAR(200),
    "modelId" VARCHAR(100),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiktok_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tiktok_posts_createdAt_idx" ON "tiktok_posts"("createdAt");

-- CreateIndex
CREATE INDEX "tiktok_posts_videoType_idx" ON "tiktok_posts"("videoType");

-- CreateIndex
CREATE INDEX "tiktok_posts_hookStyle_idx" ON "tiktok_posts"("hookStyle");

-- CreateIndex
CREATE INDEX "tiktok_posts_brandProfileId_idx" ON "tiktok_posts"("brandProfileId");

-- CreateIndex
CREATE INDEX "tiktok_posts_userId_idx" ON "tiktok_posts"("userId");

-- AddForeignKey
ALTER TABLE "tiktok_posts" ADD CONSTRAINT "tiktok_posts_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "brand_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
