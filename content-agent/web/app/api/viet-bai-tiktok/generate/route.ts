import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server-auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { parseTiktokOutput } from '@/lib/viet-bai-tiktok/parser';
import { buildTiktokBrandPostPrompt } from '@/lib/viet-bai-tiktok/prompt-builder';
import type { TiktokPostSSEEvent } from '@/lib/viet-bai-tiktok/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

const brandSchema = z.object({
  shopName: z.string().optional().default(''),
  industry: z.string().optional().default(''),
  brandPronouns: z.string().optional().default(''),
  brandAudience: z.string().optional().default(''),
  brandToneNotes: z.string().optional().default(''),
  brandDesc: z.string().optional().default(''),
  latitude: z.string().optional().default(''),
  longitude: z.string().optional().default(''),
  openingHours: z.string().optional().default(''),
  priceRange: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  brandForbidden: z.string().optional().default(''),
  ctaStandard: z.string().optional().default(''),
  mainProducts: z.string().optional().default(''),
  selectedProfileId: z.string().optional().default(''),
});

const generateSchema = z.object({
  topic: z.string().min(5, 'Thiếu mô tả video / chủ đề').max(8000),
  videoType: z.enum(['product_demo', 'load_test', 'price_reveal', 'new_arrival', 'promotion']).default('product_demo'),
  hookStyle: z.enum(['pov', 'challenge', 'number', 'question', 'story']).default('number'),
  ctaStyle: z.enum(['inbox', 'comment_key', 'bio_link', 'phone']).default('inbox'),
  language: z.string().default('Vietnamese'),
  emojiLevel: z.enum(['none', 'low', 'medium', 'high']).default('medium'),
  modelId: z.string().min(1, 'Vui lòng chọn AI Model'),
  brand: brandSchema.default({}),
});

function sendEvent(controller: ReadableStreamDefaultController, data: TiktokPostSSEEvent) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return Response.json({ type: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = generateSchema.safeParse(rawBody);

  if (!parsed.success) {
    return Response.json(
      { type: 'error', message: parsed.error.errors[0]?.message || 'Payload không hợp lệ' },
      { status: 400 },
    );
  }

  const config = parsed.data;
  const prompt = buildTiktokBrandPostPrompt(config);
  const model = buildTinhGonModel(config.modelId || 'gemini-flash');

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullText = '';

        try {
          const aiStream = await model.generateContentStream(prompt);
          for await (const chunk of aiStream) {
            const text = chunk.text();
            if (!text) continue;
            fullText += text;
            sendEvent(controller, { type: 'chunk', text });
          }
        } catch {
          const result = await model.generateContent(prompt);
          fullText = result.response.text();
          sendEvent(controller, { type: 'chunk', text: fullText });
        }

        const parsedOutput = parseTiktokOutput(fullText);
        sendEvent(controller, { type: 'parsed', data: parsedOutput });

        sendEvent(controller, {
          type: 'done',
          wordCount: countWords(parsedOutput.caption),
          charCount: parsedOutput.caption.length,
        });
      } catch (error) {
        sendEvent(controller, {
          type: 'error',
          message: error instanceof Error ? error.message : 'Lỗi AI',
        });
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
