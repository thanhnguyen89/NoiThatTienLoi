# VIET-BAI-TIKTOK-IMPLEMENTATION.md
## Spec triển khai trang Viết Bài TikTok — `/viet-bai-tiktok`

> Tài liệu này dành cho dev.  
> Pattern: **Nhóm C — Công cụ Social Brand** (brand-aware, lưu DB, quản lý lịch sử)  
> Tương tự `/viet-bai-facebook` nhưng đặc thù TikTok.  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma · SSE

---

## 0. Phân tích TikTok vs Facebook — Điểm khác biệt cốt lõi

### Cấu trúc thật của TikTok Post (từ UI thực tế)

TikTok có **3 field riêng biệt** khi đăng bài:

| Field | Mô tả | Quy tắc AI |
|-------|-------|------------|
| **Tiêu đề** | Hook ngắn, hiển thị to | ≤ 50 ký tự, KHÔNG emoji |
| **Mô tả** | Caption đầy đủ, TikTok gợi ý dài giúp tăng view x3 | 100–200 từ, KHÔNG hashtag trong body |
| **Hashtag** | Nhập qua nút `#` trong caption textarea | 5–10 tags, cuối phần mô tả |
| **Vị trí** | User tự chọn từ danh sách TikTok | AI không generate — user tự điền |

> **Tool phải generate 3 output riêng: title + caption + hashtags**

### Tại sao TikTok cần spec riêng

| Yếu tố | Facebook Post | **TikTok Caption** |
|--------|--------------|-------------------|
| Độ dài | 200–350 từ | **100–200 từ** (strict) |
| Xưng hô | "Minh Quân" / "bạn" | **"mình" / "bạn"** (casual hơn) |
| Target | Personal / Fanpage / Group | **Chỉ 1 feed (FYP)** — không phân loại target |
| Hook | Quan trọng nhưng không critical | **BẮT BUỘC scroll-stop hook** trong 2 dòng đầu |
| Output fields | 1 (post body) | **3 (title + caption + hashtags)** |
| Video context | Không có | **Có (video type)** — caption phải phù hợp video |
| Hashtag | Không | **✅ 5–10 tags trong section riêng** |
| Title riêng | Không | **✅ ≤ 50 ký tự, field riêng** |
| CTA | Nhắn tin / Gọi / Xem | **Inbox / Comment keyword / TikTok Shop / Hotline** |
| Preview UI | Facebook card (light) | **TikTok card (dark mode)** |

### Xưng hô TikTok (từ brand-guideline.md)

| Xưng (thương hiệu) | Gọi khách |
|---------------------|-----------|
| "Minh Quân" hoặc **"mình"** | **"bạn"** |

> ⚠️ TikTok KHÔNG dùng "chúng tôi" hay "quý khách" — sẽ lộ giọng corporate.

### Video Types — lý do cần (không có trong Facebook)

TikTok caption luôn đi kèm video. Loại video quyết định:
- Cấu trúc hook (thử tải → dùng số liệu; price reveal → giá ở câu đầu)
- USP nào được nhấn mạnh
- Tone của CTA (demo → inbox để hỏi; promotion → urgency)

### Quan hệ với `/tiktok-post`

| | `/tiktok-post` | `/viet-bai-tiktok` |
|---|---|---|
| Mục đích | Tool nhanh, thử ngay | Công cụ chính, brand-aware |
| Brand profile | ❌ | ✅ |
| Lưu DB | ❌ | ✅ |
| Model picker | Fixed flash | ✅ Dynamic |
| Quản lý lịch sử | ❌ | ✅ `/quan-ly-bai-tiktok` |

---

## 1. Kiến trúc — Single Page + API

```
/viet-bai-tiktok                    ← Trang chính (form + output)
/quan-ly-bai-tiktok                 ← Management: danh sách caption đã lưu
/api/viet-bai-tiktok/generate       ← SSE stream tạo caption
/api/viet-bai-tiktok/save           ← POST lưu vào DB
/api/viet-bai-tiktok/[id]           ← GET / PUT / DELETE
/api/viet-bai-tiktok                ← GET all với filter
```

### Cấu trúc file

```
web/
├── app/
│   ├── viet-bai-tiktok/
│   │   └── page.tsx                       ← Trang chính
│   ├── quan-ly-bai-tiktok/
│   │   └── page.tsx                       ← Quản lý caption đã lưu
│   └── api/
│       └── viet-bai-tiktok/
│           ├── generate/route.ts          ← SSE stream
│           ├── save/route.ts              ← Lưu mới
│           ├── [id]/route.ts              ← GET/PUT/DELETE
│           └── route.ts                  ← GET all (filter)
└── lib/
    └── viet-bai-tiktok/
        ├── types.ts
        ├── options.ts
        └── prompt-builder.ts             ← buildTiktokBrandPostPrompt()
```

---

## 2. Prisma Model — `schema.prisma`

```prisma
model TiktokPost {
  id          String   @id @default(cuid())

  // Nội dung input
  topic       String                             // Mô tả video / ý tưởng chính
  videoType   String   @default("product_demo")  // Xem VideoType enum
  hookStyle   String   @default("number")        // Xem HookStyle enum
  ctaStyle    String   @default("inbox")         // Xem TikTokCTA enum

  // Output — 3 phần riêng (theo cấu trúc thật của TikTok)
  title       String?                            // ≤ 50 ký tự, field "Tiêu đề" trên TikTok
  content     String                             // Caption body (KHÔNG có hashtag)
  hashtags    String?                            // Space-separated: "#tag1 #tag2 #tag3"

  language    String   @default("Vietnamese")
  emojiLevel  String   @default("medium")        // none | low | medium | high
  wordCount   Int?
  charCount   Int?

  // Brand info (snapshot tại thời điểm tạo)
  brandProfileId  String?
  brandProfile    BrandProfile? @relation(fields: [brandProfileId], references: [id])
  brandName       String?                        // snapshot shopName
  modelId         String?                        // AI model đã dùng

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Chạy: `npx prisma migrate dev --name add-tiktok-post`

---

## 3. Types — `web/lib/viet-bai-tiktok/types.ts`

```typescript
export type VideoType =
  | 'product_demo'   // Demo sản phẩm thực tế (quay khung, màu, kích thước)
  | 'load_test'      // Thử tải / chịu lực (ngồi lên, nhảy lên, vật nặng)
  | 'price_reveal'   // Báo giá / so sánh giá thị trường
  | 'new_arrival'    // Ra mắt mẫu mới về kho
  | 'promotion';     // Flash sale / deal sốc có thời hạn

