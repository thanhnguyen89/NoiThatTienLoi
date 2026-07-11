'use client';

import { WebsiteConfig, PLATFORM_TYPES, STATUS_OPTIONS } from '../types';

interface WebsiteCardProps {
  website: WebsiteConfig;
  onEdit: (website: WebsiteConfig) => void;
  onDelete: (id: string, name: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export default function WebsiteCard({ website, onEdit, onDelete, isSelected, onSelect }: WebsiteCardProps) {
  const platform = PLATFORM_TYPES.find(p => p.value === website.platform);
  const statusLabel = STATUS_OPTIONS.find(s => s.value === website.defaultStatus)?.label || website.defaultStatus;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-4 border-l-4 transition-all ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-200'
          : website.isDefault
          ? 'border-blue-500'
          : website.isActive
          ? 'border-green-400'
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Checkbox */}
        {onSelect && (
          <div className="shrink-0 pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={e => onSelect(website.id, e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
          </div>
        )}

        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0 ${
              website.isActive ? 'bg-blue-50' : 'bg-gray-100'
            }`}
          >
            {platform?.icon || '🌐'}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-semibold text-gray-900 text-sm">{website.name}</p>
              {website.isDefault && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Mặc định</span>
              )}
              {!website.isActive && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Tắt</span>
              )}
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                {platform?.label || website.platform}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{statusLabel}</span>
            </div>

            {/* URL */}
            <a
              href={website.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline block truncate mb-2"
            >
              {website.url}
            </a>

            {/* Company Info */}
            {(website.companyName || website.hotline || website.branchCount) && (
              <div className="flex items-center gap-3 mb-2 text-xs text-gray-600 flex-wrap">
                {website.companyName && (
                  <span className="flex items-center gap-1">
                    <span>🏢</span>
                    <span className="font-medium">{website.companyName}</span>
                  </span>
                )}
                {website.branchCount && (
                  <span className="flex items-center gap-1">
                    <span>📍</span>
                    <span>{website.branchCount} chi nhánh</span>
                  </span>
                )}
                {website.hotline && (
                  <span className="flex items-center gap-1">
                    <span>📞</span>
                    <span>{website.hotline}</span>
                  </span>
                )}
                {website.hotlineComplaint && (
                  <span className="flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{website.hotlineComplaint}</span>
                  </span>
                )}
              </div>
            )}

            {/* Branch List URL */}
            {website.branchListUrl && (
              <a
                href={website.branchListUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline block truncate mb-2"
              >
                🗺️ Xem danh sách chi nhánh
              </a>
            )}

            {/* Technical Info */}
            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              <span>API: {website.apiUrl.replace(/https?:\/\//, '').substring(0, 40)}...</span>
              {website.username && <span>· Tài khoản: {website.username}</span>}
              {website.hasPassword && <span className="text-green-600">· 🔑 Có mật khẩu</span>}
              {website.hasApiKey && <span className="text-green-600">· 🔑 Có API key</span>}
            </div>

            {/* Support Info */}
            {website.supportInfo && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 border border-gray-100">
                💬 {website.supportInfo}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(website)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            Sửa
          </button>
          <button
            onClick={() => onDelete(website.id, website.name)}
            className="px-3 py-1.5 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-600"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}
