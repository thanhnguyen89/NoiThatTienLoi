'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { persistDraftRef, readDraftRef } from '@/lib/article-draft-client';
import type { SourceConfig } from '@/lib/viet-theo-nguon/types';

const STEPS = [
  { key: 'writing', label: 'Writer chuyển đổi bài Facebook...', icon: '✍️' },
  { key: 'seo', label: 'SEO Specialist tối ưu...', icon: '🔧' },
  { key: 'editor', label: 'Editor QC humanize & chấm điểm...', icon: '✅' },
] as const;

const STORAGE_KEYS = {
  params: 'fb2article_params',
  config: 'vtn_config',
  runId: 'vtn_run_id',
  articleId: 'vtn_article_id',
  result: 'vtn_result',
  sources: 'vtn_sources',
  outline: 'vtn_outline',
  draftRef: 'draft:viet-tu-facebook',
} as const;

interface FacebookParams {
  provider: string;
  keyword: string;
  secondaryKeywords: string[];
  fbContent: string;
  title: string;
  writingMode: 'expand' | 'rewrite' | 'reformat';
  targetLength: number;
  tone: string;
  language: string;
}

interface FacebookScoreBreakdown {
  language_natural: number;
  structure: number;
  eeat_signals: number;
  engagement: number;
}

interface FacebookPipelineResult {
  html: string;
  title: string;
  metaDescription: string;
  wordCount: number;
  humanness_score: number;
  decision: 'PUBLISH' | 'REVIEW' | 'REWRITE';
  scoreBreakdown: FacebookScoreBreakdown;
}

interface StreamEventPayload {
  type: 'step' | 'step_done' | 'chunk' | 'done' | 'error';
  step?: (typeof STEPS)[number]['key'];
  label?: string;
  text?: string;
  message?: string;
  data?: FacebookPipelineResult;
}

function sanitizeTone(value: string): SourceConfig['tone'] {
  const map: Record<string, SourceConfig['tone']> = {
    professional: 'formal',
    friendly: 'friendly',
    formal: 'formal',
    casual: 'conversational',
  };

  return map[value] || 'friendly';
}

function buildSourceConfig(params: FacebookParams): SourceConfig {
  return {
    keyword: params.keyword.trim(),
    secondaryKeywords: params.secondaryKeywords || [],
    language: params.language || 'Vietnamese',
    outlineMode: 'custom',
    outlineAIType: 'h2h3_detail',
    customOutline: [
      `Nguồn gốc: Chuyển từ Facebook post`,
      `Chế độ viết: ${params.writingMode}`,
      `Tiêu đề mong muốn: ${params.title}`,
      '',
      params.fbContent.trim(),
    ].join('\n'),
    structure: 'auto',
    tone: sanitizeTone(params.tone),
    model: params.provider || 'gemini-flash',
    targetLength: params.targetLength || 2000,
    imageOption: '0',
    seoOptions: {
      boldKeyword: false,
      boldHeading: false,
    },
  };
}

