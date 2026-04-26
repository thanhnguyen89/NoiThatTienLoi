# Phase 1: Database Migration Guide

## ✅ Đã hoàn thành

### 1. Prisma Schema Updates
- ✅ Thêm 28 fields mới vào model `NewsContent`
- ✅ Tạo model `NewsPlatformImage` mới
- ✅ Thêm relation giữa `NewsContent` và `NewsPlatformImage`

### 2. Migration SQL Script
- ✅ Tạo file migration SQL: `prisma/migrations/add_news_seo_fields/migration.sql`

## Các fields đã thêm

### SEO Website (5 fields)
```prisma
ogTitle                    String?   @db.VarChar(500)
ogDescription              String?   @db.VarChar(1000)
ogImage                    String?   @db.VarChar(1000)
robots                     String?   @default("index,follow") @db.VarChar(100)
isMobile                   Boolean?  @default(false)
```

### SEO Facebook (7 fields)
```prisma
fbTitle                    String?   @db.VarChar(500)
fbDescription              String?   @db.VarChar(2000)
fbKeywords                 String?   @db.VarChar(1000)
fbHashtags                 String?   @db.VarChar(1000)
fbLocation                 String?   @db.VarChar(255)
fbImage                    String?   @db.VarChar(1000)
fbLinkPosted               String?   @db.VarChar(1000)
```

### SEO TikTok (7 fields)
```prisma
ttTitle                    String?   @db.VarChar(500)
ttDescription              String?   @db.VarChar(2200)
ttKeywords                 String?   @db.VarChar(1000)
ttHashtags                 String?   @db.VarChar(1000)
ttLocation                 String?   @db.VarChar(255)
ttImage                    String?   @db.VarChar(1000)
ttLinkPosted               String?   @db.VarChar(1000)
```

### SEO YouTube (7 fields)
```prisma
ytTitle                    String?   @db.VarChar(500)
ytDescription              String?   @db.VarChar(5000)
ytTags                     String?   @db.VarChar(2000)
ytHashtags                 String?   @db.VarChar(1000)
ytLocation                 String?   @db.VarChar(255)
ytImage                    String?   @db.VarChar(1000)
ytLinkPosted               String?   @db.VarChar(1000)
```

### Platform Images (1 relation + 1 model)
```prisma
platformImages             NewsPlatformImage[]
```

## Model NewsPlatformImage

```prisma
model NewsPlatformImage {
  id        String       @id @default(cuid())
  newsId    String
  news      NewsContent  @relation(fields: [newsId], references: [id], onDelete: Cascade)
  
  platform  PlatformType // WEBSITE | FACEBOOK | TIKTOK | YOUTUBE
  
  imageUrl  String       @db.VarChar(1000)
  alt       String?      @db.VarChar(500)
  title     String?      @db.VarChar(500)
  caption   String?      @db.VarChar(1000)
  
  sortOrder Int          @default(0)
  isPrimary Boolean      @default(false)
  isActive  Boolean      @default(true)
  
  createdAt DateTime     @default(now())
  updatedAt DateTime?
  createdBy String?      @db.VarChar(100)
  updatedBy String?      @db.VarChar(100)
  isDeleted Boolean?     @default(false)
  deletedBy String?      @db.VarChar(100)
  deletedAt DateTime?    @db.Timestamp(6)
  
  @@index([newsId])
  @@index([platform])
  @@index([sortOrder])
  @@map("news_platform_images")
}
```

## Cách chạy migration

### Option 1: Prisma Migrate (Recommended)
```bash
# Generate Prisma Client với schema mới
npx prisma generate

# Tạo migration
npx prisma migrate dev --name add_news_seo_fields

# Hoặc nếu production
npx prisma migrate deploy
```

### Option 2: Manual SQL (Nếu cần)
```bash
# Kết nối database và chạy file SQL
psql -U your_username -d your_database -f prisma/migrations/add_news_seo_fields/migration.sql
```

### Option 3: Prisma Studio (Visual)
```bash
# Mở Prisma Studio
npx prisma studio

# Sau đó chạy migration từ terminal
npx prisma migrate dev
```

## Kiểm tra sau khi migrate

### 1. Verify schema
```bash
npx prisma validate
```

### 2. Check database
```sql
-- Kiểm tra columns mới
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'news_content' 
AND column_name LIKE 'og%' OR column_name LIKE 'fb%' OR column_name LIKE 'tt%' OR column_name LIKE 'yt%';

-- Kiểm tra table mới
SELECT * FROM information_schema.tables WHERE table_name = 'news_platform_images';
```

### 3. Test Prisma Client
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test query
const news = await prisma.newsContent.findFirst({
  include: {
    platformImages: true
  }
});

console.log(news);
```

## Rollback (Nếu cần)

### Prisma Migrate Rollback
```bash
# Rollback 1 migration
npx prisma migrate resolve --rolled-back add_news_seo_fields
```

### Manual Rollback SQL
```sql
-- Drop table
DROP TABLE IF EXISTS "news_platform_images";

-- Drop columns
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ogTitle";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ogDescription";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ogImage";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "robots";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "isMobile";

ALTER TABLE "news_content" DROP COLUMN IF EXISTS "fbTitle";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "fbDescription";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "fbKeywords";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "fbHashtags";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "fbLocation";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "fbImage";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "fbLinkPosted";

ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ttTitle";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ttDescription";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ttKeywords";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ttHashtags";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ttLocation";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ttImage";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ttLinkPosted";

ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ytTitle";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ytDescription";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ytTags";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ytHashtags";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ytLocation";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ytImage";
ALTER TABLE "news_content" DROP COLUMN IF EXISTS "ytLinkPosted";
```

## Troubleshooting

### Lỗi: "Column already exists"
```bash
# Bỏ qua lỗi và tiếp tục
# Migration script đã có IF NOT EXISTS
```

### Lỗi: "Foreign key constraint"
```bash
# Đảm bảo table news_content tồn tại
# Check cascade delete đã được set đúng
```

### Lỗi: "Enum PlatformType not found"
```bash
# Enum đã được định nghĩa trong schema
# Chạy: npx prisma generate
```

## Next Steps

✅ **Phase 1 Complete!**

Tiếp theo:
- [ ] Phase 2: Update TypeScript interfaces
- [ ] Phase 3: Update news.service.ts
- [ ] Phase 4: Update news.repository.ts
- [ ] Phase 5: Update API routes
- [ ] Phase 6: Update NewsForm.tsx UI

## Files Modified

1. ✅ `prisma/schema.prisma` - Added 28 fields + 1 model
2. ✅ `prisma/migrations/add_news_seo_fields/migration.sql` - Migration script

## Summary

- **Total new fields**: 28
- **New models**: 1 (NewsPlatformImage)
- **New relations**: 1 (NewsContent -> NewsPlatformImage)
- **Indexes added**: 3 (newsId, platform, sortOrder)
- **Estimated migration time**: 1-2 minutes

