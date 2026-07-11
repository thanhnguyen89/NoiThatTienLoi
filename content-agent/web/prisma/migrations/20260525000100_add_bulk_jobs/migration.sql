-- CreateEnum
CREATE TYPE "BulkJobStatus" AS ENUM ('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "bulk_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobType" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL,
    "brandConfig" JSONB,
    "keywords" TEXT[],
    "totalCount" INTEGER NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "status" "BulkJobStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "bulk_jobs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "articles"
ADD COLUMN "bulkJobId" TEXT,
ADD COLUMN "bulkIndex" INTEGER;

-- CreateIndex
CREATE INDEX "bulk_jobs_userId_idx" ON "bulk_jobs"("userId");

-- CreateIndex
CREATE INDEX "bulk_jobs_status_idx" ON "bulk_jobs"("status");

-- CreateIndex
CREATE INDEX "bulk_jobs_jobType_idx" ON "bulk_jobs"("jobType");

-- CreateIndex
CREATE INDEX "bulk_jobs_createdAt_idx" ON "bulk_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "articles_bulkJobId_idx" ON "articles"("bulkJobId");

-- CreateIndex
CREATE INDEX "articles_bulkIndex_idx" ON "articles"("bulkIndex");

-- AddForeignKey
ALTER TABLE "bulk_jobs" ADD CONSTRAINT "bulk_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_bulkJobId_fkey" FOREIGN KEY ("bulkJobId") REFERENCES "bulk_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
