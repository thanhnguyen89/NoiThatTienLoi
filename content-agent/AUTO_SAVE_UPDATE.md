# Auto-Save After AI/SEO Fixes

## Tổng Quan

Khi user sửa nội dung bài viết qua AI Check hoặc SEO fixes, hệ thống cần tự động lưu vào database để đảm bảo không mất dữ liệu.

## Đã Implement

### 1. Auto-Save Helper Function ✅

**File:** `web/app/viet-bai-thong-minh/step4/page.tsx`

```typescript
async function autoSaveAfterFix() {
  if (!articleId || !result || !contentRef.current) return;
  
  try {
    const updatedHtml = contentRef.current.innerHTML;
    const res = await fetch(`/api/articles/${articleId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        htmlContent: updatedHtml,
        metaDescription: result.metaDescription,
        wordCount: wordCountLive,
        createVersion: false, // Don't create version for auto-fixes
      }),
    });
    
    if (res.ok) {
      console.log('[Auto-save] Saved to database after fix');
    }
  } catch (err) {
    console.error('[Auto-save] Failed:', err);
  }
}
```

**Đặc điểm:**
- ✅ Không tạo version (createVersion: false) - chỉ update
- ✅ Silent save - không hiện thông báo cho user
- ✅ Graceful error handling - không crash nếu lỗi
- ✅ Async - không block UI

### 2. AI Fix Auto-Save ✅

**Function:** `handleApplyAIFix`

```typescript
async function handleApplyAIFix(original: string, replacement: string) {
  // ... replace logic ...
  
  handleContentInput();
  
  // Auto-save to database after AI fix
  if (articleId && result) {
    try {
      const updatedHtml = contentRef.current.innerHTML;
      const res = await fetch(`/api/articles/${articleId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          htmlContent: updatedHtml,
          metaDescription: result.metaDescription,
          wordCount: wordCountLive,
          createVersion: false,
        }),
      });
      
      if (res.ok) {
        console.log('[AI Fix] Auto-saved to database');
      }
    } catch (err) {
      console.error('[AI Fix] Auto-save failed:', err);
    }
  }
}
```

**Khi nào trigger:**
- User click "✅ Áp dụng vào bài" trong AI Check panel
- Câu được thay thế trong editor
- Tự động save vào DB ngay sau đó

## Cần Implement Thêm

### 3. SEO Fix Auto-Save (TODO)

Các hàm cần thêm `await autoSaveAfterFix()`:

#### A. Insert Internal Link
```typescript
async function insertInternalLink() {
  if (!internalUrl.trim() || !internalText.trim() || !contentRef.current) return;
  const html = `<p style="margin-top:1rem">👉 Xem thêm: <a href="${internalUrl.trim()}">${internalText.trim()}</a></p>`;
  contentRef.current.innerHTML += html;
  handleContentInput();
  setManuallyFixed((prev) => new Set(prev).add(8));
  setFixingInternal(false); 
  setInternalUrl(''); 
  setInternalText('');
  
  await autoSaveAfterFix(); // ← Thêm dòng này
}
```

#### B. Insert External Link
```typescript
async function insertExternalLink() {
  if (!externalUrl.trim() || !externalText.trim() || !contentRef.current) return;
  const url = externalUrl.trim().startsWith('http') ? externalUrl.trim() : `https://${externalUrl.trim()}`;
  const html = `<p style="margin-top:1rem">📖 Tham khảo: <a href="${url}" target="_blank" rel="noopener noreferrer">${externalText.trim()}</a></p>`;
  contentRef.current.innerHTML += html;
  handleContentInput();
  setManuallyFixed((prev) => new Set(prev).add(9));
  setFixingExternal(false); 
  setExternalUrl(''); 
  setExternalText('');
  
  await autoSaveAfterFix(); // ← Thêm dòng này
}
```

#### C. Fix Alt Text
```typescript
async function fixAltText() {
  if (!contentRef.current || !keyword) return;
  const imgs = Array.from(contentRef.current.querySelectorAll('img'));
  let fixed = 0;
  imgs.forEach((img) => {
    const alt = img.getAttribute('alt') || '';
    if (!alt.toLowerCase().includes(keyword.toLowerCase())) {
      img.setAttribute('alt', alt ? `${alt} — ${keyword}` : keyword);
      fixed++;
    }
  });
  handleContentInput();
  setManuallyFixed((prev) => new Set(prev).add(10));
  
  if (fixed > 0) {
    await autoSaveAfterFix(); // ← Thêm dòng này
  }
}
```

#### D. Fix Keyword Density (AI)
```typescript
async function callFixDensity() {
  if (!contentRef.current || !keyword || fixingDensity) return;
  setFixingDensity(true);
  
  try {
    const currentHtml = contentRef.current.innerHTML;
    const plainText = currentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const wc = plainText.trim().split(/\s+/).filter(Boolean).length;
    const kwEsc = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const kwCount = (plainText.toLowerCase().match(new RegExp(kwEsc, 'g')) || []).length;

    const res = await fetch('/api/pipeline/fix-density', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        html: currentHtml, 
        keyword, 
        currentCount: kwCount, 
        wordCount: wc 
      }),
    });
    
    const json = await res.json();
    if (json.success && json.data?.changed && json.data.html) {
      contentRef.current.innerHTML = json.data.html;
      handleContentInput();
      setManuallyFixed((prev) => new Set(prev).add(6));
      
      await autoSaveAfterFix(); // ← Thêm dòng này
    } else if (json.success && !json.data?.changed) {
      setManuallyFixed((prev) => new Set(prev).add(6));
    }
  } catch (err) {
    console.error('[fix-density]', err);
  }
  
  setFixingDensity(false);
}
```

### 4. Insert Image/Table (TODO)

#### A. Insert Image
```typescript
async function insertImage() {
  if (!imgUrl.trim()) return;
  const alt = imgAlt.trim() || keyword;
  const html = `<figure style="margin:1.25rem 0;text-align:center">
    <img src="${imgUrl.trim()}" alt="${alt}" style="max-width:100%;border-radius:8px;display:inline-block" loading="lazy" />
    ${alt ? `<figcaption style="font-size:0.8rem;color:#6b7280;margin-top:0.4rem">${alt}</figcaption>` : ''}
  </figure>`;
  document.execCommand('insertHTML', false, html);
  contentRef.current?.focus();
  setImgUrl(''); 
  setImgAlt(''); 
  setShowImgModal(false);
  
  handleContentInput();
  await autoSaveAfterFix(); // ← Thêm dòng này
}
```

#### B. Insert Table
```typescript
async function insertTable() {
  const html = `<table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.875rem">
    <thead><tr>
      <th style="background:#f3f4f6;border:1px solid #e5e7eb;padding:8px 12px;text-align:left;font-weight:700">Tiêu đề cột 1</th>
      <th style="background:#f3f4f6;border:1px solid #e5e7eb;padding:8px 12px;text-align:left;font-weight:700">Tiêu đề cột 2</th>
      <th style="background:#f3f4f6;border:1px solid #e5e7eb;padding:8px 12px;text-align:left;font-weight:700">Tiêu đề cột 3</th>
    </tr></thead>
    <tbody>
      <tr><td style="border:1px solid #e5e7eb;padding:8px 12px">Nội dung</td><td style="border:1px solid #e5e7eb;padding:8px 12px">Nội dung</td><td style="border:1px solid #e5e7eb;padding:8px 12px">Nội dung</td></tr>
      <tr style="background:#f9fafb"><td style="border:1px solid #e5e7eb;padding:8px 12px">Nội dung</td><td style="border:1px solid #e5e7eb;padding:8px 12px">Nội dung</td><td style="border:1px solid #e5e7eb;padding:8px 12px">Nội dung</td></tr>
      <tr><td style="border:1px solid #e5e7eb;padding:8px 12px">Nội dung</td><td style="border:1px solid #e5e7eb;padding:8px 12px">Nội dung</td><td style="border:1px solid #e5e7eb;padding:8px 12px">Nội dung</td></tr>
    </tbody>
  </table><p></p>`;
  document.execCommand('insertHTML', false, html);
  contentRef.current?.focus();
  
  handleContentInput();
  await autoSaveAfterFix(); // ← Thêm dòng này
}
```

## Chiến Lược Auto-Save

### Khi Nào Auto-Save?

**✅ Nên Auto-Save:**
1. AI Fix apply (đã implement)
2. Insert internal/external link
3. Fix alt text
4. Fix keyword density (AI)
5. Insert image/table

**❌ Không Auto-Save:**
1. Edit text thủ công (user tự Ctrl+S)
2. Format text (bold, italic, align)
3. Undo/Redo
4. Find & Replace (user tự save sau)

### Tại Sao Không Tạo Version?

```typescript
createVersion: false  // ← Quan trọng!
```

**Lý do:**
- Auto-save là "incremental changes" nhỏ
- Tạo version chỉ khi user click "Save" (Ctrl+S)
- Tránh spam version table với quá nhiều snapshots
- Version chỉ cho "major edits" có ý nghĩa

### Version Strategy

```
User Action                    → createVersion?
─────────────────────────────────────────────
AI Fix apply                   → false (auto-save)
Insert link/image              → false (auto-save)
Fix SEO issues                 → false (auto-save)
Manual edit + Ctrl+S           → true  (manual save)
Before publish                 → true  (manual save)
```

## UI Feedback

### Silent Save (Hiện Tại)
```typescript
console.log('[Auto-save] Saved to database after fix');
```

**Ưu điểm:**
- Không làm phiền user
- Không block UI
- Chỉ log vào console

**Nhược điểm:**
- User không biết đã save chưa

### Optional: Show Toast (Tương Lai)

```typescript
// Thêm state
const [autoSaving, setAutoSaving] = useState(false);

