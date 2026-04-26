# Plan: Upgrade CategoryForm to Match NewsCategoryForm

## Objective
Update `admin/categories/new` (CategoryForm.tsx) to have full SEO tabs like `admin/news-categories/new` (NewsCategoryForm.tsx)

## Current State
- CategoryForm has basic tabs structure
- Uses simple `PlatformSeoCard` component
- Missing: emojis, location picker, preview cards, copy buttons, character counters

## Target State (from NewsCategoryForm)
- ✅ 5 tabs: basic, seo-web, seo-fb, seo-tt, seo-yt
- ✅ Facebook tab: 28 emojis, scrollable keywords/hashtags (20 items), location picker (9 locations), map button, copy buttons (5), preview card
- ✅ TikTok tab: Same as Facebook
- ✅ YouTube tab: Same as Facebook + Tags field
- ✅ Character counters for all text fields
- ✅ LocationPickerModal integration

## Changes Needed

### 1. Add Import
```tsx
import { LocationPickerModal } from '@/admin/components/LocationPickerModal';
```

### 2. Add State Variables (in CategoryForm function)
```tsx
const [showMapModal, setShowMapModal] = useState(false);
const [currentLocationField, setCurrentLocationField] = useState<'fb' | 'tt' | 'yt' | null>(null);
```

### 3. Add Location Field to SEO States
Update fbSeo, ttSeo, ytSeo initialization to include `location: ''`

### 4. Add Helper Functions
```tsx
function openMapModal(field: 'fb' | 'tt' | 'yt') {
  setCurrentLocationField(field);
  setShowMapModal(true);
}

function selectLocationFromMap(location: string) {
  if (currentLocationField === 'fb') {
    setFbSeo(p => ({ ...p, location }));
  } else if (currentLocationField === 'tt') {
    setTtSeo(p => ({ ...p, location }));
  } else if (currentLocationField === 'yt') {
    setYtSeo(p => ({ ...p, location }));
  }
  setShowMapModal(false);
  setCurrentLocationField(null);
}
```

### 5. Replace SEO Tabs Content
Replace the simple `PlatformSeoCard` calls with full implementation from NewsCategoryForm:

#### Facebook Tab (lines ~650-1100 from NewsCategoryForm)
- Badge "FACEBOOK"
- Link bài đã đăng
- Title with copy button + character counter
- Description with copy button + character counter + 28 emoji buttons
- Keywords with copy button + scrollable 20 sample buttons
- Hashtags with copy button + scrollable 20 sample buttons
- Location with copy button + map button + dropdown (9 locations)
- SingleImageUploader
- Copy all content button
- Facebook Post Preview Card
- ImageCardGrid

#### TikTok Tab (lines ~1250-1640 from NewsCategoryForm)
- Badge "TIKTOK"
- Link bài đã đăng
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

#### YouTube Tab (lines ~1640-1900 from NewsCategoryForm)
- Badge "YOUTUBE"
- Link bài đã đăng
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

### 6. Add LocationPickerModal at End of Form
```tsx
<LocationPickerModal
  isOpen={showMapModal}
  onClose={() => setShowMapModal(false)}
  onSelect={selectLocationFromMap}
/>
```

## Implementation Strategy
1. Add imports and state variables
2. Add helper functions
3. Replace Facebook tab content
4. Replace TikTok tab content
5. Replace YouTube tab content
6. Add LocationPickerModal
7. Test all features

## Files to Modify
- `NoiThatTienLoi/Code/src/admin/features/category/CategoryForm.tsx`

## Reference File
- `NoiThatTienLoi/Code/src/admin/features/news-category/NewsCategoryForm.tsx`

## Estimated Changes
- ~1200 lines of code to replace/add
- 3 major tab sections to replace
- 15 copy buttons to add (5 per tab)
- 3 preview cards to add
- 1 modal integration

