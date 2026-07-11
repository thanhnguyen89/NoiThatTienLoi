# VIET-TU-FACEBOOK-IMPLEMENTATION.md
## Spec triển khai trang Viết Bài Facebook — `/viet-bai-facebook`

> Tài liệu này dành cho dev.  
> Pattern: **Stateless-ish với DB saving** — 1 trang duy nhất, không route generate riêng.  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · SSE

---

## 0. Phân tích aiktp vs Local — Điểm khác biệt cốt lõi

### aiktp "Tạo Facebook Post" — Đặc điểm
- Input: Chủ đề (text tự do, ngắn hoặc dài)
- Ngôn ngữ: 70+ ngôn ngữ
- Phong cách: 6 styles (Funny, Rút ngắn, Creative, Friendly, Casual, Professional)
- Emoji toggle: bật/tắt riêng
- Không có brand config — output generic
- **Hoàn toàn stateless** — không lưu DB, không có lịch sử
- Dùng WebSocket (ta dùng SSE)

### Local `/viet-bai-facebook` — Khác biệt

| Tính năng | aiktp | `/viet-bai-facebook` |
|-----------|-------|----------------------|
| Brand Profile | ❌ | **✅ 10 fields — shopName, pronouns, CTA, mainProducts...** |
| AI Model | ❌ Fixed | **✅ Dynamic ModelPicker từ DB** |
| Lưu bài | ❌ | **✅ Lưu vào DB, có management page** |
| Tone/Style | 6 styles generic | **✅ 9 styles + brand-aware instructions** |
| Post Target | ❌ | **✅ Trang cá nhân / Fanpage / Group** |
| Lịch sử bài | ❌ | **✅ /quan-ly-bai-facebook** |
| Input source | Text/topic | **✅ Text/topic + tuỳ chọn URL bài blog** |
| Emoji | Toggle | **✅ Toggle + mức độ (ít/vừa/nhiều)** |

### Quan hệ với `/facebook-post`

| | `/facebook-post` | `/viet-bai-facebook` |
|---|---|---|
| Mục đích | Tool nhanh, thử ngay | Công cụ chính, brand-aware |
| Brand profile | ❌ | ✅ |
| Lưu DB | ❌ | ✅ |
| Model picker | ❌ Fixed flash | ✅ Dynamic |
| Lịch sử | ❌ | ✅ |
| UX | Sidebar trái nhỏ | Full-featured 2 cột |

---

## 1. Kiến trúc — Single Page + API

```
/viet-bai-facebook                  ← Trang chính (form + output)
/quan-ly-bai-facebook               ← Management: danh sách bài đã lưu
/api/viet-bai-facebook/generate     ← SSE stream tạo bài
/api/viet-bai-facebook/save         ← POST lưu bài vào DB
/api/viet-bai-facebook/[id]         ← GET / PUT / DELETE bài đã lưu
```

### Cấu trúc file

```
web/
├── app/
│   ├── viet-bai-facebook/
│   │   └── page.tsx                       ← Trang chính
│   ├── quan-ly-bai-facebook/
│   │   └── page.tsx                       ← Quản lý bài đã lưu
│   └── api/
│       └── viet-bai-facebook/
│           ├── generate/
│           │   └── route.ts               ← SSE stream
│           ├── save/
│           │   └── route.ts               ← Lưu bài mới
│           └── [id]/
│               └── route.ts               ← GET/PUT/DELETE
└── lib/
    └── viet-bai-facebook/
        ├── types.ts
        ├── options.ts
        └── prompt-builder.ts              ← buildFacebookBrandPostPrompt()
```

### Prisma model (đã tạo từ task #11, #20)

```prisma
model FacebookPost {
  id              String       @id @default(cuid())
  topic           String                          // Chủ đề đầu vào
  sourceUrl       String?                         // URL blog nguồn (nếu có)
  content         String                          // Nội dung bài post (plain text)
  target          String       @default("fanpage") // personal | fanpage | group
  style           String       @default("friendly")
  language        String       @default("Vietnamese")
  useEmoji        Boolean      @default(true)
  emojiLevel      String       @default("medium") // low | medium | high
  wordCount       Int?
  charCount       Int?

  // Brand info (snapshot tại thời điểm tạo)
  brandProfileId  String?
  brandProfile    BrandProfile? @relation(fields: [brandProfileId], references: [id])
  brandName       String?                         // snapshot shopName
  modelId         String?                         // AI model đã dùng

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}
```

