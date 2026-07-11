# TAO-ANH-AI-IMPLEMENTATION.md
## Spec trang Tạo Ảnh AI — Dùng Banana API

> Provider: **Banana API**
> Route: `/tao-anh-ai`
> Cảm hứng UI: AIKTP + AI Pic4Go + SeaArt.ai
> Ngày: 2026-05-29

---

## MỤC TIÊU

Tool tạo ảnh AI đa mục đích. Dùng được cho mọi chủ đề:
sản phẩm, blog, social, marketing, sáng tạo tự do.

---

## LAYOUT

```
┌───────────────────┬──────────────────────────────────────┐
│  LEFT — Settings  │  CENTER — Prompt + Output            │
│  (280px fixed)    │  (flex-1)                            │
│                   │                                      │
│  [Model picker]   │  [Prompt textarea]                   │
│  [Basic Settings] │  [Inline summary bar + Generate]     │
│  [Advanced ▼]     │  ─────────────────────────────────   │
│  [Reset][Notes]   │  [History tab] [Inspiration tab]     │
│                   │  [Output grid / Demo gallery]        │
└───────────────────┴──────────────────────────────────────┘
```

Mobile: left panel = bottom drawer.

---

## CORE LOGIC — GENERATE FLOW

```
User nhập prompt
       ↓
Prompt Magic = Auto/On?
   YES → POST /api/image/enhance-prompt → lấy enhanced prompt
   NO  → dùng nguyên prompt gốc
       ↓
Build final prompt:
   = enhanced/raw prompt
   + style inject từ preset
   + quick tags đang chọn
       ↓
POST /api/image/generate (Next.js API route)
       ↓
API route gọi Banana API
       ↓
Banana trả về image URL / base64
       ↓
Lưu vào DB (GeneratedImage)
       ↓
Hiển thị trong output grid
```

---

## API ROUTE — `/api/image/generate`

**File:** `web/app/api/image/generate/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();

  const {
    prompt,           // đã enhance nếu Prompt Magic on
    rawPrompt,        // prompt gốc user nhập
    negativePrompt,
    aspectRatio,      // '1:1' | '9:16' | '16:9' | '4:3' | '2:3'
    quality,          // 'standard' | 'quality'
    count,            // 1-4 (free), 5-8 (premium)
    seed,             // number | null
    steps,            // advanced: 10-50
    cfgScale,         // advanced: 1-15
    referenceImageUrl,// img2img nếu có
    isPrivate,
    articleId,        // context từ step4
  } = body;

  // Build dimensions từ aspectRatio
  const { width, height } = resolveAspectRatio(aspectRatio, quality);

  // Build Banana payload
  const bananaPayload = {
    prompt: buildFinalPrompt(prompt, quality),
    negative_prompt: negativePrompt || DEFAULT_NEGATIVE_PROMPT,
    width,
    height,
    num_inference_steps: steps ?? (quality === 'quality' ? 30 : 20),
    guidance_scale: cfgScale ?? 7.5,
    seed: seed ?? -1,             // -1 = random
    num_images: count ?? 1,
    ...(referenceImageUrl && { init_image: referenceImageUrl, strength: 0.75 }),
  };

  try {
    const results = await callBananaApi(bananaPayload);

    // Lưu từng ảnh vào DB
    const saved = await Promise.all(
      results.map((img) =>
        prisma.generatedImage.create({
          data: {
            url: img.url,
            seed: img.seed,
            prompt: buildFinalPrompt(prompt, quality),
            rawPrompt,
            negativePrompt: negativePrompt ?? '',
            aspectRatio,
            quality,
            isPrivate: isPrivate ?? false,
            articleId: articleId ?? null,
          },
        })
      )
    );

    return NextResponse.json({ success: true, images: saved });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

// Helpers
function resolveAspectRatio(ratio: string, quality: string) {
  const base = quality === 'quality' ? 1024 : 768;
  const map: Record<string, [number, number]> = {
    '1:1':  [base,      base     ],
    '9:16': [base * 9 / 16 | 0,  base    ],
    '16:9': [base,      base * 9 / 16 | 0],
    '4:3':  [base,      base * 3 / 4  | 0],
    '2:3':  [base * 2 / 3 | 0,  base    ],
    '3:4':  [base * 3 / 4 | 0,  base    ],
  };
  const [width, height] = map[ratio] ?? [base, base];
  // Làm tròn về bội số 8 (yêu cầu của hầu hết image model)
  return {
    width:  Math.round(width / 8) * 8,
    height: Math.round(height / 8) * 8,
  };
}

function buildFinalPrompt(prompt: string, quality: string): string {
  const qualityBoost = quality === 'quality'
    ? ', masterpiece, best quality, ultra detailed, 4K'
    : ', high quality';
  return `${prompt}${qualityBoost}`;
}

const DEFAULT_NEGATIVE_PROMPT =
  'blurry, low quality, low resolution, watermark, text, logo, ' +
  'ugly, deformed, bad anatomy, extra limbs, duplicate';
```

---

## BANANA API CLIENT

