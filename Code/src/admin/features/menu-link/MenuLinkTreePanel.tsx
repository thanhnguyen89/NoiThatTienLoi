'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MenuLinkTree, type MenuLinkNode } from './MenuLinkTree';

interface Props {
  menuId: string;
  menuName: string;
  menuLinks: MenuLinkNode[];
  onLinksChange: (links: MenuLinkNode[]) => void;
  onEdit: (item: MenuLinkNode) => void;
}

type ToastType = 'success' | 'error';
interface Toast { msg: string; type: ToastType; }

export function MenuLinkTreePanel({
  menuId,
  menuName,
  menuLinks,
  onLinksChange,
  onEdit,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(msg: string, type: ToastType) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const idMap: Record<string, string> = {};

      // Topological sort: cha trước con (dựa vào parentId)
      const localItems = menuLinks.filter((l) => l._local);
      const sorted: typeof localItems = [];
      const visited = new Set<string>();

      function topoSort(item: (typeof localItems)[0]) {
        if (visited.has(item.id)) return;
        // Nếu cha cũng là local, sort cha trước
        if (item.parentId && String(item.parentId).startsWith('local-')) {
          const parent = localItems.find((n) => n.id === item.parentId);
          if (parent) topoSort(parent);
        }
        visited.add(item.id);
        sorted.push(item);
      }
      localItems.forEach((item) => topoSort(item));

      for (const item of sorted) {
        // Resolve parentId: nếu cha cũng là local thì dùng real id từ idMap
        const resolvedParentId = item.parentId != null
          ? (idMap[String(item.parentId)] ?? item.parentId)
          : null;

        // Nếu parentId vẫn còn dạng local-xxx (chưa được map) thì set null
        const finalParentId = resolvedParentId && String(resolvedParentId).startsWith('local-')
          ? null
          : resolvedParentId;

        const res = await fetch('/admin/api/menu-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            slug: item.slug,
            target: item.target,
            menuId: Number(menuId),
            parentId: finalParentId,
            level: item.level,
            nofollow: item.nofollow,
            entityId: item.entityId != null ? Number(item.entityId) : null,
            entityName: item.entityName,
          }),
        });
        const json = await res.json();
        if (json?.data?.id) {
          idMap[String(item.id)] = String(json.data.id);
        }
      }

      // Reorder + update parentId cho existing items
      const existingItems = menuLinks.filter((l) => !l._local);
      const reorderUpdates = existingItems.map((item) => ({
        id: item.id,
        sortOrder: item.sortOrder ?? 0,
        parentId: item.parentId ?? null,
      }));

      if (reorderUpdates.length > 0) {
        await fetch('/admin/api/menu-links/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: reorderUpdates }),
        });
      }

      setLastSaved(new Date());
      showToast('Lưu menu thành công!', 'success');
      router.refresh();
    } catch {
      showToast('Lỗi khi lưu. Vui lòng thử lại.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    router.push('/admin/menus');
  }

  return (
    <div className="d-flex flex-column h-100">
      {/* Header */}
      <div style={{ background: '#00BCD4', color: '#fff', padding: '8px 12px', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{menuName}</span>
        {lastSaved && <span style={{ fontSize: 11, opacity: 0.8 }}>Đã lưu lúc {lastSaved.toLocaleTimeString()}</span>}
      </div>

      {/* Tree */}
      <div className="card-body flex-grow-1 p-2" style={{ overflowY: 'auto' }}>
        <MenuLinkTree menuLinks={menuLinks} onLinksChange={onLinksChange} onEdit={onEdit} />
      </div>

      {/* Footer buttons */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #e0e0e0', display: 'flex', gap: 8, justifyContent: 'flex-end', background: '#fff' }}>
        <button type="button" onClick={handleSave} disabled={saving}
          style={{ padding: '6px 16px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          {saving ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-check-lg"></i>}
          Lưu
        </button>
        <button type="button" onClick={handleClose} disabled={saving}
          style={{ padding: '6px 16px', background: '#9e9e9e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="bi bi-x-lg"></i>Đóng
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#4caf50' : '#f44336',
          color: '#fff', padding: '10px 20px', borderRadius: 6,
          fontSize: 14, fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 0.2s ease',
        }}>
          <i className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
