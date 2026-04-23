import { NextRequest, NextResponse } from 'next/server';
import { warehouseService } from '@/server/services/warehouse.service';
import { isAppError } from '@/server/errors';

// GET /admin/api/warehouses — Danh sách
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await warehouseService.getAllWarehouses({
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('status') || undefined,
      region: searchParams.get('region') || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 20,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('GET /admin/api/warehouses error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// POST /admin/api/warehouses — Tạo mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const warehouse = await warehouseService.createWarehouse(body);
    return NextResponse.json({ success: true, data: warehouse }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/warehouses error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi tạo kho hàng' }, { status: 500 });
  }
}
