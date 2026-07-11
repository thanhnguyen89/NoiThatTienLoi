'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { useWebsites, useCreateWebsite, useUpdateWebsite, useDeleteWebsite, useBulkAction, useExportConfigs, useImportConfigs } from './hooks/useWebsiteQueries';
import { validateWebsiteConfig } from './schemas';
import WebsiteModal from './components/WebsiteModal';
import WebsiteCard from './components/WebsiteCard';
import SearchFilter from './components/SearchFilter';
import Pagination from './components/Pagination';
import BulkActions from './components/BulkActions';
import ImportExportModal from './components/ImportExportModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './hooks/KeyboardShortcutsHelp';
import { PLATFORM_TYPES, WebsiteConfig, emptyWebsite } from './types';
import toast from 'react-hot-toast';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CauHinhWebsitePage() {
  // State
  const [showModal, setShowModal] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<WebsiteConfig | null>(null);
  const [formData, setFormData] = useState<Partial<WebsiteConfig>>({ ...emptyWebsite });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Queries & Mutations
  const { data: websites = [], isLoading, refetch } = useWebsites();
  const createMutation = useCreateWebsite();
  const updateMutation = useUpdateWebsite();
  const deleteMutation = useDeleteWebsite();
  const bulkMutation = useBulkAction();
  const exportMutation = useExportConfigs();
  const importMutation = useImportConfigs();

  // Filtered & Paginated Data
  const filteredWebsites = useMemo(() => {
    return websites.filter(w => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = w.name.toLowerCase().includes(query);
        const matchUrl = w.url.toLowerCase().includes(query);
        const matchCompany = w.companyName?.toLowerCase().includes(query);
        if (!matchName && !matchUrl && !matchCompany) return false;
      }

      // Platform filter
      if (platformFilter !== 'all' && w.platform !== platformFilter) return false;

      // Status filter
      if (statusFilter === 'active' && !w.isActive) return false;
      if (statusFilter === 'inactive' && w.isActive) return false;

      return true;
    });
  }, [websites, searchQuery, platformFilter, statusFilter]);

  const paginatedWebsites = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredWebsites.slice(start, end);
  }, [filteredWebsites, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredWebsites.length / pageSize);

  // Effects
  useEffect(() => {
    document.title = 'Cấu hình Website — Content Agent';
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, platformFilter, statusFilter, pageSize]);

  // Keyboard Shortcuts
  useKeyboardShortcuts(
    {
      onAdd: () => !showModal && openAddModal(),
      onSearch: () => searchInputRef.current?.focus(),
      onExport: () => !showImportExport && setShowImportExport(true),
      onImport: () => !showImportExport && setShowImportExport(true),
      onRefresh: () => refetch(),
      onEscape: () => {
        if (showModal) closeModal();
        else if (showImportExport) setShowImportExport(false);
        else if (showHelp) setShowHelp(false);
        else if (selectedIds.length > 0) setSelectedIds([]);
      },
      onSelectAll: () => {
        if (selectedIds.length === filteredWebsites.length) {
          setSelectedIds([]);
        } else {
          setSelectedIds(filteredWebsites.map(w => w.id));
        }
      },
      onHelp: () => setShowHelp(!showHelp),
    },
    !showModal && !showImportExport
  );

  // Handlers
  function openAddModal() {
    setEditingWebsite(null);
    setFormData({ ...emptyWebsite });
    setShowModal(true);
  }

  function openEditModal(website: WebsiteConfig) {
    setEditingWebsite(website);
    setFormData({
      name: website.name,
      url: website.url,
      platform: website.platform,
      apiUrl: website.apiUrl,
      companyName: website.companyName || '',
      hotline: website.hotline || '',
      hotlineComplaint: website.hotlineComplaint || '',
      branchCount: website.branchCount,
      branchListUrl: website.branchListUrl || '',
      supportInfo: website.supportInfo || '',
      username: website.username || '',
      appPassword: '',
      apiKey: '',
      apiSecret: '',
      defaultCategory: website.defaultCategory,
      defaultAuthorId: website.defaultAuthorId,
      defaultStatus: website.defaultStatus,
      isActive: website.isActive,
      isDefault: website.isDefault,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingWebsite(null);
    setFormData({ ...emptyWebsite });
  }

  async function handleSave() {
    // Validate
    const validation = validateWebsiteConfig(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (editingWebsite) {
      await updateMutation.mutateAsync({ ...formData, id: editingWebsite.id } as any);
    } else {
      await createMutation.mutateAsync(formData as any);
    }

    closeModal();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Xóa "${name}"?`)) return;
    await deleteMutation.mutateAsync(id);
    setSelectedIds(prev => prev.filter(sid => sid !== id));
  }

  function handleSelect(id: string, selected: boolean) {
    if (selected) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(sid => sid !== id));
    }
  }

  function handleSelectAll() {
    setSelectedIds(filteredWebsites.map(w => w.id));
  }

  function handleDeselectAll() {
    setSelectedIds([]);
  }

  async function handleBulkDelete() {
    if (!confirm(`Xóa ${selectedIds.length} website?`)) return;
    await bulkMutation.mutateAsync({ ids: selectedIds, action: 'delete' });
    setSelectedIds([]);
  }

  async function handleBulkActivate() {
    await bulkMutation.mutateAsync({ ids: selectedIds, action: 'activate' });
    setSelectedIds([]);
  }

  async function handleBulkDeactivate() {
    await bulkMutation.mutateAsync({ ids: selectedIds, action: 'deactivate' });
    setSelectedIds([]);
  }

  async function handleBulkExport() {
    await exportMutation.mutateAsync({ ids: selectedIds, format: 'json', includeSecrets: false });
  }

  async function handleExport(format: 'json' | 'csv', includeSecrets: boolean) {
    await exportMutation.mutateAsync({ format, includeSecrets });
  }

  async function handleImport(data: any[], overwrite: boolean) {
    await importMutation.mutateAsync({ data, overwrite });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-5">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌐</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Cấu Hình Website & Nền Tảng</h1>
                <p className="text-sm text-gray-500">
                  Kết nối website (WordPress, Shopify, Custom API) và các kênh mạng xã hội
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHelp(true)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                title="Phím tắt (Shift + ?)"
              >
                ⌨️
              </button>
              <button
                onClick={() => setShowImportExport(true)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 flex items-center gap-2"
              >
                📤 Xuất/Nhập
              </button>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <span>+</span> Thêm website
              </button>
            </div>
          </div>
        </div>

        {/* Platform Summary */}
        <div className="grid grid-cols-5 gap-3">
          {PLATFORM_TYPES.map(p => {
            const count = websites.filter(w => w.platform === p.value).length;
            return (
              <div
                key={p.value}
                className={`bg-white rounded-xl border-2 p-3 text-center transition-all cursor-pointer ${
                  count > 0 ? 'border-green-300 hover:shadow-md' : 'border-gray-100'
                }`}
                onClick={() => setPlatformFilter(platformFilter === p.value ? 'all' : p.value)}
              >
                <p className="text-2xl mb-1">{p.icon}</p>
                <p className="text-xs font-semibold text-gray-700">{p.label}</p>
                <p className={`text-xs mt-0.5 ${count > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  {count > 0 ? `${count} kết nối` : 'Chưa có'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Search & Filter */}
        <SearchFilter
          onSearch={setSearchQuery}
          onFilterPlatform={setPlatformFilter}
          onFilterStatus={setStatusFilter}
          totalCount={websites.length}
          filteredCount={filteredWebsites.length}
        />

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <BulkActions
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onDelete={handleBulkDelete}
            onActivate={handleBulkActivate}
            onDeactivate={handleBulkDeactivate}
            onExport={handleBulkExport}
            totalCount={filteredWebsites.length}
          />
        )}

        {/* Website List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredWebsites.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">🌐</p>
            <p className="text-gray-700 font-semibold mb-1">
              {websites.length === 0 ? 'Chưa có website nào' : 'Không tìm thấy kết quả'}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {websites.length === 0
                ? 'Thêm website để có thể đăng bài trực tiếp sau khi viết xong'
                : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'}
            </p>
            {websites.length === 0 && (
              <button
                onClick={openAddModal}
                className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                + Thêm website đầu tiên
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              {paginatedWebsites.map(w => (
                <WebsiteCard
                  key={w.id}
                  website={w}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  isSelected={selectedIds.includes(w.id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredWebsites.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </>
        )}

        {/* Hướng dẫn */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-900 mb-2">💡 Mẹo sử dụng</p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Nhấn <kbd className="px-2 py-0.5 bg-blue-100 rounded text-xs font-mono">Ctrl+N</kbd> để thêm website mới</li>
            <li>Nhấn <kbd className="px-2 py-0.5 bg-blue-100 rounded text-xs font-mono">Ctrl+K</kbd> để tìm kiếm</li>
            <li>Nhấn <kbd className="px-2 py-0.5 bg-blue-100 rounded text-xs font-mono">?</kbd> để xem tất cả phím tắt</li>
            <li>Click vào platform card để lọc theo nền tảng</li>
          </ul>
        </div>
      </div>

      {/* Modals */}
      <WebsiteModal
        isOpen={showModal}
        onClose={closeModal}
        editingWebsite={editingWebsite}
        formData={formData}
        onFormChange={setFormData}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        onExport={handleExport}
        onImport={handleImport}
      />

      <KeyboardShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Toast Container */}
      <Toaster position="bottom-right" />
    </div>
  );
}
