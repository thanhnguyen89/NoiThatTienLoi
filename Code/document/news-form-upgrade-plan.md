# News Form Upgrade Plan

## Mục tiêu
Nâng cấp NewsForm để có đầy đủ tính năng như NewsCategoryForm

## Các tính năng cần thêm

### 1. Tab System ✅
- [ ] Tab "Thông tin cơ bản" (Basic Info)
- [ ] Tab "SEO Website" 
- [ ] Tab "Facebook"
- [ ] Tab "TikTok"
- [ ] Tab "YouTube"

### 2. SEO Website Tab
- [ ] Meta Title (60 chars)
- [ ] Meta Description (160 chars)
- [ ] Meta Keywords với 20 keywords mẫu
- [ ] Google Search Result Preview
- [ ] OG Title, OG Description, OG Image
- [ ] SEO Canonical, Robots, Noindex
- [ ] ImageCardGrid cho multiple images

### 3. Facebook Tab
- [ ] Link bài đã đăng
- [ ] Title, Description
- [ ] 50+ Emojis picker (scrollable)
- [ ] 20 Keywords mẫu
- [ ] 20 Hashtags mẫu
- [ ] Location picker với dropdown + map
- [ ] Facebook Post Preview (compact)
- [ ] Copy to Clipboard button
- [ ] ImageCardGrid

