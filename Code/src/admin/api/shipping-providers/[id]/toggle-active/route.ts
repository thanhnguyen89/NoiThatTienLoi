import { NextRequest, NextResponse } from 'next/server';
import { shippingProviderService } from '@/server/services/shipping-provider.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /admin/api/shipping-providers/:id/toggle-active — Toggle active/inactive
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const provider = await shippingProviderService.toggleProviderActive(id);
    return NextResponse.json({ success: true, data: provider });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode } = error;
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    console.error('POST /admin/api/shipping-providers/:id/toggle-active error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}