import { NextRequest, NextResponse } from 'next/server';
import { newsService } from '@/server/services/news.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const news = await newsService.getAllNews();
    return NextResponse.json({ success: true, data: news });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    console.error('GET /admin/api/news error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const news = await newsService.createNews(body);
    return NextResponse.json({ success: true, data: news }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    console.error('POST /admin/api/news error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
