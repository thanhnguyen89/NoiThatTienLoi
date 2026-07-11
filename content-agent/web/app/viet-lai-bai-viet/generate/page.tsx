'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AICheckPanel from '@/app/components/AICheckPanel';
import { readSessionAICheckState, writeSessionAICheckState } from '@/lib/ai-check-persistence';
import { RichArticleEditor } from '@/components/editor/RichArticleEditor';
import { AiFloatingToolbar } from '@/components/editor/AiFloatingToolbar';
import { ExportMenu } from '@/components/editor/ExportMenu';
import { SeoPanel } from '@/components/editor/SeoPanel';
import { GeneratePanelTabs } from '@/components/generate/GeneratePanelTabs';
import { LinksPanel as GenerateLinksPanel } from '@/components/generate/LinksPanel';
import { PublishPanel as GeneratePublishPanel } from '@/components/generate/PublishPanel';
import { QualityPanel as GenerateQualityPanel } from '@/components/generate/QualityPanel';
import { HumannessPanel } from '@/components/tinh-gon/HumannessPanel';
import { KeywordDensityBar } from '@/components/tinh-gon/KeywordDensityBar';
import { buildSentenceTargets, type SentenceTarget } from '@/lib/dom-sentences';
import type { AICheckResult } from '@/lib/humanness/types';
import { computeSeoChecks } from '@/lib/shared/seo-checks';
import { UNIFIED_GENERATE_TABS, type GenerateTab } from '@/lib/shared/generate-tabs';
import { computeKeywordDensity, countWords, slugify } from '@/lib/tinh-gon/text';
import type { TinhGonDecision, TinhGonHumannessResult } from '@/lib/tinh-gon/types';
import type { AiAssistCommand } from '@/components/editor/AiAssistPanel';
import type { ArticleRewriteConfig, ArticleRewriteResult, ArticleSection } from '@/lib/viet-lai/types';

interface StreamEventPayload {
  type: 'step' | 'step_done' | 'chunk' | 'done' | 'error';
  step?: string;
  label?: string;
  text?: string;
  message?: string;
  data?: ArticleRewriteResult;
}

interface DbArticlePayload {
  id: string;
  runId: string;
  keyword: string;
  language: string;
  contentType: string;
  targetLength: number;
  aiProvider: string;
  brandConfig?: ArticleRewriteConfig['brandConfig'];
  outline?: {
    config?: ArticleRewriteConfig;
    sections?: ArticleSection[];
    aiCheck?: unknown;
  } | null;
  selectedTitle: string;
  htmlContent: string;
  wordCount: number;
  metaDescription?: string | null;
  slug?: string | null;
  humannessScore?: number | null;
  aiDecision?: TinhGonDecision | null;
  seoChecks?: { keywordDensity?: number } | null;
  scoreBreakdown?: { humanness?: TinhGonHumannessResult; keywordDensity?: number } | null;
}

function buildFallbackHumanness(score = 0, decision: TinhGonDecision = 'REVIEW'): TinhGonHumannessResult {
  return {
    score,
    decision,
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
    scoreBreakdown: {
      language_natural: 0,
      structure: 0,
      eeat_signals: 0,
      engagement: 0,
    },
  };
}

function buildResultSignature(
  result: ArticleRewriteResult | null,
  html: string,
  title: string,
  metaDescription: string,
  slug: string,
): string {
  if (!result) return '';

  return JSON.stringify({
    html,
    title,
    metaDescription,
    slug,
    wordCount: result.wordCount,
    keywordDensity: result.keywordDensity,
    humannessScore: result.humanness.score,
    humannessDecision: result.humanness.decision,
  });
}

type ReadinessPriority = 'high' | 'medium' | 'low';

interface PublishSignal {
  key: string;
  label: string;
  pass: boolean;
  detail: string;
  priority: ReadinessPriority;
}

interface PublishReadiness {
  score: number;
  status: 'ready' | 'review' | 'blocked';
  items: PublishSignal[];
  failed: PublishSignal[];
  highPriorityFailed: PublishSignal[];
}

const REWRITE_AI_COMMANDS: Array<{ value: AiAssistCommand; label: string }> = [
  { value: 'explain', label: 'Giải thích' },
  { value: 'title', label: 'Đặt tiêu đề' },
  { value: 'outline', label: 'Tạo outline' },
  { value: 'shorten', label: 'Rút ngắn' },
  { value: 'rewrite', label: 'Viết lại' },
  { value: 'humanize', label: 'Humanize' },
  { value: 'list', label: 'Thành danh sách' },
  { value: 'pros_cons', label: 'Ưu & Nhược điểm' },
  { value: 'intro', label: 'Viết mở bài' },
  { value: 'conclusion', label: 'Viết kết bài' },
  { value: 'faqs', label: 'Tạo FAQ' },
];

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase();
}