---

## 2. Types — `web/lib/viet-bai-facebook/types.ts`

```typescript
export type PostTarget = 'personal' | 'fanpage' | 'group';

export type PostStyle =
  | 'friendly'      // Thân thiện, ấm áp
  | 'funny'         // Vui vẻ, hài hước
  | 'creative'      // Sáng tạo, góc nhìn mới
  | 'casual'        // Thoải mái, thân mật
  | 'professional'  // Chuyên nghiệp, CTA rõ
  | 'storytelling'  // Kể chuyện, cảm xúc
  | 'educational'   // Chia sẻ kiến thức, tips
  | 'promotional'   // Khuyến mãi, sale, ưu đãi
  | 'engagement';   // Kêu gọi tương tác, câu hỏi mở

export type EmojiLevel = 'none' | 'low' | 'medium' | 'high';

export interface FacebookBrandPostConfig {
  // Nội dung
  topic: string;            // Chủ đề / ý tưởng chính
  sourceUrl?: string;       // URL bài blog nếu muốn AI đọc và tóm tắt cho FB

  // Cấu hình bài post
  target: PostTarget;
  style: PostStyle;
  language: string;
  emojiLevel: EmojiLevel;

  // Model
  modelId: string;

  // Brand (từ BrandSection)
  brand: BrandSectionState;
}

export interface BrandSectionState {
  shopName: string;
  industry: string;
  brandPronouns: string;     // "Minh Quân" / "chúng tôi"
  brandAudience: string;     // "anh chị" / "bạn"
  brandToneNotes: string;
  phone: string;
  address: string;
  brandForbidden: string;
  ctaStandard: string;
  mainProducts: string;
  selectedProfileId: string;
}

// SSE Events
export type FbPostSSEEvent =
  | { type: 'chunk'; text: string }
  | { type: 'done'; wordCount: number; charCount: number }
  | { type: 'error'; message: string };

// Saved post từ DB
export interface SavedFacebookPost {
  id: string;
  topic: string;
  content: string;
  target: PostTarget;
  style: PostStyle;
  brandName: string | null;
  wordCount: number | null;
  createdAt: string;
}
```

---

## 3. Options — `web/lib/viet-bai-facebook/options.ts`

```typescript
import type { PostTarget, PostStyle, EmojiLevel } from './types';

export const POST_TARGETS: Array<{
  value: PostTarget; label: string; icon: string; note: string;
}> = [
  { value: 'personal', label: 'Trang cá nhân', icon: '👤',
    note: 'Thân mật, chia sẻ cá nhân, kết nối bạn bè' },
  { value: 'fanpage',  label: 'Fanpage / Thương hiệu', icon: '📣',
    note: 'Chuyên nghiệp, CTA rõ ràng, tăng chuyển đổi' },
  { value: 'group',    label: 'Facebook Group', icon: '👥',
    note: 'Kêu gọi thảo luận, câu hỏi mở, tương tác cao' },
];

export const POST_STYLES: Array<{
  value: PostStyle; label: string; icon: string; note: string; hot?: boolean;
}> = [
  { value: 'friendly',     label: 'Thân thiện',   icon: '😊', note: 'Gần gũi, ấm áp — phù hợp mọi mục tiêu' },
  { value: 'professional', label: 'Chuyên nghiệp', icon: '💼', note: 'Rõ ràng, thông tin đặt đầu, CTA cuối' },
  { value: 'promotional',  label: 'Khuyến mãi',   icon: '🔥', note: 'Nhấn deal/giá — phù hợp sale event', hot: true },
  { value: 'storytelling', label: 'Kể chuyện',    icon: '📖', note: 'Narrative, cảm xúc, tăng trust', hot: true },
  { value: 'funny',        label: 'Hài hước',     icon: '😄', note: 'Vui vẻ, gần gũi, tăng share' },
  { value: 'creative',     label: 'Sáng tạo',     icon: '💡', note: 'Góc nhìn độc đáo, từ ngữ mới' },
  { value: 'casual',       label: 'Thoải mái',    icon: '☕', note: 'Thân mật, tự nhiên như chat' },
  { value: 'educational',  label: 'Chia sẻ tips', icon: '📚', note: 'Kiến thức, tips, how-to ngắn' },
  { value: 'engagement',   label: 'Kêu gọi',      icon: '🗣️', note: 'Câu hỏi mở, poll, kích tương tác' },
];

export const EMOJI_LEVELS: Array<{
  value: EmojiLevel; label: string; note: string;
}> = [
  { value: 'none',   label: 'Không emoji',  note: 'Plain text hoàn toàn' },
  { value: 'low',    label: 'Ít (1–2)',     note: '1-2 emoji toàn bài' },
  { value: 'medium', label: 'Vừa (3–5)',   note: '3-5 emoji — phổ biến nhất' },
  { value: 'high',   label: 'Nhiều (6+)',  note: 'Nhiều emoji — dành cho content vui vẻ' },
];

// Gợi ý độ dài theo target
export const POST_LENGTH_HINTS: Record<PostTarget, { words: string; note: string }> = {
  personal: { words: '80–150 từ',  note: 'Chia sẻ cá nhân, không quá dài' },
  fanpage:  { words: '100–250 từ', note: 'Đủ hook + body + CTA' },
  group:    { words: '80–180 từ',  note: 'Kêu gọi thảo luận cuối bài' },
};

// sessionStorage key
export const LS_KEY_CONFIG = 'vbf_config';
export const LS_KEY_BRAND  = 'vbf_brand_info';
```

