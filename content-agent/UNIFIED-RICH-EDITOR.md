# UNIFIED-RICH-EDITOR.md
## Thống nhất Editor cho tất cả Generate Pages

> Mục tiêu: Tất cả generate pages dùng chung 1 rich editor giống `viet-danh-gia-san-pham/generate`.
> Phương pháp: Extract toolbar từ `viet-danh-gia-san-pham/generate` → shared component → các pages còn lại tự upgrade.

---

## PHÂN TÍCH HIỆN TRẠNG

### Editor A — `viet-danh-gia-san-pham/generate` (gold standard)
Custom contentEditable inline, toolbar có đầy đủ:

| Tính năng | Có |
|-----------|-----|
| Paragraph dropdown (P/H2/H3) | ✅ |
| Color picker (portal dropdown) | ✅ |
| Font size picker (portal dropdown) | ✅ |
| B / I / U | ✅ |
| Align left/center/right | ✅ |
| Bullet list / Ordered list | ✅ |
| Link modal (url + anchor text + target) | ✅ |
| Image modal (url + alt + upload tab) | ✅ |
| Table insertion (grid selector) | ✅ |
| Undo / Redo | ✅ |
| Find & Replace (+ options: case, whole word) | ✅ |
| Clear highlights | ✅ |
| Export Word (.doc) | ✅ |
| View Source (edit raw HTML) | ✅ |
| Word count display | ✅ |
| Ctrl+S → save | ✅ |

### Editor B — `ArticleEditor` + `EditorToolbar` (dùng bởi 6 pages còn lại)
| Tính năng | Có |
|-----------|-----|
| B / I / U | ✅ |
| H2 / H3 (via wrapWithTag) | ✅ |
| ul / ol | ✅ |
| Link (prompt dialog) | ✅ |
| Undo / Redo | ✅ |
| Paragraph dropdown | ❌ |
| Color picker | ❌ |
| Font size | ❌ |
| Align | ❌ |
| Image | ❌ |
| Table | ❌ |
| Find & Replace | ❌ |
| Export Word | ❌ |
| View Source | ❌ |
| Word count | ❌ |

### Pages dùng `ArticleEditor` (sẽ được upgrade):
```
web/app/viet-theo-tu-khoa/generate/page.tsx
web/app/viet-bai-thong-minh/step4/page.tsx
web/app/viet-tu-google-search/generate/page.tsx
web/app/viet-lai-tin-tuc/generate/page.tsx
web/app/viet-lai-url/generate/page.tsx
web/app/viet-lai-bai-viet/generate/page.tsx
```

---

## PLAN — 3 BƯỚC

```
Bước 1: Tạo RichEditorToolbar.tsx (mới)
Bước 2: Cập nhật ArticleEditor.tsx dùng RichEditorToolbar
Bước 3: Refactor viet-danh-gia-san-pham/generate dùng ArticleEditor
```

Sau Bước 2, tất cả 6 pages dùng `ArticleEditor` tự động có rich editor.
Bước 3 thống nhất nốt `viet-danh-gia-san-pham/generate`.

---

## BƯỚC 1 — Tạo `RichEditorToolbar.tsx`

**File:** `web/components/editor/RichEditorToolbar.tsx`

Extract toàn bộ toolbar từ `viet-danh-gia-san-pham/generate/page.tsx`.

### Interface

```typescript
interface RichEditorToolbarProps {
  editorRef: RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  wordCount?: number;
  onSave?: () => void;        // Ctrl+S callback
  onNewArticle?: () => void;  // "Bài mới" button (optional — chỉ cần nếu page cần)
}
```

### State cần giữ TRONG component (tất cả state toolbar):