async function autoSaveAfterFix() {
  setAutoSaving(true);
  // ... save logic ...
  setAutoSaving(false);
}

// UI indicator
{autoSaving && (
  <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
    💾 Đang lưu...
  </div>
)}
```

## Error Handling

### Graceful Degradation

```typescript
try {
  await autoSaveAfterFix();
} catch (err) {
  console.error('[Auto-save] Failed:', err);
  // Don't show error to user
  // They can manually save later with Ctrl+S
}
```

**Chiến lược:**
- Không crash app nếu save lỗi
- Không hiện error popup (annoying)
- User vẫn có thể manual save (Ctrl+S)
- localStorage vẫn là backup

## Testing

### Test Cases

1. **AI Fix Apply:**
   - Apply AI fix → Check DB updated
   - Apply multiple fixes → Check all saved
   - Network error → Should not crash

2. **SEO Fixes:**
   - Insert internal link → Check DB
   - Insert external link → Check DB
   - Fix alt text → Check DB
   - Fix density → Check DB

3. **Insert Content:**
   - Insert image → Check DB
   - Insert table → Check DB

4. **Edge Cases:**
   - No articleId → Should not save
   - No network → Should fail gracefully
   - Concurrent saves → Should queue

### Manual Testing

```bash
# 1. Open step4 editor
# 2. Open browser DevTools → Network tab
# 3. Apply AI fix
# 4. Check POST /api/articles/{id}/save
# 5. Check database:

