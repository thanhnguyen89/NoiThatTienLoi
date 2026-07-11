'use client';

import { useState, useEffect } from 'react';
import Pagination from '@/components/Pagination';

interface AIConfigData {
  FORBIDDEN_WORDS: string[];
  CLICHE_OPENINGS: string[];
}

export default function AICheckConfigPage() {
  const [config, setConfig] = useState<AIConfigData>({
    FORBIDDEN_WORDS: [],
    CLICHE_OPENINGS: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'FORBIDDEN_WORDS' | 'CLICHE_OPENINGS'>('FORBIDDEN_WORDS');
  const [newItem, setNewItem] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Load config from API
  useEffect(() => {
    // Set page title
    document.title = 'Cấu Hình AI Check - Content Agent';
    
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-config');
      const json = await res.json();
      if (json.success) {
        setConfig(json.data);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
    setLoading(false);
  }

  async function saveConfig(type: 'FORBIDDEN_WORDS' | 'CLICHE_OPENINGS', items: string[]) {
    setSaving(true);
    try {
      const res = await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, items }),
      });
      const json = await res.json();
      if (json.success) {
        console.log('Config saved successfully');
      }
    } catch (err) {
      console.error('Failed to save config:', err);
    }
    setSaving(false);
  }

  function addItem() {
    if (!newItem.trim()) return;
    const items = [...config[activeTab], newItem.trim()];
    setConfig({ ...config, [activeTab]: items });
    saveConfig(activeTab, items);
    setNewItem('');
    // Reset to last page to see the new item
    const newTotalPages = Math.ceil(items.length / itemsPerPage);
    setCurrentPage(newTotalPages);
  }

  function removeItem(index: number) {
    const items = config[activeTab].filter((_, i) => i !== index);
    setConfig({ ...config, [activeTab]: items });
    saveConfig(activeTab, items);
    // Adjust current page if needed
    const newTotalPages = Math.ceil(items.length / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  }

  function startEdit(index: number, text: string) {
    setEditingIndex(index);
    setEditingText(text);
  }

  function saveEdit() {
    if (editingIndex === null || !editingText.trim()) return;
    const items = [...config[activeTab]];
    items[editingIndex] = editingText.trim();
    setConfig({ ...config, [activeTab]: items });
    saveConfig(activeTab, items);
    setEditingIndex(null);
    setEditingText('');
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditingText('');
  }

  const currentItems = config[activeTab];
  
  // Filter items based on search query
  const filteredItems = searchQuery.trim()
    ? currentItems.filter((item) =>
        item.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentItems;
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to page 1 when switching tabs or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Reset to page 1 when changing items per page
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const tabConfig = {
    FORBIDDEN_WORDS: {
      title: 'Từ Cấm AI',
      description: 'Danh sách từ/cụm từ mà AI thường dùng. Hệ thống sẽ cảnh báo khi phát hiện trong bài viết.',
      placeholder: 'Nhập từ cấm, ví dụ: tuy nhiên, quan trọng...',
      icon: '🚫',
      examples: ['tuy nhiên', 'bên cạnh đó', 'quan trọng', 'hiệu quả'],
    },
    CLICHE_OPENINGS: {
      title: 'Mở Bài Sáo Rỗng',
      description: 'Các cụm từ mở bài máy móc, thiếu sáng tạo. Nên tránh dùng ở đầu câu.',
      placeholder: 'Nhập cụm từ mở bài, ví dụ: X là, được biết đến...',
      icon: '📝',
      examples: ['X là', 'được biết đến', 'chắc hẳn bạn', 'bạn đang tìm kiếm'],
    },
  };

  const current = tabConfig[activeTab];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Đang tải cấu hình...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cấu Hình AI Check</h1>
            <p className="text-sm text-gray-600 mt-1">
              Quản lý danh sách từ cấm và mở bài sáo rỗng để phát hiện giọng AI
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-sm text-blue-600 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Đang lưu...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {(['FORBIDDEN_WORDS', 'CLICHE_OPENINGS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tabConfig[tab].icon} {tabConfig[tab].title}
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                {config[tab].length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="w-full mx-auto">
          {/* Description */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{current.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">{current.title}</h3>
                <p className="text-sm text-blue-700 leading-relaxed">{current.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-blue-600 font-medium">Ví dụ:</span>
                  {current.examples.map((ex, i) => (
                    <span
                      key={i}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-mono"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Add new item */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Thêm mới</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                placeholder={current.placeholder}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addItem}
                disabled={!newItem.trim() || saving}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                ➕ Thêm
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm trong danh sách..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="text-sm text-gray-600">
                  Tìm thấy <span className="font-semibold text-blue-600">{filteredItems.length}</span> kết quả
                </div>
              )}
            </div>
          </div>

          {/* Items list */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Danh sách ({currentItems.length} mục)
              </h3>
              {currentItems.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`Xóa tất cả ${currentItems.length} mục?`)) {
                      setConfig({ ...config, [activeTab]: [] });
                      saveConfig(activeTab, []);
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  🗑️ Xóa tất cả
                </button>
              )}
            </div>

            <div className="divide-y divide-gray-100">
              {filteredItems.length === 0 ? (
                <div className="px-4 py-12 text-center text-gray-400">
                  {searchQuery ? (
                    <>
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="text-sm">Không tìm thấy kết quả cho "{searchQuery}"</p>
                      <p className="text-xs mt-1">Thử tìm kiếm với từ khóa khác</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm">Chưa có mục nào</p>
                      <p className="text-xs mt-1">Thêm mục đầu tiên ở trên</p>
                    </>
                  )}
                </div>
              ) : (
                paginatedItems.map((item, index) => {
                  const actualIndex = startIndex + index; // Real index in full array
                  return (
                    <div
                      key={actualIndex}
                      className="px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      {editingIndex === actualIndex ? (
                        // Edit mode
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                            className="flex-1 border border-blue-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={saveEdit}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                          >
                            ✓ Lưu
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-50"
                          >
                            ✕ Hủy
                          </button>
                        </div>
                      ) : (
                        // View mode
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-gray-400 text-xs font-mono w-12">
                              #{actualIndex + 1}
                            </span>
                            <span className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-1 rounded">
                              {item}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(actualIndex, item)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Sửa"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => removeItem(actualIndex)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Xóa"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pagination */}
          {filteredItems.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredItems.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}

          {/* Stats */}
          {currentItems.length > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl font-bold text-gray-900">{currentItems.length}</div>
                <div className="text-xs text-gray-600 mt-1">Tổng số mục</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(currentItems.reduce((sum, item) => sum + item.length, 0) / currentItems.length)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Độ dài trung bình</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.max(...currentItems.map((item) => item.length))}
                </div>
                <div className="text-xs text-gray-600 mt-1">Mục dài nhất</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