```typescript
// Refs
const colorBtnRef = useRef<HTMLButtonElement>(null);
const fontBtnRef = useRef<HTMLButtonElement>(null);
const paragraphBtnRef = useRef<HTMLButtonElement>(null);
const tableBtnRef = useRef<HTMLButtonElement>(null);
const savedRangeRef = useRef<Range | null>(null);

// Dropdown toggles + positions (portal-based)
const [formatMenuOpen, setFormatMenuOpen] = useState(false);
const [showColorPicker, setShowColorPicker] = useState(false);
const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
const [showTableMenu, setShowTableMenu] = useState(false);
const [currentColor, setCurrentColor] = useState('#000000');
const [currentFontSize, setCurrentFontSize] = useState('14px');
const [colorDropPos, setColorDropPos] = useState({ top: 0, left: 0 });
const [fontDropPos, setFontDropPos] = useState({ top: 0, left: 0 });
const [paragraphDropPos, setParagraphDropPos] = useState({ top: 0, left: 0 });
const [tableDropPos, setTableDropPos] = useState({ top: 0, left: 0 });
const [tableGridSize, setTableGridSize] = useState({ rows: 0, cols: 0 });

// Modals
const [showLinkModal, setShowLinkModal] = useState(false);
const [linkUrl, setLinkUrl] = useState('');
const [linkText, setLinkText] = useState('');
const [linkTitle, setLinkTitle] = useState('');
const [linkTarget, setLinkTarget] = useState('_self');

const [showImgModal, setShowImgModal] = useState(false);
const [imgUrl, setImgUrl] = useState('');
const [imgAlt, setImgAlt] = useState('');
const [imgTitle, setImgTitle] = useState('');
const [imgWidth, setImgWidth] = useState('');
const [imgHeight, setImgHeight] = useState('');
const [imgModalTab, setImgModalTab] = useState<'general' | 'upload'>('general');

const [showSourceModal, setShowSourceModal] = useState(false);
const [sourceCode, setSourceCode] = useState('');

const [showFindReplace, setShowFindReplace] = useState(false);
const [findText, setFindText] = useState('');
const [replaceText, setReplaceText] = useState('');
const [findCount, setFindCount] = useState<number | null>(null);
const [matchCase, setMatchCase] = useState(false);
const [wholeWord, setWholeWord] = useState(false);

// Misc
const [hasHighlights, setHasHighlights] = useState(false);
```

### Helper functions (copy từ viet-danh-gia-san-pham):

```typescript
function execFormat(cmd: string, value?: string) {
  editorRef.current?.focus();
  document.execCommand(cmd, false, value ?? undefined);
}

function saveSelection() {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
  }
}

function restoreSelection() {
  const selection = window.getSelection();
  if (selection && savedRangeRef.current) {
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  }
}

function exportToWord() {
  const html = editorRef.current?.innerHTML ?? '';
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bai-viet.doc';
  a.click();
  URL.revokeObjectURL(url);
}

function openSourceModal() {
  saveSelection();
  setSourceCode(editorRef.current?.innerHTML ?? '');
  setShowSourceModal(true);
}

function openLinkModal() {
  saveSelection();
  const selection = window.getSelection();
  setLinkText(selection?.toString() || '');
  setLinkUrl('');
  setLinkTitle('');
  setLinkTarget('_self');
  setShowLinkModal(true);
}

function insertLink() {
  restoreSelection();
  editorRef.current?.focus();
  if (linkText) {
    const anchor = `<a href="${linkUrl}" title="${linkTitle}" target="${linkTarget}">${linkText}</a>`;
    document.execCommand('insertHTML', false, anchor);
  } else {
    document.execCommand('createLink', false, linkUrl);
  }
  setShowLinkModal(false);
}

function clearFixHighlights() {
  if (!editorRef.current) return;
  const highlights = editorRef.current.querySelectorAll('[data-fix-highlight]');
  highlights.forEach((el) => {
    const parent = el.parentNode;
    while (el.firstChild) parent?.insertBefore(el.firstChild, el);
    parent?.removeChild(el);
  });
  setHasHighlights(false);
}
```

### Keyboard shortcut (useEffect):
```typescript
useEffect(() => {
  const handler = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'h') {
      event.preventDefault();
      setShowFindReplace(true);
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, []);
```

### JSX structure — copy từ viet-danh-gia-san-pham toolbar (dòng ~1489–1728)

