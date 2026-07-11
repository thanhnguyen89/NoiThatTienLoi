# Fix SEO Density Save Issue - Hoàn Thành ✅

## Vấn Đề
Sau khi click "AI Fix" để tăng mật độ từ khóa, SEO check vẫn hiển thị giá trị cũ (0.60%). Khi reload trang, mật độ từ khóa không được lưu vào database.

## Nguyên Nhân

### 1. SEO Checks Dùng HTML Cũ
**File**: `web/app/viet-bai-thong-minh/step4/page.tsx`

**Vấn đề**: 
```typescript
// TRƯỚC (SAI)
const { checks: seoChecks } = result
  ? computeSeoChecks(editTitle, result.metaDescription, result.html, ...)
  : { checks: [] };
```

- `result.html` là HTML cũ từ localStorage/database
- Khi AI fix density, nó update `contentRef.current.innerHTML` (HTML mới)
- Nhưng SEO checks vẫn tính dựa trên `result.html` (HTML cũ)
- → Mật độ từ khóa hiển thị không đúng

### 2. handleSave Cũng Dùng HTML Cũ
**Vấn đề**:
```typescript
// TRƯỚC (SAI)
const { checks: computedSeoChecks } = computeSeoChecks(
  editTitle, 
  result.metaDescription, 
  result.html,  // ← HTML cũ
  ...
);
```

- Khi save, nó tính SEO score dựa trên `result.html` (HTML cũ)
- Không phản ánh nội dung đã fix
- → Database lưu SEO score sai

### 3. Không Auto-Save Sau Khi Fix
- User click "AI Fix" → HTML thay đổi
- Nhưng không tự động save vào database
- User phải nhớ click "Save" button
- Nếu reload trước khi save → mất hết thay đổi

## Giải Pháp

### Fix 1: SEO Checks Dùng HTML Hiện Tại
```typescript
// SAU (ĐÚNG)
// Get current HTML from editor (not from result.html which is stale)
const currentHtml = contentRef.current?.innerHTML || result?.html || '';

const { checks: seoChecks } = result
  ? computeSeoChecks(editTitle, result.metaDescription, currentHtml, ...)
  : { checks: [] };
```

**Kết quả**:
- SEO checks luôn tính dựa trên HTML hiện tại trong editor
- Phản ánh đúng nội dung sau khi fix
- Mật độ từ khóa hiển thị chính xác

### Fix 2: handleSave Dùng HTML Mới
```typescript
// SAU (ĐÚNG)
const updatedHtml = contentRef.current.innerHTML;

const { checks: computedSeoChecks } = computeSeoChecks(
  editTitle, 
  result.metaDescription, 
  updatedHtml,  // ← HTML mới
  ...
);
```

**Kết quả**:
- Save đúng SEO score dựa trên nội dung mới
- Database lưu giá trị chính xác

### Fix 3: Auto-Save Sau Khi Fix Density
```typescript
// Trong callFixDensity()
if (json.success && json.data?.changed && json.data.html) {
  contentRef.current.innerHTML = json.data.html;
  handleContentInput();
  // ... highlight code ...
  setManuallyFixed((prev) => new Set(prev).add(6));
  
  // Auto-save after fixing density
  setTimeout(() => handleSave(), 500);
}
```

**Kết quả**:
- Sau khi AI fix xong, tự động save vào database sau 500ms
- User không cần nhớ click "Save"
- Reload trang vẫn giữ được thay đổi

## Testing

### Test Case 1: Fix Density
1. Mở bài viết có mật độ từ khóa < 1%
2. Click "AI Fix" ở mục "Mật độ từ khóa đạt 1–1.5%"
3. Chờ AI fix xong
4. **Kiểm tra**: Mật độ từ khóa hiển thị phải update ngay (ví dụ: 0.60% → 1.20%)
5. **Kiểm tra**: Sau 500ms, button "Save" phải hiển thị "✓ Đã lưu"
6. Reload trang (F5)
7. **Kiểm tra**: Mật độ từ khóa vẫn giữ giá trị mới (1.20%)

### Test Case 2: Manual Edit + Save
1. Edit nội dung trong editor (thêm từ khóa)
2. Click "Save"
3. **Kiểm tra**: SEO score phải tính dựa trên nội dung mới
4. Reload trang
5. **Kiểm tra**: SEO score vẫn đúng

### Test Case 3: Multiple Fixes
1. Fix mật độ từ khóa
2. Fix internal link
3. Fix external link
4. **Kiểm tra**: Tất cả fixes đều được lưu
5. Reload trang
6. **Kiểm tra**: Tất cả fixes vẫn còn

## Flow Diagram

### TRƯỚC (SAI)
```
User click "AI Fix"
  ↓
AI returns new HTML
  ↓
Update contentRef.current.innerHTML (HTML mới)
  ↓
Update wordCountLive
  ↓
SEO checks tính dựa trên result.html (HTML cũ) ← SAI
  ↓
User click "Save"
  ↓
Save SEO score dựa trên result.html (HTML cũ) ← SAI
  ↓
Reload trang → Load HTML cũ từ DB
```

### SAU (ĐÚNG)
```
User click "AI Fix"
  ↓
AI returns new HTML
  ↓
Update contentRef.current.innerHTML (HTML mới)
  ↓
Update wordCountLive
  ↓
SEO checks tính dựa trên currentHtml (HTML mới) ← ĐÚNG
  ↓
Auto-save sau 500ms
  ↓
Save SEO score dựa trên updatedHtml (HTML mới) ← ĐÚNG
  ↓
Reload trang → Load HTML mới từ DB ✓
```

## Technical Details

### computeSeoChecks Function
```typescript
function computeSeoChecks(
  title: string,
  metaDescription: string,
  html: string,  // ← Phải là HTML hiện tại
  wordCount: number,
  keyword: string,
  secondaryKeywords: string[],
  slug: string,
): { checks: SeoCheck[]; score: number }
```

### Keyword Density Calculation
```typescript
const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const kwCount = (plainText.match(new RegExp(kwEsc, 'g')) || []).length;
const density = wordCount > 0 ? (kwCount / wordCount) * 100 : 0;
const densityPass = density >= 1.0 && density <= 1.5;
```

## Files Modified

- `web/app/viet-bai-thong-minh/step4/page.tsx`
  - Line ~732: SEO checks computation - use `currentHtml` instead of `result.html`
  - Line ~387: handleSave - use `updatedHtml` instead of `result.html`
  - Line ~1517: callFixDensity - add auto-save after fix

## Benefits

✅ **Real-time SEO checks** - Phản ánh đúng nội dung hiện tại  
✅ **Accurate save** - Lưu đúng SEO score  
✅ **Auto-save** - Không cần nhớ click "Save"  
✅ **Persistent** - Reload vẫn giữ được thay đổi  
✅ **Better UX** - User không bị confused  

## Notes

- Auto-save delay 500ms để đảm bảo tất cả state updates đã hoàn thành
- `currentHtml` fallback về `result?.html` nếu contentRef chưa sẵn sàng
- `manuallyFixed` vẫn được lưu đúng vào database

---

**Ngày**: 2026-05-12  
**Trạng thái**: ✅ ĐÃ SỬA XONG  
**Server**: Running at http://localhost:3001
