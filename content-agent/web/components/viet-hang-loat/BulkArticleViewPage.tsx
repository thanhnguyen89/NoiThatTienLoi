'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getBulkFeature, type BulkFeatureId } from '@/lib/viet-hang-loat/features';
import { computeSeoChecks } from '@/lib/shared/seo-checks';
import { countWords, slugify } from '@/lib/tinh-gon/text';

interface ArticleRecord {
  id: string;
  keyword: string;
  selectedTitle: string;
  htmlContent: string;
  metaDescription: string | null;
  slug: string | null;
  wordCount: number;
  seoScore: number | null;
  humannessScore: number | null;
  status: string;
  outline: unknown;
  meta: unknown;
}

export default function BulkArticleViewPage({
  featureId,
  articleId,
}: {
  featureId: BulkFeatureId;
  articleId: string;
}) {
  const feature = getBulkFeature(featureId);
  const [article, setArticle] = useState<ArticleRecord | null>(null);
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      setError('');
      const res = await fetch(`/api/articles/${articleId}`);
      const json = await res.json() as { success?: boolean; data?: { article: ArticleRecord }; error?: string };
      if (!res.ok || !json.success || !json.data?.article) {
        throw new Error(json.error || 'Không load được bài viết');
      }
      setArticle(json.data.article);
      setTitle(json.data.article.selectedTitle);
      setHtml(json.data.article.htmlContent || '');
    }
    load().catch((err) => setError(err instanceof Error ? err.message : 'Không load được bài viết'));
  }, [articleId]);

  const wordCount = useMemo(() => countWords(html), [html]);
  const seo = useMemo(() => {
    if (!article) return { checks: [], score: 0 };
    return computeSeoChecks({
      title,
      metaDescription: article.metaDescription || '',
      html,
      wordCount,
      keyword: article.keyword,
      slug: article.slug || slugify(title || article.keyword),
      minWordCount: Math.min(800, Math.max(300, Math.round((article.wordCount || 1000) * 0.6))),
    });
  }, [article, html, title, wordCount]);

  async function saveArticle() {
    if (!article) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedTitle: title,
          htmlContent: html,
          wordCount,
          seoScore: seo.score,
          seoChecks: seo.checks,
          createVersion: true,
        }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || 'Không lưu được bài');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được bài');
    } finally {
      setSaving(false);
    }
  }

  if (error && !article) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!article) {
    return <div className="p-8 text-sm text-gray-500">Đang tải bài viết...</div>;
  }

  return (
    <div className="h-full overflow-hidden bg-gray-50">
      <div className="flex h-full flex-col">
        <header className={`bg-gradient-to-r ${feature.accent} px-6 py-5 text-white`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Bulk Article</p>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full bg-transparent text-2xl font-bold outline-none placeholder:text-white/60"
              />
              <p className="mt-1 text-sm text-white/80">Keyword: {article.keyword}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`${feature.route}/queue`} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold">Queue</Link>
              <button onClick={saveArticle} disabled={saving} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700 disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Lưu bài'}
              </button>
            </div>
          </div>
        </header>

        <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-h-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <textarea
              value={html}
              onChange={(event) => setHtml(event.target.value)}
              className="h-full min-h-[600px] w-full resize-none rounded-2xl border-0 p-5 font-mono text-sm leading-6 outline-none"
            />
          </section>

          <aside className="min-h-0 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4">
              {saved && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">Đã lưu phiên bản mới.</div>}
              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Tổng quan</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-gray-400">Từ</div>
                    <div className="text-lg font-bold text-gray-900">{wordCount.toLocaleString('vi-VN')}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-gray-400">SEO</div>
                    <div className="text-lg font-bold text-gray-900">{seo.score}/100</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-gray-400">Human</div>
                    <div className="text-lg font-bold text-gray-900">{article.humannessScore ?? '-'}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-gray-400">Status</div>
                    <div className="text-lg font-bold text-gray-900">{article.status}</div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">SEO checks</p>
                <div className="mt-2 grid gap-2">
                  {seo.checks.map((check) => (
                    <div key={check.label} className={`rounded-xl border p-3 text-xs ${check.pass ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                      <div className="font-semibold">{check.pass ? 'OK' : 'Cần sửa'} · {check.label}</div>
                      {check.detail && <div className="mt-1 opacity-80">{check.detail}</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Preview HTML</p>
                <div className="prose prose-sm mt-2 max-w-none rounded-xl border bg-gray-50 p-4" dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
