# 7-FEATURES-IMPLEMENTATION.md
## Incremental patch — F1 / F2 / F4 / F5

> Dựa trên phân tích code thực tế. Không refactor lớn, không thay cấu trúc component.
> Sửa tối thiểu trên nền code đang chạy.
> Ngày cập nhật: 2026-05-29

---

## TỔNG QUAN TRẠNG THÁI

| Feature | Trạng thái | Việc còn lại |
|---|---|---|
| F1 — AI rewrite từ flag card | ✅ Panel đã hoàn chỉnh, còn thiếu 1 luồng | Thêm `onAiRewrite` prop + nút + handler riêng trong step4 |
| F2 — Humanize trong toolbar | ✅ 1 nút trong toolbar, cần 3-4 edit liên hoàn | Thêm vào type, toolbar, route, VBT commands |
| F3 — Stats sidebar | ❌ Chưa có | Ngoài scope F1/F2/F4/F5 |
| F4 — Sidebar cleanup | ⚠️ Có 2 shortcut thừa | Xóa 2 item trong `navGroups[0].items` |
| F5 — URL tham khảo step1 | ✅ Đã có đầy đủ | Không cần làm gì |
| F6 — ToolBenefits | ❌ Chưa có | Ngoài scope F1/F2/F4/F5 |
| F7 — ToolFaq | ❌ Chưa có | Ngoài scope F1/F2/F4/F5 |

---

## F5 — URL tham khảo trong Step 1

**✅ DONE — Không cần đụng vào.**

`web/app/viet-bai-thong-minh/page.tsx` đã có:
- `competitorUrls` state (line 53) — 3 ô input URL đối thủ
- `dataSourceMode` — chọn `ai_only / url_crawl / manual_text / google_search`
- `dataSourceUrls` + `dataSourceText` — đã được build/validate/render (line 139, 150, 327)

---

## F4 — Sidebar: Xóa 2 shortcut thừa

**File:** `web/components/Sidebar.tsx`

**Vấn đề:** Nhóm "Viết Bài" (group đầu tiên, line 38) có 2 shortcut thừa:
```typescript
{ label: 'SOCIAL Tools',    href: '/social-tools',    matchPrefixes: [...] },
{ label: 'ECOMMERCE Tools', href: '/ecommerce-tools', matchPrefixes: [...] },
```
Bên dưới đã có group "Social" và "ECOMMERCE Tools" riêng → duplicate.

**Patch:** Xóa 2 object này khỏi `navGroups[0].items`. Không đụng vào các group khác.

---

## F2 — Humanize: 4 edit liên hoàn

Không phải 1 dòng. Cần sửa đúng thứ tự để không bị lỗi type.

### Edit 1 — Mở rộng type `AiAssistCommand`

**File:** `web/components/editor/AiAssistPanel.tsx` (line 6)

Thêm `'humanize'` vào union type `AiAssistCommand`. Xem cấu trúc type hiện tại rồi bổ sung.

### Edit 2 — Thêm vào `AiFloatingToolbar`

**File:** `web/components/editor/AiFloatingToolbar.tsx` (line 13)

```typescript
const QUICK_COMMANDS: Array<{ value: AiAssistCommand; label: string }> = [
  { value: 'shorten',   label: 'Rút ngắn'  },
  { value: 'rewrite',   label: 'Viết lại'  },
  { value: 'humanize',  label: 'Humanize'  },  // ← THÊM
  { value: 'explain',   label: 'Giải thích'},
];
```

### Edit 3 — Thêm prompt vào API route

**File:** `web/app/api/editor/ai-assist/route.ts` (line 7)

Tìm switch/case hoặc if/else xử lý từng command, thêm case `humanize`:

```typescript
case 'humanize':
  systemPrompt = `Humanize đoạn văn này theo brand voice Nội Thất Minh Quân.
Quy tắc bắt buộc:
- Giọng: Chân thật – Chuyên nghiệp – Gần gũi
- Xưng hô: "Nội Thất Minh Quân" / "chúng tôi" — "anh/chị" hoặc "bạn"
- Câu ngắn xen câu dài (7-18 từ), không đều nhịp
- Không dùng các từ cấm: tuy nhiên, bên cạnh đó, quan trọng, đặc biệt, hiệu quả, tuyệt vời, vô cùng, cực kỳ, không chỉ...mà còn
- Giữ nguyên thông tin, số liệu và ý nghĩa gốc
- Trả về chỉ đoạn văn đã viết lại, không giải thích`;
  break;
```

> **Tham khảo:** `viet-tin-tuc/generate/page.tsx` (line 67) đã có humanize trong command list riêng — xem prompt đang dùng ở đó để nhất quán.

### Edit 4 — Thêm vào `VBT_AI_EDIT_COMMANDS`

**File:** `web/app/viet-bai-thong-minh/step4/page.tsx` (line 542)

Step4 dùng `VBT_AI_EDIT_COMMANDS` riêng (không dùng shared commands). Thêm:

```typescript
{ value: 'humanize', label: 'Humanize giọng văn' },
```

Đây là lệnh hiện qua `VBT_AI_EDIT_COMMANDS` trong Tab AI → nút bấm trong "AI chỉnh theo vùng chọn". Phụ thuộc `selectedText` state bình thường — không ảnh hưởng F1.

---

## F1 — AI rewrite từ flag card: Handler riêng trong step4

### Đã có trong AICheckPanel (không cần sửa panel)

