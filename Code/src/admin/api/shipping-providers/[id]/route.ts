import { NextRequest, NextResponse } from 'next/server';
import { shippingProviderService } from '@/server/services/shipping-provider.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /admin/api/shipping-providers/:id — Chi tiết
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const provider = await shippingProviderService.getProviderById(id);
    return NextResponse.json({ success: true, data: provider });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode } = error;
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    console.error('GET /admin/api/shipping-providers/:id error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// PUT /admin/api/shipping-providers/:id — Cập nhật
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const provider = await shippingProviderService.updateProvider(id, body);
    return NextResponse.json({ success: true, data: provider });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/shipping-providers/:id error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi cập nhật' }, { status: 500 });
  }
}

// DELETE /admin/api/shipping-providers/:id — Xóa mềm
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await shippingProviderService.deleteProvider(id);
    return NextResponse.json({ success: true, message: 'Đã xóa đơn vị vận chuyển' });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode } = error;
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    console.error('DELETE /admin/api/shipping-providers/:id error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi xóa' }, { status: 500 });
  }
}