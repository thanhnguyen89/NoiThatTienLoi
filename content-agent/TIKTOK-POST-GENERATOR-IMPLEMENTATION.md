# TIKTOK-POST-GENERATOR-IMPLEMENTATION.md
## Spec tính năng "Tạo TikTok Caption" — `/tiktok-post`

> Pattern: **Nhóm B — Công cụ nhanh, stateless**  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · SSE

---

## 0. Cấu trúc thật của TikTok Post (từ UI thực tế)

Khi đăng lên TikTok, app hiển thị **3 field riêng biệt**:

```
┌──────────────────────────────────────────┐
│  Ảnh bìa  [+]                            │
│                                          │
│  Thêm tiêu đề hấp dẫn          ← TITLE  │
│  ─────────────────────────────────────── │
│  Mô tả dài có thể giúp tăng lượt xem    │
│  trung bình lên gấp 3 lần.    ← CAPTION  │
│  (textarea, có # @ buttons)              │
│                                          │
│  # @ ✨                    [fullscreen]  │
│  ─────────────────────────────────────── │
│  Vị trí           ← LOCATION (user fill) │
│  Thêm liên kết                           │
│  Ai cũng có thể xem                      │
└──────────────────────────────────────────┘
```

→ Tool phải generate **3 output riêng**:

| Field | Nội dung | Giới hạn | Ghi chú |
|-------|----------|----------|---------|
| **Tiêu đề** | Hook ngắn | ≤ 50 ký tự | Hiển thị to, scroll-stop |
| **Mô tả** | Caption đầy đủ | 100–200 từ | Body + CTA, KHÔNG có hashtag trong body |
| **Hashtag** | Cụm # riêng | 5–10 tags | Dán vào caption textarea sau mô tả |

> **Location** không AI-generate — user tự chọn từ danh sách TikTok gợi ý.

### So sánh với `/facebook-post` và `/viet-bai-tiktok`

| | `/facebook-post` | `/tiktok-post` | `/viet-bai-tiktok` |
|---|---|---|---|
| Nhóm | B (nhanh) | **B (nhanh)** | C (brand) |
| Brand profile | ❌ | ❌ | ✅ |
| Lưu DB | ❌ | ❌ | ✅ |
| Output fields | 1 (post body) | **3 (title + caption + hashtags)** | 3 |
| Hashtag | ❌ | **✅ 5–10 tags** | ✅ 5–10 tags |
| Title riêng | ❌ | **✅ ≤ 50 ký tự** | ✅ |
| Preview card | Facebook (light) | **TikTok (dark)** | TikTok (dark) |

---

## 1. Kiến trúc

```
web/
├── app/
│   ├── tiktok-post/
│   │   └── page.tsx
│   └── api/
│       └── tiktok-post/
│           └── generate/
│               └── route.ts
└── lib/
    └── tiktok-post/
        ├── types.ts
        ├── options.ts
        └── parser.ts          ← parseTiktokOutput()
```

File tái sử dụng: `lib/tinh-gon/model.ts` → `buildTinhGonModel()`

---

## 2. Types — `web/lib/tiktok-post/types.ts`

```typescript
export type VideoType =
  | 'product_demo'   // Demo sản phẩm thực tế
  | 'load_test'      // Thử tải / chịu lực
  | 'price_reveal'   // Báo giá / so sánh
  | 'new_arrival'    // Ra mắt mẫu mới
  | 'promotion';     // Flash sale / deal sốc

export type HookStyle =
  | 'pov'            // "POV: mình vừa mua..."
  | 'challenge'      // "Đừng mua X trước khi xem cái này"
  | 'number'         // "250kg không gãy — 1.2 triệu"
  | 'question'       // "Giường 1 triệu có bền không?"
  | 'story';         // Mini story 2–3 câu

export type TikTokCTA =
  | 'inbox'          // "Inbox mình để được báo giá"
  | 'comment_key'    // "Comment 'GIÁ' để mình gửi bảng giá"
  | 'bio_link'       // "Link TikTok Shop trong bio"
  | 'phone';         // "Nhắn hotline tư vấn ngay"

export interface TiktokPostConfig {
  topic:     string;
  videoType: VideoType;
  hookStyle: HookStyle;
  ctaStyle:  TikTokCTA;
  language:  string;
  useEmoji:  boolean;
}

// Output từ parser
export interface TiktokParsedOutput {
  title:    string;        // ≤ 50 ký tự
  caption:  string;        // 100–200 từ, plain text
  hashtags: string[];      // ['#noithatminhquan', '#giuongsat', ...]
}

// SSE events
export type TiktokPostSSEEvent =
  | { type: 'chunk'; text: string }                      // raw stream (UX)
  | { type: 'parsed'; data: TiktokParsedOutput }         // structured output
  | { type: 'done'; wordCount: number; charCount: number }
  | { type: 'error'; message: string };
```

