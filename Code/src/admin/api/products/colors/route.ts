import { NextResponse } from 'next/server';
import { productService } from '@/server/services/product.service';

export async function GET() {
  try {
    const colors = await productService.getColors();
    return NextResponse.json({ success: true, data: colors });
  } catch (error) {
    console.error('GET /admin/api/products/colors error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
