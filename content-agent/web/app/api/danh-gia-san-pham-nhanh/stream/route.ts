import { NextRequest } from 'next/server';
import { z } from 'zod';
import { countWords, sseEvent, streamText } from '@/lib/ecommerce-tools/core';
import { buildProductReviewPrompt } from '@/lib/danh-gia-san-pham-nhanh/prompt-builder';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({
  productName: z.string().trim().min(1).max(300),
  specs: z.string().max(3000).default(''),
  pros: z.string().max(1500).default(''),
  cons: z.string().max(1500).default(''),
  useCase: z.string().max(800).default(''),
  persona: z.enum(['real_user', 'blogger', 'expert']).default('real_user'),
  overallRating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).default(4),
  language: z.string().default('Vietnamese'),
  modelId: z.string().default('gemini-flash'),
  brandName: z.string().default(''),
  forbidden: z.string().default(''),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ type: 'error', message: parsed.error.errors[0]?.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const prompt = buildProductReviewPrompt(parsed.data);
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const output = await streamText(prompt, parsed.data.modelId, (chunk) => {
            sseEvent(controller, { type: 'chunk', text: chunk });
          });
          sseEvent(controller, { type: 'done', wordCount: countWords(output) });
        } catch (error) {
          sseEvent(controller, {
            type: 'error',
            message: error instanceof Error ? error.message : 'Khong the tao danh gia san pham',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Loi server' }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  }
}
