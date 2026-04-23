# NewsCategoryForm Refactor Summary

## ✅ COMPLETED CHANGES

### 1. Updated ImageItem Interface
```typescript
interface ImageItem {
  id?: string;
  url: string;
  name: string;
  alt: string;
  order: number;
  isPrimary: boolean;
  isVisible: boolean;
}
```

### 2. Added ImageCardGrid Component
- Copied from CategoryForm.tsx
- Displays images in grid layout (col-6 col-md-4 col-lg-3)
- Features: edit alt text, set primary, delete
- Integrates with ImageManagerModal for multi-select

### 3. Added PlatformSeoCard Component
- Copied from CategoryForm.tsx
- Handles SEO fields + ImageCardGrid for each platform
- Supports WEBSITE, FACEBOOK, TIKTOK, YOUTUBE

### 4. Updated State Initialization
- Changed to use Record<string, string> for SEO states
- Removed separate icon/banner fields from SEO states
- Initialized empty ImageItem[] arrays for each platform

### 5. Removed Old Handler Functions
- Removed handleWebSeo, handleFbSeo, handleTtSeo, handleYtSeo
- SEO fields now handled by PlatformSeoCard internally

### 6. Updated Submit Function
- Changed to use webSeo.seoTitle instead of webSeo.metaTitle
- Changed to use fbSeo.ogImage instead of fbSeo.image
- Removed references to icon/banner in SEO states

## ⚠️ REMAINING WORK

### Need to Replace SEO Tabs Rendering (Lines ~660-1205)

**Current (WRONG):**
- Each SEO tab has separate card with manual fields
- Has Icon/Banner upload sections in SEO tabs
- Uses MultipleImageUploader component
- Has extra fields like isRedirect, isMobile in Website tab

**Should Be (CORRECT - like CategoryForm.tsx):**
```typescript
{/* === SEO WEBSITE === */}
{activeTab === 'seo-web' && (
  <PlatformSeoCard
    platform="WEBSITE"
    platformLabel="Website"
    badgeLabel="WEBSITE"
    seo={webSeo}
    onSeoChange={setWebSeo}
    images={webImages}
    platformLabel2="Website"
    uploadDesc="Người dùng có thể tải lên không giới hạn số lượng ảnh cho Website."
    onImagesChange={setWebImages}
  />
)}

{/* === FACEBOOK === */}
{activeTab === 'seo-fb' && (
  <PlatformSeoCard
    platform="FACEBOOK"
    platformLabel="Facebook"
    badgeLabel="FACEBOOK"
    seo={fbSeo}
    onSeoChange={setFbSeo}
    images={fbImages}
    platformLabel2="Facebook"
    uploadDesc="Cho phép tải lên nhiều ảnh post Facebook theo từng danh mục."
    onImagesChange={setFbImages}
  />
)}

{/* === TIKTOK === */}
{activeTab === 'seo-tt' && (
  <PlatformSeoCard
    platform="TIKTOK"
    platformLabel="TikTok"
    badgeLabel="TIKTOK"
    seo={ttSeo}
    onSeoChange={setTtSeo}
    images={ttImages}
    platformLabel2="TikTok"
    uploadDesc="Hỗ trợ nhiều ảnh dọc hoặc ảnh carousel cho TikTok."
    onImagesChange={setTtImages}
  />
)}

{/* === YOUTUBE === */}
{activeTab === 'seo-yt' && (
  <PlatformSeoCard
    platform="YOUTUBE"
    platformLabel="YouTube"
    badgeLabel="YOUTUBE"
    seo={ytSeo}
    onSeoChange={setYtSeo}
    images={ytImages}
    platformLabel2="YouTube"
    uploadDesc="Có thể dùng cho thumbnail, ảnh minh họa hoặc ảnh cover video."
    onImagesChange={setYtImages}
  />
)}
```

## NEXT STEPS

**Option 1: Complete File Rewrite**
- Delete current NewsCategoryForm.tsx
- Create new file with correct structure
- Pros: Clean, matches CategoryForm exactly
- Cons: Large change, need to verify all functionality

**Option 2: Targeted Replacement**
- Use strReplace to replace lines 660-1205 (all 4 SEO tabs)
- Replace with 4 PlatformSeoCard components
- Pros: Smaller change, preserves other parts
- Cons: Need to find exact text boundaries

**Option 3: Manual Edit**
- Provide this document to user
- User manually edits the file
- Pros: User has full control
- Cons: Takes more time

## RECOMMENDATION
Use Option 2 - targeted replacement of SEO tabs section only, since we've already successfully updated the components, interfaces, and state management.
