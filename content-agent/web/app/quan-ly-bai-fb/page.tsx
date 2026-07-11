'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type FBPostStatus = 'DRAFT' | 'READY' | 'PUBLISHED' | 'ARCHIVED';

interface FBPost {
  id:             string;
  keyword:        string;
  content:        string;
  contentPreview: string;
  shopName:       string | null;
  industry:       string | null;
  tone:           string;
  template:       string | null;
  wordCount:      number;
  emojiCount:     number;
  status:         FBPostStatus;
  note:           string | null;
  publishedAt:    string | null;
  createdAt:      string;
  updatedAt:      string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FBPostEditParams {
  provider: string;
  keyword: string;
  wordCount: number;
  tone: string;
  template: string | null;
  shopName: string;
  industry: string;
  brandPronouns: string;
  brandAudience: string;
  brandToneNotes: string;
  phone: string;
  address: string;
  brandDesc: string;
  brandForbidden: string;
  ctaStandard: string;
  mainProducts: string;
  includeEmojis: boolean;
  includeHashtags: boolean;
  freeShip: boolean;
  urgency: boolean;
}

interface FBPostEditSession {
  id: string;
  content: string;
  params: FBPostEditParams;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<FBPostStatus, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Nháp',     color: 'text-gray-600',  bg: 'bg-gray-100'   },
  READY:     { label: 'Sẵn sàng', color: 'text-blue-700',  bg: 'bg-blue-100'   },
  PUBLISHED: { label: 'Đã đăng',  color: 'text-green-700', bg: 'bg-green-100'  },
  ARCHIVED:  { label: 'Lưu trữ',  color: 'text-orange-700',bg: 'bg-orange-100' },
};

const TONE_LABELS: Record<string, string> = {
  friendly:     '😊 Thân thiện',
  professional: '💼 Chuyên nghiệp',
  casual:       '💬 Tự nhiên',
  sales:        '🔥 Bán hàng mạnh',
  rewrite:      '✏️ Viết lại',
  shorten:      '✂️ Rút ngắn',
};

const TEMPLATE_LABELS: Record<string, string> = {
  product_intro:   'Giới thiệu SP',
  combo_wholesale: 'Sỉ lẻ',
  bulk_b2b:        'B2B',
  friendly_stock:  'Kho hàng',
  branding:        'Branding',
};

const FB_POST_EDIT_SESSION_KEY = 'fb_post_edit_session';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function buildEditSession(post: FBPost): FBPostEditSession {
  return {
    id: post.id,
    content: post.content,
    params: {
      provider: typeof window !== 'undefined'
        ? (localStorage.getItem('pipeline_provider') || 'gemini-flash')
        : 'gemini-flash',
      keyword: post.keyword,
      wordCount: post.wordCount || 200,
      tone: post.tone || 'friendly',
      template: post.template || null,
      shopName: post.shopName || '',
      industry: post.industry || '',
      brandPronouns: '',
      brandAudience: '',
      brandToneNotes: '',
      phone: '',
      address: '',
      brandDesc: '',
      brandForbidden: '',
      ctaStandard: '',
      mainProducts: '',
      includeEmojis: post.emojiCount > 0,
      includeHashtags: /(^|\s)#\S+/u.test(post.content),
      freeShip: /free\s*ship|freeship|mien phi giao hang|miễn phí giao hàng/iu.test(post.content),
      urgency: /co han|có hạn|hom nay|hôm nay|flash sale|dat ngay|đặt ngay/iu.test(post.content),
    },
  };
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function PostDetailModal({ post, onClose, onUpdate, onDelete }: {
  post: FBPost;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<FBPost>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [content, setContent] = useState(post.content);
  const [status,  setStatus]  = useState<FBPostStatus>(post.status);
  const [note,    setNote]    = useState(post.note || '');
  const [saving,  setSaving]  = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  async function handleSave() {
    setSaving(true);
    await onUpdate(post.id, { content, status, note: note || undefined, wordCount });
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await onDelete(post.id);
    onClose();
  }

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const sc = STATUS_CONFIG[status];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">📝 {post.keyword}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {post.shopName && <span className="text-xs text-gray-500">{post.shopName}</span>}
              {post.shopName && <span className="text-gray-300">·</span>}
              <span className="text-xs text-gray-500">{TONE_LABELS[post.tone] || post.tone}</span>
              {post.template && <><span className="text-gray-300">·</span><span className="text-xs text-gray-500">{TEMPLATE_LABELS[post.template] || post.template}</span></>}
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">{formatDate(post.createdAt)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl shrink-0 ml-4">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Status + Note row */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Trạng thái</p>
              <div className="flex gap-1.5 flex-wrap">
                {(Object.keys(STATUS_CONFIG) as FBPostStatus[]).map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      status === s
                        ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} border-current`
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Ghi chú nội bộ</p>
              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder="Ghi chú, kế hoạch đăng, kết quả..."
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          {/* Content editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-500">Nội dung bài viết</p>
              <span className="text-xs text-gray-400">{wordCount} từ</span>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={14}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-7 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 font-sans"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center gap-2">
            {!confirmDelete ? (
              <button onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors">
                🗑️ Xóa
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Xác nhận xóa?</span>
                <button onClick={handleDelete} disabled={deleting}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {deleting ? 'Đang xóa...' : 'Xóa thật'}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                  Hủy
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                copied ? 'bg-green-100 text-green-700 border-green-200' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>
              {copied ? '✓ Đã copy!' : '📋 Copy'}
            </button>
            <button onClick={onClose}
              className="px-3.5 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
              Đóng
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuanLyBaiFBPage() {
  const router = useRouter();

  const [posts,      setPosts]      = useState<FBPost[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTone,   setFilterTone]   = useState('');
  const [selectedPost, setSelectedPost] = useState<FBPost | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search       && { search }),
        ...(filterStatus && { status: filterStatus }),
        ...(filterTone   && { tone:   filterTone   }),
      });
      const res  = await fetch(`/api/facebook-posts?${params}`);
      const json = await res.json();
      if (json.success) {
        setPosts(json.data);
        setPagination(json.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterTone]);

  useEffect(() => { fetchPosts(1); }, [fetchPosts]);

  // ── Update ────────────────────────────────────────────────────────────────
  async function handleUpdate(id: string, data: Partial<FBPost>) {
    const res  = await fetch(`/api/facebook-posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, ...json.data, contentPreview: json.data.content?.slice(0, 200) } : p));
      if (selectedPost?.id === id) setSelectedPost(prev => prev ? { ...prev, ...json.data } : prev);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    await fetch(`/api/facebook-posts/${id}`, { method: 'DELETE' });
    setPosts(prev => prev.filter(p => p.id !== id));
    setPagination(prev => ({ ...prev, total: prev.total - 1 }));
    setSelectedPost(null);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const statsByStatus = posts.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  function openInGenerateEditor(post: FBPost) {
    const session = buildEditSession(post);
    localStorage.setItem(FB_POST_EDIT_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem('fb_post_params', JSON.stringify(session.params));
    router.push('/viet-bai-facebook/generate?mode=edit');
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Quản lý bài Facebook Post</h1>
            <p className="text-xs text-gray-400">{pagination.total} bài viết đã lưu</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/viet-bai-facebook')}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            ✏️ Viết bài mới
          </button>
          <button onClick={() => router.back()}
            className="px-3.5 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
            ← Quay lại
          </button>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-2.5 flex items-center gap-6 shrink-0">
        {(Object.keys(STATUS_CONFIG) as FBPostStatus[]).map(s => {
          const cfg = STATUS_CONFIG[s];
          const count = statsByStatus[s] || 0;
          return (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              className={`flex items-center gap-2 text-xs font-medium transition-all ${
                filterStatus === s ? `${cfg.color} font-bold` : 'text-gray-500 hover:text-gray-700'
              }`}>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${filterStatus === s ? `${cfg.bg} ${cfg.color}` : 'bg-gray-100 text-gray-600'}`}>
                {count}
              </span>
              {cfg.label}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-gray-300">|</span>
        <span className="text-xs text-gray-400">Tổng: {pagination.total}</span>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo từ khóa, nội dung, tên shop..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select value={filterTone} onChange={e => setFilterTone(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
          <option value="">Tất cả giọng văn</option>
          {Object.entries(TONE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {(search || filterStatus || filterTone) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterTone(''); }}
            className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
            ✕ Xóa lọc
          </button>
        )}
      </div>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-base font-medium text-gray-500">
              {search || filterStatus || filterTone ? 'Không tìm thấy bài viết nào' : 'Chưa có bài viết nào được lưu'}
            </p>
            {!search && !filterStatus && !filterTone && (
              <button onClick={() => router.push('/viet-bai-facebook')}
                className="mt-4 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">
                ✏️ Viết bài đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => {
              const sc = STATUS_CONFIG[post.status];
              return (
                <div key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer p-4 flex gap-4">

                  {/* Status dot */}
                  <div className="shrink-0 pt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      post.status === 'PUBLISHED' ? 'bg-green-500'
                      : post.status === 'READY'   ? 'bg-blue-500'
                      : post.status === 'ARCHIVED'? 'bg-orange-400'
                      : 'bg-gray-300'
                    }`} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 truncate">{post.keyword}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.color}`}>
                          {sc.label}
                        </span>
                        {post.template && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                            {TEMPLATE_LABELS[post.template] || post.template}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{formatDate(post.createdAt)}</span>
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-2">
                      {post.contentPreview}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {post.shopName && <span>🏢 {post.shopName}</span>}
                      <span>{TONE_LABELS[post.tone] || post.tone}</span>
                      <span>📝 {post.wordCount} từ</span>
                      {post.emojiCount > 0 && <span>😊 {post.emojiCount} emoji</span>}
                      {post.note && <span className="text-blue-400 truncate max-w-[200px]">📌 {post.note}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigator.clipboard.writeText(post.content)}
                      title="Copy nội dung"
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-sm">
                      📋
                    </button>
                    <button
                      onClick={() => openInGenerateEditor(post)}
                      className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors text-sm">
                      ✏️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => fetchPosts(pagination.page - 1)} disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              ← Trước
            </button>
            <span className="text-sm text-gray-500">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button onClick={() => fetchPosts(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Sau →
            </button>
          </div>
        )}
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
