import { NextResponse } from 'next/server';
import { categoryService } from '@/server/services/category.service';

/**
 * GET /api/categories - Public: lấy cây danh mục
 */
export async function GET() {
  try {
    const categories = await categoryService.getCategoryTree();
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy danh mục' },
      { status: 500 }
    );
  }
}
