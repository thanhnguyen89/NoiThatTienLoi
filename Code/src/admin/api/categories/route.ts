import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/server/services/category.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const categories = await categoryService.getAdminCategories();
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('GET /admin/api/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy danh mục' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const category = await categoryService.createCategory(body);
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo danh mục' },
      { status: 500 }
    );
  }
}
