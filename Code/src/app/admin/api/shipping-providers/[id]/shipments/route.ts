import { NextRequest, NextResponse } from 'next/server';
import { shippingProviderService } from '@/server/services/shipping-provider.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /admin/api/shipping-providers/:id/shipments — Danh sách vận đơn
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const result = await shippingProviderService.getShipmentsByProvider(id, {
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 20,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode } = error;
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    console.error('GET shipments error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