function countLinks(html: string, internalDomain = 'noithatminhquan.vn') {
  const rawDomain = internalDomain.replace(/^www\./, '');
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]);
  const internal = hrefs.filter((href) => href.startsWith('/') || href.includes(rawDomain)).length;
  const external = hrefs.filter((href) => /^https?:\/\//i.test(href) && !href.includes(rawDomain)).length;
  return { internal, external, total: hrefs.length };
}

function hasNormalizedText(text: string, needle: string): boolean {
  return normalizeSearchText(text).includes(normalizeSearchText(needle));
}

function buildPublishReadiness(input: {
  html: string;
  title: string;
  metaDescription: string;
  slug: string;
  keyword: string;
  humannessScore?: number | null;
  aiCheckResult?: AICheckResult | null;
}): PublishReadiness {
  const plainText = input.html.replace(/<[^>]+>/g, ' ');
  const wordCount = countWords(input.html);
  const links = countLinks(input.html);
  const hasSpecificData = /(\d+\s?(cm|mm|m2|m²|kg|%|năm|ngày|giờ)|\d{4}|₫|vnd|vnđ)/i.test(plainText);
  const keywordInTitle = hasNormalizedText(input.title, input.keyword);
  const keywordInSlug = normalizeSearchText(input.slug).replace(/[^a-z0-9]+/g, '-').includes(
    normalizeSearchText(input.keyword).replace(/[^a-z0-9]+/g, '-'),
  );
  const density = input.keyword ? computeKeywordDensity(input.html, input.keyword) : 0;
  const effectiveHumanness = input.aiCheckResult?.humannessScore ?? input.humannessScore ?? null;
  const aiCriticalFlags = input.aiCheckResult?.counts.criticalFlags ?? null;
  const aiBannedCount = input.aiCheckResult?.counts.bannedWordCount ?? null;
  const aiToneScore = input.aiCheckResult?.breakdown.toneConsistencyScore ?? null;

  const items: PublishSignal[] = [
    { key: 'title', label: 'Title có keyword và độ dài hợp lý', pass: keywordInTitle && input.title.length >= 40 && input.title.length <= 70, detail: `${input.title.length} ký tự`, priority: 'high' },
    { key: 'meta', label: 'Meta description 120-160 ký tự', pass: input.metaDescription.length >= 120 && input.metaDescription.length <= 160, detail: `${input.metaDescription.length} ký tự`, priority: 'high' },
    { key: 'slug', label: 'Slug chứa keyword', pass: input.slug.length <= 75 && keywordInSlug, detail: `${input.slug.length} ký tự`, priority: 'medium' },
    { key: 'length', label: 'Độ dài đạt ngưỡng tối thiểu', pass: wordCount >= 800, detail: `${wordCount.toLocaleString()}/800 từ`, priority: 'high' },
    { key: 'density', label: 'Mật độ từ khóa tự nhiên', pass: density >= 0.6 && density <= 1.5, detail: `${density}%`, priority: 'high' },
    { key: 'internal', label: 'Có internal link', pass: links.internal >= 1, detail: `${links.internal} internal link`, priority: 'high' },
    { key: 'external', label: 'Có nguồn/link ngoài đáng tin', pass: links.external >= 1, detail: `${links.external} external link`, priority: 'medium' },
    { key: 'eeat', label: 'Có số liệu/ngữ cảnh cụ thể', pass: hasSpecificData, detail: hasSpecificData ? 'Có dữ kiện cụ thể' : 'Nên thêm số liệu, năm, thông số', priority: 'medium' },
    { key: 'human', label: 'Giọng văn đủ tự nhiên', pass: effectiveHumanness != null && effectiveHumanness >= 76, detail: effectiveHumanness == null ? 'Chưa scan AI tab' : `${effectiveHumanness}/100`, priority: 'high' },
    { key: 'ai-banned', label: 'AI Check không còn từ cấm', pass: aiBannedCount != null && aiBannedCount === 0, detail: aiBannedCount == null ? 'Chưa scan AI tab' : `${aiBannedCount} từ cấm`, priority: 'high' },
    { key: 'ai-critical', label: 'AI Check không còn flag đỏ', pass: aiCriticalFlags != null && aiCriticalFlags === 0, detail: aiCriticalFlags == null ? 'Chưa scan AI tab' : `${aiCriticalFlags} flag đỏ`, priority: 'high' },
    { key: 'ai-tone', label: 'Tone consistency ổn định', pass: aiToneScore != null && aiToneScore >= 70, detail: aiToneScore == null ? 'Chưa scan AI tab' : `${aiToneScore}/100`, priority: 'medium' },
  ];

  const weight: Record<ReadinessPriority, number> = { high: 3, medium: 2, low: 1 };
  const total = items.reduce((sum, item) => sum + weight[item.priority], 0);
  const passed = items.reduce((sum, item) => sum + (item.pass ? weight[item.priority] : 0), 0);
  const score = Math.round((passed / total) * 100);
  const failed = items.filter((item) => !item.pass);
  const highPriorityFailed = failed.filter((item) => item.priority === 'high');
  return { score, status: highPriorityFailed.length > 0 ? 'blocked' : score >= 85 ? 'ready' : 'review', items, failed, highPriorityFailed };
}

