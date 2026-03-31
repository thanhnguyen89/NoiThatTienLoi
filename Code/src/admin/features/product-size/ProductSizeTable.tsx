'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ProductSizeItem {
  id: string;
  sizeLabel: string;
  widthCm: number | null;
  lengthCm: number | null;
  heightCm: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  _count: { variants: number };
}

function formatDate(date: Date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function ProductSizeTable({ sizes }: { sizes: ProductSizeItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(size: ProductSizeItem) {
    if (!confirm(`Xóa kích thước "${size.sizeLabel}"?`)) return;
    setDeletingId(size.id);
    try {
      const res = await fetch(`/admin/api/product-sizes/${size.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!sizes.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-rulers fs-1 d-block mb-2"></i>
              Không tìm thấy kích thước nào.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <>
      <div className="table-responsive">
        <table className="table table-bordered mb-0 w-100">
          <thead>
            <tr>
              <th className="text-center" style={{ width: 50 }}>STT</th>
              <th>Tên kích thước</th>
              <th style={{ width: 120 }}>Ngày tạo</th>
              <th className="text-center" style={{ width: 100 }}>Chiều rộng (cm)</th>
              <th className="text-center" style={{ width: 100 }}>Chiều dài (cm)</th>
              <th className="text-center" style={{ width: 100 }}>Chiều cao (cm)</th>
              <th className="text-center" style={{ width: 110 }}>Biến thể</th>
              <th className="text-center" style={{ width: 80 }}>Thứ tự</th>
              <th className="text-center" style={{ width: 80 }}>Trạng thái</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {sizes.map((size, idx) => (
              <tr key={size.id}>
                <td className="text-center">{idx + 1}</td>
                <td>
                  <div className="fw-semibold small">{size.sizeLabel}</div>
                </td>
                <td>{formatDate(size.createdAt)}</td>
                <td className="text-center">{size.widthCm ?? '—'}</td>
                <td className="text-center">{size.lengthCm ?? '—'}</td>
                <td className="text-center">{size.heightCm ?? '—'}</td>
                <td className="text-center">{size._count.variants}</td>
                <td className="text-center">{size.sortOrder}</td>
                <td className="text-center">
                  {size.isActive ? (
                    <span className="badge bg-success">● Hoạt động</span>
                  ) : (
                    <span className="badge bg-secondary">● Ẩn</span>
                  )}
                </td>
                <td className="text-center">
                  <Link href={`/admin/product-sizes/${size.id}/edit`} className="btn-edit me-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className="btn-del"
                    onClick={() => handleDelete(size)}
                    disabled={deletingId === size.id}
                  >
                    {deletingId === size.id ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      <i className="bi bi-trash-fill"></i>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
