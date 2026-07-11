# AI-EDITOR-IMPLEMENTATION.md
## Hướng dẫn code trang "AI Editor" — Generate + Edit Page dùng chung

> Phân tích từ: https://aiktp.com/write-post-step-3/{runId}/create  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · Gemini API

---

## ⚠️ Bối cảnh & Phạm vi

Trang này là **bước cuối chung** cho toàn bộ write flows (tinh-gon, tin-tuc, theo-dan-bai, toplist, danh-gia...). Hiện tại mỗi feature có generate page riêng (`/viet-tinh-gon/generate`, `/viet-tin-tuc/generate`...) với UI đơn giản: stream text + humanness panel.

**Guide này nâng cấp lên AI Editor đầy đủ** gồm:

| Tính năng | Hiện tại | Sau nâng cấp |
|-----------|----------|--------------|
| Editor | Hiển thị HTML tĩnh | ContentEditable với toolbar |
| SEO | HumannessPanel + KD Bar | SEO panel 21 checks + SERP Preview |
| AI Assist | ai-edit 6 lệnh (stream riêng) | 10 lệnh + model selector + Ask AI |
| Export | Không | .HTML, .TXT, .MD, .DOCX |
| Publish | Nút Lưu đơn giản | WordPress REST API + schedule |
| Tags | Không | Tags input + DB |
| Media | Không | Find image, Text-to-image |

**Chiến lược implement:** Không viết lại generate pages. Thay vào đó:
1. Tạo shared editor components tại `components/editor/`
2. Từng generate page import và dùng các component này
3. Replace dần các panel đơn giản hiện tại

---

## 1. Kiến trúc tổng quan

### Layout 2 cột

```
┌─────────────────────────────────────────────────────────────────┐
│ TopBar: [Logo] [Keyword badge] [Export▼] [Save] [Publish▼]      │
├──────────────────────────────────┬──────────────────────────────┤
│                                  │ [SEO] [AI] [Media] tabs      │
│  ArticleEditor                   │                              │
│  ─────────────────               │  SeoPanel / AiAssistPanel    │
│  contenteditable div             │  / MediaPanel                │
│  + EditorToolbar (sticky top)    │                              │
│                                  │                              │
│  [Tags: ..............] ←below   │                              │
└──────────────────────────────────┴──────────────────────────────┘
```

### File cần tạo

```
web/
├── components/
│   └── editor/
│       ├── ArticleEditor.tsx          ← contenteditable + EditorToolbar
│       ├── EditorToolbar.tsx          ← Bold/Italic/Link/H2/H3 buttons
│       ├── SeoPanel.tsx               ← Tab SEO: full SEO scoring
│       ├── SeoChecks.ts               ← Pure SEO check functions (no React)
│       ├── SerpPreview.tsx            ← Editable SERP card
│       ├── AiAssistPanel.tsx          ← Tab AI: paragraph selection + commands
│       ├── AiFloatingToolbar.tsx      ← Floating pill trên selection
│       ├── TagsInput.tsx              ← Tag comma-input
│       ├── ExportMenu.tsx             ← Export dropdown
│       └── PublishPanel.tsx           ← Publish slide-over
└── app/api/
    └── editor/
        ├── ai-assist/
        │   └── route.ts               ← 10 AI commands (stream)
        └── export/
            └── route.ts               ← Export HTML/TXT/MD/DOCX
    └── articles/
        └── [id]/
            ├── publish/
            │   └── route.ts           ← Publish to WordPress
            └── tags/
                └── route.ts           ← Save tags
```

### File tái sử dụng

- `lib/tinh-gon/humanness.ts` → `analyzeHumanness()` (dùng trong SeoChecks)
- `lib/tinh-gon/text.ts` → `countWords()`, `computeKeywordDensity()`, `stripHtml()`
- `lib/tinh-gon/forbidden.ts` → `buildForbiddenList()`
- `lib/tinh-gon/model.ts` → `buildTinhGonModel()`
- `app/api/pipeline/_context.ts` → `buildBrandPrompt()`

---

## 2. SEO Scoring Engine — `web/components/editor/SeoChecks.ts`

Pure functions, không có React, không có DB calls. Chạy client-side sau mỗi lần content thay đổi.

