# 📚 Phase 3 - Quick Reference Guide

## 🎯 28 Fields Mới - Cheat Sheet

### 1. Author Info (3)
```typescript
authorId: string | null          // User ID của tác giả
authorEmail: string | null       // Email tác giả (max 255)
authorAvatar: string | null      // URL avatar
```

### 2. Content Metadata (6)
```typescript
tags: string | null              // JSON array: ["tag1", "tag2"]
categoryName: string | null      // Tên category (max 255)
categorySlug: string | null      // Slug category (max 255)
readingTime: number | null       // Thời gian đọc (phút), BigInt trong DB
contentFormat: string | null     // Format: "markdown", "html", etc (max 50)
revisionNumber: number | null    // Số revision, BigInt trong DB
```

### 3. Media Assets (7)
```typescript
featuredImage: string | null           // URL ảnh featured
featuredImageAlt: string | null        // Alt text (max 255)
featuredImageCaption: string | null    // Caption
galleryImages: string | null           // JSON array: ["img1.jpg", "img2.jpg"]
videoUrl: string | null                // URL video (YouTube, Vimeo, etc)
videoThumbnail: string | null          // URL thumbnail video
audioUrl: string | null                // URL audio file
```

### 4. Relationships (2)
```typescript
relatedNewsIds: string | null    // JSON array: ["news-1", "news-2"]
externalUrl: string | null       // URL external link
```

### 5. Behavior Flags (6)
```typescript
isExternalLink: boolean | null   // Default: false
openInNewTab: boolean | null     // Default: false
isFeatured: boolean | null       // Default: false - Tin nổi bật
isBreakingNews: boolean | null   // Default: false - Tin khẩn
isPinned: boolean | null         // Default: false - Ghim lên đầu
```

### 6. Scheduling (2)
```typescript
expiryDate: Date | string | null           // Ngày hết hạn
scheduledPublishDate: Date | string | null // Ngày publish theo lịch
```

### 7. Customization (3)
```typescript
customCss: string | null         // Custom CSS cho bài viết
customJs: string | null          // Custom JavaScript
jsonData: string | null          // JSON object: {"key": "value"}
```

### 8. Audit (1)
```typescript
lastModifiedBy: string | null    // User ID người sửa cuối
```

## 🔧 Usage Examples

### Create News với Fields Mới
```typescript
const newsData = {
  title: "Breaking News",
  content: "Content here...",
  
  // Author
  authorId: "user-123",
  authorEmail: "author@example.com",
  authorAvatar: "/avatars/author.jpg",
  
  // Metadata
  tags: '["javascript", "typescript"]',
  categoryName: "Technology",
  categorySlug: "technology",
  readingTime: 5,
  contentFormat: "markdown",
  
  // Media
  featuredImage: "/images/featured.jpg",
  featuredImageAlt: "Featured image",
  galleryImages: '["img1.jpg", "img2.jpg"]',
  videoUrl: "https://youtube.com/watch?v=xxx",
  
  // Flags
  isFeatured: true,
  isBreakingNews: true,
  isPinned: false,
  
  // Schedule
  scheduledPublishDate: "2026-05-01T00:00:00Z",
  expiryDate: "2026-12-31T23:59:59Z",
};

const result = await newsService.createNews(newsData, userId);
```

### Update News
```typescript
const updates = {
  readingTime: 10,
  isFeatured: false,
  tags: '["updated", "tags"]',
  revisionNumber: 2,
};

const result = await newsService.updateNews(newsId, updates, userId);
```

### Query News với Fields Mới
```typescript
const news = await newsService.getNewsById(newsId);

// Access new fields
console.log(news.authorEmail);
console.log(news.readingTime);
console.log(news.isFeatured);
console.log(JSON.parse(news.tags || '[]'));
```

## 📊 Data Type Conversions

### BigInt Fields (trong DB)
```typescript
// Input (number) → DB (BigInt) → Output (number)
readingTime: 5        → BigInt(5)      → 5
revisionNumber: 1     → BigInt(1)      → 1
```

