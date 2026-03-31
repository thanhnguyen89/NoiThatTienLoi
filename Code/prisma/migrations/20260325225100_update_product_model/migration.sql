/*
  Warnings:

  - You are about to drop the column `name` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `comparePrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `costPrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `metaDescription` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `metaTitle` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `products` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `slug` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(300)`.
  - You are about to alter the column `sku` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `brand` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - A unique constraint covering the columns `[sku]` on the table `product_variants` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,productSizeId,productColorId]` on the table `product_variants` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productColorId` to the `product_variants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productSizeId` to the `product_variants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `product_variants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isThumbnail" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "name",
DROP COLUMN "price",
DROP COLUMN "stock",
DROP COLUMN "value",
ADD COLUMN     "barcode" VARCHAR(100),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "productColorId" TEXT NOT NULL,
ADD COLUMN     "productSizeId" TEXT NOT NULL,
ADD COLUMN     "promoPrice" DECIMAL(15,2),
ADD COLUMN     "purchasePrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "reservedQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "salePrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sku" VARCHAR(100),
ADD COLUMN     "stockQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "weightKg" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "products" DROP COLUMN "comparePrice",
DROP COLUMN "costPrice",
DROP COLUMN "metaDescription",
DROP COLUMN "metaTitle",
DROP COLUMN "price",
ADD COLUMN     "banner" VARCHAR(1000),
ADD COLUMN     "canonicalUrl" VARCHAR(1000),
ADD COLUMN     "code" VARCHAR(100),
ADD COLUMN     "icon" VARCHAR(1000),
ADD COLUMN     "image" VARCHAR(1000),
ADD COLUMN     "isShowHome" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ogDescription" VARCHAR(1000),
ADD COLUMN     "ogImage" VARCHAR(1000),
ADD COLUMN     "ogTitle" VARCHAR(500),
ADD COLUMN     "origin" VARCHAR(200),
ADD COLUMN     "robots" VARCHAR(100) DEFAULT 'index,follow',
ADD COLUMN     "seoDescription" VARCHAR(1000),
ADD COLUMN     "seoTitle" VARCHAR(500),
ADD COLUMN     "shortDescription" VARCHAR(2000),
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unit" VARCHAR(50),
ADD COLUMN     "warrantyMonths" INTEGER,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "slug" SET DATA TYPE VARCHAR(300),
ALTER COLUMN "sku" DROP NOT NULL,
ALTER COLUMN "sku" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "brand" SET DATA TYPE VARCHAR(200);

-- CreateTable
CREATE TABLE "product_sizes" (
    "id" TEXT NOT NULL,
    "sizeLabel" VARCHAR(100) NOT NULL,
    "widthCm" DECIMAL(10,2),
    "lengthCm" DECIMAL(10,2),
    "heightCm" DECIMAL(10,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_colors" (
    "id" TEXT NOT NULL,
    "colorName" VARCHAR(100) NOT NULL,
    "colorCode" VARCHAR(20),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "mediaType" VARCHAR(20) NOT NULL,
    "mediaUrl" VARCHAR(1000) NOT NULL,
    "altText" VARCHAR(255),
    "title" VARCHAR(255),
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "fileSizeKb" INTEGER,
    "mimeType" VARCHAR(100),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isThumbnail" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_seo_platforms" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "title" VARCHAR(500),
    "description" VARCHAR(5000),
    "contentCate" TEXT,
    "keywords" VARCHAR(2000),
    "hashtags" VARCHAR(2000),
    "tags" VARCHAR(2000),
    "linkPosted" VARCHAR(1000),
    "slug" VARCHAR(500),
    "canonicalUrl" VARCHAR(1000),
    "robots" VARCHAR(255),
    "isNoindex" BOOLEAN NOT NULL DEFAULT false,
    "isNofollow" BOOLEAN NOT NULL DEFAULT false,
    "ogTitle" VARCHAR(500),
    "ogDescription" VARCHAR(2000),
    "ogImage" VARCHAR(1000),
    "schemaJson" JSONB,
    "extraMetaJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_seo_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_platform_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "imageUrl" VARCHAR(1000) NOT NULL,
    "alt" VARCHAR(500),
    "title" VARCHAR(500),
    "caption" VARCHAR(1000),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_platform_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_seo_media" (
    "id" TEXT NOT NULL,
    "productSeoPlatformId" TEXT NOT NULL,
    "mediaType" VARCHAR(20) NOT NULL,
    "mediaUrl" VARCHAR(1000) NOT NULL,
    "altText" VARCHAR(255),
    "title" VARCHAR(255),
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_seo_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_sizes_sizeLabel_key" ON "product_sizes"("sizeLabel");

-- CreateIndex
CREATE INDEX "product_sizes_sortOrder_idx" ON "product_sizes"("sortOrder");

-- CreateIndex
CREATE INDEX "product_sizes_isActive_idx" ON "product_sizes"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "product_colors_colorName_key" ON "product_colors"("colorName");

-- CreateIndex
CREATE INDEX "product_colors_sortOrder_idx" ON "product_colors"("sortOrder");

-- CreateIndex
CREATE INDEX "product_colors_isActive_idx" ON "product_colors"("isActive");

-- CreateIndex
CREATE INDEX "product_media_productId_idx" ON "product_media"("productId");

-- CreateIndex
CREATE INDEX "product_media_productVariantId_idx" ON "product_media"("productVariantId");

-- CreateIndex
CREATE INDEX "product_media_sortOrder_idx" ON "product_media"("sortOrder");

-- CreateIndex
CREATE INDEX "product_seo_platforms_platform_idx" ON "product_seo_platforms"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "product_seo_platforms_productId_platform_key" ON "product_seo_platforms"("productId", "platform");

-- CreateIndex
CREATE INDEX "product_platform_images_productId_idx" ON "product_platform_images"("productId");

-- CreateIndex
CREATE INDEX "product_platform_images_platform_idx" ON "product_platform_images"("platform");

-- CreateIndex
CREATE INDEX "product_platform_images_sortOrder_idx" ON "product_platform_images"("sortOrder");

-- CreateIndex
CREATE INDEX "product_seo_media_productSeoPlatformId_idx" ON "product_seo_media"("productSeoPlatformId");

-- CreateIndex
CREATE INDEX "product_seo_media_sortOrder_idx" ON "product_seo_media"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_productSizeId_idx" ON "product_variants"("productSizeId");

-- CreateIndex
CREATE INDEX "product_variants_productColorId_idx" ON "product_variants"("productColorId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_productId_productSizeId_productColorId_key" ON "product_variants"("productId", "productSizeId", "productColorId");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_code_idx" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_sortOrder_idx" ON "products"("sortOrder");

-- CreateIndex
CREATE INDEX "products_isActive_isShowHome_idx" ON "products"("isActive", "isShowHome");

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productSizeId_fkey" FOREIGN KEY ("productSizeId") REFERENCES "product_sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productColorId_fkey" FOREIGN KEY ("productColorId") REFERENCES "product_colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_seo_platforms" ADD CONSTRAINT "product_seo_platforms_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_platform_images" ADD CONSTRAINT "product_platform_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_seo_media" ADD CONSTRAINT "product_seo_media_productSeoPlatformId_fkey" FOREIGN KEY ("productSeoPlatformId") REFERENCES "product_seo_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