```typescript
export interface SeoCheckResult {
  label:   string;
  passed:  boolean;
  message: string;    // Mô tả ngắn khi fail
}

export interface SeoScore {
  basic:       SeoCheckResult[];   // 7 checks
  additional:  SeoCheckResult[];   // 7 checks
  titleRead:   SeoCheckResult[];   // 4 checks
  contentRead: SeoCheckResult[];   // 3 checks
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getFirstNWords(text: string, n: number): string {
  return text.split(/\s+/).slice(0, n).join(' ');
}

function countWordsFn(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const POWER_WORDS = [
  'tốt nhất', 'hàng đầu', 'nên mua', 'đáng mua', 'so sánh',
  'hướng dẫn', 'cách chọn', 'kinh nghiệm', 'thực tế', 'đánh giá',
  'top', 'best', 'guide', 'review', 'tips', 'secrets', 'proven',
  'ultimate', 'complete', 'essential',
];

// ─── Basic SEO (7 checks) ────────────────────────────────────────────────────

export function runBasicSeoChecks(
  html:             string,
  keyword:          string,
  metaDescription:  string,
): SeoCheckResult[] {
  const text        = stripHtmlTags(html).toLowerCase();
  const kw          = keyword.toLowerCase();
  const first150    = getFirstNWords(text, 150);
  const wordCount   = countWordsFn(text);
  const h1Match     = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Text      = h1Match ? stripHtmlTags(h1Match[1]).toLowerCase() : '';
  const h2Count     = (html.match(/<h2[^>]+>/gi) || []).length;
  const allH1s      = (html.match(/<h1[^>]+>/gi) || []).length;

  return [
    {
      label:   'Từ khoá trong tiêu đề H1',
      passed:  h1Text.includes(kw),
      message: 'Thêm từ khoá chính vào thẻ H1.',
    },
    {
      label:   'Từ khoá trong 150 từ đầu',
      passed:  first150.includes(kw),
      message: 'Đưa từ khoá vào đoạn mở bài (150 từ đầu).',
    },
    {
      label:   'Bài đủ dài (≥ 300 từ)',
      passed:  wordCount >= 300,
      message: `Bài hiện có ${wordCount} từ — cần ít nhất 300 từ.`,
    },
    {
      label:   'Có ít nhất 1 thẻ H2',
      passed:  h2Count >= 1,
      message: 'Thêm ít nhất 1 heading H2 để cấu trúc bài.',
    },
    {
      label:   'Meta description đã điền',
      passed:  metaDescription.trim().length >= 30,
      message: 'Meta description cần ít nhất 30 ký tự.',
    },
    {
      label:   'Từ khoá trong meta description',
      passed:  metaDescription.toLowerCase().includes(kw),
      message: 'Thêm từ khoá vào meta description.',
    },
    {
      label:   'Chỉ có 1 thẻ H1',
      passed:  allH1s === 1,
      message: allH1s === 0 ? 'Thiếu thẻ H1.' : `Có ${allH1s} thẻ H1 — chỉ nên có 1.`,
    },
  ];
}

// ─── Additional SEO (7 checks) ───────────────────────────────────────────────

export function runAdditionalSeoChecks(
  html:    string,
  keyword: string,
): SeoCheckResult[] {
  const text      = stripHtmlTags(html).toLowerCase();
  const kw        = keyword.toLowerCase();
  const words     = text.split(/\s+/).filter(Boolean);
  const kwCount   = words.filter((w) => w.includes(kw.split(' ')[0])).length;
  const density   = words.length > 0 ? (kwCount / words.length) * 100 : 0;

  // Images without alt
  const allImgs   = html.match(/<img[^>]+>/gi) || [];
  const noAltImgs = allImgs.filter((img) => !/alt\s*=\s*["'][^"']+["']/i.test(img));

  // Links
  const internalLinks = (html.match(/<a[^>]+href\s*=\s*["']\/[^"']+["']/gi) || []).length;
  const externalLinks = (html.match(/<a[^>]+href\s*=\s*["']https?:\/\/[^"']+["']/gi) || []).length;

  // First H2 has keyword
  const firstH2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const firstH2Text  = firstH2Match ? stripHtmlTags(firstH2Match[1]).toLowerCase() : '';

  // Passive voice check (Vietnamese)
  const passiveMatches = (html.match(/\b(được|bị)\s+\w+/giu) || []).length;
  const sentenceCount  = (text.match(/[.!?]/g) || []).length || 1;
  const passiveRatio   = passiveMatches / sentenceCount;

  return [
    {
      label:   'Mật độ từ khoá 0.5–3%',
      passed:  density >= 0.5 && density <= 3,
      message: `Mật độ hiện tại: ${density.toFixed(1)}%. ${density < 0.5 ? 'Quá ít.' : 'Nhồi nhét — giảm xuống.'}`,
    },
    {
      label:   'Ảnh có alt text',
      passed:  noAltImgs.length === 0,
      message: `${noAltImgs.length} ảnh thiếu alt text.`,
    },
    {
      label:   'Có internal link',
      passed:  internalLinks >= 1,
      message: 'Thêm ít nhất 1 link nội bộ đến bài liên quan.',
    },
    {
      label:   'Có external link',
      passed:  externalLinks >= 1,
      message: 'Thêm ít nhất 1 link ngoài (nguồn, tham khảo).',
    },
    {
      label:   'Từ khoá trong H2 đầu tiên',
      passed:  firstH2Text.includes(kw),
      message: 'Đưa từ khoá vào heading H2 đầu tiên.',
    },
    {
      label:   'Câu bị động < 30%',
      passed:  passiveRatio < 0.3,
      message: `${Math.round(passiveRatio * 100)}% câu bị động — chuyển sang chủ động.`,
    },
    {
      label:   'Không nhồi từ khoá',
      passed:  density <= 3,
      message: 'Mật độ từ khoá vượt 3% — giảm bớt.',
    },
  ];
}

// ─── Title Readability (4 checks) ────────────────────────────────────────────

export function runTitleReadabilityChecks(title: string): SeoCheckResult[] {
  const len     = title.length;
  const hasNum  = /\d/.test(title);
  const hasPower = POWER_WORDS.some((w) => title.toLowerCase().includes(w));
  const isAllCaps = title === title.toUpperCase() && title.length > 5;

  return [
    {
      label:   'Độ dài tiêu đề 40–70 ký tự',
      passed:  len >= 40 && len <= 70,
      message: `Tiêu đề ${len} ký tự. ${len < 40 ? 'Quá ngắn.' : 'Quá dài — sẽ bị cắt trên SERP.'}`,
    },
    {
      label:   'Tiêu đề có chứa số',
      passed:  hasNum,
      message: 'Thêm số vào tiêu đề (VD: Top 10, 5 cách, 2025).',
    },
    {
      label:   'Tiêu đề có power word',
      passed:  hasPower,
      message: 'Thêm từ hấp dẫn: tốt nhất, nên mua, so sánh, hướng dẫn...',
    },
    {
      label:   'Tiêu đề không viết hoa toàn bộ',
      passed:  !isAllCaps,
      message: 'Không nên viết hoa toàn bộ tiêu đề.',
    },
  ];
}

// ─── Content Readability (3 checks) ─────────────────────────────────────────

export function runContentReadabilityChecks(html: string): SeoCheckResult[] {
  const text = stripHtmlTags(html);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 10);
  const avgWords = sentences.length
    ? sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length
    : 0;

  // Passive voice
  const passiveCount = (text.match(/\b(được|bị)\s+\w+/giu) || []).length;
  const passiveRatio = sentences.length > 0 ? passiveCount / sentences.length : 0;

  // Long paragraphs (>150 words)
  const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const longParas = paragraphs.filter((p) => countWordsFn(stripHtmlTags(p)) > 150).length;

  return [
    {
      label:   'Câu trung bình < 20 từ',
      passed:  avgWords <= 20,
      message: `Độ dài câu trung bình: ${avgWords.toFixed(1)} từ. Rút ngắn các câu dài.`,
    },
    {
      label:   'Câu bị động < 25%',
      passed:  passiveRatio < 0.25,
      message: `${Math.round(passiveRatio * 100)}% câu bị động. Viết chủ động hơn.`,
    },
    {
      label:   'Đoạn văn không quá dài (< 150 từ)',
      passed:  longParas === 0,
      message: `${longParas} đoạn văn quá dài — tách ra cho dễ đọc.`,
    },
  ];
}

// ─── Tổng hợp ─────────────────────────────────────────────────────────────────

export function runAllSeoChecks(
  html:            string,
  keyword:         string,
  title:           string,
  metaDescription: string,
): SeoScore {
  return {
    basic:       runBasicSeoChecks(html, keyword, metaDescription),
    additional:  runAdditionalSeoChecks(html, keyword),
    titleRead:   runTitleReadabilityChecks(title),
    contentRead: runContentReadabilityChecks(html),
  };
}

export function countPassedChecks(checks: SeoCheckResult[]): number {
  return checks.filter((c) => c.passed).length;
}
```

