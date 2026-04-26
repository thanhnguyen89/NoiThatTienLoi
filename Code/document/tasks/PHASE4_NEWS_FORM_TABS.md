# 🎨 Phase 4: News Form với Tabs SEO

## 📋 Yêu Cầu

Chỉnh trang `admin/news/new` để có tabs SEO giống `admin/news-categories/new`:
- Tab 1: Thông tin cơ bản
- Tab 2: SEO Website  
- Tab 3: SEO Facebook
- Tab 4: SEO TikTok
- Tab 5: SEO YouTube

## 🔧 Implementation Plan

### 1. Cấu Trúc Tabs

```typescript
type TabId = 'basic' | 'seo-web' | 'seo-fb' | 'seo-tt' | 'seo-yt';

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Thông tin cơ bản' },
  { id: 'seo-web', label: 'SEO Website' },
  { id: 'seo-fb', label: 'Facebook' },
  { id: 'seo-tt', label: 'TikTok' },
  { id: 'seo-yt', label: 'YouTube' },
];
```

### 2. Tab Content

#### Tab 1: Thông tin cơ bản
- Tiêu đề *
- Slug (seName) * với auto-generate
- Tóm tắt
- Nội dung (Rich Text Editor)
- Hình ảnh chính
- Category
- Trạng thái (isPublished, isShowHome, isActive, isNew)
- Thứ tự sắp xếp
- Tác giả (authorName, authorEmail)
- Tags
- Featured flags (isFeatured, isBreakingNews, isPinned)

#### Tab 2: SEO Website
- Meta Title
- Meta Description
- Meta Keywords
- OG Title
- OG Description
- OG Image
- Robots
- Canonical URL
- Slug Redirect
- isRedirect checkbox
- seoNoindex checkbox

#### Tab 3: SEO Facebook
- FB Title
- FB Description
- FB Keywords
- FB Hashtags
- FB Image
- FB Link Posted

#### Tab 4: SEO TikTok
- TT Title
- TT Description
- TT Keywords
- TT Hashtags
- TT Image
- TT Link Posted

#### Tab 5: SEO YouTube
- YT Title
- YT Description
- YT Tags
- YT Hashtags
- YT Image
- YT Link Posted

### 3. State Management

```typescript
const [activeTab, setActiveTab] = useState<TabId>('basic');
const [form, setForm] = useState({ /* basic fields */ });
const [webSeo, setWebSeo] = useState({ /* web seo fields */ });
const [fbSeo, setFbSeo] = useState({ /* fb seo fields */ });
const [ttSeo, setTtSeo] = useState({ /* tt seo fields */ });
const [ytSeo, setYtSeo] = useState({ /* yt seo fields */ });
```

### 4. Submit Handler

```typescript
async function submit(ev: React.FormEvent) {
  ev.preventDefault();
  
  const payload = {
    // Basic fields
    ...form,
    
    // SEO Website
    metaTitle: webSeo.metaTitle,
    metaDescription: webSeo.metaDescription,
    ogTitle: webSeo.ogTitle,
    ogDescription: webSeo.ogDescription,
    ogImage: webSeo.ogImage,
    robots: webSeo.robots,
    seoCanonical: webSeo.seoCanonical,
    seoNoindex: webSeo.seoNoindex,
    
    // SEO Facebook
    fbTitle: fbSeo.title,
    fbDescription: fbSeo.description,
    fbKeywords: fbSeo.keywords,
    fbHashtags: fbSeo.hashtags,
    fbImage: fbSeo.image,
    fbLinkPosted: fbSeo.linkPosted,
    
    // SEO TikTok
    ttTitle: ttSeo.title,
    ttDescription: ttSeo.description,
    ttKeywords: ttSeo.keywords,
    ttHashtags: ttSeo.hashtags,
    ttImage: ttSeo.image,
    ttLinkPosted: ttSeo.linkPosted,
    
    // SEO YouTube
    ytTitle: ytSeo.title,
    ytDescription: ytSeo.description,
    ytTags: ytSeo.tags,
    ytHashtags: ytSeo.hashtags,
    ytImage: ytSeo.image,
    ytLinkPosted: ytSeo.linkPosted,
  };
  
  // API call...
}
```

## 📝 Files to Update

1. `src/admin/features/news/NewsForm.tsx` - Main form component
2. Keep existing components:
   - `SingleImageUploader`
   - `RichTextEditor`
   - `ImageManagerModal` (if needed)

## 🎯 Features to Add

### Basic Tab
- ✅ Auto-generate slug from title
- ✅ Rich text editor for content
- ✅ Image uploader
- ✅ Category selector
- ✅ Status checkboxes
- ✅ Author fields
- ✅ Tags input
- ✅ Featured flags

### SEO Tabs
- ✅ Separate state for each platform
- ✅ Platform-specific fields
- ✅ Image pickers for OG images
- ✅ Link posted fields
- ✅ Hashtags and keywords

## 🚀 Next Steps

1. Backup current NewsForm.tsx
2. Create new NewsForm with tabs
3. Test create new news
4. Test edit existing news
5. Verify all fields save correctly

## 📊 Comparison

| Feature | Current | New (with Tabs) |
|---------|---------|-----------------|
| Layout | Single page | Tabbed interface |
| SEO Fields | Mixed in | Organized by platform |
| User Experience | Scrolling | Tab navigation |
| Maintainability | Hard to find fields | Easy to locate |

## ✅ Benefits

- 🎨 Better UX - organized by platform
- 📱 Easier to manage SEO for each platform
- 🔍 Easier to find specific fields
- 🎯 Consistent with news-categories UI
- ✨ Professional admin interface

---

**Ready to implement!** 🚀

Bạn muốn tôi tạo file NewsForm mới với tabs không?
