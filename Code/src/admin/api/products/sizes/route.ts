import { NextResponse } from 'next/server';
import { productService } from '@/server/services/product.service';

export async function GET() {
  try {
    const sizes = await productService.getSizes();
    return NextResponse.json({ success: true, data: sizes });
  } catch (error) {
    console.error('GET /admin/api/products/sizes error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
