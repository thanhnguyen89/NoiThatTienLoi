-- CreateTable
CREATE TABLE "facebook_comment_brands" (
    "id" TEXT NOT NULL,
    "postContent" TEXT NOT NULL,
    "facebookPostId" TEXT,
    "style" VARCHAR(50) NOT NULL DEFAULT 'friendly',
    "language" VARCHAR(50) NOT NULL DEFAULT 'Vietnamese',
    "count" INTEGER NOT NULL DEFAULT 5,
    "modelId" VARCHAR(100) NOT NULL DEFAULT 'gemini-flash',
    "comments" TEXT[],
    "brandSnapshot" JSONB,
    "userId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_comment_brands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facebook_comment_brands_createdAt_idx" ON "facebook_comment_brands"("createdAt");

-- CreateIndex
CREATE INDEX "facebook_comment_brands_facebookPostId_idx" ON "facebook_comment_brands"("facebookPostId");

-- CreateIndex
CREATE INDEX "facebook_comment_brands_userId_idx" ON "facebook_comment_brands"("userId");

-- CreateIndex
CREATE INDEX "facebook_comment_brands_style_idx" ON "facebook_comment_brands"("style");

-- AddForeignKey
ALTER TABLE "facebook_comment_brands" ADD CONSTRAINT "facebook_comment_brands_facebookPostId_fkey" FOREIGN KEY ("facebookPostId") REFERENCES "facebook_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
