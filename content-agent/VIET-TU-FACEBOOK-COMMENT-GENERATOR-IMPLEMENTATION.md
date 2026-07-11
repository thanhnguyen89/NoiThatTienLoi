# VIET-TU-FACEBOOK-COMMENT-GENERATOR-IMPLEMENTATION.md
## Hướng dẫn code tính năng "Viết Comment Facebook Thương Hiệu"

> Phân tích từ: https://aiktp.com/vi/facebook-post-comments-generator  
> Code tham khảo: `FACEBOOK-COMMENT-GENERATOR-IMPLEMENTATION.md` (`/facebook-comment` — stateless)  
> Route mới: `/viet-tu-facebook-comment`  
> Stack: Next.js 14 App Router · TypeScript · Tailwind · Prisma (PostgreSQL) · Gemini API

---

## ⚠️ Điểm khác biệt: aiktp vs `/facebook-comment` (stateless) vs file này (brand-aware)

| # | Điểm | aiktp.com | `/facebook-comment` (stateless) | `/viet-tu-facebook-comment` (file này) |
|---|------|-----------|--------------------------------|----------------------------------------|
| 1 | **Transport** | WebSocket | SSE | SSE |
| 2 | **Brand profile** | Không | Không | **Có — 10 fields inject vào prompt** |
| 3 | **DB lưu comment** | Không | Không | **Có — FacebookCommentBrand model** |
| 4 | **Quản lý kết quả** | Không | Không | **Có — `/quan-ly-facebook-comment`** |
| 5 | **Styles** | 6 | 6 | **9 (thêm 3 style phù hợp nội thất)** |
| 6 | **Liên kết bài post** | Không | Không | **Có — chọn bài từ /quan-ly-bai-facebook** |
| 7 | **Mục đích comment** | Tổng quát | Tổng quát | **Comment cho bài của chính thương hiệu** |
| 8 | **Auth** | Không | Không | **Có — cần login** |
| 9 | **Model picker** | Không | Hardcode flash | **Có — ModelPicker component** |
| 10 | **Ngôn ngữ** | 70+ | 15 | **15 (Vietnamese mặc định)** |
| 11 | **Batch size** | N/A | 10 | **10 (giữ nguyên)** |
| 12 | **Input source** | Paste thủ công | Paste thủ công | **Paste thủ công HOẶC chọn bài đã lưu** |

---

## 0. So sánh chi tiết aiktp.com

### Phân tích trang https://aiktp.com/vi/facebook-post-comments-generator

**UI aiktp:**
- Textarea lớn: dán nội dung bài post
- Dropdown ngôn ngữ (70+ options)
- 6 style buttons: Funny / Rút ngắn / Creative / Friendly / Casual / Professional
- Count slider 1–50
- Button "Generator" → WebSocket stream
- Output: numbered list text (không phải cards riêng)

**Khác biệt cần ghi nhớ khi implement:**

```
aiktp dùng WebSocket vì họ stream từng comment một theo realtime.
Ta dùng SSE + batch (giống /facebook-comment) vì đơn giản hơn, consistent với stack.

aiktp không có brand context → comments generic.
File này inject brand block → comments phù hợp giọng văn Nội Thất Minh Quân:
  "Ồ mình cũng đang tìm giường sắt, cảm ơn shop nhé!"
  vs
  "Wow quá đẹp!" (generic)
```

---

## 1. Tổng quan kiến trúc

### Mục đích của tool này

Tool giúp team social/admin tạo **comment mồi** (seed comments) cho các bài post Facebook của thương hiệu Nội Thất Minh Quân. Comments phải:
- Tự nhiên, nghe như khách hàng thật bình luận
- Phù hợp với sản phẩm nội thất (giường, tủ, bàn ghế)
- Đa dạng góc nhìn (hỏi thêm, khen, tag bạn bè, chia sẻ trải nghiệm...)
- Tránh quá "quảng cáo" hoặc bot-sounding

### So sánh 3 tool comment/post trong hệ thống

| | `/facebook-comment` | `/facebook-post` | `/viet-tu-facebook-comment` |
|---|---|---|---|
| Loại | Stateless tool | Stateless tool | Brand-aware tool |
| Auth | Không | Không | **Có** |
| DB | Không | Không | **Có** |
| Brand inject | Không | Không | **Có** |
| Quản lý | Không | Không | **Có** |
| Link bài post | Không | N/A | **Tùy chọn** |

### Flow hoạt động

```
User vào /viet-tu-facebook-comment
     ↓
[Optional] Chọn bài post đã lưu trong DB  ←→  Hoặc paste thủ công
     ↓
Cấu hình: Style + Ngôn ngữ + Số lượng + Model
     ↓ click "Tạo comment"
     POST /api/viet-tu-facebook-comment/generate (SSE)
     → Validate + word count check
     → Load brand profile từ DB
     → Build prompt với brandBlock + styleInstruction
     → Batch AI calls (N/10 batches)
     → Parse → stream type:'batch' về FE
     → FE render comment cards realtime
     ↓
[Done] Hiện nút "Lưu tất cả" + từng card có "Lưu riêng"
     ↓
POST /api/viet-tu-facebook-comment/save
→ Lưu vào FacebookCommentBrand (Prisma)
→ Redirect hoặc toast "Đã lưu X comment"
```

### Cấu trúc file cần tạo

