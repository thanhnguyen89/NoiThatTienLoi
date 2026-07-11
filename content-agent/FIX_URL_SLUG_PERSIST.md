# Fix URL Slug Persist - Hoàn tất

## Vấn đề
Khi bấm "Fix — Tạo slug chuẩn" và Save, slug mới được tạo nhưng khi reload lại trang:
- ❌ Check "Từ khóa chính xuất hiện trong URL" vẫn hiển thị đỏ (fail)
- ❌ Slug bị reset về auto-generated slug

## Nguyên nhân

### 1. Logic check URL không đúng
```typescript
// Trước (SAI):
pass: slug.includes(kw.replace(/\s+/g, '-'))

// Vấn đề: 
// - keyword = "Giường Sắt 2 Tầng Quân Đội" (có dấu, chữ hoa)
// - slug = "giuong-sat-2-tang-quan-doi-..." (không dấu, chữ thường)
// → includes() fail vì không match
```

### 2. Slug state không được restore đúng
Khi load article từ database:
- ✅ `currentSlug` được set
- ❌ `customSlug` KHÔNG được set
- ❌ `slugEdited` KHÔNG được set thành `true`

→ Kết quả: slug bị override bởi auto-generated slug

## Các fix đã thực hiện

### 1. Sửa logic check URL
**File: `web/app/viet-bai-thong-minh/step4/page.tsx`** (dòng ~86)

```typescript
{ group: 'basic', label: 'Từ khóa chính xuất hiện trong URL',
  pass: (() => {
    // Normalize keyword giống như slug (bỏ dấu, lowercase)
    const kwSlug = kw.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '-');
    const slugLow = slug.toLowerCase();
    return slugLow.includes(kwSlug) || slugLow.includes(kw.replace(/\s+/g, '-')) || slugLow.includes(kw.replace(/\s+/g, ''));
  })(),
  fixable: true 
},
```

**Giải thích:**
- Normalize keyword thành slug format (bỏ dấu, lowercase, replace space → dash)
- So sánh với slug đã lowercase
- Hỗ trợ nhiều format: có dấu gạch ngang, không có, v.v.

### 2. Restore slug state khi load
**File: `web/app/viet-bai-thong-minh/step4/page.tsx`** (dòng ~372)

```typescript
// Load slug if exists
if (article.slug) {
  setCurrentSlug(article.slug);
  setSuggestedSlug(article.slug);
  setCustomSlug(article.slug);      // ← THÊM: set custom slug
  setSlugEdited(true);               // ← THÊM: đánh dấu đã edit
}
```

**Giải thích:**
- Khi có slug trong database → set `slugEdited = true`
- Điều này ngăn slug bị override bởi auto-generated slug
- `customSlug` được set để hiển thị đúng trong input

### 3. Fix hàm fixUrlSlug
**File: `web/app/viet-bai-thong-minh/step4/page.tsx`** (dòng ~730)

```typescript
function fixUrlSlug() {
  const kwSlug = keyword.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-');
  const titleSlug = slugify(editTitle);
  const newSlug = titleSlug.includes(kwSlug) ? titleSlug : `${kwSlug}-${titleSlug}`.slice(0, 70);
  
  setSuggestedSlug(newSlug);
  setCurrentSlug(newSlug);
  setCustomSlug(newSlug);    // ← THÊM: set custom slug
  setSlugEdited(true);       // ← THÊM: đánh dấu đã edit
  setFixingUrl(true);
  
  // Copy to clipboard + mark as fixed
  navigator.clipboard.writeText(newSlug).then(() => {
    setCopiedSlug(true);
    setManuallyFixed((prev) => new Set(prev).add(2));
    setTimeout(() => setCopiedSlug(false), 3000);
  }).catch(() => {
    setManuallyFixed((prev) => new Set(prev).add(2));
  });
}
```

## Kết quả

### Trước khi fix:
1. Bấm "Fix — Tạo slug chuẩn"
2. Slug mới: `giuong-sat-2-tang-quan-doi-gia-xuong-mua-o-dau-ben-chac`
3. Bấm Save
4. Reload trang
5. ❌ Check "Từ khóa chính xuất hiện trong URL" vẫn đỏ
6. ❌ Slug bị reset về auto-generated

### Sau khi fix:
1. Bấm "Fix — Tạo slug chuẩn"
2. Slug mới: `giuong-sat-2-tang-quan-doi-gia-xuong-mua-o-dau-ben-chac`
3. Bấm Save
4. Reload trang
5. ✅ Check "Từ khóa chính xuất hiện trong URL" hiển thị xanh (pass)
6. ✅ Slug vẫn giữ nguyên giá trị đã fix

## Test case

### Test 1: Fix slug và reload
```
1. Vào step4 với keyword "Giường Sắt 2 Tầng Quân Đội"
2. Bấm "Fix — Tạo slug chuẩn"
3. Verify: slug = "giuong-sat-2-tang-quan-doi-..."
4. Bấm Save
5. Reload trang (F5)
6. Expected: 
   - ✅ Slug vẫn là "giuong-sat-2-tang-quan-doi-..."
   - ✅ Check URL hiển thị xanh
   - ✅ manuallyFixed[2] = true
```

### Test 2: Keyword có dấu đặc biệt
```
Keywords test:
- "Giường Sắt 2 Tầng" → slug: "giuong-sat-2-tang"
- "Tủ Áo Gỗ Đẹp" → slug: "tu-ao-go-dep"
- "Bàn Ghế Cafe" → slug: "ban-ghe-cafe"

All should pass URL check ✅
```

### Test 3: Edit slug thủ công
```
1. Click vào slug input
2. Sửa thành "custom-slug-test"
3. Bấm Save
4. Reload
5. Expected: slug vẫn là "custom-slug-test" ✅
```

## Lưu ý kỹ thuật

### Slug normalization
Slug được normalize theo quy tắc:
1. Lowercase
2. NFD normalize (tách dấu)
3. Bỏ dấu thanh (̀ ́ ̉ ̃ ̣)
4. Đổi "đ" → "d"
5. Bỏ ký tự đặc biệt (chỉ giữ a-z, 0-9, -)
6. Replace space → dash
7. Trim và giới hạn độ dài

### State management
```typescript
currentSlug   // Slug hiện tại được lưu vào DB
customSlug    // Slug do user edit (hoặc fix)
slugEdited    // Flag: true nếu user đã edit/fix
autoSlug      // Slug tự động từ title
activeSlug    // Slug hiển thị = slugEdited ? customSlug : autoSlug
```

### Save flow
```
fixUrlSlug() 
  → setCustomSlug(newSlug)
  → setSlugEdited(true)
  → setCurrentSlug(newSlug)
  → setManuallyFixed(2)

handleSave()
  → slug: currentSlug
  → seoChecks: { checks, manuallyFixed: [2, ...] }
  → Save to DB

Load article
  → setCurrentSlug(article.slug)
  → setCustomSlug(article.slug)
  → setSlugEdited(true)
  → setManuallyFixed(article.seoChecks.manuallyFixed)
```

## Kết luận
✅ Slug được persist đúng cách sau khi fix và save
✅ Check URL nhận diện đúng keyword có dấu tiếng Việt
✅ State được restore đầy đủ khi reload trang
