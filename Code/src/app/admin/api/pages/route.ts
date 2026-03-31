import { NextRequest, NextResponse } from 'next/server';
import { pageService } from '@/server/services/page.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const pages = await pageService.getAllPages();
    return NextResponse.json({ success: true, data: pages });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    console.error('GET /admin/api/pages error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const page = await pageService.createPage(body);
    return NextResponse.json({ success: true, data: page }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    console.error('POST /admin/api/pages error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
