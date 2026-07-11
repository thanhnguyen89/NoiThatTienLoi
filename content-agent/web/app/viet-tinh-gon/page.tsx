'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfigForm } from '@/components/tinh-gon/ConfigForm';
import type { TinhGonConfig, TinhGonStartResponse } from '@/lib/tinh-gon/types';

const DEFAULT_CONFIG: TinhGonConfig = {
  keyword: '',
  outlineType: 'review_product',
  language: 'Vietnamese',
  model: 'gemini-flash',
  targetLength: 1000,
  secondaryKeywords: [],
  notes: '',
  dataSource: 'ai_only',
};

export default function VietTinhGonPage() {
  const router = useRouter();
  const [config, setConfig] = useState<TinhGonConfig>(DEFAULT_CONFIG);
  const [error, setError] = useState('');
  const [suggestedKw, setSuggestedKw] = useState<string[]>([]);
  const [loadingKw, setLoadingKw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showKwPanel, setShowKwPanel] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    document.title = 'Viết Tinh Gọn - Content Agent';
    const stored = sessionStorage.getItem('tg_config');
    if (stored) {
      try {
        setConfig(JSON.parse(stored) as TinhGonConfig);
      } catch {
        sessionStorage.removeItem('tg_config');
      }
    }
  }, []);

  async function suggestKeywords() {
    if (!config.keyword.trim()) return;
    setLoadingKw(true);

    try {
      const response = await fetch('/api/tinh-gon/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: config.keyword,
          count: 8,
          model: config.model,
        }),
      });

      const data = (await response.json()) as { keywords?: string[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Không thể gợi ý từ khóa');
      }

      setSuggestedKw(data.keywords || []);
      setShowKwPanel(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể gợi ý từ khóa');
    } finally {
      setLoadingKw(false);
    }
  }

  function toggleSecondaryKw(keyword: string) {
    setConfig((prev) => ({
      ...prev,
      secondaryKeywords: prev.secondaryKeywords.includes(keyword)
        ? prev.secondaryKeywords.filter((item) => item !== keyword)
        : [...prev.secondaryKeywords, keyword],
    }));
  }

  async function handleNext() {
    const keyword = config.keyword.trim();

    if (!keyword) {
      setError('Vui lòng nhập từ khóa');
      return;
    }

    if (keyword.length < 3) {
      setError('Từ khóa quá ngắn');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const nextConfig = { ...config, keyword };
      const response = await fetch('/api/tinh-gon/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: nextConfig,
        }),
      });

      const data = (await response.json()) as TinhGonStartResponse & { error?: string };
      if (!response.ok || !data.outline || !data.articleId || !data.runId) {
        throw new Error(data.error || 'Không thể khởi tạo draft bài viết');
      }

      sessionStorage.setItem('tg_config', JSON.stringify(nextConfig));
      sessionStorage.setItem('tg_outline', JSON.stringify(data.outline));
      sessionStorage.setItem('tg_run_id', data.runId);
      sessionStorage.setItem('tg_article_id', data.articleId);
      sessionStorage.setItem('tg_outline_source', data.source || 'ai');
      sessionStorage.setItem('tg_outline_warning', data.warning || '');
      sessionStorage.removeItem('tg_result');
      router.push('/viet-tinh-gon/outline');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể khởi tạo draft bài viết');
      setLoading(false);
    }
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Viết tinh gọn</h1>
              <p className="text-sm text-blue-600 mt-1">Bước 1 / 3 — Nhập từ khóa & cấu hình</p>
            </div>
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              📖 Cách sử dụng
            </button>
          </div>
          <div className="mt-4 flex gap-1">
            {[1, 2, 3].map((step) => (
              <div key={step} className={`h-1.5 flex-1 rounded-full ${step === 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <ConfigForm
          config={config}
          error={error}
          suggestedKw={suggestedKw}
          loadingKw={loadingKw}
          loading={loading}
          showKwPanel={showKwPanel}
          showNotes={showNotes}
          setConfig={setConfig}
          setShowKwPanel={setShowKwPanel}
          setShowNotes={setShowNotes}
          onSuggestKeywords={suggestKeywords}
          onToggleSecondaryKw={toggleSecondaryKw}
          onSubmit={handleNext}
        />
      </div>
    </div>
  );
}