function PublishReadinessCard({ readiness }: { readiness: PublishReadiness }) {
  const tone = readiness.status === 'ready'
    ? { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', label: 'Có thể đăng' }
    : readiness.status === 'blocked'
      ? { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Cần sửa trước' }
      : { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Nên rà soát' };
  const visibleIssues = readiness.failed.slice(0, 4);
  return (
    <div className={`rounded-2xl border p-4 ${tone.bg} ${tone.border}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-black ${tone.text}`}>Sẵn sàng đăng</p>
          <p className="mt-0.5 text-xs text-gray-500">{tone.label}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black ${tone.text}`}>{readiness.score}</p>
          <p className="text-[11px] font-semibold text-gray-400">/100</p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
        <div className={`h-full rounded-full ${readiness.status === 'ready' ? 'bg-green-500' : readiness.status === 'blocked' ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${readiness.score}%` }} />
      </div>
      {visibleIssues.length > 0 && (
        <div className="mt-4 space-y-2">
          {visibleIssues.map((item) => (
            <div key={item.key} className="rounded-xl bg-white/75 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{item.detail}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${item.priority === 'high' ? 'bg-red-100 text-red-700' : item.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {item.priority === 'high' ? 'Cao' : item.priority === 'medium' ? 'Vừa' : 'Thấp'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SeoScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Tốt' : score >= 60 ? 'Cần cải thiện' : 'Yếu';
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">SEO Score</span>
        <span className="text-sm font-bold" style={{ color }}>{score}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <p className="mt-1 text-xs" style={{ color }}>{label}</p>
    </div>
  );
}

export default function VietLaiBaiVietGeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get('runId');
  const previewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const persistedSignatureRef = useRef('');

  const [config, setConfig] = useState<ArticleRewriteConfig | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [runId, setRunId] = useState('');
  const [sections, setSections] = useState<ArticleSection[]>([]);
  const [originalWordCount, setOriginalWordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState('');
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState<ArticleRewriteResult | null>(null);
  const [editorHtml, setEditorHtml] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editMetaDescription, setEditMetaDescription] = useState('');
  const [wordCountLive, setWordCountLive] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [activeTab, setActiveTab] = useState<GenerateTab>('seo');
  const [slugEdited, setSlugEdited] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [publishedUrl, setPublishedUrl] = useState('');
  const [aiEditing, setAiEditing] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarX, setToolbarX] = useState(0);
  const [toolbarY, setToolbarY] = useState(0);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [aiCheckResult, setAiCheckResult] = useState<AICheckResult | null>(null);

  const autoSlug = useMemo(() => slugify(editTitle), [editTitle]);
  const activeSlug = slugEdited ? customSlug : autoSlug;
  const currentHtml = editorHtml || result?.html || '';
  const currentWordCount = wordCountLive || result?.wordCount || countWords(currentHtml);
  const currentKeywordDensity = config?.keyword ? computeKeywordDensity(currentHtml, config.keyword) : 0;
  const currentHumanness = result?.humanness ?? null;
  const seoScore = useMemo(() => {
    if (!config) return 0;
    return computeSeoChecks({
      title: editTitle,
      metaDescription: editMetaDescription,
      html: currentHtml,
      wordCount: currentWordCount,
      keyword: config.keyword,
      secondaryKeywords: [],
      slug: activeSlug,
      minWordCount: 800,
    }).score;
  }, [activeSlug, config, currentHtml, currentWordCount, editMetaDescription, editTitle]);
  const aiCheckStorageKey = useMemo(
    () => (runId ? `aicheck:source:${runId}` : undefined),
    [runId],
  );
  const effectiveHumannessScore = aiCheckResult?.humannessScore ?? currentHumanness?.score ?? null;
  const publishReadiness = useMemo(
    () => buildPublishReadiness({
      html: currentHtml,
      title: editTitle,
      metaDescription: editMetaDescription,
      slug: activeSlug,
      keyword: config?.keyword || '',
      humannessScore: currentHumanness?.score ?? null,
      aiCheckResult,
    }),
    [activeSlug, aiCheckResult, config?.keyword, currentHumanness?.score, currentHtml, editMetaDescription, editTitle],
  );
  const resultSignature = useMemo(
    () => buildResultSignature(result, editorHtml, editTitle, editMetaDescription, activeSlug),
    [activeSlug, editMetaDescription, editTitle, editorHtml, result],
  );

  useEffect(() => {
    document.title = 'Generate Viết Lại Bài Viết - Content Agent';
    void bootstrap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runIdParam]);

  useEffect(() => {
    if (!previewRef.current || !config) return;
    previewRef.current.innerHTML = `
      <article class="prose prose-sm max-w-none">
        ${config.originalTitle ? `<h1>${escapeHtml(config.originalTitle)}</h1>` : ''}
        ${sections.map((section) => `
          <section>
            ${section.headingHtml || ''}
            ${section.bodyHtml || ''}
          </section>
        `).join('')}
      </article>
    `;
  }, [config, sections]);

  useEffect(() => {
    function handleSelection() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setSelectedText('');
        setToolbarVisible(false);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!editorShellRef.current?.contains(range.commonAncestorContainer)) {
        setSelectedText('');
        setToolbarVisible(false);
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        setSelectedText('');
        setToolbarVisible(false);
        return;
      }

      const rect = range.getBoundingClientRect();
      selectionRangeRef.current = range.cloneRange();
      setSelectedText(text);
      setToolbarX(rect.left + rect.width / 2);
      setToolbarY(Math.max(16, rect.top - 12));
      setToolbarVisible(true);
    }

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  useEffect(() => {
    if (!articleId || !result || !config || loading) return;
    if (resultSignature === persistedSignatureRef.current) return;

    const timer = setTimeout(() => {
      void saveDraft(false);
    }, 1200);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, config, loading, result, resultSignature]);

  async function bootstrap() {
    const storedConfig = sessionStorage.getItem('vl_config');
    const storedArticleId = sessionStorage.getItem('vl_article_id');
    const storedRunId = sessionStorage.getItem('vl_run_id');
    const storedSections = sessionStorage.getItem('vl_sections');
    const storedOriginalWc = sessionStorage.getItem('vl_original_wc');
    const storedResult = sessionStorage.getItem('vl_result');

    if (runIdParam || !storedConfig || !storedArticleId || !storedRunId) {
      const targetRunId = runIdParam || storedRunId;
      if (!targetRunId) {
        router.replace('/viet-lai-bai-viet');
        return;
      }

      await loadFromDatabase(targetRunId);
      return;
    }

    try {
      const nextConfig = JSON.parse(storedConfig) as ArticleRewriteConfig;
      const nextSections = storedSections ? JSON.parse(storedSections) as ArticleSection[] : [];
      const nextOriginalWc = storedOriginalWc ? Number(storedOriginalWc) : 0;

      setConfig(nextConfig);
      setArticleId(storedArticleId);
      setRunId(storedRunId);
      setSections(nextSections);
      setOriginalWordCount(nextOriginalWc);

      if (storedResult) {
        const parsedResult = JSON.parse(storedResult) as ArticleRewriteResult;
        if (parsedResult.runId === storedRunId) {
          applyLoadedResult(parsedResult, parsedResult.title, parsedResult.metaDescription, null);
          setLoading(false);
          return;
        }
      }

      await startGeneration(nextConfig, nextSections, storedRunId, storedArticleId);
    } catch {
      router.replace('/viet-lai-bai-viet');
    }
  }

  function applyLoadedResult(
    nextResult: ArticleRewriteResult,
    title: string,
    metaDescription: string,
    slug: string | null,
  ) {
    setResult(nextResult);
    setEditorHtml(nextResult.html);
    setEditTitle(title);
    setEditMetaDescription(metaDescription);
    setWordCountLive(nextResult.wordCount);
    setActiveTab('seo');
    if (slug) {
      setCustomSlug(slug);
      setSlugEdited(true);
    } else {
      setCustomSlug('');
      setSlugEdited(false);
    }
    persistedSignatureRef.current = buildResultSignature(
      nextResult,
      nextResult.html,
      title,
      metaDescription,
      slug || slugify(title),
    );
  }

  async function loadFromDatabase(targetRunId: string) {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/articles/by-runid/${encodeURIComponent(targetRunId)}`);
      const payload = await response.json() as { success?: boolean; error?: string; data?: DbArticlePayload };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Không thể tải draft từ database');
      }

      const article = payload.data;
      const nextConfig: ArticleRewriteConfig = article.outline?.config ?? DEFAULT_DB_CONFIG(article);
      const nextSections = article.outline?.sections ?? [];

      sessionStorage.setItem('vl_config', JSON.stringify(nextConfig));
      sessionStorage.setItem('vl_run_id', article.runId);
      sessionStorage.setItem('vl_article_id', article.id);
      sessionStorage.setItem('vl_sections', JSON.stringify(nextSections));

      setConfig(nextConfig);
      setArticleId(article.id);
      setRunId(article.runId);
      setSections(nextSections);
      setOriginalWordCount(article.targetLength || 0);
      writeSessionAICheckState(article.runId ? `aicheck:source:${article.runId}` : undefined, article.outline?.aiCheck);

      if (article.htmlContent) {
        const restoredResult: ArticleRewriteResult = {
          runId: article.runId,
          html: article.htmlContent,
          title: article.selectedTitle,
          metaDescription: article.metaDescription || '',
          wordCount: article.wordCount || countWords(article.htmlContent),
          keywordDensity:
            article.seoChecks?.keywordDensity ??
            article.scoreBreakdown?.keywordDensity ??
            computeKeywordDensity(article.htmlContent, nextConfig.keyword),
          humanness:
            article.scoreBreakdown?.humanness ??
            buildFallbackHumanness(
              article.humannessScore || 0,
              article.aiDecision || (article.humannessScore && article.humannessScore >= 76 ? 'PUBLISH' : 'REVIEW'),
            ),
          originalWordCount: article.targetLength || 0,
        };

        applyLoadedResult(restoredResult, article.selectedTitle, article.metaDescription || '', article.slug || null);
        sessionStorage.setItem('vl_result', JSON.stringify(restoredResult));
        setLoading(false);
        return;
      }

      await startGeneration(nextConfig, nextSections, article.runId, article.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải draft');
      setLoading(false);
    }
  }

  async function startGeneration(
    currentConfig: ArticleRewriteConfig,
    currentSections: ArticleSection[],
    currentRunId: string,
    currentArticleId: string,
  ) {
    setLoading(true);
    setError('');
    setStreamText('');
    setResult(null);
    setEditorHtml('');
    setEditTitle(currentConfig.keyword || currentConfig.originalTitle || 'Viết lại bài viết');
    setEditMetaDescription('');
    setWordCountLive(0);
    setPublishedUrl('');
    setActiveTab('links');

    try {
      const response = await fetch('/api/viet-lai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: currentArticleId,
          runId: currentRunId,
          config: currentConfig,
          sections: currentSections,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json() as { error?: string };
        throw new Error(payload.error || 'Không thể bắt đầu stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const line = event
            .split('\n')
            .map((item) => item.trim())
            .find((item) => item.startsWith('data: '));

          if (!line) continue;
          const payload = JSON.parse(line.slice(6)) as StreamEventPayload;

          if (payload.type === 'chunk' && payload.text) {
            setStreamText((prev) => prev + payload.text);
          }

          if (payload.type === 'error') {
            throw new Error(payload.message || 'AI stream lỗi');
          }

          if (payload.type === 'done' && payload.data) {
            applyLoadedResult(payload.data, payload.data.title, payload.data.metaDescription, null);
            sessionStorage.setItem('vl_result', JSON.stringify(payload.data));
            setLoading(false);
          }
        }
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạo bài');
      setLoading(false);
    }
  }

  function handleEditorChange(html: string) {
    if (!config) return;
    const nextWordCount = countWords(html);
    const nextDensity = computeKeywordDensity(html, config.keyword);
    setEditorHtml(html);
    setWordCountLive(nextWordCount);
    setResult((prev) => (
      prev
        ? {
            ...prev,
            html,
            wordCount: nextWordCount,
            keywordDensity: nextDensity,
          }
        : prev
    ));
  }

  function replaceSentenceTarget(target: SentenceTarget | undefined, replacement: string): boolean {
    if (!target || !contentRef.current) return false;

    const range = target.range.cloneRange();
    if (!contentRef.current.contains(range.commonAncestorContainer)) {
      return false;
    }

    const fragment = range.createContextualFragment(replacement);
    range.deleteContents();
    range.insertNode(fragment);
    handleEditorChange(contentRef.current.innerHTML);
    return true;
  }

  async function saveDraft(createVersion: boolean) {
    if (!articleId || !result || !config) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/articles/${articleId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: config.keyword,
          language: config.language,
          contentType: `viet_lai:${config.method}`,
          targetLength: originalWordCount || countWords(config.originalHtml),
          aiProvider: config.model,
          brandConfig: config.brandConfig,
          outline: {
            flow: 'viet_lai',
            stage: 'generate',
            method: config.method,
            style: config.style,
            aiCheck: readSessionAICheckState(runId ? `aicheck:source:${runId}` : undefined),
            config,
            sections,
          },
          selectedTitle: editTitle,
          htmlContent: editorHtml,
          metaDescription: editMetaDescription,
          slug: activeSlug || undefined,
          wordCount: currentWordCount,
          seoChecks: { keywordDensity: currentKeywordDensity },
          humannessScore: result.humanness.score,
          scoreBreakdown: { humanness: result.humanness, keywordDensity: currentKeywordDensity },
          status: 'WRITTEN',
          aiDecision: result.humanness.decision,
          createVersion,
        }),
      });

      const payload = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Không thể lưu draft');
      }

      const updated: ArticleRewriteResult = {
        ...result,
        html: editorHtml,
        title: editTitle,
        metaDescription: editMetaDescription,
        wordCount: currentWordCount,
        keywordDensity: currentKeywordDensity,
      };

      setResult(updated);
      sessionStorage.setItem('vl_result', JSON.stringify(updated));
      persistedSignatureRef.current = buildResultSignature(updated, editorHtml, editTitle, editMetaDescription, activeSlug);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể lưu draft');
    } finally {
      setSaving(false);
    }
  }

  function getSentenceTargets() {
    if (!contentRef.current) return [] as SentenceTarget[];
    return buildSentenceTargets(contentRef.current);
  }

  function applyAICheckFix(original: string, replacement: string, _sentenceIndex?: number, target?: SentenceTarget) {
    if (replaceSentenceTarget(target, replacement)) {
      setBanner({ tone: 'success', text: 'Đã áp dụng gợi ý AI Check vào bài viết.' });
      return;
    }

    const current = editorHtml;
    const next = current.replace(original, replacement);
    if (next !== current) {
      handleEditorChange(next);
      setBanner({ tone: 'success', text: 'Đã áp dụng gợi ý AI Check vào bài viết.' });
    }
  }

  async function runAiAssistCommand(command: AiAssistCommand, text = selectedText.trim()): Promise<string> {
    if (!config || (!text && command !== 'intro' && command !== 'conclusion')) return '';

    const response = await fetch('/api/editor/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command,
        text: text || config.keyword,
        keyword: config.keyword,
        model: config.model,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Không thể gọi AI assist.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const line = event.split('\n').map((item) => item.trim()).find((item) => item.startsWith('data: '));
        if (!line) continue;
        const payload = JSON.parse(line.slice(6)) as { text?: string };
        if (payload.text) finalText += payload.text;
      }
    }

    return finalText.trim();
  }

  async function handleAiEditCommand(command: AiAssistCommand) {
    if (!selectedText.trim() || aiEditing) return;
    setAiEditing(true);
    setToolbarVisible(false);
    setBanner(null);

    try {
      const assistedHtml = await runAiAssistCommand(command);
      if (!assistedHtml) throw new Error('AI không trả về nội dung.');

      const range = selectionRangeRef.current;
      const editorNode = editorShellRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null;
      if (range && editorNode) {
        const fragment = range.createContextualFragment(assistedHtml);
        range.deleteContents();
        range.insertNode(fragment);
        handleEditorChange(editorNode.innerHTML);
      } else {
        const current = editorHtml;
        const next = current.replace(selectedText, assistedHtml);
        if (next === current) throw new Error('Không tìm thấy đoạn đã chọn trong HTML hiện tại.');
        handleEditorChange(next);
      }

      setBanner({ tone: 'success', text: 'AI đã cập nhật đoạn văn đang chọn.' });
      window.getSelection()?.removeAllRanges();
    } catch (requestError) {
      setBanner({
        tone: 'error',
        text: requestError instanceof Error ? requestError.message : 'Không thể xử lý AI inline.',
      });
    } finally {
      setAiEditing(false);
    }
  }

  async function handleFlagAiRewrite(snippet: string, flagLabel: string, target?: SentenceTarget) {
    if (!snippet.trim() || aiEditing) return;
    setAiEditing(true);
    setToolbarVisible(false);
    setBanner(null);

    try {
      const assistedHtml = await runAiAssistCommand('humanize', snippet);
      if (!assistedHtml) throw new Error('AI không trả về nội dung.');

      if (target && replaceSentenceTarget(target, assistedHtml)) {
        setBanner({ tone: 'success', text: `Đã viết lại câu flag: ${flagLabel}.` });
        return;
      }

      const current = editorHtml;
      const next = current.replace(snippet, assistedHtml);
      if (next === current) throw new Error('Không tìm thấy câu cần viết lại trong HTML hiện tại.');
      handleEditorChange(next);
      setBanner({ tone: 'success', text: `Đã viết lại câu flag: ${flagLabel}.` });
    } catch (requestError) {
      setBanner({
        tone: 'error',
        text: requestError instanceof Error ? requestError.message : 'Không thể viết lại câu.',
      });
    } finally {
      setAiEditing(false);
    }
  }

  if (loading && !result) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-lg font-semibold text-gray-800">Đang viết lại bài...</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-md">
            AI đang đọc các section của bài gốc và tạo phiên bản mới theo phương pháp bạn đã chọn.
          </p>
          {streamText && (
            <div className="mt-4 max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg p-4 text-left text-xs text-gray-500 max-h-56 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans">{streamText}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!config || !articleId || !result) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-3">{error || 'Không có dữ liệu để hiển thị.'}</p>
          <button
            type="button"
            onClick={() => router.push('/viet-lai-bai-viet')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại cấu hình
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Viết Lại Bài Viết</p>
          <h1 className="text-xl font-bold text-gray-900 truncate">{editTitle || config.keyword || config.originalTitle}</h1>
          <p className="text-xs text-gray-500 mt-1">
            Gốc {originalWordCount.toLocaleString()} từ · Bản mới {currentWordCount.toLocaleString()} từ · Density {currentKeywordDensity.toFixed(2)}%
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => void saveDraft(true)}
            disabled={saving}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : savedFlash ? 'Đã lưu' : 'Lưu draft'}
          </button>
          <ExportMenu articleId={articleId} html={editorHtml} title={editTitle} />
          <button
            type="button"
            onClick={() => setActiveTab('publish')}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Đăng bài
          </button>
        </div>
      </div>

      {banner && (
        <div className={`border-b px-6 py-3 text-sm ${
          banner.tone === 'success'
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {banner.text}
        </div>
      )}

      <div ref={contentRef} className="hidden" aria-hidden dangerouslySetInnerHTML={{ __html: currentHtml }} />

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="border-r border-gray-200 bg-white min-h-0 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-800">Bài gốc</h2>
              <p className="text-xs text-gray-500 mt-1">
                Method: {config.method} · Style: {config.style}
              </p>
            </div>
            <div ref={previewRef} className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none" />
          </div>

          <div className="bg-white min-h-0 flex flex-col">
            <div ref={editorShellRef} className="flex-1 min-h-0">
              <RichArticleEditor
                html={editorHtml}
                wordCount={currentWordCount}
                keyword={config.keyword}
                articleTitle={editTitle}
                fullWidth
                onChange={handleEditorChange}
                onSave={() => void saveDraft(true)}
                onNewArticle={() => router.push('/viet-lai-bai-viet')}
              />
            </div>
          </div>
        </div>

        <aside className="hidden xl:flex w-[420px] shrink-0 border-l border-gray-200 bg-white flex-col">
          <GeneratePanelTabs value={activeTab} onChange={setActiveTab} tabs={UNIFIED_GENERATE_TABS} />

          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeTab === 'seo' && (
              <div className="p-4 space-y-4">
                <PublishReadinessCard readiness={publishReadiness} />
                <SeoScoreBar score={seoScore} />
                <KeywordDensityBar density={Number(currentKeywordDensity.toFixed(2))} />
                <HumannessPanel
                  score={effectiveHumannessScore ?? null}
                  decision={currentHumanness?.decision ?? null}
                  issues={currentHumanness?.issues ?? []}
                  forbiddenFound={currentHumanness?.forbiddenFound ?? []}
                />
                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 text-xs text-gray-500">
                  <p>Keyword: <span className="text-gray-700">{config.keyword}</span></p>
                  <p>Method: <span className="text-gray-700">{config.method}</span></p>
                  <p>Style: <span className="text-gray-700">{config.style}</span></p>
                  <p>Số từ gốc: <span className="text-gray-700">{originalWordCount.toLocaleString()}</span></p>
                </div>
                <div className="h-[42rem] rounded-xl border border-gray-200 overflow-hidden">
                  <SeoPanel
                    html={editorHtml}
                    keyword={config.keyword}
                    title={editTitle}
                    metaDescription={editMetaDescription}
                    slug={activeSlug}
                    onMetaChange={(field, value) => {
                      if (field === 'title') setEditTitle(value);
                      else setEditMetaDescription(value);
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="p-4 space-y-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-blue-900">Mục tiêu kiểm tra AI</p>
                      <p className="mt-1 text-xs leading-5 text-blue-700">
                        Trước khi đăng: AI risk thấp, không còn câu DANGER, có dữ kiện cụ thể và câu văn không đều nhịp.
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                      publishReadiness.status === 'ready'
                        ? 'bg-green-100 text-green-700'
                        : publishReadiness.status === 'blocked'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {publishReadiness.score}/100
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-bold text-gray-800">AI chỉnh theo vùng chọn</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedText.trim()
                      ? `Đã chọn ${selectedText.length} ký tự để AI chỉnh.`
                      : 'Bôi đen đoạn văn ngay trong editor bên trái rồi chọn lệnh AI chỉnh.'}
                  </p>
                  {selectedText.trim() && (
                    <div className="mt-3 max-h-24 overflow-y-auto rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
                      {selectedText}
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {REWRITE_AI_COMMANDS.map((command) => (
                      <button
                        key={command.value}
                        type="button"
                        onClick={() => void handleAiEditCommand(command.value)}
                        disabled={!selectedText.trim() || aiEditing}
                        className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {aiEditing ? 'Đang xử lý...' : command.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <AICheckPanel
                    html={editorHtml}
                    onApplyFix={applyAICheckFix}
                    storageKey={aiCheckStorageKey}
                    getSentenceTargets={getSentenceTargets}
                    onResultChange={setAiCheckResult}
                    onAiRewrite={handleFlagAiRewrite}
                  />
                </div>
              </div>
            )}

            {activeTab === 'quality' && (
              <div className="p-4 space-y-4">
                <GenerateQualityPanel
                  humannessScore={effectiveHumannessScore ?? 0}
                  decision={currentHumanness?.decision ?? 'REVIEW'}
                  issues={publishReadiness.failed.slice(0, 4).map((item) => `${item.label}: ${item.detail}`)}
                  forbiddenFound={currentHumanness?.forbiddenFound ?? []}
                  summaryTitle="SEO nhanh"
                  summaryItems={[
                    {
                      label: 'Mật độ từ khóa',
                      value: `${currentKeywordDensity.toFixed(2)}%`,
                      tone: currentKeywordDensity >= 0.6 && currentKeywordDensity <= 1.5 ? 'good' : 'warn',
                    },
                    {
                      label: 'Độ dài',
                      value: `${currentWordCount.toLocaleString()} từ`,
                      tone: currentWordCount >= 800 ? 'good' : 'warn',
                    },
                  ]}
                >
                  <div className="mt-4">
                    <PublishReadinessCard readiness={publishReadiness} />
                  </div>
                </GenerateQualityPanel>
              </div>
            )}

            {activeTab === 'links' && (
              <GenerateLinksPanel
                cards={[
                  {
                    key: 'source',
                    title: 'Bài gốc',
                    body: (
                      <div className="space-y-3 text-sm text-gray-500">
                        <p><span className="font-semibold text-gray-800">Tiêu đề gốc:</span> {config.originalTitle || 'Không có'}</p>
                        <div>
                          <p className="mb-1 font-semibold text-gray-800">Sections đã parse</p>
                          <div className="space-y-2">
                            {sections.map((section, index) => (
                              <div key={`${section.headingText}-${index}`} className="rounded-lg border border-gray-100 p-3 bg-gray-50">
                                <p className="text-xs font-semibold text-gray-700">
                                  {section.headingLevel ? section.headingLevel.toUpperCase() : 'BODY'} {section.headingText ? `· ${section.headingText}` : ''}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-4">
                                  {section.bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Không có body riêng'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'link-status',
                    title: 'Trạng thái link trong bài',
                    body: (
                      <div className="space-y-2 text-sm text-gray-500">
                        <p>{countLinks(editorHtml).internal} internal link</p>
                        <p>{countLinks(editorHtml).external} external link</p>
                      </div>
                    ),
                  },
                ]}
              />
            )}

            {activeTab === 'publish' && (
              <GeneratePublishPanel
                articleId={articleId}
                keyword={config.keyword}
                title={editTitle}
                metaDescription={editMetaDescription}
                slug={activeSlug}
                wordCount={currentWordCount}
                seoScore={seoScore}
                onTitleChange={setEditTitle}
                onMetaDescriptionChange={setEditMetaDescription}
                onSlugChange={(value) => {
                  setSlugEdited(true);
                  setCustomSlug(value);
                }}
                onCopyHtml={() => void navigator.clipboard.writeText(editorHtml)}
                onSaveDraft={() => saveDraft(true)}
                onPublished={(link) => setPublishedUrl(link)}
              />
            )}

            {activeTab === 'images' && (
              <div className="p-4">
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
                  <p className="text-sm font-bold text-gray-700">Thư viện hình ảnh</p>
                  <p className="mt-1 text-xs text-gray-400">Đang phát triển</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {publishedUrl && (
        <div className="px-6 py-3 bg-green-50 border-t border-green-200 text-sm text-green-700">
          Đã publish: <a href={publishedUrl} target="_blank" rel="noreferrer" className="underline">{publishedUrl}</a>
        </div>
      )}

      <AiFloatingToolbar
        visible={toolbarVisible}
        x={toolbarX}
        y={toolbarY}
        disabled={aiEditing}
        onCommand={(command) => void handleAiEditCommand(command)}
      />
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function DEFAULT_DB_CONFIG(article: DbArticlePayload): ArticleRewriteConfig {
  return {
    originalHtml: '',
    originalTitle: article.selectedTitle || article.keyword,
    keyword: article.keyword,
    seoMode: true,
    method: article.contentType.startsWith('viet_lai:') ? (article.contentType.slice('viet_lai:'.length) as ArticleRewriteConfig['method']) : 'keep_headings',
    style: 'standard',
    language: article.language,
    mainKeywordUrl: '',
    additionalLinks: [],
    appendContent: '',
    autoBold: 'none',
    model: article.aiProvider,
    brandConfig: article.brandConfig,
  };
}
