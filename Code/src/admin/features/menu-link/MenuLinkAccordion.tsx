'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MENU_LINK_SOURCE_TYPES } from '@/lib/constants';

interface SourceItem {
  id: string;
  title: string;
  url: string;
}

interface Props {
  onSelect: (title: string, url: string, sourceType: string, entityId?: string, entityName?: string) => void;
  onBatchSelect?: (items: SourceItem[], sourceType: string) => void;
  activeSourceType?: string;
}

export function MenuLinkAccordion({ onSelect, onBatchSelect, activeSourceType }: Props) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [loadedData, setLoadedData] = useState<Record<string, SourceItem[]>>({});
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleSection = useCallback(async (key: string) => {
    const newOpen = new Set(openSections);
    if (newOpen.has(key)) {
      newOpen.delete(key);
      setOpenSections(newOpen);
      return;
    }
    newOpen.add(key);
    setOpenSections(newOpen);

    if (!loadedData[key]) {
      setLoadingSections((prev) => new Set(prev).add(key));
      try {
        const res = await fetch(`/admin/api/menu-link-sources?type=${key}`);
        const json = await res.json();
        if (json.success && json.data) {
          setLoadedData((prev) => ({ ...prev, [key]: json.data }));
        }
      } catch { /* ignore */ }
      finally {
        setLoadingSections((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    }
  }, [openSections, loadedData]);

  useEffect(() => {
    if (activeSourceType && !openSections.has(activeSourceType)) {
      toggleSection(activeSourceType);
    }
  }, [activeSourceType, openSections, toggleSection]);

  // Reset selection when section closes
  useEffect(() => {
    setSelectedIds(new Set());
    setSearchTerm('');
  }, [openSections]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(items: SourceItem[]) {
    const filtered = getFilteredItems(items);
    const allSelected = filtered.every((item) => selectedIds.has(item.id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((item) => next.delete(item.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((item) => next.add(item.id));
        return next;
      });
    }
  }

  function handleBatchAdd(items: SourceItem[], sourceType: string) {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    onBatchSelect?.(selectedItems, sourceType);
    setSelectedIds(new Set());
    setSearchTerm('');
  }

  function getFilteredItems(items: SourceItem[]) {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.url.toLowerCase().includes(term)
    );
  }

  return (
    <div className="accordion" id="menuLinkAccordion">
      {MENU_LINK_SOURCE_TYPES.map((source) => {
        const isOpen = openSections.has(source.key);
        const isLoading = loadingSections.has(source.key);
        const isBatchable = !!source.batchable;
        const items = loadedData[source.key] || [];
        const filtered = getFilteredItems(items);
        const allSelected = filtered.length > 0 && filtered.every((item) => selectedIds.has(item.id));
        const someSelected = filtered.some((item) => selectedIds.has(item.id));

        return (
          <div className="accordion-item" key={source.key}>
            <h2 className="accordion-header">
              <button
                className={`accordion-button${isOpen ? '' : ' collapsed'}`}
                type="button"
                onClick={() => toggleSection(source.key)}
                aria-expanded={isOpen}
                style={{ background: isOpen ? '#00BCD4' : '#f8f9fa', color: isOpen ? '#fff' : '#333', fontWeight: 500, fontSize: 13 }}
              >
                {source.label}
                {isBatchable && selectedIds.size > 0 && (
                  <span className="badge bg-white text-primary ms-2">{selectedIds.size} chọn</span>
                )}
              </button>
            </h2>
            <div
              id={`collapse-${source.key}`}
              className={`accordion-collapse collapse${isOpen ? ' show' : ''}`}
            >
              <div className="accordion-body p-2">
                {isLoading ? (
                  <div className="text-center py-3">
                    <span className="spinner-border spinner-border-sm text-primary"></span>
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-muted small text-center py-2">
                    Khong co du lieu
                  </div>
                ) : isBatchable ? (
                  <div style={{ border: '1px solid #e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
                    {/* Search box */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
                      <input
                        type="text"
                        placeholder="Tìm kiếm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ flex: 1, padding: '8px 12px', border: 'none', outline: 'none', fontSize: 13 }}
                      />
                      <button type="button"
                        style={{ padding: '8px 12px', background: '#e0e0e0', border: 'none', cursor: 'pointer', borderLeft: '1px solid #ccc' }}>
                        <i className="bi bi-search" style={{ fontSize: 14, color: '#555' }}></i>
                      </button>
                    </div>

                    {/* Checkbox list with scroll */}
                    <div style={{ maxHeight: 220, overflowY: 'auto', padding: '4px 0' }}>
                      {filtered.length === 0 ? (
                        <div className="text-muted small text-center py-2">Không tìm thấy</div>
                      ) : (
                        filtered.map((item) => (
                          <label key={item.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
                            <input type="checkbox" className="form-check-input" style={{ margin: 0, flexShrink: 0 }}
                              checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />
                            <span style={{ flex: 1 }}>{item.title}</span>
                          </label>
                        ))
                      )}
                    </div>

                    {/* Add button */}
                    <div style={{ padding: '10px 12px', borderTop: '1px solid #e0e0e0' }}>
                      <button type="button" disabled={selectedIds.size === 0}
                        onClick={() => handleBatchAdd(items, source.key)}
                        style={{
                          padding: '8px 18px', background: selectedIds.size === 0 ? '#aaa' : '#4caf50',
                          color: '#fff', border: 'none', borderRadius: 4,
                          cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                          fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                        <i className="bi bi-plus-lg"></i>
                        Thêm vào menu{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="list-group list-group-flush small">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-1 px-2"
                        onClick={() =>
                          onSelect(item.title, item.url, source.key, item.id, item.title)
                        }
                      >
                        <span className="text-truncate me-2">{item.title}</span>
                        <code className="text-secondary flex-shrink-0" style={{ fontSize: '0.7rem' }}>
                          {item.url}
                        </code>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