---

## 3. SERP Preview — `web/components/editor/SerpPreview.tsx`

Hiển thị và cho phép sửa title + description ngay trong panel.

```tsx
'use client';

import { useEffect, useState } from 'react';

interface SerpPreviewProps {
  title:          string;
  description:    string;
  keyword:        string;
  slug?:          string;
  onChange:       (field: 'title' | 'description', value: string) => void;
}

/** Highlight keyword trong text — wrap bằng <strong> */
function highlightKeyword(text: string, keyword: string): string {
  if (!keyword) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-transparent font-semibold">$1</mark>');
}

export function SerpPreview({ title, description, keyword, slug, onChange }: SerpPreviewProps) {
  const [editTitle, setEditTitle]   = useState(title);
  const [editDesc,  setEditDesc]    = useState(description);

  useEffect(() => { setEditTitle(title); }, [title]);
  useEffect(() => { setEditDesc(description); }, [description]);

  const titleLen = editTitle.length;
  const descLen  = editDesc.length;
  const previewUrl = `example.com/${slug ?? 'bai-viet'}`;

  // SERP cắt title > 60 chars
  const displayTitle = editTitle.length > 60 ? `${editTitle.slice(0, 57)}...` : editTitle;
  const displayDesc  = editDesc.length > 160 ? `${editDesc.slice(0, 157)}...` : editDesc;

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">SERP Preview</p>

      {/* Preview card */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3">
        <p className="text-xs text-green-700 mb-0.5">{previewUrl}</p>
        <p
          className="text-blue-700 text-base font-medium leading-snug mb-1 cursor-pointer hover:underline"
          dangerouslySetInnerHTML={{ __html: highlightKeyword(displayTitle, keyword) }}
        />
        <p
          className="text-sm text-gray-600 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightKeyword(displayDesc, keyword) }}
        />
      </div>

      {/* Editable fields */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Tiêu đề SEO</label>
            <span className={`text-xs ${titleLen > 70 ? 'text-red-500' : titleLen > 60 ? 'text-amber-500' : 'text-gray-400'}`}>
              {titleLen}/70
            </span>
          </div>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => {
              setEditTitle(e.target.value);
              onChange('title', e.target.value);
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className={`h-1 mt-1 rounded-full ${titleLen <= 60 ? 'bg-green-400' : titleLen <= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ width: `${Math.min((titleLen / 70) * 100, 100)}%` }}
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Meta Description</label>
            <span className={`text-xs ${descLen > 160 ? 'text-red-500' : 'text-gray-400'}`}>
              {descLen}/160
            </span>
          </div>
          <textarea
            value={editDesc}
            onChange={(e) => {
              setEditDesc(e.target.value);
              onChange('description', e.target.value);
            }}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