export type HookStyle =
  | 'pov'            // "POV: mình vừa mua giường 990k mà..."
  | 'challenge'      // "Đừng mua giường đắt trước khi xem cái này"
  | 'number'         // "250kg không gãy — giá chỉ 1.2 triệu"
  | 'question'       // "Giường sắt 1 triệu có thật sự bền không?"
  | 'story';         // Mini story 2–3 câu

export type TikTokCTA =
  | 'inbox'          // "Inbox mình để được báo giá ngay"
  | 'comment_key'    // "Comment 'GIÁ' để mình gửi bảng giá"
  | 'bio_link'       // "Link TikTok Shop trong bio nhé"
  | 'phone';         // "Nhắn / gọi hotline để được tư vấn ngay"

export type EmojiLevel = 'none' | 'low' | 'medium' | 'high';

export interface TiktokBrandPostConfig {
  // Nội dung
  topic:     string;        // Mô tả video / ý tưởng chính
  videoType: VideoType;
  hookStyle: HookStyle;
  ctaStyle:  TikTokCTA;

  // Cấu hình caption
  language:   string;
  emojiLevel: EmojiLevel;

  // Model
  modelId: string;

  // Brand (từ BrandSection)
  brand: BrandSectionState;
}

export interface BrandSectionState {
  shopName:         string;
  industry:         string;
  brandPronouns:    string;    // "mình" / "Minh Quân"
  brandAudience:    string;    // "bạn"
  brandToneNotes:   string;
  phone:            string;
  address:          string;
  brandForbidden:   string;
  ctaStandard:      string;
  mainProducts:     string;
  selectedProfileId: string;
}

// Parsed output (3 phần riêng)
export interface TiktokParsedOutput {
  title:    string;        // ≤ 50 ký tự, KHÔNG emoji
  caption:  string;        // 100–200 từ, KHÔNG hashtag
  hashtags: string[];      // ['#noithatminhquan', '#giuongsat', ...]
}

// SSE Events
export type TiktokPostSSEEvent =
  | { type: 'chunk';  text: string }                   // raw stream UX
  | { type: 'parsed'; data: TiktokParsedOutput }        // structured output
  | { type: 'done';   wordCount: number; charCount: number }
  | { type: 'error';  message: string };

// Saved post từ DB
export interface SavedTiktokPost {
  id:        string;
  topic:     string;
  title:     string | null;
  content:   string;        // caption body
  hashtags:  string | null; // stored as space-separated string
  videoType: VideoType;
  hookStyle: HookStyle;
  ctaStyle:  TikTokCTA;
  brandName: string | null;
  wordCount: number | null;
  charCount: number | null;
  createdAt: string;
}
```

---

## 4. Options — `web/lib/viet-bai-tiktok/options.ts`

```typescript
import type { VideoType, HookStyle, TikTokCTA, EmojiLevel } from './types';

export const VIDEO_TYPES: Array<{
  value: VideoType; label: string; icon: string; note: string;
}> = [
  { value: 'product_demo', label: 'Demo sản phẩm',  icon: '📦',
    note: 'Quay sản phẩm thực tế — khung, màu, kích thước, chất liệu' },
  { value: 'load_test',    label: 'Thử tải / chịu lực', icon: '💪',
    note: 'Demo độ bền — ngồi lên, nhảy lên, đặt vật nặng' },
  { value: 'price_reveal', label: 'Báo giá / So sánh',  icon: '💰',
    note: 'Reveal giá hoặc so sánh với giá thị trường' },
  { value: 'new_arrival',  label: 'Mẫu mới về kho',     icon: '✨',
    note: 'Giới thiệu sản phẩm mới — điểm khác biệt, có sẵn' },
  { value: 'promotion',    label: 'Flash sale / Deal',   icon: '🔥',
    note: 'Khuyến mãi có hạn — urgency, giá ưu đãi' },
];

export const HOOK_STYLES: Array<{
  value: HookStyle; label: string; icon: string; note: string; example: string; hot?: boolean;
}> = [
  { value: 'pov',       label: 'POV Format',      icon: '🎬', hot: true,
    note: 'Kéo người xem vào tình huống thứ nhất',
    example: 'POV: mình vừa mua giường sắt 990k mà...' },
  { value: 'challenge', label: 'Đừng bỏ qua',     icon: '⚠️', hot: true,
    note: 'Statement ngược / cảnh báo nhẹ — gây tò mò',
    example: 'Đừng mua giường đắt trước khi xem cái này' },
  { value: 'number',    label: 'Số liệu gây sốc', icon: '🔢',
    note: 'Con số bất ngờ ở câu đầu — giá / kg / ngày',
    example: '250kg không gãy — giá chỉ 1.2 triệu' },
  { value: 'question',  label: 'Câu hỏi kéo',     icon: '❓',
    note: 'Câu hỏi khiến người xem muốn đọc tiếp',
    example: 'Giường sắt 1 triệu có thật sự bền không?' },
  { value: 'story',     label: 'Kể chuyện mini',  icon: '📖',
    note: 'Tình huống thật ngắn: ai, vấn đề gì, giải quyết ra sao',
    example: 'Tuần trước khách nhà trọ hỏi mình...' },
];

export const CTA_STYLES: Array<{
  value: TikTokCTA; label: string; icon: string; example: string;
}> = [
  { value: 'inbox',       label: 'Inbox / DM',       icon: '💬',
    example: 'Inbox mình để được báo giá ngay nhé' },
  { value: 'comment_key', label: 'Comment keyword',   icon: '🗣️',
    example: "Comment 'GIÁ' để mình gửi bảng giá" },
  { value: 'bio_link',    label: 'TikTok Shop / Bio', icon: '🔗',
    example: 'Link TikTok Shop trong bio — vào xem ngay' },
  { value: 'phone',       label: 'Gọi / Nhắn SMS',   icon: '📞',
    example: 'Nhắn hotline để được tư vấn trong ngày' },
];

