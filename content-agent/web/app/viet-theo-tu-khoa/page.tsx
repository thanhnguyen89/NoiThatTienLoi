'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModelPicker from '@/app/components/ModelPicker';
import { BrandSection, buildBrandConfig, EMPTY_BRAND_SECTION_STATE, type BrandSectionState } from '@/components/BrandSection';
import { SeoAdvancedBlock } from '@/components/SeoAdvancedBlock';
import { IMAGE_OPTIONS, SUPPORTED_LANGUAGES, type AutoBoldOption, type ImageOption } from '@/lib/shared/options';
import { persistDraftRef, readDraftRef, removeDraftRef, upsertArticleDraft } from '@/lib/article-draft-client';
import {
  AI_OUTLINE_OBJECTIVES,
  AI_OUTLINE_SIZES,
  KEYWORD_TONES,
  LS_BRAND_KEY,
  LS_CONFIG_KEY,
  LS_RUN_ID_KEY,
  NO_OUTLINE_LENGTHS,
} from '@/lib/viet-theo-tu-khoa/options';
import { parseOutlineToPreview } from '@/lib/viet-theo-tu-khoa/outline-generator';
import type {
  AiOutlineObjective,
  AiOutlineSize,
  KeywordArticleConfig,
  KeywordSeoLink,
  OutlineMode,
  KeywordTone,
} from '@/lib/viet-theo-tu-khoa/types';

const DEFAULT_CONFIG: KeywordArticleConfig = {
  keyword: '',
  secondaryKeywords: [],
  isToplist: false,
  outlineMode: 'ai_outline',
  targetLength: 2000,
  aiOutlineObjective: 'basic',
  aiOutlineSize: '5_6_h2',
  resolvedOutline: '',
  imageOption: 'none',
  language: 'Vietnamese',
  tone: 'seo_basic',
  model: 'gemini-flash',
  boldMainKeyword: true,
  boldHeadings: false,
  dataSource: 'ai_only',
  competitorUrls: [],
};

function parseSecondaryKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function parseKeywordLinks(raw: string): KeywordSeoLink[] {
  return raw
    .split('\n')
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts): parts is [string, string] => parts.length >= 2 && Boolean(parts[0]) && Boolean(parts[1]))
    .map(([keyword, url]) => ({ keyword, url }));
}

function stringifyKeywordLinks(links?: KeywordSeoLink[]): string {
  return (links ?? []).map((item) => `${item.keyword} | ${item.url}`).join('\n');
}

function mergeSecondaryKeywords(raw: string, nextKeywords: string[]): string {
  const merged = parseSecondaryKeywords(raw);
  const seen = new Set(merged.map((item) => item.toLocaleLowerCase('vi-VN')));

  for (const nextKeyword of nextKeywords) {
    const clean = nextKeyword.trim();
    const key = clean.toLocaleLowerCase('vi-VN');
    if (!clean || seen.has(key) || merged.length >= 10) continue;
    merged.push(clean);
    seen.add(key);
  }

  return merged.join(', ');
}