```

---

## 4. SEO Panel — `web/components/editor/SeoPanel.tsx`

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { countPassedChecks, runAllSeoChecks, type SeoCheckResult, type SeoScore } from './SeoChecks';
import { SerpPreview } from './SerpPreview';

interface SeoPanelProps {
  html:            string;
  keyword:         string;
  title:           string;
  metaDescription: string;
  onMetaChange:    (field: 'title' | 'description', value: string) => void;
}

function ScoreBar({ label, passed, total }: { label: string; passed: number; total: number }) {
  const pct = Math.round((passed / total) * 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`font-semibold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
          {passed}/{total}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CheckList({ checks }: { checks: SeoCheckResult[] }) {
  return (
    <ul className="space-y-1.5">
      {checks.map((check, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className={`mt-0.5 text-sm flex-shrink-0 ${check.passed ? 'text-green-500' : 'text-red-400'}`}>
            {check.passed ? '✓' : '✗'}
          </span>
          <div className="flex-1 min-w-0">
            <span className={`text-xs ${check.passed ? 'text-gray-700' : 'text-gray-500'}`}>
              {check.label}
            </span>
            {!check.passed && (
              <p className="text-xs text-red-500 mt-0.5">{check.message}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

type SeoSection = 'basic' | 'additional' | 'titleRead' | 'contentRead';

const SECTION_LABELS: Record<SeoSection, string> = {
  basic:       'Basic SEO',
  additional:  'Additional SEO',
  titleRead:   'Title Readability',
  contentRead: 'Content Readability',
};

export function SeoPanel({ html, keyword, title, metaDescription, onMetaChange }: SeoPanelProps) {
  const [expandedSection, setExpandedSection] = useState<SeoSection | null>('basic');

  const score: SeoScore = useMemo(
    () => runAllSeoChecks(html, keyword, title, metaDescription),
    [html, keyword, title, metaDescription],
  );

  const totalPassed = (
    countPassedChecks(score.basic) +
    countPassedChecks(score.additional) +
    countPassedChecks(score.titleRead) +
    countPassedChecks(score.contentRead)
  );
  const totalChecks = 21;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Overall score ring */}
      <div className="text-center py-3 border-b border-gray-100">
        <div className={`text-3xl font-bold ${totalPassed >= 17 ? 'text-green-600' : totalPassed >= 12 ? 'text-amber-500' : 'text-red-500'}`}>
          {totalPassed}/{totalChecks}
        </div>
        <div className="text-xs text-gray-500 mt-1">SEO Score</div>
      </div>

      {/* SERP Preview */}
      <SerpPreview
        title={title}
        description={metaDescription}
        keyword={keyword}
        onChange={onMetaChange}
      />

      {/* Score bars summary */}
      <div>
        <ScoreBar label="Basic SEO"          passed={countPassedChecks(score.basic)}       total={7} />
        <ScoreBar label="Additional SEO"     passed={countPassedChecks(score.additional)}  total={7} />
        <ScoreBar label="Title Readability"  passed={countPassedChecks(score.titleRead)}   total={4} />
        <ScoreBar label="Content Readability"passed={countPassedChecks(score.contentRead)} total={3} />
      </div>

      {/* Expandable sections */}
      {(Object.keys(SECTION_LABELS) as SeoSection[]).map((section) => {
        const checks = score[section];
        const passed = countPassedChecks(checks);
        const isOpen = expandedSection === section;

        return (
          <div key={section} className="border border-gray-100 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedSection(isOpen ? null : section)}
              className="w-full flex justify-between items-center px-3 py-2.5 text-left hover:bg-gray-50"
            >
              <span className="text-xs font-semibold text-gray-700">{SECTION_LABELS[section]}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${passed === checks.length ? 'text-green-600' : 'text-amber-500'}`}>
                  {passed}/{checks.length}
                </span>
                <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                <CheckList checks={checks} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## 5. Article Editor — `web/components/editor/ArticleEditor.tsx`

ContentEditable với toolbar formatting cơ bản. Không cần TipTap — giữ đơn giản.

```tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { EditorToolbar } from './EditorToolbar';

interface ArticleEditorProps {
  html:          string;
  streaming?:    boolean;  // Đang stream → disable editing
  onChange:      (html: string) => void;
  onParagraphSelect?: (text: string, element: HTMLElement) => void;
}

export function ArticleEditor({ html, streaming, onChange, onParagraphSelect }: ArticleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Inject HTML từ stream / DB vào editor
  useEffect(() => {
    if (!editorRef.current) return;
    // Chỉ update nếu nội dung khác — tránh reset cursor
    if (editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [html]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  // Track paragraph được click → notify AiAssistPanel
  const handleClick = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;
    const node = selection.anchorNode;
    if (!node) return;

    // Tìm <p> hoặc <h2/h3> gần nhất
    let el: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;
    while (el && el !== editorRef.current) {
      if (['P', 'H1', 'H2', 'H3', 'LI'].includes(el.tagName)) {
        onParagraphSelect?.(el.innerText, el);
        return;
      }
      el = el.parentElement;
    }
  }, [onParagraphSelect]);

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editorRef={editorRef} disabled={streaming} />
      <div
        ref={editorRef}
        contentEditable={!streaming}
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={handleClick}
        className={`
          flex-1 overflow-y-auto p-6 outline-none
          prose prose-sm max-w-none
          [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4
          [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3
          [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2
          [&_p]:text-gray-800 [&_p]:leading-relaxed [&_p]:mb-3
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
          [&_strong]:font-semibold
          [&_a]:text-blue-600 [&_a]:underline
          ${streaming ? 'cursor-not-allowed opacity-80 bg-gray-50' : 'bg-white cursor-text'}
        `}
      />
    </div>
  );
}
```

---

## 6. Editor Toolbar — `web/components/editor/EditorToolbar.tsx`

```tsx
'use client';

import type { RefObject } from 'react';

interface EditorToolbarProps {
  editorRef: RefObject<HTMLDivElement | null>;
  disabled?: boolean;
}

function execCmd(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function ToolBtn({
  label, title, onClick, disabled,
}: {
  label: string; title: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }} // preventDefault giữ selection
      title={title}
      disabled={disabled}
      className="px-2.5 py-1.5 text-sm rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed font-mono"
    >
      {label}
    </button>
  );
}

export function EditorToolbar({ editorRef, disabled }: EditorToolbarProps) {
  const insertLink = () => {
    const url = prompt('Nhập URL:');
    if (url) execCmd('createLink', url);
  };

  const wrapWithTag = (tag: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const el = document.createElement(tag);
    try { range.surroundContents(el); } catch { execCmd('formatBlock', tag); }
  };

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50 flex-wrap sticky top-0 z-10">
      <ToolBtn label="B"  title="Bold (Ctrl+B)"   onClick={() => execCmd('bold')}   disabled={disabled} />
      <ToolBtn label="I"  title="Italic (Ctrl+I)"  onClick={() => execCmd('italic')} disabled={disabled} />
      <ToolBtn label="U"  title="Underline"        onClick={() => execCmd('underline')} disabled={disabled} />
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <ToolBtn label="H2" title="Heading 2"        onClick={() => wrapWithTag('h2')} disabled={disabled} />
      <ToolBtn label="H3" title="Heading 3"        onClick={() => wrapWithTag('h3')} disabled={disabled} />
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <ToolBtn label="ul" title="Bullet list"      onClick={() => execCmd('insertUnorderedList')} disabled={disabled} />
      <ToolBtn label="ol" title="Numbered list"    onClick={() => execCmd('insertOrderedList')}   disabled={disabled} />
      <ToolBtn label="🔗" title="Insert link"       onClick={insertLink} disabled={disabled} />
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <ToolBtn label="↩" title="Undo (Ctrl+Z)"    onClick={() => execCmd('undo')} disabled={disabled} />
      <ToolBtn label="↪" title="Redo (Ctrl+Y)"    onClick={() => execCmd('redo')} disabled={disabled} />
    </div>
  );
}
```

---

## 7. AI Assist Panel — `web/components/editor/AiAssistPanel.tsx`

User click đoạn văn bên trái → text hiện vào panel → chọn lệnh → AI response hiện trong panel → apply để thay thế.

```tsx
'use client';

import { useState } from 'react';

export type AiAssistCommand =
  | 'explain' | 'title' | 'outline' | 'shorten' | 'rewrite'
  | 'list' | 'pros_cons' | 'intro' | 'conclusion' | 'faqs';

const COMMANDS: Array<{ value: AiAssistCommand; label: string; icon: string }> = [
  { value: 'explain',    label: 'Giải thích',       icon: '💬' },
  { value: 'title',      label: 'Đặt tiêu đề',      icon: '📝' },
  { value: 'outline',    label: 'Tạo outline',       icon: '📋' },
  { value: 'shorten',    label: 'Rút ngắn',          icon: '✂️' },
  { value: 'rewrite',    label: 'Viết lại',          icon: '🔄' },
  { value: 'list',       label: 'Thành danh sách',   icon: '📌' },
  { value: 'pros_cons',  label: 'Ưu & Nhược điểm',  icon: '⚖️' },
  { value: 'intro',      label: 'Viết mở bài',       icon: '🚀' },
  { value: 'conclusion', label: 'Viết kết bài',      icon: '🏁' },
  { value: 'faqs',       label: 'Tạo FAQ',           icon: '❓' },
];

const AI_MODELS = [
  { value: 'gemini-flash', label: 'Gemini Flash' },
  { value: 'gpt-4o',       label: 'ChatGPT 4o' },
  { value: 'gemini-pro',   label: 'Gemini Pro' },
];

interface AiAssistPanelProps {
  selectedText:    string;
  selectedElement: HTMLElement | null;
  keyword:         string;
  onApply:         (newHtml: string, element: HTMLElement | null) => void;
}

export function AiAssistPanel({ selectedText, selectedElement, keyword, onApply }: AiAssistPanelProps) {
  const [model,    setModel]    = useState('gemini-flash');
  const [aiResult, setAiResult] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [askFree,  setAskFree]  = useState('');

  async function runCommand(command: AiAssistCommand | 'ask') {
    const text = selectedText.trim() || keyword;
    if (!text && command !== 'intro' && command !== 'conclusion') return;

    setLoading(true);
    setAiResult('');

    try {
      const res = await fetch('/api/editor/ai-assist', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          command,
          text:    text || keyword,
          keyword,
          model,
          freePrompt: command === 'ask' ? askFree : undefined,
        }),
      });

      if (!res.ok || !res.body) throw new Error('Lỗi AI');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as { text?: string; done?: boolean };
              if (data.text) setAiResult((prev) => prev + data.text);
            } catch { /* skip */ }
          }
        }
      }
    } catch (err) {
      setAiResult(`Lỗi: ${err instanceof Error ? err.message : 'Không xác định'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 flex flex-col h-full gap-3">
      {/* Selected paragraph preview */}
      <div className="text-xs text-gray-500 font-semibold uppercase">Đoạn đã chọn</div>
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 max-h-28 overflow-y-auto border border-gray-200">
        {selectedText || <span className="text-gray-400 italic">Click vào một đoạn văn bên trái để chọn.</span>}
      </div>

      {/* Model selector */}
      <div className="flex gap-1.5 flex-wrap">
        {AI_MODELS.map((m) => (
          <button
            key={m.value}
            onClick={() => setModel(m.value)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              model === m.value ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 text-gray-600 hover:border-blue-300'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Command buttons */}
      <div className="grid grid-cols-2 gap-1.5">
        {COMMANDS.map((cmd) => (
          <button
            key={cmd.value}
            onClick={() => runCommand(cmd.value)}
            disabled={loading}
            className="text-xs px-2 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <span>{cmd.icon}</span>
            <span>{cmd.label}</span>
          </button>
        ))}
      </div>

      {/* Free-form Ask AI */}
      <div className="flex gap-2">
        <input
          type="text"
          value={askFree}
          onChange={(e) => setAskFree(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runCommand('ask')}
          placeholder="Yêu cầu khác..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => runCommand('ask')}
          disabled={loading || !askFree.trim()}
          className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '⟳' : 'Gửi'}
        </button>
      </div>

      {/* AI Result */}
      {(aiResult || loading) && (
        <div className="flex-1 flex flex-col gap-2">
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-gray-800 flex-1 overflow-y-auto border border-blue-100 whitespace-pre-wrap">
            {loading && !aiResult ? (
              <span className="animate-pulse text-gray-400">AI đang viết...</span>
            ) : (
              aiResult
            )}
          </div>

          {aiResult && !loading && (
            <button
              onClick={() => onApply(aiResult, selectedElement)}
              className="w-full py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 font-medium"
            >
              ✓ Áp dụng thay thế đoạn đã chọn
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 8. Tags Input — `web/components/editor/TagsInput.tsx`

```tsx
'use client';

import { useState, KeyboardEvent } from 'react';

interface TagsInputProps {
  tags:     string[];
  onChange: (tags: string[]) => void;
}

export function TagsInput({ tags, onChange }: TagsInputProps) {
  const [input, setInput] = useState('');

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInput('');
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center p-3 border border-gray-300 rounded-lg bg-white min-h-[44px]">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
        >
          {tag}
          <button onClick={() => removeTag(tag)} className="hover:text-blue-900 leading-none">×</button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? 'Thêm tag, nhấn Enter...' : ''}
        className="flex-1 min-w-24 text-sm outline-none bg-transparent"
      />
    </div>
  );
}
```

---

## 9. Export Menu — `web/components/editor/ExportMenu.tsx`

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface ExportMenuProps {
  articleId: string;
  html:      string;
  title:     string;
}

export function ExportMenu({ articleId, html, title }: ExportMenuProps) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleExport(format: 'html' | 'txt' | 'md' | 'docx') {
    setLoading(format);
    try {
      if (format === 'html') {
        // Client-side: download HTML với basic styles
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${html}</body></html>`;
        download(`${slugify(title)}.html`, fullHtml, 'text/html');
      } else if (format === 'txt') {
        const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        download(`${slugify(title)}.txt`, text, 'text/plain');
      } else if (format === 'md') {
        // Server-side: convert HTML → Markdown
        const res = await fetch('/api/editor/export', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ articleId, format: 'md', html, title }),
        });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        downloadBlob(blob, `${slugify(title)}.md`);
      } else if (format === 'docx') {
        // Server-side: convert HTML → DOCX
        const res = await fetch('/api/editor/export', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ articleId, format: 'docx', html, title }),
        });
        if (!res.ok) throw new Error('Export DOCX failed');
        const blob = await res.blob();
        downloadBlob(blob, `${slugify(title)}.docx`);
      }
    } catch (err) {
      alert(`Export thất bại: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
      >
        Export <span className="text-gray-400">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-36">
          {[
            { format: 'html' as const, label: 'Export .HTML' },
            { format: 'txt'  as const, label: 'Export .TXT' },
            { format: 'md'   as const, label: 'Markdown .MD' },
            { format: 'docx' as const, label: 'Export .DOCX' },
          ].map(({ format, label }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={loading === format}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
            >
              {loading === format ? <span className="animate-spin text-xs">⟳</span> : null}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, '-').replace(/^-|-$/g, '');
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## 10. Publish Panel — `web/components/editor/PublishPanel.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';

interface Website {
  id:   string;
  name: string;
  url:  string;
}

interface PublishPanelProps {
  articleId:  string;
  title:      string;
  onClose:    () => void;
  onSuccess?: (link: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
  return { value: i, label: h };
});

export function PublishPanel({ articleId, title, onClose, onSuccess }: PublishPanelProps) {
  const [sites,      setSites]      = useState<Website[]>([]);
  const [siteId,     setSiteId]     = useState('');
  const [category,   setCategory]   = useState('');
  const [scheduleHr, setScheduleHr] = useState<number | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  // Load danh sách websites đã cấu hình
  useEffect(() => {
    fetch('/api/websites')
      .then((r) => r.json())
      .then((data: { sites: Website[] }) => {
        setSites(data.sites ?? []);
        if (data.sites?.length === 1) setSiteId(data.sites[0].id);
      })
      .catch(() => { /* ignore */ });
  }, []);

  async function handlePublish() {
    if (!siteId) { setError('Vui lòng chọn website.'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/articles/${articleId}/publish`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          category:    category || undefined,
          scheduleHour: scheduleHr ?? undefined,
        }),
      });
      const data = await res.json() as { postUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Publish thất bại');
      onSuccess?.(data.postUrl ?? '');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="flex-1 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="w-80 bg-white shadow-xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold text-gray-800">Đăng bài lên website</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Site selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            {sites.length === 0 ? (
              <p className="text-xs text-gray-400">
                Chưa có website.{' '}
                <a href="/cau-hinh-website" className="text-blue-500 underline">Thêm website</a>
              </p>
            ) : (
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn website --</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục (tuỳ chọn)</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="VD: Nội Thất, Giường..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian đăng</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={scheduleHr === null}
                  onChange={() => setScheduleHr(null)}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">Đăng ngay</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={scheduleHr !== null}
                  onChange={() => setScheduleHr(8)}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">Hẹn giờ</span>
              </label>
              {scheduleHr !== null && (
                <select
                  value={scheduleHr}
                  onChange={(e) => setScheduleHr(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Huỷ
          </button>
          <button
            onClick={handlePublish}
            disabled={loading || !siteId}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang đăng...' : scheduleHr !== null ? 'Hẹn giờ đăng' : 'Đăng bài'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 11. API: `/api/editor/ai-assist/route.ts`

10 AI commands — SSE stream response.

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';

export const runtime = 'nodejs';

const COMMAND_PROMPTS: Record<string, (text: string, keyword: string, freePrompt?: string) => string> = {
  explain:    (text) => `Giải thích rõ hơn đoạn văn sau bằng ngôn ngữ dễ hiểu, thêm ví dụ cụ thể:\n\n${text}`,
  title:      (text, kw) => `Đề xuất 5 tiêu đề hấp dẫn cho đoạn nội dung về "${kw}" sau:\n\n${text}`,
  outline:    (text, kw) => `Tạo outline 5-8 heading (H2/H3) từ nội dung về "${kw}":\n\n${text}\n\nFormat: mỗi dòng [h2] hoặc [h3] + text.`,
  shorten:    (text) => `Rút ngắn đoạn văn sau còn khoảng 50% độ dài, giữ ý chính:\n\n${text}`,
  rewrite:    (text, kw) => `Viết lại đoạn văn sau theo phong cách tự nhiên hơn, tránh giọng AI. Keyword: "${kw}":\n\n${text}`,
  list:       (text) => `Chuyển nội dung sau thành danh sách HTML <ul><li> rõ ràng:\n\n${text}`,
  pros_cons:  (text, kw) => `Liệt kê ưu điểm và nhược điểm dựa trên nội dung về "${kw}" sau, format HTML:\n\n${text}`,
  intro:      (_, kw) => `Viết đoạn mở bài hấp dẫn (3-5 câu) cho bài viết về: "${kw}"`,
  conclusion: (_, kw) => `Viết đoạn kết bài thực tế (3-5 câu) cho bài viết về: "${kw}". CTA cụ thể, không dùng "Hy vọng bài viết hữu ích".`,
  faqs:       (text, kw) => `Tạo 5 câu hỏi FAQ (với câu trả lời ngắn 2-3 câu) dựa trên nội dung về "${kw}":\n\n${text}`,
  ask:        (text, kw, freePrompt) => `${freePrompt}\n\nNgữ cảnh (keyword: "${kw}"):\n${text}`,
};

const schema = z.object({
  command:    z.string(),
  text:       z.string().max(3000),
  keyword:    z.string().max(200),
  model:      z.string().default('gemini-flash'),
  freePrompt: z.string().max(500).optional(),
});

function sseChunk(controller: ReadableStreamDefaultController, text: string) {
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`),
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Payload không hợp lệ' }), { status: 400 });
    }

    const { command, text, keyword, model, freePrompt } = parsed.data;
    const promptBuilder = COMMAND_PROMPTS[command] ?? COMMAND_PROMPTS.ask;
    const prompt = promptBuilder(text, keyword, freePrompt);

    const aiModel = buildTinhGonModel(model);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const aiStream = await aiModel.generateContentStream(prompt);
          for await (const chunk of aiStream) {
            const t = chunk.text();
            if (t) sseChunk(controller, t);
          }
        } catch {
          const result = await aiModel.generateContent(prompt);
          sseChunk(controller, result.response.text());
        } finally {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache',
        Connection:          'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Lỗi server' }), { status: 500 });
  }
}
```

---

## 12. API: `/api/editor/export/route.ts`

Server-side export cho MD và DOCX.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const schema = z.object({
  format:    z.enum(['md', 'docx']),
  html:      z.string(),
  title:     z.string(),
  articleId: z.string().optional(),
});

/** HTML → Markdown (đơn giản, không cần Turndown) */
function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '$1\n')
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, '$1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, '')           // strip remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')        // collapse multiple blank lines
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { format, html, title } = parsed.data;

    if (format === 'md') {
      const markdown = `# ${title}\n\n${htmlToMarkdown(html)}`;
      return new Response(markdown, {
        headers: {
          'Content-Type':        'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.md"`,
        },
      });
    }

    if (format === 'docx') {
      // Dùng html-to-docx npm package
      // npm install html-to-docx
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const HTMLtoDOCX = require('html-to-docx') as (html: string, header: null, opts: object) => Promise<Buffer>;
      const fullHtml = `<!DOCTYPE html><html><body><h1>${title}</h1>${html}</body></html>`;
      const buffer = await HTMLtoDOCX(fullHtml, null, {
        table:     { row: { cantSplit: true } },
        footer:    true,
        pageNumber: true,
      });

      return new Response(buffer, {
        headers: {
          'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.docx"`,
        },
      });
    }

    return NextResponse.json({ error: 'Format không hỗ trợ' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi export';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

> **Package cần cài:** `npm install html-to-docx`

---

## 13. API: `/api/articles/[id]/publish/route.ts`

Publish lên WordPress qua REST API.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';

const schema = z.object({
  siteId:       z.string(),
  category:     z.string().optional(),
  scheduleHour: z.number().min(0).max(23).optional(),
});

interface WordPressPost {
  id:   number;
  link: string;
}

async function publishToWordPress(
  siteUrl:     string,
  username:    string,
  appPassword: string,
  post: {
    title:       string;
    content:     string;
    status:      'publish' | 'future';
    categories?: number[];
    date?:       string;
  },
): Promise<WordPressPost> {
  const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

  const res = await fetch(`${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      title:      post.title,
      content:    post.content,
      status:     post.status,
      date:       post.date,
      categories: post.categories,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `WordPress trả lỗi ${res.status}`);
  }

  return res.json() as Promise<WordPressPost>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user    = await requireAuth();
    const rawBody = await request.json();
    const parsed  = schema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { siteId, category, scheduleHour } = parsed.data;

    // Load article
    const article = await prisma.article.findFirst({
      where: { id: params.id, userId: user.userId, deletedAt: null },
    });
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Load website config (model Website trong Prisma — cần có siteUrl, wpUsername, wpAppPassword)
    const website = await prisma.website.findFirst({
      where: { id: siteId, userId: user.userId },
    });
    if (!website) {
      return NextResponse.json({ error: 'Website không tồn tại' }, { status: 404 });
    }

    // Build scheduled date nếu cần
    let publishDate: string | undefined;
    let status: 'publish' | 'future' = 'publish';

    if (scheduleHour !== undefined) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(scheduleHour, 0, 0, 0);
      publishDate = tomorrow.toISOString().replace('.000Z', '');
      status = 'future';
    }

    // Publish
    const wpPost = await publishToWordPress(
      website.siteUrl,
      website.wpUsername,
      website.wpAppPassword,
      {
        title:   article.selectedTitle ?? article.keyword,
        content: article.htmlContent ?? '',
        status,
        date:    publishDate,
      },
    );

    // Update article status
    await prisma.article.update({
      where: { id: params.id },
      data:  { status: 'PUBLISHED' },
    });

    return NextResponse.json({ postUrl: wpPost.link, postId: wpPost.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish thất bại';
    const status  = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

> **Prisma Schema cần thêm** (nếu chưa có):
> ```prisma
> model Website {
>   id            String   @id @default(cuid())
>   userId        String
>   name          String
>   siteUrl       String
>   wpUsername    String
>   wpAppPassword String   @db.Text   // WordPress Application Password
>   createdAt     DateTime @default(now())
>   updatedAt     DateTime @updatedAt
> }
> ```

---

## 14. Tích hợp vào generate page hiện tại

Thay toàn bộ nội dung `generate/page.tsx` của từng feature thành layout 2 cột dùng shared components.

**Skeleton generate page mới** (áp dụng cho tất cả features):

```tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ArticleEditor } from '@/components/editor/ArticleEditor';
import { SeoPanel } from '@/components/editor/SeoPanel';
import { AiAssistPanel } from '@/components/editor/AiAssistPanel';
import { TagsInput } from '@/components/editor/TagsInput';
import { ExportMenu } from '@/components/editor/ExportMenu';
import { PublishPanel } from '@/components/editor/PublishPanel';
// import feature-specific config type and sessionStorage prefix

type RightTab = 'seo' | 'ai' | 'media';

export default function GeneratePage() {
  // ─── State ───────────────────────────────────────────────────────────────
  const [html,            setHtml]            = useState('');
  const [title,           setTitle]           = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keyword,         setKeyword]         = useState('');
  const [articleId,       setArticleId]       = useState('');
  const [runId,           setRunId]           = useState('');
  const [tags,            setTags]            = useState<string[]>([]);
  const [streaming,       setStreaming]        = useState(false);
  const [streamSteps,     setStreamSteps]     = useState<string[]>([]);
  const [rightTab,        setRightTab]        = useState<RightTab>('seo');
  const [showPublish,     setShowPublish]      = useState(false);
  const [saving,          setSaving]           = useState(false);
  const [saveStatus,      setSaveStatus]       = useState<'saved' | 'dirty' | 'saving'>('saved');
  const [selectedText,    setSelectedText]     = useState('');
  const [selectedElement, setSelectedElement]  = useState<HTMLElement | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ─── Bootstrap ───────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Load từ sessionStorage
    // 2. Bootstrap SSE stream
    // (copy from current generate/page.tsx, chỉ thay sessionStorage prefix)
  }, []);

  // ─── Auto-save debounce ───────────────────────────────────────────────────
  function markDirty() {
    setSaveStatus('dirty');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(autoSave, 2000);
  }

  async function autoSave() {
    if (!articleId) return;
    setSaveStatus('saving');
    try {
      await fetch(`/api/articles/${articleId}/save`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ htmlContent: html, selectedTitle: title, metaDescription }),
      });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('dirty');
    }
  }

  const handleHtmlChange = useCallback((newHtml: string) => {
    setHtml(newHtml);
    markDirty();
  }, []);

  // ─── Apply AI result ─────────────────────────────────────────────────────
  function handleAiApply(newText: string, element: HTMLElement | null) {
    if (!element) return;
    element.innerHTML = newText;
    setHtml(document.querySelector('[contenteditable]')?.innerHTML ?? html);
    markDirty();
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white z-10">
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Bài viết</a>
          <span className="text-sm text-gray-600 font-medium truncate max-w-xs">{title || keyword}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            saveStatus === 'saved'  ? 'bg-green-100 text-green-600' :
            saveStatus === 'saving' ? 'bg-blue-100  text-blue-600'  :
                                     'bg-gray-100   text-gray-500'
          }`}>
            {saveStatus === 'saved' ? '✓ Đã lưu' : saveStatus === 'saving' ? '⟳ Đang lưu...' : '● Chưa lưu'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ExportMenu articleId={articleId} html={html} title={title} />
          <button
            onClick={autoSave}
            disabled={saveStatus !== 'dirty'}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Lưu
          </button>
          <button
            onClick={() => setShowPublish(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
          >
            Đăng bài
          </button>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Editor */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {/* SSE loading steps */}
          {streaming && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 space-y-1">
              {streamSteps.map((step, i) => (
                <p key={i} className="text-xs text-blue-700">
                  {i === streamSteps.length - 1 ? '⟳ ' : '✓ '}{step}
                </p>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <ArticleEditor
              html={html}
              streaming={streaming}
              onChange={handleHtmlChange}
              onParagraphSelect={(text, el) => {
                setSelectedText(text);
                setSelectedElement(el);
                setRightTab('ai'); // Auto-switch to AI tab on selection
              }}
            />
          </div>

          {/* Tags below editor */}
          <div className="border-t border-gray-200 px-6 py-3 bg-white">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 flex-shrink-0">Tags</span>
              <TagsInput tags={tags} onChange={setTags} />
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="w-80 flex-shrink-0 border-l border-gray-200 flex flex-col overflow-hidden bg-white">

          {/* Tab selector */}
          <div className="flex border-b border-gray-200">
            {(['seo', 'ai', 'media'] as RightTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                  rightTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'seo' ? 'SEO' : tab === 'ai' ? 'AI' : 'Media'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {rightTab === 'seo' && (
              <SeoPanel
                html={html}
                keyword={keyword}
                title={title}
                metaDescription={metaDescription}
                onMetaChange={(field, value) => {
                  if (field === 'title') { setTitle(value); markDirty(); }
                  else { setMetaDescription(value); markDirty(); }
                }}
              />
            )}
            {rightTab === 'ai' && (
              <AiAssistPanel
                selectedText={selectedText}
                selectedElement={selectedElement}
                keyword={keyword}
                onApply={handleAiApply}
              />
            )}
            {rightTab === 'media' && (
              <div className="p-4 text-sm text-gray-400 text-center mt-8">
                Media panel — coming soon
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Publish panel overlay */}
      {showPublish && (
        <PublishPanel
          articleId={articleId}
          title={title}
          onClose={() => setShowPublish(false)}
          onSuccess={(link) => alert(`Đăng thành công! ${link}`)}
        />
      )}
    </div>
  );
}
```

