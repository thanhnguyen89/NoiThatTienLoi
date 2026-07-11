'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { joinComments } from '@/lib/facebook-comment/parser';
import { COMMENT_BRAND_STYLES } from '@/lib/viet-tu-facebook-comment/options';
import type { FacebookCommentBrandItem } from '@/lib/viet-tu-facebook-comment/types';

function formatDate(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function QuanLyFacebookCommentPage() {
  const [items, setItems] = useState<FacebookCommentBrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [styleFilter, setStyleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchItems = useCallback(async (nextPage = 1, append = false) => {
    setLoading(true);

    const params = new URLSearchParams({
      page: String(nextPage),
      limit: '20',
    });
    if (styleFilter) params.set('style', styleFilter);
    if (search) params.set('search', search);

    try {
      const res = await fetch(`/api/viet-tu-facebook-comment?${params.toString()}`);
      const data = await res.json() as {
        items: FacebookCommentBrandItem[];
        total: number;
        hasMore: boolean;
      };

      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setTotal(data.total || 0);
      setHasMore(Boolean(data.hasMore));
      setPage(nextPage);
      if (!append) setExpanded(null);
    } finally {
      setLoading(false);
    }
  }, [search, styleFilter]);

  useEffect(() => {
    void fetchItems(1, false);
  }, [fetchItems]);

  async function handleDelete(id: string) {
    if (!confirm('Xoa nhom comment nay?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/viet-tu-facebook-comment/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } finally {
      setDeleting(null);
    }
  }

  function handleCopyAll(item: FacebookCommentBrandItem) {
    void navigator.clipboard.writeText(joinComments(item.comments)).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quan ly Comment Facebook</h1>
            <p className="text-sm text-gray-500 mt-1">{total} nhom comment da luu</p>
          </div>
          <Link
            href="/viet-tu-facebook-comment"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
          >
            Tao comment moi
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 flex gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tim noi dung bai post..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={styleFilter}
            onChange={(event) => setStyleFilter(event.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tat ca style</option>
            {COMMENT_BRAND_STYLES.map((style) => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </div>

        {loading && items.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
            Chua co nhom comment nao.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const style = COMMENT_BRAND_STYLES.find((entry) => entry.value === item.style);
              const isExpanded = expanded === item.id;

              return (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 line-clamp-2">
                        {item.postContent.slice(0, 180)}
                        {item.postContent.length > 180 ? '...' : ''}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {style?.label || item.style}
                        </span>
                        <span className="text-xs text-gray-400">{item.comments.length} comments</span>
                        <span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span>
                        {item.notes && <span className="text-xs text-gray-400">Note: {item.notes}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyAll(item)}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        {copiedId === item.id ? 'Da copy' : 'Copy tat ca'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : item.id)}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        {isExpanded ? 'Thu gon' : 'Xem'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="px-3 py-1.5 text-xs border border-red-200 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting === item.id ? '...' : 'Xoa'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
                      {item.comments.map((comment, index) => (
                        <div key={`${item.id}-${index}`} className="flex items-start gap-3 group">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <p className="flex-1 text-sm text-gray-700 leading-relaxed">{comment}</p>
                          <button
                            type="button"
                            onClick={() => void navigator.clipboard.writeText(comment)}
                            className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-blue-600 transition-opacity"
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => void fetchItems(page + 1, true)}
              className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-white"
            >
              Tai them
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
