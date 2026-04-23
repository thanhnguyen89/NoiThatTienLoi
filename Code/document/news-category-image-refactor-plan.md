# News Category Form - Image Upload Refactor Plan

## Current Issue
The SEO tabs in `NewsCategoryForm.tsx` have the WRONG layout - they show separate fields for "Ảnh đại diện", "Icon", "Banner" which does NOT match the reference `CategoryForm.tsx`.

## Reference: CategoryForm.tsx Structure

### Tab "Thông tin cơ bản" (Basic Info)
- Has 3 single image uploaders in a row:
  - Hình ảnh (Image)
  - Icon
  - Banner
- Uses `SingleImageUploader` component
- At the END of this tab, there's an `ImageCardGrid` for Website images

### SEO Tabs (Website, Facebook, TikTok, YouTube)
- Each SEO tab has:
  1. SEO fields (title, description, keywords, etc.)
  2. **ONLY** `ImageCardGrid` component for multiple images
  3. NO separate "Ảnh đại diện", "Icon", "Banner" fields

## ImageCardGrid Component Features
- Grid display of multiple images (col-6 col-md-4 col-lg-3)
- Each image card shows:
  - Thumbnail preview (100px height)
  - Image name
  - Alt text (editable inline)
  - "Ảnh chính" badge if isPrimary
  - Action buttons: Edit alt, Set as primary, Delete
- "Chọn ảnh" button in card header to open ImageManagerModal
- Supports multi-select from ImageManagerModal

## ImageItem Interface (from CategoryForm)
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

## Required Changes to NewsCategoryForm.tsx

### 1. Update ImageItem interface
Replace current simple interface with full CategoryForm interface

### 2. Copy ImageCardGrid component
Copy the complete `ImageCardGrid` function component from CategoryForm.tsx

### 3. Copy PlatformSeoCard component  
Copy the complete `PlatformSeoCard` function component from CategoryForm.tsx

### 4. Update state initialization
- Initialize webImages, fbImages, ttImages, ytImages as ImageItem[] arrays
- Remove separate icon/banner fields from SEO state objects

### 5. Update Tab "Thông tin cơ bản"
- Keep 3 single image uploaders (imageUrl, icon, banner)
- Remove ImageCardGrid from this tab (it should be in SEO Website tab)

### 6. Update SEO tabs
- Replace current layout with `PlatformSeoCard` component
- Each tab will automatically include ImageCardGrid

### 7. Update submit/buildPayload
- Build platformImages array from all image states
- Map ImageItem[] to API format with platform, imageUrl, alt, sortOrder, isPrimary, isActive

## Files to Modify
1. `NoiThatTienLoi/Code/src/admin/features/news-category/NewsCategoryForm.tsx` - Main refactor
2. May need to update API/service layer if image format doesn't match

## Next Steps
1. Read complete NewsCategoryForm.tsx file
2. Copy ImageCardGrid and PlatformSeoCard from CategoryForm.tsx
3. Refactor the form layout to match CategoryForm.tsx exactly
4. Test the form to ensure images save correctly
