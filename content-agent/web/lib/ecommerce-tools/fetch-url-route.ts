import { NextRequest, NextResponse } from 'next/server';
import { scrapeProductUrl } from '@/lib/product-scraper/scraper';

export async function handleEcommerceFetchUrl(request: NextRequest) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL khong hop le' }, { status: 400 });
    }

    const data = await scrapeProductUrl(url);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Khong the crawl URL',
      },
      { status: 500 },
    );
  }
}