---

## 4. Prompt Builder — `web/lib/viet-bai-facebook/prompt-builder.ts`

```typescript
import type { FacebookBrandPostConfig } from './types';
import { POST_LENGTH_HINTS } from './options';

const STYLE_INSTRUCTIONS: Record<string, string> = {
  friendly:     'Giọng thân thiện, ấm áp. Viết như đang kể chuyện cho bạn bè nghe.',
  professional: 'Giọng chuyên nghiệp, rõ ràng. Thông tin quan trọng đặt trước. Kết thúc bằng CTA cụ thể.',
  promotional:  'Tập trung vào ưu đãi / giá / deal. Hook đầu phải gây chú ý ngay. Có urgency (ví dụ: "chỉ hôm nay", "còn X suất").',
  storytelling: 'Kể câu chuyện có đầu-thân-cuối. Tạo cảm xúc, kết nối với người đọc. Không cần CTA cứng.',
  funny:        'Vui vẻ, hài hước nhẹ nhàng. Hook bất ngờ hoặc plot twist. Tự nhiên, không gượng ép.',
  creative:     'Góc nhìn độc đáo, từ ngữ mới lạ, tránh clichés. Người đọc phải nghĩ một chút.',
  casual:       'Thoải mái, thân mật như đang chat. Có thể dùng câu hỏi tu từ.',
  educational:  'Chia sẻ 1 tip/kiến thức hữu ích ngắn gọn. Format: vấn đề → giải pháp → kết quả.',
  engagement:   'Kết thúc PHẢI là câu hỏi mở hoặc kêu gọi bình luận/tag bạn bè. Tone thân thiện.',
};

const TARGET_INSTRUCTIONS: Record<string, string> = {
  personal: 'Bài đăng trang cá nhân. Viết ngôi thứ nhất nếu phù hợp. Không CTA cứng kiểu thương mại.',
  fanpage:  'Bài đăng Fanpage thương hiệu. PHẢI có CTA rõ ràng ở cuối (VD: "Nhắn tin ngay", "Xem thêm tại...", "Gọi [phone]").',
  group:    'Bài đăng Group. PHẢI kết thúc bằng câu hỏi mở hoặc kêu gọi thảo luận.',
};

const EMOJI_INSTRUCTIONS: Record<string, string> = {
  none:   'TUYỆT ĐỐI KHÔNG dùng emoji — plain text hoàn toàn.',
  low:    'Dùng tối đa 1–2 emoji toàn bài, đặt ở vị trí đắt nhất.',
  medium: 'Dùng 3–5 emoji phù hợp, rải đều trong bài.',
  high:   'Dùng emoji thoải mái (6+ cái), phong cách sinh động.',
};

export function buildFacebookBrandPostPrompt(config: FacebookBrandPostConfig): string {
  const { topic, sourceUrl, target, style, language, emojiLevel, brand } = config;
  const lengthHint = POST_LENGTH_HINTS[target];
  const topicWordCount = topic.trim().split(/\s+/).length;

  const brandBlock = brand.shopName ? `
