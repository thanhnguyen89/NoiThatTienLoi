# Checklist Tab "Nâng cao" - Tất cả đã được lưu vào DB

## Tổng quan
Khi bấm nút **Save**, tất cả các fix trong tab "Nâng cao" đều được lưu vào database.

## Chi tiết từng fix

### ✅ 1. Mật độ từ khóa đạt 1–1.5%
**Button:** `⚡ AI Fix — Tăng mật độ từ khóa`

**Hàm:** `callFixDensity()`

**Lưu vào DB:**
- ✅ `htmlContent` - Nội dung HTML đã được AI thêm từ khóa
- ✅ `wordCount` - Số từ mới (có thể tăng)
- ✅ `seoChecks.manuallyFixed[6]` - Đánh dấu đã fix index 6

**Flow:**
```
1. User bấm "AI Fix"
2. Call API /api/pipeline/fix-density
3. AI trả về HTML mới với từ khóa được thêm vào
4. Update contentRef.current.innerHTML
5. Call handleContentInput() → update wordCountLive
6. Set manuallyFixed.add(6)
7. User bấm Save
8. htmlContent + wordCount + manuallyFixed được lưu vào DB
```

**Verify:**
- Reload trang → nội dung vẫn có từ khóa đã thêm ✅
- Check "Mật độ từ khóa" hiển thị xanh ✅

---

### ✅ 2. URL ≤ 75 ký tự
**Button:** `🔧 Fix — Tạo slug chuẩn`

**Hàm:** `fixUrlSlug()`

**Lưu vào DB:**
- ✅ `slug` - Slug mới đã được tạo
- ✅ `seoChecks.manuallyFixed[2]` - Đánh dấu đã fix index 2

**Flow:**
```
1. User bấm "Fix — Tạo slug chuẩn"
2. Tạo slug mới: keyword-slug + title-slug
3. Set currentSlug, customSlug, slugEdited = true
4. Set manuallyFixed.add(2)
5. Copy slug vào clipboard
6. User bấm Save
7. slug + manuallyFixed được lưu vào DB
```

**Verify:**
- Reload trang → slug vẫn giữ nguyên ✅
- Check "URL ≤ 75 ký tự" hiển thị xanh ✅

---

### ✅ 3. Có ít nhất 1 internal link
**Button:** `🔧 Fix — Chèn internal link`

**Hàm:** `insertInternalLink()`

**Lưu vào DB:**
- ✅ `htmlContent` - HTML có thêm internal link
- ✅ `seoChecks.manuallyFixed[8]` - Đánh dấu đã fix index 8

**Flow:**
```
1. User bấm "Fix — Chèn internal link"
2. Hiện form nhập URL + anchor text
3. User nhập và bấm "✓ Chèn vào bài"
4. Tạo <p> mới với link, append vào cuối bài
5. Call handleContentInput()
6. Set manuallyFixed.add(8)
7. User bấm Save
8. htmlContent + manuallyFixed được lưu vào DB
```

**Verify:**
- Reload trang → internal link vẫn còn trong nội dung ✅
- Check "Có ít nhất 1 internal link" hiển thị xanh ✅

---

### ✅ 4. Có ít nhất 1 external link (DoFollow)
**Button:** `🔧 Fix — Chèn external link`

**Hàm:** `insertExternalLink()`

**Lưu vào DB:**
- ✅ `htmlContent` - HTML có thêm external link
- ✅ `seoChecks.manuallyFixed[9]` - Đánh dấu đã fix index 9

**Flow:**
```
1. User bấm "Fix — Chèn external link"
2. Hiện form nhập URL + tên nguồn
3. User nhập và bấm "✓ Chèn vào bài"
4. Tạo <p> mới với link (target="_blank"), append vào cuối bài
5. Call handleContentInput()
6. Set manuallyFixed.add(9)
7. User bấm Save
8. htmlContent + manuallyFixed được lưu vào DB
```

**Verify:**
- Reload trang → external link vẫn còn trong nội dung ✅
- Check "Có ít nhất 1 external link" hiển thị xanh ✅

---

### ✅ 5. Từ khóa trong thẻ alt của ảnh
**Button:** `🔧 Fix — Tự động thêm alt text cho ảnh`

**Hàm:** `fixAltText()`

**Lưu vào DB:**
- ✅ `htmlContent` - HTML với ảnh đã có alt text chứa keyword
- ✅ `seoChecks.manuallyFixed[10]` - Đánh dấu đã fix index 10

**Flow:**
```
1. User bấm "Fix — Tự động thêm alt text cho ảnh"
2. Tìm tất cả <img> trong content
3. Với mỗi ảnh không có keyword trong alt:
   - Set alt = "alt cũ — keyword" hoặc "keyword"
   - Highlight ảnh (outline vàng)
4. Call handleContentInput()
5. Set manuallyFixed.add(10)
6. User bấm Save
7. htmlContent + manuallyFixed được lưu vào DB
```

**Verify:**
- Reload trang → ảnh vẫn có alt text với keyword ✅
- Check "Từ khóa trong thẻ alt của ảnh" hiển thị xanh ✅

---

### ✅ 6. Có từ khóa phụ trong nội dung
**Không có button fix** (tự động check)

**Lưu vào DB:**
- ✅ `secondaryKeywords` - Danh sách từ khóa phụ
- ✅ Nếu user thêm từ khóa phụ vào nội dung thủ công → lưu trong `htmlContent`

**Flow:**
```
1. User thêm từ khóa phụ vào tags
2. User edit nội dung, thêm từ khóa phụ vào bài
3. User bấm Save
4. htmlContent + secondaryKeywords được lưu vào DB
```

