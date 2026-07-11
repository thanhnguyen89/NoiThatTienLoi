import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { crawlText } from '@/lib/viet-bai-thong-minh/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json() as { url?: string };
    if (!body.url || !/^https?:\/\//i.test(body.url)) {
      return NextResponse.json({ error: 'URL không hợp lệ.' }, { status: 400 });
    }

    const text = await crawlText(body.url);
    return NextResponse.json({ url: body.url, text });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? 'Chưa được xác thực.' : 'Không thể đọc URL.' },
      { status },
    );
  }
}
