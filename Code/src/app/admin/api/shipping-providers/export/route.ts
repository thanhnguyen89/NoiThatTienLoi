import { NextRequest, NextResponse } from 'next/server';
import { shippingProviderService } from '@/server/services/shipping-provider.service';
import * as XLSX from 'xlsx';

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatServiceTypes(types: string[] | null | undefined): string {
  if (!types || types.length === 0) return '';
  const map: Record<string, string> = {
    standard: 'Tiêu chuẩn',
    express: 'Nhanh',
    same_day: 'Trong ngày',
    scheduled: 'Hẹn lịch',
    other: 'Khác',
  };
  return types.map((t) => map[t] || t).join(', ');
}

function formatVehicles(vehicles: string[] | null | undefined): string {
  if (!vehicles || vehicles.length === 0) return '';
  const map: Record<string, string> = {
    motorbike: 'Xe máy',
    van: 'Xe van',
    truck: 'Xe tải',
    airplane: 'Máy bay',
  };
  return vehicles.map((v) => map[v] || v).join(', ');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const isActive = searchParams.get('status') || undefined;
    const serviceType = searchParams.get('serviceType') || undefined;

    const providers = await shippingProviderService.exportAllProviders({ search, isActive, serviceType });

    // Build worksheet data
    const rows = providers.map((p) => ({
      'Mã ĐV': p.code || '',
      'Tên đơn vị': p.name,
      'Số điện thoại': p.phone || '',
      'Website': p.website || '',
      'Trạng thái': p.isActive ? 'Hoạt động' : 'Tạm ngưng',
      'Loại dịch vụ': formatServiceTypes(p.serviceTypes),
      'Phương tiện': formatVehicles(p.vehicles),
      'Số vận đơn': p._count?.shipments ?? 0,
      'Ghi chú': p.note || '',
      'Ngày tạo': formatDate(p.createdAt),
      'Cập nhật lần cuối': formatDate(p.updatedAt),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
      { wch: 10 }, // Mã ĐV
      { wch: 30 }, // Tên đơn vị
      { wch: 15 }, // SĐT
      { wch: 30 }, // Website
      { wch: 12 }, // Trạng thái
      { wch: 20 }, // Loại dịch vụ
      { wch: 20 }, // Phương tiện
      { wch: 12 }, // Số vận đơn
      { wch: 40 }, // Ghi chú
      { wch: 14 }, // Ngày tạo
      { wch: 20 }, // Cập nhật lần cuối
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Đơn vị vận chuyển');

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `don-vi-van-chuyen_${timestamp}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error('GET /admin/api/shipping-providers/export error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi xuất Excel' }, { status: 500 });
  }
}