---

## 15. Thứ tự implement (12 bước)

| Bước | File | Ghi chú |
|------|------|---------|
| 1 | `components/editor/SeoChecks.ts` | Pure functions — viết unit test trước |
| 2 | `components/editor/SerpPreview.tsx` | Test với title/description mẫu |
| 3 | `components/editor/SeoPanel.tsx` | Import SeoChecks + SerpPreview |
| 4 | `components/editor/EditorToolbar.tsx` | Test execCommand trong browser |
| 5 | `components/editor/ArticleEditor.tsx` | Test contenteditable + onParagraphSelect |
| 6 | `components/editor/TagsInput.tsx` | Simple, test enter/backspace/comma |
| 7 | `components/editor/ExportMenu.tsx` | Test HTML và TXT trước (client-side) |
| 8 | `api/editor/export/route.ts` | Test MD, rồi DOCX (cần `npm install html-to-docx`) |
| 9 | `api/editor/ai-assist/route.ts` | Test 3 lệnh: shorten, rewrite, faqs |
| 10 | `components/editor/AiAssistPanel.tsx` | Tích hợp với ai-assist route |
| 11 | `components/editor/PublishPanel.tsx` | Test sau khi có Website model + WP creds |
| 12 | `api/articles/[id]/publish/route.ts` + cập nhật mỗi generate/page.tsx | Apply shared components |