---

## 3. Options — `web/lib/tiktok-post/options.ts`

```typescript
import type { VideoType, HookStyle, TikTokCTA } from './types';

export const VIDEO_TYPES: Array<{
  value: VideoType; label: string; icon: string; note: string;
}> = [
  { value: 'product_demo', label: 'Demo sản phẩm',     icon: '📦',
    note: 'Quay sản phẩm thực tế — khung, màu, kích thước' },
  { value: 'load_test',    label: 'Thử tải / chịu lực', icon: '💪',
    note: 'Demo độ bền — ngồi lên, nhảy lên, vật nặng' },
  { value: 'price_reveal', label: 'Báo giá / So sánh',  icon: '💰',
    note: 'Reveal giá hoặc so sánh với thị trường' },
  { value: 'new_arrival',  label: 'Mẫu mới về kho',     icon: '✨',
    note: 'Giới thiệu sản phẩm mới — điểm khác biệt' },
  { value: 'promotion',    label: 'Flash sale / Deal',   icon: '🔥',
    note: 'Khuyến mãi có hạn — urgency, giá ưu đãi' },
];

export const HOOK_STYLES: Array<{
  value: HookStyle; label: string; icon: string; note: string; example: string; hot?: boolean;
}> = [
  { value: 'pov',       label: 'POV Format',      icon: '🎬', hot: true,
    note: 'Kéo người xem vào tình huống thứ nhất',
    example: 'POV: mình vừa nhận giường sắt 990k về...' },
  { value: 'challenge', label: 'Đừng bỏ qua',     icon: '⚠️', hot: true,
    note: 'Pattern-interrupt — cảnh báo nhẹ, gây tò mò',
    example: 'Đừng mua giường đắt trước khi xem cái này' },
  { value: 'number',    label: 'Số liệu gây sốc', icon: '🔢',
    note: 'Con số bất ngờ ở câu đầu — giá / kg / ngày',
    example: '250kg không gãy — giá chỉ 1.2 triệu' },
  { value: 'question',  label: 'Câu hỏi kéo',     icon: '❓',
    note: 'Câu hỏi mà người xem muốn biết câu trả lời',
    example: 'Giường sắt 1 triệu có thật sự bền không?' },
  { value: 'story',     label: 'Kể chuyện mini',  icon: '📖',
    note: 'Tình huống thật ngắn: ai, vấn đề gì, giải quyết sao',
    example: 'Tuần trước khách nhà trọ hỏi mình...' },
];

export const CTA_STYLES: Array<{
  value: TikTokCTA; label: string; example: string;
}> = [
  { value: 'inbox',       label: 'Inbox / DM',       example: 'Inbox mình để được báo giá ngay nhé' },
  { value: 'comment_key', label: 'Comment keyword',   example: "Comment 'GIÁ' để mình gửi bảng giá" },
  { value: 'bio_link',    label: 'TikTok Shop / Bio', example: 'Link TikTok Shop trong bio — vào xem ngay' },
  { value: 'phone',       label: 'Gọi / Nhắn SMS',   example: 'Nhắn hotline để tư vấn trong ngày' },
];

// Hashtag rules
export const HASHTAG_RULES = {
  count: { min: 5, max: 10 },
  categories: [
    'branded',   // #noithatminhquan #minhquan
    'category',  // #giuongsat #noithat #tuquanao
    'discovery', // #giuongsatgiareo #noithatgiareo #giaxuong
    'location',  // #tphcm #hcm #giaohangtoantoc (nếu phù hợp)
  ],
};

// sessionStorage key
export const LS_KEY_CONFIG = 'tkp_config';
```

