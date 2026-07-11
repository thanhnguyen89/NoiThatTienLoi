'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandSection, EMPTY_BRAND_SECTION_STATE, type BrandSectionState } from '@/components/BrandSection';
import ModelPicker from '@/components/ModelPicker';
import { SeoAdvancedBlock } from '@/components/SeoAdvancedBlock';
import { IMAGE_OPTIONS, type AutoBoldOption, type ImageOption } from '@/lib/shared/options';
import {
  CONTENT_TYPES,
  VBT_AI_OUTLINE_OBJECTIVES,
  VBT_AI_OUTLINE_SIZES,
  VBT_TONES,
  getContentTypeDefaultLength,
} from '@/lib/viet-bai-thong-minh/options';
import {
  parseStoredJson,
  writeVbtStorage,
} from '@/lib/viet-bai-thong-minh/storage';
import type {
  OutlineMode,
  SemanticAnalysis,
  VbtStep1State,
  VbtStep3State,
} from '@/lib/viet-bai-thong-minh/types';

function splitKeywords(raw: string): string[] {
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

const TARGET_LENGTH_OPTIONS = [
  { value: 600, label: '600', note: 'Tin tức / ngắn' },
  { value: 1000, label: '1000', note: 'Blog cơ bản' },
  { value: 1500, label: '1500', note: 'Chuẩn SEO' },
  { value: 2500, label: '2500', note: 'Pillar / chuyên sâu' },
  { value: 4000, label: '4000', note: 'Mega guide' },
] as const;

export default function VietBaiThongMinhStep3() {
  const router = useRouter();
  const [step1, setStep1] = useState<VbtStep1State | null>(null);
  const [semantic, setSemantic] = useState<SemanticAnalysis | null>(null);
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);
  const [customTitle, setCustomTitle] = useState('');
  const [outlineMode, setOutlineMode] = useState<OutlineMode>('ai_outline');
  const [userOutlineText, setUserOutlineText] = useState('');
  const [aiOutlineText, setAiOutlineText] = useState('');
  const [aiOutlineObjective, setAiOutlineObjective] = useState('comprehensive');
  const [aiOutlineSize, setAiOutlineSize] = useState('md');
  const [imageOption, setImageOption] = useState<ImageOption>('none');
  const [targetLength, setTargetLength] = useState(1500);
  const [tone, setTone] = useState('seo_extended');
  const [model, setModel] = useState('gemini-flash');
  const [brand, setBrand] = useState<BrandSectionState>(EMPTY_BRAND_SECTION_STATE);
  const [seoMainLink, setSeoMainLink] = useState('');
  const [seoKeywordLinks, setSeoKeywordLinks] = useState('');
  const [autoBold, setAutoBold] = useState<AutoBoldOption>('none');
  const [footerContent, setFooterContent] = useState('');
  const [showSeo, setShowSeo] = useState(false);
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Viết Bài Thông Minh - Bước 3';
    const storedStep1 = parseStoredJson<VbtStep1State>('step1');
    const storedSemantic = parseStoredJson<SemanticAnalysis>('semantic');
    if (!storedStep1) {
      router.replace('/viet-bai-thong-minh');
      return;
    }

    setStep1(storedStep1);
    setSemantic(storedSemantic);

    const storedStep3 = parseStoredJson<VbtStep3State>('step3');
    if (storedStep3) {
      setTitleOptions(storedStep3.titleOptions);
      setSelectedTitleIndex(storedStep3.selectedTitleIndex);
      setCustomTitle(storedStep3.customTitle);
      setOutlineMode(storedStep3.outlineMode);
      setUserOutlineText(storedStep3.userOutlineText);
      setAiOutlineText(storedStep3.aiOutlineText);
      setAiOutlineObjective(storedStep3.aiOutlineObjective);
      setAiOutlineSize(storedStep3.aiOutlineSize);
      setImageOption(storedStep3.imageOption);
      setTargetLength(storedStep3.targetLength);
      setTone(storedStep3.tone);
      setModel(storedStep3.model);
      setBrand(storedStep3.brand);
      setSeoMainLink(storedStep3.seoMainLink);
      setSeoKeywordLinks(storedStep3.seoKeywordLinks);
      setAutoBold(storedStep3.autoBold);
      setFooterContent(storedStep3.footerContent);
      return;
    }

    setTargetLength(storedSemantic?.estimatedWordCount || getContentTypeDefaultLength(storedStep1.contentType));
  }, [router]);

  const secondaryKeywords = useMemo(
    () => splitKeywords(step1?.secondaryKeywordsRaw || ''),
    [step1?.secondaryKeywordsRaw],
  );

  const finalTitle = useMemo(
    () => customTitle.trim() || titleOptions[selectedTitleIndex] || step1?.keyword || '',
    [customTitle, selectedTitleIndex, step1?.keyword, titleOptions],
  );

  const selectedTitleLength = finalTitle.length;

  function buildStep3State(): VbtStep3State {
    return {
      titleOptions,
      selectedTitleIndex,
      customTitle,
      outlineMode,
      userOutlineText,
      aiOutlineText,
      aiOutlineObjective,
      aiOutlineSize,
      imageOption,
      targetLength,
      tone,
      model,
      brand,
      seoMainLink,
      seoKeywordLinks,
      autoBold,
      footerContent,
    };
  }

  async function handleGenerateTitles() {
    if (!step1) return;
    setError('');
    setGeneratingTitles(true);
    try {
      const response = await fetch('/api/vbt/titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: step1.keyword,
          secondaryKeywords,
          contentType: step1.contentType,
          language: step1.language,
          semantic,
        }),
      });
      const payload = await response.json() as { titles?: string[]; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Không sinh được tiêu đề.');
      const nextTitles = payload.titles?.length ? payload.titles : [step1.keyword];
      setTitleOptions(nextTitles);
      setSelectedTitleIndex(0);
      setCustomTitle('');
    } catch (titleError) {
      setError(titleError instanceof Error ? titleError.message : 'Không sinh được tiêu đề.');
    } finally {
      setGeneratingTitles(false);
    }
  }

  async function handleGenerateOutline() {
    if (!step1) return;
    setError('');
    setGeneratingOutline(true);
    try {
      const response = await fetch('/api/vbt/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: step1.keyword,
          secondaryKeywords,
          contentType: step1.contentType,
          objective: aiOutlineObjective,
          size: aiOutlineSize,
          language: step1.language,
          semantic,
        }),
      });
      const payload = await response.json() as { outline?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Không sinh được outline.');
      setAiOutlineText(payload.outline || '');
      setOutlineMode('ai_outline');
    } catch (outlineError) {
      setError(outlineError instanceof Error ? outlineError.message : 'Không sinh được outline.');
    } finally {
      setGeneratingOutline(false);
    }
  }

  async function handleStart() {
    if (!step1) return;
    setError('');
    setSubmitting(true);

    const step3 = buildStep3State();
    const finalOutline =
      outlineMode === 'user_outline'
        ? userOutlineText.trim()
        : outlineMode === 'ai_outline'
          ? aiOutlineText.trim()
          : '';

    writeVbtStorage('step3', JSON.stringify(step3));

    try {
      const response = await fetch('/api/vbt/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...step1,
          title: finalTitle || step1.keyword,
          outline: finalOutline,
          secondaryKeywords,
          semantic,
          step3,
        }),
      });
      const payload = await response.json() as { runId?: string; articleId?: string; error?: string };
      if (!response.ok || !payload.runId) throw new Error(payload.error || 'Không thể tạo run.');
      writeVbtStorage('runId', payload.runId);
      router.push('/viet-bai-thong-minh/step4');
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Không thể bắt đầu viết bài.');
      setSubmitting(false);
    }
  }

  if (!step1) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-gray-50 p-6">
      <div className="w-full space-y-5">
        <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-950">Cấu hình bài viết</h1>
              <p className="mt-1 text-sm text-blue-700">Bước 3 / 4 - Tiêu đề, outline và cấu hình 8 khối còn lại</p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/viet-bai-thong-minh/step2')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Quay lại bước 2
            </button>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className={`h-2 rounded-full ${step <= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Tiêu đề</p>
              <h2 className="text-lg font-black text-gray-900">Chọn tiêu đề</h2>
            </div>
            <button
              type="button"
              onClick={() => void handleGenerateTitles()}
              disabled={generatingTitles}
              className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              {generatingTitles ? 'Đang sinh...' : 'Sinh 5 tiêu đề'}
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {titleOptions.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                Chưa có tiêu đề AI. Nếu không sinh tiêu đề, hệ thống sẽ dùng từ khóa làm dự phòng.
              </p>
            )}
            {titleOptions.map((title, index) => (
              <label
                key={`${title}-${index}`}
                className={`block cursor-pointer rounded-xl border p-4 ${
                  !customTitle.trim() && selectedTitleIndex === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={!customTitle.trim() && selectedTitleIndex === index}
                    onChange={() => {
                      setSelectedTitleIndex(index);
                      setCustomTitle('');
                    }}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">{title}</p>
                    <p className={`mt-1 text-xs ${title.length >= 50 && title.length <= 60 ? 'text-green-600' : 'text-amber-600'}`}>
                      {title.length} ký tự - mục tiêu 50-60
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-4">
            <label className="mb-2 block text-sm font-bold text-gray-700">Tự nhập tiêu đề</label>
            <input
              type="text"
              value={customTitle}
              onChange={(event) => setCustomTitle(event.target.value)}
              placeholder="Nhập tiêu đề riêng..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className={`mt-1 text-xs ${selectedTitleLength >= 50 && selectedTitleLength <= 60 ? 'text-green-600' : 'text-gray-400'}`}>
              Tiêu đề đang chọn: {selectedTitleLength} ký tự
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Khối 2 - Tùy chọn hình ảnh</p>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            {IMAGE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setImageOption(item.value)}
                className={`rounded-xl border p-3 text-left ${
                  imageOption === item.value
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                <span className="text-sm font-black">{item.label}</span>
                <span className="mt-1 block text-xs text-gray-500">{item.note}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Khối 3 - Ngôn ngữ</p>
          <p className="mt-2 rounded-xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700">{step1.language}</p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Khối 4 - Outline + độ dài</p>
              <h2 className="text-lg font-black text-gray-900">Cấu trúc bài</h2>
            </div>
            <button
              type="button"
              onClick={() => void handleGenerateOutline()}
              disabled={generatingOutline}
              className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              {generatingOutline ? 'Đang sinh...' : 'Sinh outline AI'}
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              { value: 'no_outline', label: 'Không dùng outline' },
              { value: 'user_outline', label: 'Nhập outline riêng' },
              { value: 'ai_outline', label: 'Dùng outline AI' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setOutlineMode(item.value as OutlineMode)}
                className={`rounded-xl border p-3 text-sm font-bold ${
                  outlineMode === item.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 text-gray-700 hover:border-emerald-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select
              value={aiOutlineObjective}
              onChange={(event) => setAiOutlineObjective(event.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {VBT_AI_OUTLINE_OBJECTIVES.map((item) => (
                <option key={item.value} value={item.value}>{item.label} - {item.note}</option>
              ))}
            </select>
            <select
              value={aiOutlineSize}
              onChange={(event) => setAiOutlineSize(event.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {VBT_AI_OUTLINE_SIZES.map((item) => (
                <option key={item.value} value={item.value}>{item.label} - {item.wordRange}</option>
              ))}
            </select>
          </div>

          {outlineMode === 'user_outline' && (
            <textarea
              value={userOutlineText}
              onChange={(event) => setUserOutlineText(event.target.value)}
              rows={8}
              placeholder="[h2]Mục lớn[/h2]&#10;[h3]Mục con[/h3]"
              className="mt-4 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          )}

          {outlineMode === 'ai_outline' && (
            <textarea
              value={aiOutlineText}
              onChange={(event) => setAiOutlineText(event.target.value)}
              rows={8}
              placeholder="Sinh outline AI rồi có thể sửa tại đây..."
              className="mt-4 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          )}

          <div className="mt-4">
            <label className="mb-1 block text-sm font-bold text-gray-700">Độ dài mục tiêu</label>
            <div className="flex flex-wrap gap-2">
              {TARGET_LENGTH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.note}
                  onClick={() => setTargetLength(option.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                    targetLength === option.value
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-emerald-400'
                  }`}
                >
                  {option.label} từ
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Loại nội dung: {CONTENT_TYPES.find((item) => item.value === step1.contentType)?.label}
              {semantic ? ` - AI ước tính ${semantic.estimatedWordCount.toLocaleString()} từ` : ''}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Khối 5 - Giọng viết</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {VBT_TONES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTone(item.value)}
                className={`rounded-xl border p-3 text-left ${
                  tone === item.value
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                <span className="text-sm font-black">{item.label}</span>
                <span className="mt-1 block text-xs text-gray-500">{item.note}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Khối 6 - Mô hình AI</p>
          <ModelPicker value={model} onChange={setModel} size="md" label="" />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Khối 7 - Cấu hình thương hiệu</p>
          <BrandSection value={brand} onChange={setBrand} lsKey="vbt_brand_info" />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Khối 8 - SEO nâng cao</p>
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
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
        )}

        <footer className="sticky bottom-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-800">{finalTitle || step1.keyword}</p>
              <p className="text-xs text-gray-500">Khi bắt đầu, hệ thống sẽ gọi /api/vbt/start và chuyển sang bước 4 để stream.</p>
            </div>
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Đang tạo run...' : 'Bắt đầu viết bài ->'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
