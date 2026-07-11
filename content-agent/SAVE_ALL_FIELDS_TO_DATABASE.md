# ✅ Save All Step4 Fields to Database

## 🎯 Requirement
Đảm bảo **TẤT CẢ** thông tin trên màn hình Step4 được lưu vào database, để khi reload trang thì hiển thị đầy đủ như trước khi reload.

---

## 📊 Fields Being Saved

### Before (❌ Incomplete):
```typescript
{
  title: editTitle,
  htmlContent: updatedHtml,
  metaDescription: result.metaDescription,
  wordCount: wordCountLive,
  createVersion: true,
}
```

### After (✅ Complete):
```typescript
{
  title: editTitle,                          // ✅ Tiêu đề
  htmlContent: updatedHtml,                  // ✅ Nội dung HTML
  metaDescription: result.metaDescription,   // ✅ Meta description
  slug: currentSlug,                         // ✅ URL slug
  wordCount: wordCountLive,                  // ✅ Số từ
  seoScore: seoScore,                        // ✅ SEO Score (0-100)
  seoChecks: seoChecks,                      // ✅ SEO checks (JSON)
  humannessScore: result.humanness_score,    // ✅ Humanness score (0-100)
  scoreBreakdown: result.scoreBreakdown,     // ✅ Score breakdown (JSON)
  secondaryKeywords: secondaryKeywords,      // ✅ Từ khóa phụ (array)
  createVersion: true,                       // ✅ Tạo version history
}
```

---

## 🗄️ Database Schema

All fields already exist in `Article` model:

```prisma
model Article {
  // ... other fields ...
  
  // Content
  htmlContent       String    @db.Text
  wordCount         Int       @default(0)
  
  // SEO & Meta
  metaDescription   String?   @db.VarChar(500)
  slug              String?   @db.VarChar(200)
  seoScore          Int?                             // ✅ 0-100
  seoChecks         Json?     @db.JsonB              // ✅ Detailed SEO checks
  
  // AI Quality Scores
  humannessScore    Int?                             // ✅ 0-100
  scoreBreakdown    Json?     @db.JsonB              // ✅ Score breakdown
  
  // Keywords
  secondaryKeywords String[]                         // ✅ Array of keywords
}
```

---

## 📝 Changes Made

### 1. Updated `handleSave()` in Step4

**File:** `web/app/viet-bai-thong-minh/step4/page.tsx`

```typescript
const handleSave = useCallback(async () => {
  if (!result || !contentRef.current) return;
  
  const updatedHtml = contentRef.current.innerHTML;
  const updated = { ...result, html: updatedHtml, title: editTitle };
  
  // Save to localStorage
  localStorage.setItem('pipeline_result', JSON.stringify(updated));
  setResult(updated);
  
  // Save to database
  if (articleId) {
    await fetch(`/api/articles/${articleId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        htmlContent: updatedHtml,
        metaDescription: result.metaDescription,
        slug: currentSlug || undefined,
        wordCount: wordCountLive,
        seoScore: seoScore,                    // ✅ NEW
        seoChecks: seoChecks,                  // ✅ NEW
        humannessScore: result.humanness_score, // ✅ NEW
        scoreBreakdown: result.scoreBreakdown, // ✅ NEW
        secondaryKeywords: secondaryKeywords,  // ✅ NEW
        createVersion: true,
      }),
    });
  }
  
  setSaved(true);
  setTimeout(() => setSaved(false), 2000);
}, [result, editTitle, articleId, wordCountLive, currentSlug, seoScore, seoChecks, secondaryKeywords]);
```

### 2. Updated API Interface

**File:** `web/app/api/articles/[id]/save/route.ts`

```typescript
interface SaveRequest {
  title: string;
  htmlContent: string;
  metaDescription?: string;
  slug?: string;
  wordCount?: number;
  seoScore?: number;              // ✅ NEW
  seoChecks?: any;                // ✅ NEW
  humannessScore?: number;        // ✅ NEW
  scoreBreakdown?: any;           // ✅ NEW
  secondaryKeywords?: string[];   // ✅ NEW
  createVersion?: boolean;
}
```

### 3. Updated Database Save Logic

```typescript
const updated = await prisma.article.update({
  where: { id: articleId },
  data: {
    title,
    htmlContent,
    ...(metaDescription !== undefined && { metaDescription }),
    ...(slug !== undefined && { slug }),
    ...(wordCount !== undefined && { wordCount }),
    ...(seoScore !== undefined && { seoScore }),              // ✅ NEW
    ...(seoChecks !== undefined && { seoChecks }),            // ✅ NEW
    ...(humannessScore !== undefined && { humannessScore }),  // ✅ NEW
    ...(scoreBreakdown !== undefined && { scoreBreakdown }),  // ✅ NEW
    ...(secondaryKeywords !== undefined && { secondaryKeywords }), // ✅ NEW
  },
});
```

### 4. Updated Load Logic

**File:** `web/app/viet-bai-thong-minh/step4/page.tsx`

```typescript
// Load from database
const article = json.data;
setArticleId(article.id);

const r: PipelineResult = {
  html: article.htmlContent,
  humanness_score: article.humannessScore || 0,  // ✅ Load from DB
  decision: article.humannessScore >= 76 ? 'PUBLISH' : 
            article.humannessScore >= 60 ? 'REVIEW' : 'REWRITE',
  title: article.title,
  wordCount: article.wordCount || 0,
  metaDescription: article.metaDescription || '',
  scoreBreakdown: article.scoreBreakdown || {    // ✅ Load from DB
    language_natural: 0,
    structure: 0,
    eeat_signals: 0,
    engagement: 0,
  },
};

