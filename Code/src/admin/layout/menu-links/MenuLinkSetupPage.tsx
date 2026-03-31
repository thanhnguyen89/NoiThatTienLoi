'use client';

import { useState, useEffect, useCallback } from 'react';
import { MenuLinkFormPanel } from '@/admin/features/menu-link/MenuLinkFormPanel';
import { MenuLinkTreePanel } from '@/admin/features/menu-link/MenuLinkTreePanel';
import type { MenuLinkNode } from '@/admin/features/menu-link/MenuLinkTree';

interface Props {
  menuId: string;
  menuName: string;
  initialLinks: MenuLinkNode[];
}

export function MenuLinkSetupPage({ menuId, menuName, initialLinks }: Props) {
  const [menuLinks, setMenuLinks] = useState<MenuLinkNode[]>(initialLinks);
  const [editingItem, setEditingItem] = useState<MenuLinkNode | null>(null);
  const [pendingParentId, setPendingParentId] = useState<string | null>(null);

  // Listen for add child events from tree
  useEffect(() => {
    function handleAddChild(e: Event) {
      const detail = (e as CustomEvent).detail;
      setPendingParentId(detail.parentId);
      setEditingItem(null);
    }
    window.addEventListener('menuLinkAddChild', handleAddChild);
    return () => window.removeEventListener('menuLinkAddChild', handleAddChild);
  }, []);

  // Update menuLinks when initialLinks changes (e.g. after save)
  useEffect(() => {
    setMenuLinks(initialLinks);
  }, [initialLinks]);

  const handleAdd = useCallback((item: Omit<MenuLinkNode, 'id' | 'createdDate' | 'lastUpdDate'>) => {
    const newItem: MenuLinkNode = {
      ...item,
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      _local: true,
      // Assign sortOrder = max + 1 in the same parent group, so new items go at the end
      sortOrder: item.sortOrder ?? (
        Math.max(0, ...menuLinks
          .filter((n) => n.parentId === (item.parentId ?? null))
          .map((n) => n.sortOrder ?? 0)
        ) + 1
      ),
    } as MenuLinkNode;
    setMenuLinks((prev) => [...prev, newItem]);
    setPendingParentId(null);
  }, [menuLinks]);

  const handleUpdate = useCallback((updated: MenuLinkNode) => {
    setMenuLinks((prev) =>
      prev.map((n) => (n.id === updated.id ? { ...updated } : n))
    );
    setEditingItem(null);
    setPendingParentId(null);
  }, []);

  const handleClearEdit = useCallback(() => {
    setEditingItem(null);
    setPendingParentId(null);
  }, []);

  return (
    <div className="container-fluid py-2">
      <div className="row g-3">
        {/* Panel trai: Form + Accordion */}
        <div className="col-5">
          <div className="card h-100">
            <MenuLinkFormPanel
              menuId={menuId}
              onAdd={handleAdd}
              onUpdate={handleUpdate}
              editingItem={editingItem}
              onClearEdit={handleClearEdit}
              pendingParentId={pendingParentId}
            />
          </div>
        </div>

        {/* Panel phai: Tree */}
        <div className="col-7">
          <div className="card h-100">
            <MenuLinkTreePanel
              menuId={menuId}
              menuName={menuName}
              initialLinks={menuLinks}
              onLinksChange={setMenuLinks}
              onEdit={(item) => setEditingItem(item)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