## Thông tin thương hiệu
- Tên thương hiệu: ${brand.shopName}
- Ngành: ${brand.industry || 'Nội thất'}
- Xưng hô (thương hiệu → khách): ${brand.brandPronouns || 'Minh Quân'} → ${brand.brandAudience || 'anh chị'}
- Sản phẩm chính: ${brand.mainProducts || ''}
- CTA chuẩn: ${brand.ctaStandard || ''}
- Giọng văn riêng: ${brand.brandToneNotes || ''}
${brand.brandForbidden ? `- Từ/cụm CẤM dùng: ${brand.brandForbidden}` : ''}
${brand.phone ? `- Số điện thoại: ${brand.phone}` : ''}
` : '';

  const sourceNote = sourceUrl
    ? `\nNguồn tham khảo: ${sourceUrl} — tóm tắt ý chính từ link này để viết bài post.`
    : topicWordCount > 200
    ? '\nInput dài — hãy tóm tắt ý chính, không dump nguyên văn vào bài post.'
    : '';

  return `Bạn là copywriter Facebook chuyên nghiệp cho thương hiệu nội thất Việt Nam.
${brandBlock}
## Nhiệm vụ
Viết 1 bài Facebook Post hoàn chỉnh từ chủ đề / nội dung sau:
${topic}
${sourceNote}

## Yêu cầu bài post
- Ngôn ngữ output: ${language}
- Phong cách: ${STYLE_INSTRUCTIONS[style] ?? STYLE_INSTRUCTIONS.friendly}
- Mục tiêu đăng: ${TARGET_INSTRUCTIONS[target]}
- Độ dài: ${lengthHint.words} (${lengthHint.note})
- Emoji: ${EMOJI_INSTRUCTIONS[emojiLevel]}

## Cấu trúc chuẩn
1. **Hook** (1–2 câu đầu): thu hút chú ý ngay — đặt câu hỏi / số liệu / statement bất ngờ
2. **Body**: thông tin chính / câu chuyện / ưu điểm sản phẩm
3. **Close**: CTA (fanpage) / câu hỏi (group) / cảm xúc (personal)