### Date Fields
```typescript
// Input (string) → DB (DateTime) → Output (Date)
"2026-05-01T00:00:00Z" → DateTime → Date object
```

### JSON Fields (stored as string)
```typescript
// Input (string) → DB (String) → Output (string)
'["tag1", "tag2"]'     → String → '["tag1", "tag2"]'

// Parse when needed
const tags = JSON.parse(news.tags || '[]');
```

## ✅ Validation Rules

| Field | Type | Constraints |
|-------|------|-------------|
| `authorEmail` | string | max 255 chars |
| `categoryName` | string | max 255 chars |
| `categorySlug` | string | max 255 chars |
| `featuredImageAlt` | string | max 255 chars |
| `contentFormat` | string | max 50 chars |
| `readingTime` | number | min 0 |
| `revisionNumber` | number | min 0 |
| `isFeatured` | boolean | default: false |
| `isBreakingNews` | boolean | default: false |
| `isPinned` | boolean | default: false |
| `isExternalLink` | boolean | default: false |
| `openInNewTab` | boolean | default: false |

## 🎨 Frontend Display Examples

### Show Featured Badge
```tsx
{news.isFeatured && <Badge>Featured</Badge>}
{news.isBreakingNews && <Badge variant="danger">Breaking</Badge>}
{news.isPinned && <Badge variant="info">Pinned</Badge>}
```

### Display Reading Time
```tsx
<span>{news.readingTime} min read</span>
```

### Show Author Info
```tsx
<div className="author">
  <img src={news.authorAvatar} alt={news.authorEmail} />
  <span>{news.authorEmail}</span>
</div>
```

### Display Tags
```tsx
{JSON.parse(news.tags || '[]').map(tag => (
  <Tag key={tag}>{tag}</Tag>
))}
```

### Show Gallery
```tsx
{JSON.parse(news.galleryImages || '[]').map(img => (
  <img key={img} src={img} alt="" />
))}
```

### Video Embed
```tsx
{news.videoUrl && (
  <iframe src={news.videoUrl} />
)}
```

## 🔍 Common Queries

### Get Featured News
```typescript
const featured = await prisma.newsContent.findMany({
  where: { isFeatured: true, isPublished: true }
});
```

### Get Breaking News
```typescript
const breaking = await prisma.newsContent.findMany({
  where: { isBreakingNews: true, isPublished: true }
});
```

### Get Pinned News
```typescript
const pinned = await prisma.newsContent.findMany({
  where: { isPinned: true, isPublished: true },
  orderBy: { sortOrder: 'asc' }
});
```

### Get News by Tag
```typescript
const newsByTag = await prisma.newsContent.findMany({
  where: { 
    tags: { contains: '"javascript"' },
    isPublished: true 
  }
});
```

### Get Scheduled News
```typescript
const scheduled = await prisma.newsContent.findMany({
  where: {
    scheduledPublishDate: { gte: new Date() },
    isPublished: false
  }
});
```

## 🚨 Common Pitfalls

### ❌ Don't
```typescript
// Don't parse JSON in loop
news.forEach(n => {
  const tags = JSON.parse(n.tags); // Slow!
});

// Don't forget BigInt conversion
readingTime: data.readingTime // Wrong! Need BigInt()
```

### ✅ Do
```typescript
// Parse JSON once
const tags = JSON.parse(news.tags || '[]');

// Use proper BigInt conversion
readingTime: data.readingTime != null ? BigInt(data.readingTime) : null
```

## 📝 Notes

- JSON fields được lưu dưới dạng string, cần parse khi sử dụng
- BigInt fields tự động convert qua repository layer
- Date fields tự động convert qua repository layer
- Boolean fields có default values
- Validation tự động qua Zod schema

## 🔗 Related Files

- Validator: `src/server/validators/news.validator.ts`
- Repository: `src/server/repositories/news.repository.ts`
- Service: `src/server/services/news.service.ts`
- Types: `src/admin/features/news/NewsForm.tsx` (NewsDetail interface)
- API: `src/app/admin/api/news/`

## 🎉 Ready for Phase 4!

Backend đã sẵn sàng, giờ là lúc build UI! 🚀
