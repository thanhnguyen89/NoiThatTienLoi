'use client';

import { useState } from 'react';
import { PLATFORM_TYPES } from '../types';

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onFilterPlatform: (platform: string) => void;
  onFilterStatus: (status: string) => void;
  totalCount: number;
  filteredCount: number;
}

export default function SearchFilter({
  onSearch,
  onFilterPlatform,
  onFilterStatus,
  totalCount,
  filteredCount,
}: SearchFilterProps) {
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('all');
  const [status, setStatus] = useState('all');

  function handleSearchChange(value: string) {
    setQuery(value);
    onSearch(value);
  }

  function handlePlatformChange(value: string) {
    setPlatform(value);
    onFilterPlatform(value);
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    onFilterStatus(value);
  }

  function handleReset() {
    setQuery('');
    setPlatform('all');
    setStatus('all');
    onSearch('');
    onFilterPlatform('all');
    onFilterStatus('all');
  }

  const hasFilters = query || platform !== 'all' || status !== 'all';

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      {/* Search Input */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="🔍 Tìm kiếm theo tên, URL, công ty..."
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>

        {hasFilters && (
          <button
            onClick={handleReset}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 whitespace-nowrap"
          >
            ✕ Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        {/* Platform Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">Nền tảng:</label>
          <select
            value={platform}
            onChange={e => handlePlatformChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="all">Tất cả</option>
            {PLATFORM_TYPES.map(p => (
              <option key={p.value} value={p.value}>
                {p.icon} {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">Trạng thái:</label>
          <select
            value={status}
            onChange={e => handleStatusChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã tắt</option>
          </select>
        </div>

        {/* Result Count */}
        <div className="ml-auto text-xs text-gray-500">
          {hasFilters ? (
            <>
              Hiển thị <span className="font-semibold text-blue-600">{filteredCount}</span> / {totalCount} website
            </>
          ) : (
            <>
              Tổng <span className="font-semibold">{totalCount}</span> website
            </>
          )}
        </div>
      </div>
    </div>
  );
}