---

## 16. QA Checklist

### SeoChecks
- [ ] Keyword trong H1 → basic[0] passed ✓
- [ ] Keyword trong 150 từ đầu → basic[1] passed ✓
- [ ] wordCount < 300 → basic[2] fail ✓
- [ ] Density 1.5% → additional[0] passed ✓
- [ ] Density 0.2% → additional[0] fail với message ✓
- [ ] Title 55 chars → titleRead[0] passed ✓
- [ ] Title 75 chars → titleRead[0] fail ✓
- [ ] `runAllSeoChecks` trả đúng 21 checks ✓

### ArticleEditor
- [ ] HTML streamed vào editor hiển thị đúng ✓
- [ ] `streaming=true` → contentEditable=false, opacity-80 ✓
- [ ] Gõ vào editor → `onChange` gọi ✓
- [ ] Click đoạn văn → `onParagraphSelect` gọi với đúng text ✓
- [ ] Ctrl+B → bold ✓; Ctrl+Z → undo ✓

### SeoPanel
- [ ] Score bars cập nhật realtime khi edit ✓
- [ ] SerpPreview hiển thị keyword highlight ✓
- [ ] SerpPreview length bar đổi màu theo độ dài ✓
- [ ] Expand/collapse từng section ✓

### AiAssistPanel
- [ ] Model selector chuyển đổi được ✓
- [ ] Click command → stream hiện trong panel ✓
- [ ] "Áp dụng" → selectedElement.innerHTML cập nhật ✓
- [ ] Nếu không có selectedText → "intro" và "conclusion" vẫn chạy được ✓

