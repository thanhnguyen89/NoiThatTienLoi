import { NextRequest } from 'next/server';
import { z } from 'zod';
import { generateText, safeJsonParse, sseEvent } from '@/lib/ecommerce-tools/core';
import { buildProductNamePrompt } from '@/lib/tao-ten-san-pham/prompt-builder';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({
  productType: z.string().trim().min(1).max(300),
  material: z.string().max(1000).default(''),
  keyFeatures: z.string().max(1000).default(''),
  targetCustomer: z.string().max(500).default(''),
  priceSegment: z.enum(['budget', 'mid', 'premium']).default('mid'),
  language: z.string().default('Vietnamese'),
  modelId: z.string().default('gemini-flash'),
  brandName: z.string().default(''),
  forbidden: z.string().default(''),
});

interface NameItem {
  name: string;
  style?: string;
  reason?: string;
}

function fallbackParse(raw: string): NameItem[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const clean = line.replace(/^\d+[\.)]\s*/, '').trim();
      const parts = clean.split('|').map((item) => item.trim());
      return {
        name: parts[0] ?? clean,
        style: parts[1] ?? 'descriptive',
        reason: parts[2] ?? '',
      };
    })
    .filter((item) => item.name)
    .slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ type: 'error', message: parsed.error.errors[0]?.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const prompt = buildProductNamePrompt(parsed.data);
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const raw = await generateText(prompt, parsed.data.modelId);
          const json = safeJsonParse<{ names?: NameItem[] }>(raw);
          const names = json?.names?.length ? json.names : fallbackParse(raw);

          names.slice(0, 10).forEach((item, index) => {
            sseEvent(controller, {
              type: 'name',
              index,
              name: item.name,
              style: item.style ?? 'descriptive',
              reason: item.reason ?? '',
            });
          });
          sseEvent(controller, { type: 'done' });
        } catch (error) {
          sseEvent(controller, {
            type: 'error',
            message: error instanceof Error ? error.message : 'Khong the tao ten san pham',
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
