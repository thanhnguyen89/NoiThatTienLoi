'use client';

import { useEffect, useMemo, useState } from 'react';
import { SerpPreview } from '@/components/editor/SerpPreview';

interface WebsiteConfig {
  id: string;
  name: string;
  url: string;
  defaultCategory?: number | null;
  defaultStatus?: string | null;
}

interface GeneratePublishPanelProps {
  articleId: string;
  keyword: string;
  title: string;
  metaDescription: string;
  slug: string;
  wordCount: number;
  seoScore: number;
  onTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onCopyHtml?: () => void;
  onSaveDraft?: () => Promise<void> | void;
  onPublished?: (link: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, index) => {
  const label = index === 0 ? '12 AM' : index < 12 ? `${index} AM` : index === 12 ? '12 PM' : `${index - 12} PM`;
  return { value: index, label };
});

export function PublishPanel({
  articleId,
  keyword,
  title,
  metaDescription,
  slug,
  wordCount,
  seoScore,
  onTitleChange,
  onMetaDescriptionChange,
  onSlugChange,
  onCopyHtml,
  onSaveDraft,
  onPublished,
}: GeneratePublishPanelProps) {
  const [sites, setSites] = useState<WebsiteConfig[]>([]);
  const [siteId, setSiteId] = useState('');
  const [category, setCategory] = useState('');
  const [scheduleHour, setScheduleHour] = useState<number | null>(null);
  const [loadingSites, setLoadingSites] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [submitIndexing, setSubmitIndexing] = useState(true);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let alive = true;

    async function loadSites() {
      setLoadingSites(true);
      try {
        const response = await fetch('/api/websites?activeOnly=true');
        const payload = (await response.json()) as { success?: boolean; data?: WebsiteConfig[] };
        if (!alive) return;
        const nextSites = payload.success ? payload.data ?? [] : [];
        setSites(nextSites);
        if (nextSites.length > 0) {
          const defaultSite = nextSites.find((site) => site.defaultStatus) ?? nextSites[0];
          setSiteId(defaultSite.id);
          if (defaultSite.defaultCategory) {
            setCategory(String(defaultSite.defaultCategory));
          }
        }
      } catch {
        if (!alive) return;
        setError('Khong the tai danh sach website.');
      } finally {
        if (alive) {
          setLoadingSites(false);
        }
      }
    }

    void loadSites();
    return () => {
      alive = false;
    };
  }, []);

  const publishLabel = useMemo(
    () => (scheduleHour == null ? 'Dang bai WordPress' : 'Hen gio dang bai'),
    [scheduleHour],
  );
  const selectedSite = useMemo(
    () => sites.find((site) => site.id === siteId) || null,
    [siteId, sites],
  );
  const previewBaseUrl = useMemo(() => {
    const raw = selectedSite?.url?.trim() || 'https://noithatminhquan.vn';
    return raw.replace(/\/$/, '');
  }, [selectedSite?.url]);
  const canonicalUrl = useMemo(
    () => `${previewBaseUrl}/${slug.replace(/^\//, '')}`,
    [previewBaseUrl, slug],
  );
  const articleSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: metaDescription,
    url: canonicalUrl,
    author: {
      '@type': 'Organization',
      name: selectedSite?.name || 'Noi That Minh Quan',
    },
    publisher: {
      '@type': 'Organization',
      name: selectedSite?.name || 'Noi That Minh Quan',
      logo: {
        '@type': 'ImageObject',
        url: `${previewBaseUrl}/logo.png`,
      },
    },
  }), [canonicalUrl, metaDescription, previewBaseUrl, selectedSite?.name, title]);
  const articleSchemaText = useMemo(
    () => JSON.stringify(articleSchema, null, 2),
    [articleSchema],
  );
  const ogPreviewText = useMemo(
    () => [
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${metaDescription}" />`,
      `<meta property="og:url" content="${canonicalUrl}" />`,
      '<meta property="og:type" content="article" />',
    ].join('\n'),
    [canonicalUrl, metaDescription, title],
  );

  async function handleSaveDraft() {
    setSaveMessage('');
    setError('');
    setSaving(true);
    try {
      await onSaveDraft?.();
      setSaveMessage('Da luu ban nhap.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Khong the luu ban nhap.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!siteId) {
      setError('Vui long chon website publish.');
      return;
    }

    setError('');
    setPublishing(true);
    try {
      const response = await fetch(`/api/articles/${articleId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          category: category || undefined,
          scheduleHour: scheduleHour ?? undefined,
        }),
      });

      const payload = (await response.json()) as { postUrl?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Publish that bai.');
      }

      const link = payload.postUrl ?? '';
      setPublishedUrl(link);

      if (submitIndexing && link) {
        void fetch('/api/index/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: link }),
        });
      }

      onPublished?.(link);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Khong the publish.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="space-y-2 text-sm text-gray-600">
          <p><span className="font-semibold text-gray-800">Words:</span> {wordCount.toLocaleString()}</p>
          <p><span className="font-semibold text-gray-800">SEO:</span> {seoScore}/100</p>
          <p><span className="font-semibold text-gray-800">Slug:</span> {slug}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-gray-600">Title</label>
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-gray-600">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(event) => onSlugChange(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <SerpPreview
          title={title}
          description={metaDescription}
          keyword={keyword}
          slug={slug}
          onChange={(field, value) => {
            if (field === 'title') {
              onTitleChange(value);
              return;
            }
            onMetaDescriptionChange(value);
          }}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Website</label>
          {loadingSites ? (
            <p className="text-sm text-gray-400">Dang tai website...</p>
          ) : sites.length === 0 ? (
            <p className="text-sm text-gray-400">Chua co website active de publish.</p>
          ) : (
            <select
              value={siteId}
              onChange={(event) => setSiteId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chon website --</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Category</label>
          <input
            type="text"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="VD: 12"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-gray-600">Thoi gian dang</label>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={scheduleHour == null} onChange={() => setScheduleHour(null)} />
              <span>Dang ngay</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={scheduleHour != null} onChange={() => setScheduleHour(8)} />
              <span>Hen gio</span>
            </label>
            {scheduleHour != null && (
              <select
                value={scheduleHour}
                onChange={(event) => setScheduleHour(Number(event.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {HOURS.map((hour) => (
                  <option key={hour.value} value={hour.value}>
                    {hour.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={submitIndexing}
            onChange={(event) => setSubmitIndexing(event.target.checked)}
          />
          <span>Gui index sau khi publish</span>
        </label>
      </div>

      {(error || saveMessage || publishedUrl) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
          {error && <p className="text-red-600">{error}</p>}
          {saveMessage && <p className="text-green-600">{saveMessage}</p>}
          {publishedUrl && (
            <a href={publishedUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              Xem bai da publish
            </a>
          )}
        </div>
      )}

      <details className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Schema JSON-LD (Article)
        </summary>
        <div className="px-4 pb-4">
          <pre className="max-h-56 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            {articleSchemaText}
          </pre>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(articleSchemaText)}
            className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
          >
            Copy JSON-LD
          </button>
        </div>
      </details>

      <details className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Open Graph Preview
        </summary>
        <div className="space-y-3 px-4 pb-4">
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="flex h-24 items-center justify-center bg-gray-100 text-xs text-gray-400">
              OG Image (1200x630)
            </div>
            <div className="bg-white p-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">
                {previewBaseUrl.replace(/^https?:\/\//, '')}
              </p>
              <p className="line-clamp-2 text-sm font-semibold text-gray-900">{title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">{metaDescription}</p>
            </div>
          </div>
          <pre className="overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            {ogPreviewText}
          </pre>
        </div>
      </details>

      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
        <button
          type="button"
          onClick={onCopyHtml}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Copy HTML
        </button>
        <button
          type="button"
          onClick={() => void handleSaveDraft()}
          disabled={saving}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? 'Dang luu...' : 'Luu ban nhap'}
        </button>
        <button
          type="button"
          onClick={() => void handlePublish()}
          disabled={publishing || !siteId}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {publishing ? 'Dang publish...' : publishLabel}
        </button>
      </div>
    </div>
  );
}
