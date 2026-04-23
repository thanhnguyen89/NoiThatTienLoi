import { NextRequest, NextResponse } from 'next/server';
import { warehouseService } from '@/server/services/warehouse.service';
import type { WarehouseListItem } from '@/server/repositories/warehouse.repository';

// ── GET /admin/api/warehouses/export — Xuất Excel danh sách kho
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Fetch all matching records (no pagination limit for export)
    const result = await warehouseService.getAllWarehousesForExport({
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('status') || undefined,
      region: searchParams.get('region') || undefined,
    });

    // Dynamically import xlsx to keep this route lean
    const XLSX = await import('xlsx');

    const rows: Record<string, unknown>[] = result.map((w: WarehouseListItem, idx: number) => ({
      'STT': idx + 1,
      'Mã kho': w.code || '',
      'Tên kho': w.name,
      'Người quản lý': w.contactName || '',
      'SĐT liên hệ': w.contactPhone || '',
      'Địa chỉ': w.fullAddress || [w.addressLine, w.wardName, w.districtName, w.provinceName].filter(Boolean).join(', '),
      'Tỉnh/TP': w.provinceName || '',
      'Quận/Huyện': w.districtName || '',
      'Phường/Xã': w.wardName || '',
      'Kinh độ': w.latitude ?? '',
      'Vĩ độ': w.longitude ?? '',
      'Trạng thái': w.isActive ? 'Hoạt động' : 'Tạm đóng',
      'Số lô xuất': w._count?.shipments ?? 0,
      'Ngày tạo': w.createdAt ? new Date(w.createdAt).toLocaleDateString('vi-VN') : '',
      'Cập nhật cuối': w.updatedAt ? new Date(w.updatedAt).toLocaleDateString('vi-VN') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách kho');

    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] ?? '').length)) + 2,
    }));
    ws['!cols'] = colWidths;

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const filename = `danh-sach-kho-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error('GET /admin/api/warehouses/export error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
