'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { toast } from '@/admin/components/Toast';

interface NewsCategoryItem {
  id: string;
  parentId: string | null;
  title: string | null;
  summary: string | null;
  imageUrl: string | null;
  seName: string | null;
  isShowHome: boolean | null;
  isActive: boolean | null;
  sortOrder: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  categoryLevel: number | null;
}

interface TreeNode extends NewsCategoryItem {
  children: TreeNode[];
  childrenCount: number;
}

function formatDate(date: Date | null | undefined) {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Build tree structure from flat list
 */
function buildTree(categories: NewsCategoryItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Initialize all nodes
  categories.forEach(cat => {
    map.set(cat.id, { ...cat, children: [], childrenCount: 0 });
  });

  // Build tree
  categories.forEach(cat => {
    const node = map.get(cat.id)!;
    if (cat.parentId && map.has(cat.parentId)) {
      const parent = map.get(cat.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Calculate children count recursively
  function calculateChildrenCount(node: TreeNode): number {
    let count = node.children.length;
    node.children.forEach(child => {
      count += calculateChildrenCount(child);
    });
    node.childrenCount = count;
    return count;
  }

  roots.forEach(calculateChildrenCount);

  // Sort by sortOrder
  function sortTree(nodes: TreeNode[]) {
    nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    nodes.forEach(node => sortTree(node.children));
  }
  sortTree(roots);

  return roots;
}

/**
 * Flatten tree to array with level info
 */
function flattenTree(tree: TreeNode[], level = 0, result: (TreeNode & { _level: number })[] = []): (TreeNode & { _level: number })[] {
  tree.forEach(node => {
    result.push({ ...node, _level: level });
    if (node.children.length > 0) {
      flattenTree(node.children, level + 1, result);
    }
  });
  return result;
}

export function NewsCategoryTable({ categories }: { categories: NewsCategoryItem[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [bulkLoading, setBulkLoading]   = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Build tree structure
  const treeData = useMemo(() => {
    const tree = buildTree(categories);
    return flattenTree(tree);
  }, [categories]);

  // Filter collapsed nodes
  const visibleData = useMemo(() => {
    const result: typeof treeData = [];
    const skipUntilLevel = new Map<number, boolean>();

    treeData.forEach(node => {
      // Check if any parent is collapsed
      let shouldSkip = false;
      for (let i = 0; i < node._level; i++) {
        if (skipUntilLevel.get(i)) {
          shouldSkip = true;
          break;
        }
      }

      if (!shouldSkip) {
        result.push(node);
        
        // If this node is collapsed, mark to skip its children
        if (collapsedIds.has(node.id) && node.children.length > 0) {
          skipUntilLevel.set(node._level, true);
        } else {
          skipUntilLevel.set(node._level, false);
        }
      }
    });

    return result;
  }, [treeData, collapsedIds]);

  const allSelected = visibleData.length > 0 && selectedIds.size === visibleData.length;

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleData.map(c => c.id)));
  }

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  function toggleCollapse(id: string) {
    const next = new Set(collapsedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCollapsedIds(next);
  }

  async function handleDelete(cat: NewsCategoryItem) {
    if (!confirm(`Xóa danh mục tin tức "${cat.title ?? ''}"?`)) return;
    setDeletingId(cat.id);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch(`/admin/api/news-categories/${cat.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) { toast(json.error || 'Lỗi khi xóa', 'danger'); return; }
      toast('Đã xóa danh mục tin tức', 'success');
      router.refresh();
    } catch { toast('Lỗi kết nối', 'danger'); }
    finally { setDeletingId(null); }
  }

  async function handleBulkDelete() {
    if (!selectedIds.size) return;
    if (!confirm(`Xóa ${selectedIds.size} danh mục đã chọn?\nHành động này không thể hoàn tác.`)) return;
    setBulkLoading(true);
    try {
      const token = localStorage.getItem('admin_token') || '';
      await Promise.allSettled([...selectedIds].map(id =>
        fetch(`/admin/api/news-categories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      ));
      toast(`Đã xóa ${selectedIds.size} danh mục`, 'success');
      setSelectedIds(new Set());
      router.refresh();
    } catch { toast('Lỗi kết nối', 'danger'); }
    finally { setBulkLoading(false); }
  }

  async function handleBulkToggleActive(active: boolean) {
    if (!selectedIds.size) return;
    if (!confirm(`${active ? 'Kích hoạt' : 'Ẩn'} ${selectedIds.size} danh mục đã chọn?`)) return;
    setBulkLoading(true);
    try {
      const token = localStorage.getItem('admin_token') || '';
      await Promise.allSettled([...selectedIds].map(id =>
        fetch(`/admin/api/news-categories/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ isActive: active }),
        })
      ));
      toast(`Đã ${active ? 'kích hoạt' : 'ẩn'} ${selectedIds.size} danh mục`, 'success');
      setSelectedIds(new Set());
      router.refresh();
    } catch { toast('Lỗi kết nối', 'danger'); }
    finally { setBulkLoading(false); }
  }

  if (!categories.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-folder2-open fs-1 d-block mb-2"></i>
              Không tìm thấy danh mục tin tức nào.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="alert alert-warning d-flex align-items-center gap-3 mb-2 py-2 px-3 flex-wrap">
          <span className="fw-semibold">Đã chọn: <strong>{selectedIds.size}</strong> danh mục</span>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-success" disabled={bulkLoading} onClick={() => handleBulkToggleActive(true)}>
              <i className="bi bi-check-circle me-1"></i>Kích hoạt
            </button>
            <button className="btn btn-sm btn-secondary" disabled={bulkLoading} onClick={() => handleBulkToggleActive(false)}>
              <i className="bi bi-eye-slash me-1"></i>Ẩn
            </button>
            <button className="btn btn-sm btn-danger" disabled={bulkLoading} onClick={handleBulkDelete}>
              <i className="bi bi-trash me-1"></i>Xóa
            </button>
          </div>
          <button className="btn btn-sm btn-light ms-auto" onClick={() => setSelectedIds(new Set())}>
            <i className="bi bi-x-lg me-1"></i>Bỏ chọn
          </button>
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-bordered mb-0 w-100">
          <thead>
            <tr>
              <th className="text-center" style={{ width: 40 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              </th>
              <th className="text-center" style={{ width: 50 }}>STT</th>
              <th>Tiêu đề / Slug</th>
              <th>Tóm tắt</th>
              <th className="text-center" style={{ width: 80 }}>Level</th>
              <th className="text-center" style={{ width: 80 }}>Children</th>
              <th style={{ width: 60 }}>Hình</th>
              <th className="text-center" style={{ width: 90 }}>Trang chủ</th>
              <th className="text-center" style={{ width: 90 }}>Trạng thái</th>
              <th style={{ width: 110 }}>Ngày tạo</th>
              <th className="text-center" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visibleData.map((cat, idx) => {
              const hasChildren = cat.children.length > 0;
              const isCollapsed = collapsedIds.has(cat.id);
              const indentPx = cat._level * 24;

              return (
                <tr key={cat.id} className={selectedIds.has(cat.id) ? 'table-active' : ''}>
                  <td className="text-center">
                    <input type="checkbox" checked={selectedIds.has(cat.id)} onChange={() => toggle(cat.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  </td>
                  <td className="text-center">{idx + 1}</td>
                  <td>
                    <div style={{ paddingLeft: indentPx, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {hasChildren && (
                        <button
                          type="button"
                          onClick={() => toggleCollapse(cat.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: 0,
                            width: 20,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6c757d',
                          }}
                          title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                        >
                          <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'}`}></i>
                        </button>
                      )}
                      {!hasChildren && <span style={{ width: 20 }}></span>}
                      <div>
                        <div className="fw-semibold small d-flex align-items-center gap-2">
                          {cat._level > 0 && <span style={{ color: '#adb5bd' }}>└─</span>}
                          {cat.title || '—'}
                        </div>
                        <code className="small text-muted">{cat.seName || '—'}</code>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted small">
                      {cat.summary ? (cat.summary.length > 60 ? cat.summary.substring(0, 60) + '...' : cat.summary) : '—'}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="badge" style={{ 
                      backgroundColor: cat._level === 0 ? '#0d6efd' : cat._level === 1 ? '#6610f2' : '#6c757d',
                      fontSize: 11 
                    }}>
                      L{cat._level}
                    </span>
                  </td>
                  <td className="text-center">
                    {cat.childrenCount > 0 ? (
                      <span className="badge bg-info text-dark" style={{ fontSize: 11 }}>
                        {cat.childrenCount}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-center">
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.title ?? ''} style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-center">
                    {cat.isShowHome ? <i className="bi bi-check-lg text-success"></i> : <span className="text-muted">—</span>}
                  </td>
                  <td className="text-center">
                    {cat.isActive
                      ? <span className="badge bg-success" style={{ fontSize: 11 }}>● Hoạt động</span>
                      : <span className="badge bg-secondary" style={{ fontSize: 11 }}>● Ẩn</span>}
                  </td>
                  <td>{cat.createdAt ? formatDate(cat.createdAt) : '—'}</td>
                  <td className="text-center">
                    <Link href={`/admin/news-categories/${cat.id}/edit`} className="btn-edit me-1">
                      <i className="bi bi-pencil-fill"></i>
                    </Link>
                    <button className="btn-del" onClick={() => handleDelete(cat)} disabled={deletingId === cat.id}>
                      {deletingId === cat.id
                        ? <span className="spinner-border spinner-border-sm"></span>
                        : <i className="bi bi-trash-fill"></i>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
