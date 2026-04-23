'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface UrlRecordItem {
  id: string;
  entityId: bigint | null;
  entityName: string | null;
  slug: string | null;
  isActive: boolean | null;
  isDeleted: boolean | null;
  deletedBy: string | null;
  deletedAt: Date | null;
  slugRedirect: string | null;
  isRedirect: boolean | null;
  errorCode: string | null;
}

function formatDate(date: Date | null | undefined) {
  if (!date) return '\u2014';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatEntityId(id: bigint | null) {
  if (id === null || id === undefined) return '\u2014';
  return id.toString();
}

export function UrlRecordTable({ records }: { records: UrlRecordItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(item: UrlRecordItem) {
    if (!confirm(`Xoa UrlRecord "${item.slug || 'Khong co slug'}"?`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/admin/api/url-records/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Loi'); return; }
      router.refresh();
    } catch { alert('Loi ket noi'); }
    finally { setDeletingId(null); }
  }

  if (!records.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-link fs-1 d-block mb-2"></i>
              Chua co UrlRecord nao.
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
              <th>Slug</th>
              <th>Entity Name</th>
              <th className="text-center">Entity ID</th>
              <th>Slug Redirect</th>
              <th className="text-center">Error Code</th>
              <th className="text-center">Redirect</th>
              <th className="text-center">Active</th>
              <th className="text-center">Deleted</th>
              <th className="text-center" style={{ width: 110 }}>Thao tac</th>
            </tr>
          </thead>
          <tbody>
            {records.map((item, idx) => (
              <tr key={item.id}>
                <td className="text-center">{idx + 1}</td>
                <td><code className="small">{item.slug || '\u2014'}</code></td>
                <td>{item.entityName || '\u2014'}</td>
                <td className="text-center">{formatEntityId(item.entityId)}</td>
                <td><code className="small text-primary">{item.slugRedirect || '\u2014'}</code></td>
                <td className="text-center">
                  {item.errorCode ? (
                    <span className="badge bg-warning text-dark">{item.errorCode}</span>
                  ) : (
                    <span className="text-muted">\u2014</span>
                  )}
                </td>
                <td className="text-center">
                  {item.isRedirect ? (
                    <i className="bi bi-check-lg text-success"></i>
                  ) : (
                    <span className="text-muted">\u2014</span>
                  )}
                </td>
                <td className="text-center">
                  {item.isActive ? (
                    <span className="badge bg-success">Hoat dong</span>
                  ) : (
                    <span className="badge bg-secondary">An</span>
                  )}
                </td>
                <td className="text-center">
                  {item.isDeleted ? (
                    <i className="bi bi-check-lg text-danger"></i>
                  ) : (
                    <span className="text-muted">\u2014</span>
                  )}
                </td>
                <td className="text-center">
                  <Link href={`/admin/url-records/${item.id}/edit`} className="btn-edit me-1">
                    <i className="bi bi-pencil-fill"></i>
                  </Link>
                  <button
                    className="btn-del"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
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