export default function VietTuFacebookGeneratePage() {
  const router = useRouter();
  const hasStartedRef = useRef(false);
  const streamBoxRef = useRef<HTMLDivElement>(null);

  const [params, setParams] = useState<FacebookParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [activeStep, setActiveStep] = useState<(typeof STEPS)[number]['key'] | ''>('');
  const [doneSteps, setDoneSteps] = useState<Array<(typeof STEPS)[number]['key']>>([]);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Đang tạo bài từ Facebook - Content Agent';

    const raw = localStorage.getItem(STORAGE_KEYS.params);
    if (!raw) {
      router.replace('/viet-tu-facebook');
      return;
    }

    try {
      const parsed = JSON.parse(raw) as FacebookParams;
      setParams(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEYS.params);
      router.replace('/viet-tu-facebook');
    }
  }, [router]);

  useEffect(() => {
    if (!params || hasStartedRef.current) return;
    hasStartedRef.current = true;
    void startFlow(params);
  }, [params]);

  function scrollToBottom() {
    const element = streamBoxRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }

  async function ensureDraftArticle(config: SourceConfig, draftTitle: string) {
    const draftRef = readDraftRef('viet-tu-facebook');
    const response = await fetch('/api/articles/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId: draftRef?.articleId,
        draft: {
          feature: 'viet_tu_facebook',
          keyword: config.keyword,
          language: config.language,
          contentType: 'viet_theo_nguon:auto',
          targetLength: config.targetLength,
          aiProvider: config.model,
          brandConfig: config.brandConfig,
          selectedTitle: draftTitle || config.keyword,
          userNotes: 'Bài được chuyển từ Facebook post',
          secondaryKeywords: config.secondaryKeywords,
          competitorUrls: [],
          outline: {
            stage: 'facebook_import',
            source: 'facebook_post',
            config,
            sources: [],
            outline: config.customOutline,
          },
        },
      }),
    });

    const payload = await response.json() as { articleId?: string; runId?: string; error?: string };
    if (!response.ok || !payload.articleId || !payload.runId) {
      throw new Error(payload.error || 'Không thể tạo draft bài viết.');
    }

    persistDraftRef('viet-tu-facebook', {
      articleId: payload.articleId,
      runId: payload.runId,
    });

    return {
      articleId: payload.articleId,
      runId: payload.runId,
    };
  }

  async function saveArticleResult(articleId: string, config: SourceConfig, result: FacebookPipelineResult) {
    const response = await fetch(`/api/articles/${articleId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: config.keyword,
        language: config.language,
        contentType: 'viet_theo_nguon:auto',
        targetLength: config.targetLength,
        aiProvider: config.model,
        brandConfig: config.brandConfig,
        outline: {
          stage: 'facebook_import',
          source: 'facebook_post',
          config,
          sources: [],
          outline: config.customOutline,
        },
        selectedTitle: result.title || config.keyword,
        userNotes: 'Bài được chuyển từ Facebook post',
        htmlContent: result.html,
        metaDescription: result.metaDescription,
        slug: '',
        wordCount: result.wordCount,
        seoChecks: {
          keywordDensity: 0,
        },
        humannessScore: result.humanness_score,
        scoreBreakdown: {
          humanness: {
            score: result.humanness_score,
            decision: result.decision,
            issues: [],
            forbiddenFound: [],
            metrics: {
              sentenceCount: 0,
              averageSentenceLength: 0,
              passiveVoiceHits: 0,
              specificDataHits: 0,
              repeatedStarterHits: 0,
              uniformSentencePattern: false,
            },
            scoreBreakdown: result.scoreBreakdown,
          },
          keywordDensity: 0,
        },
        secondaryKeywords: config.secondaryKeywords,
        status: 'WRITTEN',
        aiDecision: result.decision,
      }),
    });

    const payload = await response.json().catch(() => ({ error: 'Không thể lưu kết quả bài viết.' })) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || 'Không thể lưu kết quả bài viết.');
    }
  }

  function writeUnifiedSession(config: SourceConfig, articleId: string, runId: string, result: FacebookPipelineResult) {
    sessionStorage.setItem(STORAGE_KEYS.config, JSON.stringify(config));
    sessionStorage.setItem(STORAGE_KEYS.articleId, articleId);
    sessionStorage.setItem(STORAGE_KEYS.runId, runId);
    sessionStorage.setItem(STORAGE_KEYS.sources, JSON.stringify([]));
    sessionStorage.setItem(STORAGE_KEYS.outline, config.customOutline);
    sessionStorage.setItem(
      STORAGE_KEYS.result,
      JSON.stringify({
        runId,
        html: result.html,
        title: result.title || config.keyword,
        metaDescription: result.metaDescription || '',
        wordCount: result.wordCount || 0,
        keywordDensity: 0,
        humanness: {
          score: result.humanness_score,
          decision: result.decision,
          issues: [],
          forbiddenFound: [],
          metrics: {
            sentenceCount: 0,
            averageSentenceLength: 0,
            passiveVoiceHits: 0,
            specificDataHits: 0,
            repeatedStarterHits: 0,
            uniformSentencePattern: false,
          },
          scoreBreakdown: result.scoreBreakdown,
        },
        sources: [],
      }),
    );
  }

  async function redirectToUnifiedEditor(articleId: string, runId: string, config: SourceConfig, result: FacebookPipelineResult) {
    writeUnifiedSession(config, articleId, runId, result);
    setRedirecting(true);
    router.replace(`/viet-theo-nguon/generate?runId=${encodeURIComponent(runId)}`);
  }

  async function startFlow(nextParams: FacebookParams) {
    setLoading(true);
    setError('');
    setActiveStep('');
    setDoneSteps([]);
    setStreamedText('');

    const config = buildSourceConfig(nextParams);

    try {
      const { articleId, runId } = await ensureDraftArticle(config, nextParams.title.trim());
      const response = await fetch('/api/pipeline/facebook-to-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextParams),
      });

      if (!response.ok || !response.body) {
        throw new Error('Không kết nối được server streaming.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const event = JSON.parse(line.slice(6)) as StreamEventPayload;
          if (event.type === 'step') {
            setActiveStep(event.step || '');
            continue;
          }

          if (event.type === 'step_done' && event.step) {
            setDoneSteps((prev) => (prev.includes(event.step!) ? prev : [...prev, event.step!]));
            setActiveStep('');
            continue;
          }

          if (event.type === 'chunk' && event.text) {
            setStreamedText((prev) => prev + event.text);
            window.setTimeout(scrollToBottom, 10);
            continue;
          }

          if (event.type === 'done' && event.data) {
            await saveArticleResult(articleId, config, event.data);
            await redirectToUnifiedEditor(articleId, runId, config, event.data);
            return;
          }

          if (event.type === 'error') {
            throw new Error(event.message || 'Lỗi khi xử lý bài viết.');
          }
        }
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạo bài từ Facebook.');
      setLoading(false);
    }
  }

  function handleRetry() {
    if (!params) return;
    hasStartedRef.current = false;
    setRedirecting(false);
    void startFlow(params);
  }

  const isAllDone = doneSteps.includes('editor');
  const providerName = params?.provider || 'gemini-flash';
  const plainText = streamedText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const paragraphs = (streamedText.match(/<p[\s>]/gi) || []).length;

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-5xl">⚠️</div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Có lỗi xảy ra</h2>
          <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/viet-tu-facebook')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              ← Quay lại
            </button>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-100">
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <div className="mr-2 flex shrink-0 items-center gap-1">
          <span className="text-base">📘</span>
          <span className="hidden text-xs font-semibold text-gray-600 sm:block">Facebook → Editor Chuẩn</span>
        </div>
        {STEPS.map((step, index) => {
          const isDone = doneSteps.includes(step.key);
          const isActive = activeStep === step.key;
          return (
            <div key={step.key} className="flex flex-1 items-center gap-1.5">
              <div
                className={`flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isDone
                    ? 'bg-green-50 text-green-700'
                    : isActive
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-300'
                      : 'bg-gray-50 text-gray-400'
                }`}
              >
                <span className="text-sm">
                  {isDone ? '✅' : isActive ? <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-blue-500" /> : '⏳'}
                </span>
                <span className="hidden truncate sm:block">{step.label}</span>
                <span className="sm:hidden">{step.icon}</span>
              </div>
              {index < STEPS.length - 1 && <span className="shrink-0 text-xs text-gray-300">›</span>}
            </div>
          );
        })}
        <div className="ml-2 shrink-0">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              isAllDone ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'
            } ${redirecting ? 'animate-pulse' : ''}`}
          >
            {redirecting ? 'Đang mở editor chuẩn...' : isAllDone ? '✅ Xong' : `⏳ ${providerName}`}
          </span>
        </div>
      </div>

      <div className="shrink-0 border-b border-gray-100 bg-white px-6 py-2.5">
        <div className="flex items-center gap-8">
          {[
            { label: 'SỐ TỪ', value: wordCount > 0 ? wordCount.toLocaleString() : '–' },
            { label: 'ĐOẠN VĂN', value: paragraphs > 0 ? String(paragraphs) : '–' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{item.label}</p>
              <p className="text-xl font-bold tabular-nums text-gray-900">{item.value}</p>
            </div>
          ))}
          {params?.title && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-gray-400">"{params.title}"</p>
            </div>
          )}
        </div>
      </div>

      <div ref={streamBoxRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto min-h-[400px] max-w-3xl rounded-sm bg-white px-12 py-10 shadow-sm">
          {streamedText ? (
            <div className="article-body">
              <div dangerouslySetInnerHTML={{ __html: streamedText }} />
              {!redirecting && !isAllDone && (
                <span className="ml-0.5 inline-block h-5 w-2 animate-pulse rounded-sm bg-blue-500 align-middle" />
              )}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <p className="text-sm font-medium text-gray-600">
                {redirecting
                  ? 'Đang chuyển sang editor chuẩn...'
                  : !loading
                    ? 'Đang khởi động...'
                    : activeStep === 'writing'
                      ? '✍️ Writer đang chuyển đổi bài Facebook...'
                      : activeStep === 'seo'
                        ? '🔧 SEO Specialist đang tối ưu...'
                        : activeStep === 'editor'
                          ? '✅ Editor QC đang humanize...'
                          : '⏳ Đang xử lý...'}
              </p>
              <p className="mt-2 text-xs text-gray-400">Sau khi xong sẽ mở đúng editor chuẩn như /viet-theo-nguon/generate</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
        <button
          type="button"
          onClick={() => router.push('/viet-tu-facebook')}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
        >
          ← Quay lại
        </button>

        <div className="text-xs text-gray-400">
          {redirecting ? 'Đang mở editor chuẩn thống nhất...' : 'Page này chỉ là bước trung chuyển sang editor chuẩn hóa'}
        </div>

        <button
          type="button"
          disabled
          className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white opacity-60"
        >
          {redirecting ? 'Đang chuyển...' : 'Editor chuẩn sẽ mở tự động'}
        </button>
      </div>
    </div>
  );
}
