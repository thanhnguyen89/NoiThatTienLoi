'use client';

import { useEffect, useState } from 'react';

interface Website {
  id: string;
  name: string;
  url: string;
  defaultCategory?: number | null;
}

interface PublishPanelProps {
  articleId: string;
  title: string;
  onClose: () => void;
  onSuccess?: (link: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, index) => {
  const label = index === 0 ? '12 AM' : index < 12 ? `${index} AM` : index === 12 ? '12 PM' : `${index - 12} PM`;
  return { value: index, label };
});

export function PublishPanel({ articleId, onClose, onSuccess }: PublishPanelProps) {
  const [sites, setSites] = useState<Website[]>([]);
  const [siteId, setSiteId] = useState('');
  const [category, setCategory] = useState('');
  const [scheduleHr, setScheduleHr] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/website-configs?activeOnly=true')
      .then((response) => response.json())
      .then((data: { success?: boolean; data?: Array<{ id: string; name: string; url: string; defaultCategory?: number | null }> }) => {
        const nextSites = (data.success ? data.data : []) ?? [];
        setSites(nextSites);
        if (nextSites.length === 1) {
          setSiteId(nextSites[0].id);
          if (nextSites[0].defaultCategory) {
            setCategory(String(nextSites[0].defaultCategory));
          }
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  async function handlePublish() {
    if (!siteId) {
      setError('Vui lòng chọn website.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/articles/${articleId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          category: category || undefined,
          scheduleHour: scheduleHr ?? undefined,
        }),
      });
      const data = await response.json() as { postUrl?: string; error?: string };
      if (!response.ok) throw new Error(data.error || 'Publish thất bại');
      onSuccess?.(data.postUrl ?? '');
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />

      <div className="w-80 bg-white shadow-xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold text-gray-800">Đăng bài lên website</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            {sites.length === 0 ? (
              <p className="text-xs text-gray-400">
                Chưa có website. <a href="/cau-hinh-website" className="text-blue-500 underline">Thêm website</a>
              </p>
            ) : (
              <select
                value={siteId}
                onChange={(event) => setSiteId(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn website --</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục (tuỳ chọn)</label>
            <input
              type="text"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="VD: 12 hoặc để trống"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian đăng</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={scheduleHr === null} onChange={() => setScheduleHr(null)} className="text-blue-600" />
                <span className="text-sm text-gray-700">Đăng ngay</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={scheduleHr !== null} onChange={() => setScheduleHr(8)} className="text-blue-600" />
                <span className="text-sm text-gray-700">Hẹn giờ</span>
              </label>
              {scheduleHr !== null && (
                <select
                  value={scheduleHr}
                  onChange={(event) => setScheduleHr(Number(event.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {HOURS.map((hour) => (
                    <option key={hour.value} value={hour.value}>{hour.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Huỷ
          </button>
          <button
            onClick={() => void handlePublish()}
            disabled={loading || !siteId}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang đăng...' : scheduleHr !== null ? 'Hẹn giờ đăng' : 'Đăng bài'}
          </button>
        </div>
      </div>
    </div>
  );
}
