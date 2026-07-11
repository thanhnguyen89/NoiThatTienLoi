'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OutlineEditor } from '@/components/tinh-gon/OutlineEditor';
import { buildTinhGonContentType, buildTinhGonSnapshot } from '@/lib/tinh-gon/persistence';
import type { TinhGonConfig, TinhGonOutlineData } from '@/lib/tinh-gon/types';

function stringifyOutline(outline: TinhGonOutlineData | null): string {
  return outline ? JSON.stringify(outline) : '';
}

export default function VietTinhGonOutlinePage() {
  const router = useRouter();
  const [config, setConfig] = useState<TinhGonConfig | null>(null);
  const [outline, setOutline] = useState<TinhGonOutlineData | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState('ai');
  const [warning, setWarning] = useState('');
  const persistedOutlineRef = useRef('');

  const outlineSignature = useMemo(() => stringifyOutline(outline), [outline]);

  function getSectionCountWarning(nextOutline: TinhGonOutlineData | null) {
    if (!nextOutline) return '';
    if (nextOutline.sections.length < 4) {
      return `Outline hiện chỉ có ${nextOutline.sections.length} mục H2, thấp hơn khuyến nghị 4-8 mục.`;
    }
    if (nextOutline.sections.length > 8) {
      return `Outline hiện có ${nextOutline.sections.length} mục H2, nhiều hơn khuyến nghị 4-8 mục.`;
    }
    return '';
  }

  useEffect(() => {
    document.title = 'Outline Viết Tinh Gọn - Content Agent';

    const storedConfig = sessionStorage.getItem('tg_config');
    const storedArticleId = sessionStorage.getItem('tg_article_id');
    if (!storedConfig || !storedArticleId) {
      router.replace('/viet-tinh-gon');
      return;
    }

    try {
      const nextConfig = JSON.parse(storedConfig) as TinhGonConfig;
      const nextArticleId = storedArticleId;
      setConfig(nextConfig);
      setArticleId(nextArticleId);
      setSource(sessionStorage.getItem('tg_outline_source') || 'ai');
      setWarning(sessionStorage.getItem('tg_outline_warning') || '');

      const storedOutline = sessionStorage.getItem('tg_outline');
      if (storedOutline) {
        const parsedOutline = JSON.parse(storedOutline) as TinhGonOutlineData;
        setOutline(parsedOutline);
        persistedOutlineRef.current = stringifyOutline(parsedOutline);
        setLoading(false);
        return;
      }

      void generateOutline(nextConfig, nextArticleId);
    } catch {
      router.replace('/viet-tinh-gon');
    }
  }, [router]);

  useEffect(() => {
    if (!config || !outline || !articleId || loading) return;
    if (outlineSignature === persistedOutlineRef.current) return;

    const timer = setTimeout(() => {
      void saveOutlineDraft(outline);
    }, 1200);

    return () => clearTimeout(timer);
  }, [articleId, config, loading, outline, outlineSignature]);

  async function generateOutline(currentConfig: TinhGonConfig, currentArticleId: string) {
    setLoading(true);
    setError('');
    setWarning('');

    try {
      const response = await fetch('/api/tinh-gon/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: currentArticleId,
          config: currentConfig,
        }),
      });

      const data = (await response.json()) as {
        outline?: TinhGonOutlineData;
        source?: string;
        warning?: string;
        error?: string;
      };

      if (!response.ok || !data.outline) {
        throw new Error(data.error || 'Không thể tạo outline');
      }

      setOutline(data.outline);
      setSource(data.source || 'ai');
      setWarning(data.warning || '');
      persistedOutlineRef.current = stringifyOutline(data.outline);
      sessionStorage.setItem('tg_outline', JSON.stringify(data.outline));
      sessionStorage.setItem('tg_outline_source', data.source || 'ai');
      sessionStorage.setItem('tg_outline_warning', data.warning || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạo outline');
    } finally {
      setLoading(false);
    }
  }

  async function saveOutlineDraft(nextOutline: TinhGonOutlineData) {
    if (!config || !articleId) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: config.keyword,
          language: config.language,
          contentType: buildTinhGonContentType(config.outlineType),
          targetLength: config.targetLength,
          aiProvider: config.model,
          brandConfig: config.brandConfig,
          selectedTitle: nextOutline.selectedTitle,
          userNotes: nextOutline.userNotes || config.notes || null,
          secondaryKeywords: config.secondaryKeywords,
          outline: buildTinhGonSnapshot({
            stage: 'outline',
            config,
            outline: nextOutline,
          }),
          status: 'DRAFT',
        }),
      });

      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Không thể lưu outline draft');
      }

      persistedOutlineRef.current = stringifyOutline(nextOutline);
      sessionStorage.setItem('tg_outline', JSON.stringify(nextOutline));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể lưu outline draft');
    } finally {
      setSaving(false);
    }
  }

  function updateOutline(nextOutline: TinhGonOutlineData) {
    setOutline(nextOutline);
    sessionStorage.setItem('tg_outline', JSON.stringify(nextOutline));
  }

  async function handleNext() {
    if (!outline) return;

    if (!outline.selectedTitle.trim()) {
      setError('Vui lòng nhập tiêu đề');
      return;
    }

    if (outline.sections.some((section) => !section.heading.trim())) {
      setError('Mọi section cần có heading');
      return;
    }

    setError('');
    await saveOutlineDraft(outline);
    router.push('/viet-tinh-gon/generate');
  }

  if (!config) {
    return null;
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      {saving && (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-700">
          Đang tự lưu outline vào draft...
        </div>
      )}
      <OutlineEditor
        keyword={config.keyword}
        targetLength={config.targetLength}
        outline={outline}
        loading={loading}
        error={error}
        source={source}
        warning={warning}
        sectionCountWarning={getSectionCountWarning(outline)}
        onRegenerate={() => articleId && void generateOutline(config, articleId)}
        onBack={() => router.push('/viet-tinh-gon')}
        onNext={() => void handleNext()}
        onPickTitle={(value) => outline && updateOutline({ ...outline, selectedTitle: value })}
        onChangeTitle={(value) => outline && updateOutline({ ...outline, selectedTitle: value })}
        onChangeSection={(id, field, value) => {
          if (!outline) return;
          updateOutline({
            ...outline,
            sections: outline.sections.map((section) =>
              section.id === id
                ? {
                    ...section,
                    [field]: field === 'targetWords' ? Number(value) || section.targetWords : value,
                  }
                : section,
            ),
          });
        }}
        onRemoveSection={(id) => {
          if (!outline || outline.sections.length <= 4) return;
          updateOutline({
            ...outline,
            sections: outline.sections.filter((section) => section.id !== id),
          });
        }}
        onAddSection={() => {
          if (!outline || outline.sections.length >= 8) return;
          updateOutline({
            ...outline,
            sections: [
              ...outline.sections,
              {
                id: `manual-${Date.now()}`,
                heading: 'Mục mới',
                notes: '',
                targetWords: 140,
              },
            ],
          });
        }}
        onChangeUserNotes={(value) => outline && updateOutline({ ...outline, userNotes: value })}
      />
    </div>
  );
}