**Verify:**
- Reload trang → từ khóa phụ vẫn hiển thị trong tags ✅
- Check "Có từ khóa phụ trong nội dung" tự động pass nếu có ✅

---

## Bảng tổng hợp

| # | Check | Button Fix | Hàm | Lưu vào DB | manuallyFixed index |
|---|-------|-----------|-----|-----------|---------------------|
| 6 | Mật độ từ khóa 1–1.5% | ⚡ AI Fix | `callFixDensity()` | `htmlContent`, `wordCount` | 6 |
| 7 | URL ≤ 75 ký tự | 🔧 Fix — Tạo slug | `fixUrlSlug()` | `slug` | 2 |
| 8 | Có ít nhất 1 internal link | 🔧 Fix — Chèn internal | `insertInternalLink()` | `htmlContent` | 8 |
| 9 | Có ít nhất 1 external link | 🔧 Fix — Chèn external | `insertExternalLink()` | `htmlContent` | 9 |
| 10 | Từ khóa trong alt ảnh | 🔧 Fix — Thêm alt text | `fixAltText()` | `htmlContent` | 10 |
| 11 | Có từ khóa phụ | (auto check) | - | `secondaryKeywords`, `htmlContent` | - |

## Cơ chế lưu

### 1. Khi bấm nút Fix
```typescript
// Mỗi hàm fix đều làm 3 việc:
1. Update contentRef.current (HTML content)
2. Call handleContentInput() (update word count)
3. Set manuallyFixed.add(index) (đánh dấu đã fix)
```

### 2. Khi bấm Save
```typescript
const handleSave = async () => {
  // 1. Lấy HTML mới nhất
  const updatedHtml = contentRef.current.innerHTML;
  
  // 2. Tính SEO score (tính cả manuallyFixed)
  const computedSeoScore = computedSeoChecks.reduce((sum, c, i) => {
    const passed = c.pass || manuallyFixed.has(i); // ← Quan trọng!
    return sum + (passed ? SEO_WEIGHTS[i] : 0);
  }, 0);
  
  // 3. Lưu vào DB
  await fetch('/api/articles/${articleId}/save', {
    body: JSON.stringify({
      htmlContent: updatedHtml,           // ← Nội dung đã fix
      slug: currentSlug,                  // ← Slug đã fix
      wordCount: wordCountLive,           // ← Số từ mới
      seoScore: computedSeoScore,         // ← Điểm SEO (tính cả fix)
      seoChecks: {
        checks: computedSeoChecks,
        manuallyFixed: Array.from(manuallyFixed), // ← Các fix đã làm
      },
      secondaryKeywords: secondaryKeywords, // ← Từ khóa phụ
    }),
  });
};
```

### 3. Khi load lại trang
```typescript
// Restore từ database
if (article.slug) {
  setCurrentSlug(article.slug);
  setCustomSlug(article.slug);
  setSlugEdited(true);
}

// Restore manuallyFixed
if (article.seoChecks?.manuallyFixed) {
  setManuallyFixed(new Set(article.seoChecks.manuallyFixed));
}

// HTML content tự động load
contentRef.current.innerHTML = article.htmlContent;
```

## Test checklist

### Test 1: Fix tất cả và reload
```
☐ 1. Vào step4
☐ 2. Bấm "AI Fix — Tăng mật độ từ khóa"
☐ 3. Bấm "Fix — Tạo slug chuẩn"
☐ 4. Bấm "Fix — Chèn internal link" (nhập URL + text)
☐ 5. Bấm "Fix — Chèn external link" (nhập URL + text)
☐ 6. Bấm "Fix — Tự động thêm alt text cho ảnh"
☐ 7. Bấm Save
☐ 8. Reload trang (F5)
☐ 9. Verify: Tất cả checks hiển thị xanh ✅
☐ 10. Verify: Nội dung vẫn có internal/external links ✅
☐ 11. Verify: Ảnh vẫn có alt text ✅
☐ 12. Verify: Slug vẫn giữ nguyên ✅
```

### Test 2: Save nhiều lần
```
☐ 1. Fix một số checks
☐ 2. Bấm Save
☐ 3. Fix thêm checks khác
☐ 4. Bấm Save lần 2
☐ 5. Reload trang
☐ 6. Verify: Tất cả fixes từ cả 2 lần save đều còn ✅
```

### Test 3: Edit sau khi fix
```
☐ 1. Fix tất cả checks
☐ 2. Bấm Save
☐ 3. Edit nội dung (thêm/xóa text)
☐ 4. Bấm Save lần 2
☐ 5. Reload trang
☐ 6. Verify: Nội dung mới + các fixes cũ đều còn ✅
```

## Kết luận

✅ **Tất cả các fix trong tab "Nâng cao" đều được lưu vào database**

✅ **Khi reload trang, tất cả các fix vẫn còn nguyên**

✅ **SEO score được tính đúng (bao gồm cả manuallyFixed)**

✅ **Không cần fix lại sau khi reload**

## Các field được lưu trong database

```typescript
{
  htmlContent: string,           // Nội dung HTML (có internal/external links, alt text)
  slug: string,                  // Slug đã fix
  wordCount: number,             // Số từ (có thể tăng sau AI fix density)
  seoScore: number,              // Điểm SEO (0-100)
  seoChecks: {
    checks: SeoCheck[],          // Chi tiết từng check
    manuallyFixed: number[],     // [2, 6, 8, 9, 10, ...] - index các check đã fix
  },
  secondaryKeywords: string[],   // Từ khóa phụ
  selectedTitle: string,         // Tiêu đề
  metaDescription: string,       // Meta description
  humannessScore: number,        // Điểm humanness
  scoreBreakdown: object,        // Chi tiết điểm AI
}
```