**File:** `web/lib/banana/client.ts`

```typescript
const BANANA_API_URL = process.env.BANANA_API_URL!;   // endpoint từ env
const BANANA_API_KEY = process.env.BANANA_API_KEY!;   // key từ env
const BANANA_MODEL_KEY = process.env.BANANA_MODEL_KEY!;

interface BananaInput {
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  num_inference_steps: number;
  guidance_scale: number;
  seed: number;
  num_images: number;
  init_image?: string;
  strength?: number;
}

interface BananaImageResult {
  url: string;
  seed: number;
}

export async function callBananaApi(
  input: BananaInput
): Promise<BananaImageResult[]> {
  const response = await fetch(BANANA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BANANA_API_KEY}`,
    },
    body: JSON.stringify({
      apiKey: BANANA_API_KEY,
      modelKey: BANANA_MODEL_KEY,
      modelInputs: input,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Banana API error: ${response.status} — ${err}`);
  }

  const data = await response.json();

  // Normalize response — điều chỉnh theo response thực tế của Banana
  // Banana có thể trả về: { outputs: [{ image: base64|url, seed: number }] }
  return normalizeResponse(data, input.seed);
}

function normalizeResponse(data: unknown, inputSeed: number): BananaImageResult[] {
  // Trường hợp Banana trả về mảng URL
  if (Array.isArray(data)) {
    return data.map((item, i) => ({
      url: typeof item === 'string' ? item : item.url ?? item.image,
      seed: item.seed ?? inputSeed + i,
    }));
  }

  // Trường hợp có wrapper object
  const outputs = (data as Record<string, unknown>).outputs
    ?? (data as Record<string, unknown>).images
    ?? (data as Record<string, unknown>).result;

  if (Array.isArray(outputs)) {
    return outputs.map((item, i) => ({
      url: typeof item === 'string' ? item : item.url ?? item.image,
      seed: item.seed ?? inputSeed + i,
    }));
  }

  throw new Error('Banana API: không nhận dạng được response format');
}
```

> **Lưu ý:** `normalizeResponse` cần điều chỉnh theo response thực tế
> của Banana API đang dùng. Log `data` lần đầu để xác nhận format.

---

## API ROUTE — `/api/image/enhance-prompt`

**File:** `web/app/api/image/enhance-prompt/route.ts`

```typescript
export async function POST(req: Request) {
  const { prompt, style } = await req.json();

  const systemPrompt = `Bạn là chuyên gia viết prompt cho AI image generation.
Nhiệm vụ: Cải thiện prompt ngắn của user thành prompt chi tiết hơn.

Quy tắc:
- Giữ nguyên ý tưởng gốc, không thay đổi chủ đề
- Thêm: ánh sáng, góc chụp, chất lượng, phong cách nếu chưa có
- Dùng tiếng Anh (tốt hơn cho image model)
- Không quá 200 từ
- Trả về CHỈ prompt đã cải thiện, không giải thích`;

  const userMsg = `Prompt gốc: "${prompt}"${style ? `\nPhong cách: ${style}` : ''}`;

  // Dùng AI đang có trong hệ thống (Gemini/Claude)
  const enhanced = await callAI(systemPrompt, userMsg);

  return Response.json({ enhanced: enhanced.trim() });
}
```

---

## PRISMA SCHEMA

```prisma
model GeneratedImage {
  id             String   @id @default(cuid())
  url            String
  seed           Int
  prompt         String   @db.Text
  rawPrompt      String   @db.Text
  negativePrompt String   @default("") @db.Text
  aspectRatio    String
  quality        String
  width          Int
  height         Int
  isPrivate      Boolean  @default(false)
  articleId      String?
  article        Article? @relation(fields: [articleId], references: [id])
  createdAt      DateTime @default(now())
}
```

Sau khi thêm: `npx prisma migrate dev --name add_generated_image`

---

## STATE MANAGEMENT (Frontend)

**File:** `web/app/tao-anh-ai/page.tsx`

```typescript
// Settings state
const [prompt, setPrompt]           = useState('');
const [negativePrompt, setNegPrompt]= useState('');
const [aspectRatio, setAspectRatio] = useState<string>('1:1');
const [quality, setQuality]         = useState<'standard'|'quality'>('standard');
const [count, setCount]             = useState(2);
const [seed, setSeed]               = useState<number|null>(null);
const [promptMagic, setPromptMagic] = useState<'auto'|'on'|'off'>('auto');
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [referenceImage, setRefImage] = useState<string|null>(null);
const [isPrivate, setIsPrivate]     = useState(false);

// Advanced (collapsed mặc định)
const [steps, setSteps]             = useState(20);
const [cfgScale, setCfgScale]       = useState(7.5);
const [showAdvanced, setShowAdv]    = useState(false);

// Output state
const [generating, setGenerating]   = useState(false);
const [images, setImages]           = useState<GeneratedImage[]>([]);
const [error, setError]             = useState('');
const [retryIds, setRetryIds]       = useState<Set<string>>(new Set());

// Tab
const [activeTab, setActiveTab]     = useState<'history'|'inspiration'>('history');
```

---

## GENERATE HANDLER

```typescript
async function handleGenerate() {
  if (!prompt.trim() || generating) return;
  setGenerating(true);
  setError('');

  try {
    // Bước 1: Enhance prompt nếu cần
    let finalPrompt = prompt.trim();
    const shouldEnhance =
      promptMagic === 'on' ||
      (promptMagic === 'auto' && prompt.trim().split(' ').length < 10);

    if (shouldEnhance) {
      const res = await fetch('/api/image/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt }),
      });
      const { enhanced } = await res.json();
      if (enhanced) finalPrompt = enhanced;
    }

    // Bước 2: Append tags vào prompt
    if (selectedTags.length > 0) {
      finalPrompt = `${finalPrompt}, ${selectedTags.join(', ')}`;
    }

    // Bước 3: Gọi generate
    const res = await fetch('/api/image/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: finalPrompt,
        rawPrompt: prompt.trim(),
        negativePrompt,
        aspectRatio,
        quality,
        count,
        seed,
        steps,
        cfgScale,
        referenceImageUrl: referenceImage,
        isPrivate,
        articleId: searchParams.get('articleId'),
      }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    // Prepend kết quả mới vào đầu list
    setImages(prev => [...data.images, ...prev]);

  } catch (err) {
    setError(err instanceof Error ? err.message : 'Tạo ảnh thất bại');
  } finally {
    setGenerating(false);
  }
}
```

---

## RETRY LOGIC (học từ Pic4Go "Tạo lại ảnh lỗi")

```typescript
async function handleRetry(imageId: string) {
  setRetryIds(prev => new Set(prev).add(imageId));

  // Tìm ảnh gốc để lấy lại settings
  const original = images.find(img => img.id === imageId);
  if (!original) return;

  try {
    const res = await fetch('/api/image/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: original.prompt,
        rawPrompt: original.rawPrompt,
        negativePrompt: original.negativePrompt,
        aspectRatio: original.aspectRatio,
        quality: original.quality,
        count: 1,
        seed: null,   // seed mới, tránh ra ảnh giống hệt
      }),
    });

    const data = await res.json();
    if (data.success) {
      // Replace ảnh cũ bị lỗi bằng ảnh mới
      setImages(prev =>
        prev.map(img => img.id === imageId ? data.images[0] : img)
      );
    }
  } finally {
    setRetryIds(prev => {
      const next = new Set(prev);
      next.delete(imageId);
      return next;
    });
  }
}
```

---

## ENV VARIABLES

```env
# .env.local
BANANA_API_URL=https://api.banana.dev/start/v4/   # hoặc endpoint thực tế
BANANA_API_KEY=your_banana_api_key
BANANA_MODEL_KEY=your_model_key
```

---

## CHECKLIST TRIỂN KHAI

### Phase 1 — Core
- [ ] Tạo `web/lib/banana/client.ts` — test với 1 prompt đơn giản trước
- [ ] Log response thực tế của Banana → điều chỉnh `normalizeResponse()`
- [ ] Tạo `web/app/api/image/generate/route.ts`
- [ ] Tạo `web/app/api/image/enhance-prompt/route.ts`
- [ ] Thêm `GeneratedImage` vào Prisma schema + migrate
- [ ] Tạo `web/app/tao-anh-ai/page.tsx` — layout + state + generate handler
- [ ] Output grid: hiển thị ảnh + download button
- [ ] Demo gallery khi chưa có ảnh

### Phase 2 — Enhanced
- [ ] Prompt Magic toggle (Auto/On/Off)
- [ ] Quick tags (2 nhóm đầu + expand)
- [ ] Negative prompt (trong Additional panel)
- [ ] Retry từng ảnh riêng
- [ ] Inline summary bar dưới prompt
- [ ] Reference image upload → truyền vào `init_image`
- [ ] Seed display + copy + tạo variation
- [ ] Tab Inspiration (browse public images)
- [ ] Kết nối step4 Tab Images (query params)

### Phase 3 — Advanced
- [ ] Advanced Config: steps, CFG, sampler
- [ ] Quantity gating 5-8 (premium)
- [ ] Private Creation toggle
- [ ] Nút "Chèn vào bài viết"
- [ ] Batch mode (nhiều prompt một lúc)

---

## LƯU Ý QUAN TRỌNG

1. **Test Banana response format trước** — `normalizeResponse()` cần biết
   Banana trả về `{ outputs: [...] }` hay `{ images: [...] }` hay format khác.
   Log raw response khi test lần đầu.

2. **Width/height phải là bội số 8** — đã xử lý trong `resolveAspectRatio()`.

3. **Timeout** — image generation có thể mất 20-60s. Set `fetch` timeout
   phù hợp hoặc dùng polling nếu Banana API là async.

4. **Rate limit** — nếu Banana có rate limit, thêm queue hoặc debounce
   Generate button sau khi click.

5. **Image storage** — nếu Banana trả về base64, cần upload lên CDN
   (Cloudinary, R2, S3) trước khi lưu URL vào DB.