```
web/
├── app/
│   ├── viet-tu-facebook-comment/
│   │   └── page.tsx                          ← Tool 2 cột, brand-aware
│   ├── quan-ly-facebook-comment/
│   │   └── page.tsx                          ← Quản lý comments đã lưu
│   └── api/
│       └── viet-tu-facebook-comment/
│           ├── generate/
│           │   └── route.ts                  ← SSE generator (batch + brand)
│           ├── save/
│           │   └── route.ts                  ← POST lưu comment(s)
│           └── [id]/
│               └── route.ts                  ← GET/DELETE
└── lib/
    └── viet-tu-facebook-comment/
        ├── types.ts                          ← Types mới (extends /facebook-comment)
        ├── options.ts                        ← 9 styles, constants
        └── prompt-builder.ts                 ← buildCommentBrandPrompt()

prisma/schema.prisma                          ← Thêm FacebookCommentBrand model
```

### File tái sử dụng (KHÔNG tạo mới)

| File | Dùng để |
|------|---------|
| `lib/tinh-gon/model.ts` | `buildTinhGonModel(modelId)` |
| `lib/facebook-comment/parser.ts` | `parseCommentList()` — giữ nguyên |
| `lib/facebook-comment/options.ts` | `BATCH_SIZE`, `FREE_USER_MAX_WORDS`, `COMMENT_LANGUAGES` |
| `components/ModelPicker.tsx` | Chọn AI model |
| `components/BrandSection.tsx` | Load brand profile (10 fields) |

---

## 2. Prisma Schema — `prisma/schema.prisma`

```prisma
model FacebookCommentBrand {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Nội dung bài post gốc
  postContent String   @db.Text

  // Link bài post đã lưu (optional)
  facebookPostId String?
  facebookPost   FacebookPost? @relation(fields: [facebookPostId], references: [id])

  // Cấu hình generate
  style      String   @default("friendly")   // CommentBrandStyle
  language   String   @default("Vietnamese")
  count      Int      @default(5)
  modelId    String   @default("gemini-flash")

  // Kết quả
  comments   String[] // Mảng comment texts

  // Brand context tại thời điểm generate
  brandSnapshot Json?  // Snapshot của brand profile khi generate

  // Metadata
  userId     String?
  notes      String?  // Ghi chú nội bộ

  @@index([createdAt])
  @@index([facebookPostId])
}
```

**Migration:**

```bash
npx prisma migrate dev --name add-facebook-comment-brand
```

**Relation ngược trong FacebookPost:**

```prisma
model FacebookPost {
  // ... các field đã có ...
  commentBrands  FacebookCommentBrand[]
}
```

---

## 3. Types — `web/lib/viet-tu-facebook-comment/types.ts`

```typescript
// Extend từ /facebook-comment — thêm styles dành riêng cho nội thất
export type CommentBrandStyle =
  // --- Giữ nguyên 6 từ /facebook-comment ---
  | 'funny'         // Vui vẻ, hài hước nhẹ nhàng
  | 'shorten'       // Rút ngắn — comment ngắn gọn
  | 'creative'      // Sáng tạo, góc nhìn mới lạ
  | 'friendly'      // Thân thiện, ủng hộ
  | 'casual'        // Thân mật, thoải mái
  | 'professional'  // Chuyên nghiệp, nhận xét sâu sắc
  // --- Thêm 3 style mới cho nội thất ---
  | 'curious'       // Tò mò, hỏi thêm thông tin sản phẩm
  | 'experience'    // Chia sẻ trải nghiệm mua hàng thật
  | 'tag_friend';   // Tag bạn bè để giới thiệu sản phẩm

export type CommentCount = 1|2|3|4|5|6|7|8|9|10|20|30|40|50;

export interface CommentBrandConfig {
  postContent:    string;          // Nội dung bài post Facebook
  facebookPostId: string | null;   // Từ /quan-ly-bai-facebook (optional)
  language:       string;
  style:          CommentBrandStyle;
  count:          CommentCount;
  modelId:        string;
}

// SSE events — kế thừa từ /facebook-comment
export interface CommentBrandBatchEvent {
  type:       'batch';
  comments:   string[];
  batchIndex: number;
  totalBatch: number;
}

export interface CommentBrandDoneEvent {
  type:  'done';
  total: number;
}

export interface CommentBrandErrorEvent {
  type:    'error';
  message: string;
}

export type CommentBrandSSEEvent =
  | CommentBrandBatchEvent
  | CommentBrandDoneEvent
  | CommentBrandErrorEvent;

// State card trong UI
export interface CommentBrandCard {
  id:      string;
  text:    string;
  copied:  boolean;
  saved:   boolean;   // Đã lưu riêng vào DB chưa
}

// Response từ /api/viet-tu-facebook-comment/save
export interface SaveCommentResponse {
  id:       string;
  savedCount: number;
}

// Item trong danh sách quản lý
export interface FacebookCommentBrandItem {
  id:          string;
  createdAt:   string;
  postContent: string;   // Truncate 100 chars khi hiện list
  style:       string;
  count:       number;
  comments:    string[];
  notes:       string | null;
}
```

---

## 4. Options — `web/lib/viet-tu-facebook-comment/options.ts`

