import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { fetchGoogleContext } from '@/lib/viet-bai-thong-minh/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json() as { keyword?: string; language?: string };
    if (!body.keyword?.trim()) {
      return NextResponse.json({ error: 'Keyword không hợp lệ.' }, { status: 400 });
    }

    const dataBlock = await fetchGoogleContext(body.keyword, body.language || 'Vietnamese');
    return NextResponse.json({ keyword: body.keyword, dataBlock });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? 'Chưa được xác thực.' : 'Không thể lấy dữ liệu Google.' },
      { status },
    );
  }
}
