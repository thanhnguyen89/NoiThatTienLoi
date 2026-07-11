# VIET TINH GON — Hướng dẫn Implementation Chi Tiết

> Tính năng: **Viết tinh gọn** — Viết ít, nhưng chất  
> Mục tiêu: Tốt hơn AIKTP ở tất cả các điểm  
> Dành cho developer đọc và implement từ đầu đến cuối  
> Ngày tạo: 2026-05-20

---

## 0. Triết lý thiết kế

### Tại sao tốt hơn AIKTP?

| Tiêu chí | AIKTP | Hệ thống này |
|---|---|---|
| Brand context | ❌ Không có | ✅ Inject brand-guideline, product-catalog, persona |
| Humanness Score | ❌ Không có | ✅ Chấm điểm 0–100, rule PUBLISH/REVIEW/REWRITE |
| Forbidden words | ❌ Không có | ✅ Danh sách 40+ từ cấm AI-style |
| Outline preview/edit | ✅ Có | ✅ Có + thêm Secondary keyword AI suggest |
| Streaming output | ✅ Có | ✅ Có SSE + live word count |
| Internal link suggest | ❌ Không có | ✅ Từ bài đã publish trong DB |
| SEO metrics hiển thị | Cơ bản | ✅ RPP, keyword density, Humanness Score |
| Multi-provider AI | ❌ Chỉ 1 model | ✅ Gemini Flash, Gemini Pro, GPT-4o, Claude |
| Google Index | ❌ Không có | ✅ Gọi Search Console API sau publish |
| Auto-save draft | ❌ Không có | ✅ LocalStorage + DB save |

### Phạm vi "tinh gọn"

- Bài viết: **800–1500 từ** (không phải 3000–5000 từ như /viet-theo-tu-khoa)
- Outline: **4–8 heading H2**, không có H3 con sâu
- Mỗi H2: **1–2 đoạn văn** (60–120 từ), không dài dòng
- Mục tiêu: Bài đọc trong **5–7 phút**, đủ thông tin, không rác

---

## 1. Kiến trúc tổng quan

### 1.1 Pages (3 pages mới)

```
/viet-tinh-gon                    ← Stage 1: Config
/viet-tinh-gon/outline            ← Stage 2: Outline preview + edit
/viet-tinh-gon/generate           ← Stage 3: Streaming write + Stage 4: Edit & Publish
```

### 1.2 API Routes (6 routes mới)

```
POST /api/tinh-gon/suggest-keywords    ← AI gợi ý từ khóa phụ
POST /api/tinh-gon/outline             ← Tạo outline dựa config
POST /api/tinh-gon/stream              ← SSE streaming viết bài
POST /api/tinh-gon/humanness           ← Chấm điểm Humanness Score
POST /api/tinh-gon/ai-edit             ← Chỉnh sửa đoạn văn bằng AI
POST /api/tinh-gon/internal-links      ← Gợi ý internal link từ DB
```

### 1.3 State management — dùng URL params + sessionStorage

Không dùng Zustand hay Redux. Data flow đơn giản:

```
Stage 1 → sessionStorage.set('tg_config', JSON)
Stage 2 → sessionStorage.set('tg_outline', JSON)
Stage 3 → sessionStorage.get cả hai → gọi API → render
```

### 1.4 File structure

```
web/
├── app/
│   └── viet-tinh-gon/
│       ├── page.tsx                  ← Stage 1: Config
│       ├── outline/
│       │   └── page.tsx              ← Stage 2: Outline editor
│       └── generate/
│           └── page.tsx              ← Stage 3+4: Stream + Edit
├── app/api/tinh-gon/
│   ├── suggest-keywords/route.ts
│   ├── outline/route.ts
│   ├── stream/route.ts
│   ├── humanness/route.ts
│   ├── ai-edit/route.ts
│   └── internal-links/route.ts
└── components/tinh-gon/
    ├── ConfigForm.tsx
    ├── OutlineEditor.tsx
    ├── StreamingWriter.tsx
    ├── HumannessPanel.tsx
    ├── KeywordDensityBar.tsx
    └── InternalLinkSuggest.tsx
```

---

## 2. Stage 1 — /viet-tinh-gon (Config)

> ⚠️ **Design System:** Toàn bộ UI phải dùng đúng class của dự án hiện tại — **KHÔNG dùng `indigo`**, dùng `blue`. Layout wrapper phải là `h-full p-6 overflow-y-auto` (không dùng `max-w-2xl mx-auto`). Card phải là `bg-white rounded-lg shadow-sm p-6`. Xem `web/app/viet-bai-thong-minh/page.tsx` để tham chiếu.

### 2.1 UI Layout

```
┌─ Header card (bg-white rounded-lg shadow-sm) ────────────────┐
│  Viết tinh gọn              [📖 Cách sử dụng]               │
│  Bước 1 / 3 — Nhập từ khóa & cấu hình                       │
│  ── ── ──  (3 progress bars: blue / gray / gray)             │
└──────────────────────────────────────────────────────────────┘

┌─ Form card (bg-white rounded-lg shadow-sm) ──────────────────┐
│                                                              │
│  🤖 AI Model                                                 │
│  [✨Gemini] [🤖ChatGPT] [⚡Grok] [🧠Claude]  ← 4 cards grid │
│                                                              │
│  Từ khóa hoặc chủ đề *                                       │
│  [giường sắt hộp 1m2                              ] textarea │
│                                                              │
│  📝 Loại bài viết                                            │
│  [🔍Review] [🤔Chọn mua] [⚖️So sánh] [❓FAQ]  ← card grid  │
│  [📋Listicle] [💡Vấn đề] [👣Bước] [📖Story]                 │
│  → Mô tả ngắn loại đang chọn (bg-blue-50)                   │
│                                                              │
│  Độ dài mục tiêu          Ngôn ngữ                          │
│  [select ▾]               [select ▾]                         │
│                                                              │
│  ▾ Từ khóa phụ (AI gợi ý) ← accordion                       │
│    [✨ AI gợi ý]                                             │
│    ☑tag ☑tag ☐tag ...                                        │
│                                                              │
│  ▾ Ghi chú thêm ← accordion                                 │
│                                                              │
│  Pipeline sẽ tạo outline (~10 giây)    [Tiếp theo →]        │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 TypeScript — page.tsx

```tsx
// web/app/viet-tinh-gon/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 10 loại bài — map với prompt trong /api/tinh-gon/outline/_outline-prompts.ts
const OUTLINE_TYPES = [
  { value: 'review_product',   icon: '🔍', label: 'Review sản phẩm',      note: 'Đánh giá 1 sản phẩm cụ thể: thông số, ưu/nhược, có nên mua',     example: '"Đánh giá giường sắt MQ-01: Review thực tế từ xưởng"' },
  { value: 'how_to_choose',    icon: '🤔', label: 'Hướng dẫn chọn mua',   note: 'Tiêu chí chọn mua — match nhu cầu với từng loại sản phẩm',        example: '"Cách chọn giường sắt đúng kích thước phòng nhỏ"' },
  { value: 'compare',          icon: '⚖️', label: 'So sánh A vs B',        note: 'So sánh 2 loại/chất liệu, có bảng + kết luận rõ ràng',            example: '"Giường sắt vs giường gỗ: Loại nào hợp gia đình trẻ?"' },
  { value: 'faq',              icon: '❓', label: 'Hỏi đáp FAQ',           note: '5–6 câu hỏi thường gặp + trả lời ngắn gọn, cụ thể',             example: '"Giường sắt hộp bền bao lâu? 10 câu hỏi thường gặp"' },
  { value: 'listicle',         icon: '📋', label: 'Top N danh sách',       note: 'Top 5–7 sản phẩm/lựa chọn, có bảng so sánh nhanh',              example: '"Top 5 giường sắt giá dưới 2 triệu đáng mua 2025"' },
  { value: 'problem_solution', icon: '💡', label: 'Vấn đề – Giải pháp',   note: 'Nỗi đau → nguyên nhân → giải pháp → CTA thực tế',               example: '"Giường sắt bị ọp ẹp: Nguyên nhân và cách khắc phục"' },
  { value: 'step_guide',       icon: '👣', label: 'Hướng dẫn từng bước',  note: 'Outline dạng Bước 1 → 2 → 3, có checklist cuối',                 example: '"Cách lắp giường sắt 2 tầng: Hướng dẫn chi tiết"' },
  { value: 'story_brand',      icon: '📖', label: 'Story thương hiệu',    note: 'Origin story → USP → xưởng → cam kết → CTA',                     example: '"Nội Thất Minh Quân: Từ xưởng nhỏ đến 10.000 đơn hàng"' },
  { value: 'use_case',         icon: '🏠', label: 'Trường hợp sử dụng',   note: 'Phù hợp không gian nào? Phòng nhỏ / sinh viên / homestay…',      example: '"Giường sắt 1m2 hợp phòng trọ nào? 4 trường hợp thực tế"' },
  { value: 'buying_guide',     icon: '🛒', label: 'Cẩm nang mua sắm',    note: 'Bảng giá phân khúc, tiêu chí, checklist trước khi đặt hàng',     example: '"Cẩm nang mua giường sắt 2025: Giá, chất liệu, kích thước"' },
];