```typescript
import type { CommentBrandStyle } from './types';

export const COMMENT_BRAND_STYLES: Array<{
  value: CommentBrandStyle;
  label: string;
  emoji: string;
  note:  string;
  hot?:  boolean;
}> = [
  // --- Giữ nguyên 6 từ /facebook-comment ---
  {
    value: 'funny',
    label: 'Funny',
    emoji: '😄',
    note:  'Vui vẻ, hài hước nhẹ nhàng, có emoji',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    emoji: '🤝',
    note:  'Thân thiện, ấm áp, ủng hộ bài post',
  },
  {
    value: 'casual',
    label: 'Casual',
    emoji: '💬',
    note:  'Thân mật, thoải mái như bạn bè',
  },
  {
    value: 'professional',
    label: 'Chuyên nghiệp',
    emoji: '👔',
    note:  'Nhận xét sâu sắc, súc tích',
  },
  {
    value: 'creative',
    label: 'Sáng tạo',
    emoji: '✨',
    note:  'Góc nhìn độc đáo, không sáo rỗng',
  },
  {
    value: 'shorten',
    label: 'Siêu ngắn',
    emoji: '✂️',
    note:  'Tối đa 1–2 câu, cực ngắn',
  },
  // --- 3 style mới cho nội thất ---
  {
    value: 'curious',
    label: 'Hỏi thêm',
    emoji: '🤔',
    note:  'Khách hỏi giá, kích thước, màu sắc, còn hàng không...',
    hot:   true,
  },
  {
    value: 'experience',
    label: 'Trải nghiệm',
    emoji: '⭐',
    note:  'Chia sẻ đã mua/dùng rồi, cảm nhận thực tế',
    hot:   true,
  },
  {
    value: 'tag_friend',
    label: 'Tag bạn bè',
    emoji: '👥',
    note:  'Comment dạng "Ê @... mày cần cái này không?"',
  },
];

// sessionStorage key
export const VTFC_SESSION_KEY = 'vtfc_config';

// Từ /facebook-comment — tái sử dụng
export { BATCH_SIZE, FREE_USER_MAX_WORDS, COMMENT_LANGUAGES, COMMENT_COUNTS } from '@/lib/facebook-comment/options';
```

---

## 5. Prompt Builder — `web/lib/viet-tu-facebook-comment/prompt-builder.ts`

```typescript
import type { CommentBrandStyle } from './types';

// ─── Style instructions mở rộng (9 styles) ───────────────────────────────────

const STYLE_INSTRUCTIONS: Record<CommentBrandStyle, string> = {
  funny:
    'Vui vẻ, hài hước nhẹ nhàng. Có thể dùng emoji. Comment cảm xúc, dễ thương.',
  friendly:
    'Thân thiện, ấm áp, ủng hộ. Như comment của người bạn tốt.',
  casual:
    'Thoải mái, thân mật như nói chuyện. Có thể dùng từ lóng nhẹ.',
  professional:
    'Nhận xét sâu sắc, chuyên nghiệp. Không emoji thừa, câu cú chỉnh chu.',
  creative:
    'Sáng tạo, độc đáo, góc nhìn bất ngờ. Tránh các cụm từ thông thường.',
  shorten:
    'Cực ngắn — tối đa 1–2 câu. Súc tích, đúng điểm, không dư thừa.',
  curious:
    'Người bình luận tò mò muốn biết thêm: hỏi giá, kích thước, màu sắc, ' +
    'giao hàng, còn hàng không, bảo hành... Mỗi comment hỏi 1 vấn đề cụ thể khác nhau.',
  experience:
    'Người đã mua/dùng sản phẩm của shop chia sẻ trải nghiệm thật. ' +
    'Cụ thể: đã dùng bao lâu, thích điểm gì, giao hàng thế nào. Không chung chung.',
  tag_friend:
    'Comment dạng tag bạn bè: "Ê @...", "@... mày cần cái này không?", ' +
    '"@... cái giường này đẹp ghê, mua đi". Dùng "@..." thay cho tên thật.',
};

// ─── Brand block builder ──────────────────────────────────────────────────────

interface BrandBlock {
  shopName:        string;
  brandPronouns:   string;
  mainProducts:    string;
  brandAudience:   string;
  brandToneNotes:  string;
  brandForbidden:  string;
}

function buildBrandBlock(brand: BrandBlock): string {
  const lines: string[] = [
    `## Thông tin thương hiệu`,
    `- Tên shop: ${brand.shopName}`,
    `- Sản phẩm chính: ${brand.mainProducts}`,
    `- Khách hàng mục tiêu: ${brand.brandAudience}`,
  ];

  if (brand.brandToneNotes) {
    lines.push(`- Giọng thương hiệu: ${brand.brandToneNotes}`);
  }
  if (brand.brandForbidden) {
    lines.push(`- KHÔNG dùng từ/cụm: ${brand.brandForbidden}`);
  }

  return lines.join('\n');
}

// ─── Main prompt builder ──────────────────────────────────────────────────────

export interface BuildCommentBrandPromptInput {
  postContent: string;
  count:       number;
  style:       CommentBrandStyle;
  language:    string;
  brand:       BrandBlock;
}

