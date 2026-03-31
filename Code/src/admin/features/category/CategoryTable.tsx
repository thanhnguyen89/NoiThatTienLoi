'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  isShowHome: boolean;
  viewCount: number;
  createdAt: Date;
  robots: string | null;
  parent?: { id: string; name: string } | null;
  _count: { products: number };
}

function formatDate(date: Date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function CategoryTable({ categories }: { categories: CategoryItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(cat: CategoryItem) {
    if (!confirm(`Xóa danh mục "${cat.name}"?`)) return;
    setDeletingId(cat.id);
    try {
      const res = await fetch(`/admin/api/categories/${cat.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Lỗi'); return; }
      router.refresh();
    } catch { alert('Lỗi kết nối'); }
    finally { setDeletingId(null); }
  }

  if (!categories.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-folder2-open fs-1 d-block mb-2"></i>
              Không tìm thấy danh mục nào.
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
              <th style={{ width: 100 }}>Mã danh mục</th>
              <th>Tên danh mục</th>
              <th style={{ width: 110 }}>Ngày tạo</th>
              <th className="text-center" style={{ width: 80 }}>Robot</th>
              <th className="text-center" style={{ width: 90 }}>Lượt xem</th>
              <th className="text-center" style={{ width: 110 }}>Thứ tự hiển thị</th>
              <th className="text-center" style={{ width: 80 }}>Công khai</th>
              <th className="text-center" style={{ width: 80 }}>Hình ảnh</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, idx) => (
              <tr key={cat.id}>
                <td className="text-center">{idx + 1}</td>
                <td><code className="small">{cat.code || '—'}</code></td>
                <td>
                  <div>
                    <div className="fw-semibold small">{cat.name}</div>
                    {cat.parent?.name && (
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        <i className="bi bi-arrow-return-right me-1"></i>{cat.parent.name}
                      </div>
                    )}
                  </div>
                </td>
                <td>{formatDate(cat.createdAt)}</td>
                <td className="text-center">
                  {cat.robots ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">{cat.viewCount}</td>
                <td className="text-center">{cat.sortOrder}</td>
                <td className="text-center">
                  {cat.isActive ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-center">
                  <Link href={`/admin/categories/${cat.id}/edit`} className="btn-edit me-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className="btn-del"
                    onClick={() => handleDelete(cat)}
                    disabled={deletingId === cat.id}
                  >
                    {deletingId === cat.id ? (
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
