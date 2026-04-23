import { NextRequest, NextResponse } from 'next/server';
import { shippingProviderService } from '@/server/services/shipping-provider.service';

// GET /admin/api/shipping-providers/compare — So sánh các đơn vị
export async function GET(_request: NextRequest) {
  try {
    const providers = await shippingProviderService.getAllForComparison();
    return NextResponse.json({ success: true, data: providers });
  } catch (error) {
    console.error('GET compare error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