export function buildCommentBrandPrompt(input: BuildCommentBrandPromptInput): string {
  const { postContent, count, style, language, brand } = input;
  const styleInstruction = STYLE_INSTRUCTIONS[style];

  return `
Bạn là AI tạo comment Facebook tự nhiên cho một thương hiệu nội thất.

${buildBrandBlock(brand)}

## Bài post Facebook của shop cần tạo comment:
${postContent}

## Yêu cầu tạo comment:
- Tạo đúng ${count} comment KHÁC NHAU.
- Ngôn ngữ: ${language}
- Phong cách: ${styleInstruction}
- Comment phải tự nhiên như người dùng Facebook thật bình luận.
- Phù hợp với sản phẩm nội thất (giường, tủ, bàn ghế).
- Mỗi comment có cảm xúc/góc nhìn KHÁC NHAU — không lặp ý.
- Độ dài thật: thường 1–3 câu như comment Facebook thông thường.
- KHÔNG dùng từ "bình luận", "comment", "post" trong nội dung.
- KHÔNG có comment nào nghe như bot hoặc marketing.
${brand.brandForbidden ? `- TUYỆT ĐỐI không dùng: ${brand.brandForbidden}` : ''}

## Format output bắt buộc:
1. [nội dung comment 1]
2. [nội dung comment 2]
...
${count}. [nội dung comment ${count}]

Chỉ trả danh sách số thứ tự. Không giải thích thêm.
`.trim();
}
```

---

## 6. API Routes

### 6.1 Generate — `/api/viet-tu-facebook-comment/generate/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { BATCH_SIZE, FREE_USER_MAX_WORDS } from '@/lib/facebook-comment/options';
import { parseCommentList } from '@/lib/facebook-comment/parser';
import { buildCommentBrandPrompt } from '@/lib/viet-tu-facebook-comment/prompt-builder';
import { prisma } from '@/lib/prisma';
import type { CommentBrandBatchEvent, CommentBrandDoneEvent, CommentBrandErrorEvent } from '@/lib/viet-tu-facebook-comment/types';

export const runtime = 'nodejs';

const generateSchema = z.object({
  postContent:    z.string().min(5, 'Nội dung post quá ngắn').max(10000),
  facebookPostId: z.string().nullable().optional(),
  language:       z.string().default('Vietnamese'),
  style:          z.string().default('friendly'),
  count:          z.number().int().min(1).max(50).default(5),
  modelId:        z.string().default('gemini-flash'),
});

