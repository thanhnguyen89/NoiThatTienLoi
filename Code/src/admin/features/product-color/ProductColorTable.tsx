'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ProductColorItem {
  id: string;
  colorName: string;
  colorCode: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  _count: { variants: number };
}

function formatDate(date: Date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function ProductColorTable({ colors }: { colors: ProductColorItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(color: ProductColorItem) {
    if (!confirm(`Xóa màu sắc "${color.colorName}"?`)) return;
    setDeletingId(color.id);
    try {
      const res = await fetch(`/admin/api/product-colors/${color.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!colors.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-palette2 fs-1 d-block mb-2"></i>
              Không tìm thấy màu sắc nào.
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
              <th style={{ width: 120 }}>Mã màu</th>
              <th>Tên màu sắc</th>
              <th style={{ width: 100 }}>Ngày tạo</th>
              <th className="text-center" style={{ width: 110 }}>ProductVariant</th>
              <th className="text-center" style={{ width: 110 }}>Thứ tự</th>
              <th className="text-center" style={{ width: 80 }}>Trạng thái</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {colors.map((color, idx) => (
              <tr key={color.id}>
                <td className="text-center">{idx + 1}</td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    {color.colorCode ? (
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          backgroundColor: color.colorCode,
                          border: '1px solid #dee2e6',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                    <code className="small">{color.colorCode || '—'}</code>
                  </div>
                </td>
                <td>
                  <div className="fw-semibold small">{color.colorName}</div>
                </td>
                <td>{formatDate(color.createdAt)}</td>
                <td className="text-center">{color._count.variants}</td>
                <td className="text-center">{color.sortOrder}</td>
                <td className="text-center">
                  {color.isActive ? (
                    <span className="badge bg-success">● Hoạt động</span>
                  ) : (
                    <span className="badge bg-secondary">● Ẩn</span>
                  )}
                </td>
                <td className="text-center">
                  <Link href={`/admin/product-colors/${color.id}/edit`} className="btn-edit me-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className="btn-del"
                    onClick={() => handleDelete(color)}
                    disabled={deletingId === color.id}
                  >
                    {deletingId === color.id ? (
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
