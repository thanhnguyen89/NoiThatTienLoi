import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/server/services/product.service';
import { parseAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /admin/api/products/:id/sales-stats
 * Lấy thống kê số lượng bán theo ngày/tuần/tháng/năm
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const stats = await productService.getProductSalesStatistics(id);
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    const appError = parseAppError(error);
    return NextResponse.json(
      { success: false, error: appError.message },
      { status: appError.statusCode }
    );
  }
}
