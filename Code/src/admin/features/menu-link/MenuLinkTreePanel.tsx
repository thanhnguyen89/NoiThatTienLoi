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

  async function handleSave() {
    setSaving(true);
    try {
      // Separate local (new) items and existing items
      const localItems = menuLinks.filter((l) => l._local);
      const existingItems = menuLinks.filter((l) => !l._local);

      // New local items: POST each (with their current parentId from level-up/down changes)
      for (const item of localItems) {
        await fetch('/admin/api/menu-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            slug: item.slug,
            target: item.target,
            menuId: Number(menuId),
            parentId: item.parentId,
            level: item.level,
            nofollow: item.nofollow,
            entityId: item.entityId != null ? Number(item.entityId) : null,
            entityName: item.entityName,
          }),
        });
      }

      // Reorder + update parentId for existing items (includes level-up/down parentId changes)
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
      router.refresh();
    } catch {
      alert('Loi khi luu. Vui long thu lai.');
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
    </div>
  );
}