- Score ring, breakdown × 4, flag list, filter tabs ✅
- `applySuggestion(flag, replacement)` → `onApplyFix` → auto-rescan ✅
- `dismissFlag`, stale detection, sessionStorage persist ✅
- `onResultChange` callback trả kết quả ra ngoài (line 148) ✅
- Config từ `/api/ai-config`, AI analysis từ `/api/pipeline/ai-check` ✅

### Vấn đề với cách "setSelectedText + handleAiEditCommand"

Handler hiện tại trong step4 (`handleToolbarCommand`) đọc text từ `selectionRangeRef` và DOM selection, fallback bằng `sourceHtml.replace(selectedText, assistedHtml)` (line 2180). Nếu inject snippet vào state rồi trigger command:
- Race condition giữa setState và command trigger
- `replace()` sẽ replace **tất cả** lần xuất hiện của câu đó trong HTML nếu câu lặp lại

### Cách đúng — Handler riêng, nhận thẳng snippet + target

**Bước 1:** Thêm prop vào `AICheckPanel`

**File:** `web/app/components/AICheckPanel.tsx`

```typescript
// Thêm vào interface props (sau onResultChange)
onAiRewrite?: (snippet: string, flagLabel: string, target?: SentenceTarget) => void;
```

**Bước 2:** Thêm nút trong flag card

Trong phần render flag card (sau khi hiển thị `flag.reason`, trước buttons hiện có):

```tsx
{!isApplied && flag.sentenceIndex !== null && onAiRewrite && (
  <button
    type="button"
    onClick={() => {
      const target = sentenceTargetsRef.current[flag.sentenceIndex!];
      onAiRewrite(flag.snippet, flag.label, target);
    }}
    className="mt-2 w-full rounded-lg border border-indigo-200 bg-indigo-50 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
  >
    ⚡ Nhờ AI viết lại câu này
  </button>
)}
```

Dùng `sentenceTargetsRef.current[flag.sentenceIndex]` — ref này đã được populate trước khi render flags (line ~287 trong panel). Không phụ thuộc DOM selection.

**Bước 3:** Handler riêng trong step4

**File:** `web/app/viet-bai-thong-minh/step4/page.tsx`

Thêm function mới, **không đụng vào** `handleToolbarCommand` hay `handleAiEditCommand` hiện tại:

```typescript
async function handleFlagAiRewrite(
  snippet: string,
  flagLabel: string,
  target?: SentenceTarget,
) {
  if (!snippet.trim() || aiEditing) return;
  setAiEditing(true);

  try {
    const response = await fetch('/api/editor/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'humanize',
        text: snippet,
        context: `Flag: ${flagLabel}`,
      }),
    });

    const json = await response.json();
    const rewritten: string = json?.result ?? json?.text ?? '';
    if (!rewritten.trim()) return;

    // Replace an toàn: dùng target nếu có, fallback replace string thủ công
    if (target) {
      onApplyFix(target.text, rewritten, target.index, target);
    } else {
      // Fallback: replace lần xuất hiện đầu tiên của snippet trong HTML
      const escaped = snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const updated = editableHtml.replace(new RegExp(escaped, ''), rewritten);
      setEditableHtml(updated);
    }
  } catch (err) {
    console.error('[handleFlagAiRewrite]', err);
  } finally {
    setAiEditing(false);
  }
}
```

**Bước 4:** Truyền handler xuống AICheckPanel

```tsx
<AICheckPanel
  html={displayedHtml}
  storageKey={aiCheckStorageKey}
  onApplyFix={onApplyFix}
  getSentenceTargets={getSentenceTargets}
  onResultChange={onAiCheckResultChange}
  onAiRewrite={handleFlagAiRewrite}   // ← THÊM
/>
```

### Lưu ý về `onApplyFix` trong handler

Kiểm tra signature thực tế của `onApplyFix` trong step4 — nó có nhận `SentenceTarget` không hay chỉ nhận `(original, replacement)`. Điều chỉnh call cho khớp với signature hiện tại.

---

## CHECKLIST TRIỂN KHAI

```
F5 — ✅ Không làm gì

F4 — Sidebar.tsx
  [ ] Xóa item 'SOCIAL Tools' khỏi navGroups[0].items
  [ ] Xóa item 'ECOMMERCE Tools' khỏi navGroups[0].items

F2 — 4 file, theo thứ tự:
  [ ] AiAssistPanel.tsx       — thêm 'humanize' vào AiAssistCommand type
  [ ] AiFloatingToolbar.tsx   — thêm { value: 'humanize', label: 'Humanize' }
  [ ] api/editor/ai-assist/route.ts — thêm case humanize + prompt
  [ ] step4/page.tsx          — thêm { value: 'humanize', label: '...' } vào VBT_AI_EDIT_COMMANDS

F1 — 2 file:
  [ ] AICheckPanel.tsx        — thêm prop onAiRewrite + nút trong flag card
  [ ] step4/page.tsx          — thêm handleFlagAiRewrite + truyền xuống AICheckPanel
```

---

## NGOÀI SCOPE (F3 / F6 / F7)

Các feature này vẫn hợp lý về mặt sản phẩm nhưng không thuộc batch patch hiện tại:

- **F3** Stats sidebar — cần tạo API route + Prisma query mới
- **F6** ToolBenefits — component mới, cần thêm vào step1
- **F7** ToolFaq — component mới, cần thêm vào step1

Làm riêng trong batch tiếp theo nếu cần.