export const EMOJI_LEVELS: Array<{
  value: EmojiLevel; label: string; note: string;
}> = [
  { value: 'none',   label: 'Không emoji', note: 'Plain text hoàn toàn' },
  { value: 'low',    label: 'Ít (1–2)',    note: '1-2 emoji toàn caption' },
  { value: 'medium', label: 'Vừa (3–4)',  note: '3-4 emoji — phổ biến nhất' },
  { value: 'high',   label: 'Nhiều (5+)', note: '5+ emoji — content vui vẻ, promo' },
];

// Gợi ý topic theo video type
export const TOPIC_EXAMPLES: Record<VideoType, string> = {
  product_demo: 'VD: Giường sắt 1m6 khung vuông 40x40, sơn tĩnh điện đen, có nan gỗ',
  load_test:    'VD: Test giường 1m2 chịu lực với 2 người ngồi + nhảy mạnh',
  price_reveal: 'VD: Giường sắt 990k — giá xưởng, không qua trung gian',
  new_arrival:  'VD: Mẫu giường tầng mới 2026 — sơn trắng, có hộc kéo',
  promotion:    'VD: Tháng 6 giảm 15% giường sắt — còn 3 ngày',
};

export const TIKTOK_CHAR_WARNING = 1500; // ~2 dòng hiển thị trên FYP trước "more"

// sessionStorage keys
export const LS_KEY_CONFIG = 'vtk_config';
export const LS_KEY_BRAND  = 'vtk_brand_info';
```

---

## 5. Prompt Builder — `web/lib/viet-bai-tiktok/prompt-builder.ts`

```typescript
import type { TiktokBrandPostConfig, VideoType, HookStyle, TikTokCTA, EmojiLevel } from './types';

// ─── Video type context ───────────────────────────────────────────────────────
const VIDEO_TYPE_CONTEXT: Record<VideoType, string> = {
  product_demo:
    'Caption đi kèm video quay sản phẩm thực tế. Mô tả ngắn những gì người xem THẤY trong video (màu, khung, kích thước), rồi thêm USP chính (chịu lực, bền, giá xưởng, giao nhanh). Không kể hết spec — chỉ điểm quan trọng nhất.',
  load_test:
    'Caption đi kèm video thử tải / chịu lực. Hook PHẢI có số liệu kết quả test (kg chịu được, bao nhiêu người, thử bao lâu). Body = tại sao chịu được (chất liệu, khung dày). CTA = inbox để hỏi thêm.',
  price_reveal:
    'Caption đi kèm video báo giá hoặc so sánh giá. Hook = giá ngay câu đầu (không úp mở). Body = lý do giá tốt (trực tiếp từ xưởng, không qua trung gian). CTA mạnh, urgency nếu có.',
  new_arrival:
    'Caption đi kèm video giới thiệu mẫu mới về kho. Hook = mẫu mới về + điểm khác biệt lớn nhất. Body = còn gì hay hơn mẫu cũ, có sẵn, giao nhanh. CTA = xem sớm / hỏi ngay.',
  promotion:
    'Caption đi kèm video khuyến mãi / flash sale. Hook = deal + giá ưu đãi ngay câu đầu. Body = điều kiện ưu đãi, thời hạn, số lượng có hạn. CTA rất mạnh + urgency cụ thể ("còn X ngày", "chỉ hôm nay").',
};

// ─── Hook style instructions ──────────────────────────────────────────────────
const HOOK_INSTRUCTIONS: Record<HookStyle, string> = {
  pov:
    'Mở đầu CHÍNH XÁC bằng "POV:" rồi đặt người xem vào tình huống cụ thể. Tình huống phải gây tò mò hoặc đồng cảm ngay. VD: "POV: mình đặt giường sắt 990k mà giao về chắc hơn mấy cái 2 triệu..."',
  challenge:
    'Câu đầu phải là statement ngược / gây sốc nhẹ / cảnh báo — khiến người xem PHẢI đọc tiếp. Tuyệt đối không dùng "Bạn có biết". VD: "Đừng mua giường đắt trước khi xem cái này." hoặc "Mua giường mà không xem video này thì phí."',
  number:
    'Câu đầu PHẢI có con số cụ thể + kết quả bất ngờ. Format: "[Số liệu] — [hệ quả/giá]". VD: "250kg không gãy — giá chỉ 1.2 triệu." hoặc "Giao 1-2 ngày, giá 890k, chịu lực 200kg."',
  question:
    'Câu đầu là câu hỏi mà người xem đang tự hỏi nhưng chưa biết câu trả lời. KHÔNG phải câu hỏi tu từ. Câu hỏi phải khiến họ muốn xem video để biết đáp án. VD: "Giường sắt 1 triệu có thật sự bền 5 năm không?"',
  story:
    'Mở bằng tình huống thật ngắn (1–2 câu): ai gặp vấn đề gì, Minh Quân giải quyết thế nào. Tự nhiên, không kể lể dài. VD: "Tuần trước khách nhà trọ hỏi mình giường nào chịu được 2 người mà dưới 1 triệu..."',
};

// ─── CTA instructions ─────────────────────────────────────────────────────────
const CTA_INSTRUCTIONS: Record<TikTokCTA, string> = {
  inbox:
    'Kết thúc bằng lời mời inbox / DM trực tiếp. Dùng "mình" làm chủ ngữ nhận DM. VD: "Inbox mình để được báo giá ngay nhé 💬" hoặc "DM mình mẫu bạn thích, mình gửi báo giá trong ngày."',
  comment_key:
    'Kết thúc bằng kêu gọi comment keyword cụ thể. Format bắt buộc: "Comment \'[KEYWORD]\' để mình [làm gì]." VD: "Comment \'GIÁ\' để mình gửi bảng giá ngay" hoặc "Comment \'SIZE\' để mình tư vấn mẫu phù hợp."',
  bio_link:
    'Kết thúc bằng hướng đến TikTok Shop hoặc link trong bio. Ngắn gọn. VD: "Link TikTok Shop trong bio — vào xem ngay nhé 🔗" hoặc "Xem thêm mẫu ở bio mình."',
  phone:
    'Kết thúc bằng kêu gọi nhắn tin / gọi hotline. KHÔNG hardcode số — ghi "{SĐT}" hoặc "hotline". VD: "Nhắn hotline để tư vấn trong ngày, có sẵn giao liền 📞"',
};