> **Dev action:** Copy phần `<div className="border-b border-gray-100 bg-white flex-shrink-0">...</div>` (toolbar container) và tất cả portal dropdowns + modals sau đó từ `viet-danh-gia-san-pham/generate/page.tsx`, paste vào `RichEditorToolbar`, thay `contentRef` → `editorRef`.

**Bỏ 2 buttons không cần trong shared version:**
- "Chatbot" button (chỉ có ở review page)
- "Dữ liệu SP" button (chỉ có ở product review)

**Bỏ "Bài mới" button** — thay bằng optional `onNewArticle` prop.

---

## BƯỚC 2 — Cập nhật `ArticleEditor.tsx`

**File:** `web/components/editor/ArticleEditor.tsx`

```typescript
// ✅ SAU — dùng RichEditorToolbar thay EditorToolbar
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { RichEditorToolbar } from './RichEditorToolbar';

interface ArticleEditorProps {
  html: string;
  streaming?: boolean;
  wordCount?: number;
  onChange: (html: string) => void;
  onParagraphSelect?: (text: string, element: HTMLElement) => void;
  onSave?: () => void;
}

export function ArticleEditor({ html, streaming, wordCount, onChange, onParagraphSelect, onSave }: ArticleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [html]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleClick = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;
    const node = selection.anchorNode;
    if (!node) return;
    let element: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;
    while (element && element !== editorRef.current) {
      if (['P', 'H1', 'H2', 'H3', 'LI'].includes(element.tagName)) {
        onParagraphSelect?.(element.innerText, element);
        return;
      }
      element = element.parentElement;
    }
  }, [onParagraphSelect]);

  return (
    <div className="flex flex-col h-full">
      <RichEditorToolbar
        editorRef={editorRef}
        disabled={streaming}
        wordCount={wordCount}
        onSave={onSave}
      />
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-100 p-6">
        <div
          ref={editorRef}
          contentEditable={!streaming}
          suppressContentEditableWarning
          onInput={handleInput}
          onClick={handleClick}
          className={`
            article-body bg-white rounded-sm shadow-sm mx-auto px-12 py-10 min-h-[600px] max-w-3xl
            focus:outline-none
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4
            [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3
            [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2
            [&_p]:text-gray-800 [&_p]:leading-relaxed [&_p]:mb-3
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
            [&_strong]:font-semibold
            [&_a]:text-blue-600 [&_a]:underline
            ${streaming ? 'cursor-not-allowed opacity-80' : 'cursor-text'}
          `}
        />
      </div>
    </div>
  );
}
```

> **Thay đổi chính so với cũ:**
> - Dùng `RichEditorToolbar` thay `EditorToolbar`
> - Layout editor: `bg-gray-100` container + `bg-white` card (giống `viet-danh-gia-san-pham`)
> - Thêm prop `wordCount` và `onSave`

---

## BƯỚC 3 — Refactor `viet-danh-gia-san-pham/generate`

**File:** `web/app/viet-danh-gia-san-pham/generate/page.tsx`

Sau khi `ArticleEditor` đã dùng `RichEditorToolbar`:

### Thay phần editor (contentRef + toolbar) bằng `ArticleEditor`:

```typescript
// ❌ TRƯỚC — contentEditable custom + toolbar inline (~300 dòng)
<div ref={contentRef} contentEditable ... />
<div className="border-b border-gray-100 bg-white flex-shrink-0">
  {/* ...toolbar với 200+ dòng... */}
</div>

// ✅ SAU — dùng ArticleEditor
import { ArticleEditor } from '@/components/editor/ArticleEditor';

<ArticleEditor
  html={currentHtml}
  streaming={loading && !result}
  wordCount={wordCountLive}
  onChange={(html) => {
    setEditorHtml(html);
    setWordCountLive(countWords(html));
  }}
  onSave={() => void saveDraft(true)}
/>
```

### Cần giữ lại trong page:
- `captureSelection` / `handleContentInput` → chuyển thành `onChange` callback của `ArticleEditor`
- `contentRef` → xóa, không cần nữa (toolbar tự quản lý `editorRef`)
- Tất cả state toolbar (formatMenuOpen, showColorPicker...) → xóa, đã move vào `RichEditorToolbar`
- Tất cả refs toolbar (colorBtnRef, fontBtnRef...) → xóa
- Giữ lại: `saveDraft`, side panel SEO/AI/product, publish logic

---

## CẬP NHẬT CÁC PAGES DÙNG `ArticleEditor`

Sau Bước 2, các pages này tự động có rich editor. Chỉ cần truyền thêm `onSave` prop nếu page đó có auto-save:

### `viet-theo-tu-khoa/generate` — thêm `onSave`:
```typescript
<ArticleEditor
  html={displayedHtml}
  streaming={loading}
  wordCount={wordCount}
  onChange={handleEditorChange}
  onSave={() => void handleSaveDraft()}  // ← thêm mới
/>
```

### `viet-bai-thong-minh/step4` — thêm `wordCount` + `onSave`:
```typescript
<ArticleEditor
  html={displayedHtml}
  streaming={loading}
  wordCount={wordCount}
  onChange={handleEditorChange}
  onSave={() => void handleSaveDraft()}  // ← thêm mới
/>
```

### `viet-tu-google-search/generate`, `viet-lai-*/generate` — tương tự, thêm `wordCount` + `onSave` nếu có save handler.

---

## CHECKLIST XÁC NHẬN

- [ ] **Bước 1:** `RichEditorToolbar.tsx` tạo xong — tất cả features từ `viet-danh-gia-san-pham` toolbar
- [ ] **Bước 1:** Mojibake strings trong toolbar code đã được decode đúng (áp dụng `FIX-ENCODING-MOJIBAKE.md` cho file này sau khi tạo)
- [ ] **Bước 2:** `ArticleEditor.tsx` dùng `RichEditorToolbar`, layout chuyển sang gray bg + white card
- [ ] **Bước 2:** `EditorToolbar.tsx` vẫn giữ (backward compat) hoặc xóa nếu không còn dùng
- [ ] **Bước 3:** `viet-danh-gia-san-pham/generate` dùng `ArticleEditor`, xóa ~300 dòng toolbar inline
- [ ] **Verify:** `viet-theo-tu-khoa/generate` — rich editor hoạt động, B/I/U, H2/H3, color, table, link modal OK
- [ ] **Verify:** `viet-bai-thong-minh/step4` — rich editor hoạt động
- [ ] **Verify:** `viet-danh-gia-san-pham/generate` — giữ nguyên chức năng (SEO, AI check, publish)
- [ ] `npx tsc --noEmit` pass

---

## LƯU Ý QUAN TRỌNG

### 1. `captureSelection` trong `viet-danh-gia-san-pham`
Page này dùng `captureSelection` để lấy text đang chọn cho AI Edit commands. Khi refactor:
```typescript
// Truyền onMouseUp/onKeyUp xuống ArticleEditor → EditorRef
// Hoặc thêm prop onSelect vào ArticleEditor:
onParagraphSelect?: (text: string, element: HTMLElement) => void;
// Đã có sẵn prop này — dùng để capture selection
```

### 2. Find & Replace cần access vào editorRef.current
`RichEditorToolbar` đã có `editorRef` → tự query innerHTML để find/replace.

### 3. Highlights state (`hasHighlights`)
`viet-danh-gia-san-pham` check `hasHighlights` để show "Xóa highlight" button. Toolbar có thể tự check `editorRef.current?.querySelectorAll('[data-fix-highlight]').length > 0` thay vì nhận prop bên ngoài.

### 4. `exportToWord` — không cần prop
Toolbar tự đọc `editorRef.current?.innerHTML` → export. Không cần truyền gì từ ngoài vào.

### 5. `viet-danh-gia-san-pham` có "Bài mới" button trong toolbar
Truyền qua prop `onNewArticle={() => { clearReviewWorkflowSession(); router.push('/viet-danh-gia-san-pham'); }}`.
Các pages khác không cần → không truyền prop → button không render.
