'use client';

import { useEffect, useRef, useState } from 'react';

interface ImageItem {
  name: string;
  url: string;
  size: number | null;
  mtime: number | null;
  folder: string;
}

interface FolderItem {
  name: string;
  path: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  onSelectMultiple?: (urls: string[]) => void;
  multiSelect?: boolean;
  initialUrl?: string;
}

export function ImageManagerModal({ isOpen, onClose, onSelect, onSelectMultiple, multiSelect = false, initialUrl }: Props) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const [activeFolder, setActiveFolder] = useState<string>('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Folder actions state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');
  const [folderError, setFolderError] = useState('');

  // Image rename state
  const [renamingImage, setRenamingImage] = useState<string | null>(null);
  const [renameImageValue, setRenameImageValue] = useState('');
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolbarUploadRef = useRef<HTMLInputElement>(null);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected(initialUrl || null);
      setSelectedMulti([]);
      setPage(1);
      setSearchQuery('');
      setActiveFolder('');
      fetchFolders();
      fetchImages('', 1);
    } else {
      // Cancel any pending requests when modal closes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch images when folder changes (but not on initial open)
  useEffect(() => {
    if (isOpen && activeFolder !== undefined) {
      setPage(1);
      fetchImages(activeFolder, 1);
    }
  }, [activeFolder]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchFolders() {
    try {
      const res = await fetch('/admin/api/uploads/folders');
      const json = await res.json();
      if (json.success) setFolders(json.data);
    } catch {}
  }

  async function fetchImages(folder: string, pageNum?: number) {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const targetPage = pageNum ?? page;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (folder) q.set('folder', folder);
      q.set('page', String(targetPage));
      q.set('limit', String(limit));
      const res = await fetch(`/admin/api/uploads?${q}`, { signal: controller.signal });
      const json = await res.json();
      if (json.success) {
        setImages(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
        // Clamp page to valid range (handles empty last page after deletion)
        const safePage = Math.min(json.page, json.totalPages || 1);
        setPage(safePage);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setImages([]);
      }
    } finally {
      setLoading(false);
      // Scroll main content to top on page change
      const mainContent = document.querySelector('[data-image-modal-content]') as HTMLElement;
      if (mainContent) mainContent.scrollTop = 0;
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) fd.append('files', files[i]);
      if (activeFolder) fd.append('folder', activeFolder);
      const res = await fetch('/admin/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success && json.data) {
        // Optimistic update: add new images to the top of the list
        const newImages: ImageItem[] = json.data
          .filter((item: any) => item.url) // Only successful uploads
          .map((item: any) => ({
            name: item.url.split('/').pop() || '',
            url: item.url,
            size: null,
            mtime: Date.now(), // Current timestamp for newly uploaded images
            folder: activeFolder || 'root'
          }));

        // If on page 1, prepend new images to existing list (no refresh)
        if (page === 1) {
          setImages(prev => [...newImages, ...prev]);
          setTotal(prev => prev + newImages.length);
        } else {
          // If on other pages, go back to page 1 and fetch
          setPage(1);
          await fetchImages(activeFolder, 1);
        }

        // Switch to library tab if currently on upload tab
        if (tab === 'upload') setTab('library');
      }
    } catch {} finally {
      setUploading(false);
    }
  }

  async function deleteImage(url: string) {
    if (!confirm('Xóa ảnh này?')) return;
    try {
      const res = await fetch('/admin/api/uploads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (json.success) {
        if (selected === url) setSelected(null);
        setSelectedMulti((prev) => prev.filter((u) => u !== url));
        await fetchImages(activeFolder);
      }
    } catch {}
  }

  async function renameImage(url: string, newName: string) {
    if (!newName.trim()) { setRenamingImage(null); return; }
    // Strip extension from current name to compare
    const currentName = url.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    if (newName.trim() === currentName) { setRenamingImage(null); return; }
    try {
      const res = await fetch('/admin/api/uploads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, newName: newName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        if (selected === url) setSelected(json.newUrl);
        setSelectedMulti((prev) => prev.map((u) => u === url ? json.newUrl : u));
        await fetchImages(activeFolder);
      }
    } catch {} finally {
      setRenamingImage(null);
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    setFolderError('');
    try {
      const res = await fetch('/admin/api/uploads/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchFolders();
        setNewFolderName('');
        setShowCreateFolder(false);
      } else {
        setFolderError(json.error || 'Lỗi tạo thư mục');
      }
    } catch {
      setFolderError('Lỗi kết nối');
    }
  }

  async function renameFolder(oldName: string, newName: string) {
    if (!newName.trim() || newName === oldName) { setRenamingFolder(null); return; }
    try {
      const res = await fetch('/admin/api/uploads/folders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName: newName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        if (activeFolder === oldName) setActiveFolder(newName.trim());
        await fetchFolders();
      }
    } catch {} finally {
      setRenamingFolder(null);
    }
  }

  async function deleteFolder(name: string) {
    if (!confirm(`Xóa thư mục "${name}" và toàn bộ ảnh bên trong?`)) return;
    try {
      const res = await fetch('/admin/api/uploads/folders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (json.success) {
        if (activeFolder === name) setActiveFolder('');
        await fetchFolders();
        await fetchImages('');
      }
    } catch {}
  }

  if (!isOpen) return null;

  const filteredImages = (searchQuery.trim()
    ? images.filter((img) => img.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : images
  ).slice().sort((a, b) => {
    const cmp = sortBy === 'name'
      ? a.name.localeCompare(b.name)
      : (a.mtime ?? 0) - (b.mtime ?? 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const isSelected = (url: string) => multiSelect ? selectedMulti.includes(url) : selected === url;

  function toggleSelect(url: string) {
    if (multiSelect) {
      setSelectedMulti((prev) => prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]);
    } else {
      setSelected(url);
    }
  }

  function handleInsert() {
    if (multiSelect) {
      if (selectedMulti.length) { onSelectMultiple?.(selectedMulti); onClose(); setSelectedMulti([]); }
    } else {
      if (selected) { onSelect(selected); onClose(); setSelected(null); }
    }
  }

  const hasSelection = multiSelect ? selectedMulti.length > 0 : !!selected;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); e.stopPropagation(); onClose(); setSelected(null); setSelectedMulti([]); } }}
    >
      <div
        onClick={(e) => { e.stopPropagation(); }}
        style={{ background: '#fff', borderRadius: 8, width: 1000, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', overflow: 'hidden' }}
      >

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e9ecef', background: '#f8f9fa', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-images" style={{ fontSize: 18, color: '#0d6efd' }}></i>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Quản lý hình ảnh</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => { onClose(); setSelected(null); setSelectedMulti([]); }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6c757d', padding: 4, lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e9ecef', padding: '0 16px', flexShrink: 0 }}>
          {(['library', 'upload'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: tab === t ? '#0d6efd' : '#6c757d', borderBottom: tab === t ? '2px solid #0d6efd' : '2px solid transparent', marginBottom: -1 }}>
              <i className={`bi ${t === 'library' ? 'bi-collection' : 'bi-upload'} me-1`}></i>
              {t === 'library' ? 'Chọn ảnh' : 'Tải ảnh lên'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Sidebar */}
          {tab === 'library' && (
            <div style={{ width: 200, borderRight: '1px solid #e9ecef', display: 'flex', flexDirection: 'column', background: '#fafbfc', flexShrink: 0 }}>
              {/* Folder actions */}
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 4 }}>
                <button
                  onClick={() => { setShowCreateFolder(true); setFolderError(''); setNewFolderName(''); }}
                  title="Tạo thư mục"
                  style={{ flex: 1, padding: '3px 6px', fontSize: 11, border: '1px solid #dee2e6', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#495057' }}
                >
                  <i className="bi bi-folder-plus me-1"></i>Tạo
                </button>
              </div>

              {/* Create folder input */}
              {showCreateFolder && (
                <div style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowCreateFolder(false); }}
                    placeholder="Tên thư mục..."
                    style={{ width: '100%', padding: '3px 6px', fontSize: 12, border: '1px solid #0d6efd', borderRadius: 3, outline: 'none', marginBottom: 4 }}
                  />
                  {folderError && <p style={{ color: '#dc3545', fontSize: 11, margin: '0 0 4px' }}>{folderError}</p>}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={createFolder} style={{ flex: 1, padding: '2px 6px', fontSize: 11, background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>Tạo</button>
                    <button onClick={() => setShowCreateFolder(false)} style={{ flex: 1, padding: '2px 6px', fontSize: 11, background: '#fff', border: '1px solid #dee2e6', borderRadius: 3, cursor: 'pointer' }}>Hủy</button>
                  </div>
                </div>
              )}

              {/* Folder list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#adb5bd', padding: '8px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thư mục</div>

                {/* All images */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveFolder(''); }}
                  type="button"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 12px', background: activeFolder === '' ? '#e7f1ff' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: activeFolder === '' ? '#0d6efd' : '#495057', fontWeight: activeFolder === '' ? 500 : 400, textAlign: 'left' }}
                >
                  <i className="bi bi-grid-3x3-gap" style={{ fontSize: 14 }}></i>
                  <span>Tất cả ảnh</span>
                </button>

                {/* Dynamic folders */}
                {folders.map((folder) => (
                  <div key={folder.path} style={{ position: 'relative' }}>
                    {renamingFolder === folder.name ? (
                      <div style={{ padding: '4px 8px' }}>
                        <input
                          autoFocus
                          value={renameFolderValue}
                          onChange={(e) => setRenameFolderValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') renameFolder(folder.name, renameFolderValue); if (e.key === 'Escape') setRenamingFolder(null); }}
                          onBlur={() => renameFolder(folder.name, renameFolderValue)}
                          style={{ width: '100%', padding: '2px 6px', fontSize: 12, border: '1px solid #0d6efd', borderRadius: 3, outline: 'none' }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px 5px 12px', background: activeFolder === folder.path ? '#e7f1ff' : 'transparent', cursor: 'pointer' }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveFolder(folder.path); }}
                      >
                        <i className="bi bi-folder" style={{ fontSize: 14, color: activeFolder === folder.path ? '#0d6efd' : '#ffc107', flexShrink: 0 }}></i>
                        <span style={{ flex: 1, fontSize: 13, color: activeFolder === folder.path ? '#0d6efd' : '#495057', fontWeight: activeFolder === folder.path ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setRenamingFolder(folder.name); setRenameFolderValue(folder.name); }}
                            title="Đổi tên"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', fontSize: 11, color: '#6c757d', borderRadius: 2 }}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteFolder(folder.name); }}
                            title="Xóa"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', fontSize: 11, color: '#dc3545', borderRadius: 2 }}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main content */}
          <div data-image-modal-content style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Toolbar — 2 rows like file manager */}
            {tab === 'library' && (
              <div style={{ borderBottom: '1px solid #e9ecef', background: '#f8f9fa', flexShrink: 0 }}>
                {/* Row 1: Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderBottom: '1px solid #e9ecef', flexWrap: 'wrap' }}>
                  {/* Add file */}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toolbarUploadRef.current?.click(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', border: '1px solid #c3e6cb', borderRadius: 4, background: '#d4edda', cursor: 'pointer', fontSize: 12, color: '#155724', fontWeight: 500 }}
                  >
                    <i className="bi bi-file-earmark-plus"></i> Thêm ảnh
                  </button>
                  <input ref={toolbarUploadRef} type="file" accept="image/*" multiple className="d-none"
                    onChange={(e) => { handleUpload(e.target.files); e.target.value = ''; }}
                  />

                  {/* Preview */}
                  <button
                    type="button"
                    disabled={!hasSelection}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); const url = multiSelect ? selectedMulti[0] : selected; url && window.open(url, '_blank'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', border: '1px solid #bee5eb', borderRadius: 4, background: hasSelection ? '#d1ecf1' : '#f8f9fa', cursor: hasSelection ? 'pointer' : 'not-allowed', fontSize: 12, color: hasSelection ? '#0c5460' : '#adb5bd', fontWeight: 500 }}
                  >
                    <i className="bi bi-eye"></i> Xem
                  </button>

                  {/* Rename */}
                  <button
                    type="button"
                    disabled={multiSelect ? selectedMulti.length !== 1 : !selected}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const url = multiSelect ? selectedMulti[0] : selected;
                      if (!url) return;
                      const img = images.find((i) => i.url === url);
                      if (img) { setRenamingImage(url); setRenameImageValue(img.name.replace(/\.[^.]+$/, '')); }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', border: '1px solid #ffeeba', borderRadius: 4, background: (multiSelect ? selectedMulti.length === 1 : !!selected) ? '#fff3cd' : '#f8f9fa', cursor: (multiSelect ? selectedMulti.length === 1 : !!selected) ? 'pointer' : 'not-allowed', fontSize: 12, color: (multiSelect ? selectedMulti.length === 1 : !!selected) ? '#856404' : '#adb5bd', fontWeight: 500 }}
                  >
                    <i className="bi bi-pencil"></i> Đổi tên
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    disabled={!hasSelection}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); const url = multiSelect ? selectedMulti[0] : selected; url && deleteImage(url); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', border: '1px solid #f5c6cb', borderRadius: 4, background: hasSelection ? '#f8d7da' : '#f8f9fa', cursor: hasSelection ? 'pointer' : 'not-allowed', fontSize: 12, color: hasSelection ? '#721c24' : '#adb5bd', fontWeight: 500 }}
                  >
                    <i className="bi bi-trash"></i> Xóa
                  </button>

                  <div style={{ width: 1, height: 22, background: '#dee2e6', margin: '0 2px' }} />

                  {/* Select / Insert */}
                  <button
                    type="button"
                    disabled={!hasSelection}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInsert(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', border: '1px solid #c3e6cb', borderRadius: 4, background: hasSelection ? '#28a745' : '#f8f9fa', cursor: hasSelection ? 'pointer' : 'not-allowed', fontSize: 12, color: hasSelection ? '#fff' : '#adb5bd', fontWeight: 500 }}
                  >
                    <i className="bi bi-check2"></i> Chọn{multiSelect && selectedMulti.length > 0 ? ` (${selectedMulti.length})` : ''}
                  </button>
                </div>

                {/* Row 2: Order by + view toggle + search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px' }}>
                  {/* Order by */}
                  <span style={{ fontSize: 12, color: '#6c757d', whiteSpace: 'nowrap' }}>Sắp xếp:</span>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (sortBy === 'name') setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else setSortBy('name'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', border: '1px solid #dee2e6', borderRadius: 3, background: sortBy === 'name' ? '#e7f1ff' : '#fff', cursor: 'pointer', fontSize: 12, color: sortBy === 'name' ? '#0d6efd' : '#495057' }}
                  >
                    <i className={`bi bi-arrow-${sortBy === 'name' && sortDir === 'desc' ? 'down' : 'up'}`} style={{ fontSize: 10 }}></i> Tên
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (sortBy === 'date') setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else setSortBy('date'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', border: '1px solid #dee2e6', borderRadius: 3, background: sortBy === 'date' ? '#e7f1ff' : '#fff', cursor: 'pointer', fontSize: 12, color: sortBy === 'date' ? '#0d6efd' : '#495057' }}
                  >
                    <i className={`bi bi-arrow-${sortBy === 'date' && sortDir === 'desc' ? 'down' : 'up'}`} style={{ fontSize: 10 }}></i> Ngày tải lên
                  </button>

                  <div style={{ width: 1, height: 18, background: '#dee2e6' }} />

                  {/* View toggle */}
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setView('grid'); }} title="Lưới" style={{ padding: '2px 6px', border: '1px solid #dee2e6', borderRadius: 3, background: view === 'grid' ? '#e7f1ff' : '#fff', cursor: 'pointer', fontSize: 14, color: view === 'grid' ? '#0d6efd' : '#6c757d' }}>
                    <i className="bi bi-grid-3x3-gap"></i>
                  </button>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setView('list'); }} title="Danh sách" style={{ padding: '2px 6px', border: '1px solid #dee2e6', borderRadius: 3, background: view === 'list' ? '#e7f1ff' : '#fff', cursor: 'pointer', fontSize: 14, color: view === 'list' ? '#0d6efd' : '#6c757d' }}>
                    <i className="bi bi-list-ul"></i>
                  </button>

                  <div style={{ width: 1, height: 18, background: '#dee2e6' }} />

                  {/* Search */}
                  <div style={{ flex: 1, position: 'relative', maxWidth: 220 }}>
                    <i className="bi bi-search" style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#adb5bd', pointerEvents: 'none' }}></i>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm tên ảnh..."
                      style={{ width: '100%', padding: '3px 24px 3px 24px', fontSize: 12, border: '1px solid #dee2e6', borderRadius: 4, outline: 'none', background: '#fff' }}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#adb5bd', padding: 0, lineHeight: 1 }}>×</button>
                    )}
                  </div>

                  <span style={{ fontSize: 11, color: '#adb5bd', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                    {searchQuery ? `${filteredImages.length}/${total}` : total} ảnh
                  </span>
                </div>
              </div>
            )}

            {/* Upload tab */}
            {tab === 'upload' && (
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#0d6efd'; e.currentTarget.style.background = '#e7f1ff'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.background = '#f8f9fa'; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.background = '#f8f9fa'; handleUpload(e.dataTransfer.files); }}
                style={{ margin: 16, border: '2px dashed #dee2e6', borderRadius: 8, padding: '40px 24px', textAlign: 'center', cursor: uploading ? 'default' : 'pointer', background: '#f8f9fa', transition: 'all 0.15s' }}
              >
                {uploading ? (
                  <><div className="spinner-border text-primary mb-2"></div><p className="mb-0 text-muted small">Đang tải lên...</p></>
                ) : (
                  <>
                    <i className="bi bi-cloud-arrow-up" style={{ fontSize: 44, color: '#0d6efd' }}></i>
                    <p className="mt-2 mb-1 fw-semibold" style={{ fontSize: 13 }}>Kéo thả hoặc click để chọn ảnh</p>
                    <p className="text-muted small mb-0">JPG, PNG, GIF, WebP · Tối đa 5MB</p>
                    {activeFolder && <p className="text-primary small mt-1 mb-0">Sẽ upload vào thư mục: <strong>{activeFolder}</strong></p>}
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="d-none" disabled={uploading} onChange={(e) => { handleUpload(e.target.files); e.target.value = ''; }} />
              </div>
            )}

            {/* Image grid/list */}
            {tab === 'library' && (
              loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-image" style={{ fontSize: 48 }}></i>
                  <p className="mt-2 small">{searchQuery ? 'Không tìm thấy ảnh nào' : 'Chưa có ảnh nào'}</p>
                </div>
              ) : view === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, padding: 8 }}>
                  {filteredImages.map((img) => {
                    const isSel = isSelected(img.url);
                    return (
                      <div
                        key={img.url}
                        onClick={() => renamingImage !== img.url && toggleSelect(img.url)}
                        onDoubleClick={() => { if (renamingImage !== img.url && !multiSelect) { onSelect(img.url); onClose(); setSelected(null); } }}
                        onMouseEnter={() => setHoveredImage(img.url)}
                        onMouseLeave={() => setHoveredImage(null)}
                        style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', border: isSel ? '3px solid #0d6efd' : '2px solid #e9ecef', background: '#f8f9fa', position: 'relative' }}
                      >
                        <div style={{ height: 100, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee', position: 'relative' }}>
                          <img src={img.url} alt={img.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          {/* Hover overlay with action icons */}
                          {(hoveredImage === img.url || isSel) && renamingImage !== img.url && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); window.open(img.url, '_blank'); }}
                                title="Xem"
                                style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 4, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, color: '#0c5460' }}
                              ><i className="bi bi-eye"></i></button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setRenamingImage(img.url); setRenameImageValue(img.name.replace(/\.[^.]+$/, '')); }}
                                title="Đổi tên"
                                style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 4, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, color: '#856404' }}
                              ><i className="bi bi-pencil"></i></button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteImage(img.url); }}
                                title="Xóa"
                                style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 4, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, color: '#dc3545' }}
                              ><i className="bi bi-trash"></i></button>
                            </div>
                          )}
                        </div>
                        {isSel && (
                          <div style={{ position: 'absolute', top: 4, right: 4, background: '#0d6efd', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, zIndex: 1 }}>
                            <i className="bi bi-check"></i>
                          </div>
                        )}
                        <div style={{ padding: '4px 6px' }}>
                          {renamingImage === img.url ? (
                            <input
                              autoFocus
                              value={renameImageValue}
                              onChange={(e) => setRenameImageValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => { if (e.key === 'Enter') renameImage(img.url, renameImageValue); if (e.key === 'Escape') setRenamingImage(null); }}
                              onBlur={() => renameImage(img.url, renameImageValue)}
                              style={{ width: '100%', fontSize: 11, padding: '1px 4px', border: '1px solid #0d6efd', borderRadius: 3, outline: 'none' }}
                            />
                          ) : (
                            <p className="mb-0 text-truncate" style={{ fontSize: 11, color: '#495057' }} title={img.name}>{img.name}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: 4 }}>
                  {filteredImages.map((img) => {
                    const isSel = isSelected(img.url);
                    return (
                      <div
                        key={img.url}
                        onClick={() => toggleSelect(img.url)}
                        onDoubleClick={() => { if (!multiSelect) { onSelect(img.url); onClose(); setSelected(null); } }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', cursor: 'pointer', background: isSel ? '#e7f1ff' : 'transparent', borderRadius: 4 }}
                      >
                        <img src={img.url} alt={img.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #e9ecef', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {renamingImage === img.url ? (
                            <input
                              autoFocus
                              value={renameImageValue}
                              onChange={(e) => setRenameImageValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => { if (e.key === 'Enter') renameImage(img.url, renameImageValue); if (e.key === 'Escape') setRenamingImage(null); }}
                              onBlur={() => renameImage(img.url, renameImageValue)}
                              style={{ width: '100%', fontSize: 12, padding: '1px 6px', border: '1px solid #0d6efd', borderRadius: 3, outline: 'none' }}
                            />
                          ) : (
                            <p className="mb-0 text-truncate small fw-medium" style={{ fontSize: 12 }}>{img.name}</p>
                          )}
                          <p className="mb-0 text-muted" style={{ fontSize: 11 }}>{img.url}</p>
                        </div>
                        {isSel && <i className="bi bi-check-circle-fill" style={{ color: '#0d6efd', fontSize: 16 }}></i>}
                        <button
                          onClick={(e) => { e.stopPropagation(); const nameNoExt = img.name.replace(/\.[^.]+$/, ''); setRenamingImage(img.url); setRenameImageValue(nameNoExt); }}
                          title="Đổi tên"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: 13, padding: '2px 4px', flexShrink: 0 }}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteImage(img.url); }}
                          title="Xóa ảnh"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', fontSize: 14, padding: '2px 4px', flexShrink: 0 }}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderTop: '1px solid #e9ecef', background: '#f8f9fa', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#6c757d' }}>
            {/* Pagination */}
            {tab === 'library' && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => fetchImages(activeFolder, page - 1)}
                  style={{ padding: '2px 8px', border: '1px solid #dee2e6', borderRadius: 3, background: page <= 1 ? '#f8f9fa' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 12, color: page <= 1 ? '#adb5bd' : '#495057' }}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <span style={{ fontSize: 12, color: '#495057', minWidth: 60, textAlign: 'center' }}>
                  {page}/{totalPages}
                </span>
                <button
                  disabled={page >= totalPages || loading}
                  onClick={() => fetchImages(activeFolder, page + 1)}
                  style={{ padding: '2px 8px', border: '1px solid #dee2e6', borderRadius: 3, background: page >= totalPages ? '#f8f9fa' : '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 12, color: page >= totalPages ? '#adb5bd' : '#495057' }}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            )}
            <span style={{ fontSize: 11, color: '#adb5bd' }}>
              {total} ảnh
            </span>

            {multiSelect && selectedMulti.length > 0 ? (
              <span style={{ fontSize: 11, background: '#e7f1ff', padding: '2px 8px', borderRadius: 4, color: '#0d6efd' }}>
                Đã chọn {selectedMulti.length} ảnh
              </span>
            ) : !multiSelect && selected ? (
              <span style={{ fontSize: 11, background: '#e7f1ff', padding: '2px 8px', borderRadius: 4, color: '#0d6efd', maxWidth: 300, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selected}>
                {selected.split('/').pop()}
              </span>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { onClose(); setSelected(null); setSelectedMulti([]); }} style={{ padding: '5px 16px', border: '1px solid #dee2e6', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Đóng</button>
            <button
              onClick={handleInsert}
              disabled={!hasSelection}
              style={{ padding: '5px 16px', border: 'none', borderRadius: 4, background: hasSelection ? '#0d6efd' : '#adb5bd', color: '#fff', cursor: hasSelection ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500 }}
            >
              <i className="bi bi-check2 me-1"></i>Chèn{multiSelect && selectedMulti.length > 1 ? ` (${selectedMulti.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
