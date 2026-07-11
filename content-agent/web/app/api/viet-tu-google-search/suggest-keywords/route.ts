import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server-auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';

export const runtime = 'nodejs';

const schema = z.object({
  keyword: z.string().min(2),
  count: z.number().min(3).max(20).default(8),
  modelId: z.string().default('gemini-flash'),
});

function fallbackKeywords(keyword: string, count: number): string[] {
  const base = keyword.trim();
  return [
    `${base} la gi`,
    `cach chon ${base}`,
    `${base} tot nhat`,
    `${base} gia bao nhieu`,
    `${base} uu nhuoc diem`,
    `${base} kinh nghiem mua`,
    `${base} so sanh`,
    `${base} 2026`,
    `${base} cho gia dinh`,
    `${base} gan day`,
  ].slice(0, count);
}

function parseKeywords(raw: string, count: number): string[] {
  return raw
    .split(/\n|,|;/)
    .map((item) => item.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, count);
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { keyword, count, modelId } = parsed.data;

    try {
      const model = buildTinhGonModel(modelId);
      const result = await model.generateContent(`
Suggest ${count} Vietnamese SEO secondary keywords for: "${keyword}".
Return each keyword on one line only. No numbering, no explanation.
`.trim());
      const keywords = parseKeywords(result.response.text(), count);
      return NextResponse.json({ keywords: keywords.length ? keywords : fallbackKeywords(keyword, count) });
    } catch {
      return NextResponse.json({ keywords: fallbackKeywords(keyword, count) });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
