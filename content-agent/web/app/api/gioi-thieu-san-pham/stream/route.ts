import { NextRequest } from 'next/server';
import { z } from 'zod';
import { countWords, sseEvent, streamText } from '@/lib/ecommerce-tools/core';
import { buildProductDescriptionPrompt } from '@/lib/gioi-thieu-san-pham/prompt-builder';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({
  productName: z.string().trim().min(1).max(300),
  specs: z.string().max(3000).default(''),
  keyBenefits: z.string().max(1500).default(''),
  targetCustomer: z.string().max(500).default(''),
  length: z.enum(['short', 'standard', 'detailed']).default('standard'),
  format: z.enum(['prose', 'structured']).default('prose'),
  tone: z.enum(['friendly', 'professional', 'persuasive', 'casual']).default('friendly'),
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

    const prompt = buildProductDescriptionPrompt(parsed.data);
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
            message: error instanceof Error ? error.message : 'Khong the tao gioi thieu san pham',
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
