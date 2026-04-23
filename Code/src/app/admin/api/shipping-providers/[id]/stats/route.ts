import { NextRequest, NextResponse } from 'next/server';
import { shippingProviderService } from '@/server/services/shipping-provider.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /admin/api/shipping-providers/:id/stats
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const [stats, comparison] = await Promise.all([
      shippingProviderService.getProviderStats(id),
      shippingProviderService.getAllForComparison(),
    ]);
    return NextResponse.json({ success: true, data: { stats, comparison } });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode } = error;
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    console.error('GET stats error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
