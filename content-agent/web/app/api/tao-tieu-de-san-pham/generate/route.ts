import { NextRequest } from 'next/server';
import { z } from 'zod';
import { fallbackParseProductMeta, generateText, safeJsonParse, sseEvent } from '@/lib/ecommerce-tools/core';
import { buildProductMetaPrompt } from '@/lib/tao-tieu-de-san-pham/prompt-builder';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({
  productName: z.string().trim().min(1).max(300),
  productFeatures: z.string().max(3000).default(''),
  tone: z.string().default('seo_focus'),
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

    const prompt = buildProductMetaPrompt(parsed.data);
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const raw = await generateText(prompt, parsed.data.modelId);
          const json = safeJsonParse<{ titles?: string[]; description?: string }>(raw);
          const output = json?.titles?.length ? json : fallbackParseProductMeta(raw);

          output.titles?.slice(0, 5).forEach((title, index) => {
            sseEvent(controller, { type: 'title', index, text: title });
          });
          sseEvent(controller, { type: 'desc', text: output.description ?? '' });
          sseEvent(controller, { type: 'done' });
        } catch (error) {
          sseEvent(controller, {
            type: 'error',
            message: error instanceof Error ? error.message : 'Khong the tao tieu de san pham',
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
