import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server-auth';
import { crawlUrls } from '@/lib/viet-theo-nguon/crawler';

export const runtime = 'nodejs';
export const maxDuration = 30;

const crawlSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(5),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const rawBody = await request.json();
    const parsed = crawlSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'URL không hợp lệ', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { urls } = parsed.data;
    const sources = await crawlUrls(urls);
    return NextResponse.json({ sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