// ─── Emoji instructions ───────────────────────────────────────────────────────
const EMOJI_INSTRUCTIONS: Record<EmojiLevel, string> = {
  none:   'TUYỆT ĐỐI KHÔNG dùng emoji — plain text hoàn toàn.',
  low:    'Tối đa 1–2 emoji toàn caption. Đặt ở vị trí đắt nhất (cuối hook hoặc CTA).',
  medium: 'Dùng 3–4 emoji phù hợp. Đặt ở đầu/cuối câu — KHÔNG giữa câu.',
  high:   'Dùng 5+ emoji thoải mái. Phù hợp cho promotion / content vui vẻ. Vẫn đặt đúng vị trí.',
};

// ─── Hashtag context theo video type ─────────────────────────────────────────
const HASHTAG_CONTEXT: Record<VideoType, string> = {
  product_demo: '#noithatminhquan #giuongsat #noithat #giuongsatgiareo #noithatphongngu',
  load_test:    '#noithatminhquan #giuongsat #giuongsatbenhdep #chauluc #noithatbenvung',
  price_reveal: '#noithatminhquan #giuongsat #giaxuong #noithatgiareo #muanoithatonline',
  new_arrival:  '#noithatminhquan #newcollection #giuongsat #noithatmoi #noithat2026',
  promotion:    '#noithatminhquan #sale #giamgia #giuongsat #flashsale #muanhanh',
};

// ─── Main prompt builder ──────────────────────────────────────────────────────
export function buildTiktokBrandPostPrompt(config: TiktokBrandPostConfig): string {
  const { topic, videoType, hookStyle, ctaStyle, language, emojiLevel, brand } = config;

  const brandBlock = brand.shopName ? `
## Thông tin thương hiệu
- Tên: ${brand.shopName}
- Ngành: ${brand.industry || 'Nội thất'}
- Xưng hô (thương hiệu → khách): ${brand.brandPronouns || 'mình'} → ${brand.brandAudience || 'bạn'}
- Sản phẩm chính: ${brand.mainProducts || ''}
- CTA chuẩn: ${brand.ctaStandard || ''}
- Giọng văn: ${brand.brandToneNotes || ''}
${brand.brandForbidden ? `- Từ/cụm CẤM dùng: ${brand.brandForbidden}` : ''}
${brand.phone ? `- Hotline: ${brand.phone}` : ''}
` : '';

  const emojiInstruction = EMOJI_INSTRUCTIONS[emojiLevel];

  return `Bạn là chuyên gia viết TikTok content cho thương hiệu nội thất Việt Nam.
${brandBlock}
## Ngữ cảnh video
${VIDEO_TYPE_CONTEXT[videoType]}
Hook approach: ${HOOK_INSTRUCTIONS[hookStyle]}

## Mô tả video / ý tưởng chính
${topic}

## Yêu cầu output
- Ngôn ngữ: ${language}
- Xưng hô: "${brand.brandPronouns || 'mình'}" → "${brand.brandAudience || 'bạn'}" (KHÔNG dùng "chúng tôi" / "quý khách" trên TikTok)
- Emoji: ${emojiInstruction}
- CTA cuối CAPTION: ${CTA_INSTRUCTIONS[ctaStyle]}

## Từ CẤM trong mọi phần
quan trọng, hiệu quả, tuy nhiên, bên cạnh đó, vô cùng, cực kỳ,
tuyệt vời, siêu phẩm, số 1, đẳng cấp, hoàn hảo, "không chỉ ... mà còn"
${brand.brandForbidden ? `Từ cấm riêng thương hiệu: ${brand.brandForbidden}` : ''}

## FORMAT OUTPUT BẮT BUỘC (3 phần — giữ nguyên markers)

TITLE:
[1 dòng, tối đa 50 ký tự, hook mạnh theo style "${hookStyle}" — KHÔNG emoji]

CAPTION:
[100–200 từ, plain text, KHÔNG có hashtag trong phần này.
Cấu trúc: Hook (1–2 câu scroll-stop) → Body (3–5 câu USP thực tế) → CTA (1 câu)]

HASHTAGS:
[5–10 hashtag liên quan, tham khảo: ${HASHTAG_CONTEXT[videoType]}
Thêm #tphcm hoặc #hcm nếu nội dung có liên quan giao hàng địa phương]

## Quy tắc chung
- KHÔNG thêm text ngoài 3 phần trên
- KHÔNG dùng markdown (**, *, #header)
- KHÔNG dùng hashtag trong CAPTION — hashtag chỉ ở phần HASHTAGS
- TITLE không có emoji và không quá 50 ký tự
- CAPTION xuống dòng tự nhiên như TikTok caption thật
`.trim();
}
```

---

## 6. State & sessionStorage

```typescript
// sessionStorage keys: LS_KEY_CONFIG = 'vtk_config', LS_KEY_BRAND = 'vtk_brand_info'

// Config state
const [topic,      setTopic]      = useState('');
const [videoType,  setVideoType]  = useState<VideoType>('product_demo');
const [hookStyle,  setHookStyle]  = useState<HookStyle>('number');
const [ctaStyle,   setCtaStyle]   = useState<TikTokCTA>('inbox');
const [language,   setLanguage]   = useState('Vietnamese');
const [emojiLevel, setEmojiLevel] = useState<EmojiLevel>('medium');
const [modelId,    setModelId]    = useState('');
const [brand,      setBrand]      = useState<BrandSectionState>(defaultBrand);

// Output state — 3 phần riêng (theo cấu trúc TikTok thật)
const [title,      setTitle]      = useState('');       // ≤ 50 ký tự
const [caption,    setCaption]    = useState('');       // caption body
const [hashtags,   setHashtags]   = useState<string[]>([]); // ['#tag1', ...]
const [rawStream,  setRawStream]  = useState('');       // hiện khi đang stream
const [parsed,     setParsed]     = useState(false);    // true sau khi nhận 'parsed' event
const [wordCount,  setWordCount]  = useState(0);
const [charCount,  setCharCount]  = useState(0);
const [loading,    setLoading]    = useState(false);
const [error,      setError]      = useState('');
const [savedId,    setSavedId]    = useState<string | null>(null);
const [saving,     setSaving]     = useState(false);

// SSE handler
// if event.type === 'chunk'  → setRawStream(prev + text)
// if event.type === 'parsed' → setTitle/setCaption/setHashtags; setParsed(true); setRawStream('')
// if event.type === 'done'   → setWordCount/setCharCount
// Reset khi generate mới: setRawStream(''); setParsed(false); setTitle(''); setCaption(''); setHashtags([]);

