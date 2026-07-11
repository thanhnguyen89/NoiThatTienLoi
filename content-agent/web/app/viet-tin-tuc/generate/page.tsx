'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import AICheckPanel from '@/app/components/AICheckPanel';
import { RichArticleEditor } from '@/components/editor/RichArticleEditor';
import { GeneratePanelTabs } from '@/components/generate/GeneratePanelTabs';
import { PublishPanel as GeneratePublishPanel } from '@/components/generate/PublishPanel';
import { readSessionAICheckState, writeSessionAICheckState } from '@/lib/ai-check-persistence';
import { HumannessPanel } from '@/components/tinh-gon/HumannessPanel';
import { InternalLinkSuggest } from '@/components/tinh-gon/InternalLinkSuggest';
import { KeywordDensityBar } from '@/components/tinh-gon/KeywordDensityBar';
import { buildSentenceTargets, type SentenceTarget } from '@/lib/dom-sentences';
import { computeSeoChecks as computeSeoChecksShared } from '@/lib/shared/seo-checks';
import { fitSeoSlugLength, fitSeoTitleLength, stripInlineHtml } from '@/lib/shared/seo-title-fix';
import { UNIFIED_GENERATE_TABS } from '@/lib/shared/generate-tabs';
import { computeKeywordDensity, countWords, slugify } from '@/lib/tinh-gon/text';
import type {
  TinhGonDecision,
  TinhGonEditCommand,
  TinhGonHumannessResult,
  TinhGonInternalLinkSuggestion,
} from '@/lib/tinh-gon/types';
import { normalizeNewsConfig, type NewsConfig, type NewsItem, type NewsStreamResult } from '@/lib/viet-tin-tuc/types';

interface StreamEventPayload {
  type: 'step' | 'step_done' | 'chunk' | 'done' | 'error';
  step?: string;
  label?: string;
  text?: string;
  message?: string;
  data?: NewsStreamResult;
}

interface DbArticlePayload {
  id: string;
  runId: string;
  keyword: string;
  language: string;
  contentType: string;
  targetLength: number;
  aiProvider: string;
  brandConfig?: NewsConfig['brandConfig'];
  outline?: {
    config?: NewsConfig;
    structure?: string;
    tone?: string;
    sources?: NewsItem[];
    aiCheck?: unknown;
  } | null;
  selectedTitle: string;
  userNotes?: string | null;
  secondaryKeywords?: string[];
  htmlContent: string;
  wordCount: number;
  metaDescription?: string | null;
  slug?: string | null;
  humannessScore?: number | null;
  aiDecision?: TinhGonDecision | null;
  seoChecks?: { keywordDensity?: number } | null;
  scoreBreakdown?: { humanness?: TinhGonHumannessResult; keywordDensity?: number } | null;
}

interface SeoCheck {
  label: string;
  pass: boolean;
  fixable?: boolean;
  detail?: string;
  group: 'basic' | 'advanced' | 'title';
}

const AI_EDIT_COMMANDS: Array<{ value: TinhGonEditCommand; label: string }> = [
  { value: 'shorten', label: 'Rút gọn' },
  { value: 'expand', label: 'Mở rộng' },
  { value: 'humanize', label: 'Tự nhiên hơn' },
  { value: 'more_spec', label: 'Thêm chi tiết' },
  { value: 'stronger_cta', label: 'CTA mạnh hơn' },
  { value: 'rewrite', label: 'Viết lại đoạn' },
];

function parseNewsStructure(contentType: string): NewsConfig['structure'] {
  const raw = contentType.startsWith('viet_tin_tuc:') ? contentType.slice('viet_tin_tuc:'.length) : '';
  const allowed: NewsConfig['structure'][] = [
    'auto',
    'inverted_pyramid',
    'storytelling',
    'qa',
    'how_to',
    'pro_con',
    'historical',
    'listicle',
    'profile',
    'review',
  ];

  return allowed.includes(raw as NewsConfig['structure']) ? (raw as NewsConfig['structure']) : 'auto';
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
  result: NewsStreamResult | null,
  html: string,
  title: string,
  metaDescription: string,
  slug: string,
  secondaryKeywords: string[],
): string {
  if (!result) return '';

  return JSON.stringify({
    html,
    title,
    metaDescription,
    slug,
    secondaryKeywords,
    wordCount: result.wordCount,
    keywordDensity: result.keywordDensity,
    humannessScore: result.humanness.score,
    humannessDecision: result.humanness.decision,
  });
}

function computeSeoChecks(
  title: string,
  metaDescription: string,
  html: string,
  wordCount: number,
  keyword: string,
  secondaryKeywords: string[],
  slug: string,
  sourceCount: number,
): { checks: SeoCheck[]; score: number } {
  return computeSeoChecksShared({
    title,
    metaDescription,
    html,
    wordCount,
    keyword,
    secondaryKeywords,
    sourceCount,
    variant: 'news',
    slug,
    minWordCount: 400,
  });
}

function SeoScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Tốt' : score >= 60 ? 'Cần cải thiện' : 'Yếu';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-700">Điểm SEO</span>
        <span className="text-sm font-bold" style={{ color }}>{score}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs mt-1" style={{ color }}>{label}</p>
    </div>
  );
}

