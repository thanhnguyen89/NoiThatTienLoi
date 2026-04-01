'use client';

import { useState, useEffect, useRef } from 'react';
import { MenuLinkAccordion } from './MenuLinkAccordion';
import type { MenuLinkNode } from './MenuLinkTree';
import { MENU_LINK_SOURCE_TYPES } from '@/lib/constants';

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
}

export function MenuLinkFormPanel({
  menuId,
  onAdd,
  onUpdate,
  editingItem,
  onClearEdit,
}: Props) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [target, setTarget] = useState('_self');
  const [nofollow, setNofollow] = useState(false);
  const [sourceType, setSourceType] = useState('');
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Dropdown state for source quick-select
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [dropdownItems, setDropdownItems] = useState<SourceItem[]>([]);
  const [dropdownSourceKey, setDropdownSourceKey] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  async function handleDropdownToggle() {
    if (dropdownOpen) {
      setDropdownOpen(false);
      return;
    }
    setDropdownOpen(true);
    // Cycle through sources
    const currentIdx = MENU_LINK_SOURCE_TYPES.findIndex((s) => s.key === dropdownSourceKey);
    const nextIdx = (currentIdx + 1) % MENU_LINK_SOURCE_TYPES.length;
    const nextSource = MENU_LINK_SOURCE_TYPES[nextIdx];
    setDropdownSourceKey(nextSource.key);
    setDropdownLoading(true);
    try {
      const res = await fetch(`/admin/api/menu-link-sources?type=${nextSource.key}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDropdownItems(json.data);
      } else {
        setDropdownItems([]);
      }
    } catch { setDropdownItems([]); }
    finally { setDropdownLoading(false); }
  }

  function handleDropdownSelect(item: SourceItem) {
    setTitle(item.title);
    setSlug(item.url);
    setDropdownOpen(false);
    titleRef.current?.focus();
  }

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


  function handleSourceSelect(selectedTitle: string, selectedUrl: string, selectedSourceType: string) {
    setTitle(selectedTitle);
    setSlug(selectedUrl);
    setSourceType(selectedSourceType);
    titleRef.current?.focus();
  }

  function handleBatchSelect(items: SourceItem[], _sourceType: string) {
    const parentId: string | null = null;
    const level = 0;
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
        parentId: editingItem?.parentId ?? null,
        level: editingItem?.level ?? 0,
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
          <div className="position-relative">
            <div className="input-group input-group-sm">
              <input ref={titleRef} type="text" className="form-control" value={title}
                onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tiêu đề liên kết..." />
              <button className="btn btn-outline-secondary" type="button"
                onClick={handleDropdownToggle}>
                <i className="bi bi-chevron-down"></i>
              </button>
            </div>
            {dropdownOpen && (
              <div ref={dropdownRef} className="dropdown-menu dropdown-menu-end show"
                style={{ maxHeight: 280, overflowY: 'auto', minWidth: 280, right: 0, top: '100%', marginTop: 2 }}>
                {dropdownLoading ? (
                  <span className="dropdown-item small text-muted" style={{ cursor: 'default' }}>Đang tải...</span>
                ) : dropdownItems.length === 0 ? (
                  <span className="dropdown-item small text-muted" style={{ cursor: 'default' }}>Không có dữ liệu</span>
                ) : (
                  <>
                    <div className="dropdown-header small text-muted px-2 py-1 border-bottom">
                      {MENU_LINK_SOURCE_TYPES.find((s) => s.key === dropdownSourceKey)?.label || 'Nguồn liên kết'}
                    </div>
                    {dropdownItems.map((item) => (
                      <button key={item.id} className="dropdown-item small text-truncate" type="button"
                        onClick={() => handleDropdownSelect(item)} title={item.url}>
                        {item.title}
                      </button>
                    ))}
                    <div className="dropdown-divider"></div>
                    <span className="dropdown-item small text-muted" style={{ cursor: 'default' }}>
                      Bấm ▼ để xem nguồn khác
                    </span>
                  </>
                )}
              </div>
            )}
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


        {/* Accordion sources */}
        <MenuLinkAccordion onSelect={handleSourceSelect} onBatchSelect={handleBatchSelect} activeSourceType={sourceType} />
      </div>
    </div>
  );
}