export default function VietTheoTuKhoaPage() {
  const router = useRouter();

  const [keyword, setKeyword] = useState(DEFAULT_CONFIG.keyword);
  const [secondaryKeywordsRaw, setSecondaryKeywordsRaw] = useState('');
  const [isToplist, setIsToplist] = useState(DEFAULT_CONFIG.isToplist);
  const [outlineMode, setOutlineMode] = useState<OutlineMode>(DEFAULT_CONFIG.outlineMode);
  const [targetLength, setTargetLength] = useState(DEFAULT_CONFIG.targetLength);
  const [userOutlineText, setUserOutlineText] = useState('');
  const [aiOutlineObjective, setAiOutlineObjective] = useState<AiOutlineObjective>('basic');
  const [aiOutlineSize, setAiOutlineSize] = useState<AiOutlineSize>('5_6_h2');
  const [generatedOutline, setGeneratedOutline] = useState('');
  const [editedOutline, setEditedOutline] = useState('');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [isSuggestingKeywords, setIsSuggestingKeywords] = useState(false);
  const [imageOption, setImageOption] = useState<ImageOption>('none');
  const [language, setLanguage] = useState('Vietnamese');
  const [tone, setTone] = useState<KeywordTone>('seo_basic');
  const [model, setModel] = useState(DEFAULT_CONFIG.model);
  const [showSeo, setShowSeo] = useState(false);
  const [seoMainLink, setSeoMainLink] = useState('');
  const [seoKeywordLinks, setSeoKeywordLinks] = useState('');
  const [autoBold, setAutoBold] = useState<AutoBoldOption>('keyword');
  const [footerContent, setFooterContent] = useState('');
  const [brand, setBrand] = useState<BrandSectionState>(EMPTY_BRAND_SECTION_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const previewHtml = useMemo(() => parseOutlineToPreview(editedOutline || generatedOutline), [editedOutline, generatedOutline]);

  const configSnapshot: KeywordArticleConfig = useMemo(() => {
    const resolvedOutline =
      outlineMode === 'user_outline'
        ? userOutlineText.trim() || undefined
        : outlineMode === 'ai_outline'
          ? editedOutline.trim() || undefined
          : undefined;

    return {
      keyword: keyword.trim(),
      secondaryKeywords: parseSecondaryKeywords(secondaryKeywordsRaw),
      isToplist,
      outlineMode,
      targetLength,
      aiOutlineObjective: outlineMode === 'ai_outline' ? aiOutlineObjective : undefined,
      aiOutlineSize: outlineMode === 'ai_outline' ? aiOutlineSize : undefined,
      resolvedOutline,
      imageOption,
      language,
      tone,
      model,
      seoMainLink: seoMainLink.trim() || undefined,
      seoKeywordLinks: parseKeywordLinks(seoKeywordLinks),
      footerContent: footerContent.trim() || undefined,
      boldMainKeyword: autoBold === 'keyword' || autoBold === 'both',
      boldHeadings: autoBold === 'headings' || autoBold === 'both',
      brandProfileId: brand.selectedProfileId ? Number(brand.selectedProfileId) || undefined : undefined,
      brandConfig: buildBrandConfig(brand),
      dataSource: 'ai_only',
      competitorUrls: [],
    };
  }, [
    aiOutlineObjective,
    aiOutlineSize,
    autoBold,
    brand,
    editedOutline,
    footerContent,
    imageOption,
    isToplist,
    keyword,
    language,
    model,
    outlineMode,
    secondaryKeywordsRaw,
    seoKeywordLinks,
    seoMainLink,
    targetLength,
    tone,
    userOutlineText,
  ]);

  useEffect(() => {
    document.title = 'Viết Bài Theo Từ Khóa - Content Agent';
    const stored = sessionStorage.getItem(LS_CONFIG_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as KeywordArticleConfig;
        setKeyword(parsed.keyword || '');
        setSecondaryKeywordsRaw((parsed.secondaryKeywords || []).join(', '));
        setIsToplist(Boolean(parsed.isToplist));
        setOutlineMode(parsed.outlineMode || 'ai_outline');
        setTargetLength(parsed.targetLength || 2000);
        setUserOutlineText(parsed.outlineMode === 'user_outline' ? parsed.resolvedOutline || '' : '');
        setGeneratedOutline(parsed.outlineMode === 'ai_outline' ? parsed.resolvedOutline || '' : '');
        setEditedOutline(parsed.outlineMode === 'ai_outline' ? parsed.resolvedOutline || '' : '');
        setAiOutlineObjective(parsed.aiOutlineObjective || 'basic');
        setAiOutlineSize(parsed.aiOutlineSize || '5_6_h2');
        setImageOption(parsed.imageOption || 'none');
        setLanguage(parsed.language || 'Vietnamese');
        setTone(parsed.tone || 'seo_basic');
        setModel(parsed.model || 'gemini-flash');
        setSeoMainLink(parsed.seoMainLink || '');
        setSeoKeywordLinks(stringifyKeywordLinks(parsed.seoKeywordLinks));
        setFooterContent(parsed.footerContent || '');
        if (parsed.boldMainKeyword && parsed.boldHeadings) setAutoBold('both');
        else if (parsed.boldHeadings) setAutoBold('headings');
        else if (parsed.boldMainKeyword) setAutoBold('keyword');
        else setAutoBold('none');
      } catch {
        sessionStorage.removeItem(LS_CONFIG_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(LS_CONFIG_KEY, JSON.stringify(configSnapshot));
  }, [configSnapshot, hydrated]);

  useEffect(() => {
    if (!hydrated || !keyword.trim()) return;
    const timer = setTimeout(() => {
      void upsertArticleDraft({
        draftRef: readDraftRef('viet-theo-tu-khoa'),
        keyword: configSnapshot.keyword,
        language: configSnapshot.language,
        contentType: `viet_theo_tu_khoa:${configSnapshot.outlineMode}`,
        targetLength: configSnapshot.targetLength,
        aiProvider: configSnapshot.model,
        brandConfig: configSnapshot.brandConfig,
        outline: {
          flow: 'viet_theo_tu_khoa',
          stage: 'config',
          config: configSnapshot,
        },
        secondaryKeywords: configSnapshot.secondaryKeywords,
        selectedTitle: configSnapshot.keyword,
        htmlContent: '',
        metaDescription: '',
        status: 'DRAFT',
      }).then((draftRef) => {
        persistDraftRef('viet-theo-tu-khoa', draftRef);
      }).catch(() => undefined);
    }, 700);

    return () => clearTimeout(timer);
  }, [configSnapshot, hydrated, keyword]);

  async function handleGenerateOutline() {
    if (keyword.trim().length < 3) {
      setError('Từ khóa tối thiểu 3 ký tự.');
      return;
    }
    if (!model) {
      setError('Vui lòng chọn model AI.');
      return;
    }

    setIsGeneratingOutline(true);
    setError('');

    try {
      const response = await fetch('/api/viet-theo-tu-khoa/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword.trim(),
          secondaryKeywords: parseSecondaryKeywords(secondaryKeywordsRaw),
          isToplist,
          aiOutlineObjective,
          aiOutlineSize,
          targetLength,
          language,
          model,
          tone,
        }),
      });
      const data = await response.json() as { success?: boolean; outline?: string; error?: string };
      if (!response.ok || !data.success || !data.outline) {
        throw new Error(data.error || 'Không thể tạo dàn ý');
      }
      setGeneratedOutline(data.outline);
      setEditedOutline(data.outline);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi tạo dàn ý');
    } finally {
      setIsGeneratingOutline(false);
    }
  }

  async function handleSuggestKeywords() {
    if (keyword.trim().length < 2) {
      setError('Nhập từ khóa chính trước khi gợi ý từ khóa phụ.');
      return;
    }

    setIsSuggestingKeywords(true);
    setError('');

    try {
      const response = await fetch('/api/tinh-gon/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword.trim(),
          count: 8,
          model,
        }),
      });
      const data = await response.json() as { keywords?: string[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Không thể gợi ý từ khóa phụ');
      }

      const keywords = (data.keywords ?? [])
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8);

      if (keywords.length === 0) {
        throw new Error('Chưa có gợi ý phù hợp cho từ khóa này.');
      }

      setSuggestedKeywords(keywords);
      setSecondaryKeywordsRaw((current) => mergeSecondaryKeywords(current, keywords));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi gợi ý từ khóa phụ');
    } finally {
      setIsSuggestingKeywords(false);
    }
  }

  async function handleSubmit() {
    if (keyword.trim().length < 3) {
      setError('Từ khóa tối thiểu 3 ký tự.');
      return;
    }

    if (!model) {
      setError('Vui lòng chọn model AI.');
      return;
    }

    let resolvedOutline = '';
    if (outlineMode === 'user_outline') {
      resolvedOutline = userOutlineText.trim();
    } else if (outlineMode === 'ai_outline') {
      if (!editedOutline.trim()) {
        await handleGenerateOutline();
        return;
      }
      resolvedOutline = editedOutline.trim();
    }

    const finalConfig: KeywordArticleConfig = {
      ...configSnapshot,
      resolvedOutline: resolvedOutline || undefined,
    };

    setIsSubmitting(true);
    setError('');

    try {
      const draftRef = readDraftRef('viet-theo-tu-khoa');
      const response = await fetch('/api/viet-theo-tu-khoa/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: finalConfig,
          draftArticleId: draftRef?.articleId,
        }),
      });

      const data = await response.json() as {
        success?: boolean;
        articleId?: string;
        runId?: string;
        error?: string;
      };

      if (!response.ok || !data.success || !data.articleId || !data.runId) {
        throw new Error(data.error || 'Không thể bắt đầu viết bài');
      }

      sessionStorage.setItem(LS_CONFIG_KEY, JSON.stringify(finalConfig));
      sessionStorage.setItem(LS_RUN_ID_KEY, data.runId);
      persistDraftRef('viet-theo-tu-khoa', { articleId: data.articleId, runId: data.runId });
      router.push('/viet-theo-tu-khoa/generate');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi không xác định');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setKeyword('');
    setSecondaryKeywordsRaw('');
    setIsToplist(false);
    setOutlineMode('ai_outline');
    setTargetLength(2000);
    setUserOutlineText('');
    setGeneratedOutline('');
    setEditedOutline('');
    setSuggestedKeywords([]);
    setAiOutlineObjective('basic');
    setAiOutlineSize('5_6_h2');
    setImageOption('none');
    setLanguage('Vietnamese');
    setTone('seo_basic');
    setModel('gemini-flash');
    setSeoMainLink('');
    setSeoKeywordLinks('');
    setAutoBold('keyword');
    setFooterContent('');
    setBrand(EMPTY_BRAND_SECTION_STATE);
    setError('');
    sessionStorage.removeItem(LS_CONFIG_KEY);
    sessionStorage.removeItem(LS_RUN_ID_KEY);
    localStorage.removeItem(LS_BRAND_KEY);
    removeDraftRef('viet-theo-tu-khoa');
  }

  return (
    <div className="h-full p-6 overflow-y-auto bg-gray-50">
      <div className="w-full max-w-none space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Viết Bài Theo Từ Khóa</h1>
              <p className="text-sm text-blue-600 mt-1">Bước 1 / 2 — Cấu hình từ khóa, dàn ý và SEO</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Làm mới form
            </button>
          </div>
          <div className="mt-4 flex gap-1">
            <div className="h-1.5 flex-1 rounded-full bg-blue-600" />
            <div className="h-1.5 flex-1 rounded-full bg-gray-200" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <section className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Từ khóa chính
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_10rem] gap-2">
                <textarea
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSubmit();
                    }
                  }}
                  rows={2}
                  placeholder="Ví dụ: giường sắt đơn 1m2"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => void handleSuggestKeywords()}
                  disabled={isSuggestingKeywords || keyword.trim().length < 2}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSuggestingKeywords ? 'Đang gợi ý...' : 'AI Suggest'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                AI Suggest sẽ gợi ý từ khóa phụ và tự thêm vào danh sách bên dưới.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Từ khóa phụ</label>
              <input
                type="text"
                value={secondaryKeywordsRaw}
                onChange={(event) => setSecondaryKeywordsRaw(event.target.value)}
                placeholder="Cách nhau bởi dấu phẩy"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Tối đa 10 từ khóa phụ, ngăn cách bằng dấu phẩy.</p>
              {suggestedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {suggestedKeywords.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSecondaryKeywordsRaw((current) => mergeSecondaryKeywords(current, [item]))}
                      className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs hover:bg-blue-100"
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isToplist}
                onChange={(event) => setIsToplist(event.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Viết dạng danh sách / toplist
            </label>
          </section>

          <section>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh cho bài viết</label>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              {IMAGE_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setImageOption(item.value)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${
                    imageOption === item.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-lg">{item.icon}</div>
                  <p className={`text-sm font-semibold mt-1 ${imageOption === item.value ? 'text-blue-700' : 'text-gray-700'}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{item.note}</p>
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngôn ngữ bài viết</label>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SUPPORTED_LANGUAGES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </section>

          <section className="border border-gray-200 rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phương án dàn ý</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  { value: 'no_outline', label: 'Không dàn ý', note: 'AI tự chọn cấu trúc phù hợp' },
                  { value: 'user_outline', label: 'Dàn ý của bạn', note: 'Nhập [h2] / [h3] thủ công' },
                  { value: 'ai_outline', label: 'AI tạo dàn ý', note: 'Khuyến nghị, có thể sửa lại' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setOutlineMode(item.value as OutlineMode)}
                    className={`rounded-xl border-2 p-3 text-left transition-colors ${
                      outlineMode === item.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${outlineMode === item.value ? 'text-blue-700' : 'text-gray-700'}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{item.note}</p>
                  </button>
                ))}
              </div>
            </div>

            {outlineMode === 'no_outline' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Độ dài mục tiêu</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {NO_OUTLINE_LENGTHS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setTargetLength(item.value)}
                      className={`relative rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                        targetLength === item.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {item.label}
                      {'isDefault' in item && item.isDefault && (
                        <span className="absolute -top-2 -right-1 text-[9px] bg-blue-600 text-white rounded-full px-1.5 py-0.5">
                          Mặc định
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {outlineMode === 'user_outline' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dàn ý của bạn</label>
                <textarea
                  value={userOutlineText}
                  onChange={(event) => setUserOutlineText(event.target.value)}
                  rows={10}
                  placeholder={'[h2]Giường sắt đơn là gì?[/h2]\n[h3]Ưu điểm nổi bật[/h3]\n[h2]Cách chọn giường phù hợp[/h2]'}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {outlineMode === 'ai_outline' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mục tiêu dàn ý</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {AI_OUTLINE_OBJECTIVES.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setAiOutlineObjective(item.value)}
                          className={`rounded-lg border p-3 text-left transition-colors ${
                            aiOutlineObjective === item.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <p className={`text-sm font-medium ${aiOutlineObjective === item.value ? 'text-blue-700' : 'text-gray-700'}`}>
                            {item.label}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{item.note}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quy mô dàn ý</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {AI_OUTLINE_SIZES.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setAiOutlineSize(item.value)}
                          className={`rounded-lg border p-3 text-left transition-colors ${
                            aiOutlineSize === item.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <p className={`text-sm font-medium ${aiOutlineSize === item.value ? 'text-blue-700' : 'text-gray-700'}`}>
                            {item.label}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{item.note}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => void handleGenerateOutline()}
                    disabled={isGeneratingOutline || keyword.trim().length < 3}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isGeneratingOutline ? 'Đang tạo dàn ý...' : 'Tạo dàn ý AI'}
                  </button>
                  <p className="text-xs text-gray-400">Bạn có thể sửa lại dàn ý trước khi bấm viết bài.</p>
                </div>

                {(generatedOutline || editedOutline) && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Dàn ý có thể chỉnh sửa</label>
                      <textarea
                        value={editedOutline}
                        onChange={(event) => setEditedOutline(event.target.value)}
                        rows={14}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Preview dàn ý</label>
                      <div
                        className="min-h-[20rem] rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <label className="block text-sm font-medium text-gray-700 mb-2">Giọng văn</label>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
              {KEYWORD_TONES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  title={item.note}
                  onClick={() => setTone(item.value)}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition-colors ${
                    tone === item.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
            <ModelPicker value={model} onChange={setModel} size="md" label="" />
          </section>

          <BrandSection
            value={brand}
            onChange={setBrand}
            lsKey={LS_BRAND_KEY}
          />

          <SeoAdvancedBlock
            show={showSeo}
            onToggle={() => setShowSeo((prev) => !prev)}
            mainLink={seoMainLink}
            onMainLinkChange={setSeoMainLink}
            keywordLinks={seoKeywordLinks}
            onKeywordLinksChange={setSeoKeywordLinks}
            autoBold={autoBold}
            onAutoBoldChange={setAutoBold}
            footerContent={footerContent}
            onFooterContentChange={setFooterContent}
          />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || isGeneratingOutline || keyword.trim().length < 3}
              className="px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Đang chuẩn bị...' : isGeneratingOutline ? 'Đang tạo dàn ý...' : 'Bắt đầu viết bài'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