export default function VietTinTucGeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get('runId');

  const contentRef = useRef<HTMLDivElement | null>(null);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const persistedSignatureRef = useRef('');
  const savedRangeRef = useRef<Range | null>(null);
  const recheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const fontBtnRef = useRef<HTMLButtonElement>(null);
  const paragraphBtnRef = useRef<HTMLButtonElement>(null);
  const tableBtnRef = useRef<HTMLButtonElement>(null);

  const [config, setConfig] = useState<NewsConfig | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [runId, setRunId] = useState('');
  const [sources, setSources] = useState<NewsItem[]>([]);
  const [internalLinks, setInternalLinks] = useState<TinhGonInternalLinkSuggestion[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState('');
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState<NewsStreamResult | null>(null);
  const [editorHtml, setEditorHtml] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editMetaDescription, setEditMetaDescription] = useState('');
  const [wordCountLive, setWordCountLive] = useState(0);
  const [selectionLabel, setSelectionLabel] = useState('');
  const [aiEditing, setAiEditing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [sideTab, setSideTab] = useState<'seo' | 'ai' | 'quality' | 'links' | 'publish' | 'images'>('seo');
  const [recheckPending, setRecheckPending] = useState(false);
  const [fixingTitleLength, setFixingTitleLength] = useState(false);
  const [fixingSlugLength, setFixingSlugLength] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [editingSlug, setEditingSlug] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [newKw, setNewKw] = useState('');
  const [openBasic, setOpenBasic] = useState(true);
  const [openAdvanced, setOpenAdvanced] = useState(true);
  const [openTitle, setOpenTitle] = useState(true);
  const [fixingInternal, setFixingInternal] = useState(false);
  const [internalUrl, setInternalUrl] = useState('');
  const [internalText, setInternalText] = useState('');
  const [fixingExternal, setFixingExternal] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalText, setExternalText] = useState('');
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState('14px');
  const [colorDropPos, setColorDropPos] = useState({ top: 0, left: 0 });
  const [fontDropPos, setFontDropPos] = useState({ top: 0, left: 0 });
  const [paragraphDropPos, setParagraphDropPos] = useState({ top: 0, left: 0 });
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourceCode, setSourceCode] = useState('');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findCount, setFindCount] = useState<number | null>(null);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [findInSel, setFindInSel] = useState(false);
  const [showFindOpts, setShowFindOpts] = useState(false);
  const [showImgModal, setShowImgModal] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const [imgAlt, setImgAlt] = useState('');
  const [imgTitle, setImgTitle] = useState('');
  const [imgWidth, setImgWidth] = useState('');
  const [imgHeight, setImgHeight] = useState('');
  const [imgModalTab, setImgModalTab] = useState<'general' | 'upload'>('general');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkTarget, setLinkTarget] = useState('_self');
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableGridSize, setTableGridSize] = useState({ rows: 0, cols: 0 });
  const [tableDropPos, setTableDropPos] = useState({ top: 0, left: 0 });
  const [hasHighlights, setHasHighlights] = useState(false);
  const [fixingDensity, setFixingDensity] = useState(false);
  const [showSerp, setShowSerp] = useState(true);
  const [fieldHighlights, setFieldHighlights] = useState<{ title: boolean; slug: boolean; meta: boolean }>({
    title: false,
    slug: false,
    meta: false,
  });

  const autoSlug = useMemo(() => slugify(editTitle), [editTitle]);
  const activeSlug = slugEdited ? customSlug : autoSlug;
  const siteUrl = 'noithatminhquan.vn';
  const currentHtml = editorHtml || result?.html || '';
  const currentWordCount = wordCountLive || result?.wordCount || countWords(currentHtml);
  const seoData = useMemo(
    () => (config
      ? computeSeoChecks(
          editTitle,
          editMetaDescription,
          currentHtml,
          currentWordCount,
          config.keyword,
          config.secondaryKeywords,
          activeSlug,
          sources.length,
        )
      : { checks: [], score: 0 }),
    [activeSlug, config, currentHtml, currentWordCount, editMetaDescription, editTitle, sources.length],
  );
  const humannessBreakdown = useMemo(
    () => result?.humanness.scoreBreakdown ?? {
      language_natural: 0,
      structure: 0,
      eeat_signals: 0,
      engagement: 0,
    },
    [result?.humanness],
  );
  const resultSignature = useMemo(
    () => buildResultSignature(result, editorHtml, editTitle, editMetaDescription, activeSlug, config?.secondaryKeywords || []),
    [activeSlug, config?.secondaryKeywords, editMetaDescription, editTitle, editorHtml, result],
  );

  useEffect(() => {
    document.title = 'Tạo bài tin tức - Content Agent';
    void bootstrap();
    return () => {
      if (recheckTimerRef.current) clearTimeout(recheckTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runIdParam]);

  useEffect(() => {
    if (!showColorPicker && !showFontSizeMenu && !formatMenuOpen && !showTableMenu) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-toolbar-dropdown]')) {
        setShowColorPicker(false);
        setShowFontSizeMenu(false);
        setFormatMenuOpen(false);
        setShowTableMenu(false);
        setOpenSubmenu(null);
        setTableGridSize({ rows: 0, cols: 0 });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker, showFontSizeMenu, formatMenuOpen, showTableMenu]);

  useEffect(() => {
    contentRef.current = (editorShellRef.current?.querySelector('[contenteditable="true"]') as HTMLDivElement | null) ?? null;
  }, [editorHtml, loading]);

  useEffect(() => {
    const handleSelectionChange = () => {
      captureSelection();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!articleId || !result || !config || loading) return;
    if (resultSignature === persistedSignatureRef.current) return;

    const timer = setTimeout(() => {
      void saveDraft(false);
    }, 1500);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, config, loading, result, resultSignature]);

  async function bootstrap() {
    const storedConfig = sessionStorage.getItem('vtt_config');
    const storedArticleId = sessionStorage.getItem('vtt_article_id');
    const storedRunId = sessionStorage.getItem('vtt_run_id');
    const storedSources = sessionStorage.getItem('vtt_sources');
    const storedResult = sessionStorage.getItem('vtt_result');

    if (runIdParam || !storedConfig || !storedArticleId || !storedRunId) {
      const targetRunId = runIdParam || storedRunId;
      if (!targetRunId) {
        router.replace('/viet-tin-tuc');
        return;
      }

      await loadFromDatabase(targetRunId);
      return;
    }

    try {
      const nextConfig = normalizeNewsConfig(JSON.parse(storedConfig) as Partial<NewsConfig>);
      const nextSources = storedSources ? JSON.parse(storedSources) as NewsItem[] : [];
      const nextArticleId = storedArticleId;
      const nextRunId = storedRunId;

      setConfig(nextConfig);
      setSources(nextSources);
      setArticleId(nextArticleId);
      setRunId(nextRunId);

      if (storedResult) {
        const parsedResult = JSON.parse(storedResult) as NewsStreamResult;
        if (parsedResult.runId === nextRunId) {
          applyLoadedResult(parsedResult, parsedResult.title, parsedResult.metaDescription, null, nextConfig.secondaryKeywords);
          setLoading(false);
          void loadInternalLinks(nextConfig.keyword, parsedResult.html);
          return;
        }
      }

      await startGeneration(nextConfig, nextSources, nextRunId, nextArticleId);
    } catch {
      router.replace('/viet-tin-tuc');
    }
  }

  function applyLoadedResult(
    nextResult: NewsStreamResult,
    title: string,
    metaDescription: string,
    slug: string | null,
    secondaryKeywords: string[],
  ) {
    setResult(nextResult);
    setSources(nextResult.sources || []);
    setEditorHtml(nextResult.html);
    setEditTitle(title);
    setEditMetaDescription(metaDescription);
    setWordCountLive(nextResult.wordCount);
    setSideTab('seo');
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
      secondaryKeywords,
    );
  }

  async function loadFromDatabase(targetRunId: string) {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/articles/by-runid/${encodeURIComponent(targetRunId)}`);
      const payload = (await response.json()) as { success?: boolean; error?: string; data?: DbArticlePayload };
      if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error || 'Không thể tải bản nháp từ cơ sở dữ liệu');
      }

      const article = payload.data;
      const nextConfig = normalizeNewsConfig(article.outline?.config ?? {
        keyword: article.keyword,
        structure: parseNewsStructure(article.contentType),
        language: article.language,
        model: article.aiProvider,
        targetLength: article.targetLength,
        tone: (article.outline?.tone as NewsConfig['tone']) || 'formal',
        secondaryKeywords: article.secondaryKeywords || [],
        brandConfig: article.brandConfig,
      });
      const nextSources = article.outline?.sources ?? [];

      sessionStorage.setItem('vtt_config', JSON.stringify(nextConfig));
      sessionStorage.setItem('vtt_run_id', article.runId);
      sessionStorage.setItem('vtt_article_id', article.id);
      sessionStorage.setItem('vtt_sources', JSON.stringify(nextSources));

      setConfig(nextConfig);
      setSources(nextSources);
      setArticleId(article.id);
      setRunId(article.runId);
      writeSessionAICheckState(article.runId ? `aicheck:news:${article.runId}` : undefined, article.outline?.aiCheck);

      if (article.htmlContent) {
        const restoredResult: NewsStreamResult = {
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
          sources: nextSources,
        };

        applyLoadedResult(
          restoredResult,
          article.selectedTitle,
          article.metaDescription || '',
          article.slug || null,
          nextConfig.secondaryKeywords,
        );
        sessionStorage.setItem('vtt_result', JSON.stringify(restoredResult));
        setLoading(false);
        void loadInternalLinks(nextConfig.keyword, restoredResult.html);
        return;
      }

      await startGeneration(nextConfig, nextSources, article.runId, article.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải bản nháp từ cơ sở dữ liệu');
      setLoading(false);
    }
  }

  async function startGeneration(
    currentConfig: NewsConfig,
    currentSources: NewsItem[],
    currentRunId: string,
    currentArticleId: string,
  ) {
    setLoading(true);
    setError('');
    setStreamText('');
    setResult(null);
    setEditorHtml('');
    setEditTitle(currentConfig.keyword);
    setEditMetaDescription('');
    setWordCountLive(0);
    setSources(currentSources);
    setInternalLinks([]);
    setPublishedUrl('');
    setSideTab('seo');

    try {
      const response = await fetch('/api/viet-tin-tuc/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: currentArticleId,
          runId: currentRunId,
          config: currentConfig,
          sources: currentSources,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json()) as { error?: string };
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
            applyLoadedResult(payload.data, payload.data.title, payload.data.metaDescription, null, currentConfig.secondaryKeywords);
            setSources(payload.data.sources || currentSources);
            sessionStorage.setItem('vtt_result', JSON.stringify(payload.data));
            sessionStorage.setItem('vtt_sources', JSON.stringify(payload.data.sources || currentSources));
            void loadInternalLinks(currentConfig.keyword, payload.data.html);
            setLoading(false);
          }
        }
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạo bài');
      setLoading(false);
    }
  }

  async function loadInternalLinks(keyword: string, html: string) {
    setLoadingLinks(true);
    try {
      const response = await fetch('/api/tinh-gon/internal-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, html }),
      });
      const data = (await response.json()) as { links?: TinhGonInternalLinkSuggestion[] };
      setInternalLinks(data.links || []);
    } catch {
      setInternalLinks([]);
    } finally {
      setLoadingLinks(false);
    }
  }

  function handleContentInput(nextHtmlArg?: string) {
    if (!config) return;
    const liveEditorHtml = (editorShellRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null)?.innerHTML;
    const nextHtml = nextHtmlArg ?? liveEditorHtml ?? contentRef.current?.innerHTML ?? '';
    const nextWordCount = countWords(nextHtml);
    const nextDensity = computeKeywordDensity(nextHtml, config.keyword);

    setEditorHtml(nextHtml);
    setWordCountLive(nextWordCount);
    setResult((prev) =>
      prev
        ? {
            ...prev,
            html: nextHtml,
            wordCount: nextWordCount,
            keywordDensity: nextDensity,
          }
        : prev,
    );

    // Debounced re-check humanness sau khi user ngừng gõ 2.5 giây
    if (recheckTimerRef.current) clearTimeout(recheckTimerRef.current);
    setRecheckPending(true);
    recheckTimerRef.current = setTimeout(() => {
      setRecheckPending(false);
      void refreshMetrics(nextHtml);
    }, 2500);
  }

  function captureSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorShellRef.current) {
      setSelectionLabel('');
      savedRangeRef.current = null;
      return;
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const isInsideEditor =
      container === editorShellRef.current || editorShellRef.current.contains(container.nodeType === Node.TEXT_NODE ? container.parentNode : container);

    if (!isInsideEditor) {
      setSelectionLabel('');
      savedRangeRef.current = null;
      return;
    }

    savedRangeRef.current = range.cloneRange();
    const selectedText = selection.toString().trim();
    setSelectionLabel(selectedText ? `Đã chọn ${selectedText.length} ký tự để AI chỉnh.` : '');
  }

  function execFormat(command: string, value?: string) {
    document.execCommand(command, false, value);
    contentRef.current?.focus();
    handleContentInput();
  }

  function wrapSelection(tag: string) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText) return;

    const wrapper = document.createElement(tag);
    wrapper.textContent = selectedText;
    range.deleteContents();
    range.insertNode(wrapper);
    selection.removeAllRanges();
    contentRef.current?.focus();
    handleContentInput();
  }

  function saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    if (!savedRangeRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  }

  function openLinkModal() {
    saveSelection();
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    setLinkText(selectedText);
    setShowLinkModal(true);
  }

  function insertLink() {
    if (!linkUrl.trim()) return;
    restoreSelection();
    const displayText = linkText.trim() || linkUrl.trim();
    const titleAttr = linkTitle ? ` title="${linkTitle}"` : '';
    const targetAttr = linkTarget !== '_self' ? ` target="${linkTarget}" rel="noopener noreferrer"` : '';
    document.execCommand('insertHTML', false, `<a href="${linkUrl.trim()}"${titleAttr}${targetAttr}>${displayText}</a>`);
    contentRef.current?.focus();
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
    setLinkTitle('');
    setLinkTarget('_self');
    handleContentInput();
  }

  function applyColor(color: string) {
    setCurrentColor(color);
    setShowColorPicker(false);
    contentRef.current?.focus();
    document.execCommand('foreColor', false, color);
    handleContentInput();
  }

  function applyFontSize(size: string) {
    setCurrentFontSize(size);
    setShowFontSizeMenu(false);
    contentRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString();
    document.execCommand('insertHTML', false, `<span style="font-size:${size}">${text}</span>`);
    handleContentInput();
  }

  function handleImgFileUpload(file: File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImgUrl(dataUrl);
      if (!imgAlt && config?.keyword) setImgAlt(config.keyword);
    };
    reader.readAsDataURL(file);
  }

  function insertImage() {
    if (!imgUrl.trim()) return;
    const alt = imgAlt.trim() || config?.keyword || '';
    const title = imgTitle.trim();
    const width = imgWidth.trim();
    const height = imgHeight.trim();
    const style = ['max-width:100%', 'border-radius:8px', 'display:inline-block', width ? `width:${width}` : '', height ? `height:${height}` : '']
      .filter(Boolean)
      .join(';');
    const html = `<figure style="margin:1.25rem 0;text-align:center">
      <img src="${imgUrl.trim()}" alt="${alt}"${title ? ` title="${title}"` : ''} style="${style}" loading="lazy" />
      ${alt ? `<figcaption style="font-size:0.8rem;color:#6b7280;margin-top:0.4rem">${alt}</figcaption>` : ''}
    </figure>`;
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    contentRef.current?.focus();
    setImgUrl('');
    setImgAlt('');
    setImgTitle('');
    setImgWidth('');
    setImgHeight('');
    setImgModalTab('general');
    setShowImgModal(false);
    handleContentInput();
  }

  function insertTableWithSize(rows: number, cols: number) {
    const tableHtml = `<table style="width:100%; border-collapse:collapse; margin:1rem 0;">
      ${Array.from({ length: rows }, (_, rowIndex) => `<tr>${
        Array.from({ length: cols }, (_, colIndex) => {
          const tag = rowIndex === 0 ? 'th' : 'td';
          return `<${tag} style="border:1px solid #d1d5db; padding:8px 12px;">${rowIndex === 0 ? `Cột ${colIndex + 1}` : 'Nội dung'}</${tag}>`;
        }).join('')
      }</tr>`).join('')}
    </table>`;
    restoreSelection();
    document.execCommand('insertHTML', false, tableHtml);
    setShowTableMenu(false);
    setTableGridSize({ rows: 0, cols: 0 });
    handleContentInput();
  }

  function highlightFixedEl(element: HTMLElement, tone: 'pending' | 'applied' = 'pending') {
    element.setAttribute('data-fix-hl', tone);
    element.style.background = tone === 'applied' ? '#fee2e2' : '#fef08a';
    element.style.borderLeft = tone === 'applied' ? '4px solid #dc2626' : '3px solid #ca8a04';
    element.style.paddingLeft = '10px';
    element.style.borderRadius = '0 4px 4px 0';
    element.style.boxShadow = tone === 'applied' ? '0 0 0 3px rgba(220, 38, 38, 0.14)' : '';
    element.style.fontWeight = tone === 'applied' ? '700' : '';
    element.scrollIntoView({ behavior: 'smooth', block: tone === 'applied' ? 'center' : 'nearest' });
    setHasHighlights(true);
  }

  function clearFixHighlights() {
    if (!contentRef.current) return;
    contentRef.current.querySelectorAll('[data-fix-hl]').forEach((node) => {
      const element = node as HTMLElement;
      if (element.tagName === 'MARK' || element.tagName === 'STRONG' || element.tagName === 'SPAN') {
        const text = document.createTextNode(element.textContent || '');
        element.parentNode?.replaceChild(text, element);
      } else {
        element.removeAttribute('data-fix-hl');
        element.style.background = '';
        element.style.borderLeft = '';
        element.style.paddingLeft = '';
        element.style.borderRadius = '';
        element.style.outline = '';
        element.style.boxShadow = '';
        element.style.fontWeight = '';
      }
    });
    setHasHighlights(false);
    handleContentInput();
  }

  function exportToWord() {
    const html = contentRef.current?.innerHTML ?? editorHtml;
    const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${editTitle}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.6; margin: 2cm; }
        h1 { font-size: 18pt; font-weight: bold; margin-bottom: 12pt; }
        h2 { font-size: 14pt; font-weight: bold; margin-top: 18pt; margin-bottom: 6pt; }
        h3 { font-size: 12pt; font-weight: bold; margin-top: 12pt; margin-bottom: 4pt; }
        p { margin-bottom: 8pt; }
        table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
        td, th { border: 1px solid #999; padding: 5pt 8pt; }
        th { background: #f0f0f0; font-weight: bold; }
        ul, ol { padding-left: 20pt; margin-bottom: 8pt; }
        li { margin-bottom: 3pt; }
        strong, b { font-weight: bold; }
        img { max-width: 100%; }
      </style></head>
      <body>${html}</body></html>`;
    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${editTitle.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '-') || 'viet-tin-tuc'}.doc`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function buildFindRegex(term: string, flags = ''): RegExp {
    let escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (wholeWord) escaped = `\\b${escaped}\\b`;
    const finalFlags = (matchCase ? '' : 'i') + flags;
    return new RegExp(`(${escaped})`, finalFlags);
  }

  function handleFind() {
    if (!contentRef.current || !findText.trim()) return;
    let source = contentRef.current.innerHTML
      .replace(/<mark class="find-highlight"[^>]*>([\s\S]*?)<\/mark>/gi, '$1');

    if (findInSel) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
        source = selection.toString();
      }
    }

    const regex = buildFindRegex(findText.trim(), 'g');
    const matches = (source.match(regex) || []).length;
    setFindCount(matches);
    if (matches > 0 && !findInSel) {
      contentRef.current.innerHTML = source.replace(
        regex,
        '<mark class="find-highlight" style="background:#fef08a;border-radius:2px;padding:0 1px">$1</mark>',
      );
    }
  }

  function handleReplaceAll() {
    if (!contentRef.current || !findText.trim()) return;
    const regex = buildFindRegex(findText.trim(), 'g');
    const html = contentRef.current.innerHTML
      .replace(/<mark class="find-highlight"[^>]*>([\s\S]*?)<\/mark>/gi, '$1')
      .replace(regex, replaceText);
    contentRef.current.innerHTML = html;
    setFindCount(0);
    handleContentInput();
  }

  function handleReplaceOne() {
    if (!contentRef.current || !findText.trim()) return;
    const regex = buildFindRegex(findText.trim());
    const html = contentRef.current.innerHTML
      .replace(/<mark class="find-highlight"[^>]*>([\s\S]*?)<\/mark>/gi, '$1')
      .replace(regex, replaceText);
    contentRef.current.innerHTML = html;
    const remaining = (html.match(buildFindRegex(findText.trim(), 'g')) || []).length;
    setFindCount(remaining);
    handleContentInput();
  }

  function closeFindReplace() {
    if (contentRef.current) {
      contentRef.current.innerHTML = contentRef.current.innerHTML
        .replace(/<mark class="find-highlight"[^>]*>([\s\S]*?)<\/mark>/gi, '$1');
    }
    setShowFindReplace(false);
    setShowFindOpts(false);
    setFindText('');
    setReplaceText('');
    setFindCount(null);
  }

  function openSourceModal() {
    if (!contentRef.current) return;
    setSourceCode(contentRef.current.innerHTML);
    setShowSourceModal(true);
  }

  function applySourceCode() {
    if (!contentRef.current) return;
    contentRef.current.innerHTML = sourceCode;
    handleContentInput();
    setShowSourceModal(false);
  }

  function getCurrentSentenceTargets(): SentenceTarget[] {
    if (!contentRef.current) return [];
    return buildSentenceTargets(contentRef.current);
  }

  function highlightInsertedNode(node: Node, tone: 'pending' | 'applied' = 'pending') {
    if (node.nodeType === Node.ELEMENT_NODE) {
      highlightFixedEl(node as HTMLElement, tone);
      return;
    }

    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      const span = document.createElement('span');
      span.textContent = node.textContent;
      node.parentNode?.replaceChild(span, node);
      highlightFixedEl(span, tone);
    }
  }

  function replaceSavedRangeWithHtml(html: string, highlight = false, tone: 'pending' | 'applied' = 'pending'): boolean {
    const range = savedRangeRef.current;
    if (!range) return false;

    const fragment = range.createContextualFragment(html);
    const insertedNodes = Array.from(fragment.childNodes);
    const lastNode = fragment.lastChild;
    range.deleteContents();
    range.insertNode(fragment);

    if (highlight) {
      insertedNodes.forEach((node) => highlightInsertedNode(node, tone));
    }

    if (lastNode) {
      const nextRange = document.createRange();
      nextRange.setStartAfter(lastNode);
      nextRange.collapse(true);
      savedRangeRef.current = nextRange;
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(nextRange);
    }

    handleContentInput();
    return true;
  }

  function replaceSentenceTarget(target: SentenceTarget | undefined, replacement: string, highlight = false, tone: 'pending' | 'applied' = 'pending'): boolean {
    if (!target) return false;

    try {
      const range = target.range.cloneRange();
      const fragment = range.createContextualFragment(replacement);
      const insertedNodes = Array.from(fragment.childNodes);
      const lastNode = fragment.lastChild;
      range.deleteContents();
      range.insertNode(fragment);

      if (highlight) {
        insertedNodes.forEach((node) => highlightInsertedNode(node, tone));
      }

      if (lastNode) {
        const nextRange = document.createRange();
        nextRange.setStartAfter(lastNode);
        nextRange.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(nextRange);
      }

      handleContentInput();
      return true;
    } catch {
      return false;
    }
  }

  function replaceFirstOccurrence(original: string, replacement: string, highlight = false, tone: 'pending' | 'applied' = 'pending') {
    if (!contentRef.current || !original.trim()) return;

    const walker = document.createTreeWalker(contentRef.current, NodeFilter.SHOW_TEXT);
    let node: Text | null;

    while ((node = walker.nextNode() as Text | null)) {
      if (node.textContent && node.textContent.includes(original)) {
        const startIndex = node.textContent.indexOf(original);
        const range = document.createRange();
        range.setStart(node, startIndex);
        range.setEnd(node, startIndex + original.length);
        const fragment = range.createContextualFragment(replacement);
        const insertedNodes = Array.from(fragment.childNodes);
        range.deleteContents();
        range.insertNode(fragment);
        if (highlight) {
          insertedNodes.forEach((insertedNode) => highlightInsertedNode(insertedNode, tone));
        }
        handleContentInput();
        return;
      }
    }
  }

  async function refreshMetrics(nextHtml?: string) {
    if (!config || !result) return;
    const htmlToCheck = nextHtml ?? contentRef.current?.innerHTML ?? editorHtml;

    try {
      const response = await fetch('/api/tinh-gon/humanness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlToCheck,
          forbiddenExtra: config.brandConfig?.forbiddenExtra,
          mode: 'news',
        }),
      });

      const humanness = (await response.json()) as TinhGonHumannessResult;
      const updated: NewsStreamResult = {
        ...(result || {
          runId,
          title: editTitle,
          metaDescription: editMetaDescription,
          sources,
        }),
        html: htmlToCheck,
        title: editTitle,
        metaDescription: editMetaDescription,
        wordCount: countWords(htmlToCheck),
        keywordDensity: computeKeywordDensity(htmlToCheck, config.keyword),
        humanness,
        sources: result?.sources ?? sources,
      };

      setResult(updated);
      setEditorHtml(htmlToCheck);
      setWordCountLive(updated.wordCount);
      sessionStorage.setItem('vtt_result', JSON.stringify(updated));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể cập nhật điểm');
    }
  }

  async function applyAiEdit(command: TinhGonEditCommand) {
    if (!config) return;

    const selectedText = savedRangeRef.current?.toString().trim() || window.getSelection()?.toString().trim() || '';
    if (!selectedText) {
      setError('Hãy bôi đen đoạn cần chỉnh trực tiếp trong editor trước.');
      return;
    }

    setAiEditing(true);
    setError('');

    try {
      const response = await fetch('/api/tinh-gon/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText,
          command,
          context: {
            keyword: config.keyword,
            model: config.model,
            brandConfig: config.brandConfig,
          },
        }),
      });

      const data = (await response.json()) as { editedText?: string; error?: string };
      if (!response.ok || !data.editedText) {
        throw new Error(data.error || 'Chỉnh bằng AI thất bại');
      }

      const replaced = replaceSavedRangeWithHtml(data.editedText, true);
      if (!replaced) {
        replaceFirstOccurrence(selectedText, data.editedText, true);
      }

      const currentHtml = contentRef.current?.innerHTML ?? editorHtml;
      await refreshMetrics(currentHtml);
      setSelectionLabel('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Chỉnh bằng AI thất bại');
    } finally {
      setAiEditing(false);
    }
  }

  async function handleApplyAIFix(original: string, replacement: string, _sentenceIndex?: number, target?: SentenceTarget) {
    const replaced = replaceSentenceTarget(target, replacement, true, 'applied');
    if (!replaced) {
      replaceFirstOccurrence(original, replacement, true, 'applied');
    }
    const currentHtml = contentRef.current?.innerHTML ?? editorHtml;
    await refreshMetrics(currentHtml);
  }

  function insertInternalLink(text: string) {
    const inserted = replaceSavedRangeWithHtml(text, true);
    if (!inserted && contentRef.current) {
      const paragraph = document.createElement('p');
      paragraph.style.marginTop = '1rem';
      paragraph.innerHTML = `👉 Xem thêm: ${text}`;
      contentRef.current.appendChild(paragraph);
      highlightFixedEl(paragraph);
      handleContentInput();
    }
    const currentHtml = contentRef.current?.innerHTML ?? editorHtml;
    void refreshMetrics(currentHtml);
  }

  function fixTitle() {
    if (!config) return;
    if (editTitle.toLowerCase().includes(config.keyword.toLowerCase())) return;
    setEditTitle(`${config.keyword} – ${editTitle}`.trim());
    setFieldHighlights((prev) => ({ ...prev, title: true }));
  }

  function fixMetaDescription() {
    if (!config) return;
    if (editMetaDescription.toLowerCase().includes(config.keyword.toLowerCase())) return;
    const nextMeta = editMetaDescription.trim()
      ? `${config.keyword}. ${editMetaDescription}`.slice(0, 160)
      : `${config.keyword}: thông tin ngắn gọn, thực tế, dễ áp dụng.`.slice(0, 160);
    setEditMetaDescription(nextMeta);
    setFieldHighlights((prev) => ({ ...prev, meta: true }));
  }

  function fixUrlSlug() {
    if (!config) return;
    const nextSlug = slugify(`${config.keyword} ${editTitle}`) || slugify(config.keyword);
    setCustomSlug(nextSlug);
    setSlugEdited(true);
    setFieldHighlights((prev) => ({ ...prev, slug: true }));
  }

  async function fixSlugLengthWithAi() {
    if (!config || fixingSlugLength) return;

    const sourceText = (activeSlug || `${config.keyword} ${editTitle}`).replace(/-/g, ' ').trim();
    if (!sourceText) return;

    setFixingSlugLength(true);

    try {
      let nextText = sourceText;

      if (sourceText.length >= 10) {
        const response = await fetch('/api/tinh-gon/ai-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedText: sourceText,
            command: 'shorten',
            context: {
              keyword: config.keyword,
              model: config.model,
              brandConfig: config.brandConfig,
            },
          }),
        });

        const data = (await response.json()) as { editedText?: string; error?: string };
        if (response.ok && data.editedText) {
          nextText = stripInlineHtml(data.editedText);
        }
      }

      setCustomSlug(fitSeoSlugLength(nextText, config.keyword));
      setSlugEdited(true);
      setFieldHighlights((prev) => ({ ...prev, slug: true }));
    } catch {
      setCustomSlug(fitSeoSlugLength(sourceText, config.keyword));
      setSlugEdited(true);
      setFieldHighlights((prev) => ({ ...prev, slug: true }));
    } finally {
      setFixingSlugLength(false);
    }
  }

  function fixTitleToStart() {
    if (!config) return;
    const plainTitle = editTitle.trim();
    if (!plainTitle) {
      setEditTitle(config.keyword);
      return;
    }
    const keywordLow = config.keyword.toLowerCase();
    if (plainTitle.toLowerCase().startsWith(keywordLow)) return;
    const cleaned = plainTitle.replace(new RegExp(config.keyword, 'ig'), '').replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, '').trim();
    setEditTitle(cleaned ? `${config.keyword} – ${cleaned}` : config.keyword);
    setFieldHighlights((prev) => ({ ...prev, title: true }));
  }

  function fixTitleNumber() {
    if (/\d/.test(editTitle)) return;
    setEditTitle(`${editTitle} ${new Date().getFullYear()}`.trim());
    setFieldHighlights((prev) => ({ ...prev, title: true }));
  }

  async function fixTitleLength() {
    if (!config || fixingTitleLength) return;

    const sourceTitle = editTitle.trim() || config.keyword.trim();
    if (!sourceTitle) return;

    setFixingTitleLength(true);

    try {
      let nextTitle = sourceTitle;

      if (sourceTitle.length >= 10) {
        const response = await fetch('/api/tinh-gon/ai-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedText: sourceTitle,
            command: sourceTitle.length > 70 ? 'shorten' : 'expand',
            context: {
              keyword: config.keyword,
              model: config.model,
              brandConfig: config.brandConfig,
            },
          }),
        });

        const data = (await response.json()) as { editedText?: string; error?: string };
        if (response.ok && data.editedText) {
          nextTitle = stripInlineHtml(data.editedText);
        }
      }

      setEditTitle(fitSeoTitleLength(nextTitle, config.keyword));
      setFieldHighlights((prev) => ({ ...prev, title: true }));
    } catch {
      setEditTitle(fitSeoTitleLength(sourceTitle, config.keyword));
      setFieldHighlights((prev) => ({ ...prev, title: true }));
    } finally {
      setFixingTitleLength(false);
    }
  }

  function fixAltText() {
    if (!contentRef.current || !config) return;
    const images = Array.from(contentRef.current.querySelectorAll('img'));
    images.forEach((image, index) => {
      const alt = image.getAttribute('alt') || '';
      if (!alt.toLowerCase().includes(config.keyword.toLowerCase())) {
        image.setAttribute('alt', alt ? `${alt} – ${config.keyword}` : `${config.keyword} ${index + 1}`);
        const imageElement = image as HTMLElement;
        imageElement.setAttribute('data-fix-hl', '');
        imageElement.style.outline = '3px solid #ca8a04';
        imageElement.style.borderRadius = '4px';
        imageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setHasHighlights(true);
      }
    });
    handleContentInput();
  }

  function addKwTag() {
    if (!newKw.trim()) return;
    setConfig((prev) => {
      if (!prev) return prev;
      if (prev.secondaryKeywords.includes(newKw.trim())) return prev;
      return {
        ...prev,
        secondaryKeywords: [...prev.secondaryKeywords, newKw.trim()],
      };
    });
    setNewKw('');
  }

  function removeKwTag(keywordToRemove: string) {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            secondaryKeywords: prev.secondaryKeywords.filter((item) => item !== keywordToRemove),
          }
        : prev,
    );
  }

  function insertExternalLink() {
    if (!externalUrl.trim() || !externalText.trim()) return;
    const url = externalUrl.trim().startsWith('http') ? externalUrl.trim() : `https://${externalUrl.trim()}`;
    const text = `<a href="${url}" target="_blank" rel="noopener noreferrer">${externalText.trim()}</a>`;
    if (contentRef.current) {
      const paragraph = document.createElement('p');
      paragraph.style.marginTop = '1rem';
      paragraph.innerHTML = `📖 Tham khảo: ${text}`;
      contentRef.current.appendChild(paragraph);
      highlightFixedEl(paragraph);
      handleContentInput();
    }
    setFixingExternal(false);
    setExternalUrl('');
    setExternalText('');
    const currentHtml = contentRef.current?.innerHTML ?? editorHtml;
    void refreshMetrics(currentHtml);
  }

  async function callFixDensity() {
    if (!contentRef.current || !config || fixingDensity) return;
    setFixingDensity(true);

    try {
      const currentHtml = contentRef.current.innerHTML;
      const plainText = currentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const currentCount = (plainText.toLowerCase().match(new RegExp(config.keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;

      const response = await fetch('/api/pipeline/fix-density', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: currentHtml,
          keyword: config.keyword,
          currentCount,
          wordCount,
        }),
      });

      const data = await response.json() as {
        success?: boolean;
        error?: string;
        data?: { html?: string; changed?: boolean };
      };

      if (!response.ok || !data.success) {
      throw new Error(data.error || 'Không thể sửa mật độ từ khóa');
      }

      if (data.data?.changed && data.data.html) {
        contentRef.current.innerHTML = data.data.html;
        handleContentInput();
        const keywordLow = config.keyword.toLowerCase();
        let highlighted = 0;
        Array.from(contentRef.current.querySelectorAll('p, li')).forEach((element) => {
          if (highlighted >= 5) return;
          if ((element.textContent || '').toLowerCase().includes(keywordLow)) {
            highlightFixedEl(element as HTMLElement);
            highlighted += 1;
          }
        });
        const nextHtml = contentRef.current.innerHTML;
        await refreshMetrics(nextHtml);
        setTimeout(() => {
          void saveDraft(false);
        }, 500);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể sửa mật độ từ khóa');
    } finally {
      setFixingDensity(false);
    }
  }

  async function saveDraft(createVersion: boolean) {
    if (!articleId || !config || !result) return false;
    const currentHtml = contentRef.current?.innerHTML ?? editorHtml;

    setSaving(true);

    try {
      if (createVersion) {
        const response = await fetch(`/api/articles/${articleId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedTitle: editTitle,
            htmlContent: currentHtml,
            metaDescription: editMetaDescription,
            slug: activeSlug || undefined,
            wordCount: wordCountLive || countWords(currentHtml),
            seoChecks: { keywordDensity: computeKeywordDensity(currentHtml, config.keyword) },
            humannessScore: result.humanness.score,
            scoreBreakdown: {
              humanness: result.humanness,
              keywordDensity: computeKeywordDensity(currentHtml, config.keyword),
            },
            secondaryKeywords: config.secondaryKeywords,
            createVersion: true,
          }),
        });

        const data = (await response.json()) as { success?: boolean; error?: string };
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Không thể lưu version bài viết');
        }
      } else {
        const response = await fetch(`/api/articles/${articleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword: config.keyword,
            language: config.language,
            contentType: `viet_tin_tuc:${config.structure}`,
            targetLength: config.targetLength,
            aiProvider: config.model,
            brandConfig: config.brandConfig,
            selectedTitle: editTitle,
            secondaryKeywords: config.secondaryKeywords,
            outline: {
              stage: 'generate',
              structure: config.structure,
              tone: config.tone,
              config,
              sources,
              aiCheck: readSessionAICheckState(runId ? `aicheck:news:${runId}` : undefined),
            },
            htmlContent: currentHtml,
            metaDescription: editMetaDescription,
            slug: activeSlug || undefined,
            seoChecks: { keywordDensity: computeKeywordDensity(currentHtml, config.keyword) },
            humannessScore: result.humanness.score,
            scoreBreakdown: {
              humanness: result.humanness,
              keywordDensity: computeKeywordDensity(currentHtml, config.keyword),
            },
            status: 'WRITTEN',
            aiDecision: result.humanness.decision,
          }),
        });

        const data = (await response.json()) as { success?: boolean; error?: string };
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Không thể tự động lưu bản nháp');
        }
      }

      const nextResult: NewsStreamResult = {
        ...result,
        html: currentHtml,
        title: editTitle,
        metaDescription: editMetaDescription,
        wordCount: wordCountLive || countWords(currentHtml),
        keywordDensity: computeKeywordDensity(currentHtml, config.keyword),
        sources,
      };
      setResult(nextResult);
      setEditorHtml(currentHtml);
      sessionStorage.setItem('vtt_result', JSON.stringify(nextResult));
      persistedSignatureRef.current = buildResultSignature(
        nextResult,
        currentHtml,
        editTitle,
        editMetaDescription,
        activeSlug,
        config.secondaryKeywords,
      );
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể lưu bản nháp');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!result) return;

    setPublishing(true);
    setError('');

    try {
      const publishWarnings: string[] = [];
      if (result.humanness.score < 60) {
        publishWarnings.push(`Điểm tự nhiên đang thấp (${result.humanness.score}/100, nên từ 60 trở lên).`);
      }
      if (result.keywordDensity > 1.5) {
      publishWarnings.push(`Mật độ từ khóa đang cao (${result.keywordDensity.toFixed(2)}%, nên <= 1.5%).`);
      }

      if (runId) {
        try {
          const raw = sessionStorage.getItem(`aicheck:news:${runId}`);
          if (!raw) {
            publishWarnings.push('Bạn chưa chạy tab "Kiểm tra AI".');
          } else {
            const parsed = JSON.parse(raw) as { result?: { aiScore?: number } | null };
            const aiScore = parsed.result?.aiScore;
            if (typeof aiScore !== 'number') {
              publishWarnings.push('Tab "Kiểm tra AI" chưa có kết quả hợp lệ.');
            } else if (aiScore >= 35) {
              publishWarnings.push(`AI Score đang ${aiScore}/100, nên dưới 35 trước khi publish.`);
            }
          }
        } catch {
          publishWarnings.push('Không đọc được trạng thái tab "Kiểm tra AI".');
        }
      }

      if (publishWarnings.length > 0) {
        const accepted = window.confirm(`Cần lưu ý trước khi publish:\n\n- ${publishWarnings.join('\n- ')}\n\nBạn vẫn muốn tiếp tục?`);
        if (!accepted) return;
      }

      const saved = await saveDraft(false);
      if (!saved) return;

      const currentHtml = contentRef.current?.innerHTML ?? editorHtml;
      const response = await fetch('/api/pipeline/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          title: editTitle,
          html: currentHtml,
          metaDescription: editMetaDescription,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: { postUrl?: string };
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Publish thất bại');
      }

      setPublishedUrl(data.data?.postUrl || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Publish thất bại');
    } finally {
      setPublishing(false);
    }
  }

  function handleDownload() {
    const currentHtml = contentRef.current?.innerHTML ?? editorHtml;
    const blob = new Blob([currentHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${editTitle.slice(0, 50).replace(/\s+/g, '-') || 'viet-tin-tuc'}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!config) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      <div className="border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3 px-4 pt-2.5 pb-1.5">
          <input
            type="text"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            className="flex-1 text-sm font-medium text-gray-900 border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-0"
            placeholder="Tiêu đề bài viết..."
          />
          <button
            title="Làm mới"
            onClick={() => articleId && void startGeneration(config, sources, runId, articleId)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div className="h-5 border-l border-gray-200" />
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
          >
            Xuất file
          </button>
          <button
            onClick={() => void saveDraft(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              savedFlash ? 'bg-green-50 text-green-700 border-green-300' : 'text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {saving ? 'Đang lưu...' : savedFlash ? '✓ Đã lưu' : 'Lưu'}
          </button>
          {publishedUrl ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-300 rounded-md">
              <span className="text-xs text-green-700 font-medium">✅ Đã đăng</span>
              <a href={publishedUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                Xem →
              </a>
            </div>
          ) : (
            <button
              onClick={() => void handlePublish()}
              disabled={publishing || loading}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors whitespace-nowrap"
            >
              {publishing ? '⏳ Đang đăng...' : 'Đăng Bài'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-4 pb-2">
          <span className="text-xs text-gray-400 shrink-0">🔗</span>
          <span className="text-xs text-gray-400 shrink-0 font-mono">{siteUrl}/</span>
          <input
            type="text"
            value={editingSlug ? (slugEdited ? customSlug : autoSlug) : activeSlug}
            onChange={(event) => {
              const raw = event.target.value
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/-+/g, '-');
              setCustomSlug(raw);
              setSlugEdited(true);
            }}
            onFocus={() => {
              setEditingSlug(true);
              if (!slugEdited) setCustomSlug(autoSlug);
            }}
            onBlur={() => setEditingSlug(false)}
            className={`flex-1 min-w-0 text-xs font-mono px-1.5 py-0.5 rounded border transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400 ${
              editingSlug
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-transparent bg-transparent text-blue-600 hover:border-gray-200 hover:bg-gray-50 cursor-text'
            }`}
            spellCheck={false}
          />
          {slugEdited && (
            <button
              onClick={() => {
                setSlugEdited(false);
                setCustomSlug('');
              }}
              className="shrink-0 text-xs text-gray-400 hover:text-orange-500 transition-colors"
              title="Reset về slug tự động"
            >
              ↺
            </button>
          )}
          <button
            onClick={() => {
              navigator.clipboard.writeText(`https://${siteUrl}/${activeSlug}`);
              setCopiedSlug(true);
              setTimeout(() => setCopiedSlug(false), 1500);
            }}
            className="shrink-0 text-xs text-gray-400 hover:text-blue-600 transition-colors"
            title="Copy URL"
          >
            {copiedSlug ? <span className="text-green-600">✓</span> : '⎘'}
          </button>
        </div>
      </div>

      {false && (
      <div className="border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto">
          <div className="flex items-center gap-1 mr-2 flex-shrink-0">
            <button className="px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 flex items-center gap-1">
              <span className="text-blue-500">🤖</span> Chatbot
            </button>
            <button
              className="px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 flex items-center gap-1"
              onClick={() => setSideTab('links')}
            >
              📰 Nguồn tin <span className="text-gray-400">▾</span>
            </button>
          </div>
          <div className="h-5 border-l border-gray-200 mr-2 flex-shrink-0" />

          <div className="relative flex-shrink-0" data-toolbar-dropdown="paragraph">
            <button
              ref={paragraphBtnRef}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const rect = paragraphBtnRef.current?.getBoundingClientRect();
                if (rect) setParagraphDropPos({ top: rect.bottom + 4, left: rect.left });
                setFormatMenuOpen(!formatMenuOpen);
                setShowColorPicker(false);
                setShowFontSizeMenu(false);
              }}
              className="h-7 px-2 text-xs border border-gray-200 rounded text-gray-600 hover:bg-gray-50 focus:outline-none flex items-center gap-1"
            >
              Đoạn văn <span className="text-gray-400">▾</span>
            </button>
          </div>

          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />
          {['H2', 'H3'].map((heading) => (
            <button
              key={heading}
              onClick={() => execFormat('formatBlock', heading.toLowerCase())}
              className="px-2 py-0.5 text-xs font-bold text-gray-600 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0"
            >
              {heading}
            </button>
          ))}
          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />

          <div className="flex-shrink-0" data-toolbar-dropdown="color">
            <button
              ref={colorBtnRef}
              title="Màu chữ"
              onClick={() => {
                const rect = colorBtnRef.current?.getBoundingClientRect();
                if (rect) setColorDropPos({ top: rect.bottom + 4, left: rect.left });
                setShowColorPicker((value) => !value);
                setShowFontSizeMenu(false);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
            >
              <span className="relative inline-block w-3.5 h-3.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10M12 3L5 17h14L12 3z" />
                </svg>
                <span className="absolute bottom-0 left-0 right-0 h-1 rounded" style={{ backgroundColor: currentColor }} />
              </span>
              <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="flex-shrink-0" data-toolbar-dropdown="font">
            <button
              ref={fontBtnRef}
              title="Cỡ chữ"
              onClick={() => {
                const rect = fontBtnRef.current?.getBoundingClientRect();
                if (rect) setFontDropPos({ top: rect.bottom + 4, left: rect.left });
                setShowFontSizeMenu((value) => !value);
                setShowColorPicker(false);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 min-w-[52px]"
            >
              <span>{currentFontSize}</span>
              <svg className="w-2.5 h-2.5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />
          {[
            { icon: 'B', cmd: 'bold', cls: 'font-bold' },
            { icon: 'I', cmd: 'italic', cls: 'italic' },
            { icon: 'U', cmd: 'underline', cls: 'underline' },
          ].map((tool) => (
            <button
              key={tool.cmd}
              onClick={() => execFormat(tool.cmd)}
              className={`w-7 h-7 text-xs ${tool.cls} text-gray-600 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0`}
            >
              {tool.icon}
            </button>
          ))}

          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />
          {[
            { title: 'Căn trái', cmd: 'justifyLeft', svg: 'M3 6h18M3 12h12M3 18h15' },
            { title: 'Căn giữa', cmd: 'justifyCenter', svg: 'M3 6h18M6 12h12M4 18h16' },
            { title: 'Căn phải', cmd: 'justifyRight', svg: 'M3 6h18M9 12h12M6 18h15' },
          ].map((align) => (
            <button
              key={align.cmd}
              title={align.title}
              onClick={() => execFormat(align.cmd)}
              className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={align.svg} />
              </svg>
            </button>
          ))}

          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />
          <button
            onClick={() => execFormat('insertUnorderedList')}
            className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0"
            title="Danh sách gạch đầu dòng"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => execFormat('insertOrderedList')}
            className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0"
            title="Danh sách đánh số"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
            </svg>
          </button>
          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />

          <button title="Chèn / sửa link" onClick={openLinkModal} className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
          <button
            title="Chèn hình ảnh"
            onClick={() => {
              saveSelection();
              setShowImgModal(true);
            }}
            className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            ref={tableBtnRef}
            title="Chèn bảng"
            onClick={() => {
              saveSelection();
              const rect = tableBtnRef.current?.getBoundingClientRect();
              if (rect) setTableDropPos({ top: rect.bottom + 4, left: rect.left });
              setShowTableMenu(!showTableMenu);
              setShowColorPicker(false);
              setShowFontSizeMenu(false);
              setFormatMenuOpen(false);
            }}
            className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M6 3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3z" />
            </svg>
          </button>

          <div className="h-5 border-l border-gray-100 mx-1 flex-shrink-0" />
          <button title="Hoàn tác" onClick={() => execFormat('undo')} className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" />
            </svg>
          </button>
          <button title="Làm lại" onClick={() => execFormat('redo')} className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6M21 10l-6-6" />
            </svg>
          </button>
          <button
            title="Tìm & Thay thế (Ctrl+H)"
            onClick={() => setShowFindReplace(true)}
            className={`w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-50 flex-shrink-0 transition-colors ${
              showFindReplace ? 'bg-blue-50 border-blue-300 text-blue-600' : 'text-gray-500 border-gray-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          {hasHighlights && (
            <button
              title="Xóa tô đỏ vùng đã sửa"
              onClick={clearFixHighlights}
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-red-600 border border-red-300 bg-red-50 rounded hover:bg-red-100 flex-shrink-0 transition-colors"
            >
              <span>🧹</span> Xóa highlight
            </button>
          )}
          <button
            title="Xuất file Word (.doc)"
            onClick={exportToWord}
            className="w-7 h-7 flex items-center justify-center text-blue-700 border border-blue-200 rounded hover:bg-blue-50 flex-shrink-0 font-bold text-xs"
          >
            W↓
          </button>
          <button
            title="Xem mã nguồn"
            onClick={openSourceModal}
            className="w-7 h-7 flex items-center justify-center text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>

          <div className="flex-1" />
          <span className="text-xs text-gray-400 flex-shrink-0 mr-1">{wordCountLive.toLocaleString()} từ ✏️</span>
          <button
            title="Bài mới"
            onClick={() => {
              ['vtt_config', 'vtt_run_id', 'vtt_result', 'vtt_article_id', 'vtt_sources'].forEach((key) =>
                sessionStorage.removeItem(key),
              );
              router.push('/viet-tin-tuc');
            }}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded flex-shrink-0"
          >
            Bài mới
          </button>
        </div>
      </div>
      )}

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col bg-gray-50">
          <div className="min-h-0 flex-1 overflow-hidden p-5">
            <div className="h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {loading && !result ? (
                <div className="h-full overflow-y-auto bg-gray-100 p-6 relative">
                  <div className="article-body bg-white rounded-sm shadow-sm w-full px-12 py-10 min-h-[600px] focus:outline-none">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-blue-700">AI đang tổng hợp và viết tin tức...</p>
              </div>
              <pre className="whitespace-pre-wrap text-xs text-gray-700 leading-relaxed">
                {streamText || 'Đang khởi tạo stream...'}
              </pre>
                  </div>
                </div>
              ) : (
                <div ref={editorShellRef} className="h-full">
              <RichArticleEditor
                html={currentHtml}
                wordCount={currentWordCount}
                keyword={config.keyword}
                articleTitle={editTitle}
                fullWidth
                onChange={handleContentInput}
                onSave={() => { void saveDraft(true); }}
                onNewArticle={() => {
                  ['vtt_config', 'vtt_run_id', 'vtt_result', 'vtt_article_id', 'vtt_sources'].forEach((key) =>
                    sessionStorage.removeItem(key),
                  );
                  router.push('/viet-tin-tuc');
                }}
              />
                </div>
              )}
            </div>
          </div>
        </main>

        <div className="flex w-[420px] shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white">
          <GeneratePanelTabs value={sideTab} onChange={setSideTab} tabs={UNIFIED_GENERATE_TABS} />
          <div className={sideTab === 'seo' ? 'flex-1 overflow-y-auto p-4 space-y-5' : 'hidden'}>
              <div className="space-y-3">
                <SeoScoreBar score={seoData.score} />
                <KeywordDensityBar density={result?.keywordDensity ?? null} />
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Trạng thái bản nháp</span>
                  <span className={`text-xs ${savedFlash ? 'text-green-600' : saving ? 'text-blue-600' : 'text-gray-400'}`}>
                    {savedFlash ? 'Đã lưu' : saving ? 'Đang lưu...' : articleId ? 'Đã liên kết dữ liệu' : ''}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Từ khóa: <span className="text-gray-700">{config.keyword}</span></p>
                  <p>Mô hình: <span className="text-gray-700">{config.model}</span></p>
                  <p>Cấu trúc: <span className="text-gray-700">{config.structure}</span></p>
                  <p>Giọng văn: <span className="text-gray-700">{config.tone}</span></p>
                  <p>Nguồn tin: <span className="text-gray-700">{sources.length}</span></p>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Mô tả meta</label>
                  <textarea
                    value={editMetaDescription}
                    onChange={(event) => setEditMetaDescription(event.target.value)}
                    rows={4}
                    className={`w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      fieldHighlights.meta ? 'bg-yellow-50 border-yellow-300 text-yellow-900' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSerp(!showSerp)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-xs font-semibold text-gray-700">Xem trước SERP</span>
                  <span className="text-gray-400 text-xs">{showSerp ? '▲' : '▼'}</span>
                </button>
                {showSerp && (
                  <div className="p-3">
                    <p className={`text-xs mb-2 break-all font-mono rounded px-2 py-1 transition-colors ${
                      fieldHighlights.slug ? 'bg-yellow-50 border border-yellow-300 text-yellow-800' : 'text-gray-400'
                    }`}>
                      /{activeSlug}
                    </p>
                    <div className="border border-gray-200 rounded-lg p-3 bg-white">
                      <p className={`text-sm font-medium text-blue-700 leading-snug line-clamp-2 rounded px-2 py-1 transition-colors ${
                        fieldHighlights.title ? 'bg-yellow-50 border border-yellow-300' : ''
                      }`}>
                        {editTitle}
                      </p>
                      <p className={`text-xs mt-0.5 truncate rounded px-2 py-1 transition-colors ${
                        fieldHighlights.slug ? 'bg-yellow-50 border border-yellow-300 text-yellow-800' : 'text-green-700'
                      }`}>
                        {siteUrl} › {activeSlug}
                      </p>
                      <p className={`text-xs mt-1 line-clamp-3 leading-relaxed rounded px-2 py-1 transition-colors ${
                        fieldHighlights.meta ? 'bg-yellow-50 border border-yellow-300 text-yellow-900' : 'text-gray-600'
                      }`}>
                    {editMetaDescription || 'Mô tả meta sẽ hiển thị ở đây'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {config.secondaryKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-full"
                    >
                      {keyword}
                      <button type="button" onClick={() => removeKwTag(keyword)} className="text-blue-400 hover:text-blue-700">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newKw}
                    onChange={(event) => setNewKw(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && addKwTag()}
                    placeholder="Thêm từ khóa..."
                    className="flex-1 text-xs border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <button
                    onClick={addKwTag}
                    className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {([
                { key: 'basic', label: 'SEO Cơ bản', open: openBasic, setOpen: setOpenBasic },
                { key: 'advanced', label: 'Nâng cao', open: openAdvanced, setOpen: setOpenAdvanced },
                { key: 'title', label: 'Tiêu đề thu hút', open: openTitle, setOpen: setOpenTitle },
              ] as const).map(({ key, label, open, setOpen }) => {
                const groupItems = seoData.checks
                  .map((check, index) => ({ check, index }))
                  .filter(({ check }) => check.group === key);
                const groupErrors = groupItems.filter(({ check }) => !check.pass).length;

                return (
                  <div key={key} className="border-t border-gray-100 pt-2">
                    <button
                      type="button"
                      onClick={() => setOpen(!open)}
                      className="w-full flex items-center justify-between py-1.5 text-left"
                    >
                      <span className="text-xs font-semibold text-gray-700">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                          groupErrors === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
                        }`}>
                          {groupErrors === 0 ? '✓ Ổn' : `${groupErrors} Lỗi`}
                        </span>
                        <span className="text-gray-400 text-xs">{open ? '−' : '+'}</span>
                      </div>
                    </button>

                    {open && (
                      <div className="space-y-2 mt-1 mb-2">
                        {groupItems.map(({ check, index }) => (
                          <div key={index}>
                            <div className="flex items-start gap-2">
                              <span className={`mt-0.5 flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full text-white text-xs ${
                                check.pass ? 'bg-green-500' : 'bg-red-500'
                              }`}>
                                {check.pass ? '✓' : '✕'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs leading-snug ${check.pass ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                                  {check.label}
                                  {check.detail && <span className="text-gray-400 font-normal"> — {check.detail}</span>}
                                </p>

                                {!check.pass && index === 0 && (
                                  <button onClick={fixTitle} className="mt-0.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                                    🔧 Sửa — Thêm từ khóa vào tiêu đề
                                  </button>
                                )}
                                {!check.pass && index === 1 && (
                                  <button onClick={fixMetaDescription} className="mt-0.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                                  🔧 Sửa — Chèn từ khóa vào meta
                                  </button>
                                )}
                                {!check.pass && index === 2 && (
                                  <button onClick={fixUrlSlug} className="mt-0.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                                  🔧 Sửa — Tạo slug chuẩn
                                  </button>
                                )}
                                {!check.pass && index === 6 && (
                                  <button
                                    onClick={() => void callFixDensity()}
                                    disabled={fixingDensity}
                                    className="mt-0.5 text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 disabled:opacity-50"
                                  >
                                    {fixingDensity
                                      ? <><span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> AI đang xử lý...</>
                                      : <>⚡ AI sửa — Tăng mật độ từ khóa</>
                                    }
                                  </button>
                                )}
                                {!check.pass && index === 8 && (
                                  <button
                                    onClick={() => {
                                      if (internalLinks[0]) {
                                        setInternalUrl(internalLinks[0].url);
                                        setInternalText(internalLinks[0].suggestText || internalLinks[0].title);
                                      }
                                      setFixingInternal(!fixingInternal);
                                    }}
                                    className="mt-0.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    🔧 Sửa — Chèn liên kết nội bộ
                                  </button>
                                )}
                                {!check.pass && index === 9 && (
                                  <button
                                    onClick={() => setFixingExternal(!fixingExternal)}
                                    className="mt-0.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    🔧 Sửa — Chèn liên kết ngoài
                                  </button>
                                )}
                                {!check.pass && index === 10 && (
                                  <button onClick={fixAltText} className="mt-0.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                                    🔧 Sửa — Tự động thêm văn bản alt
                                  </button>
                                )}
                                {!check.pass && index === 12 && (
                                  <button onClick={fixTitleToStart} className="mt-0.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                                  🔧 Sửa — Đưa từ khóa lên đầu tiêu đề
                                  </button>
                                )}
                                {!check.pass && index === 13 && (
                                  <button onClick={fixTitleNumber} className="mt-0.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                                  🔧 Sửa — Thêm năm {new Date().getFullYear()}
                                  </button>
                                )}
                              </div>
                            </div>

                                {!check.pass && index === 17 && (
                                  <button
                                    onClick={() => void fixTitleLength()}
                                    disabled={fixingTitleLength}
                                    className="mt-0.5 text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 disabled:opacity-50"
                                  >
                                    {fixingTitleLength
                                      ? <><span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> AI đang xử lý...</>
                                      : <>⚡ AI sửa — Chỉnh tiêu đề 50-70 ký tự</>
                                    }
                                  </button>
                                )}

                                {!check.pass && index === 7 && (
                                  <button
                                    onClick={() => void fixSlugLengthWithAi()}
                                    disabled={fixingSlugLength}
                                    className="mt-0.5 text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 disabled:opacity-50"
                                  >
                                    {fixingSlugLength
                                      ? <><span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> AI đang xử lý...</>
                                      : <>⚡ AI sửa — Rút gọn slug dưới 75 ký tự</>
                                    }
                                  </button>
                                )}

                            {!check.pass && index === 8 && fixingInternal && (
                              <div className="mt-2 ml-6 p-3 rounded-lg border bg-blue-50 border-blue-200 space-y-2">
                              <p className="text-xs font-semibold text-blue-700">Chèn liên kết nội bộ cuối bài</p>
                                <input
                                  type="text"
                                  value={internalUrl}
                                  onChange={(event) => setInternalUrl(event.target.value)}
                                  placeholder="/slug-hoac-url-day-du"
                                  className="w-full text-xs border border-blue-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                />
                                <input
                                  type="text"
                                  value={internalText}
                                  onChange={(event) => setInternalText(event.target.value)}
                                  placeholder="Anchor text"
                                  className="w-full text-xs border border-blue-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => insertInternalLink(`<a href="${internalUrl}">${internalText}</a>`)}
                                    disabled={!internalUrl.trim() || !internalText.trim()}
                                    className="flex-1 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                                  >
                                    ✓ Chèn vào bài
                                  </button>
                                  <button
                                    onClick={() => setFixingInternal(false)}
                                    className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                  >
                                    Huỷ
                                  </button>
                                </div>
                              </div>
                            )}

                            {!check.pass && index === 9 && fixingExternal && (
                              <div className="mt-2 ml-6 p-3 rounded-lg border bg-purple-50 border-purple-200 space-y-2">
                              <p className="text-xs font-semibold text-purple-700">Chèn liên kết ngoài cuối bài</p>
                                <input
                                  type="text"
                                  value={externalUrl}
                                  onChange={(event) => setExternalUrl(event.target.value)}
                                  placeholder="https://example.com/nguon-tham-khao"
                                  className="w-full text-xs border border-purple-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                                />
                                <input
                                  type="text"
                                  value={externalText}
                                  onChange={(event) => setExternalText(event.target.value)}
                                  placeholder="Tên nguồn tham khảo"
                                  className="w-full text-xs border border-purple-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={insertExternalLink}
                                    disabled={!externalUrl.trim() || !externalText.trim()}
                                    className="flex-1 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300"
                                  >
                                    ✓ Chèn vào bài
                                  </button>
                                  <button
                                    onClick={() => setFixingExternal(false)}
                                    className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                  >
                                    Huỷ
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {result?.humanness && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">Điểm tự nhiên</span>
                    <span className={`text-sm font-bold ${
                      result.humanness.score >= 76 ? 'text-green-600' : result.humanness.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {result.humanness.score}/100
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        result.humanness.score >= 76 ? 'bg-green-500' : result.humanness.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      } ${recheckPending ? 'opacity-70' : ''}`}
                      style={{ width: `${result.humanness.score}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    {[
                      ['Ngôn ngữ tự nhiên', humannessBreakdown.language_natural],
                      ['Cấu trúc bài', humannessBreakdown.structure],
                      ['E-E-A-T', humannessBreakdown.eeat_signals],
                      ['Engagement', humannessBreakdown.engagement],
                    ].map(([label, value]) => (
                      <div key={label as string} className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-sm font-bold text-gray-800">{value as number}</p>
                        <p className="text-xs text-gray-400 leading-tight mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  {result.humanness.decision === 'REWRITE' && (
                    <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                      Điểm dưới 60 - nên viết lại để đảm bảo chất lượng
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  ['vtt_config', 'vtt_run_id', 'vtt_result', 'vtt_article_id', 'vtt_sources'].forEach((key) =>
                    sessionStorage.removeItem(key),
                  );
                  router.push('/viet-tin-tuc');
                }}
                className="w-full py-2 text-xs font-medium border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
              >
                🔄 Viết lại từ đầu
              </button>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Internal links gợi ý</p>
                  {loadingLinks && <span className="text-xs text-gray-400">Đang tải...</span>}
                </div>
                <InternalLinkSuggest links={internalLinks} onInsert={insertInternalLink} />
                {!loadingLinks && internalLinks.length === 0 && (
                  <p className="text-sm text-gray-500">Chưa có gợi ý internal link phù hợp.</p>
                )}
              </div>
          </div>

          <div className={sideTab === 'ai' ? 'flex-1 overflow-y-auto p-4 space-y-4' : 'hidden'}>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">Chỉnh bằng AI theo vùng chọn</p>
                <p className="text-xs text-gray-400 mb-3">
                  {selectionLabel || 'Bôi đen đoạn văn ngay trong editor bên trái rồi chọn lệnh chỉnh bằng AI.'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {AI_EDIT_COMMANDS.map((command) => (
                    <button
                      key={command.value}
                      type="button"
                      onClick={() => void applyAiEdit(command.value)}
                      disabled={aiEditing}
                      className="px-3 py-2 text-xs rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      {aiEditing ? 'Đang xử lý...' : command.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <AICheckPanel
                  html={editorHtml || result?.html || ''}
                  onApplyFix={handleApplyAIFix}
                  storageKey={runId ? `aicheck:news:${runId}` : undefined}
                  getSentenceTargets={getCurrentSentenceTargets}
                />
              </div>
          </div>

          <div className={sideTab === 'links' ? 'flex-1 overflow-y-auto p-4 space-y-3' : 'hidden'}>
              {sources.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <div className="text-3xl mb-2">📰</div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Chưa có nguồn tin</p>
                  <p className="text-xs text-gray-400">Google News không trả về nguồn nào cho chủ đề này.</p>
                </div>
              ) : (
                sources.map((source, index) => (
                  <a
                    key={`${source.link}-${index}`}
                    href={source.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{source.title}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 whitespace-nowrap">#{index + 1}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{source.source || 'Google News'}{source.pubDate ? ` • ${source.pubDate}` : ''}</p>
                    {source.snippet && (
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">{source.snippet}</p>
                    )}
                    <p className="text-xs text-blue-600 mt-3">Mở nguồn →</p>
                  </a>
                ))
              )}
          </div>

          {/* ── Tab CHẤT LƯỢNG ──────────────────────────────────────── */}
          <div className={sideTab === 'quality' ? 'flex-1 overflow-y-auto p-4 space-y-4' : 'hidden'}>
            {(() => {
              const htmlForQc = editorHtml || result?.html || '';
              const paragraphs = htmlForQc.match(/<p[\s\S]*?<\/p>/gi) ?? [];
              const longParagraphs = paragraphs.filter(
                (p) => p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean).length > 90,
              ).length;
              const hasVisualBreak = /<(ul|ol|table)[\s>]/i.test(htmlForQc);
              const wc = countWords(htmlForQc);
              const humanness = result?.humanness;

              return (
                <>
                  {/* Điểm tự nhiên */}
                  {humanness ? (
                    <HumannessPanel
                      score={humanness.score}
                      decision={humanness.decision}
                      issues={humanness.issues}
                      forbiddenFound={humanness.forbiddenFound}
                      stale={recheckPending}
                    />
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                      <p className="text-3xl font-black text-gray-300">—</p>
                      <p className="text-xs text-gray-400 mt-1">Điểm tự nhiên sẽ có sau khi bài viết hoàn tất</p>
                    </div>
                  )}

                  {/* Readability summary */}
                  <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-700">Kiểm tra cấu trúc bài</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-gray-600">Đoạn văn dài (&gt;90 từ)</span>
                        <span className={`text-xs font-semibold ${longParagraphs === 0 ? 'text-green-600' : 'text-orange-500'}`}>
                          {longParagraphs === 0 ? '✓ Không có' : `${longParagraphs} đoạn`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-gray-600">Ngắt nhịp nội dung (danh sách/bảng)</span>
                        <span className={`text-xs font-semibold ${hasVisualBreak ? 'text-green-600' : 'text-orange-500'}`}>
                          {hasVisualBreak ? '✓ Có' : '✕ Nên thêm'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-gray-600">Số từ</span>
                        <span className="text-xs font-semibold text-gray-700">{wc} từ</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-gray-600">Số đoạn văn</span>
                        <span className="text-xs font-semibold text-gray-700">{paragraphs.length} đoạn</span>
                      </div>
                    </div>
                  </div>

                  {/* Forbidden words */}
                  {humanness?.forbiddenFound && humanness.forbiddenFound.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-xs font-semibold text-red-700 mb-2">
                        🚫 Từ cấm phát hiện ({humanness.forbiddenFound.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {humanness.forbiddenFound.map((word) => (
                          <span key={word} className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issues */}
                  {humanness?.issues && humanness.issues.length > 0 && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-2">
                      <p className="text-xs font-semibold text-orange-700">⚠️ Vấn đề cần xem xét</p>
                      <ul className="space-y-1">
                        {humanness.issues.map((issue, i) => (
                          <li key={i} className="text-xs text-orange-600 flex items-start gap-1.5">
                            <span className="mt-0.5 shrink-0">•</span>
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!htmlForQc && (
                    <p className="text-xs text-gray-400 text-center py-4">Chờ bài viết hoàn tất để kiểm tra chất lượng.</p>
                  )}
                </>
              );
            })()}
          </div>

          {/* ── Tab HÌNH ẢNH ────────────────────────────────────────── */}
          <div className={sideTab === 'images' ? 'flex-1 overflow-y-auto p-4 space-y-4' : 'hidden'}>
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
              <div className="text-4xl mb-3">🖼️</div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Thư viện hình ảnh</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Tính năng quản lý và chèn hình ảnh vào bài viết đang được phát triển.
              </p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-700">💡 Hướng dẫn thêm ảnh hiện tại</p>
              <ul className="space-y-1.5 text-xs text-blue-600">
                <li className="flex items-start gap-1.5"><span className="shrink-0 mt-0.5">1.</span><span>Dùng nút <strong>🖼</strong> trên toolbar editor để chèn ảnh từ URL</span></li>
                <li className="flex items-start gap-1.5"><span className="shrink-0 mt-0.5">2.</span><span>Đặt ảnh ngay sau H2 đầu tiên để tăng engagement</span></li>
                <li className="flex items-start gap-1.5"><span className="shrink-0 mt-0.5">3.</span><span>Alt text nên chứa từ khóa chính của bài</span></li>
                <li className="flex items-start gap-1.5"><span className="shrink-0 mt-0.5">4.</span><span>Ảnh tối thiểu 800×600px để đảm bảo chất lượng hiển thị</span></li>
              </ul>
            </div>
          </div>

          <div className={sideTab === 'publish' ? 'flex-1 overflow-y-auto p-4 space-y-4' : 'hidden'}>
            {articleId ? (
              <GeneratePublishPanel
                articleId={articleId}
                keyword={config.keyword}
                title={editTitle}
                metaDescription={editMetaDescription}
                slug={activeSlug}
                wordCount={countWords(editorHtml || result?.html || '')}
                seoScore={seoData.score}
                onTitleChange={setEditTitle}
                onMetaDescriptionChange={setEditMetaDescription}
                onSlugChange={(value) => {
                  setSlugEdited(true);
                  setCustomSlug(value);
                }}
                onCopyHtml={() => void navigator.clipboard.writeText(editorHtml || result?.html || '')}
                onSaveDraft={() => { void saveDraft(true); }}
                onPublished={(link) => setPublishedUrl(link)}
              />
            ) : (
              <div className="p-4 text-sm text-gray-500">Chờ articleId trước khi đăng bài.</div>
            )}
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' && showColorPicker && createPortal(
        <div
          data-toolbar-dropdown
          style={{ position: 'fixed', top: colorDropPos.top, left: colorDropPos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-52"
        >
          <p className="text-xs font-medium text-gray-500 mb-2">Màu cơ bản</p>
          <div className="grid grid-cols-8 gap-1 mb-3">
            {['#000000','#374151','#6B7280','#9CA3AF','#D1D5DB','#F3F4F6','#FFFFFF','#EF4444','#F97316','#EAB308','#22C55E','#3B82F6','#8B5CF6','#EC4899','#DC2626','#EA580C','#CA8A04','#16A34A','#2563EB','#7C3AED','#DB2777','#FEF2F2','#FFF7ED','#FEFCE8','#F0FDF4','#EFF6FF','#F5F3FF','#FDF2F8','#FCA5A5','#FDBA74','#FDE047','#86EFAC','#93C5FD','#C4B5FD','#F9A8D4'].map((color) => (
              <button
                key={color}
                onClick={() => applyColor(color)}
                style={{ backgroundColor: color }}
                className={`w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform ${color === '#FFFFFF' ? 'border-gray-400' : ''}`}
                title={color}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Màu tùy chỉnh</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentColor}
              onChange={(event) => setCurrentColor(event.target.value)}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={currentColor}
              onChange={(event) => { if (/^#[0-9a-fA-F]{0,6}$/.test(event.target.value)) setCurrentColor(event.target.value); }}
              className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
              maxLength={7}
            />
            <button onClick={() => applyColor(currentColor)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Chọn</button>
          </div>
        </div>,
        document.body,
      )}

      {typeof document !== 'undefined' && showFontSizeMenu && createPortal(
        <div
          data-toolbar-dropdown
          style={{ position: 'fixed', top: fontDropPos.top, left: fontDropPos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-28"
        >
          {['10px','12px','13px','14px','15px','16px','18px','20px','22px','24px','28px','32px','36px','48px'].map((size) => (
            <button
              key={size}
              onClick={() => applyFontSize(size)}
              className={`w-full px-3 py-1 text-left text-xs hover:bg-blue-50 hover:text-blue-700 transition-colors ${size === currentFontSize ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
            >
              {size}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {typeof document !== 'undefined' && formatMenuOpen && createPortal(
        <div data-toolbar-dropdown="paragraph">
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => { setFormatMenuOpen(false); setOpenSubmenu(null); }} />
          <div
            style={{ position: 'fixed', top: paragraphDropPos.top, left: paragraphDropPos.left, zIndex: 9999 }}
            className="w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1"
          >
            {([
              {
                key: 'headings',
                label: 'Tiêu đề',
                items: ['H1','H2','H3','H4','H5','H6'].map((heading) => ({
                  label: `Tiêu đề ${heading.slice(1)}`,
                  cls: '',
                  action: () => execFormat('formatBlock', heading.toLowerCase()),
                })),
              },
              {
                key: 'inline',
                label: 'Định dạng chữ',
                items: [
                  { label: 'Đậm', cls: 'font-bold', action: () => execFormat('bold') },
                  { label: 'Nghiêng', cls: 'italic', action: () => execFormat('italic') },
                  { label: 'Gạch chân', cls: 'underline', action: () => execFormat('underline') },
                  { label: 'Gạch ngang', cls: 'line-through', action: () => execFormat('strikeThrough') },
                  { label: 'Mã trong dòng', cls: 'font-mono text-pink-600', action: () => wrapSelection('code') },
                ],
              },
              {
                key: 'blocks',
                label: 'Khối',
                items: [
                  { label: '¶ Đoạn văn', cls: '', action: () => execFormat('formatBlock', 'p') },
                  { label: '" Trích dẫn', cls: '', action: () => execFormat('formatBlock', 'blockquote') },
                  { label: '</> Khối mã', cls: 'font-mono', action: () => execFormat('formatBlock', 'pre') },
                ],
              },
              {
                key: 'align',
                label: 'Căn lề',
                items: [
                  { label: '⬅ Trái', cls: '', action: () => execFormat('justifyLeft') },
                  { label: '↔ Giữa', cls: '', action: () => execFormat('justifyCenter') },
                  { label: '➡ Phải', cls: '', action: () => execFormat('justifyRight') },
                  { label: '⇔ Đều hai bên', cls: '', action: () => execFormat('justifyFull') },
                ],
              },
            ] as const).map((menu) => (
              <div
                key={menu.key}
                className="relative"
                onMouseEnter={() => setOpenSubmenu(menu.key)}
                onMouseLeave={() => setOpenSubmenu(null)}
              >
                <button
                  type="button"
                  className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors ${
                    openSubmenu === menu.key ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  {menu.label}
                  <span className="text-gray-400">›</span>
                </button>
                {openSubmenu === menu.key && (
                  <div style={{ position: 'absolute', left: '100%', top: 0, zIndex: 10000 }} className="w-40 bg-white border border-gray-200 rounded-lg shadow-xl py-1">
                    {menu.items.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          item.action();
                          setFormatMenuOpen(false);
                          setOpenSubmenu(null);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${item.cls}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}

      {typeof document !== 'undefined' && showTableMenu && createPortal(
        <div data-toolbar-dropdown="table">
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => { setShowTableMenu(false); setTableGridSize({ rows: 0, cols: 0 }); }} />
          <div
            style={{ position: 'fixed', top: tableDropPos.top, left: tableDropPos.left, zIndex: 9999 }}
            className="bg-white border border-gray-200 rounded-lg shadow-xl p-3"
          >
            <p className="text-xs text-gray-500 mb-2 text-center font-medium">
              {tableGridSize.rows > 0 && tableGridSize.cols > 0 ? `${tableGridSize.rows} × ${tableGridSize.cols}` : 'Chọn kích thước'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 18px)', gap: '2px' }}>
              {Array.from({ length: 100 }, (_, index) => {
                const row = Math.floor(index / 10) + 1;
                const col = (index % 10) + 1;
                const isHighlighted = row <= tableGridSize.rows && col <= tableGridSize.cols;
                return (
                  <div
                    key={index}
                    onMouseEnter={() => setTableGridSize({ rows: row, cols: col })}
                    onClick={(event) => {
                      event.stopPropagation();
                      insertTableWithSize(row, col);
                    }}
                    style={{
                      width: '18px',
                      height: '18px',
                      border: '1px solid #d1d5db',
                      cursor: 'pointer',
                      backgroundColor: isHighlighted ? '#3b82f6' : '#ffffff',
                      transition: 'background-color 0.1s ease',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 shadow-sm">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {showImgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowImgModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[480px] overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Chèn / Sửa hình ảnh</h3>
              <button onClick={() => setShowImgModal(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none w-6 h-6 flex items-center justify-center">×</button>
            </div>
            <div className="flex border-b border-gray-100">
              {(['general','upload'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setImgModalTab(tab)}
                  className={`px-5 py-2.5 text-xs font-medium transition-colors ${imgModalTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {tab === 'general' ? 'Chung' : 'Tải lên'}
                </button>
              ))}
            </div>
            <div className="p-5">
              {imgModalTab === 'general' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nguồn ảnh (URL) *</label>
                    <input type="url" value={imgUrl} onChange={(event) => setImgUrl(event.target.value)} placeholder="https://example.com/image.jpg" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Văn bản alt (SEO)</label>
                    <input type="text" value={imgAlt} onChange={(event) => setImgAlt(event.target.value)} placeholder={config.keyword || 'Mô tả hình ảnh...'} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tiêu đề ảnh (title)</label>
                    <input type="text" value={imgTitle} onChange={(event) => setImgTitle(event.target.value)} placeholder="Hiển thị khi hover..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Chiều rộng (px)</label>
                      <input type="number" value={imgWidth} onChange={(event) => setImgWidth(event.target.value)} placeholder="auto" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Chiều cao (px)</label>
                      <input type="number" value={imgHeight} onChange={(event) => setImgHeight(event.target.value)} placeholder="auto" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                  {imgUrl && (
                    <img src={imgUrl} alt="preview" className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                  )}
                </div>
              ) : (
                <div>
                  <label
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) handleImgFileUpload(file); }}
                  >
                    <span className="text-xs text-gray-500 mb-1">Kéo thả ảnh vào đây</span>
                    <span className="text-xs text-gray-400">hoặc</span>
                    <span className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded-lg">Chọn file</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleImgFileUpload(file); }} />
                  </label>
                  {imgUrl?.startsWith('data:') && (
                    <div className="mt-3">
                      <img src={imgUrl} alt="preview" className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                      <p className="text-xs text-green-600 mt-1 text-center">✅ Ảnh đã tải lên — nhấn &quot;Chèn ảnh&quot; để chèn vào bài</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => { setShowImgModal(false); setImgUrl(''); setImgAlt(''); setImgTitle(''); setImgWidth(''); setImgHeight(''); setImgModalTab('general'); }} className="flex-1 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Huỷ</button>
              <button onClick={insertImage} disabled={!imgUrl.trim()} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium">Chèn ảnh</button>
            </div>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowLinkModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[440px] overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Chèn / Sửa liên kết</h3>
              <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none w-6 h-6 flex items-center justify-center">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">URL *</label>
                <input type="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && insertLink()} placeholder="https://example.com" autoFocus className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Văn bản hiển thị</label>
                <input type="text" value={linkText} onChange={(event) => setLinkText(event.target.value)} placeholder="Để trống → dùng URL" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tiêu đề (title)</label>
                <input type="text" value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} placeholder="Hiển thị khi hover" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mở link trong</label>
                <select value={linkTarget} onChange={(event) => setLinkTarget(event.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="_self">Cửa sổ hiện tại</option>
                  <option value="_blank">Cửa sổ mới (_blank)</option>
                  <option value="_parent">Khung cha (_parent)</option>
                  <option value="_top">Toàn bộ cửa sổ (_top)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => { setShowLinkModal(false); setLinkUrl(''); setLinkText(''); setLinkTitle(''); setLinkTarget('_self'); }} className="flex-1 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Huỷ</button>
              <button onClick={insertLink} disabled={!linkUrl.trim()} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium">Chèn link</button>
            </div>
          </div>
        </div>
      )}

      {showFindReplace && (
        <div className="absolute top-[104px] left-1/2 -translate-x-1/2 z-40 w-[480px] bg-white rounded-xl shadow-2xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Tìm và thay thế</span>
            <button onClick={closeFindReplace} className="text-gray-400 hover:text-gray-700 text-xl leading-none w-6 h-6 flex items-center justify-center">×</button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input type="text" value={findText} onChange={(event) => { setFindText(event.target.value); setFindCount(null); }} onKeyDown={(event) => event.key === 'Enter' && handleFind()} placeholder="Tìm" autoFocus className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300" />
              <button onClick={handleFind} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400">⌕</button>
            </div>
            <input type="text" value={replaceText} onChange={(event) => setReplaceText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleReplaceOne()} placeholder="Thay bằng" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300" />
            {findCount !== null && (
              <p className={`text-xs ${findCount > 0 ? 'text-gray-500' : 'text-red-500'}`}>
                {findCount > 0 ? `Tìm thấy ${findCount} kết quả` : 'Không tìm thấy kết quả nào'}
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <div className="relative">
                <button onClick={() => setShowFindOpts(!showFindOpts)} className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs transition-colors ${showFindOpts ? 'bg-gray-100 border-gray-300' : 'border-gray-200 hover:bg-gray-50'} text-gray-500`}>
                  ⚙ <span className="text-[10px]">▾</span>
                </button>
                {showFindOpts && (
                  <div className="absolute bottom-full left-0 mb-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                    {[
                      { label: 'Phân biệt hoa thường', state: matchCase, set: setMatchCase },
                      { label: 'Chỉ tìm nguyên từ', state: wholeWord, set: setWholeWord },
                      { label: 'Tìm trong vùng chọn', state: findInSel, set: setFindInSel },
                    ].map((option) => (
                      <button
                        key={option.label}
                        onClick={() => { option.set(!option.state); setFindCount(null); }}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${option.state ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <span>{option.label}</span>
                        {option.state && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1" />
              <button onClick={handleFind} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Tìm</button>
              <button onClick={handleReplaceOne} disabled={!findText.trim()} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">Thay</button>
              <button onClick={handleReplaceAll} disabled={!findText.trim()} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">Thay tất cả</button>
            </div>
          </div>
        </div>
      )}

      {showSourceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]" onClick={() => setShowSourceModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-[90%] max-w-5xl max-h-[90vh] flex flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Mã nguồn</h2>
              <button onClick={() => setShowSourceModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <textarea
                value={sourceCode}
                onChange={(event) => setSourceCode(event.target.value)}
                className="w-full h-full min-h-[500px] font-mono text-sm border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setShowSourceModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">Huỷ</button>
              <button onClick={applySourceCode} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
