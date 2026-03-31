import { NextRequest, NextResponse } from 'next/server';
import { newsCategoryService } from '@/server/services/news-category.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const cats = await newsCategoryService.getAllCategories();
    return NextResponse.json({ success: true, data: cats });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    console.error('GET /admin/api/news-categories error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cat = await newsCategoryService.createCategory(body);
    return NextResponse.json({ success: true, data: cat }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    console.error('POST /admin/api/news-categories error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
