# Final Refactor Instructions for NewsCategoryForm.tsx

## STATUS: 80% Complete

### ✅ COMPLETED (Lines 1-658)
1. ✅ Updated ImageItem interface with full properties
2. ✅ Added ImageCardGrid component (lines ~95-180)
3. ✅ Added PlatformSeoCard component (lines ~183-290)
4. ✅ Updated state initialization to use Record<string, string>
5. ✅ Removed old handler functions (handleWebSeo, handleFbSeo, etc.)
6. ✅ Updated submit function to use correct field names
7. ✅ Tab "Thông tin cơ bản" is correct (has 3 single image uploaders)

### ⚠️ NEEDS MANUAL REPLACEMENT (Lines 659-1204)

**File:** `NoiThatTienLoi/Code/src/admin/features/news-category/NewsCategoryForm.tsx`

**Action:** Delete lines 659-1204 and replace with the code below

**Lines to DELETE:** From line 659 `{/* === SEO WEBSITE === */}` to line 1204 `        </div>` (just before `{/* RIGHT - Trạng thái */}`)

**Replace with this code:**

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
        </div>
```

### 📝 VERIFICATION STEPS

After making the replacement:

1. **Check imports** - Make sure these are at the top:
   ```typescript
   import { SingleImageUploader } from '@/admin/components/SingleImageUploader';
   import { ImageManagerModal } from '@/admin/components/ImageManagerModal';
   import { RichTextEditor } from '@/admin/components/RichTextEditor';
   ```

2. **Remove unused import** (if present):
   ```typescript
   import { MultipleImageUploader } from '@/admin/components/MultipleImageUploader';
   ```

3. **Test the form:**
   - Navigate to `/admin/news-categories/new`
   - Check all 5 tabs render correctly
   - Tab "Thông tin cơ bản" should have 3 single image uploaders
   - SEO tabs should have ImageCardGrid for multiple images
   - Click "Chọn ảnh" button in SEO tabs to test ImageManagerModal
   - Add images, edit alt text, set primary, delete images
   - Submit form and verify data saves correctly

### 🎯 EXPECTED RESULT

After this change, `NewsCategoryForm.tsx` will match `CategoryForm.tsx` layout exactly:

- **Tab "Thông tin cơ bản":** 3 single image uploaders (Hình ảnh, Icon, Banner)
- **SEO Tabs:** Only ImageCardGrid component for multiple images
- **No separate Icon/Banner fields in SEO tabs**
- **Clean, reusable PlatformSeoCard component**

### 📊 FILE SIZE COMPARISON

- **Before:** ~1250 lines (with repetitive code)
- **After:** ~750 lines (with reusable components)
- **Reduction:** ~40% smaller, much more maintainable

## ALTERNATIVE: Use Find & Replace in VS Code

1. Open `NewsCategoryForm.tsx`
2. Press `Ctrl+H` (Find & Replace)
3. Enable "Use Regular Expression" mode
4. Find: `\{/\* === SEO WEBSITE === \*/\}[\s\S]*?        <\/div>\n\n        \{/\* RIGHT`
5. Replace with the code block above + `\n\n        {/* RIGHT`
6. Click "Replace"

This regex will match from "SEO WEBSITE" comment to just before "RIGHT - Trạng thái" comment.
