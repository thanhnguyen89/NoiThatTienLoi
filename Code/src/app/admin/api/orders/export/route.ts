import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/server/services/order.service';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

/**
 * Export orders to Excel
 * GET /admin/api/orders/export
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get all orders with filters (no pagination for export)
    const result = await orderService.getAllOrders({
      page: 1,
      pageSize: 10000, // Export maximum 10k orders
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      paymentStatus: searchParams.get('paymentStatus') || undefined,
      customerType: searchParams.get('customerType') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined,
      priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined,
    });

    const orders = result.data;

    if (orders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không có đơn hàng nào để xuất' },
        { status: 400 }
      );
    }

    // Prepare data for Excel
    const excelData = orders.map((order, index) => ({
      'STT': index + 1,
      'Mã đơn': order.orderNo,
      'Ngày đặt': order.placedAt ? new Date(order.placedAt).toLocaleString('vi-VN') : '',
      'Khách hàng': order.customerName || '',
      'Số điện thoại': order.customerPhone || '',
      'Email': order.customerEmail || '',
      'Loại khách': order.customerType === 'member' ? 'Thành viên' : 'Khách vãng lai',
      'Tổng tiền': order.grandTotalAmount,
      'Đã cọc': order.depositAmount,
      'Còn lại': order.remainingAmount,
      'Trạng thái đơn': getOrderStatusLabel(order.orderStatus),
      'Trạng thái TT': getPaymentStatusLabel(order.paymentStatus),
      'Địa chỉ giao hàng': order.shippingFullAddress || '',
      'Ghi chú khách': order.customerNote || '',
      'Ghi chú nội bộ': order.internalNote || '',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // STT
      { wch: 12 },  // Mã đơn
      { wch: 18 },  // Ngày đặt
      { wch: 20 },  // Khách hàng
      { wch: 12 },  // SĐT
      { wch: 25 },  // Email
      { wch: 12 },  // Loại khách
      { wch: 15 },  // Tổng tiền
      { wch: 12 },  // Đã cọc
      { wch: 12 },  // Còn lại
      { wch: 15 },  // Trạng thái đơn
      { wch: 15 },  // Trạng thái TT
      { wch: 40 },  // Địa chỉ
      { wch: 30 },  // Ghi chú khách
      { wch: 30 },  // Ghi chú nội bộ
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Đơn hàng');

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return as downloadable file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="orders_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export orders error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xuất file Excel' },
      { status: 500 }
    );
  }
}

function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    processing: 'Đang xử lý',
    shipping: 'Đang giao',
    delivered: 'Đã giao',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    returned: 'Trả hàng',
  };
  return labels[status] || status;
}

function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    unpaid: 'Chưa thanh toán',
    partially_paid: 'Thanh toán 1 phần',
    paid: 'Đã thanh toán',
    refunded: 'Đã hoàn tiền',
    partially_refunded: 'Hoàn tiền 1 phần',
  };
  return labels[status] || status;
}
