import { NextRequest, NextResponse } from 'next/server';
import { newsService } from '@/server/services/news.service';
import { isAppError } from '@/server/errors';

interface Props { params: Promise<{ id: string }>; }

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const news = await newsService.getNewsById(id);
    return NextResponse.json({ success: true, data: news });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await request.json();
    const news = await newsService.updateNews(id, body);
    return NextResponse.json({ success: true, data: news });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    await newsService.deleteNews(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