---

## 4. Parser — `web/lib/tiktok-post/parser.ts`

AI output theo format chuẩn, parser tách thành 3 phần:

```typescript
import type { TiktokParsedOutput } from './types';

/**
 * Parse AI output format:
 * TITLE:
 * [title text]
 *
 * CAPTION:
 * [caption text]
 *
 * HASHTAGS:
 * #tag1 #tag2 #tag3
 */
export function parseTiktokOutput(raw: string): TiktokParsedOutput {
  const titleMatch   = raw.match(/TITLE:\s*\n([\s\S]*?)(?=\nCAPTION:|$)/i);
  const captionMatch = raw.match(/CAPTION:\s*\n([\s\S]*?)(?=\nHASHTAGS:|$)/i);
  const hashtagMatch = raw.match(/HASHTAGS:\s*\n([\s\S]*?)$/i);

  const title   = (titleMatch?.[1]   ?? '').trim().slice(0, 100);
  const caption = (captionMatch?.[1] ?? '').trim();

  // Parse hashtags — split on spaces/newlines, filter to only #tags
  const hashtagRaw = (hashtagMatch?.[1] ?? '').trim();
  const hashtags = hashtagRaw
    .split(/[\s\n]+/)
    .map((t) => t.trim())
    .filter((t) => t.startsWith('#') && t.length > 1)
    .slice(0, 10);

  return { title, caption, hashtags };
}

// Kiểm tra parse thành công
export function isValidTiktokOutput(parsed: TiktokParsedOutput): boolean {
  return (
    parsed.title.length > 0 &&
    parsed.caption.split(/\s+/).length >= 30 &&
    parsed.hashtags.length >= 3
  );
}
```

---

## 5. API — `web/app/api/tiktok-post/generate/route.ts`

```typescript
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { parseTiktokOutput } from '@/lib/tiktok-post/parser';
import type { TiktokPostConfig, TiktokPostSSEEvent, VideoType, HookStyle, TikTokCTA } from '@/lib/tiktok-post/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ─── Video type context ───────────────────────────────────────────────────────
const VIDEO_TYPE_CONTEXT: Record<VideoType, string> = {
  product_demo: 'Video quay sản phẩm thực tế. Caption mô tả ngắn những gì người xem THẤY (màu, khung, size) + USP chính.',
  load_test:    'Video thử tải / chịu lực. TITLE phải có số liệu kết quả. Caption: tại sao chịu được + chất liệu.',
  price_reveal: 'Video báo giá. TITLE phải có giá ngay. Caption: lý do giá tốt (giá xưởng, không qua trung gian).',
  new_arrival:  'Video mẫu mới về kho. TITLE: tên mẫu + điểm nổi bật. Caption: so với mẫu cũ, có sẵn, giao nhanh.',
  promotion:    'Video khuyến mãi flash sale. TITLE: giá ưu đãi + urgency. Caption: điều kiện, thời hạn, số lượng.',
};

// ─── Hook instructions ────────────────────────────────────────────────────────
const HOOK_INSTRUCTIONS: Record<HookStyle, string> = {
  pov:       'Caption mở đầu bằng "POV:" rồi đặt người xem vào tình huống. TITLE cũng theo style POV ngắn.',
  challenge: 'TITLE là statement ngược / cảnh báo. Caption tiếp nối giải thích tại sao.',
  number:    'TITLE bắt đầu bằng số liệu cụ thể. Caption bổ sung context cho số liệu đó.',
  question:  'TITLE là câu hỏi ngắn. Caption trả lời câu hỏi đó + USP.',
  story:     'TITLE gợi tình huống. Caption kể mini story 2–3 câu rồi chuyển sang USP.',
};

// ─── CTA instructions ─────────────────────────────────────────────────────────
const CTA_INSTRUCTIONS: Record<TikTokCTA, string> = {
  inbox:       'Kết thúc caption: mời inbox / DM để báo giá. VD: "Inbox mình để được báo giá ngay 💬"',
  comment_key: "Kết thúc caption: kêu gọi comment keyword. VD: \"Comment 'GIÁ' để mình gửi bảng giá\"",
  bio_link:    'Kết thúc caption: hướng đến TikTok Shop / bio. VD: "Link trong bio — vào xem ngay 🔗"',
  phone:       'Kết thúc caption: kêu gọi nhắn/gọi hotline. Không hardcode số — ghi "{SĐT}".',
};

// ─── Hashtag generation rules ─────────────────────────────────────────────────
const HASHTAG_CONTEXT: Record<VideoType, string> = {
  product_demo: '#noithatminhquan #giuongsat #noithat #giuongsatgiareo #noithatphongngu',
  load_test:    '#noithatminhquan #giuongsat #giuongsatbenhdep #chauluc #noithatbenvung',
  price_reveal: '#noithatminhquan #giuongsat #giaxuong #noithatgiareo #muanoithatonline',
  new_arrival:  '#noithatminhquan #newcollection #giuongsat #noithatmoi #noithat2026',
  promotion:    '#noithatminhquan #sale #giamgia #giuongsat #flashsale #muanhanh',
};

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildTiktokPostPrompt(config: TiktokPostConfig): string {
  const { topic, videoType, hookStyle, ctaStyle, language, useEmoji } = config;

  const emojiRule = useEmoji
    ? 'Dùng emoji vừa phải. TITLE: không emoji. CAPTION: tối đa 3–4 emoji, đặt đầu/cuối câu — KHÔNG giữa câu.'
    : 'KHÔNG dùng emoji trong bất kỳ phần nào.';

  return `Bạn là chuyên gia viết TikTok content cho thương hiệu nội thất Việt Nam — Nội Thất Minh Quân.

