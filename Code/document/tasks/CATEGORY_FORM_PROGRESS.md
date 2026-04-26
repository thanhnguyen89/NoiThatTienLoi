# CategoryForm Upgrade Progress

## ✅ Completed Steps

### 1. Imports & Setup
- ✅ Added `LocationPickerModal` import
- ✅ Added `showMapModal` state
- ✅ Added `currentLocationField` state
- ✅ Added `location` field to fbSeo, ttSeo, ytSeo states

### 2. Helper Functions
- ✅ Added `handleFbSeo()` function
- ✅ Added `handleTtSeo()` function
- ✅ Added `handleYtSeo()` function
- ✅ Added `openMapModal()` function
- ✅ Added `selectLocationFromMap()` function

### 3. Modal Integration
- ✅ Added `<LocationPickerModal>` component at end of form

## ⚠️ Remaining Work

### Replace SEO Tabs Content

Currently using simple `<PlatformSeoCard>` component. Need to replace with full implementation from NewsCategoryForm.

#### Facebook Tab (seo-fb)
- ❌ Replace `<PlatformSeoCard platform="FACEBOOK" .../>` with full implementation
- Need to add:
  - Badge "FACEBOOK"
  - Title with copy button + character counter
  - Description with copy button + character counter + 28 emoji buttons
  - Keywords with copy button + scrollable 20 sample buttons
  - Hashtags with copy button + scrollable 20 sample buttons
  - Location with copy button + map button + dropdown (9 locations)
  - SingleImageUploader
  - Copy all content button
  - Facebook Post Preview Card
  - ImageCardGrid

#### TikTok Tab (seo-tt)
- ❌ Replace `<PlatformSeoCard platform="TIKTOK" .../>` with full implementation
- Need to add:
  - Badge "TIKTOK"
  - Title with copy button + character counter (150)
  - Description with copy button + character counter (2200) + 28 emoji buttons
  - Keywords with copy button + scrollable 20 sample buttons
  - Hashtags with copy button + scrollable 20 sample buttons
  - Location with copy button + map button + dropdown (9 locations)
  - Trending hashtags suggestions (7 buttons)
  - SingleImageUploader (Cover Image)
  - Copy all content button
  - TikTok Video Preview Card
  - ImageCardGrid

#### YouTube Tab (seo-yt)
- ❌ Replace `<PlatformSeoCard platform="YOUTUBE" .../>` with full implementation
- Need to add:
  - Badge "YOUTUBE"
  - Title with copy button + character counter (100)
  - Description with copy button + character counter (5000)
  - Tags with copy button + scrollable 20 sample buttons
  - Hashtags with copy button + scrollable 20 sample buttons
  - Location with copy button + map button + dropdown (9 locations)
  - Suggested tags (8 buttons)
  - SingleImageUploader (Thumbnail 1280x720)
  - Copy all content button
  - YouTube Video Preview Card
  - ImageCardGrid

## Next Steps

1. Read Facebook tab implementation from NewsCategoryForm (lines ~950-1240)
2. Replace Facebook tab in CategoryForm
3. Read TikTok tab implementation from NewsCategoryForm (lines ~1250-1640)
4. Replace TikTok tab in CategoryForm
5. Read YouTube tab implementation from NewsCategoryForm (lines ~1640-1900)
6. Replace YouTube tab in CategoryForm
7. Test all features
8. Verify no TypeScript errors

## Estimated Remaining Work
- ~1200 lines of code to replace
- 3 major tab sections
- 15 copy buttons (5 per tab)
- 3 preview cards
- ~60 sample buttons (keywords/hashtags/emojis)

## Files
- Source: `NoiThatTienLoi/Code/src/admin/features/news-category/NewsCategoryForm.tsx`
- Target: `NoiThatTienLoi/Code/src/admin/features/category/CategoryForm.tsx`
- Backup: `NoiThatTienLoi/Code/src/admin/features/category/CategoryForm.tsx.backup`

