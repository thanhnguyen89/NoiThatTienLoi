import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server-auth';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildOutlinePrompt } from '@/lib/viet-tu-google-search/prompt-builder';
import type { VtgsConfig } from '@/lib/viet-tu-google-search/types';

export const runtime = 'nodejs';

const schema = z.object({
  config: z.record(z.unknown()),
  searchResult: z.record(z.unknown()).nullable().optional(),
});

function fallbackOutline(config: VtgsConfig): string {
  const keyword = config.keyword || 'chu de';
  return [
    `[h2] Tong quan ve ${keyword}`,
    `[h3] ${keyword} la gi va khi nao nen quan tam`,
    `[h2] Nhu cau tim kiem va cac tieu chi quan trong`,
    `[h3] Tieu chi chon lua theo ngan sach va muc dich`,
    `[h2] So sanh cac lua chon pho bien`,
    `[h3] Uu diem, han che va tinh huong nen dung`,
    `[h2] Kinh nghiem thuc te khi ap dung ${keyword}`,
    `[h3] Loi thuong gap va cach tranh`,
    `[h2] Cau hoi thuong gap ve ${keyword}`,
    `[h2] Ket luan va goi y hanh dong`,
  ].join('\n');
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const config = parsed.data.config as unknown as VtgsConfig;
    const searchResult = parsed.data.searchResult as never;

    try {
      const model = buildTinhGonModel(config.modelId || 'gemini-flash');
      const result = await model.generateContent(buildOutlinePrompt(config, searchResult));
      const outline = result.response.text().trim();
      return NextResponse.json({ outline: outline || fallbackOutline(config) });
    } catch {
      return NextResponse.json({ outline: fallbackOutline(config) });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