## Ngữ cảnh video
${VIDEO_TYPE_CONTEXT[videoType]}
Hook approach: ${HOOK_INSTRUCTIONS[hookStyle]}

## Mô tả video / ý tưởng
${topic}

## Yêu cầu output (3 phần — PHẢI theo đúng format)
- Ngôn ngữ: ${language}
- Xưng hô: "mình" / "Minh Quân" → "bạn"
- Emoji: ${emojiRule}
- CTA cuối caption: ${CTA_INSTRUCTIONS[ctaStyle]}

## Từ CẤM trong mọi phần
quan trọng, hiệu quả, tuy nhiên, bên cạnh đó, vô cùng, cực kỳ,
tuyệt vời, siêu phẩm, số 1, đẳng cấp, hoàn hảo, "không chỉ ... mà còn"

## FORMAT OUTPUT BẮT BUỘC (giữ nguyên markers)

TITLE:
[1 dòng, tối đa 50 ký tự, hook mạnh theo style: ${hookStyle}]

CAPTION:
[100–200 từ, plain text, KHÔNG có hashtag trong phần này. Cấu trúc: Hook (1–2 câu) → Body (3–5 câu) → CTA (1 câu)]

HASHTAGS:
[5–10 hashtag liên quan, tham khảo: ${HASHTAG_CONTEXT[videoType]} — thêm location tag #tphcm hoặc #hcm nếu phù hợp]

## Quy tắc chung
- KHÔNG thêm text ngoài 3 phần trên
- KHÔNG dùng markdown (**, *, #title)
- KHÔNG dùng hashtag trong CAPTION — hashtag chỉ ở phần HASHTAGS
- TITLE không có emoji`.trim();
}

// ─── Route ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const body: TiktokPostConfig = await request.json();

  if (!body.topic?.trim()) {
    return Response.json({ type: 'error', message: 'Thiếu mô tả video / chủ đề' }, { status: 400 });
  }

  const prompt = buildTiktokPostPrompt(body);
  const model  = buildTinhGonModel('gemini-flash');

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: TiktokPostSSEEvent) =>
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        let fullText = '';

        try {
          // Stream raw text for real-time UX
          const aiStream = await model.generateContentStream(prompt);
          for await (const chunk of aiStream) {
            const text = chunk.text();
            if (!text) continue;
            fullText += text;
            send({ type: 'chunk', text });   // client shows raw stream
          }
        } catch {
          const result = await model.generateContent(prompt);
          fullText = result.response.text();
          send({ type: 'chunk', text: fullText });
        }

        // Parse sections
        const parsed = parseTiktokOutput(fullText);

        // Send structured parsed output (client replaces raw display)
        send({ type: 'parsed', data: parsed });

        send({
          type: 'done',
          wordCount: parsed.caption.split(/\s+/).filter(Boolean).length,
          charCount: parsed.caption.length,
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

---

## 6. Client — State & SSE handling

```typescript
// State cho 3 sections
const [title,    setTitle]    = useState('');
const [caption,  setCaption]  = useState('');
const [hashtags, setHashtags] = useState<string[]>([]);
const [rawStream, setRawStream] = useState('');  // hiện khi đang stream
const [parsed,   setParsed]   = useState(false); // true khi nhận 'parsed' event

// SSE handler
if (event.type === 'chunk') {
  setRawStream(prev => prev + event.text);
} else if (event.type === 'parsed') {
  // Replace raw stream với structured output
  setTitle(event.data.title);
  setCaption(event.data.caption);
  setHashtags(event.data.hashtags);
  setParsed(true);
  setRawStream('');
} else if (event.type === 'done') {
  setWordCount(event.wordCount);
  setCharCount(event.charCount);
}
```

---

## 7. Layout UI

```
┌──────────────────────────────────────────────────────────────────────┐
│  Tab: [🎬 Tạo TikTok Caption]  [📝 Tạo Facebook Post →]              │
├───────────────────┬──────────────────────────────────────────────────┤
│  FORM (w-72)      │  OUTPUT                                          │
│                   │                                                  │
│  Mô tả video *    │  ① TIÊU ĐỀ (≤ 50 ký tự)                        │
│  [textarea r=5]   │  ┌──────────────────────────────────────────┐   │
│                   │  │ 250kg không gãy — giá chỉ 1.2 triệu     │   │
│  Loại video       │  │                          [Copy tiêu đề]  │   │
│  [5 chips]        │  └──────────────────────────────────────────┘   │
│                   │  [⚠ 52 ký tự — nên ≤ 50] nếu vượt             │
│  Kiểu Hook        │                                                  │
│  [5 chips]        │  ② MÔ TẢ / CAPTION (100–200 từ)                │
│  (2 badge Hot)    │  ┌──────────────────────────────────────────┐   │
│                   │  │ Mình test giường sắt 1m2 với 3 người...  │   │
│  Kiểu CTA         │  │ ...                                      │   │
│  [4 chips]        │  │ Inbox mình để được báo giá ngay 💬       │   │
│                   │  │                        [Copy mô tả]      │   │
│  Ngôn ngữ         │  └──────────────────────────────────────────┘   │
│  [dropdown]       │  125 từ · 680 ký tự  [🔄 Tạo lại]             │
│                   │                                                  │
│  Emoji [toggle]   │  ③ HASHTAG (5–10 tags)                         │
│                   │  ┌──────────────────────────────────────────┐   │
│  [🎬 Tạo Caption] │  │ #noithatminhquan #giuongsat #chauluc     │   │
│                   │  │ #giuongsatgiareo #noithat                 │   │
│                   │  │                        [Copy hashtag]    │   │
│                   │  └──────────────────────────────────────────┘   │
│                   │                                                  │
│                   │  [TikTok Preview Card ↓]                        │
│                   │  (dark mode, hiện đủ 3 phần)                    │
└───────────────────┴──────────────────────────────────────────────────┘
```

### Output section — 3 box riêng với nút Copy độc lập

```tsx
{parsed && (
  <div className="space-y-4">

    {/* Box 1: Tiêu đề */}
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-700">
          ① Tiêu đề
          <span className={`ml-2 text-[10px] font-normal ${
            title.length > 50 ? 'text-amber-500' : 'text-gray-400'
          }`}>
            {title.length}/50 ký tự
          </span>
        </label>
        <CopyButton text={title} label="Copy tiêu đề" />
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5
                      text-sm text-gray-900 font-medium">
        {title}
      </div>
    </div>

    {/* Box 2: Mô tả */}
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-700">
          ② Mô tả / Caption
          <span className="ml-2 text-[10px] font-normal text-gray-400">
            {wordCount} từ · {charCount} ký tự
          </span>
        </label>
        <div className="flex items-center gap-2">
          <button onClick={() => void handleGenerate()}
            className="text-[10px] text-gray-400 hover:text-gray-600">
            🔄 Tạo lại
          </button>
          <CopyButton text={caption} label="Copy mô tả" />
        </div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3
                      text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
        {caption}
      </div>
    </div>

    {/* Box 3: Hashtag */}
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-700">
          ③ Hashtag
          <span className="ml-2 text-[10px] font-normal text-gray-400">
            {hashtags.length} tags
          </span>
        </label>
        <CopyButton text={hashtags.join(' ')} label="Copy hashtag" />
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((tag) => (
            <span key={tag}
              className="px-2 py-0.5 bg-blue-50 border border-blue-200
                         text-blue-700 text-xs rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-1">
        Dán hashtag vào cuối phần Mô tả trong app TikTok
      </p>
    </div>

  </div>
)}

{/* Raw stream khi đang chạy, chưa parse xong */}
{!parsed && rawStream && (
  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3
                  text-sm text-gray-500 whitespace-pre-wrap leading-relaxed">
    {rawStream}
    <span className="inline-block w-1.5 h-3 bg-blue-400 ml-1 animate-pulse rounded-sm" />
  </div>
)}
```

### TikTok Preview Card (dark mode)

```tsx
{/* Hiện sau khi parsed = true */}
{parsed && (
  <div className="max-w-sm mx-auto mt-6 border-t border-gray-100 pt-4">
    <p className="text-[10px] text-gray-400 mb-2 text-center">Preview TikTok</p>
    <div className="bg-[#111] rounded-2xl overflow-hidden">
      {/* Video placeholder */}
      <div className="relative bg-[#111] flex items-center justify-center"
           style={{ aspectRatio: '9/16', maxHeight: '260px' }}>
        <div className="text-center">
          <span className="text-4xl block mb-1">
            {VIDEO_TYPES.find(v => v.value === config.videoType)?.icon}
          </span>
          <span className="text-[10px] text-gray-600">
            {VIDEO_TYPES.find(v => v.value === config.videoType)?.label}
          </span>
        </div>
        {/* Right action sidebar */}
        <div className="absolute right-3 bottom-6 flex flex-col items-center gap-4">
          {[{ icon: '❤️', n: '1.2K' }, { icon: '💬', n: '48' },
            { icon: '↗️', n: '89'  }, { icon: '🔖', n: '' }].map(({ icon, n }) => (
            <div key={icon} className="flex flex-col items-center gap-0.5">
              <span className="text-lg drop-shadow">{icon}</span>
              {n && <span className="text-[9px] text-gray-400">{n}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom info */}
      <div className="px-3 py-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center
                          text-white text-[9px] font-bold">MQ</div>
          <span className="text-[11px] text-gray-300 font-semibold">@noithatminhquan</span>
        </div>
        {/* Title */}
        <p className="text-[12px] text-white font-semibold leading-tight">{title}</p>
        {/* Caption preview — 2 dòng */}
        <p className="text-[11px] text-gray-300 leading-relaxed line-clamp-2">
          {caption}
        </p>
        {/* Hashtags inline */}
        <p className="text-[11px] text-blue-400 leading-relaxed">
          {hashtags.slice(0, 4).join(' ')}
          {hashtags.length > 4 && ' ...'}
        </p>
      </div>
    </div>
  </div>
)}
```

---

## 8. Thứ tự cài đặt

| Bước | File | Ghi chú |
|------|------|---------|
| 1 | `lib/tiktok-post/types.ts` | Enums + TiktokParsedOutput |
| 2 | `lib/tiktok-post/options.ts` | Constants + hashtag context |
| 3 | `lib/tiktok-post/parser.ts` | parseTiktokOutput() + unit test |
| 4 | `api/tiktok-post/generate/route.ts` | Test Postman 3 hook styles |
| 5 | `app/tiktok-post/page.tsx` | UI — test 3 box output + preview |
| 6 | Sidebar update | Social section |
| 7 | Verify: title ≤ 50 ký tự | Test 5 lần generate |
| 8 | Verify: KHÔNG hashtag trong caption body | Regex check |
| 9 | Verify: 5–10 hashtag trong phần HASHTAGS | |
| 10 | Verify: parser fallback | Nếu AI không follow format → graceful degradation |

---

## 9. Xử lý parser failure (fallback)

Nếu AI không tuân theo format (thiếu markers), parser fallback:

```typescript
export function parseTiktokOutputWithFallback(raw: string): TiktokParsedOutput {
  const parsed = parseTiktokOutput(raw);

  // Nếu không có title → lấy dòng đầu tiên
  if (!parsed.title) {
    const firstLine = raw.split('\n').find(l => l.trim().length > 0) ?? '';
    parsed.title = firstLine.replace(/^(TITLE:|CAPTION:|HASHTAGS:)/i, '').trim().slice(0, 50);
  }

  // Nếu không có hashtags → extract tất cả #tag từ raw
  if (parsed.hashtags.length === 0) {
    const allTags = raw.match(/#\w+/g) ?? [];
    parsed.hashtags = [...new Set(allTags)].slice(0, 10);
  }

  // Nếu không có caption → dùng toàn bộ raw (bỏ hashtags)
  if (!parsed.caption) {
    parsed.caption = raw
      .replace(/TITLE:.*?\n/i, '')
      .replace(/CAPTION:/i, '')
      .replace(/HASHTAGS:[\s\S]*/i, '')
      .trim();
  }

  return parsed;
}
```

---

## 10. QA Checklist

### Form & Config
- [ ] 5 video type chips, 5 hook style chips (badge Hot ở pov + challenge), 4 CTA chips
- [ ] Emoji toggle bật/tắt
- [ ] Persist config qua F5 (`tkp_config`)

### Generate & Parse
- [ ] Thiếu topic → error message
- [ ] Raw stream hiện đang generate (typing effect)
- [ ] Sau done → 3 box riêng xuất hiện (title / caption / hashtag)
- [ ] Raw stream disappear sau khi parsed = true
- [ ] KHÔNG có hashtag (#) trong phần caption body
- [ ] KHÔNG có emoji trong title
- [ ] Title ≤ 50 ký tự (warning nếu vượt)
- [ ] 5–10 hashtag trong box hashtag
- [ ] Parser fallback không crash khi AI sai format

### Output Quality
- [ ] hookStyle = pov → title + caption mở "POV:"
- [ ] hookStyle = number → title có số liệu cụ thể
- [ ] videoType = price_reveal → giá xuất hiện trong title
- [ ] videoType = promotion → có urgency trong caption
- [ ] ctaStyle = comment_key → caption có "Comment '[keyword]'"
- [ ] KHÔNG có từ cấm (tuy nhiên, vô cùng, siêu phẩm…)

### UI
- [ ] 3 nút Copy độc lập — mỗi nút copy đúng phần của mình
- [ ] Hashtag chips render đẹp (blue pill style)
- [ ] TikTok preview card dark mode — title, 2 dòng caption, hashtag inline
- [ ] "Dán hashtag vào cuối phần Mô tả trong app TikTok" note hiện đúng chỗ

---

## 11. Lỗi thường gặp

| Lỗi | Nguyên nhân | Xử lý |
|-----|-------------|-------|
| Parser trả title rỗng | AI không viết marker "TITLE:" | Dùng `parseTiktokOutputWithFallback` |
| Hashtag xuất hiện trong caption | AI bỏ vào body | Thêm "TUYỆT ĐỐI không hashtag trong CAPTION" all-caps vào prompt |
| Title > 50 ký tự | AI viết dài | Warning amber trong UI; thêm "tối đa 50 ký tự" vào prompt |
| Caption < 50 từ | AI viết quá ngắn | Thêm "tối thiểu 100 từ" vào prompt |
| Emoji trong title | AI ignore | Thêm "TITLE không có emoji" vào prompt |
| Hashtag lặp nhau | AI gen trùng | `[...new Set(allTags)]` trong parser |
| 3 box không xuất hiện | `parsed` event bị miss | Kiểm tra SSE parse client: `event.type === 'parsed'` |
