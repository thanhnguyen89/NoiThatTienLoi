-- CreateEnum
CREATE TYPE "FBPostStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'WRITING', 'WRITTEN', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AIConfigType" AS ENUM ('FORBIDDEN_WORDS', 'CLICHE_OPENINGS');

-- CreateEnum
CREATE TYPE "SocialPlatformType" AS ENUM ('FACEBOOK_PAGE', 'TIKTOK', 'ZALO_OA', 'INSTAGRAM', 'YOUTUBE', 'THREADS');

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(255),
    "avatar" VARCHAR(500),
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" VARCHAR(50),
    "action" VARCHAR(50) NOT NULL,
    "resource" VARCHAR(100),
    "resourceId" TEXT,
    "description" TEXT,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "keyword" VARCHAR(500) NOT NULL,
    "language" VARCHAR(20) NOT NULL,
    "contentType" VARCHAR(50) NOT NULL,
    "targetLength" INTEGER NOT NULL,
    "aiProvider" VARCHAR(50) NOT NULL,
    "brandConfig" JSONB,
    "competitorUrls" TEXT[],
    "competitorAnalysis" TEXT,
    "outline" JSONB NOT NULL,
    "selectedTitle" VARCHAR(500) NOT NULL,
    "userNotes" TEXT,
    "secondaryKeywords" TEXT[],
    "htmlContent" TEXT NOT NULL,
    "plainText" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "metaDescription" VARCHAR(500),
    "slug" VARCHAR(200),
    "seoScore" INTEGER,
    "seoChecks" JSONB,
    "humannessScore" INTEGER,
    "scoreBreakdown" JSONB,
    "aiDecision" VARCHAR(20),
    "featuredImage" VARCHAR(1000),
    "wordpressPostId" INTEGER,
    "wordpressUrl" VARCHAR(1000),
    "wordpressStatus" VARCHAR(20),
    "publishedAt" TIMESTAMP(3),
    "isBoosted" BOOLEAN NOT NULL DEFAULT false,
    "boostedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_versions" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "metaDescription" VARCHAR(500),
    "slug" VARCHAR(200),
    "wordCount" INTEGER NOT NULL,
    "seoScore" INTEGER,
    "humannessScore" INTEGER,
    "savedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_configs" (
    "id" TEXT NOT NULL,
    "type" "AIConfigType" NOT NULL,
    "items" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "modelId" VARCHAR(100) NOT NULL,
    "apiKey" VARCHAR(500),
    "baseUrl" VARCHAR(500),
    "icon" VARCHAR(100),
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_configs" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "companyName" VARCHAR(300),
    "hotline" VARCHAR(100),
    "hotlineComplaint" VARCHAR(100),
    "branchCount" INTEGER,
    "branchListUrl" VARCHAR(500),
    "supportInfo" TEXT,
    "apiUrl" VARCHAR(500) NOT NULL,
    "apiKey" VARCHAR(500),
    "apiSecret" VARCHAR(500),
    "username" VARCHAR(200),
    "appPassword" VARCHAR(500),
    "defaultCategory" INTEGER,
    "defaultAuthorId" INTEGER,
    "defaultStatus" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_platforms" (
    "id" TEXT NOT NULL,
    "type" "SocialPlatformType" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "pageId" VARCHAR(200),
    "pageUrl" VARCHAR(500),
    "accessToken" TEXT,
    "accessTokenExpiry" TIMESTAMP(3),
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_posts" (
    "id" TEXT NOT NULL,
    "keyword" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "shopName" VARCHAR(200),
    "industry" VARCHAR(100),
    "tone" VARCHAR(50) NOT NULL,
    "template" VARCHAR(100),
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "emojiCount" INTEGER NOT NULL DEFAULT 0,
    "status" "FBPostStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_code_key" ON "admin_roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_roleId_idx" ON "admin_users"("roleId");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_resource_idx" ON "activity_logs"("resource");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "articles_runId_key" ON "articles"("runId");

-- CreateIndex
CREATE INDEX "articles_userId_idx" ON "articles"("userId");

-- CreateIndex
CREATE INDEX "articles_status_idx" ON "articles"("status");

-- CreateIndex
CREATE INDEX "articles_keyword_idx" ON "articles"("keyword");

-- CreateIndex
CREATE INDEX "articles_createdAt_idx" ON "articles"("createdAt");

-- CreateIndex
CREATE INDEX "articles_runId_idx" ON "articles"("runId");

-- CreateIndex
CREATE INDEX "articles_isBoosted_idx" ON "articles"("isBoosted");

-- CreateIndex
CREATE INDEX "articles_deletedAt_idx" ON "articles"("deletedAt");

-- CreateIndex
CREATE INDEX "article_versions_articleId_idx" ON "article_versions"("articleId");

-- CreateIndex
CREATE INDEX "article_versions_createdAt_idx" ON "article_versions"("createdAt");

-- CreateIndex
CREATE INDEX "ai_configs_type_idx" ON "ai_configs"("type");

-- CreateIndex
CREATE INDEX "ai_configs_isActive_idx" ON "ai_configs"("isActive");

-- CreateIndex
CREATE INDEX "ai_models_provider_idx" ON "ai_models"("provider");

-- CreateIndex
CREATE INDEX "ai_models_isActive_idx" ON "ai_models"("isActive");

-- CreateIndex
CREATE INDEX "ai_models_isDefault_idx" ON "ai_models"("isDefault");

-- CreateIndex
CREATE INDEX "website_configs_isActive_idx" ON "website_configs"("isActive");

-- CreateIndex
CREATE INDEX "website_configs_isDefault_idx" ON "website_configs"("isDefault");

-- CreateIndex
CREATE INDEX "social_platforms_type_idx" ON "social_platforms"("type");

-- CreateIndex
CREATE INDEX "social_platforms_isActive_idx" ON "social_platforms"("isActive");

-- CreateIndex
CREATE INDEX "facebook_posts_status_idx" ON "facebook_posts"("status");

-- CreateIndex
CREATE INDEX "facebook_posts_tone_idx" ON "facebook_posts"("tone");

-- CreateIndex
CREATE INDEX "facebook_posts_createdAt_idx" ON "facebook_posts"("createdAt");

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "admin_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_savedBy_fkey" FOREIGN KEY ("savedBy") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
