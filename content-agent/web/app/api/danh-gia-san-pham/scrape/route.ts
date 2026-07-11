import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { scrapeProductUrl } from '@/lib/product-scraper/scraper';
import { scrapeRequestSchema } from '@/lib/product-scraper/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const rawBody = await request.json();
    const parsed = scrapeRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'URL không hợp lệ', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { url } = parsed.data;
    const data = await scrapeProductUrl(url);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể crawl URL';
    console.error('[product-scraper] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
