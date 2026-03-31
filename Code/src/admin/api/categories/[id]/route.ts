import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/server/services/category.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const category = await categoryService.getCategoryById(id);
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy danh mục' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error('GET /admin/api/categories/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi server' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const category = await categoryService.updateCategory(id, body);
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/categories/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật danh mục' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await categoryService.deleteCategory(id);
    return NextResponse.json({ success: true, message: 'Đã xóa danh mục' });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode } = error;
      return NextResponse.json(
        { success: false, error: message, code },
        { status: statusCode }
      );
    }
    console.error('DELETE /admin/api/categories/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa danh mục' },
      { status: 500 }
    );
  }
}