SELECT id, title, wordCount, updatedAt 
FROM "Article" 
WHERE id = X 
ORDER BY updatedAt DESC;
```

## Implementation Priority

### Phase 1: Critical (Đã xong) ✅
- [x] Auto-save helper function
- [x] AI Fix auto-save

### Phase 2: Important (Cần làm)
- [ ] Insert internal link auto-save
- [ ] Insert external link auto-save
- [ ] Fix alt text auto-save
- [ ] Fix density auto-save

### Phase 3: Nice to Have
- [ ] Insert image auto-save
- [ ] Insert table auto-save
- [ ] Toast notification
- [ ] Save queue for concurrent edits

## Code Changes Summary

### Files Modified
- ✅ `web/app/viet-bai-thong-minh/step4/page.tsx`
  - Added `autoSaveAfterFix()` helper
  - Updated `handleApplyAIFix()` to auto-save

### Files Need Update
- ⏳ `web/app/viet-bai-thong-minh/step4/page.tsx`
  - Update `insertInternalLink()`
  - Update `insertExternalLink()`
  - Update `fixAltText()`
  - Update `callFixDensity()`
  - Update `insertImage()`
  - Update `insertTable()`

## Conclusion

Auto-save sau khi fix đảm bảo:
- ✅ Không mất dữ liệu khi user quên save
- ✅ Database luôn sync với editor
- ✅ Version history clean (không spam)
- ✅ UX mượt mà (silent save)

**Next Step:** Implement auto-save cho các SEO fix functions còn lại.

---

**Ngày cập nhật:** 9 tháng 5, 2026  
**Trạng thái:** Phase 1 hoàn thành, Phase 2 đang chờ implement