### 4. TikTok Tab
- [ ] Link bài đã đăng
- [ ] Title (150 chars), Description (2200 chars)
- [ ] 50+ Emojis picker
- [ ] 20 Keywords mẫu
- [ ] 20 Hashtags mẫu (#fyp, #xuhuong, #viral, #tiktoknoithat)
- [ ] Location picker
- [ ] TikTok Preview (9:16 video style, compact)
- [ ] Copy button
- [ ] ImageCardGrid

### 5. YouTube Tab
- [ ] Link video đã đăng
- [ ] Title (100 chars), Description (5000 chars)
- [ ] 20 Tags mẫu (màu đỏ)
- [ ] 20 Hashtags mẫu
- [ ] Location picker
- [ ] YouTube Preview (16:9 thumbnail, compact)
- [ ] Copy button
- [ ] ImageCardGrid

### 6. Components cần import
```typescript
import { ImageCardGrid } from '@/admin/components/ImageCardGrid';
import { LocationPickerModal } from '@/admin/components/LocationPickerModal';
import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
import { RichTextEditor } from '@/admin/components/RichTextEditor';
```

### 7. State Management

#### Basic Info State (giữ nguyên)
```typescript
const [form, setForm] = useState({
  title, summary, content, image, seName,
  isPublished, isShowHome, isActive, isNew,
  allowComments, newTag, sortOrder,
  authorName, publishedAt,
  viewCount, commentCount, likeCount
});
```

#### SEO Website State (mới)
```typescript
const [webSeo, setWebSeo] = useState({
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  seoCanonical: '',
  robots: '',
  seoNoindex: false,
  slugRedirect: '',
  isRedirect: false,
  isMobile: false
});

const [webImages, setWebImages] = useState<ImageItem[]>([]);
```

#### Facebook State (mới)
```typescript
const [fbSeo, setFbSeo] = useState({
  linkPosted: '',
  title: '',
  description: '',
  keywords: '',
  hashtags: '',
  location: '',
  image: ''
});

const [fbImages, setFbImages] = useState<ImageItem[]>([]);
```

#### TikTok State (mới)
```typescript
const [ttSeo, setTtSeo] = useState({
  linkPosted: '',
  title: '',
  description: '',
  keywords: '',
  hashtags: '',
  location: '',
  image: ''
});

const [ttImages, setTtImages] = useState<ImageItem[]>([]);
```

#### YouTube State (mới)
```typescript
const [ytSeo, setYtSeo] = useState({
  linkPosted: '',
  title: '',
  description: '',
  tags: '',
  hashtags: '',
  location: '',
  image: ''
});

const [ytImages, setYtImages] = useState<ImageItem[]>([]);
```

### 8. API Payload Structure

Cần cập nhật `buildPayload()` để bao gồm tất cả SEO data:

```typescript
function buildPayload() {
  return {
    // Basic info (existing)
    title, summary, content, image, seName,
    isPublished, isShowHome, isActive, isNew,
    allowComments, newTag, sortOrder,
    authorName, publishedAt,
    viewCount, commentCount, likeCount,
    
    // SEO Website (new)
    metaTitle: webSeo.metaTitle?.trim() || null,
    metaDescription: webSeo.metaDescription?.trim() || null,
    metaKeywords: webSeo.metaKeywords?.trim() || null,
    ogTitle: webSeo.ogTitle?.trim() || null,
    ogDescription: webSeo.ogDescription?.trim() || null,
    ogImage: webSeo.ogImage?.trim() || null,
    seoCanonical: webSeo.seoCanonical?.trim() || null,
    robots: webSeo.robots?.trim() || null,
    seoNoindex: webSeo.seoNoindex,
    slugRedirect: webSeo.slugRedirect?.trim() || null,
    isRedirect: webSeo.isRedirect,
    isMobile: webSeo.isMobile,
    
    // Facebook SEO (new)
    fbTitle: fbSeo.title?.trim() || null,
    fbDescription: fbSeo.description?.trim() || null,
    fbKeywords: fbSeo.keywords?.trim() || null,
    fbHashtags: fbSeo.hashtags?.trim() || null,
    fbLocation: fbSeo.location?.trim() || null,
    fbImage: fbSeo.image?.trim() || null,
    fbLinkPosted: fbSeo.linkPosted?.trim() || null,
    
    // TikTok SEO (new)
    ttTitle: ttSeo.title?.trim() || null,
    ttDescription: ttSeo.description?.trim() || null,
    ttKeywords: ttSeo.keywords?.trim() || null,
    ttHashtags: ttSeo.hashtags?.trim() || null,
    ttLocation: ttSeo.location?.trim() || null,
    ttImage: ttSeo.image?.trim() || null,
    ttLinkPosted: ttSeo.linkPosted?.trim() || null,
    
    // YouTube SEO (new)
    ytTitle: ytSeo.title?.trim() || null,
    ytDescription: ytSeo.description?.trim() || null,
    ytTags: ytSeo.tags?.trim() || null,
    ytHashtags: ytSeo.hashtags?.trim() || null,
    ytLocation: ytSeo.location?.trim() || null,
    ytImage: ytSeo.image?.trim() || null,
    ytLinkPosted: ytSeo.linkPosted?.trim() || null,
    
    // Images (new)
    webImages: webImages.map(img => ({
      url: img.url,
      alt: img.alt,
      isPrimary: img.isPrimary
    })),
    fbImages: fbImages.map(img => ({
      url: img.url,
      alt: img.alt,
      isPrimary: img.isPrimary
    })),
    ttImages: ttImages.map(img => ({
      url: img.url,
      alt: img.alt,
      isPrimary: img.isPrimary
    })),
    ytImages: ytImages.map(img => ({
      url: img.url,
      alt: img.alt,
      isPrimary: img.isPrimary
    }))
  };
}
```

### 9. Database Schema Changes

Cần thêm các columns vào bảng `News`:

```sql
-- SEO Website
ALTER TABLE News ADD COLUMN ogTitle VARCHAR(255);
ALTER TABLE News ADD COLUMN ogDescription TEXT;
ALTER TABLE News ADD COLUMN ogImage VARCHAR(500);
ALTER TABLE News ADD COLUMN robots VARCHAR(100);
ALTER TABLE News ADD COLUMN isMobile BOOLEAN DEFAULT FALSE;

-- Facebook SEO
ALTER TABLE News ADD COLUMN fbTitle VARCHAR(255);
ALTER TABLE News ADD COLUMN fbDescription TEXT;
ALTER TABLE News ADD COLUMN fbKeywords TEXT;
ALTER TABLE News ADD COLUMN fbHashtags TEXT;
ALTER TABLE News ADD COLUMN fbLocation VARCHAR(255);
ALTER TABLE News ADD COLUMN fbImage VARCHAR(500);
ALTER TABLE News ADD COLUMN fbLinkPosted VARCHAR(500);

-- TikTok SEO
ALTER TABLE News ADD COLUMN ttTitle VARCHAR(255);
ALTER TABLE News ADD COLUMN ttDescription TEXT;
ALTER TABLE News ADD COLUMN ttKeywords TEXT;
ALTER TABLE News ADD COLUMN ttHashtags TEXT;
ALTER TABLE News ADD COLUMN ttLocation VARCHAR(255);
ALTER TABLE News ADD COLUMN ttImage VARCHAR(500);
ALTER TABLE News ADD COLUMN ttLinkPosted VARCHAR(500);

-- YouTube SEO
ALTER TABLE News ADD COLUMN ytTitle VARCHAR(255);
ALTER TABLE News ADD COLUMN ytDescription TEXT;
ALTER TABLE News ADD COLUMN ytTags TEXT;
ALTER TABLE News ADD COLUMN ytHashtags TEXT;
ALTER TABLE News ADD COLUMN ytLocation VARCHAR(255);
ALTER TABLE News ADD COLUMN ytImage VARCHAR(500);
ALTER TABLE News ADD COLUMN ytLinkPosted VARCHAR(500);

-- Images table (if not exists)
CREATE TABLE NewsImages (
  id VARCHAR(36) PRIMARY KEY,
  newsId VARCHAR(36) NOT NULL,
  platform VARCHAR(20) NOT NULL, -- 'WEBSITE', 'FACEBOOK', 'TIKTOK', 'YOUTUBE'
  url VARCHAR(500) NOT NULL,
  alt VARCHAR(255),
  isPrimary BOOLEAN DEFAULT FALSE,
  sortOrder INT DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (newsId) REFERENCES News(id) ON DELETE CASCADE
);
```

### 10. Implementation Steps

#### Phase 1: Setup (1-2 hours)
1. ✅ Create upgrade plan document
2. [ ] Update database schema
3. [ ] Update News model/interface
4. [ ] Update news.service.ts
5. [ ] Update news API routes

#### Phase 2: UI Components (3-4 hours)
1. [ ] Add tab system to NewsForm
2. [ ] Move existing fields to "Thông tin cơ bản" tab
3. [ ] Create SEO Website tab with Google preview
4. [ ] Add ImageCardGrid to all tabs

#### Phase 3: Social Media Tabs (4-5 hours)
1. [ ] Create Facebook tab with all features
2. [ ] Create TikTok tab with all features
3. [ ] Create YouTube tab with all features
4. [ ] Add LocationPickerModal integration

#### Phase 4: Testing & Polish (2-3 hours)
1. [ ] Test create new news
2. [ ] Test edit existing news
3. [ ] Test all previews
4. [ ] Test image uploads
5. [ ] Test location picker
6. [ ] Fix any bugs

**Total estimated time: 10-14 hours**

### 11. Files to modify

1. `src/admin/features/news/NewsForm.tsx` - Main form component
2. `src/server/services/news.service.ts` - Service layer
3. `src/server/repositories/news.repository.ts` - Database layer
4. `src/app/admin/api/news/route.ts` - API create
5. `src/app/admin/api/news/[id]/route.ts` - API update
6. `prisma/schema.prisma` - Database schema (if using Prisma)

### 12. Copy from NewsCategoryForm

Các sections cần copy:
- Lines 1-30: Imports and types
- Lines 31-50: Tab system
- Lines 100-200: State management
- Lines 300-400: Handler functions
- Lines 500-600: SEO Website tab
- Lines 700-900: Facebook tab with emojis, keywords, hashtags
- Lines 1100-1300: TikTok tab
- Lines 1500-1700: YouTube tab
- LocationPickerModal integration

### 13. Differences from NewsCategoryForm

NewsForm có thêm:
- `content` field (RichTextEditor) - bài viết dài
- `summary` field - tóm tắt
- `authorName` - tác giả
- `publishedAt` - ngày xuất bản
- `viewCount`, `commentCount`, `likeCount` - metrics
- `allowComments` - cho phép bình luận
- `isNew`, `newTag` - đánh dấu mới

NewsCategoryForm có thêm:
- `parentId` - danh mục cha (News không cần)
- Simpler structure (category vs full article)

## Kết luận

Đây là một upgrade lớn, cần:
1. Database migration
2. API updates
3. UI complete rewrite
4. Extensive testing

Nên thực hiện từng phase một, test kỹ trước khi deploy production.

