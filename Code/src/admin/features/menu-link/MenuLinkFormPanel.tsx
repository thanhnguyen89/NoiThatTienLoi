'use client';

import { useState, useEffect, useRef } from 'react';
import { MenuLinkAccordion } from './MenuLinkAccordion';
import type { MenuLinkNode } from './MenuLinkTree';

interface SourceItem {
  id: string;
  title: string;
  url: string;
}

interface Props {
  menuId: string;
  onAdd: (item: Omit<MenuLinkNode, 'id' | 'createdDate' | 'lastUpdDate'>) => void;
  onUpdate: (item: MenuLinkNode) => void;
  editingItem: MenuLinkNode | null;
  onClearEdit: () => void;
  pendingParentId?: string | null;
}

export function MenuLinkFormPanel({
  menuId,
  onAdd,
  onUpdate,
  editingItem,
  onClearEdit,
  pendingParentId,
}: Props) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [target, setTarget] = useState('_self');
  const [nofollow, setNofollow] = useState(false);
  const [sourceType, setSourceType] = useState('');
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // When editingItem changes, populate form
  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title ?? '');
      setSlug(editingItem.slug ?? '');
      setTarget(editingItem.target ?? '_self');
      setNofollow(!!editingItem.nofollow);
      setSourceType('');
    } else {
      setTitle('');
      setSlug('');
      setTarget('_self');
      setNofollow(false);
      setSourceType('');
    }
  }, [editingItem]);

  // When pendingParentId changes (adding child), focus title
  useEffect(() => {
    if (pendingParentId) {
      titleRef.current?.focus();
    }
  }, [pendingParentId]);

  function handleSourceSelect(selectedTitle: string, selectedUrl: string, selectedSourceType: string) {
    setTitle(selectedTitle);
    setSlug(selectedUrl);
    setSourceType(selectedSourceType);
    titleRef.current?.focus();
  }

  function handleBatchSelect(items: SourceItem[], _sourceType: string) {
    const parentId = pendingParentId ?? null;
    const level = pendingParentId ? 1 : 0;
    const timestamp = Date.now();

    const newItems = items.map((item, index) => ({
      id: `local-${timestamp}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      title: item.title,
      slug: item.url,
      target: '_self' as const,
      menuId: BigInt(menuId) as bigint | null,
      parentId,
      level,
      sortOrder: index,
      icon: null as string | null,
      nofollow: false as boolean | null,
      entityId: null,
      entityName: item.title,
      createdDate: null,
      lastUpdDate: null,
      _local: true,
      _children: [],
    })) as MenuLinkNode[];

    newItems.forEach((item) => onAdd(item));
  }

  async function handleSubmit(updateMode: boolean) {
    if (!title.trim()) {
      alert('Vui long nhap tieu de');
      return;
    }
    setSaving(true);
    try {
      const baseItem = {
        title: title.trim(),
        slug: slug.trim() || null,
        target: target || null,
        nofollow: nofollow || null,
        menuId: BigInt(menuId) as bigint | null,
        parentId: pendingParentId ?? (editingItem?.parentId ?? null),
        level: editingItem?.level ?? (pendingParentId ? 1 : 0),
        sortOrder: editingItem?.sortOrder ?? null,
        icon: null,
        entityId: null,
        entityName: null,
        createdDate: editingItem?.createdDate ?? null,
        lastUpdDate: editingItem?.lastUpdDate ?? null,
      };

      if (updateMode && editingItem) {
        onUpdate({ ...editingItem, ...baseItem });
      } else {
        const newItem: MenuLinkNode = {
          ...baseItem,
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          _local: true,
          _children: [],
        } as MenuLinkNode;
        onAdd(newItem);
      }

      // Reset form
      setTitle('');
      setSlug('');
      setTarget('_self');
      setNofollow(false);
      setSourceType('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="d-flex flex-column h-100">
      {/* Form header */}
      <div style={{ background: '#00BCD4', color: '#fff', padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>
        {!!editingItem ? 'SỬA LIÊN KẾT' : 'THÊM/SỬA LIÊN KẾT'}
      </div>

      {/* Form */}
      <div className="card-body flex-grow-1" style={{ overflowY: 'auto' }}>
        <div className="mb-2">
          <label className="form-label small fw-semibold">Tiêu đề</label>
          <div className="input-group input-group-sm">
            <input ref={titleRef} type="text" className="form-control" value={title}
              onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tiêu đề liên kết..." />
            <button className="btn btn-outline-secondary" type="button">
              <i className="bi bi-chevron-down"></i>
            </button>
          </div>
        </div>

        <div className="mb-2">
          <label className="form-label small fw-semibold">URL</label>
          <input type="text" className="form-control form-control-sm" value={slug}
            onChange={(e) => setSlug(e.target.value)} placeholder="/san-pham/ten hoac https://..." />
        </div>

        <div className="mb-3">
          <label className="form-label small fw-semibold">Target</label>
          <select className="form-select form-select-sm" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="_self">Self</option>
            <option value="_blank">Blank (tab mới)</option>
            <option value="_parent">Parent</option>
            <option value="_top">Top</option>
          </select>
        </div>

        {/* Action buttons */}
        <div className="d-flex gap-2 mb-3">
          <button type="button"
            className={`btn btn-sm flex-grow-1 ${!!editingItem ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => !!editingItem && handleSubmit(true)} disabled={saving || !editingItem}>
            {saving && <span className="spinner-border spinner-border-sm me-1"></span>}
            <i className="bi bi-arrow-repeat me-1"></i>Cập nhật
          </button>
          <button type="button"
            className={`btn btn-sm flex-grow-1 ${!editingItem ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => !editingItem && handleSubmit(false)} disabled={saving || !!editingItem}>
            {saving && <span className="spinner-border spinner-border-sm me-1"></span>}
            <i className="bi bi-plus-lg me-1"></i>Thêm vào menu
          </button>
        </div>

        {pendingParentId && (
          <div className="alert alert-info py-1 px-2 small mb-2">
            <i className="bi bi-arrow-right me-1"></i>Đang thêm liên kết con
          </div>
        )}

        {/* Accordion sources */}
        <MenuLinkAccordion onSelect={handleSourceSelect} onBatchSelect={handleBatchSelect} activeSourceType={sourceType} />
      </div>
    </div>
  );
}
