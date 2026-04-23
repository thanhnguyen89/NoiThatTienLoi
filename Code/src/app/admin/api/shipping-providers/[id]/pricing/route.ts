import { NextRequest, NextResponse } from 'next/server';
import { shippingProviderPricingService } from '@/server/services/shipping-provider-pricing.service';
import { isAppError } from '@/server/errors';

// GET /admin/api/shipping-providers/:id/pricing — Danh sách giá
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const vehicle = searchParams.get('vehicle');
    const pricing = await shippingProviderPricingService.getPricingByProvider(id, vehicle);
    return NextResponse.json({ success: true, data: pricing });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode } = error;
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    console.error('GET pricing error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// POST /admin/api/shipping-providers/:id/pricing — Tạo mức giá
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const pricing = await shippingProviderPricingService.createPricing({
      ...body,
      shippingProviderId: id,
    });
    return NextResponse.json({ success: true, data: pricing }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST pricing error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi tạo mức giá' }, { status: 500 });
  }
}

// PUT /admin/api/shipping-providers/:id/pricing — Thay thế tất cả bảng giá (bulk replace)
// DELETE /admin/api/shipping-providers/:id/pricing — Xóa tất cả bảng giá

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const vehicle = typeof body.vehicle === 'string' ? body.vehicle : 'motorbike';
    const surcharges = body.surcharges;
    const discountPolicies = body.discountPolicies;
    await shippingProviderPricingService.replaceAllPricing(id, vehicle, rows, surcharges, discountPolicies);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT pricing error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi cập nhật bảng giá' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const vehicle = searchParams.get('vehicle') || 'motorbike';
    await shippingProviderPricingService.replaceAllPricing(id, vehicle, []);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode } = error;
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    console.error('DELETE pricing error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi xóa bảng giá' }, { status: 500 });
  }
}