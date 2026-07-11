'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HOOK_STYLES, LS_KEY_CONFIG, VIDEO_TYPES } from '@/lib/viet-bai-tiktok/options';
import type { SavedTiktokPost } from '@/lib/viet-bai-tiktok/types';

interface ListResponse {
  posts: SavedTiktokPost[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const VIDEO_LABELS = Object.fromEntries(VIDEO_TYPES.map((item) => [item.value, `${item.icon} ${item.label}`]));
const HOOK_LABELS = Object.fromEntries(HOOK_STYLES.map((item) => [item.value, `${item.icon} ${item.label}`]));

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function previewText(text: string, length = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > length ? `${clean.slice(0, length)}...` : clean;
}

function buildReuseConfig(post: SavedTiktokPost) {
  return {
    topic: post.topic,
    videoType: post.videoType,
    hookStyle: post.hookStyle,
    ctaStyle: post.ctaStyle,
    language: 'Vietnamese',
    emojiLevel: post.emojiLevel || 'medium',
    modelId: '',
  };
}

function EditModal({
  post,
  onClose,
  onSaved,
}: {
  post: SavedTiktokPost;
  onClose: () => void;
  onSaved: (next: SavedTiktokPost) => void;
}) {
  const [title, setTitle] = useState(post.title || '');
  const [content, setContent] = useState(post.content);
  const [hashtags, setHashtags] = useState(post.hashtags || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;

  async function handleSave() {
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/viet-bai-tiktok/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, hashtags }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể lưu thay đổi');
      onSaved({
        ...post,
        title: json.title,
        content: json.content,
        hashtags: json.hashtags,
        wordCount: json.wordCount,
        charCount: json.charCount,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu thay đổi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-950">Chỉnh sửa caption TikTok</h2>
            <p className="text-xs text-slate-400 mt-1">{VIDEO_LABELS[post.videoType]} · {HOOK_LABELS[post.hookStyle]}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Tiêu đề</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
          </div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={14}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-7 resize-none focus:outline-none focus:ring-2 focus:ring-slate-950"
          />
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Hashtag</label>
            <input
              value={hashtags}
              onChange={(event) => setHashtags(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-cyan-700 focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{wordCount} từ · {content.length} ký tự</span>
            {content.length > 1500 && <span className="text-amber-600">Dài hơn vùng preview FYP</span>}
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-xl hover:bg-white text-slate-600">
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !content.trim()}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-950 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuanLyBaiTiktokPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<SavedTiktokPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterVideoType, setFilterVideoType] = useState('');
  const [filterHookStyle, setFilterHookStyle] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedHashtagId, setCopiedHashtagId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<SavedTiktokPost | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async (nextPage = 1, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '20',
        ...(search && { q: search }),
        ...(filterVideoType && { videoType: filterVideoType }),
        ...(filterHookStyle && { hookStyle: filterHookStyle }),
      });
      const res = await fetch(`/api/viet-bai-tiktok?${params}`);
      const json = (await res.json()) as ListResponse;
      if (!res.ok) throw new Error('Không thể tải danh sách caption');

      setPosts((prev) => (append ? [...prev, ...json.posts] : json.posts));
      setTotal(json.total);
      setPage(json.page);
      setHasMore(json.hasMore);
    } finally {
      setLoading(false);
    }
  }, [filterHookStyle, filterVideoType, search]);

  useEffect(() => {
    void fetchPosts(1, false);
  }, [fetchPosts]);

  function handleCopy(post: SavedTiktokPost) {
    navigator.clipboard.writeText(post.content).then(() => {
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  }

  function handleCopyHashtags(post: SavedTiktokPost) {
    if (!post.hashtags) return;
    navigator.clipboard.writeText(post.hashtags).then(() => {
      setCopiedHashtagId(post.id);
      setTimeout(() => setCopiedHashtagId(null), 1800);
    });
  }

  function handleReuse(post: SavedTiktokPost) {
    sessionStorage.setItem(LS_KEY_CONFIG, JSON.stringify(buildReuseConfig(post)));
    router.push('/viet-bai-tiktok');
  }

  async function handleDelete(post: SavedTiktokPost) {
    if (deletingId !== post.id) {
      setDeletingId(post.id);
      setTimeout(() => setDeletingId(null), 3000);
      return;
    }

    const res = await fetch(`/api/viet-bai-tiktok/${post.id}`, { method: 'DELETE' });
    if (res.ok) {
      setPosts((prev) => prev.filter((item) => item.id !== post.id));
      setTotal((prev) => Math.max(0, prev - 1));
    }
    setDeletingId(null);
  }

  function handleSaved(next: SavedTiktokPost) {
    setPosts((prev) => prev.map((item) => (item.id === next.id ? next : item)));
  }

  function clearFilters() {
    setSearch('');
    setFilterVideoType('');
    setFilterHookStyle('');
  }

  return (
    <div className="h-full flex flex-col bg-slate-100">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎬</span>
          <div>
            <h1 className="text-lg font-bold text-slate-950">Caption TikTok đã lưu</h1>
            <p className="text-xs text-slate-400">{total} caption</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push('/viet-bai-tiktok')}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-950 text-white hover:bg-slate-800"
          >
            ✏️ Viết caption mới
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 py-2 text-sm border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600"
          >
            ← Quay lại
          </button>
        </div>
      </div>

      <div className="bg-white border-b border-slate-100 px-6 py-3 flex flex-col gap-3 lg:flex-row lg:items-center shrink-0">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo chủ đề, caption, thương hiệu..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-950"
          />
        </div>
        <select
          value={filterVideoType}
          onChange={(event) => setFilterVideoType(event.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-950 bg-white"
        >
          <option value="">Tất cả loại video</option>
          {VIDEO_TYPES.map((item) => (
            <option key={item.value} value={item.value}>{item.icon} {item.label}</option>
          ))}
        </select>
        <select
          value={filterHookStyle}
          onChange={(event) => setFilterHookStyle(event.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-950 bg-white"
        >
          <option value="">Tất cả hook</option>
          {HOOK_STYLES.map((item) => (
            <option key={item.value} value={item.value}>{item.icon} {item.label}</option>
          ))}
        </select>
        {(search || filterVideoType || filterHookStyle) && (
          <button type="button" onClick={clearFilters} className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50">
            Xóa lọc
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-950 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-base font-medium text-slate-600">
              {search || filterVideoType || filterHookStyle ? 'Không tìm thấy caption phù hợp' : 'Chưa có caption TikTok nào'}
            </p>
            {!search && !filterVideoType && !filterHookStyle && (
              <button
                type="button"
                onClick={() => router.push('/viet-bai-tiktok')}
                className="mt-4 px-5 py-2.5 bg-slate-950 text-white text-sm font-semibold rounded-xl hover:bg-slate-800"
              >
                Viết caption đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <article key={post.id} className="bg-white rounded-2xl border border-slate-200 hover:border-slate-400 transition-all p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-full bg-slate-950 text-white text-xs font-semibold">
                        {VIDEO_LABELS[post.videoType] || post.videoType}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold">
                        {HOOK_LABELS[post.hookStyle] || post.hookStyle}
                      </span>
                      {post.brandName && <span className="text-xs text-slate-500">{post.brandName}</span>}
                      <span className="text-xs text-slate-400">{formatDate(post.createdAt)}</span>
                    </div>
                    {post.title && <h2 className="text-sm font-bold text-slate-950 line-clamp-1">{post.title}</h2>}
                    <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{post.topic}</p>
                    <p className="text-sm text-slate-600 leading-6 mt-1">{previewText(post.content)}</p>
                    {post.hashtags && <p className="mt-1 text-xs text-cyan-700 line-clamp-1">{post.hashtags}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                      <span>{post.wordCount || 0} từ</span>
                      <span>{post.charCount || 0} ký tự</span>
                      <span>CTA: {post.ctaStyle}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(post)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      {copiedId === post.id ? '✓ Đã copy' : '📋 Copy caption'}
                    </button>
                    {post.hashtags && (
                      <button
                        type="button"
                        onClick={() => handleCopyHashtags(post)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                      >
                        {copiedHashtagId === post.id ? '✓ Đã copy' : '# Copy hashtag'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingPost(post)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      ✏️ Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReuse(post)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                    >
                      🔄 Dùng lại
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(post)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                        deletingId === post.id
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-red-200 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {deletingId === post.id ? 'Xác nhận xóa' : '🗑️ Xóa'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={() => void fetchPosts(page + 1, true)}
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? 'Đang tải...' : 'Tải thêm'}
            </button>
          </div>
        )}
      </div>

      {editingPost && (
        <EditModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
