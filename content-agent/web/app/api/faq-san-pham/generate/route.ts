import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildFaqSchema, generateText, safeJsonParse, sseEvent } from '@/lib/ecommerce-tools/core';
import { buildFaqPrompt, type FaqType } from '@/lib/faq-san-pham/prompt-builder';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({
  productName: z.string().trim().min(1).max(300),
  specs: z.string().max(3000).default(''),
  useCase: z.string().max(1000).default(''),
  commonConcerns: z.string().max(1000).default(''),
  faqTypes: z.array(z.enum(['general', 'technical', 'purchase'])).min(1).default(['general']),
  count: z.union([z.literal(5), z.literal(7), z.literal(10)]).default(7),
  includeSchema: z.boolean().default(true),
  language: z.string().default('Vietnamese'),
  modelId: z.string().default('gemini-flash'),
  brandName: z.string().default(''),
  shopPhone: z.string().default(''),
  shopAddress: z.string().default(''),
});

interface FaqItem {
  question: string;
  answer: string;
  type?: FaqType;
}

function fallbackParse(raw: string): FaqItem[] {
  const blocks = raw.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const items: FaqItem[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const question = lines.find((line) => /^q\d*[:.)\s]/i.test(line) || line.endsWith('?'));
    const answer = lines.find((line) => /^a\d*[:.)\s]/i.test(line)) ?? lines.find((line) => line !== question);
    if (!question || !answer) continue;

    items.push({
      question: question.replace(/^q\d*[:.)\s-]*/i, '').replace(/\[type:[^\]]+\]/i, '').trim(),
      answer: answer.replace(/^a\d*[:.)\s-]*/i, '').trim(),
      type: 'general',
    });
  }

  return items;
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

    const prompt = buildFaqPrompt(parsed.data);
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const raw = await generateText(prompt, parsed.data.modelId);
          const json = safeJsonParse<{ faqs?: FaqItem[] }>(raw);
          const faqs = (json?.faqs?.length ? json.faqs : fallbackParse(raw)).slice(0, parsed.data.count);

          faqs.forEach((item, index) => {
            sseEvent(controller, {
              type: 'faq',
              index,
              question: item.question,
              answer: item.answer,
              faqType: item.type ?? 'general',
            });
          });
          sseEvent(controller, {
            type: 'done',
            schema: parsed.data.includeSchema
              ? buildFaqSchema(faqs.map((item) => ({ question: item.question, answer: item.answer })))
              : undefined,
          });
        } catch (error) {
          sseEvent(controller, {
            type: 'error',
            message: error instanceof Error ? error.message : 'Khong the tao FAQ san pham',
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