setResult(r);
setEditTitle(article.title);
setWordCountLive(article.wordCount || 0);

// Load slug
if (article.slug) {
  setCurrentSlug(article.slug);
  setSuggestedSlug(article.slug);
}

// Load keywords
const kw = article.keyword || '';
const secKws: string[] = article.secondaryKeywords || []; // ✅ Load from DB
setKeyword(kw);
setSecondaryKeywords(secKws);
setKwTags([kw, ...secKws].filter(Boolean));
```

---

## 🔄 Complete Save/Load Cycle

### Save Flow:
```
User clicks "Save"
  ↓
handleSave() collects all data:
  - title
  - htmlContent
  - metaDescription
  - slug
  - wordCount
  - seoScore
  - seoChecks
  - humannessScore
  - scoreBreakdown
  - secondaryKeywords
  ↓
POST /api/articles/:id/save
  ↓
Prisma updates database
  ↓
Show "Đã lưu" notification
```

### Load Flow:
```
Page loads
  ↓
GET /api/articles/by-runid/:runId
  ↓
Receive article data from database
  ↓
Restore all fields:
  - title → setEditTitle()
  - htmlContent → contentRef.innerHTML
  - metaDescription → result.metaDescription
  - slug → setCurrentSlug()
  - wordCount → setWordCountLive()
  - humannessScore → result.humanness_score
  - scoreBreakdown → result.scoreBreakdown
  - secondaryKeywords → setSecondaryKeywords()
  ↓
UI displays exactly as before
```

---

## ✅ What Gets Saved Now

| Field | Type | Example | Saved? |
|-------|------|---------|--------|
| Title | String | "Giường ngủ pallet..." | ✅ |
| HTML Content | Text | `<h2>...</h2><p>...</p>` | ✅ |
| Meta Description | String | "Bạn cần mua giường..." | ✅ |
| Slug | String | "giuong-ngu-pallet-sat" | ✅ |
| Word Count | Number | 905 | ✅ |
| **SEO Score** | Number | 85 | ✅ |
| **SEO Checks** | JSON | `[{label, pass, fixable}]` | ✅ |
| **Humanness Score** | Number | 71 | ✅ |
| **Score Breakdown** | JSON | `{language_natural: 85, ...}` | ✅ |
| **Secondary Keywords** | Array | `["giá giường", "giường sắt"]` | ✅ |

---

## 🧪 Testing

### Test Scenario:

1. **Open Step4** with an article
2. **Make changes:**
   - Edit title
   - Edit content
   - Apply AI fixes
   - Apply SEO fixes
   - Fix slug
3. **Click "Save"**
4. **Reload page (F5)**
5. **Verify:**
   - ✅ Title unchanged
   - ✅ Content unchanged
   - ✅ SEO Score shows correct value (85%)
   - ✅ Humanness Score shows correct value (71%)
   - ✅ SEO checks show correct pass/fail states
   - ✅ Secondary keywords display correctly
   - ✅ Slug is preserved

---

## 📊 Data Persistence

### localStorage (Backup):
```json
{
  "html": "<h2>...</h2>",
  "title": "Giường ngủ pallet...",
  "humanness_score": 71,
  "wordCount": 905,
  "metaDescription": "...",
  "scoreBreakdown": {
    "language_natural": 85,
    "structure": 75,
    "eeat_signals": 60,
    "engagement": 70
  }
}
```

### Database (Persistent):
```json
{
  "id": "uuid",
  "title": "Giường ngủ pallet...",
  "htmlContent": "<h2>...</h2>",
  "metaDescription": "...",
  "slug": "giuong-ngu-pallet-sat",
  "wordCount": 905,
  "seoScore": 85,
  "seoChecks": [{...}],
  "humannessScore": 71,
  "scoreBreakdown": {...},
  "secondaryKeywords": ["giá giường", "giường sắt"]
}
```

---

## 🎯 Benefits

1. ✅ **Complete Data Persistence**
   - Không mất dữ liệu khi reload
   - Tất cả scores và checks được giữ nguyên

2. ✅ **Accurate State Restoration**
   - UI hiển thị chính xác như trước khi reload
   - SEO panel shows correct scores
   - AI panel shows correct humanness score

3. ✅ **Version History**
   - Mỗi lần save tạo version mới
   - Có thể rollback về version cũ

4. ✅ **Dashboard Integration**
   - Dashboard có thể hiển thị SEO score
   - Dashboard có thể filter theo humanness score
   - Dashboard có thể search theo secondary keywords

---

## 🎉 Result

**Status:** ✅ **COMPLETED**

Tất cả thông tin trên màn hình Step4 giờ đây được lưu đầy đủ vào database:
- ✅ Content & Meta
- ✅ SEO Score & Checks
- ✅ Humanness Score & Breakdown
- ✅ Secondary Keywords
- ✅ Slug

Reload trang → Mọi thứ vẫn nguyên như cũ! 🎊

---

**Updated by:** Kiro AI Assistant  
**Date:** 2025-01-09  
**Issue:** Not all Step4 data was being saved to database  
**Solution:** Save all fields including scores, checks, and keywords
