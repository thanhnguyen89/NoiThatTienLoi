import { NextRequest, NextResponse } from 'next/server';
import { warehouseService } from '@/server/services/warehouse.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /admin/api/warehouses/:id/toggle-active — Toggle active/deactive
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const warehouse = await warehouseService.toggleWarehouseActive(id);
    return NextResponse.json({ success: true, data: warehouse });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode } = error;
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    console.error('POST /admin/api/warehouses/:id/toggle-active error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