## Quy tắc output
- Chỉ trả nội dung bài post — KHÔNG thêm tiêu đề, nhãn, giải thích, gạch đầu dòng
- Không dùng markdown (**, *, #) — plain text thuần tuý
- Xuống dòng tự nhiên như Facebook post thật
- KHÔNG bắt đầu bằng "Xin chào", "Bài post:", "Đây là"
- Nếu brand có từ CẤM → tuyệt đối không dùng
`.trim();
}
```

---

## 5. State & sessionStorage

```typescript
// Persist config qua F5 với sessionStorage (không phải localStorage)
// Key: LS_KEY_CONFIG = 'vbf_config'

// Khởi tạo state từ sessionStorage:
const [topic, setTopic]           = useState(() =>
  JSON.parse(sessionStorage.getItem(LS_KEY_CONFIG) || '{}')?.topic ?? '');
const [sourceUrl, setSourceUrl]   = useState('');
const [target, setTarget]         = useState<PostTarget>('fanpage');
const [style, setStyle]           = useState<PostStyle>('friendly');
const [language, setLanguage]     = useState('Vietnamese');
const [emojiLevel, setEmojiLevel] = useState<EmojiLevel>('medium');
const [modelId, setModelId]       = useState('');
const [brand, setBrand]           = useState<BrandSectionState>(defaultBrand);

// Output state
const [output, setOutput]         = useState('');
const [wordCount, setWordCount]   = useState(0);
const [charCount, setCharCount]   = useState(0);
const [loading, setLoading]       = useState(false);
const [error, setError]           = useState('');
const [copied, setCopied]         = useState(false);
const [savedId, setSavedId]       = useState<string | null>(null);
const [saving, setSaving]         = useState(false);

// Persist topic khi thay đổi
useEffect(() => {
  sessionStorage.setItem(LS_KEY_CONFIG, JSON.stringify({ topic }));
}, [topic]);
```

---

## 6. Layout UI

```
┌──────────────────────────────────────────────────────────────────────┐
│  Tab nav: [📝 Viết bài Facebook] [📋 Lịch sử bài đã lưu →]          │
├───────────────────────────┬──────────────────────────────────────────┤
│  FORM (trái, w-80)        │  OUTPUT (phải, flex-1)                   │
│                           │                                          │
│  Chủ đề / Ý tưởng *       │  [Header: "Bài post" · X từ · Y ký tự]  │
│  [textarea rows=6]        │  [Tạo lại] [Lưu bài] [Copy]             │
│  Hoặc URL bài blog        │                                          │
│  [input URL tùy chọn]     │  [Empty state: icon + example chips]     │
│                           │  hoặc                                    │
│  Đăng lên đâu?            │  [Facebook preview card]                 │
│  [👤 Cá nhân]             │    [MQ avatar] Tên thương hiệu           │
│  [📣 Fanpage] ← default   │    Target · Style · Emoji                │
│  [👥 Group]               │    ─────────────────────────             │
│                           │    [Nội dung bài post real-time]         │
│  Phong cách (9 styles)    │    ─────────────────────────             │
│  [grid 3 cột]             │    👍 Thích  💬 Bình luận  ↗ Chia sẻ    │
│                           │                                          │
│  Ngôn ngữ [dropdown]      │  [Tạo thêm bài?]                        │
│                           │  [Tạo lại]  [Lưu bài ✓]  [Copy]         │
│  Emoji [4 chip]           │                                          │
│                           │                                          │
│  [Khối 6] ModelPicker     │                                          │
│                           │                                          │
│  [Khối 7] BrandSection    │                                          │
│  (collapsed mặc định)     │                                          │
│                           │                                          │
│  [🚀 Tạo bài Facebook]    │                                          │
└───────────────────────────┴──────────────────────────────────────────┘
```

**Lưu ý UI quan trọng:**
- BrandSection ở form trái — **collapsed mặc định**, badge "Đã cấu hình" khi có brand
- 9 style chips render dạng **grid 3 cột** (không phải danh sách dọc như `/facebook-post`)
- Facebook preview card giống `/facebook-post` nhưng avatar lấy từ `brand.shopName` (2 ký tự đầu)

---

## 7. Page Component — `web/app/viet-bai-facebook/page.tsx`

### Tab navigation

```tsx
<div className="flex border-b border-gray-200 bg-white flex-shrink-0 px-4">
  {[
    { label: '📝 Viết bài Facebook', href: '/viet-bai-facebook', active: true },
    { label: '📋 Lịch sử bài đã lưu', href: '/quan-ly-bai-facebook', active: false },
  ].map((tab) => (
    <a key={tab.href} href={tab.href}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        tab.active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}>
      {tab.label}
    </a>
  ))}
</div>
```

### Style grid (9 styles, 3 cột)

```tsx
<div className="grid grid-cols-3 gap-1.5">
  {POST_STYLES.map((s) => (
    <button key={s.value} type="button" title={s.note}
      onClick={() => setStyle(s.value)}
      className={`relative p-2 rounded-lg border text-center transition-colors ${
        style === s.value
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-gray-200 text-gray-600 hover:border-blue-300'
      }`}>
      {s.hot && (
        <span className="absolute -top-1.5 -right-1 text-[8px] bg-orange-400 text-white rounded-full px-1.5">
          Hot
        </span>
      )}
      <span className="text-base block mb-0.5">{s.icon}</span>
      <span className="text-[10px] font-medium leading-tight">{s.label}</span>
    </button>
  ))}
</div>
```

### Emoji level chips (4 chips ngang)

```tsx
<div className="flex gap-1.5 flex-wrap">
  {EMOJI_LEVELS.map((el) => (
    <button key={el.value} type="button" title={el.note}
      onClick={() => setEmojiLevel(el.value)}
      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
        emojiLevel === el.value
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-gray-200 text-gray-500 hover:border-blue-300'
      }`}>
      {el.label}
    </button>
  ))}
</div>
```

### Source URL input (tùy chọn)

```tsx
<div className="mb-3">
  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
    URL bài blog (tùy chọn)
  </label>
  <input
    value={sourceUrl}
    onChange={(e) => setSourceUrl(e.target.value)}
    placeholder="https://noithatminhquan.vn/bai-viet/... → AI tóm tắt thành FB post"
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
  />
  <p className="text-xs text-gray-400 mt-1">
    Để trống nếu chỉ dùng chủ đề ở trên.
  </p>
