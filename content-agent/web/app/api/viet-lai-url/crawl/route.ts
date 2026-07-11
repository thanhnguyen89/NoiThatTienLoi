import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server-auth';
import { crawlUrlWithHeadings } from '@/lib/viet-lai-url/crawler';

export const runtime = 'nodejs';

const crawlSchema = z.object({
  url: z.string().url('URL không hợp lệ'),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const rawBody = await request.json();
    const parsed = crawlSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'URL không hợp lệ' },
        { status: 400 },
      );
    }

    try {
      const result = await crawlUrlWithHeadings(parsed.data.url);
      return NextResponse.json({
        url: parsed.data.url,
        title: result.title,
        headings: result.headings,
        content: result.content,
        warning: result.warning,
      });
    } catch (crawlError) {
      return NextResponse.json(
        {
          error: crawlError instanceof Error ? crawlError.message : 'Không thể đọc nội dung URL',
        },
        { status: 422 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