function sseEvent(
  controller: ReadableStreamDefaultController,
  data: CommentBrandBatchEvent | CommentBrandDoneEvent | CommentBrandErrorEvent,
) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: NextRequest) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ type: 'error', message: 'Cần đăng nhập' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await request.json();
    const parsed  = generateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ type: 'error', message: parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { postContent, language, style, count, modelId } = parsed.data;

    // Word count check
    const wordCount = postContent.trim().split(/\s+/).length;
    if (wordCount > FREE_USER_MAX_WORDS) {
      return new Response(
        JSON.stringify({ type: 'error', message: `Nội dung vượt quá ${FREE_USER_MAX_WORDS} từ (hiện tại: ${wordCount} từ).` }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Load brand profile
    const brandProfile = await prisma.brandProfile.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
    });

    const brand = {
      shopName:       brandProfile?.shopName       ?? 'Nội Thất Minh Quân',
      brandPronouns:  brandProfile?.brandPronouns  ?? 'Minh Quân',
      mainProducts:   brandProfile?.mainProducts   ?? 'giường sắt, tủ quần áo, bàn ghế',
      brandAudience:  brandProfile?.brandAudience  ?? 'gia đình trẻ, sinh viên, chủ homestay',
      brandToneNotes: brandProfile?.brandToneNotes ?? '',
      brandForbidden: brandProfile?.brandForbidden ?? '',
    };

    // Batch calculation
    const batches: number[] = [];
    let remaining = count;
    while (remaining > 0) {
      batches.push(Math.min(remaining, BATCH_SIZE));
      remaining -= BATCH_SIZE;
    }

    const model = buildTinhGonModel(modelId);

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: CommentBrandBatchEvent | CommentBrandDoneEvent | CommentBrandErrorEvent) =>
          sseEvent(controller, data);

        try {
          let totalGenerated = 0;

          for (let i = 0; i < batches.length; i++) {
            const batchCount = batches[i]!;
            const prompt = buildCommentBrandPrompt({
              postContent,
              count: batchCount,
              style: style as any,
              language,
              brand,
            });

            let rawOutput = '';

            try {
              const result = await model.generateContent(prompt);
              rawOutput = result.response.text();
            } catch {
              try {
                const aiStream = await model.generateContentStream(prompt);
                for await (const chunk of aiStream) {
                  rawOutput += chunk.text() ?? '';
                }
              } catch (retryError) {
                send({
                  type:    'error',
                  message: `Lỗi batch ${i + 1}: ${retryError instanceof Error ? retryError.message : 'AI error'}`,
                });
                continue;
              }
            }

            const comments = parseCommentList(rawOutput, batchCount);

            if (comments.length === 0) {
              send({ type: 'error', message: `Batch ${i + 1}: AI trả về không đúng format. Thử lại.` });
              continue;
            }

            totalGenerated += comments.length;

            send({ type: 'batch', comments, batchIndex: i, totalBatch: batches.length });

            if (i < batches.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          send({ type: 'done', total: totalGenerated });
        } catch (error) {
          send({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi không xác định' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection:      'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Lỗi server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
```

---

### 6.2 Save — `/api/viet-tu-facebook-comment/save/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const saveSchema = z.object({
  postContent:    z.string().min(5),
  facebookPostId: z.string().nullable().optional(),
  style:          z.string(),
  language:       z.string(),
  count:          z.number().int().min(1).max(50),
  modelId:        z.string(),
  comments:       z.array(z.string()).min(1),
  brandSnapshot:  z.record(z.unknown()).optional(),
  notes:          z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body   = await request.json();
    const parsed = saveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ' },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const record = await prisma.facebookCommentBrand.create({
      data: {
        postContent:    data.postContent,
        facebookPostId: data.facebookPostId ?? null,
        style:          data.style,
        language:       data.language,
        count:          data.count,
        modelId:        data.modelId,
        comments:       data.comments,
        brandSnapshot:  data.brandSnapshot ?? {},
        notes:          data.notes ?? null,
        userId:         session.user.id,
      },
    });

    return NextResponse.json({ id: record.id, savedCount: data.comments.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lỗi lưu dữ liệu' },
      { status: 500 },
    );
  }
}
```

---

### 6.3 Detail — `/api/viet-tu-facebook-comment/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const record = await prisma.facebookCommentBrand.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(record);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.facebookCommentBrand.deleteMany({
    where: { id: params.id, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
```

---

### 6.4 List — `/api/viet-tu-facebook-comment/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const style  = searchParams.get('style')  ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const page   = parseInt(searchParams.get('page') ?? '1', 10);
  const limit  = 20;

  const where: any = { userId: session.user.id };
  if (style)  where.style       = style;
  if (search) where.postContent = { contains: search, mode: 'insensitive' };

  const [total, items] = await Promise.all([
    prisma.facebookCommentBrand.count({ where }),
    prisma.facebookCommentBrand.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * limit,
      take:  limit,
      select: {
        id:          true,
        createdAt:   true,
        postContent: true,
        style:       true,
        count:       true,
        comments:    true,
        notes:       true,
      },
    }),
  ]);

  return NextResponse.json({ items, total, page, hasMore: page * limit < total });
}
```

---

## 7. Page — `web/app/viet-tu-facebook-comment/page.tsx`

Layout 2 cột: trái (form config), phải (comment cards).

```tsx
'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  COMMENT_BRAND_STYLES,
  COMMENT_COUNTS,
  COMMENT_LANGUAGES,
  VTFC_SESSION_KEY,
} from '@/lib/viet-tu-facebook-comment/options';
import { parseCommentList, joinComments } from '@/lib/facebook-comment/parser';
import type {
  CommentBrandCard,
  CommentBrandConfig,
  CommentBrandSSEEvent,
  CommentBrandStyle,
  CommentCount,
  SaveCommentResponse,
} from '@/lib/viet-tu-facebook-comment/types';
import ModelPicker from '@/components/ModelPicker';
import BrandSection from '@/components/BrandSection';

const DEFAULT_CONFIG: CommentBrandConfig = {
  postContent:    '',
  facebookPostId: null,
  language:       'Vietnamese',
  style:          'friendly',
  count:          5,
  modelId:        'gemini-flash',
};

export default function VietTuFacebookCommentPage() {
  const uid     = useId();
  const router  = useRouter();

  const [config, setConfig]         = useState<CommentBrandConfig>(() => {
    // Restore từ sessionStorage nếu có
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(VTFC_SESSION_KEY);
      if (saved) {
        try { return { ...DEFAULT_CONFIG, ...JSON.parse(saved) }; } catch {}
      }
    }
    return DEFAULT_CONFIG;
  });

  const [cards, setCards]           = useState<CommentBrandCard[]>([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [done, setDone]             = useState(false);
  const [allCopied, setAllCopied]   = useState(false);
  const [savedId, setSavedId]       = useState<string | null>(null);
  const [progress, setProgress]     = useState({ current: 0, total: 0 });

  const abortRef    = useRef<AbortController | null>(null);
  const cardCounter = useRef(0);

  const inputWordCount = config.postContent.trim()
    ? config.postContent.trim().split(/\s+/).length
    : 0;

  // Persist config to sessionStorage
  const updateConfig = (partial: Partial<CommentBrandConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      sessionStorage.setItem(VTFC_SESSION_KEY, JSON.stringify(next));
      return next;
    });
  };

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!config.postContent.trim()) {
      setError('Vui lòng nhập nội dung bài post Facebook.');
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setDone(false);
    setError('');
    setCards([]);
    setAllCopied(false);
    setSavedId(null);
    cardCounter.current = 0;

    const batchTotal = Math.ceil(config.count / 10);
    setProgress({ current: 0, total: batchTotal });

    try {
      const response = await fetch('/api/viet-tu-facebook-comment/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(config),
        signal:  abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        const errData = await response.json() as { message?: string };
        throw new Error(errData.message ?? 'Lỗi kết nối');
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(line.slice(6)) as CommentBrandSSEEvent;

            if (event.type === 'batch') {
              const newCards: CommentBrandCard[] = event.comments.map((text) => ({
                id:    `${uid}-${++cardCounter.current}`,
                text,
                copied: false,
                saved:  false,
              }));
              setCards((prev) => [...prev, ...newCards]);
              setProgress((prev) => ({ ...prev, current: event.batchIndex + 1 }));

            } else if (event.type === 'done') {
              setDone(true);

            } else if (event.type === 'error') {
              setError((prev) => prev ? `${prev} | ${event.message}` : event.message);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      }
    } finally {
      setLoading(false);
    }
  }, [config, uid]);

  // ── Save all ────────────────────────────────────────────────────────────────

  const handleSaveAll = async () => {
    if (cards.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/viet-tu-facebook-comment/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          comments: cards.map((c) => c.text),
        }),
      });
      const data = await res.json() as SaveCommentResponse;
      setSavedId(data.id);
    } catch {
      setError('Lưu thất bại. Thử lại.');
    } finally {
      setSaving(false);
    }
  };

  // ── Copy helpers ────────────────────────────────────────────────────────────

  function handleCopyCard(id: string) {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    void navigator.clipboard.writeText(card.text).then(() => {
      setCards((prev) => prev.map((c) => c.id === id ? { ...c, copied: true } : c));
      setTimeout(() => setCards((prev) => prev.map((c) => c.id === id ? { ...c, copied: false } : c)), 1500);
    });
  }

  function handleCopyAll() {
    const allText = joinComments(cards.map((c) => c.text));
    void navigator.clipboard.writeText(allText).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-900">Viết Comment Facebook</h1>
          <p className="text-xs text-gray-500">Tạo comment mồi tự nhiên, phù hợp thương hiệu</p>
        </div>
        {savedId && (
          <button
            onClick={() => router.push('/quan-ly-facebook-comment')}
            className="text-xs text-blue-600 hover:underline"
          >
            Xem danh sách đã lưu →
          </button>
        )}
      </div>

      {/* Main 2-column */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Config */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200 overflow-y-auto p-4 space-y-4">

          {/* Brand Section */}
          <BrandSection
            sessionKey="vtfc_brand_info"
            onLoad={() => {}}
          />

          {/* Post content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Nội dung bài post <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs ${inputWordCount > 500 ? 'text-red-500' : 'text-gray-400'}`}>
                {inputWordCount} từ
              </span>
            </div>
            <textarea
              value={config.postContent}
              onChange={(e) => updateConfig({ postContent: e.target.value })}
              placeholder="Dán nội dung bài post Facebook vào đây..."
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ngôn ngữ</label>
            <select
              value={config.language}
              onChange={(e) => updateConfig({ language: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COMMENT_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>

          {/* Style */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Phong cách comment</label>
            <div className="space-y-1.5">
              {COMMENT_BRAND_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => updateConfig({ style: s.value })}
                  title={s.note}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    config.style === s.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base flex-shrink-0">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold">{s.label}</p>
                      {s.hot && (
                        <span className="text-[9px] bg-orange-100 text-orange-600 px-1 rounded font-medium">HOT</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 leading-tight truncate">{s.note}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Số lượng comment
            </label>
            <div className="grid grid-cols-7 gap-1">
              {COMMENT_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => updateConfig({ count: n as CommentCount })}
                  className={`py-1.5 rounded text-xs font-medium transition-colors ${
                    config.count === n
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {config.count > 10 && (
              <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 rounded px-2 py-1">
                ⚡ {Math.ceil(config.count / 10)} lần gọi AI
              </p>
            )}
          </div>

          {/* Model picker */}
          <ModelPicker
            value={config.modelId}
            onChange={(modelId) => updateConfig({ modelId })}
          />

          {/* Error */}
          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={() => void handleGenerate()}
            disabled={loading || !config.postContent.trim()}
            className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {progress.total > 1
                  ? `Batch ${progress.current}/${progress.total}...`
                  : 'Đang tạo...'}
              </span>
            ) : 'Tạo comment'}
          </button>

        </div>

        {/* RIGHT: Comment cards */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

          {/* Output header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">
                {cards.length > 0
                  ? `${cards.length} comment${loading ? ' (đang tạo...)' : ''}`
                  : 'Kết quả'}
              </span>
              {/* Progress dots */}
              {loading && progress.total > 1 && (
                <div className="flex gap-1">
                  {Array.from({ length: progress.total }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i < progress.current ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {cards.length > 0 && (
                <button
                  onClick={handleCopyAll}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    allCopied
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {allCopied ? '✓ Đã copy' : 'Copy tất cả'}
                </button>
              )}

              {done && cards.length > 0 && !savedId && (
                <button
                  onClick={() => void handleSaveAll()}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Đang lưu...' : `Lưu ${cards.length} comment`}
                </button>
              )}

              {savedId && (
                <span className="text-xs text-green-600 font-medium">✓ Đã lưu</span>
              )}
            </div>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto p-4">
            {cards.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <span className="text-4xl mb-3">💬</span>
                <p className="text-sm font-medium">Chưa có comment nào</p>
                <p className="text-xs mt-1">Nhập nội dung post và bấm "Tạo comment"</p>
              </div>
            )}

            <div className="space-y-3">
              {cards.map((card, index) => (
                <CommentBrandCardItem
                  key={card.id}
                  card={card}
                  index={index + 1}
                  onCopy={() => handleCopyCard(card.id)}
                />
              ))}
            </div>

            {/* Skeleton */}
            {loading && cards.length > 0 && (
              <div className="mt-3 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Comment Card Component ───────────────────────────────────────────────────

interface CommentBrandCardItemProps {
  card:   CommentBrandCard;
  index:  number;
  onCopy: () => void;
}

function CommentBrandCardItem({ card, index, onCopy }: CommentBrandCardItemProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
          {index}
        </span>
        <p className="flex-1 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {card.text}
        </p>
        <button
          onClick={onCopy}
          className={`flex-shrink-0 px-2.5 py-1 text-xs rounded-lg border transition-all ${
            card.copied
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          {card.copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
```

---

## 8. Quản lý — `web/app/quan-ly-facebook-comment/page.tsx`

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FacebookCommentBrandItem } from '@/lib/viet-tu-facebook-comment/types';
import { COMMENT_BRAND_STYLES } from '@/lib/viet-tu-facebook-comment/options';
import { joinComments } from '@/lib/facebook-comment/parser';

export default function QuanLyFacebookCommentPage() {
  const [items, setItems]         = useState<FacebookCommentBrandItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [styleFilter, setStyle]   = useState('');
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);
  const [total, setTotal]         = useState(0);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);

  const fetchItems = useCallback(async (reset = false) => {
    setLoading(true);
    const currentPage = reset ? 1 : page;
    const params = new URLSearchParams({ page: String(currentPage) });
    if (styleFilter) params.set('style', styleFilter);
    if (search)      params.set('search', search);

    const res  = await fetch(`/api/viet-tu-facebook-comment?${params.toString()}`);
    const data = await res.json() as { items: FacebookCommentBrandItem[]; total: number; hasMore: boolean };

    setItems((prev) => reset ? data.items : [...prev, ...data.items]);
    setTotal(data.total);
    setHasMore(data.hasMore);
    if (reset) setPage(1);
    setLoading(false);
  }, [page, styleFilter, search]);

  useEffect(() => { void fetchItems(true); }, [styleFilter, search]);

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa nhóm comment này?')) return;
    setDeleting(id);
    await fetch(`/api/viet-tu-facebook-comment/${id}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeleting(null);
  };

  const handleCopyAll = (item: FacebookCommentBrandItem) => {
    void navigator.clipboard.writeText(joinComments(item.comments));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý Comment Facebook</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} nhóm đã lưu</p>
        </div>
        <a
          href="/viet-tu-facebook-comment"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          + Tạo comment mới
        </a>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm nội dung bài post..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={styleFilter}
          onChange={(e) => setStyle(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả style</option>
          {COMMENT_BRAND_STYLES.map((s) => (
            <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
          ))}
        </select>
      </div>

      {/* Items */}
      {loading && items.length === 0 ? (
        <div className="space-y-4">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const style = COMMENT_BRAND_STYLES.find((s) => s.value === item.style);
            const isExpanded = expanded === item.id;

            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 line-clamp-2 mb-1.5">
                      {item.postContent.slice(0, 150)}{item.postContent.length > 150 ? '...' : ''}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {style?.emoji} {style?.label ?? item.style}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.comments.length} comments
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <button
                      onClick={() => handleCopyAll(item)}
                      className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                    >
                      Copy tất cả
                    </button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : item.id)}
                      className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                    >
                      {isExpanded ? 'Thu gọn' : `Xem ${item.comments.length}`}
                    </button>
                    <button
                      onClick={() => void handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="text-xs px-2.5 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      {deleting === item.id ? '...' : 'Xóa'}
                    </button>
                  </div>
                </div>

                {/* Expanded comments */}
                {isExpanded && (
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    {item.comments.map((text, idx) => (
                      <div key={idx} className="flex items-start gap-2 group">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="flex-1 text-sm text-gray-700">{text}</p>
                        <button
                          onClick={() => void navigator.clipboard.writeText(text)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 hover:text-blue-500 transition-opacity"
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="text-center mt-6">
          <button
            onClick={() => { setPage((p) => p + 1); void fetchItems(); }}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Tải thêm
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 9. Sidebar — cập nhật `web/components/Sidebar.tsx`

```typescript
// Section Social — cập nhật thêm 2 items mới:
{
  label: 'Social',
  items: [
    { href: '/viet-bai-facebook',          icon: '✍️', label: 'Viết bài Facebook'     },
    { href: '/viet-tu-facebook-comment',   icon: '💬', label: 'Viết Comment Facebook'  },  // ← MỚI
    { href: '/facebook-post',              icon: '📝', label: 'Tạo nhanh Post'         },
    { href: '/facebook-comment',           icon: '💭', label: 'Tạo nhanh Comment'      },
    { href: '/quan-ly-bai-facebook',       icon: '📋', label: 'Quản lý bài Facebook'   },
    { href: '/quan-ly-facebook-comment',   icon: '🗂️', label: 'Quản lý Comment'        },  // ← MỚI
  ],
},
```

---

## 10. Thứ tự cài đặt

| Bước | File | Ghi chú |
|------|------|---------|
| 1 | `prisma/schema.prisma` | Thêm `FacebookCommentBrand` model + relation |
| 2 | `npx prisma migrate dev --name add-facebook-comment-brand` | Chạy migration |
| 3 | `lib/viet-tu-facebook-comment/types.ts` | Types |
| 4 | `lib/viet-tu-facebook-comment/options.ts` | 9 styles + re-export từ `/facebook-comment` |
| 5 | `lib/viet-tu-facebook-comment/prompt-builder.ts` | buildCommentBrandPrompt() |
| 6 | `api/viet-tu-facebook-comment/generate/route.ts` | Test với Postman: style=curious, count=5 |
| 7 | `api/viet-tu-facebook-comment/save/route.ts` | Verify lưu vào DB |
| 8 | `api/viet-tu-facebook-comment/route.ts` | GET list với filter |
| 9 | `api/viet-tu-facebook-comment/[id]/route.ts` | GET + DELETE |
| 10 | `app/viet-tu-facebook-comment/page.tsx` | UI — test toàn bộ flow |
| 11 | `app/quan-ly-facebook-comment/page.tsx` | Management page |
| 12 | `components/Sidebar.tsx` | Thêm 2 nav entries |

---

## 11. 3 Style mới — Giải thích và ví dụ output

### Style `curious` — "Hỏi thêm"

**Mục đích:** Tạo discussion, tăng engagement, kéo người xem vào bình luận.

**Ví dụ output (cho bài post giới thiệu giường sắt):**
```
1. Cho mình hỏi giường này có màu đen không ạ? Phòng mình đang thiếu 1 cái
2. Kích thước 1m6 có không shop? Cho thuê phòng nên cần loại vừa
3. Giá có thể cho mình biết không ạ? Inbox được không?
4. Bảo hành bao nhiêu năm vậy shop?
5. Giao đến Đà Nẵng không shop ơi?
```

### Style `experience` — "Trải nghiệm"

**Mục đích:** Tạo social proof tự nhiên, tin cậy hơn review có điểm số.

**Ví dụ output:**
```
1. Mình mua của shop được 6 tháng rồi, khung vẫn chắc lắm, không bị gỉ
2. Hồi trước order 1m8 cho phòng ngủ, giao đúng 2 ngày luôn, bao bì kỹ
3. Mình cũng đang dùng cái tủ quần áo của shop, đóng mở trơn tru
```

### Style `tag_friend` — "Tag bạn bè"

**Mục đích:** Viral organic reach, reach user mới qua bạn bè của người xem.

**Ví dụ output:**
```
1. @... mày xem cái này, phòng trọ mày đang cần giường mà
2. @... tụi mình thuê nhà mới, cái này hợp nè!
3. Ê @... ba mày kêu mua giường mới đó, thấy cái này được không?
```

---

## 12. Bugs thường gặp (extends từ /facebook-comment)

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|---------|
| Brand profile không load | `brandProfile` null khi user chưa setup | Dùng fallback hardcode Minh Quân defaults |
| Style `tag_friend` bị filter | `parseCommentList` bỏ dòng có `@...` | `@...` không match pattern filter → ổn |
| Comments không phù hợp nội thất | Brand block không đủ context | Thêm `mainProducts` vào prompt |
| `facebookPostId` không resolve | Relation không tồn tại | Validate trước khi save, nullable an toàn |
| Save fail sau generate | Session expired trong lúc streaming | Re-login redirect từ `/api/auth/signin` |
| sessionStorage persist sai | Config cũ từ lần trước restore | Thêm nút "Reset config" hoặc clear khi save xong |
| `parseCommentList` skip comment có "@" | Không skip — "@" không trong filter list | Verify với unit test |
| Batch slow với style `experience` | AI cần suy nghĩ nhiều hơn | Dùng `gemini-flash` là đủ, không cần pro |
| Management page không refresh sau delete | State update không trigger refetch | `setItems(prev => prev.filter(...))` trực tiếp — ổn |
| `expanded` không close khi fetch mới | `expanded` state persist qua filter change | Reset `expanded` khi `fetchItems(true)` |

---

## 13. QA Checklist

### Setup & Auth
- [ ] Không login → redirect về `/api/auth/signin`
- [ ] sessionStorage restore đúng config từ lần trước
- [ ] Brand profile load → tên shop hiện đúng trong BrandSection

### Generate
- [ ] Textarea accept paste bài post dài
- [ ] Word count realtime, vượt 500 → badge đỏ
- [ ] Style "Hỏi thêm" → output dạng câu hỏi về sản phẩm
- [ ] Style "Trải nghiệm" → output cụ thể, không chung chung
- [ ] Style "Tag bạn bè" → output có "@..."
- [ ] count = 20 → 2 batch, progress dots đúng
- [ ] count = 50 → 5 batch
- [ ] Mỗi batch append realtime (không đợi hết)
- [ ] Abort (click lại Generate) → reset cards, request cũ huỷ

### Comments & Cards
- [ ] Index badge đúng thứ tự toàn cục (không reset mỗi batch)
- [ ] Copy card → clipboard đúng → "✓ Copied" 1.5s
- [ ] Copy tất cả → dấu cách giữa comments = 2 dòng
- [ ] Nút "Lưu X comment" chỉ hiện khi done = true
- [ ] Sau lưu → badge "✓ Đã lưu" + link "Xem danh sách"

### Management Page
- [ ] List hiện đúng 20 items/trang
- [ ] Filter style + search hoạt động độc lập
- [ ] Expand → hiện đúng comment text
- [ ] Copy tất cả từ management → clipboard đúng
- [ ] Xóa → confirm dialog → item biến khỏi list ngay
- [ ] Load more → append thêm 20 items

### Edge Cases
- [ ] Bài post có emoji → không bị strip
- [ ] AI trả JSON array → parser xử lý được (từ `/facebook-comment/parser`)
- [ ] AI có intro text → bị filter đúng
- [ ] Brand profile chưa setup → dùng fallback, không crash