</div>
```

### Generate handler

```typescript
async function handleGenerate() {
  if (!topic.trim()) { setError('Vui lòng nhập chủ đề.'); return; }
  if (!modelId) { setError('Vui lòng chọn AI Model.'); return; }

  abortRef.current?.abort();
  abortRef.current = new AbortController();

  setLoading(true);
  setError('');
  setOutput('');
  setWordCount(0);
  setCharCount(0);
  setCopied(false);
  setSavedId(null);

  try {
    const res = await fetch('/api/viet-bai-facebook/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic, sourceUrl, target, style, language, emojiLevel, modelId, brand,
      } satisfies FacebookBrandPostConfig),
      signal: abortRef.current.signal,
    });

    if (!res.ok || !res.body) {
      const err = await res.json();
      throw new Error(err.message ?? 'Lỗi kết nối');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6)) as FbPostSSEEvent;
          if (event.type === 'chunk') {
            if (event.text === '') { accumulated = ''; setOutput(''); }
            else { accumulated += event.text; setOutput(accumulated); }
          } else if (event.type === 'done') {
            setWordCount(event.wordCount);
            setCharCount(event.charCount);
          } else if (event.type === 'error') {
            setError(event.message);
          }
        } catch { /* skip */ }
      }
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError')
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
  } finally {
    setLoading(false);
  }
}
```

### Save handler

```typescript
async function handleSave() {
  if (!output || saving) return;
  setSaving(true);
  try {
    const res = await fetch('/api/viet-bai-facebook/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic, sourceUrl, content: output, target, style, language,
        emojiLevel, wordCount, charCount,
        brandProfileId: brand.selectedProfileId || null,
        brandName: brand.shopName || null,
        modelId,
      }),
    });
    const { id } = await res.json();
    setSavedId(id);
  } catch {
    setError('Lưu thất bại — thử lại.');
  } finally {
    setSaving(false);
  }
}
```

### Facebook preview card

```tsx
{output && (
  <div className="max-w-lg mx-auto">
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center
                        text-white text-sm font-bold flex-shrink-0">
          {brand.shopName ? brand.shopName.slice(0, 2).toUpperCase() : 'FB'}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {brand.shopName || 'Thương hiệu'}
          </p>
          <p className="text-xs text-gray-400">
            {POST_TARGETS.find((t) => t.value === target)?.label}
            {' · '}
            {POST_STYLES.find((s) => s.value === style)?.label}
            {emojiLevel !== 'none' && ' · 😊'}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
          {output}
        </p>
        {loading && (
          <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse rounded-sm" />
        )}
      </div>

      {/* Footer */}
      {!loading && (
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4">
          <span className="text-xs text-gray-400">👍 Thích</span>
          <span className="text-xs text-gray-400">💬 Bình luận</span>
          <span className="text-xs text-gray-400">↗️ Chia sẻ</span>
          <div className="ml-auto flex items-center gap-2">
            {/* Lưu bài */}
            <button onClick={handleSave} disabled={saving || !!savedId}
              className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                savedId
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50'
              }`}>
              {savedId ? '✓ Đã lưu' : saving ? 'Đang lưu...' : '💾 Lưu'}
            </button>
            {/* Copy */}
            <button onClick={handleCopy}
              className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                copied
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>
              {copied ? '✓ Đã copy' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)}
```

---

## 8. API Routes

### `POST /api/viet-bai-facebook/generate/route.ts`

```typescript
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildFacebookBrandPostPrompt } from '@/lib/viet-bai-facebook/prompt-builder';
import type { FbPostSSEEvent, FacebookBrandPostConfig } from '@/lib/viet-bai-facebook/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  const body: FacebookBrandPostConfig = await request.json();

  if (!body.topic?.trim()) {
    return Response.json({ type: 'error', message: 'Thiếu chủ đề' }, { status: 400 });
  }

  const prompt = buildFacebookBrandPostPrompt(body);
  const model  = buildTinhGonModel(body.modelId || 'gemini-flash');

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: FbPostSSEEvent) =>
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        let fullText = '';
        try {
          const aiStream = await model.generateContentStream(prompt);
          for await (const chunk of aiStream) {
            const text = chunk.text();
            if (!text) continue;
            fullText += text;
            send({ type: 'chunk', text });
          }
        } catch {
          // Fallback non-stream
          const result = await model.generateContent(prompt);
          fullText = result.response.text();
          send({ type: 'chunk', text: fullText });
        }

        // Strip markdown nếu AI vô tình trả
        const cleaned = fullText
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/^#+\s+/gm, '')
          .trim();

        if (cleaned !== fullText) {
          send({ type: 'chunk', text: '' });     // reset signal
          send({ type: 'chunk', text: cleaned });
        }

        send({
          type: 'done',
          wordCount: cleaned.split(/\s+/).filter(Boolean).length,
          charCount: cleaned.length,
        });
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Lỗi AI' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### `POST /api/viet-bai-facebook/save/route.ts`

```typescript
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = await request.json();

  const post = await prisma.facebookPost.create({
    data: {
      topic:           body.topic,
      sourceUrl:       body.sourceUrl || null,
      content:         body.content,
      target:          body.target,
      style:           body.style,
      language:        body.language,
      emojiLevel:      body.emojiLevel ?? 'medium',
      wordCount:       body.wordCount ?? null,
      charCount:       body.charCount ?? null,
      brandProfileId:  body.brandProfileId || null,
      brandName:       body.brandName || null,
      modelId:         body.modelId || null,
    },
  });

  return Response.json({ id: post.id });
}
```

### `GET|PUT|DELETE /api/viet-bai-facebook/[id]/route.ts`

```typescript
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const post = await prisma.facebookPost.findUnique({ where: { id: params.id } });
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(post);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const post = await prisma.facebookPost.update({
    where: { id: params.id },
    data: { content: body.content },
  });
  return Response.json(post);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.facebookPost.delete({ where: { id: params.id } });
  return Response.json({ success: true });
}
```

---

## 9. Management Page — `/quan-ly-bai-facebook`

**File:** `web/app/quan-ly-bai-facebook/page.tsx`

```
┌────────────────────────────────────────────────────────────────┐
│  [← Viết bài mới]  Bài Facebook đã lưu          [X bài]       │
├────────────────────────────────────────────────────────────────┤
│  Filter: [Tất cả ▾] [Fanpage ▾] [Friendly ▾]   [🔍 Tìm...]   │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [📣 Fanpage]  [Promotional] [😊]   Minh Quân · 12/5/26  │  │
│  │ Tháng 5 này, Minh Quân có chương trình giảm 20%...      │  │
│  │ 145 từ · 820 ký tự                                       │  │
│  │ [📋 Copy] [✏️ Chỉnh sửa] [🔄 Dùng lại] [🗑️ Xóa]        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  (Tiếp tục các card...)                                         │
└────────────────────────────────────────────────────────────────┘
```

**Features cần có:**
- Load tất cả bài qua `GET /api/viet-bai-facebook?page=1&limit=20`
- Filter: target (personal/fanpage/group) + style + search text
- Copy ngay từ card (không cần mở)
- "Dùng lại" → router.push('/viet-bai-facebook') + điền lại topic vào sessionStorage
- Xóa với confirm dialog ("Xóa bài này không thể khôi phục")
- Phân trang (load more, không dùng pagination số)

---

## 10. Thêm GET all vào API

```typescript
// GET /api/viet-bai-facebook?page=1&limit=20&target=fanpage&style=friendly&q=khuyến mãi
// web/app/api/viet-bai-facebook/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page   = parseInt(searchParams.get('page') ?? '1');
  const limit  = parseInt(searchParams.get('limit') ?? '20');
  const target = searchParams.get('target') ?? undefined;
  const style  = searchParams.get('style') ?? undefined;
  const q      = searchParams.get('q') ?? undefined;

  const where = {
    ...(target ? { target } : {}),
    ...(style  ? { style  } : {}),
    ...(q ? {
      OR: [
        { topic:   { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ],
    } : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.facebookPost.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
      select: {
        id: true, topic: true, content: true, target: true, style: true,
        emojiLevel: true, wordCount: true, charCount: true,
        brandName: true, createdAt: true,
      },
    }),
    prisma.facebookPost.count({ where }),
  ]);

  return Response.json({ posts, total, page, limit });
}
```

---

## 11. Sidebar

```typescript
// web/components/Sidebar.tsx — cập nhật section Social:
{
  label: 'Social',
  items: [
    { href: '/viet-bai-facebook',    icon: '📝', label: 'Viết bài Facebook'    },
    { href: '/facebook-post',        icon: '⚡', label: 'Tạo nhanh (stateless)' },
    { href: '/facebook-comment',     icon: '💬', label: 'Tạo Facebook Comment' },
    { href: '/quan-ly-bai-facebook', icon: '📋', label: 'Bài đã lưu'           },
  ],
},
```

---

## 12. Prisma Migration — fields cần thêm

```prisma
// Nếu model FacebookPost chưa có các field mới — thêm vào schema.prisma:

