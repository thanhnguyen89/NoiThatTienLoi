'use client';

import { useEffect, useState } from 'react';
import Pagination from '@/components/Pagination';

interface ActivityLog {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  description: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    document.title = 'Log Activity - Content Agent';
    loadLogs();
  }, [currentPage, itemsPerPage, filterAction]);

  async function loadLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAction !== 'all') params.set('action', filterAction);
      params.set('page', currentPage.toString());
      params.set('limit', itemsPerPage.toString());

      const res = await fetch(`/api/activity?${params}`);
      const json = await res.json();
      
      if (json.success) {
        setLogs(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      LOGIN: '🔐',
      LOGOUT: '🚪',
      CREATE: '➕',
      UPDATE: '✏️',
      DELETE: '🗑️',
      VIEW: '👁️',
      EXPORT: '📥',
      IMPORT: '📤',
    };
    return icons[action] || '📝';
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      LOGIN: 'bg-green-100 text-green-700',
      LOGOUT: 'bg-gray-100 text-gray-700',
      CREATE: 'bg-blue-100 text-blue-700',
      UPDATE: 'bg-yellow-100 text-yellow-700',
      DELETE: 'bg-red-100 text-red-700',
      VIEW: 'bg-purple-100 text-purple-700',
      EXPORT: 'bg-indigo-100 text-indigo-700',
      IMPORT: 'bg-pink-100 text-pink-700',
    };
    return colors[action] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN');
  };

  const totalPages = Math.ceil(logs.length / itemsPerPage);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Log Activity</h1>
            <p className="text-sm text-gray-500 mt-1">Theo dõi hoạt động của bạn trong hệ thống</p>
          </div>
          
          {/* Filter */}
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">Tất cả hoạt động</option>
            <option value="LOGIN">Đăng nhập</option>
            <option value="LOGOUT">Đăng xuất</option>
            <option value="CREATE">Tạo mới</option>
            <option value="UPDATE">Cập nhật</option>
            <option value="DELETE">Xóa</option>
            <option value="VIEW">Xem</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-400">Chưa có hoạt động nào</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Hoạt động</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mô tả</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getActionIcon(log.action)}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {log.description || '-'}
                        </div>
                        {log.resource && (
                          <div className="text-xs text-gray-500 mt-1">
                            {log.resource} {log.resourceId && `#${log.resourceId.slice(0, 8)}`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 font-mono">
                          {log.ipAddress || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {formatDate(log.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={logs.length}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(newSize) => {
                  setItemsPerPage(newSize);
                  setCurrentPage(1);
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
