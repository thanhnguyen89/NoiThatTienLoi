import { NextRequest, NextResponse } from 'next/server';
import { shippingProviderService } from '@/server/services/shipping-provider.service';
import { isAppError } from '@/server/errors';

// GET /admin/api/shipping-providers — Danh sách
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await shippingProviderService.getAllProviders({
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('status') || undefined,
      serviceType: searchParams.get('serviceType') || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 20,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('GET /admin/api/shipping-providers error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// POST /admin/api/shipping-providers — Tạo mới HOẶC bulk action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Bulk action check
    if (body.ids && body.action) {
      const { ids, action } = body;
      const results = [];

      for (const id of ids) {
        try {
          if (action === 'activate') {
            await shippingProviderService.setProviderActive(id, true);
          } else if (action === 'deactivate') {
            await shippingProviderService.setProviderActive(id, false);
          } else if (action === 'delete') {
            await shippingProviderService.deleteProvider(id);
          }
          results.push({ id, success: true });
        } catch {
          results.push({ id, success: false });
        }
      }

      return NextResponse.json({ success: true, data: results });
    }

    // Normal create
    const provider = await shippingProviderService.createProvider(body);
    return NextResponse.json({ success: true, data: provider }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/shipping-providers error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi tạo đơn vị vận chuyển' }, { status: 500 });
  }
}