model FacebookPost {
  // ... existing fields từ task #11, #20 ...
  sourceUrl   String?                    // ← MỚI: URL blog nguồn
  emojiLevel  String  @default("medium") // ← MỚI: low | medium | high | none
  modelId     String?                    // ← MỚI: AI model đã dùng
}
```

Chạy: `npx prisma migrate dev --name add-facebook-post-fields`

---

## 13. Bugs & Edge Cases

| # | Bug | Xử lý |
|---|-----|--------|
| 1 | AI trả markdown trong plain text | Reset signal pattern (giống `/facebook-post`) |
| 2 | Source URL bị 403 / không crawl được | Server catch error → tiếp tục với topic thôi, không crash |
| 3 | Brand không chọn → shopName rỗng → avatar "FB" | Fallback avatar 2 ký tự đã xử lý trong preview card |
| 4 | Bấm "Tạo lại" khi đang stream | `abortRef.current?.abort()` → reset → start mới |
| 5 | "Lưu bài" click 2 lần | `disabled={saving || !!savedId}` ngăn double save |
| 6 | Xóa bài ở management → re-fetch list | Sau DELETE → gọi lại API list để refresh |
| 7 | BrandSection collapse nhưng data vẫn gửi | Brand state vẫn persist qua `LS_KEY_BRAND` — collapse chỉ ẩn UI |
| 8 | ModelId chưa load xong khi submit | Validate `!modelId` trước khi gọi generate |

---

## 14. Thứ tự cài đặt

| Bước | File | Ghi chú |
|------|------|---------|
| 1 | Prisma migration | Thêm sourceUrl, emojiLevel, modelId vào FacebookPost |
| 2 | `lib/viet-bai-facebook/types.ts` | Types |
| 3 | `lib/viet-bai-facebook/options.ts` | Constants |
| 4 | `lib/viet-bai-facebook/prompt-builder.ts` | buildFacebookBrandPostPrompt |
| 5 | `api/viet-bai-facebook/generate/route.ts` | Test Postman 3 targets × 3 styles |
| 6 | `api/viet-bai-facebook/save/route.ts` | Test lưu vào DB |
| 7 | `api/viet-bai-facebook/[id]/route.ts` | GET/PUT/DELETE |
| 8 | `api/viet-bai-facebook/route.ts` | GET all với filter |
| 9 | `app/viet-bai-facebook/page.tsx` | UI full |
| 10 | `app/quan-ly-bai-facebook/page.tsx` | Management page |
| 11 | Sidebar update | Thêm 4 items Social section |

---

## 15. QA Checklist

### Form & Config
- [ ] Textarea nhận topic, paste, emoji
- [ ] URL source input — để trống OK, có URL → gửi lên API
- [ ] 3 target chip highlight đúng (default: fanpage)
- [ ] 9 style chip grid 3 cột, badge "Hot" hiện đúng
- [ ] 4 emoji level chip, default "Vừa"
- [ ] ModelPicker load từ DB, auto-select default
- [ ] BrandSection collapsed mặc định, badge "Đã cấu hình" khi có data
- [ ] Persist topic qua F5 (sessionStorage `vbf_config`)
- [ ] `vbf_brand_info` persist qua F5

### Generate & Stream
- [ ] Thiếu topic → error "Vui lòng nhập chủ đề"
- [ ] Thiếu model → error "Vui lòng chọn AI Model"
- [ ] Stream real-time, cursor blink
- [ ] Markdown bị strip (reset signal pattern)
- [ ] Abort khi bấm Tạo lại đang stream → không double request
- [ ] Brand info inject vào prompt → output có tên thương hiệu đúng
- [ ] Target = fanpage → cuối bài có CTA
- [ ] Target = group → cuối bài có câu hỏi
- [ ] Emoji level = none → không có emoji trong output
- [ ] Emoji level = high → nhiều emoji

### Save & Management
- [ ] "Lưu" → POST /api/viet-bai-facebook/save → nút đổi thành "✓ Đã lưu"
- [ ] Không lưu được click 2 lần (disabled khi savedId có)
- [ ] /quan-ly-bai-facebook load list đúng thứ tự (mới nhất trước)
- [ ] Filter target + style + search hoạt động
- [ ] Copy từ card management → clipboard
- [ ] "Dùng lại" → chuyển về /viet-bai-facebook với topic cũ
- [ ] Xóa → confirm → xóa → list refresh, không còn bài đó
- [ ] Tab nav active đúng trang
