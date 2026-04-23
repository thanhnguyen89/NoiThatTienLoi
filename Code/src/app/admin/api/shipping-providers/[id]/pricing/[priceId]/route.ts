import { NextRequest, NextResponse } from 'next/server';
import { shippingProviderPricingService } from '@/server/services/shipping-provider-pricing.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string; priceId: string }>;
}

// PUT /admin/api/shipping-providers/:id/pricing/:priceId
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { priceId } = await context.params;
    const body = await request.json();
    const pricing = await shippingProviderPricingService.updatePricing(priceId, body);
    return NextResponse.json({ success: true, data: pricing });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT pricing/:priceId error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi cập nhật mức giá' }, { status: 500 });
  }
}

// DELETE /admin/api/shipping-providers/:id/pricing/:priceId
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { priceId } = await context.params;
    await shippingProviderPricingService.deletePricing(priceId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode } = error;
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    console.error('DELETE pricing/:priceId error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi xóa mức giá' }, { status: 500 });
  }
}