// Persist
useEffect(() => {
  sessionStorage.setItem(LS_KEY_CONFIG, JSON.stringify({
    topic, videoType, hookStyle, ctaStyle, language, emojiLevel,
  }));
}, [topic, videoType, hookStyle, ctaStyle, language, emojiLevel]);
```

---

## 7. Layout UI

```
┌──────────────────────────────────────────────────────────────────────┐
│  Tab: [🎬 Viết bài TikTok] [📋 Lịch sử caption đã lưu →]            │
├───────────────────┬──────────────────────────────────────────────────┤
│  FORM (w-80)      │  OUTPUT PANEL (right column)                     │
│                   │                                                  │
│  Mô tả video *    │  [TikTok Preview Card — dark mode]               │
│  [textarea r=5]   │  ┌────────────────────────────────────────────┐  │
│  placeholder:     │  │  [Video area — dark bg #111]               │  │
│  "Mô tả ngắn về   │  │    [video type icon + label]               │  │
│  video bạn đang   │  │                              ❤️ 1.2K        │  │
│  quay..."         │  │                              💬 48          │  │
│                   │  │                              ↗️ 89          │  │
│  Loại video       │  │                              🔖             │  │
│  [5 chips 2 hàng] │  │────────────────────────────────────────────│  │
│                   │  │  [MQ] @noithatminhquan           [Tạo lại] │  │
│  Kiểu Hook        │  │                                            │  │
│  [5 chips 2 hàng] │  │  [Title bold — hook ngắn ≤50 ký tự]       │  │
│  (2 cái badge Hot)│  │  Caption line 1...                         │  │
│                   │  │  ... more                                  │  │
│  Kiểu CTA         │  │  #noithatminhquan #giuongsat #giaxuong     │  │
│  [4 chips]        │  │                    145 từ [💾 Lưu]         │  │
│                   │  └────────────────────────────────────────────┘  │
│  Ngôn ngữ         │                                                  │
│  [dropdown]       │  ┌─ ① Tiêu đề (≤ 50 ký tự) ──────── [Copy] ──┐  │
│                   │  │  250kg không gãy — giá chỉ 1.2 triệu       │  │
│  Emoji Level      │  │                                      32/50  │  │
│  [4 chips]        │  └─────────────────────────────────────────────┘  │
│                   │                                                  │
│  [Khối 6]         │  ┌─ ② Mô tả / Caption ─────────── [Copy] ─────┐  │
│  ModelPicker      │  │  Mình test thử cái giường sắt 990k này...   │  │
│                   │  │  ...                                         │  │
│  [Khối 7]         │  │                             145 từ · 820 ký  │  │
│  BrandSection     │  │                 [⚠ dài hơn 2 dòng FYP]      │  │
│  (collapsed)      │  └─────────────────────────────────────────────┘  │
│                   │                                                  │
│  [🎬 Tạo Caption] │  ┌─ ③ Hashtag ────────────── [Copy tất cả] ───┐  │
│                   │  │  #noithatminhquan  #giuongsat  #giaxuong     │  │
│                   │  │  #noithatphongngu  #giuongsatgiareo          │  │
│                   │  │  ⚠ Dán hashtag vào cuối Mô tả trong TikTok  │  │
│                   │  └─────────────────────────────────────────────┘  │
└───────────────────┴──────────────────────────────────────────────────┘
```

### Lưu ý UI quan trọng

- **Chips layout**: VIDEO_TYPES (2 hàng × 2-3), HOOK_STYLES (2 hàng), CTA_STYLES (2×2)
- **Badge "Hot"**: hookStyle `pov` và `challenge` có badge "Hot" (như POST_STYLES trong Facebook)
- **Tooltip hover**: HOOK_STYLES hiện `example` khi hover chip
- **BrandSection**: collapsed mặc định, badge "Đã cấu hình" khi có data
- **TikTok preview**: dark bg `#111111`, không phải `bg-gray-900` để đúng màu TikTok
- **3 output boxes**: luôn render dưới preview card; ẩn khi chưa có output; loading state = spinner ở box ② (raw stream), box ① và ③ grayed out
- **Hashtag note**: box ③ có dòng chú thích amber — nhắc user dán vào TikTok app qua nút `#`

---

## 8. TikTok Preview Card — chi tiết

State mới cần thêm (ngoài section 6):

```typescript
const [showFull,     setShowFull]     = useState(false);
const [copiedTitle,  setCopiedTitle]  = useState(false);
const [copiedCaption,setCopiedCaption]= useState(false);
const [copiedHashtag,setCopiedHashtag]= useState(false);

function copyText(text: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(text);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
}
```

```tsx
{/* TikTok preview card */}
<div className="max-w-sm mx-auto select-none">

  {/* Video area */}
  <div className="bg-[#111] rounded-t-2xl relative overflow-hidden"
       style={{ aspectRatio: '9/16', maxHeight: '280px' }}>

    {/* Video placeholder */}
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-4xl mb-2">
        {VIDEO_TYPES.find(v => v.value === videoType)?.icon}
      </span>
      <span className="text-xs text-gray-500">
        {VIDEO_TYPES.find(v => v.value === videoType)?.label}
      </span>
    </div>

    {/* Right sidebar actions (TikTok-style) */}
    <div className="absolute right-3 bottom-8 flex flex-col items-center gap-4 text-white">
      {[
        { icon: '❤️', count: '1.2K' },
        { icon: '💬', count: '48'   },
        { icon: '↗️', count: '89'   },
        { icon: '🔖', count: ''     },
      ].map(({ icon, count }) => (
        <div key={icon} className="flex flex-col items-center gap-0.5">
          <span className="text-xl drop-shadow">{icon}</span>
          {count && <span className="text-[10px] text-gray-300">{count}</span>}
        </div>
      ))}
    </div>
  </div>

  {/* Caption area */}
  <div className="bg-[#111] rounded-b-2xl px-4 py-3 border-t border-gray-800">

    {/* Username row */}
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center
                        text-white text-[10px] font-bold flex-shrink-0">
          {brand.shopName ? brand.shopName.slice(0, 2).toUpperCase() : 'MQ'}
        </div>
        <span className="text-xs text-gray-300 font-semibold">
          @{brand.shopName
            ? brand.shopName.toLowerCase().replace(/\s+/g, '').slice(0, 20)
            : 'noithatminhquan'}
        </span>
      </div>
      {parsed && !loading && (
        <button onClick={() => void handleGenerate()}
          className="text-[10px] text-gray-400 hover:text-gray-200 transition-colors px-2">
          🔄 Tạo lại
        </button>
      )}
    </div>

    {/* Streaming state: raw text + cursor blink */}
    {loading && !parsed && (
      <div className="text-xs text-gray-400 leading-relaxed">
        <p className="whitespace-pre-wrap opacity-70 line-clamp-3">
          {rawStream || 'AI đang viết...'}
        </p>
        <span className="inline-block w-1.5 h-3 bg-white ml-0.5 animate-pulse rounded-sm" />
      </div>
    )}

    {/* Parsed state: title + caption + hashtags */}
    {!loading && parsed && (
      <>
        {/* Title — bold, trắng */}
        {title && (
          <p className="text-xs text-white font-semibold leading-snug mb-1.5">{title}</p>
        )}

        {/* Caption — 2 dòng → expand */}
        <div className="text-xs text-gray-200 leading-relaxed mb-2">
          {showFull ? (
            <p className="whitespace-pre-wrap">{caption}</p>
          ) : (
            <>
              <p className="line-clamp-2 whitespace-pre-wrap">{caption}</p>
              <button onClick={() => setShowFull(true)}
                className="text-gray-500 text-[10px] mt-0.5 hover:text-gray-300">
                ... more
              </button>
            </>
          )}
        </div>

        {/* Hashtags — màu TikTok cyan */}
        {hashtags.length > 0 && (
          <p className="text-xs text-[#69C9D0] leading-relaxed break-all">
            {hashtags.join(' ')}
          </p>
        )}
      </>
    )}

    {!loading && !parsed && !rawStream && (
      <div className="text-xs text-gray-600">Caption sẽ hiện ở đây...</div>
    )}

    {/* Footer: stats + save */}
    {!loading && parsed && (
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800">
        <div>
          <span className="text-[10px] text-gray-500">
            {wordCount} từ · {charCount} ký tự
          </span>
          {charCount > TIKTOK_CHAR_WARNING && (
            <span className="text-[10px] text-amber-400 ml-1">
              ⚠ dài hơn 2 dòng FYP
            </span>
          )}
        </div>
        <button onClick={handleSave} disabled={saving || !!savedId}
          className={`px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-all ${
            savedId
              ? 'border-green-500 bg-green-500/20 text-green-400'
              : 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50'
          }`}>
          {savedId ? '✓ Đã lưu' : saving ? '...' : '💾 Lưu'}
        </button>
      </div>
    )}
  </div>
</div>
```

---

## 8b. 3 Output Boxes — bên dưới preview card

```tsx
{parsed && (
  <div className="space-y-3 mt-4">

    {/* Box ① Tiêu đề */}
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-500">① Tiêu đề TikTok</span>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] ${title.length > 45 ? 'text-amber-500' : 'text-gray-400'}`}>
            {title.length}/50
          </span>
          <button
            onClick={() => copyText(title, setCopiedTitle)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
              copiedTitle
                ? 'border-green-500 text-green-600'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}>
            {copiedTitle ? '✓ Đã copy' : 'Copy'}
          </button>
        </div>
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
    </div>

    {/* Box ② Mô tả / Caption */}
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-500">② Mô tả / Caption</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">{wordCount} từ</span>
          <button
            onClick={() => copyText(caption, setCopiedCaption)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
              copiedCaption
                ? 'border-green-500 text-green-600'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}>
            {copiedCaption ? '✓ Đã copy' : 'Copy'}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
        {caption}
      </p>
      {charCount > TIKTOK_CHAR_WARNING && (
        <p className="text-[10px] text-amber-500 mt-1">⚠ Dài hơn 2 dòng FYP</p>
      )}
    </div>

    {/* Box ③ Hashtag */}
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-500">③ Hashtag</span>
        <button
          onClick={() => copyText(hashtags.join(' '), setCopiedHashtag)}
          className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
            copiedHashtag
              ? 'border-green-500 text-green-600'
              : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}>
          {copiedHashtag ? '✓ Đã copy' : 'Copy tất cả'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {hashtags.map(tag => (
          <span key={tag}
            className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400
                       px-2 py-0.5 rounded-full">
            {tag}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-amber-600 dark:text-amber-400">
        ⚠ Dán hashtag vào cuối phần Mô tả trong app TikTok (qua nút #)
      </p>
    </div>

  </div>
)}
```

---

## 9. API Routes

### `POST /api/viet-bai-tiktok/generate/route.ts`

```typescript
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildTiktokBrandPostPrompt } from '@/lib/viet-bai-tiktok/prompt-builder';
import { parseTiktokOutput } from '@/lib/tiktok-post/parser';  // reuse từ Nhóm B
import type { TiktokBrandPostConfig, TiktokPostSSEEvent } from '@/lib/viet-bai-tiktok/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  const body: TiktokBrandPostConfig = await request.json();

  if (!body.topic?.trim()) {
    return Response.json({ type: 'error', message: 'Thiếu mô tả video / chủ đề' }, { status: 400 });
  }

  const prompt = buildTiktokBrandPostPrompt(body);
  const model  = buildTinhGonModel(body.modelId || 'gemini-flash');

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: TiktokPostSSEEvent) =>
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        let fullText = '';
        try {
          // Stream raw text cho UX real-time
          const aiStream = await model.generateContentStream(prompt);
          for await (const chunk of aiStream) {
            const text = chunk.text();
            if (!text) continue;
            fullText += text;
            send({ type: 'chunk', text });
          }
        } catch {
          const result = await model.generateContent(prompt);
          fullText = result.response.text();
          send({ type: 'chunk', text: fullText });
        }

        // Parse thành 3 phần riêng
        const parsed = parseTiktokOutput(fullText);

        // Gửi structured output (client replace raw display)
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

### `POST /api/viet-bai-tiktok/save/route.ts`

```typescript
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = await request.json();
  const post = await prisma.tiktokPost.create({
    data: {
      topic:          body.topic,
      videoType:      body.videoType     ?? 'product_demo',
      hookStyle:      body.hookStyle     ?? 'number',
      ctaStyle:       body.ctaStyle      ?? 'inbox',
      title:          body.title         || null,           // ← MỚI
      content:        body.content,                        // caption body
      hashtags:       Array.isArray(body.hashtags)         // ← MỚI
                        ? body.hashtags.join(' ')
                        : (body.hashtags || null),
      language:       body.language      ?? 'Vietnamese',
      emojiLevel:     body.emojiLevel    ?? 'medium',
      wordCount:      body.wordCount     ?? null,
      charCount:      body.charCount     ?? null,
      brandProfileId: body.brandProfileId || null,
      brandName:      body.brandName     || null,
      modelId:        body.modelId       || null,
    },
  });
  return Response.json({ id: post.id });
}
```

### `GET|PUT|DELETE /api/viet-bai-tiktok/[id]/route.ts`

```typescript
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const post = await prisma.tiktokPost.findUnique({ where: { id: params.id } });
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(post);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { content } = await request.json();
  const post = await prisma.tiktokPost.update({ where: { id: params.id }, data: { content } });
  return Response.json(post);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.tiktokPost.delete({ where: { id: params.id } });
  return Response.json({ success: true });
}
```

### `GET /api/viet-bai-tiktok?page=1&limit=20&videoType=…&q=…`

```typescript
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page      = parseInt(searchParams.get('page')  ?? '1');
  const limit     = parseInt(searchParams.get('limit') ?? '20');
  const videoType = searchParams.get('videoType') ?? undefined;
  const hookStyle = searchParams.get('hookStyle') ?? undefined;
  const q         = searchParams.get('q') ?? undefined;

  const where = {
    ...(videoType ? { videoType } : {}),
    ...(hookStyle ? { hookStyle } : {}),
    ...(q ? {
      OR: [
        { topic:   { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ],
    } : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.tiktokPost.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
      select: {
        id: true, topic: true, title: true, content: true, hashtags: true,
        videoType: true, hookStyle: true, ctaStyle: true, emojiLevel: true,
        wordCount: true, charCount: true, brandName: true, createdAt: true,
      },
    }),
    prisma.tiktokPost.count({ where }),
  ]);

  return Response.json({ posts, total, page, limit });
}
```

---

## 10. Management Page — `/quan-ly-bai-tiktok`

```
┌────────────────────────────────────────────────────────────────┐
│  [← Viết caption mới]  Caption TikTok đã lưu       [X caption]│
├────────────────────────────────────────────────────────────────┤
│  Filter: [Tất cả ▾] [Demo SP ▾] [Số liệu ▾]  [🔍 Tìm...]     │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [📦 Demo] [🔢 Số liệu]  Minh Quân · 25/05/26            │  │
│  │ 250kg không gãy — giá chỉ 1.2 triệu  ← title (bold)    │  │
│  │ Mình test thử và đây là kết quả... ← caption preview    │  │
│  │ #noithatminhquan #giuongsat #giaxuong                    │  │
│  │ 145 từ · 820 ký tự                                       │  │
│  │ [📋 Copy caption] [# Copy hashtag] [🔄 Dùng lại] [🗑️]   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

**Features cần có** (giống `/quan-ly-bai-facebook`):
- Load list via `GET /api/viet-bai-tiktok?page=1&limit=20`
- Filter: videoType + hookStyle + search text
- Card hiển thị `title` (bold) ở đầu nếu có; caption preview 2 dòng; hashtags dạng text nhỏ
- "Copy caption" → copy `content` vào clipboard
- "Copy hashtag" → copy `hashtags` (space-separated string từ DB) vào clipboard; nút ẩn nếu hashtags null
- "Dùng lại" → sessionStorage: `{ topic: post.topic, videoType: post.videoType, hookStyle: post.hookStyle }` → `router.push('/viet-bai-tiktok')`
- Xóa với confirm dialog
- Load more (infinite scroll)

---

## 11. Sidebar — `web/components/Sidebar.tsx`

```typescript
{
  label: 'Social',
  items: [
    { href: '/viet-bai-tiktok',    icon: '🎬', label: 'Viết bài TikTok'      },
    { href: '/tiktok-post',        icon: '⚡', label: 'TikTok Caption nhanh'  },
    { href: '/quan-ly-bai-tiktok', icon: '📋', label: 'Caption TikTok đã lưu'},
    { href: '/viet-bai-facebook',  icon: '📝', label: 'Viết bài Facebook'    },
    { href: '/facebook-post',      icon: '⚡', label: 'Facebook Post nhanh'  },
    { href: '/quan-ly-bai-facebook', icon: '📋', label: 'Bài Facebook đã lưu'},
    { href: '/facebook-comment',   icon: '💬', label: 'Tạo Facebook Comment' },
  ],
},
```

---

## 12. Bugs & Edge Cases

| # | Bug | Xử lý |
|---|-----|-------|
| 1 | AI trả markdown trong caption | Reset signal pattern (empty chunk → send cleaned) |
| 2 | Caption > 200 từ | Thêm "TUYỆT ĐỐI không vượt 200 từ" all-caps vào prompt |
| 3 | Hook không đúng format POV | Thêm "PHẢI bắt đầu chính xác bằng 'POV:'" vào instruction |
| 4 | Có hashtag trong CAPTION body | Thêm "KHÔNG dùng hashtag (#) trong CAPTION" all-caps vào quy tắc |
| 5 | Brand chưa chọn → brandName rỗng | Fallback avatar "MQ" và username "@noithatminhquan" |
| 6 | "Lưu" click 2 lần | `disabled={saving \|\| !!savedId}` |
| 7 | charCount > 1500 | Warning amber trong preview card và box ② |
| 8 | username quá dài | `brand.shopName.toLowerCase().replace(/\s+/g, '').slice(0, 20)` |
| 9 | Preview collapse sau generate mới | Reset `setShowFull(false)` khi bắt đầu generate mới |
| 10 | Phone trong brand chưa set + ctaStyle = phone | Placeholder `{SĐT}` trong output — user thay thủ công |
| 11 | AI không follow FORMAT markers (không có TITLE:/CAPTION:/HASHTAGS:) | Dùng `parseTiktokOutputWithFallback()` — line 1 → title, tất cả `#tag` → hashtags, phần còn lại → caption |
| 12 | Title > 50 ký tự | Parser auto `slice(0, 50)` — không báo lỗi, nhưng box ① hiện counter đỏ |
| 13 | AI không generate đủ 5 hashtag | Không block — client render bao nhiêu tag có bấy nhiêu; không inject thêm |
| 14 | "Dùng lại" ở management → thiếu title/hashtag | "Dùng lại" chỉ restore form config (topic, videoType, hookStyle) → generate lại; không cần restore output cũ |

---

## 13. Thứ tự cài đặt

| Bước | File | Ghi chú |
|------|------|---------|
| 1 | Prisma migration | Thêm model TiktokPost + `npx prisma migrate dev` |
| 2 | `lib/viet-bai-tiktok/types.ts` | Enums + interfaces |
| 3 | `lib/viet-bai-tiktok/options.ts` | Constants + examples |
| 4 | `lib/viet-bai-tiktok/prompt-builder.ts` | buildTiktokBrandPostPrompt |
| 5 | `api/viet-bai-tiktok/generate/route.ts` | Test Postman: 3 hookStyles × 2 videoTypes |
| 6 | `api/viet-bai-tiktok/save/route.ts` | Test lưu vào DB |
| 7 | `api/viet-bai-tiktok/[id]/route.ts` | GET/PUT/DELETE |
| 8 | `api/viet-bai-tiktok/route.ts` | GET all với filter |
| 9 | `app/viet-bai-tiktok/page.tsx` | UI full — test dark preview |
| 10 | `app/quan-ly-bai-tiktok/page.tsx` | Management page |
| 11 | Sidebar update | Thêm Social section đầy đủ |
| 12 | Verify output quality | 5 video types × 5 hook styles — check từ cấm, hook format, độ dài |

---

## 14. QA Checklist

### Form & Config
- [ ] Textarea nhận mô tả video, paste, emoji
- [ ] Placeholder thay đổi theo `videoType` (từ `TOPIC_EXAMPLES`)
- [ ] 5 video type chips — highlight đúng
- [ ] 5 hook style chips — badge "Hot" ở `pov` + `challenge`
- [ ] Hover hook chip → tooltip hiện `example`
- [ ] 4 CTA chips — highlight đúng
- [ ] 4 emoji level chips — default "Vừa"
- [ ] ModelPicker load từ DB, auto-select default
- [ ] BrandSection collapsed mặc định, badge khi có data
- [ ] Persist config qua F5 (`vtk_config`)
- [ ] `vtk_brand_info` persist qua F5

### Generate & Stream
- [ ] Thiếu topic → error "Thiếu mô tả video / chủ đề"
- [ ] Thiếu model → error "Vui lòng chọn AI Model"
- [ ] Stream real-time, cursor blink trong preview card
- [ ] Abort khi bấm Tạo lại đang stream → không double request
- [ ] Markdown bị strip (reset signal pattern)
- [ ] `setShowFull(false)` reset khi generate mới

### TikTok Preview Card
- [ ] Dark background `#111` render đúng
- [ ] Avatar 2 ký tự từ `brand.shopName` (fallback "MQ")
- [ ] Username từ shopName lowercase, slice 20 (fallback "@noithatminhquan")
- [ ] Khi đang stream: hiện rawStream mờ (opacity-70) + cursor blink; box ① và ③ ẩn
- [ ] Sau khi nhận 'parsed' event: title hiện bold trắng ở đầu, caption 2 dòng + "more", hashtags cyan
- [ ] Bấm "... more" → expand full caption
- [ ] `charCount > 1500` → warning amber "⚠ dài hơn 2 dòng FYP"
- [ ] Video type icon thay đổi theo selection
- [ ] Fake reactions (❤️ 1.2K, 💬 48, ↗️ 89, 🔖) hiện ở sidebar phải
- [ ] Nút "Tạo lại" chỉ hiện khi `parsed && !loading`

### 3 Output Boxes
- [ ] Box ① Tiêu đề: hiện title, counter `{n}/50`, đỏ/amber khi > 45 ký tự
- [ ] Box ① Copy button: copy title vào clipboard
- [ ] Box ② Mô tả: hiện caption body, `{wordCount} từ`, warning nếu > 1500 ký tự
- [ ] Box ② Copy button: copy caption vào clipboard
- [ ] Box ③ Hashtag: hiện chips từng tag, note amber dán vào TikTok
- [ ] Box ③ "Copy tất cả": copy hashtags.join(' ') vào clipboard
- [ ] Copy feedback: nút đổi "✓ Đã copy" trong 2 giây rồi reset
- [ ] 3 box ẩn hoàn toàn khi `parsed === false`

### Output Quality
- [ ] hookStyle = `pov` → TITLE bắt đầu chính xác "POV:"
- [ ] hookStyle = `number` → TITLE có con số cụ thể
- [ ] hookStyle = `challenge` → TITLE dạng cảnh báo / pattern-interrupt
- [ ] TITLE ≤ 50 ký tự (test 10 lần generate)
- [ ] TITLE KHÔNG có emoji
- [ ] videoType = `price_reveal` → TITLE hoặc CAPTION câu đầu có giá
- [ ] videoType = `promotion` → CAPTION có urgency (thời hạn / số lượng)
- [ ] ctaStyle = `comment_key` → CAPTION có "Comment '[KEYWORD]'"
- [ ] CAPTION body KHÔNG có hashtag (#) — test 5 lần generate
- [ ] HASHTAGS section có 5–10 tags, mỗi tag bắt đầu bằng `#`
- [ ] KHÔNG có từ cấm trong TITLE hoặc CAPTION
- [ ] Word count CAPTION 100–200 từ (test 5 lần generate)
- [ ] Brand inject → CAPTION có tên thương hiệu / giọng văn đúng

### Save & Management
- [ ] "Lưu" → POST save (gửi title + content + hashtags) → nút đổi "✓ Đã lưu"
- [ ] Không click 2 lần (disabled khi savedId có)
- [ ] `/quan-ly-bai-tiktok` load list đúng (mới nhất trước)
- [ ] Card hiển thị: title bold (nếu có) → caption preview 2 dòng → hashtags text nhỏ
- [ ] Filter videoType + hookStyle + search hoạt động
- [ ] "Copy caption" từ card → clipboard
- [ ] "Copy hashtag" từ card → clipboard; nút ẩn nếu hashtags null
- [ ] "Dùng lại" → sessionStorage topic + videoType + hookStyle → redirect `/viet-bai-tiktok`
- [ ] Xóa → confirm → xóa → list refresh
- [ ] Tab nav active đúng trang
