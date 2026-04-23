import { NextRequest, NextResponse } from 'next/server';
import { warehouseService } from '@/server/services/warehouse.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /admin/api/warehouses/:id/stats — Thống kê chi tiết
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const [shipmentStats, detailedStats, topAreas] = await Promise.all([
      warehouseService.getShipmentStats(id),
      warehouseService.getWarehouseDetailedStats(id),
      warehouseService.getTopDeliveryAreas(id),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        shipmentStats,
        detailedStats,
        topAreas,
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode } = error;
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
    console.error('GET /admin/api/warehouses/:id/stats error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