### Export
- [ ] HTML: download file, có đủ `<html>` wrapper ✓
- [ ] TXT: strip tất cả HTML tags ✓
- [ ] MD: convert `<h2>` → `## `, `<strong>` → `**` ✓
- [ ] DOCX: file mở được trong Word (nếu html-to-docx installed) ✓

### Publish
- [ ] Submit không có siteId → error "Vui lòng chọn website" ✓
- [ ] Đăng ngay → WordPress post status = "publish" ✓
- [ ] Hẹn giờ 8AM → status = "future", date = tomorrow 08:00 ✓
- [ ] WP credentials sai → error message từ WordPress ✓
- [ ] Publish thành công → article.status = 'PUBLISHED' trong DB ✓

---

## 17. Lỗi thường gặp

| # | Lỗi | Nguyên nhân | Fix |
|---|-----|-------------|-----|
| 1 | `contentEditable` reset cursor khi re-render | `useEffect` inject `innerHTML` mỗi lần `html` state thay đổi | Check `editorRef.current.innerHTML !== html` trước khi set |
| 2 | `execCommand` không hoạt động | Mất selection sau khi click toolbar button | Dùng `onMouseDown + e.preventDefault()` trong ToolBtn |
| 3 | SeoChecks tính sai keyword density | `kwCount` match partial word | Dùng regex `\b` hoặc count chính xác hơn |
| 4 | Export DOCX fail | `html-to-docx` chưa install | `npm install html-to-docx` + restart dev server |
| 5 | Publish "Cannot connect" | WordPress URL sai hoặc Application Password sai | Verify URL không có trailing slash, password là Application Password (không phải account password) |
| 6 | AI Assist stream không kết thúc | Frontend không xử lý `{ done: true }` event | Thêm `if (data.done) { reader.cancel(); break; }` |
| 7 | Tags không lưu vào DB | `autoSave` không include `tags` | Thêm `tags` vào PATCH body và vào `article/save` route handler |
| 8 | SeoPanel không cập nhật khi typing | `useMemo` với deps thiếu | Đảm bảo `[html, keyword, title, metaDescription]` đều trong deps array |
