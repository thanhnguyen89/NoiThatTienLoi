'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Article {
  id: string;
  runId: string;
  keyword: string;
  contentType: string;
  selectedTitle: string;
  secondaryKeywords: string[];
  featuredImage?: string;
  status: 'DRAFT' | 'WRITING' | 'WRITTEN' | 'PUBLISHED' | 'ARCHIVED';
  wordCount: number;
  seoScore?: number;
  humannessScore?: number;
  isBoosted: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  wordpressUrl?: string;
}

interface Stats {
  total: number;
  written: number;
  draft: number;
  writing: number;
  published: number;
  archived: number;
  credits: {
    used: number;
    total: number;
    remaining: number;
  };
}

interface ArticleOriginMeta {
  pageLabel: string;
  pagePath: string;
  routeMode: 'run' | 'article';
}

export default function ArticlesDashboard() {
  const router = useRouter();
  
  // State
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState<Stats>({
    total: 0,
    written: 0,
    draft: 0,
    writing: 0,
    published: 0,
    archived: 0,
    credits: { used: 0, total: 5000, remaining: 5000 },
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch articles
  useEffect(() => {
    // Set page title
    document.title = 'Quản Lý Bài Viết - Content Agent';
    
    fetchArticles();
  }, [filterStatus, page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchArticles() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      params.set('page', page.toString());
      params.set('limit', '20');
      
      const res = await fetch(`/api/articles?${params}`);
      const json = await res.json();
      
      if (json.success) {
        setArticles(json.data.articles);
        setStats(json.data.stats);
        setTotalPages(json.data.pagination.pages);
      } else {
        console.error('Failed to fetch articles:', json.error);
      }
    } catch (err) {
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  }

  // Selection handlers
  function toggleSelect(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  }

  function toggleSelectAll() {
    if (selectedIds.size === articles.length && articles.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map(a => a.id)));
    }
  }

  // Actions
  async function handleDelete(ids: string[]) {
    if (!confirm(`Xóa ${ids.length} bài viết? Bài viết sẽ được chuyển vào trạng thái "Đã đóng".`)) {
      return;
    }
    
    try {
      const res = await fetch('/api/articles/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      
      const json = await res.json();
      if (json.success) {
        fetchArticles();
        setSelectedIds(new Set());
      } else {
        alert('Lỗi: ' + json.error);
      }
    } catch (err) {
      console.error('Error deleting articles:', err);
      alert('Lỗi khi xóa bài viết');
    }
  }

  async function handleBoost(id: string) {
    try {
      const res = await fetch(`/api/articles/${id}/boost`, { method: 'POST' });
      const json = await res.json();
      
      if (json.success) {
        fetchArticles();
      } else {
        alert('Lỗi: ' + json.error);
      }
    } catch (err) {
      console.error('Error boosting article:', err);
    }
  }

  function getArticleOriginMeta(contentType: string): ArticleOriginMeta {
    if (contentType.startsWith('tinh_gon:')) {
      return { pageLabel: 'Viet Tinh Gon', pagePath: '/viet-tinh-gon/generate', routeMode: 'run' };
    }

    if (contentType.startsWith('viet_theo_dan_bai:') || contentType.startsWith('viet_dan_bai:')) {
      return { pageLabel: 'Viet Theo Dan Bai', pagePath: '/viet-theo-dan-bai/generate', routeMode: 'run' };
    }

    if (contentType.startsWith('viet_toplist:')) {
      return { pageLabel: 'Viet Toplist', pagePath: '/viet-toplist/generate', routeMode: 'run' };
    }

    if (contentType.startsWith('viet_tin_tuc:')) {
      return { pageLabel: 'Viet Tin Tuc', pagePath: '/viet-tin-tuc/generate', routeMode: 'run' };
    }

    if (contentType.startsWith('viet_theo_nguon:')) {
      return { pageLabel: 'Viet Theo Nguon', pagePath: '/viet-theo-nguon/generate', routeMode: 'run' };
    }

    if (contentType.startsWith('viet_theo_tu_khoa:')) {
      return { pageLabel: 'Viet Theo Tu Khoa', pagePath: '/viet-theo-tu-khoa/generate', routeMode: 'run' };
    }

    if (contentType.startsWith('viet_tu_google_search:')) {
      return { pageLabel: 'Viet Tu Google Search', pagePath: '/viet-tu-google-search/generate', routeMode: 'run' };
    }

    if (contentType === 'product_review' || contentType.startsWith('viet_danh_gia_san_pham:')) {
      return { pageLabel: 'Danh Gia San Pham', pagePath: '/viet-danh-gia-san-pham/generate', routeMode: 'run' };
    }

    if (contentType.startsWith('viet_lai_url')) {
      return { pageLabel: 'Viet Lai URL', pagePath: '/viet-lai-url/generate', routeMode: 'run' };
    }

    if (contentType.startsWith('viet_lai_tin_tuc')) {
      return { pageLabel: 'Viet Lai Tin Tuc', pagePath: '/viet-lai-tin-tuc/generate', routeMode: 'run' };
    }

    if (contentType.startsWith('viet_lai:')) {
      return { pageLabel: 'Viet Lai Bai Viet', pagePath: '/viet-lai-bai-viet/generate', routeMode: 'run' };
    }

    return { pageLabel: 'Viet Bai Thong Minh', pagePath: '/viet-bai-thong-minh/step4', routeMode: 'article' };
  }

  function handleEdit(article: Article) {
    if (article.contentType.startsWith('tinh_gon:')) {
      router.push(`/viet-tinh-gon/generate?runId=${encodeURIComponent(article.runId)}`);
      return;
    }

    if (article.contentType.startsWith('viet_theo_dan_bai:') || article.contentType.startsWith('viet_dan_bai:')) {
      router.push(`/viet-theo-dan-bai/generate?runId=${encodeURIComponent(article.runId)}`);
      return;
    }

    if (article.contentType.startsWith('viet_toplist:')) {
      router.push(`/viet-toplist/generate?runId=${encodeURIComponent(article.runId)}`);
      return;
    }

    if (article.contentType.startsWith('viet_tin_tuc:')) {
      router.push(`/viet-tin-tuc/generate?runId=${encodeURIComponent(article.runId)}`);
      return;
    }

    if (article.contentType.startsWith('viet_theo_nguon:')) {
      router.push(`/viet-theo-nguon/generate?runId=${encodeURIComponent(article.runId)}`);
      return;
    }

    if (article.contentType.startsWith('viet_theo_tu_khoa:')) {
      router.push(`/viet-theo-tu-khoa/generate?runId=${encodeURIComponent(article.runId)}`);
      return;
    }

    if (article.contentType.startsWith('viet_tu_google_search:')) {
      router.push(`/viet-tu-google-search/generate?runId=${encodeURIComponent(article.runId)}`);
      return;
    }

    if (article.contentType === 'product_review' || article.contentType.startsWith('viet_danh_gia_san_pham:')) {
      router.push(`/viet-danh-gia-san-pham/generate?runId=${encodeURIComponent(article.runId)}`);
      return;
    }

    if (article.contentType.startsWith('viet_lai_url')) {
      router.push(`/viet-lai-url/generate?runId=${encodeURIComponent(article.runId)}`);
      return;
    }

    if (article.contentType.startsWith('viet_lai_tin_tuc')) {
      router.push(`/viet-lai-tin-tuc/generate?runId=${encodeURIComponent(article.runId)}`);
      return;
    }

    if (article.contentType.startsWith('viet_lai:')) {
      router.push(`/viet-lai-bai-viet/generate?runId=${encodeURIComponent(article.runId)}`);
      return;
    }

    // Load article vào step 4
    const query = new URLSearchParams({
      articleId: article.id,
      runId: article.runId,
    });
    router.push(`/viet-bai-thong-minh/step4?${query.toString()}`);
  }

  // Format helpers
  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString().slice(2);
    return `${day}/${month}/${year}`;
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${hours}:${minutes} ${day}/${month}`;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý bài viết</h1>
            <p className="text-sm text-gray-500 mt-1">
              Thống nay, Bài viết: <strong>{stats.written}/{stats.total}</strong> - Tín dụng: <strong>{stats.credits.used.toLocaleString()}/{stats.credits.total.toLocaleString()}</strong>
            </p>
          </div>
          <button
            onClick={() => router.push('/viet-bai-thong-minh')}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>Viết Bài</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-gray-100 -mb-px">
          {[
            { key: 'all', label: 'Tất cả', count: stats.total },
            { key: 'WRITTEN', label: 'Đã viết', count: stats.written },
            { key: 'DRAFT', label: 'Chưa viết', count: stats.draft },
            { key: 'WRITING', label: 'Chờ viết', count: stats.writing },
            { key: 'ARCHIVED', label: 'Đã đóng', count: stats.archived },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setFilterStatus(tab.key); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                filterStatus === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  filterStatus === tab.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/viet-bai-thong-minh')}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <span>+</span>
          <span>Viết Bài</span>
        </button>
        
        {selectedIds.size > 0 && (
          <>
            <div className="h-6 w-px bg-gray-200" />
            <button
              onClick={() => handleDelete(Array.from(selectedIds))}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              Delete ({selectedIds.size})
            </button>
          </>
        )}

        <div className="flex-1" />
        
        <span className="text-xs text-gray-400">
          {articles.length} bài viết
        </span>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === articles.length && articles.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Từ khóa</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-32">Hình Ảnh</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-40">Viết lúc</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-48">Actions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-56">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-4xl">📝</div>
                      <p className="text-sm text-gray-500">Chưa có bài viết nào</p>
                      <button
                        onClick={() => router.push('/viet-bai-thong-minh')}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Tạo bài viết đầu tiên
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(article.id)}
                        onChange={() => toggleSelect(article.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => handleEdit(article)}
                          className="text-sm font-medium text-blue-600 hover:underline text-left line-clamp-1"
                        >
                          {article.selectedTitle || article.keyword}
                        </button>
                        <div className="flex flex-wrap gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-full font-medium">
                            {article.keyword}
                          </span>
                          {article.secondaryKeywords.slice(0, 3).map((kw, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-full">
                              {kw}
                            </span>
                          ))}
                          {article.secondaryKeywords.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                              +{article.secondaryKeywords.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {article.featuredImage ? (
                        <img 
                          src={article.featuredImage} 
                          alt="" 
                          className="w-16 h-16 object-cover rounded-lg mx-auto border border-gray-200" 
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto flex items-center justify-center text-gray-300 text-xs">
                          No image
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-xs text-gray-500">
                        <div className="font-medium">WH: {formatDate(article.createdAt)}</div>
                        <div className="text-gray-400 mt-0.5">Edit: {formatTime(article.updatedAt)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDelete([article.id])}
                          className="px-4 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => handleBoost(article.id)}
                          className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                            article.isBoosted
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          Boost {article.isBoosted && '✓'}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          {getArticleOriginMeta(article.contentType).pageLabel}
                        </span>
                        <code className="break-all text-[11px] text-gray-500">
                          {article.contentType}
                        </code>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ────────────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-1.5 text-sm rounded ${
                    page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
