'use client';

import { useState } from 'react';

interface BulkActionsProps {
  selectedIds: string[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onExport: () => void;
  totalCount: number;
}

export default function BulkActions({
  selectedIds,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onActivate,
  onDeactivate,
  onExport,
  totalCount,
}: BulkActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const hasSelection = selectedIds.length > 0;
  const allSelected = selectedIds.length === totalCount && totalCount > 0;

  if (!hasSelection) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-3">
      {/* Selection Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={allSelected ? onDeselectAll : onSelectAll}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm font-semibold text-blue-900">
            Đã chọn {selectedIds.length} website
          </span>
        </div>

        {!allSelected && totalCount > selectedIds.length && (
          <button
            onClick={onSelectAll}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Chọn tất cả {totalCount} website
          </button>
        )}

        {hasSelection && (
          <button
            onClick={onDeselectAll}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Bỏ chọn
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onActivate}
          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          ✓ Kích hoạt
        </button>

        <button
          onClick={onDeactivate}
          className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
        >
          ⊗ Tắt
        </button>

        <button
          onClick={onExport}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          ↓ Xuất
        </button>

        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
        >
          🗑 Xóa
        </button>
      </div>
    </div>
  );
}