// ⚠️ Phải giữ đồng bộ với AI_MODELS trong viet-bai-thong-minh/page.tsx
const AI_MODELS = [
  { id: 'gemini-flash', label: 'Gemini',   icon: '✨', sub: 'Google · Mặc định', color: 'border-blue-500 bg-blue-50 text-blue-700',   inactive: 'border-gray-200 hover:border-blue-300 text-gray-700' },
  { id: 'gpt-4o',       label: 'ChatGPT',  icon: '🤖', sub: 'OpenAI · Cần key',  color: 'border-green-500 bg-green-50 text-green-700', inactive: 'border-gray-200 hover:border-green-300 text-gray-700' },
  { id: 'grok',         label: 'Grok',     icon: '⚡', sub: 'xAI · Cần key',     color: 'border-orange-500 bg-orange-50 text-orange-700', inactive: 'border-gray-200 hover:border-orange-300 text-gray-700' },
  { id: 'claude',       label: 'Claude',   icon: '🧠', sub: 'Anthropic · Cần key', color: 'border-purple-500 bg-purple-50 text-purple-700', inactive: 'border-gray-200 hover:border-purple-300 text-gray-700' },
];

const TARGET_LENGTHS = [
  { value: 800,  label: 'Tinh gọn (~800 từ)',  badge: 'Ngắn' },
  { value: 1000, label: 'Chuẩn (~1.000 từ)',   badge: '' },
  { value: 1200, label: 'Đủ đầy (~1.200 từ)',  badge: 'Phổ biến' },
  { value: 1500, label: 'Chi tiết (~1.500 từ)', badge: '' },
];

interface TinhGonConfig {
  keyword: string;
  outlineType: string;
  language: string;
  model: string;
  targetLength: number;
  secondaryKeywords: string[];
  notes: string;
}

