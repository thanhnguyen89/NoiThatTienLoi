import { NextRequest, NextResponse } from 'next/server';
import { warehouseService } from '@/server/services/warehouse.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /admin/api/warehouses/:id — Chi tiết
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const warehouse = await warehouseService.getWarehouseById(id);
    return NextResponse.json({ success: true, data: warehouse });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode } = error;
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    console.error('GET /admin/api/warehouses/:id error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// PUT /admin/api/warehouses/:id — Cập nhật
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const warehouse = await warehouseService.updateWarehouse(id, body);
    return NextResponse.json({ success: true, data: warehouse });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/warehouses/:id error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi cập nhật' }, { status: 500 });
  }
}

// DELETE /admin/api/warehouses/:id — Xóa mềm
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await warehouseService.deleteWarehouse(id);
    return NextResponse.json({ success: true, message: 'Đã xóa kho hàng' });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode } = error;
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    console.error('DELETE /admin/api/warehouses/:id error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi xóa' }, { status: 500 });
  }
}
