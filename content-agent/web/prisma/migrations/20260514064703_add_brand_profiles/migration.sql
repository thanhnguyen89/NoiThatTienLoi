-- CreateTable
CREATE TABLE "brand_profiles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "shopName" VARCHAR(200) NOT NULL,
    "industry" VARCHAR(100),
    "brandPronouns" VARCHAR(100),
    "brandAudience" VARCHAR(300),
    "brandToneNotes" TEXT,
    "phone" VARCHAR(50),
    "address" VARCHAR(300),
    "brandDesc" TEXT,
    "brandForbidden" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_profiles_isDefault_idx" ON "brand_profiles"("isDefault");

-- CreateIndex
CREATE INDEX "brand_profiles_isActive_idx" ON "brand_profiles"("isActive");