export default function VietTinhGonPage() {
  const router = useRouter();

  useEffect(() => { document.title = 'Viết Tinh Gọn - Content Agent'; }, []);

  const [config, setConfig] = useState<TinhGonConfig>({
    keyword: '',
    outlineType: 'review_product',
    language: 'Vietnamese',
    model: 'gemini-flash',
    targetLength: 1000,
    secondaryKeywords: [],
    notes: '',
  });
  const [error, setError]               = useState('');
  const [suggestedKw, setSuggestedKw]   = useState<string[]>([]);
  const [loadingKw, setLoadingKw]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [showKwPanel, setShowKwPanel]   = useState(false);
  const [showNotes, setShowNotes]       = useState(false);

  async function suggestKeywords() {
    if (!config.keyword) return;
    setLoadingKw(true);
    try {
      const res = await fetch('/api/tinh-gon/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: config.keyword, count: 8 }),
      });
      const data = await res.json();
      setSuggestedKw(data.keywords || []);
      setShowKwPanel(true);
    } finally {
      setLoadingKw(false);
    }
  }

  function toggleSecondaryKw(kw: string) {
    setConfig(prev => ({
      ...prev,
      secondaryKeywords: prev.secondaryKeywords.includes(kw)
        ? prev.secondaryKeywords.filter(k => k !== kw)
        : [...prev.secondaryKeywords, kw],
    }));
  }

  async function handleNext() {
    if (!config.keyword.trim()) { setError('Vui lòng nhập từ khóa'); return; }
    if (config.keyword.trim().length < 3) { setError('Từ khóa quá ngắn'); return; }
    setError('');
    setLoading(true);
    sessionStorage.setItem('tg_config', JSON.stringify(config));
    router.push('/viet-tinh-gon/outline');
  }

  const selectedType = OUTLINE_TYPES.find(t => t.value === config.outlineType);

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full mx-auto">

        {/* Header card — dùng đúng pattern của viet-bai-thong-minh */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Viết tinh gọn</h1>
              <p className="text-sm text-blue-600 mt-1">Bước 1 / 3 — Nhập từ khóa & cấu hình</p>
            </div>
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              📖 Cách sử dụng
            </button>
          </div>
          {/* 3 step progress bars */}
          <div className="mt-4 flex gap-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s === 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">

          {/* AI Model — 4 cards giống viet-bai-thong-minh */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn AI Model</label>
            <div className="grid grid-cols-4 gap-3">
              {AI_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setConfig(p => ({ ...p, model: m.id }))}
                  className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all text-center ${
                    config.model === m.id ? m.color : m.inactive
                  }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <span className="text-sm font-semibold">{m.label}</span>
                  <span className={`text-xs leading-tight ${config.model === m.id ? 'opacity-80' : 'text-gray-400'}`}>
                    {m.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Keyword input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Từ khóa hoặc chủ đề bài viết
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={config.keyword}
              onChange={(e) => { setConfig(p => ({ ...p, keyword: e.target.value })); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNext(); } }}
              placeholder="Ví dụ: giường sắt hộp 1m2, tủ quần áo sắt giá rẻ..."
              rows={2}
              className={`w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                error ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* Loại bài viết — card grid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại bài viết</label>
            <div className="grid grid-cols-5 gap-2">
              {OUTLINE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setConfig(p => ({ ...p, outlineType: t.value }))}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 transition-all text-center ${
                    config.outlineType === t.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 text-gray-600'
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-xs font-semibold leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
            {/* Mô tả loại đang chọn — giống pattern trong viet-bai-thong-minh */}
            {selectedType && (
              <div className="mt-2 px-3 py-2 bg-blue-50 rounded-lg flex gap-2">
                <span className="text-base">{selectedType.icon}</span>
                <div>
                  <p className="text-xs text-blue-700">{selectedType.note}</p>
                  <p className="text-xs text-blue-500 italic mt-0.5">{selectedType.example}</p>
                </div>
              </div>
            )}
          </div>

          {/* Độ dài + Ngôn ngữ — 2 col */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Độ dài bài viết</label>
              <select
                value={config.targetLength}
                onChange={(e) => setConfig(p => ({ ...p, targetLength: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TARGET_LENGTHS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}{l.badge ? ` — ${l.badge}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngôn ngữ</label>
              <select
                value={config.language}
                onChange={(e) => setConfig(p => ({ ...p, language: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Vietnamese">🇻🇳 Tiếng Việt</option>
                <option value="English">🇬🇧 English</option>
              </select>
            </div>
          </div>

          {/* Từ khóa phụ — accordion */}
          <div className="border border-blue-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowKwPanel(!showKwPanel)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                🔗 Từ khóa phụ (AI gợi ý)
                {config.secondaryKeywords.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {config.secondaryKeywords.length} đã chọn
                  </span>
                )}
              </span>
              <span className={`text-gray-400 transition-transform duration-200 ${showKwPanel ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showKwPanel && (
              <div className="border-t border-blue-100 p-4 bg-blue-50 space-y-3">
                <button
                  onClick={suggestKeywords}
                  disabled={!config.keyword || loadingKw}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 rounded-lg text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-40 transition"
                >
                  {loadingKw ? '⏳ Đang gợi ý...' : '✨ AI gợi ý từ khóa phụ'}
                </button>
                {suggestedKw.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {suggestedKw.map(kw => (
                      <button
                        key={kw}
                        onClick={() => toggleSecondaryKw(kw)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          config.secondaryKeywords.includes(kw)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ghi chú — accordion */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>📌 Ghi chú thêm <span className="text-gray-400 font-normal">(không bắt buộc)</span></span>
              <span className={`text-gray-400 transition-transform duration-200 ${showNotes ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showNotes && (
              <div className="border-t border-gray-100 p-3 bg-gray-50">
                <textarea
                  value={config.notes}
                  onChange={e => setConfig(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Ví dụ: nhấn mạnh giá xưởng, khung 1.4mm, giao HCM 2–4h, bảo hành 12 tháng..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
            )}
          </div>

          {/* Actions — giống pattern trong viet-bai-thong-minh */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              AI sẽ tạo outline (~10 giây), bạn xem xét trước khi viết
            </p>
            <button
              onClick={handleNext}
              disabled={loading || !config.keyword.trim()}
              className="px-8 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            >
              <span>Tiếp theo</span>
              <span>→</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
```

---

## 3. Stage 2 — /viet-tinh-gon/outline (Outline Editor)

### 3.1 UI Layout

```
┌──────────────────────────────────────────────────────────┐
│ ← Quay lại    OUTLINE — giường sắt hộp 1m2    [Viết →] │
│ ─────────────────────────────────────────────────────── │
│                                                          │
│  📄 TIÊU ĐỀ BÀI (chỉnh sửa được)                       │
│  [Giường Sắt Hộp 1m2: Review Chi Tiết + Bảng Giá 2025] │
│                                                          │
│  📋 OUTLINE  [+ Thêm mục]  [🔄 Tạo lại]                │
│  ─────────────────────────────────────────────────────  │
│  H2: Giường sắt hộp 1m2 là gì?              [✏️] [🗑]   │
│      ↳ Giải thích cấu trúc hộp, khác gì thanh tròn     │
│  H2: Kích thước & thông số kỹ thuật          [✏️] [🗑]  │
│      ↳ Bảng kích thước 1m, 1m2, 1m4, 1m6, 1m8          │
│  H2: Ưu điểm nổi bật                         [✏️] [🗑]  │
│      ↳ Khung dày 1.4mm, tải 200kg, bảo hành 12 tháng   │
│  H2: Giá bán & nơi mua                       [✏️] [🗑]  │
│      ↳ Bảng giá từ Minh Quân, link đặt hàng             │
│  H2: Câu hỏi thường gặp                      [✏️] [🗑]  │
│      ↳ FAQ 5 câu                                        │
│                                                          │
│  📊 Meta:  5 H2 · ~1000 từ · Keyword density ~1.2%     │
│                                                          │
│  [→ Viết bài]                                           │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Data types

```typescript
// Types dùng chung
interface OutlineSection {
  id: string           // uuid
  heading: string      // Text H2
  description: string  // Mô tả ngắn về nội dung section (dùng cho AI viết)
  targetWords: number  // Số từ mục tiêu cho section này
}

interface OutlineData {
  title: string
  metaDescription: string
  sections: OutlineSection[]
  estimatedWordCount: number
  keywordDensityTarget: number
}
```

### 3.3 TypeScript — outline/page.tsx

> ⚠️ Trang này dùng loading screen giống `viet-bai-thong-minh` (spinner + card trắng giữa màn hình), **không** dùng `animate-pulse`. Header card có progress bar bước 2/3.

```tsx
// web/app/viet-tinh-gon/outline/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

interface OutlineSection {
  id: string;
  heading: string;
  description: string;
  targetWords: number;
}

interface OutlineData {
  title: string;
  metaDescription: string;
  sections: OutlineSection[];
  estimatedWordCount: number;
  keywordDensityTarget: number;
}

export default function OutlinePage() {
  const router = useRouter();
  const [config, setConfig]   = useState<any>(null);
  const [outline, setOutline] = useState<OutlineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Xem Outline - Content Agent';
    const savedConfig = sessionStorage.getItem('tg_config');
    if (!savedConfig) { router.push('/viet-tinh-gon'); return; }
    const cfg = JSON.parse(savedConfig);
    setConfig(cfg);
    generateOutline(cfg);
  }, []);

  async function generateOutline(cfg: any) {
    setLoading(true);
    try {
      const res = await fetch('/api/tinh-gon/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      const data: OutlineData = await res.json();
      setOutline(data);
      sessionStorage.setItem('tg_outline', JSON.stringify(data));
    } finally {
      setLoading(false);
    }
  }

  function saveOutline(updated: OutlineData) {
    setOutline(updated);
    sessionStorage.setItem('tg_outline', JSON.stringify(updated));
  }

  function addSection() {
    if (!outline) return;
    const newSection: OutlineSection = {
      id: uuidv4(),
      heading: 'Tiêu đề mới',
      description: 'Mô tả nội dung section này',
      targetWords: Math.floor(outline.estimatedWordCount / outline.sections.length),
    };
    saveOutline({ ...outline, sections: [...outline.sections, newSection] });
    setEditingId(newSection.id);
  }

  function deleteSection(id: string) {
    if (!outline) return;
    saveOutline({ ...outline, sections: outline.sections.filter(s => s.id !== id) });
  }

  function updateSection(id: string, changes: Partial<OutlineSection>) {
    if (!outline) return;
    saveOutline({ ...outline, sections: outline.sections.map(s => s.id === id ? { ...s, ...changes } : s) });
  }

  // ── Loading screen — dùng đúng pattern của viet-bai-thong-minh ───────────
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm p-10 w-full max-w-md text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Đang tạo outline</h2>
          <p className="text-sm text-gray-500 mb-4">Phân tích từ khóa và tạo cấu trúc bài viết...</p>
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm">
            <span>🔑</span>
            <span className="font-medium">{config?.keyword}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!outline) return null;

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full mx-auto">

        {/* Header card — bước 2/3 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700 mb-1 block">← Quay lại</button>
              <h1 className="text-2xl font-bold text-gray-900">Xem & chỉnh outline</h1>
              <p className="text-sm text-blue-600 mt-1">Bước 2 / 3 — Duyệt outline trước khi viết</p>
            </div>
            <button
              onClick={() => router.push('/viet-tinh-gon/generate')}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>Viết bài</span>
              <span>→</span>
            </button>
          </div>
          <div className="mt-4 flex gap-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        {/* Outline card */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">

          {/* Tiêu đề bài chỉnh sửa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">📄 Tiêu đề bài viết</label>
            <input
              type="text"
              value={outline.title}
              onChange={e => saveOutline({ ...outline, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">{outline.title.length} ký tự · Target: 50–60 ký tự</p>
          </div>

          {/* Meta description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">📋 Meta description</label>
            <textarea
              value={outline.metaDescription}
              onChange={e => saveOutline({ ...outline, metaDescription: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className={`text-xs mt-1 ${outline.metaDescription.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
              {outline.metaDescription.length}/160 ký tự
            </p>
          </div>

          {/* Sections */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">📋 Outline ({outline.sections.length} mục)</label>
              <div className="flex gap-2">
                <button
                  onClick={addSection}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  + Thêm mục
                </button>
                <button
                  onClick={() => generateOutline(config)}
                  className="text-xs px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  🔄 Tạo lại
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {outline.sections.map((section) => (
                <div key={section.id} className={`border rounded-lg p-4 transition-colors ${
                  editingId === section.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                  {editingId === section.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={section.heading}
                        onChange={e => updateSection(section.id, { heading: e.target.value })}
                        className="w-full font-semibold text-sm border-b border-blue-300 bg-transparent focus:outline-none py-1"
                        placeholder="Tiêu đề H2..."
                        autoFocus
                      />
                      <textarea
                        value={section.description}
                        onChange={e => updateSection(section.id, { description: e.target.value })}
                        rows={2}
                        className="w-full text-sm text-gray-600 border-b border-blue-200 bg-transparent focus:outline-none py-1 resize-none"
                        placeholder="Mô tả nội dung section này..."
                      />
                      <div className="flex items-center justify-between">
                        <input
                          type="number"
                          value={section.targetWords}
                          onChange={e => updateSection(section.id, { targetWords: Number(e.target.value) })}
                          className="w-24 text-xs border border-blue-200 rounded px-2 py-1 bg-white"
                          placeholder="Số từ"
                        />
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg"
                        >
                          Xong ✓
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-blue-500 shrink-0">H2</span>
                          <span className="text-sm font-semibold text-gray-800">{section.heading}</span>
                          <span className="text-xs text-gray-400 shrink-0">~{section.targetWords}từ</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{section.description}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => setEditingId(section.id)}
                          className="text-gray-400 hover:text-blue-600 text-sm p-1 rounded transition-colors"
                        >✏️</button>
                        <button
                          onClick={() => deleteSection(section.id)}
                          className="text-gray-400 hover:text-red-500 text-sm p-1 rounded transition-colors"
                        >🗑</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stats + Action */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div className="flex gap-4 text-xs text-gray-400">
              <span>{outline.sections.length} H2</span>
              <span>~{outline.estimatedWordCount} từ</span>
              <span>Density ~{outline.keywordDensityTarget}%</span>
            </div>
            <button
              onClick={() => router.push('/viet-tinh-gon/generate')}
              className="px-8 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>Viết bài</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Stage 3+4 — /viet-tinh-gon/generate (Streaming + Edit)

### 4.1 UI Layout — 2 cột

```
┌──────────────────────────────┬──────────────────────────┐
│  EDITOR (trái, 60%)          │  TOOLS (phải, 40%)       │
│  ────────────────────────    │  ─────────────────────── │
│  [Đang viết... live stream]  │  📊 Humanness Score      │
│                              │  ████████░░ 82/100       │
│  ## Giường Sắt Hộp 1m2 là…  │  → REVIEW                │
│  Lorem ipsum dolor sit...    │                          │
│                              │  📈 Keyword Density      │
│  (streaming text appears)    │  ██████░░░░ 1.1%         │
│                              │  Target: 1.0–1.5%        │
│                              │                          │
│                              │  🚫 Từ cấm phát hiện     │
│                              │  ○ Không có từ cấm       │
│                              │                          │
│                              │  🔗 Internal Links gợi ý │
│                              │  • Giường Sắt 1m4 ...   │
│                              │  • Tủ Quần Áo Sắt ...   │
│                              │                          │
│                              │  [📋 Copy HTML]          │
│                              │  [🖨 Publish WordPress]  │
└──────────────────────────────┴──────────────────────────┘
```

### 4.2 TypeScript — generate/page.tsx (cấu trúc, không viết full)

```tsx
// web/app/viet-tinh-gon/generate/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface GenerateState {
  status: 'idle' | 'streaming' | 'done' | 'error'
  html: string
  wordCount: number
  humannessScore: number | null
  humannessDecision: 'PUBLISH' | 'REVIEW' | 'REWRITE' | null
  keywordDensity: number | null
  forbiddenFound: string[]
  internalLinks: Array<{ title: string; url: string; relevance: number }>
}

export default function GeneratePage() {
  const router = useRouter()
  const [config, setConfig] = useState<any>(null)
  const [outline, setOutline] = useState<any>(null)
  const [state, setState] = useState<GenerateState>({
    status: 'idle',
    html: '',
    wordCount: 0,
    humannessScore: null,
    humannessDecision: null,
    keywordDensity: null,
    forbiddenFound: [],
    internalLinks: [],
  })
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cfg = sessionStorage.getItem('tg_config')
    const ol = sessionStorage.getItem('tg_outline')
    if (!cfg || !ol) {
      router.push('/viet-tinh-gon')
      return
    }
    setConfig(JSON.parse(cfg))
    setOutline(JSON.parse(ol))
  }, [])

  useEffect(() => {
    if (config && outline) {
      startStreaming()
    }
  }, [config, outline])

  async function startStreaming() {
    setState(prev => ({ ...prev, status: 'streaming', html: '' }))

    const response = await fetch('/api/tinh-gon/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, outline }),
    })

    if (!response.body) return

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'chunk') {
              accumulated += data.content
              setState(prev => ({
                ...prev,
                html: accumulated,
                wordCount: data.wordCount || prev.wordCount,
              }))
            } else if (data.type === 'done') {
              setState(prev => ({
                ...prev,
                status: 'done',
                humannessScore: data.humannessScore,
                humannessDecision: data.decision,
                keywordDensity: data.keywordDensity,
                forbiddenFound: data.forbiddenFound || [],
              }))
              // Sau khi done, fetch internal links
              fetchInternalLinks(accumulated, config.keyword)
            }
          } catch {}
        }
      }
    }
  }

  async function fetchInternalLinks(html: string, keyword: string) {
    const res = await fetch('/api/tinh-gon/internal-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, keyword }),
    })
    const data = await res.json()
    setState(prev => ({ ...prev, internalLinks: data.links || [] }))
  }

  // ... render JSX với layout 2 cột
}
```

---

## 5. API Routes — Implementation

### 5.1 POST /api/tinh-gon/suggest-keywords

**Chức năng:** Gọi AI trả về 6–8 từ khóa phụ liên quan

```typescript
// web/app/api/tinh-gon/suggest-keywords/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { buildGeminiModel } from '../pipeline/_gemini'  // tái sử dụng

export async function POST(req: NextRequest) {
  const { keyword, count = 8 } = await req.json()

  const model = buildGeminiModel('gemini-flash')

  const prompt = `
Bạn là chuyên gia SEO nội thất Việt Nam.
Cho từ khóa chính: "${keyword}"

Hãy gợi ý ${count} từ khóa phụ (secondary keywords) phù hợp để viết bài SEO.

Yêu cầu:
- Từ khóa phải liên quan trực tiếp đến sản phẩm/chủ đề
- Ưu tiên từ khóa long-tail, có search intent rõ ràng
- Không trùng với từ khóa chính
- Viết tiếng Việt tự nhiên

Trả về JSON format:
{ "keywords": ["từ khóa 1", "từ khóa 2", ...] }
`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  
  // Parse JSON từ response
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ keywords: [] })
  
  const data = JSON.parse(match[0])
  return NextResponse.json(data)
}
```

### 5.2 POST /api/tinh-gon/outline

**Chức năng:** Tạo outline dựa trên config — QUAN TRỌNG, xem phần 6 để biết prompt cho từng loại

```typescript
// web/app/api/tinh-gon/outline/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { buildGeminiModel } from '../pipeline/_gemini'
import { buildBrandPrompt } from '../pipeline/_context'
import { OUTLINE_PROMPTS } from './_outline-prompts'  // xem phần 6
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const config = await req.json()
  const { keyword, outlineType, targetLength, secondaryKeywords, notes, language } = config

  const brandContext = await buildBrandPrompt()
  const outlinePromptTemplate = OUTLINE_PROMPTS[outlineType] || OUTLINE_PROMPTS['review_product']

  const prompt = `
${brandContext}

---
## YÊU CẦU TẠO OUTLINE

Từ khóa chính: "${keyword}"
${secondaryKeywords?.length ? `Từ khóa phụ: ${secondaryKeywords.join(', ')}` : ''}
${notes ? `Ghi chú: ${notes}` : ''}
Độ dài mục tiêu: ~${targetLength} từ
Ngôn ngữ: ${language === 'vi' ? 'Tiếng Việt' : 'English'}

Loại outline: ${outlineType}

${outlinePromptTemplate}

---
## OUTPUT FORMAT (JSON nghiêm ngặt)

{
  "title": "Tiêu đề bài viết hấp dẫn, có từ khóa chính",
  "metaDescription": "Mô tả SEO 150-160 ký tự",
  "sections": [
    {
      "id": "uuid-here",
      "heading": "Tiêu đề H2 rõ ràng",
      "description": "Mô tả ngắn nội dung section: viết gì, bao gồm gì (2-3 câu)",
      "targetWords": 150
    }
  ],
  "estimatedWordCount": ${targetLength},
  "keywordDensityTarget": 1.2
}

Lưu ý:
- Số lượng sections: ${targetLength <= 800 ? '4–5' : targetLength <= 1000 ? '5–6' : '6–7'} H2
- Tổng targetWords các sections phải ≈ ${targetLength}
- Tiêu đề H2 KHÔNG dùng từ cấm
- id mỗi section phải là UUID hợp lệ
`

  const model = buildGeminiModel('gemini-flash')
  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    return NextResponse.json({ error: 'Failed to parse outline' }, { status: 500 })
  }

  const outlineData = JSON.parse(match[0])
  
  // Đảm bảo mỗi section có id hợp lệ
  outlineData.sections = outlineData.sections.map((s: any) => ({
    ...s,
    id: s.id || uuidv4(),
  }))

  return NextResponse.json(outlineData)
}
```

### 5.3 POST /api/tinh-gon/stream (SSE)

**Chức năng:** Stream viết từng section, emit SSE events

```typescript
// web/app/api/tinh-gon/stream/route.ts
import { NextRequest } from 'next/server'
import { buildGeminiModel } from '../pipeline/_gemini'
import { buildBrandPrompt, buildForbiddenList } from '../pipeline/_context'

export const runtime = 'edge'  // Edge runtime cho SSE

export async function POST(req: NextRequest) {
  const { config, outline } = await req.json()

  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const brandContext = await buildBrandPrompt()
        const forbiddenWords = buildForbiddenList()
        
        let fullHtml = `<h1>${outline.title}</h1>\n\n`
        let totalWords = 0

        // Viết từng section
        for (const section of outline.sections) {
          send({ type: 'section_start', heading: section.heading })

          const sectionPrompt = `
${brandContext}

---
## NHIỆM VỤ

Viết nội dung cho section sau trong bài viết về "${config.keyword}":

**H2: ${section.heading}**
Mô tả yêu cầu: ${section.description}
Số từ mục tiêu: ~${section.targetWords} từ
${config.secondaryKeywords?.length ? `Từ khóa phụ cần mention tự nhiên: ${config.secondaryKeywords.join(', ')}` : ''}

---
## QUY TẮC VIẾT

1. Viết TIẾNG VIỆT tự nhiên, đúng brand Nội Thất Minh Quân
2. Câu ngắn xen câu dài, nhịp 7–18 từ
3. Số liệu cụ thể (mm, kg, giá, ngày giao) thay vì tính từ chung chung
4. KHÔNG dùng các từ cấm: ${forbiddenWords.slice(0, 15).join(', ')}...
5. KHÔNG mở bài bằng "Trong cuộc sống..." hoặc kết bằng "Hy vọng bài viết..."
6. Xưng "Minh Quân" hoặc "chúng tôi", gọi khách "anh/chị" hoặc "bạn"

---
## FORMAT OUTPUT

Chỉ viết nội dung HTML thuần, bắt đầu từ thẻ <h2>:

<h2>${section.heading}</h2>
<p>...</p>
[thêm <p> nếu cần, không dùng <h3> trừ khi thực sự cần thiết]
`

          const model = buildGeminiModel(config.model || 'gemini-flash')
          
          // Stream từng chunk
          const streamResult = await model.generateContentStream(sectionPrompt)
          
          let sectionHtml = ''
          for await (const chunk of streamResult.stream) {
            const text = chunk.text()
            sectionHtml += text
            fullHtml += text
            
            // Đếm từ real-time
            totalWords = fullHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
            
            send({
              type: 'chunk',
              content: text,
              wordCount: totalWords,
            })
          }

          fullHtml += '\n\n'
          send({ type: 'section_done', heading: section.heading })
        }

        // Tính Humanness Score
        const humannessResult = await scoreHumanness(fullHtml, forbiddenWords)
        
        // Tính keyword density
        const textContent = fullHtml.replace(/<[^>]+>/g, ' ')
        const words = textContent.split(/\s+/).filter(Boolean)
        const kwCount = words.filter(w => 
          w.toLowerCase().includes(config.keyword.toLowerCase().split(' ')[0])
        ).length
        const density = (kwCount / words.length) * 100

        // Detect forbidden words
        const foundForbidden = forbiddenWords.filter(fw => 
          fullHtml.toLowerCase().includes(fw.toLowerCase())
        )

        send({
          type: 'done',
          humannessScore: humannessResult.score,
          decision: humannessResult.decision,
          keywordDensity: Math.round(density * 10) / 10,
          forbiddenFound: foundForbidden,
          fullHtml,
        })

      } catch (err: any) {
        send({ type: 'error', message: err.message })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// Hàm chấm Humanness Score
async function scoreHumanness(html: string, forbiddenWords: string[]) {
  const text = html.replace(/<[^>]+>/g, ' ')
  
  let score = 100
  
  // Trừ điểm cho từ cấm
  for (const fw of forbiddenWords) {
    const count = (text.match(new RegExp(fw, 'gi')) || []).length
    score -= count * 3
  }
  
  // Trừ điểm cấu trúc AI
  const aiPatterns = [
    /không chỉ.*mà còn/gi,
    /quan trọng là/gi,
    /tóm lại/gi,
    /như đã đề cập/gi,
  ]
  for (const pattern of aiPatterns) {
    score -= (text.match(pattern) || []).length * 5
  }
  
  // Cộng điểm nếu có số liệu cụ thể
  const numbersCount = (text.match(/\d+(\.\d+)?(mm|cm|m|kg|vnđ|đồng|h|ngày|tháng|%)/gi) || []).length
  score += Math.min(numbersCount * 2, 15)

  score = Math.max(0, Math.min(100, score))
  
  const decision = score >= 76 ? 'PUBLISH' : score >= 60 ? 'REVIEW' : 'REWRITE'
  
  return { score, decision }
}
```

### 5.4 POST /api/tinh-gon/humanness

**Chức năng:** Chấm điểm lại sau khi user edit bài thủ công

```typescript
// web/app/api/tinh-gon/humanness/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { buildForbiddenList } from '../pipeline/_context'

export async function POST(req: NextRequest) {
  const { html } = await req.json()
  const forbiddenWords = buildForbiddenList()
  
  const text = html.replace(/<[^>]+>/g, ' ')
  let score = 100
  const issues: string[] = []

  // Check từ cấm
  const foundForbidden: string[] = []
  for (const fw of forbiddenWords) {
    const matches = text.match(new RegExp(fw, 'gi')) || []
    if (matches.length > 0) {
      foundForbidden.push(fw)
      score -= matches.length * 3
      issues.push(`Từ cấm: "${fw}" (${matches.length} lần)`)
    }
  }

  // Check AI patterns
  const aiPatterns = [
    { pattern: /không chỉ.*mà còn/gi, name: 'Cấu trúc AI: không chỉ...mà còn' },
    { pattern: /quan trọng là/gi, name: 'Từ AI: quan trọng là' },
    { pattern: /tóm lại/gi, name: 'Từ AI: tóm lại' },
  ]
  for (const { pattern, name } of aiPatterns) {
    const count = (text.match(pattern) || []).length
    if (count > 0) {
      score -= count * 5
      issues.push(`${name} (${count} lần)`)
    }
  }

  // Cộng điểm cho số liệu cụ thể
  const numbersCount = (text.match(/\d+(\.\d+)?(mm|cm|m|kg|vnđ|đồng|h|ngày|tháng|%)/gi) || []).length
  score += Math.min(numbersCount * 2, 15)

  score = Math.max(0, Math.min(100, score))
  const decision = score >= 76 ? 'PUBLISH' : score >= 60 ? 'REVIEW' : 'REWRITE'

  return NextResponse.json({ score, decision, issues, forbiddenFound: foundForbidden })
}
```

### 5.5 POST /api/tinh-gon/ai-edit

**Chức năng:** User chọn đoạn văn → AI viết lại theo lệnh

```typescript
// web/app/api/tinh-gon/ai-edit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { buildGeminiModel } from '../pipeline/_gemini'
import { buildBrandPrompt } from '../pipeline/_context'

type EditCommand = 
  | 'shorten'      // Rút gọn
  | 'expand'       // Mở rộng
  | 'humanize'     // Humanize hơn
  | 'more_spec'    // Thêm số liệu cụ thể
  | 'stronger_cta' // CTA mạnh hơn
  | 'rewrite'      // Viết lại hoàn toàn

export async function POST(req: NextRequest) {
  const { selectedText, command, context }: {
    selectedText: string
    command: EditCommand
    context: { keyword: string; brandConfig?: any }
  } = await req.json()

  const brandPrompt = await buildBrandPrompt(context.brandConfig)

  const COMMAND_INSTRUCTIONS: Record<EditCommand, string> = {
    shorten:      'Rút gọn đoạn văn này, giữ nguyên ý chính, bỏ câu thừa. Kết quả ngắn hơn 30–40%.',
    expand:       'Mở rộng đoạn văn này, thêm chi tiết cụ thể, số liệu kỹ thuật. Kết quả dài hơn 40–60%.',
    humanize:     'Viết lại đoạn văn theo giọng người thật hơn: câu ngắn hơn, bỏ từ AI, thêm quan điểm cụ thể.',
    more_spec:    'Thêm số liệu cụ thể (mm, kg, đồng, ngày) vào đoạn văn. Bỏ tính từ chung chung.',
    stronger_cta: 'Viết lại CTA cuối đoạn mạnh và thực tế hơn: "có sẵn – giao liền" / "báo giá trong ngày".',
    rewrite:      'Viết lại hoàn toàn đoạn văn với ý tương tự nhưng giọng khác, tự nhiên hơn.',
  }

  const prompt = `
${brandPrompt}

---
## NHIỆM VỤ EDIT

Lệnh: ${COMMAND_INSTRUCTIONS[command]}

Từ khóa chủ đề: "${context.keyword}"

Đoạn văn gốc:
---
${selectedText}
---

Quy tắc:
- Giữ giọng brand Nội Thất Minh Quân (chân thật, chuyên nghiệp, gần gũi)
- KHÔNG dùng từ cấm AI
- Kết quả là HTML thuần (<p>, <strong>, <ul><li> nếu cần)
- Chỉ trả về đoạn đã edit, KHÔNG thêm giải thích
`

  const model = buildGeminiModel('gemini-flash')
  const result = await model.generateContent(prompt)
  
  return NextResponse.json({ editedText: result.response.text().trim() })
}
```

### 5.6 POST /api/tinh-gon/internal-links

**Chức năng:** Lấy bài đã publish từ DB, đề xuất internal link phù hợp

```typescript
// web/app/api/tinh-gon/internal-links/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildGeminiModel } from '../pipeline/_gemini'

export async function POST(req: NextRequest) {
  const { html, keyword }: { html: string; keyword: string } = await req.json()

  // Lấy 50 bài gần nhất từ DB
  const articles = await prisma.article.findMany({
    where: { status: 'published' },
    select: { id: true, title: true, slug: true, keyword: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  if (articles.length === 0) {
    return NextResponse.json({ links: [] })
  }

  // Dùng AI để chọn 3–5 bài liên quan nhất
  const model = buildGeminiModel('gemini-flash')
  
  const prompt = `
Bài viết đang viết về: "${keyword}"

Danh sách bài đã có trên website:
${articles.map((a, i) => `${i + 1}. ${a.title} (keyword: ${a.keyword || 'N/A'}, slug: ${a.slug})`).join('\n')}

Chọn 3–5 bài phù hợp nhất để làm internal link trong bài viết về "${keyword}".
Chỉ chọn bài thực sự liên quan về chủ đề, không chọn bài quá giống (tránh cannibalization).

Trả về JSON:
{
  "links": [
    { "title": "...", "slug": "...", "relevance": 85, "suggestText": "Xem thêm: ..." },
    ...
  ]
}
`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ links: [] })
  
  const data = JSON.parse(match[0])
  
  // Đính kèm URL đầy đủ
  const baseUrl = process.env.SITE_URL || 'https://noithatminhquan.com'
  const links = data.links.map((l: any) => ({
    ...l,
    url: `${baseUrl}/${l.slug}`,
  }))

  return NextResponse.json({ links })
}
```

---

## 6. Prompt Engineering — 10 Loại Outline

File riêng lưu template prompt cho từng loại:

```typescript
// web/app/api/tinh-gon/outline/_outline-prompts.ts

export const OUTLINE_PROMPTS: Record<string, string> = {

  review_product: `
## LOẠI OUTLINE: Review sản phẩm

Cấu trúc chuẩn cho bài review sản phẩm nội thất:
1. [Tên sản phẩm] là gì? — Giới thiệu ngắn, phân loại, ai dùng
2. Thông số kỹ thuật — Kích thước, chất liệu, màu sắc, trọng tải
3. Ưu điểm nổi bật — 3–4 điểm cụ thể, có số liệu
4. Nhược điểm cần biết — Thành thật 1–2 điểm (tăng trust)
5. Giá bán & nơi mua — Bảng giá, link Minh Quân
6. Câu hỏi thường gặp — FAQ 3–5 câu

Lưu ý: Section 2 nên có bảng HTML (<table>) nếu có nhiều thông số.
`,

  how_to_choose: `
## LOẠI OUTLINE: Hướng dẫn chọn mua

Cấu trúc chuẩn cho bài hướng dẫn chọn mua:
1. Tại sao chọn [sản phẩm] quan trọng? — Pain point của khách
2. Tiêu chí 1: [tiêu chí quan trọng nhất] — vd: Chất liệu khung
3. Tiêu chí 2: [tiêu chí 2] — vd: Kích thước phù hợp phòng
4. Tiêu chí 3: [tiêu chí 3] — vd: Ngân sách
5. Gợi ý sản phẩm từ Minh Quân — Match từng nhu cầu với sản phẩm
6. Checklist trước khi mua — Tóm tắt dạng danh sách

Lưu ý: Mention persona cụ thể (sinh viên, gia đình trẻ, homestay).
`,

  compare: `
## LOẠI OUTLINE: So sánh sản phẩm

Cấu trúc chuẩn cho bài so sánh:
1. Tổng quan — 2 sản phẩm/loại đang so sánh là gì
2. Bảng so sánh tổng hợp — HTML table rõ ràng
3. So sánh chi tiết tiêu chí 1 — vd: Độ bền / chất liệu
4. So sánh chi tiết tiêu chí 2 — vd: Giá thành / chi phí
5. So sánh chi tiết tiêu chí 3 — vd: Không gian phù hợp
6. Nên chọn loại nào? — Kết luận rõ, theo từng trường hợp

Lưu ý: Kết luận phải có quan điểm, không mơ hồ "tùy nhu cầu".
`,

  faq: `
## LOẠI OUTLINE: Hỏi đáp FAQ

Cấu trúc:
1. Giới thiệu chủ đề (ngắn, 1 đoạn)
2. Câu hỏi 1: [câu hỏi phổ biến nhất về sản phẩm]
3. Câu hỏi 2: [câu hỏi về giá/chất lượng]
4. Câu hỏi 3: [câu hỏi về giao hàng/lắp đặt]
5. Câu hỏi 4: [câu hỏi về bảo hành/đổi trả]
6. Câu hỏi 5: [câu hỏi về đặt hàng/liên hệ]

Lưu ý: Mỗi H2 là 1 câu hỏi dạng "Giường sắt hộp bền bao lâu?".
Câu trả lời: ngắn gọn, cụ thể, có số liệu.
`,

  listicle: `
## LOẠI OUTLINE: Danh sách Top N

Cấu trúc:
1. Tiêu chí đánh giá — Giải thích cách chọn top N
2. Top 1: [tên sản phẩm/model] — Mô tả, thông số, giá
3. Top 2: [tên sản phẩm/model] — Mô tả, thông số, giá
4. Top 3: [tên sản phẩm/model] — Mô tả, thông số, giá
5. [Top 4, 5 nếu targetLength > 1000]
6. Kết luận — Chọn loại nào theo ngân sách/nhu cầu

Lưu ý: Số lượng items phụ thuộc targetLength.
800 từ → Top 3. 1000 từ → Top 5. 1200+ từ → Top 7.
`,

  problem_solution: `
## LOẠI OUTLINE: Vấn đề – Giải pháp

Cấu trúc:
1. Vấn đề phổ biến — Nỗi đau của khách hàng (cụ thể, thực tế)
2. Nguyên nhân — Tại sao xảy ra vấn đề đó
3. Giải pháp 1 — Cách giải quyết, mention sản phẩm tự nhiên
4. Giải pháp 2 — Cách giải quyết khác / bổ sung
5. Ví dụ thực tế — Case study hoặc tình huống cụ thể
6. Hành động tiếp theo — CTA rõ ràng

Lưu ý: Vấn đề phải thực tế, không giả tạo.
`,

  step_guide: `
## LOẠI OUTLINE: Hướng dẫn từng bước

Cấu trúc:
1. Chuẩn bị gì trước khi [hành động]? — Dụng cụ, thông tin cần có
2. Bước 1: [bước đầu tiên cụ thể]
3. Bước 2: [bước tiếp theo]
4. Bước 3: [bước tiếp theo]
5. Bước 4/5: [bước cuối]
6. Lưu ý quan trọng — Các lỗi hay gặp, cách tránh

Lưu ý: Tên H2 phải bắt đầu bằng "Bước X:" hoặc câu hành động rõ.
`,

  story_brand: `
## LOẠI OUTLINE: Story thương hiệu

Cấu trúc:
1. [Tên thương hiệu] bắt đầu từ đâu? — Origin story, ngắn gọn
2. Điều gì làm nên sự khác biệt? — USP thực sự
3. Xưởng sản xuất & quy trình — Minh bạch về chất lượng
4. Cam kết với khách hàng — Bảo hành, chính sách
5. Khách hàng nói gì? — Social proof (nếu có số liệu)
6. Liên hệ & đặt hàng — CTA rõ

Lưu ý: Giọng văn cần cá nhân hơn, bớt "marketing speak".
`,

  use_case: `
## LOẠI OUTLINE: Trường hợp sử dụng

Cấu trúc:
1. [Sản phẩm] phù hợp với không gian nào?
2. Trường hợp 1: [vd: Phòng ngủ nhỏ dưới 15m²]
3. Trường hợp 2: [vd: Phòng trọ sinh viên]
4. Trường hợp 3: [vd: Homestay/nhà cho thuê]
5. Trường hợp 4: [vd: Gia đình có trẻ em]
6. Không phù hợp với trường hợp nào? — Trung thực, tăng trust

Lưu ý: Mỗi trường hợp nên mention kích thước phòng cụ thể (m²).
`,

  buying_guide: `
## LOẠI OUTLINE: Cẩm nang mua sắm

Cấu trúc:
1. Trước khi mua: cần biết gì? — Tổng quan thị trường
2. Ngân sách: phân khúc giá — Bảng giá phân khúc thực tế
3. Chất liệu: loại nào tốt nhất? — So sánh chất liệu
4. Kích thước: chọn sao cho đúng? — Guide đo đạc
5. Thương hiệu & nơi mua uy tín — Mention Minh Quân tự nhiên
6. Checklist hoàn chỉnh trước khi đặt hàng

Lưu ý: Section 2 nên có bảng giá phân khúc HTML.
`,

}
```

---

## 7. Components UI Chi Tiết

### 7.1 HumannessPanel.tsx

```tsx
// web/components/tinh-gon/HumannessPanel.tsx
interface Props {
  score: number | null
  decision: 'PUBLISH' | 'REVIEW' | 'REWRITE' | null
  issues: string[]
  forbiddenFound: string[]
}

const DECISION_STYLES = {
  PUBLISH: { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700', label: '✅ PUBLISH' },
  REVIEW:  { bg: 'bg-yellow-50', border: 'border-yellow-200',text: 'text-yellow-700',label: '⚠️ REVIEW'  },
  REWRITE: { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',  label: '🔴 REWRITE' },
}

export function HumannessPanel({ score, decision, issues, forbiddenFound }: Props) {
  if (score === null) return null

  const style = decision ? DECISION_STYLES[decision] : DECISION_STYLES.REVIEW
  const barWidth = `${score}%`

  return (
    <div className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Humanness Score</span>
        <span className={`text-sm font-bold ${style.text}`}>{style.label}</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            score >= 76 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: barWidth }}
        />
      </div>
      <p className="text-xs text-right font-bold text-gray-600 mb-3">{score}/100</p>

      {/* Issues */}
      {issues.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Vấn đề phát hiện:</p>
          <ul className="space-y-0.5">
            {issues.map((issue, i) => (
              <li key={i} className="text-xs text-gray-600">• {issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

### 7.2 KeywordDensityBar.tsx

```tsx
// web/components/tinh-gon/KeywordDensityBar.tsx
interface Props {
  density: number | null
  target?: [number, number]  // [min, max] — default [1.0, 1.5]
}

export function KeywordDensityBar({ density, target = [1.0, 1.5] }: Props) {
  if (density === null) return null

  const [min, max] = target
  const inRange = density >= min && density <= max
  const status = inRange ? 'ok' : density < min ? 'low' : 'high'

  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Keyword Density</span>
        <span className={`text-sm font-bold ${
          status === 'ok' ? 'text-green-600' : 'text-orange-500'
        }`}>
          {density}%
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full rounded-full ${
            status === 'ok' ? 'bg-green-500' : 'bg-orange-400'
          }`}
          style={{ width: `${Math.min(density / 3 * 100, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">
        Target: {min}–{max}% · {status === 'low' ? 'Thêm keyword' : status === 'high' ? 'Bớt keyword' : 'Đạt chuẩn ✓'}
      </p>
    </div>
  )
}
```

### 7.3 InternalLinkSuggest.tsx

```tsx
// web/components/tinh-gon/InternalLinkSuggest.tsx
interface Link {
  title: string
  url: string
  relevance: number
  suggestText: string
}

interface Props {
  links: Link[]
  onInsert: (text: string) => void
}

export function InternalLinkSuggest({ links, onInsert }: Props) {
  if (links.length === 0) return null

  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-white">
      <p className="text-sm font-semibold text-gray-700 mb-3">🔗 Internal Links gợi ý</p>
      <div className="space-y-2">
        {links.map((link, i) => (
          <div key={i} className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{link.title}</p>
              <p className="text-xs text-gray-400">{link.relevance}% liên quan</p>
            </div>
            <button
              onClick={() => onInsert(`<a href="${link.url}">${link.suggestText || link.title}</a>`)}
              className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded border border-indigo-200 hover:bg-indigo-100 shrink-0"
            >
              Chèn
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 8. Navigation — Cập nhật Sidebar + Trang chủ

### 8.1 Sidebar — web/components/Sidebar.tsx

File dùng mảng `navGroups`. Thêm vào **group đầu tiên "Viết Bài"**, sau `{ label: 'Viết Bài SEO', href: '/' }`:

```tsx
// navGroups[0].items — thêm dòng này
{ label: 'Viết Tinh Gọn', href: '/viet-tinh-gon' },
```

Group "Viết Bài" sau khi thêm:
```tsx
{
  icon: '📝',
  title: 'Viết Bài',
  items: [
    { label: 'Viết Bài SEO',          href: '/' },
    { label: 'Viết Tinh Gọn',         href: '/viet-tinh-gon' },   // ← MỚI
    { label: 'Viết Bài Facebook',      href: '/viet-bai-facebook' },
    { label: 'Viết Từ Facebook Post',  href: '/viet-tu-facebook' },
    { label: 'Viết Hàng Loạt',        href: '/viet-hang-loat' },
    { label: 'Viết Lại',              href: '/viet-lai' },
  ],
},
```

### 8.2 Trang chủ — web/app/page.tsx

Thêm vào mảng `templates`, **sau phần tử index 0** (Viết thông minh):

```tsx
{
  title: 'Viết tinh gọn',
  description: 'Bài 800–1.500 từ, đủ SEO, đủ thuyết phục — viết ít nhưng chất',
  color: 'from-teal-400 to-teal-600',
  href: '/viet-tinh-gon',
  featured: true,
  icon: '✍️',
},
```

---

## 9. Database Schema — Prisma (nếu cần lưu bài)

Nếu muốn lưu bài vào DB (tùy chọn, có thể dùng `article` model có sẵn):

```prisma
// Thêm vào schema.prisma nếu cần track riêng
model TinhGonPost {
  id            String   @id @default(uuid())
  keyword       String
  outlineType   String
  title         String
  html          String   @db.Text
  wordCount     Int
  humannessScore Int?
  decision      String?  // PUBLISH | REVIEW | REWRITE
  keywordDensity Float?
  status        String   @default("draft")  // draft | published
  wpPostId      Int?     // WordPress post ID sau publish
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([keyword])
  @@index([status])
}
```

Nếu không muốn thêm model mới, tái sử dụng `Article` model có sẵn với field `source: "tinh-gon"`.

---

## 10. Tái sử dụng code hiện có

| Cần gì | File hiện có | Cách dùng |
|---|---|---|
| Gọi Gemini/GPT | `web/app/api/pipeline/_gemini.ts` | `import { buildGeminiModel }` |
| Brand context | `web/app/api/pipeline/_context.ts` | `import { buildBrandPrompt, buildForbiddenList }` |
| Publish WordPress | `web/app/api/pipeline/publish/route.ts` | Copy logic, gọi WP REST API |
| SSE streaming | `web/app/api/pipeline/write-stream/route.ts` | Xem pattern, copy `sseEvent()` helper |
| Prisma client | `web/lib/prisma.ts` (hoặc `@/lib/prisma`) | `import { prisma }` |
| AI model picker | `web/app/viet-theo-tu-khoa/page.tsx` | Copy `AI_MODELS` array |

---

## 11. Order triển khai

Thứ tự implement để tránh dependency hell:

```
Tuần 1 — Backend APIs
  □ Tạo /api/tinh-gon/suggest-keywords
  □ Tạo /api/tinh-gon/outline + _outline-prompts.ts
  □ Test 2 route trên với Postman/curl

Tuần 2 — Stage 1 + 2
  □ /viet-tinh-gon/page.tsx (Config form)
  □ /viet-tinh-gon/outline/page.tsx (Outline editor)
  □ Test flow Config → Outline → edit outline

Tuần 3 — Stream + APIs còn lại
  □ /api/tinh-gon/stream (SSE route)
  □ /api/tinh-gon/humanness
  □ /api/tinh-gon/ai-edit
  □ /api/tinh-gon/internal-links

Tuần 4 — Stage 3+4 + Components
  □ /viet-tinh-gon/generate/page.tsx
  □ HumannessPanel, KeywordDensityBar, InternalLinkSuggest
  □ AI Edit context menu (click đoạn văn → chọn lệnh)
  □ Publish WordPress integration
  □ Navigation menu update

Tuần 5 — Polish + Testing
  □ Test toàn flow end-to-end
  □ Test 10 outline types
  □ Test edge cases (model lỗi, SSE ngắt giữa chừng)
  □ Mobile responsive check
```

---

## 12. Chống AI Detection & Nội dung trùng lặp

> **Bắt buộc áp dụng trong mọi prompt AI.** Google ngày càng nhận ra nội dung AI qua
> nhịp câu đều đặn, từ ngữ chuyển tiếp mượt mà và thiếu số liệu cụ thể. Phần này
> mô tả các kỹ thuật cần inject vào prompt để bài ra vượt qua cả Humanness Score ≥76
> lẫn các tool phát hiện AI bên ngoài.

---

### A. Kỹ thuật chống AI detection — đưa vào prompt

Thêm block sau vào **mọi prompt viết bài** (stream route, ai-edit route):

```
## QUY TẮC CHỐNG AI DETECTION (BẮT BUỘC)

### 1. Nhịp câu đa dạng — quan trọng nhất
Xen kẽ câu cực ngắn (3–6 từ) và câu trung bình (12–18 từ). TUYỆT ĐỐI không viết
liên tiếp 5 câu cùng độ dài.

VÍ DỤ TỐT:
"Khung sắt hộp 1.4mm. Mình test thử 3 tháng — không rung, không ọp ẹp.
Đặt lên nền gỗ laminate vẫn đứng vững. Tải thực tế khoảng 150kg."

VÍ DỤ XẤU (AI điển hình):
"Giường sắt MQ-01 được thiết kế với khung sắt hộp dày 1.4mm giúp tăng cường
độ bền và khả năng chịu lực, đồng thời đảm bảo tính ổn định trong quá trình sử dụng."

### 2. Mở đầu đoạn — không lặp pattern
Không được 3+ đoạn liên tiếp mở bằng cùng một kiểu:
- Sai: "Sản phẩm này... / Sản phẩm có... / Sản phẩm được..."
- Đúng: luân phiên → số liệu → câu hỏi → nhận xét ngắn → ví dụ cụ thể

### 3. Số liệu thay tính từ
- Sai: "chất lượng tốt, bền bỉ, giá hợp lý"
- Đúng: "khung 1.4mm, tải 180kg, bảo hành 12 tháng, giao trong 3 ngày"

### 4. Giọng người thật
Viết như người bán hàng đang tư vấn. Được phép:
- Câu nghi vấn trong bài: "Mua 1m2 hay 1m4 mới hợp phòng?"
- Nhận định thương hiệu: "Theo kinh nghiệm làm xưởng của Minh Quân..."
- Câu cảm thán ngắn: "Điểm này ít ai để ý."

### 5. Cấu trúc câu cấm dùng (AI signature)
- "không chỉ X mà còn Y"
- "Không thể phủ nhận rằng..."
- "Đây là một trong những..."
- "Với sự phát triển của..."
- "Trong bối cảnh hiện nay..."
- "Nhìn chung, có thể thấy rằng..."
```

---

### B. Kỹ thuật chống nội dung trùng lặp

Trùng nội dung xảy ra khi nhiều bài dùng cùng keyword và cùng cấu trúc câu.
Thêm block sau vào **prompt của mọi bài viết**:

```
## QUY TẮC CHỐNG NỘI DUNG TRÙNG

1. ANGLE riêng: mỗi bài phải có một góc nhìn chưa ai viết.
   Ví dụ thay vì "Giường sắt 1m2 là gì?" → viết "Giường sắt 1m2 fit phòng nào ở Sài Gòn?"

2. KHÔNG dùng câu mở bài cliché: "Hiện nay trên thị trường có rất nhiều..."
   Thay bằng: bắt đầu ngay bằng tình huống thực, số liệu, hoặc câu hỏi khách hay hỏi.

3. Câu kết section KHÔNG được kết thúc bằng tóm tắt lặp:
   - Sai: "Như vậy có thể thấy rằng giường sắt 1m2 rất phù hợp..."
   - Đúng: chuyển thẳng sang điểm tiếp theo hoặc đặt câu hỏi dẫn dắt.

4. Persona cụ thể: mention đúng nhóm khách (sinh viên thuê trọ / gia đình trẻ / chủ homestay)
   thay vì viết chung cho "mọi đối tượng".

5. CTA cuối bài phải cụ thể: không dùng "Liên hệ ngay để được tư vấn".
   Thay bằng: "Báo kích thước phòng — Minh Quân báo giá trong ngày."
```

---

### C. Humanness Score pipeline — luồng kiểm soát bắt buộc

```
AI viết xong HTML
        ↓
analyzeHumanness(html) — chạy tại server (route.ts)
        ↓
score >= 76 → PUBLISH (cho phép đăng)
score 60-75 → REVIEW  (hiển thị cảnh báo vàng, vẫn có thể lưu)
score < 60  → REWRITE (hiển thị cảnh báo đỏ, khuyến nghị dùng AI Edit "Tự nhiên hơn")
        ↓
User dùng AI Edit "Tự nhiên hơn" hoặc sửa tay
        ↓
Re-check tự động sau 2.5 giây (debounce)
        ↓
Lặp đến khi score >= 76
```

**Quan trọng:** Không block publish hoàn toàn khi score < 76 — chỉ cảnh báo. User vẫn có
quyền quyết định. Nhưng nút Đăng Bài phải hiện rõ label score hiện tại.

---

### D. Thêm vào prompt thực tế (buildStreamPrompt)

Trong `stream/route.ts`, sau phần `## Quy tắc output`, thêm block này:

```typescript
const antiAiBlock = `
## QUAN TRỌNG — Chống AI detection
- Nhịp câu: xen kẽ câu 3–6 từ và câu 12–18 từ. KHÔNG 5 câu liên tiếp cùng độ dài.
- Mở đoạn: luân phiên góc nhìn (số liệu → câu hỏi → nhận xét → ví dụ).
- Dùng số liệu cụ thể (mm, kg, ngày, triệu đồng) thay mọi tính từ mơ hồ.
- Giọng người thật: được dùng câu nghi vấn, nhận định chủ quan thương hiệu.
- Tuyệt đối không dùng: "không chỉ X mà còn Y", "Không thể phủ nhận", "Nhìn chung".
- Bài có góc nhìn riêng — không viết chung chung cho "mọi người".
`;
```

Ghép vào cuối prompt trước `Chỉ trả HTML.`

---

### E. Checklist QC trước khi deploy

- [ ] Prompt có block "Chống AI detection" — kiểm tra `buildStreamPrompt()`
- [ ] Prompt có block "Chống nội dung trùng" — kiểm tra angle riêng được inject
- [ ] Humanness Score hiển thị ngay khi stream done (không cần bấm Re-check)
- [ ] Nút Đăng Bài hiện score hiện tại: "Đăng Bài (Score: 78)"
- [ ] AI Edit "Tự nhiên hơn" hoạt động và re-check sau khi chỉnh
- [ ] Test với công cụ: https://bypass.aiktp.com/vi/ai-detector — target Human %  ≥ 70

---

## 13. Testing Checklist

Trước khi deploy:

- [ ] Config form validate đúng (không submit khi thiếu keyword)
- [ ] Suggest keywords hoạt động và hiển thị tags
- [ ] Outline tạo đúng format JSON, có đủ sections
- [ ] Outline edit (thêm/xóa/sửa section) lưu đúng sessionStorage
- [ ] Stream bắt đầu tự động khi vào /generate
- [ ] Live word count update realtime
- [ ] Humanness Score hiển thị đúng sau khi stream done
- [ ] Keyword density tính đúng
- [ ] Forbidden words detected và hiển thị
- [ ] Internal links gợi ý load sau 2–3s
- [ ] AI Edit hoạt động với cả 6 command
- [ ] Publish WordPress gọi đúng API, trả về WP post ID
- [ ] Session expire (không có tg_config) → redirect /viet-tinh-gon
- [ ] Mobile: layout 1 cột thay vì 2 cột trên màn hình < 768px

---

## 13. Environment Variables cần thêm

```env
# Đã có (kiểm tra .env)
GEMINI_API_KEY=
OPENAI_API_KEY=
WP_URL=
WP_USER=
WP_APP_PASSWORD=
SITE_URL=

# Mới cần thêm (nếu dùng Google Search Console để index)
GOOGLE_SERVICE_ACCOUNT_KEY=  # JSON key base64 encoded
GOOGLE_SITE_URL=             # vd: https://noithatminhquan.com
```

---

> **Ghi chú cuối:** Toàn bộ code trên là template/scaffold. Developer cần:
> 1. Adjust import paths theo cấu trúc thực tế của project
> 2. Verify Prisma model names (`Article`, `FacebookPost`) khớp với `schema.prisma` hiện tại
> 3. Test `buildBrandPrompt()` và `buildGeminiModel()` với path import đúng trước khi chạy
> 4. Kiểm tra Edge runtime (`export const runtime = 'edge'`) có tương thích với Prisma không — nếu không, dùng Node.js runtime
