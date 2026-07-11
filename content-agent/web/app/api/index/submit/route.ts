import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { runPostPublishActions } from '@/lib/shared/post-publish';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const url = typeof body.url === 'string' ? body.url.trim() : '';

    if (!url) {
      return NextResponse.json({ success: false, error: 'Missing url' }, { status: 400 });
    }

    const result = await runPostPublishActions({
      url,
      sitemapUrl: typeof body.sitemapUrl === 'string' ? body.sitemapUrl : undefined,
      bingApiKey: process.env.BING_INDEX_NOW_KEY,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[index/submit] Error:', error);
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: status === 401 ? 'Unauthorized' : 'Internal server error' }, { status });
  }
}
