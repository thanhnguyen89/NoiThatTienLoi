# Phase 1 & 2: Database & TypeScript - COMPLETE ✅

## Phase 1: Database Schema ✅

### Đã hoàn thành:
1. ✅ Cập nhật Prisma schema với 28 fields mới
2. ✅ Tạo model `NewsPlatformImage`
3. ✅ Sync database với `prisma db push`
4. ✅ Database đã được cập nhật thành công

### Database Changes:

#### Model NewsContent - Added 28 fields:

**SEO Website (5 fields)**
```prisma
ogTitle                    String?   @db.VarChar(500)
ogDescription              String?   @db.VarChar(1000)
ogImage                    String?   @db.VarChar(1000)
robots                     String?   @default("index,follow") @db.VarChar(100)
isMobile                   Boolean?  @default(false)
```

**SEO Facebook (7 fields)**
```prisma
fbTitle                    String?   @db.VarChar(500)
fbDescription              String?   @db.VarChar(2000)
fbKeywords                 String?   @db.VarChar(1000)
fbHashtags                 String?   @db.VarChar(1000)
fbLocation                 String?   @db.VarChar(255)
fbImage                    String?   @db.VarChar(1000)
fbLinkPosted               String?   @db.VarChar(1000)
```

**SEO TikTok (7 fields)**
```prisma
ttTitle                    String?   @db.VarChar(500)
ttDescription              String?   @db.VarChar(2200)
ttKeywords                 String?   @db.VarChar(1000)
ttHashtags                 String?   @db.VarChar(1000)
ttLocation                 String?   @db.VarChar(255)
ttImage                    String?   @db.VarChar(1000)
ttLinkPosted               String?   @db.VarChar(1000)
```

**SEO YouTube (7 fields)**
```prisma
ytTitle                    String?   @db.VarChar(500)
ytDescription              String?   @db.VarChar(5000)
ytTags                     String?   @db.VarChar(2000)
ytHashtags                 String?   @db.VarChar(1000)
ytLocation                 String?   @db.VarChar(255)
ytImage                    String?   @db.VarChar(1000)
ytLinkPosted               String?   @db.VarChar(1000)
```

**Relations (1 field)**
```prisma
platformImages             NewsPlatformImage[]
```

#### New Model: NewsPlatformImage

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

---

## Phase 2: TypeScript Interfaces ✅

### Đã hoàn thành:
1. ✅ Cập nhật `NewsDetail` interface trong NewsForm.tsx
2. ✅ Thêm 28 fields mới vào interface

### Updated Interface:

```typescript
interface NewsDetail {
  // ... existing fields ...
  
  // SEO Website
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  robots: string | null;
  isMobile: boolean | null;
  
  // SEO Facebook
  fbTitle: string | null;
  fbDescription: string | null;
  fbKeywords: string | null;
  fbHashtags: string | null;
  fbLocation: string | null;
  fbImage: string | null;
  fbLinkPosted: string | null;
  
  // SEO TikTok
  ttTitle: string | null;
  ttDescription: string | null;
  ttKeywords: string | null;
  ttHashtags: string | null;
  ttLocation: string | null;
  ttImage: string | null;
  ttLinkPosted: string | null;
  
  // SEO YouTube
  ytTitle: string | null;
  ytDescription: string | null;
  ytTags: string | null;
  ytHashtags: string | null;
  ytLocation: string | null;
  ytImage: string | null;
  ytLinkPosted: string | null;
}
```

---

## Verification

### Check Database:
```sql
-- Check new columns in news_content
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'news_content' 
AND (
  column_name LIKE 'og%' OR 
  column_name LIKE 'fb%' OR 
  column_name LIKE 'tt%' OR 
  column_name LIKE 'yt%' OR
  column_name = 'robots' OR
  column_name = 'isMobile'
)
ORDER BY column_name;

-- Check new table
SELECT * FROM information_schema.tables 
WHERE table_name = 'news_platform_images';
```

### Expected Results:
- 28 new columns in `news_content` table
- 1 new table `news_platform_images`
- All columns nullable (String | null)
- Proper varchar lengths set

---

## Next Steps

### Phase 3: Backend Services (Next)
- [ ] Update news.service.ts
- [ ] Update news.repository.ts
- [ ] Add methods for platform images

### Phase 4: API Routes
- [ ] Update POST /admin/api/news
- [ ] Update PUT /admin/api/news/[id]
- [ ] Handle platform images upload

### Phase 5: Frontend UI (Biggest)
- [ ] Add tab system to NewsForm
- [ ] Create SEO Website tab
- [ ] Create Facebook tab with emojis, keywords, hashtags
- [ ] Create TikTok tab
- [ ] Create YouTube tab
- [ ] Add LocationPickerModal
- [ ] Add ImageCardGrid for each platform
- [ ] Add Google Search preview
- [ ] Add social media previews

---

## Files Modified

### Phase 1:
1. ✅ `prisma/schema.prisma` - Added 28 fields + 1 model
2. ✅ Database - Synced with `prisma db push`

### Phase 2:
1. ✅ `src/admin/features/news/NewsForm.tsx` - Updated NewsDetail interface

---

## Summary

✅ **Phase 1 & 2 Complete!**

- **Database**: 28 new columns + 1 new table
- **TypeScript**: Interface updated with all new fields
- **Status**: Ready for Phase 3 (Backend Services)

**Total Progress**: 20% complete (2/10 phases)

**Estimated remaining time**: 8-12 hours

