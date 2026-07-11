'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CONTENT_TYPES } from '@/lib/viet-bai-thong-minh/options';
import {
  parseStoredJson,
  writeVbtStorage,
} from '@/lib/viet-bai-thong-minh/storage';
import type {
  SemanticAnalysis,
  VbtStep1State,
} from '@/lib/viet-bai-thong-minh/types';

const INTENT_CLASS: Record<string, string> = {
  informational: 'bg-blue-50 text-blue-700 border-blue-200',
  navigational: 'bg-gray-50 text-gray-700 border-gray-200',
  commercial: 'bg-amber-50 text-amber-700 border-amber-200',
  transactional: 'bg-green-50 text-green-700 border-green-200',
};

const RPP_BAR_MAP: Record<string, { pct: number; color: string; label: string }> = {
  high: { pct: 100, color: 'bg-red-500', label: 'Cao' },
  medium: { pct: 60, color: 'bg-amber-400', label: 'Trung bình' },
  low: { pct: 30, color: 'bg-gray-300', label: 'Thấp' },
};

export default function VietBaiThongMinhStep2() {
  const router = useRouter();
  const [step1, setStep1] = useState<VbtStep1State | null>(null);
  const [semantic, setSemantic] = useState<SemanticAnalysis | null>(null);
  const [useAiSuggestion, setUseAiSuggestion] = useState(true);

  useEffect(() => {
    document.title = 'Viết Bài Thông Minh - Bước 2';
    const storedStep1 = parseStoredJson<VbtStep1State>('step1');
    const storedSemantic = parseStoredJson<SemanticAnalysis>('semantic');

    if (!storedStep1 || !storedSemantic) {
      router.replace('/viet-bai-thong-minh');
      return;
    }

    setStep1(storedStep1);
    setSemantic(storedSemantic);
  }, [router]);

  function addSemanticKeyword(keyword: string) {
    if (!step1) return;
    const current = step1.secondaryKeywordsRaw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const next = Array.from(new Set([...current, keyword.trim()].filter(Boolean)));
    const nextStep1 = { ...step1, secondaryKeywordsRaw: next.join(', ') };
    setStep1(nextStep1);
    writeVbtStorage('step1', JSON.stringify(nextStep1));
  }

  function handleNext() {
    if (!step1 || !semantic) return;
    const nextStep1 = useAiSuggestion
      ? { ...step1, contentType: semantic.suggestedContentType }
      : step1;
    writeVbtStorage('step1', JSON.stringify(nextStep1));
    router.push('/viet-bai-thong-minh/step3');
  }

  if (!step1 || !semantic) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const suggestedType = CONTENT_TYPES.find((item) => item.value === semantic.suggestedContentType);
  const currentType = CONTENT_TYPES.find((item) => item.value === step1.contentType);

  return (
    <div className="h-full w-full overflow-y-auto bg-gray-50 p-6">
      <div className="w-full space-y-5">
        <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-950">Đánh giá phân tích semantic</h1>
              <p className="mt-1 text-sm text-blue-700">Bước 2 / 4 - Xác nhận ngữ cảnh tổng quan, intent, RPP và bản đồ thuộc tính</p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/viet-bai-thong-minh')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Quay lại bước 1
            </button>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className={`h-2 rounded-full ${step <= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-800">{step1.keyword}</span>
            <span className={`rounded-full border px-3 py-1 text-sm font-bold ${INTENT_CLASS[semantic.searchIntent] ?? INTENT_CLASS.informational}`}>
              {semantic.searchIntent}
            </span>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700">
              {semantic.estimatedWordCount.toLocaleString()} từ
            </span>
          </div>
          <p className="mt-4 text-base leading-7 text-gray-800">{semantic.macroContext}</p>
          <p className="mt-2 text-sm text-gray-500">{semantic.intentExplanation}</p>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-gray-900">Nỗi đau của người đọc</h2>
            <div className="mt-4 space-y-3">
              {semantic.rppMap.map((item, index) => (
                <div key={`${item.pain}-${index}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-800">{item.pain}</p>
                    <span className="text-xs font-bold text-gray-500">
                      {(RPP_BAR_MAP[item.relevance] || RPP_BAR_MAP.low).label}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full transition-all ${(RPP_BAR_MAP[item.relevance] || RPP_BAR_MAP.low).color}`}
                      style={{ width: `${(RPP_BAR_MAP[item.relevance] || RPP_BAR_MAP.low).pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-gray-900">Bản đồ thuộc tính</h2>
            <div className="mt-4 space-y-3">
              {semantic.attributeMap.map((item, index) => (
                <div key={`${item.attribute}-${index}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-800">{item.attribute}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                      item.importance === 'must'
                        ? 'bg-blue-100 text-blue-700'
                        : item.importance === 'should'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-200 text-gray-600'
                    }`}>
                      {item.importance}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-gray-900">Từ khóa semantic</h2>
              <p className="mt-1 text-sm text-gray-500">Bấm để thêm vào từ khóa phụ của bước 1.</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
              Hiện tại: {step1.secondaryKeywordsRaw || 'chưa có'}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {semantic.semanticKeywords.map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => addSemanticKeyword(keyword)}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
              >
                + {keyword}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-900">Đề xuất của AI</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Đang chọn</p>
              <p className="mt-1 text-sm font-black text-gray-800">{currentType?.label ?? step1.contentType}</p>
              <p className="mt-1 text-xs text-gray-500">{currentType?.note}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-500">AI gợi ý</p>
              <p className="mt-1 text-sm font-black text-blue-900">{suggestedType?.label ?? semantic.suggestedContentType}</p>
              <p className="mt-1 text-xs text-blue-700">{suggestedType?.note}</p>
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={useAiSuggestion}
              onChange={(event) => setUseAiSuggestion(event.target.checked)}
              className="h-4 w-4"
            />
            Dùng đề xuất AI cho loại nội dung và độ dài mục tiêu mặc định ở bước 3
          </label>
        </section>

        {semantic.competitorInsights && (
          <section className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
            <h2 className="text-lg font-black text-orange-900">Phân tích đối thủ</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-orange-900">{semantic.competitorInsights}</p>
          </section>
        )}

        <footer className="sticky bottom-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">Bước tiếp theo sẽ chọn tiêu đề, outline và các cấu hình còn lại trong 8 khối.</p>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700"
            >
              Xác nhận semantic -&gt;
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
