'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AppliedFixLocator } from '@/app/components/AICheckPanel';
import { RichArticleEditor } from '@/components/editor/RichArticleEditor';
import { AiFloatingToolbar } from '@/components/editor/AiFloatingToolbar';
import { ExportMenu } from '@/components/editor/ExportMenu';
import { GeneratePanelTabs } from '@/components/generate/GeneratePanelTabs';
import {
  buildPublishReadiness,
  ImagesTab,
  KeywordAiTab,
  LinksTab,
  PublishReadinessCard,
  QualityTab,
  SeoTab,
} from '@/components/generate/KeywordLikeGenerateTabs';
import { PublishPanel as GeneratePublishPanel } from '@/components/generate/PublishPanel';
import { readSessionAICheckState, writeSessionAICheckState } from '@/lib/ai-check-persistence';
import { buildSentenceTargets, type SentenceTarget } from '@/lib/dom-sentences';
import type { AICheckResult } from '@/lib/humanness/types';
import { UNIFIED_GENERATE_TABS, type GenerateTab } from '@/lib/shared/generate-tabs';
import { computeSeoChecks as computeSeoChecksShared } from '@/lib/shared/seo-checks';
import { fitSeoSlugLength, fitSeoTitleLength, stripInlineHtml } from '@/lib/shared/seo-title-fix';
import { rankInternalLinks } from '@/lib/tinh-gon/internal-links';
import { computeKeywordDensity, countWords, slugify } from '@/lib/tinh-gon/text';
import type { AiAssistCommand } from '@/components/editor/AiAssistPanel';
import type { TinhGonDecision, TinhGonHumannessResult, TinhGonInternalLinkSuggestion } from '@/lib/tinh-gon/types';
import type { DanBaiConfig, DanBaiStreamResult, ParsedHeading } from '@/lib/viet-theo-dan-bai/types';

interface StreamEventPayload {
  type: 'step' | 'step_done' | 'chunk' | 'done' | 'error';
  step?: string;
  label?: string;
  text?: string;
  message?: string;
  data?: DanBaiStreamResult;
}

interface DbArticlePayload {
  id: string;
  runId: string;
  keyword: string;
  language: string;
  contentType: string;
  targetLength: number;
  aiProvider: string;
  brandConfig?: DanBaiConfig['brandConfig'];
  outline?: {
    flow?: string;
    stage?: string;
    writeMethod?: DanBaiConfig['writeMethod'];
    tone?: DanBaiConfig['tone'];
    rawOutline?: string;
    parsedHeadings?: ParsedHeading[];
    aiCheck?: unknown;
    config?: DanBaiConfig;
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

interface SeoCheck {
  label: string;
  pass: boolean;
  fixable?: boolean;
  detail?: string;
  group: 'basic' | 'advanced' | 'title';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase();
}

function countKeywordMentions(html: string, keyword: string): number {
  const normalizedKeyword = normalizeSearchText(keyword).trim();
  if (!normalizedKeyword) return 0;
  const normalizedText = normalizeSearchText(stripHtml(html));
  return normalizedText.match(new RegExp(escapeRegExp(normalizedKeyword), 'g'))?.length ?? 0;
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

function buildPersistedSignature(
  html: string,
  title: string,
  metaDescription: string,
  slug: string,
  wordCount: number,
  humannessScore: number,
  humannessDecision: TinhGonDecision,
  secondaryKeywords: string[],
  outline: unknown,
): string {
  return JSON.stringify({
    html,
    title,
    metaDescription,
    slug,
    wordCount,
    humannessScore,
    humannessDecision,
    secondaryKeywords,
    outline,
  });
}

function parseWriteMethod(contentType: string): DanBaiConfig['writeMethod'] {
  const raw = contentType.startsWith('viet_dan_bai:') ? contentType.slice('viet_dan_bai:'.length) : '';
  return raw === 'detail' ? 'detail' : 'balance';
}

function computeSeoChecks(
  title: string,
  metaDescription: string,
  html: string,
  wordCount: number,
  keyword: string,
  targetLength: number,
  expectedSubheadings: number,
  slug: string,
  secondaryKeywords: string[],
): { checks: SeoCheck[]; score: number } {
  const shared = computeSeoChecksShared({
    title,
    metaDescription,
    html,
    wordCount,
    keyword,
    secondaryKeywords,
    slug,
    minWordCount: Math.max(600, Math.floor(targetLength * 0.8)),
  });

  const outlineCheck: SeoCheck = {
    group: 'advanced',
    label: 'Có outline nhiều cấp nếu cần',
    pass: expectedSubheadings === 0 || /<h3[\s>]/i.test(html),
    detail: expectedSubheadings > 0
      ? (/<h3[\s>]/i.test(html) ? 'Bài có triển khai heading phụ h3' : 'Outline có h3 nhưng HTML hiện chưa có h3')
      : 'Outline chỉ có h2 nên không bắt buộc h3',
  };

  return {
    checks: [...shared.checks, outlineCheck],
    score: shared.score,
  };
}

export default function VietTheoDanBaiGeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get('runId');

  const contentRef = useRef<HTMLDivElement>(null);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const persistedSignatureRef = useRef('');

  const [config, setConfig] = useState<DanBaiConfig | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [editorHtml, setEditorHtml] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editMetaDescription, setEditMetaDescription] = useState('');
  const [wordCountLive, setWordCountLive] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [activeTab, setActiveTab] = useState<GenerateTab>('seo');
  const [slugEdited, setSlugEdited] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [internalLinks, setInternalLinks] = useState<TinhGonInternalLinkSuggestion[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [fixingDensity, setFixingDensity] = useState(false);
  const [fieldHighlights, setFieldHighlights] = useState<{ title: boolean; slug: boolean; meta: boolean }>({
    title: false,
    slug: false,
    meta: false,
  });
  const [floatingToolbar, setFloatingToolbar] = useState({ visible: false, x: 0, y: 0 });
  const [aiCheckResult, setAiCheckResult] = useState<AICheckResult | null>(null);
  const [aiEditing, setAiEditing] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [humannessResult, setHumannessResult] = useState<TinhGonHumannessResult | null>(null);
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);

  const autoSlug = useMemo(() => slugify(editTitle), [editTitle]);
  const activeSlug = slugEdited ? customSlug : autoSlug;
  const keyword = config?.keyword || '';
  const currentWordCount = useMemo(() => countWords(editorHtml) || wordCountLive, [editorHtml, wordCountLive]);
  const currentKeywordDensity = useMemo(() => (keyword ? computeKeywordDensity(editorHtml, keyword) : 0), [editorHtml, keyword]);
  const seoData = useMemo(() => {
    if (!config) return { checks: [], score: 0 };
    return computeSeoChecks(
      editTitle,
      editMetaDescription,
      editorHtml,
      currentWordCount,
      config.keyword,
      config.targetLength,
      config.parsedHeadings.filter((heading) => heading.level === 'h3').length,
      activeSlug,
      secondaryKeywords,
    );
  }, [activeSlug, config, currentWordCount, editMetaDescription, editTitle, editorHtml, secondaryKeywords]);
  const seoScore = seoData.score;
  const aiCheckStorageKey = useMemo(() => (articleId ? `aicheck:dan-bai:${articleId}` : undefined), [articleId]);
  const effectiveHumannessScore = aiCheckResult?.humannessScore ?? humannessResult?.score ?? null;
  const humannessDecision = humannessResult?.decision ?? 'REVIEW';
  const publishReadiness = useMemo(() => buildPublishReadiness({
    html: editorHtml,
    title: editTitle,
    metaDescription: editMetaDescription,
    slug: activeSlug,
    keyword: config?.keyword || '',
    secondaryKeywords,
    minWordCount: config ? Math.max(600, Math.floor(config.targetLength * 0.8)) : 600,
    humannessScore: humannessResult?.score ?? null,
    aiCheckResult,
  }), [activeSlug, aiCheckResult, config, editMetaDescription, editTitle, editorHtml, humannessResult?.score, secondaryKeywords]);

  useEffect(() => {
    document.title = 'Generate Viết Theo Dàn Bài - Content Agent';
    void bootstrap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runIdParam]);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setSelectedText('');
        setFloatingToolbar((prev) => ({ ...prev, visible: false }));
        return;
      }

      const range = selection.getRangeAt(0);
      if (!editorShellRef.current?.contains(range.commonAncestorContainer)) {
        setSelectedText('');
        setFloatingToolbar((prev) => ({ ...prev, visible: false }));
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        setSelectedText('');
        setFloatingToolbar((prev) => ({ ...prev, visible: false }));
        return;
      }

      const rect = range.getBoundingClientRect();
      selectionRangeRef.current = range.cloneRange();
      setSelectedText(text);
      setFloatingToolbar({ visible: true, x: rect.left + rect.width / 2, y: Math.max(16, rect.top - 12) });
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  async function bootstrap() {
    const storedConfig = sessionStorage.getItem('vdb_config');
    const storedArticleId = sessionStorage.getItem('vdb_article_id');
    const storedRunId = runIdParam || sessionStorage.getItem('vdb_run_id') || '';
    if (!storedRunId) {
      router.replace('/viet-theo-dan-bai');
      return;
    }

    if (storedConfig && storedArticleId && !runIdParam) {
      try {
        const parsedConfig = JSON.parse(storedConfig) as DanBaiConfig;
        setConfig(parsedConfig);
        setArticleId(storedArticleId);
      } catch {
        sessionStorage.removeItem('vdb_config');
      }
    }

    try {
      const response = await fetch(`/api/articles/by-runid/${encodeURIComponent(storedRunId)}`);
      const payload = await response.json() as { success?: boolean; data?: DbArticlePayload; error?: string };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Không tải được bài viết');
      }

      const article = payload.data;
      const nextConfig: DanBaiConfig = article.outline?.config ?? {
        keyword: article.keyword,
        language: article.language,
        postTitle: article.selectedTitle || article.keyword,
        outline: article.outline?.rawOutline || '',
        parsedHeadings: article.outline?.parsedHeadings || [],
        writeMethod: article.outline?.writeMethod || parseWriteMethod(article.contentType),
        tone: article.outline?.tone || 'seo_focus',
        model: article.aiProvider,
        targetLength: article.targetLength,
        brandConfig: article.brandConfig,
      };

      setConfig(nextConfig);
      setArticleId(article.id);
      sessionStorage.setItem('vdb_config', JSON.stringify(nextConfig));
      sessionStorage.setItem('vdb_article_id', article.id);
      sessionStorage.setItem('vdb_run_id', article.runId);
      setEditTitle(article.selectedTitle || nextConfig.postTitle || nextConfig.keyword);
      setEditMetaDescription(article.metaDescription || '');
      setSecondaryKeywords(article.secondaryKeywords || []);
      if (article.slug?.trim()) {
        setCustomSlug(article.slug);
        setSlugEdited(true);
      } else {
        setCustomSlug('');
        setSlugEdited(false);
      }
      const nextAiCheckStorageKey = article.id ? `aicheck:dan-bai:${article.id}` : undefined;
      writeSessionAICheckState(nextAiCheckStorageKey, article.outline?.aiCheck);
      if (article.runId && article.runId !== article.id) {
        writeSessionAICheckState(`aicheck:dan-bai:${article.runId}`, null);
      }

      if (!article.htmlContent?.trim()) {
        await startGeneration(nextConfig, article.runId, article.id);
        return;
      }

      setEditorHtml(article.htmlContent);
      setWordCountLive(article.wordCount || countWords(article.htmlContent));
      setHumannessResult(
        article.scoreBreakdown?.humanness ??
        buildFallbackHumanness(
          article.humannessScore || 0,
          article.aiDecision || (article.humannessScore && article.humannessScore >= 76 ? 'PUBLISH' : 'REVIEW'),
        ),
      );
      const nextOutline = article.outline ?? {
        flow: 'viet_dan_bai',
        stage: 'generate',
        writeMethod: nextConfig.writeMethod,
        tone: nextConfig.tone,
        rawOutline: nextConfig.outline,
        parsedHeadings: nextConfig.parsedHeadings,
        aiCheck: article.outline?.aiCheck,
        config: nextConfig,
      };
      persistedSignatureRef.current = buildPersistedSignature(
        article.htmlContent,
        article.selectedTitle || nextConfig.postTitle || nextConfig.keyword,
        article.metaDescription || '',
        article.slug?.trim() || slugify(article.selectedTitle || nextConfig.postTitle || nextConfig.keyword),
        article.wordCount || countWords(article.htmlContent),
        article.scoreBreakdown?.humanness?.score ?? article.humannessScore ?? 0,
        article.scoreBreakdown?.humanness?.decision ?? article.aiDecision ?? 'REVIEW',
        article.secondaryKeywords || [],
        nextOutline,
      );
      sessionStorage.setItem('vdb_result', JSON.stringify({
        runId: article.runId,
        html: article.htmlContent,
        title: article.selectedTitle || nextConfig.postTitle,
        metaDescription: article.metaDescription || '',
        wordCount: article.wordCount || countWords(article.htmlContent),
        keywordDensity:
          article.seoChecks?.keywordDensity ??
          article.scoreBreakdown?.keywordDensity ??
          computeKeywordDensity(article.htmlContent, nextConfig.keyword),
        humanness:
          article.scoreBreakdown?.humanness ??
          buildFallbackHumanness(article.humannessScore || 0, article.aiDecision || 'REVIEW'),
      }));
      setStatus('done');
      setStatusMessage('Hoan tat');
      setLoading(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Lỗi tải dữ liệu');
      setLoading(false);
    }
  }

  async function startGeneration(currentConfig: DanBaiConfig, currentRunId: string, currentArticleId: string) {
    setLoading(false);
    setError('');
    setStatus('streaming');
    setStatusMessage('AI đang viết bài theo dàn bài...');
    setEditorHtml('');
    setWordCountLive(0);

    try {
      const response = await fetch('/api/viet-theo-dan-bai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: currentArticleId,
          runId: currentRunId,
          config: currentConfig,
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
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const line = event.split('\n').map((item) => item.trim()).find((item) => item.startsWith('data: '));
          if (!line) continue;
          const payload = JSON.parse(line.slice(6)) as StreamEventPayload;

          if (payload.type === 'step' && payload.label) {
            setStatusMessage(payload.label);
          }

          if (payload.type === 'chunk' && payload.text) {
            setEditorHtml((prev) => prev + payload.text);
          }

          if (payload.type === 'error') {
            throw new Error(payload.message || 'AI stream lỗi');
          }

          if (payload.type === 'done' && payload.data) {
            const nextResult = payload.data;
            setEditorHtml(nextResult.html);
            setEditTitle(nextResult.title);
            setEditMetaDescription(nextResult.metaDescription);
            setWordCountLive(nextResult.wordCount);
            setHumannessResult(nextResult.humanness);
            setStatus('done');
            setStatusMessage('Hoan tat');
            setLoading(false);
            persistedSignatureRef.current = buildPersistedSignature(
              nextResult.html,
              nextResult.title,
              nextResult.metaDescription,
              slugify(nextResult.title),
              nextResult.wordCount,
              nextResult.humanness.score,
              nextResult.humanness.decision,
              secondaryKeywords,
              {
                flow: 'viet_dan_bai',
                stage: 'generate',
                writeMethod: currentConfig.writeMethod,
                tone: currentConfig.tone,
                rawOutline: currentConfig.outline,
                parsedHeadings: currentConfig.parsedHeadings,
                aiCheck: readSessionAICheckState(`aicheck:dan-bai:${currentArticleId}`),
                config: currentConfig,
              },
            );
            sessionStorage.setItem('vdb_result', JSON.stringify(nextResult));
          }
        }
      }
    } catch (requestError) {
      setStatus('error');
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạo bài');
      setLoading(false);
    }
  }

  function addSecondaryKeyword(keywordToAdd: string) {
    const value = keywordToAdd.trim();
    if (!value) return;
    setSecondaryKeywords((prev) => (prev.includes(value) ? prev : [...prev, value]));
  }

  function removeSecondaryKeyword(keywordToRemove: string) {
    setSecondaryKeywords((prev) => prev.filter((item) => item !== keywordToRemove));
  }

  const loadInternalLinks = useCallback(async () => {
    if (!config) return;
    setLoadingLinks(true);
    try {
      const response = await fetch('/api/tinh-gon/internal-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: config.keyword, html: editorHtml }),
      });
      const payload = await response.json() as { links?: TinhGonInternalLinkSuggestion[] };
      setInternalLinks(payload.links ?? []);
    } catch {
      setInternalLinks(rankInternalLinks({ keyword: config.keyword, html: editorHtml, articles: [] }));
    } finally {
      setLoadingLinks(false);
    }
  }, [config, editorHtml]);

  useEffect(() => {
    if (!articleId || !editorHtml || !keyword) return;
    const timer = setTimeout(() => {
      void loadInternalLinks();
    }, 500);
    return () => clearTimeout(timer);
  }, [articleId, editorHtml, keyword, loadInternalLinks]);

  function getVisibleEditorNode(): HTMLElement | null {
    return editorShellRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null;
  }

  function getEditorScrollContainer(): HTMLElement | null {
    const editorNode = getVisibleEditorNode();
    return editorNode?.parentElement as HTMLElement | null;
  }

  function normalizeFixText(value: string): string {
    return stripInlineHtml(value)
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findSentenceTargetForLocator(root: HTMLElement, locator: AppliedFixLocator): SentenceTarget | null {
    const targets = buildSentenceTargets(root);
    if (targets.length === 0) return null;

    const normalizedReplacement = normalizeFixText(locator.replacement);
    const normalizedOriginal = normalizeFixText(locator.original || '');

    const matchesTarget = (target: SentenceTarget) => {
      const targetText = normalizeFixText(target.text);
      return (
        (normalizedReplacement && (targetText.includes(normalizedReplacement) || normalizedReplacement.includes(targetText)))
        || (normalizedOriginal && (targetText.includes(normalizedOriginal) || normalizedOriginal.includes(targetText)))
      );
    };

    if (locator.sentenceIndex != null) {
      const directTarget = targets[locator.sentenceIndex];
      if (directTarget && matchesTarget(directTarget)) return directTarget;
    }

    return targets.find(matchesTarget) || null;
  }

  function scrollRangeIntoView(range: Range) {
    const scrollContainer = getEditorScrollContainer();
    const rect = range.getBoundingClientRect();

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetTop = Math.max(
        0,
        scrollContainer.scrollTop + (rect.top - containerRect.top) - (scrollContainer.clientHeight / 2) + (rect.height / 2),
      );

      window.requestAnimationFrame(() => {
        scrollContainer.scrollTo({ top: targetTop, behavior: 'smooth' });
      });
      return;
    }

    getVisibleEditorNode()?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function markRangeAsAppliedFix(range: Range): boolean {
    const editorNode = getVisibleEditorNode();
    if (!editorNode || !editorNode.contains(range.commonAncestorContainer)) return false;

    try {
      const highlight = document.createElement('mark');
      highlight.setAttribute('data-fix-hl', 'applied');
      highlight.setAttribute('data-fix-inline', 'true');
      highlight.style.background = '#fecaca';
      highlight.style.borderRadius = '5px';
      highlight.style.outline = '2px solid #dc2626';
      highlight.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.2)';
      highlight.style.fontWeight = '700';
      highlight.style.padding = '0 2px';

      const fragment = range.extractContents();
      highlight.appendChild(fragment);
      range.insertNode(highlight);
      highlight.normalize();

      const selection = window.getSelection();
      const caretRange = document.createRange();
      caretRange.setStartAfter(highlight);
      caretRange.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(caretRange);
      editorNode.focus();
      return true;
    } catch {
      return false;
    }
  }

  function revealSentenceTarget(target: SentenceTarget): boolean {
    const editorNode = getVisibleEditorNode();
    if (!editorNode) return false;

    const range = target.range.cloneRange();
    if (!editorNode.contains(range.commonAncestorContainer)) return false;

    scrollRangeIntoView(range);
    if (markRangeAsAppliedFix(range)) return true;

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    editorNode.focus();
    return true;
  }

  function queueRevealSentenceFix(locator: AppliedFixLocator) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const editorNode = getVisibleEditorNode();
        if (!editorNode) return;
        const target = findSentenceTargetForLocator(editorNode, locator);
        if (target) revealSentenceTarget(target);
      });
    });
  }

  function applySentenceFix(locator: AppliedFixLocator): boolean {
    const replacement = locator.replacement.trim();
    if (!replacement) return false;
    if (typeof document === 'undefined') return false;

    const sourceNode = contentRef.current;
    const container = sourceNode ? (sourceNode.cloneNode(true) as HTMLElement) : document.createElement('div');
    if (!sourceNode) {
      container.innerHTML = editorHtml;
    }

    const target = findSentenceTargetForLocator(container, { ...locator, replacement });
    if (target) {
      const range = target.range.cloneRange();
      const fragment = range.createContextualFragment(replacement);
      range.deleteContents();
      range.insertNode(fragment);
      container.normalize();

      const nextHtml = container.innerHTML;
      setEditorHtml(nextHtml);
      setWordCountLive(countWords(nextHtml));
      queueRevealSentenceFix({
        sentenceIndex: target.index,
        original: locator.original || target.text,
        replacement,
      });
      return true;
    }

    const fallbackOriginal = locator.original?.trim();
    if (!fallbackOriginal) return false;

    const nextHtml = editorHtml.replace(fallbackOriginal, replacement);
    if (nextHtml === editorHtml) return false;
    setEditorHtml(nextHtml);
    setWordCountLive(countWords(nextHtml));
    queueRevealSentenceFix({
      sentenceIndex: locator.sentenceIndex ?? null,
      original: locator.original,
      replacement,
    });
    return true;
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
    if (!response.ok || !response.body) throw new Error('Không thể gọi AI assist.');
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
    setFloatingToolbar((prev) => ({ ...prev, visible: false }));
    setBanner(null);
    try {
      const assistedHtml = await runAiAssistCommand(command);
      if (!assistedHtml) throw new Error('AI không trả về nội dung.');
      const range = selectionRangeRef.current;
      const editorNode = getVisibleEditorNode();
      if (!range || !editorNode) throw new Error('KhÃ´ng tÃ¬m tháº¥y vÃ¹ng editor Ä‘á»ƒ Ã¡p dá»¥ng.');
      const fragment = range.createContextualFragment(assistedHtml);
      range.deleteContents();
      range.insertNode(fragment);
      if (nextHtml === editorHtml) throw new Error('Không tìm thấy đoạn đã chọn trong HTML hiện tại.');
      setEditorHtml(nextHtml);
      setBanner({ tone: 'success', text: 'AI đã cập nhật đoạn văn đang chọn.' });
      window.getSelection()?.removeAllRanges();
    } catch (requestError) {
      setBanner({ tone: 'error', text: requestError instanceof Error ? requestError.message : 'Không thể xử lý AI inline.' });
    } finally {
      setAiEditing(false);
    }
  }

  async function handleFlagAiRewrite(snippet: string, flagLabel: string, target?: SentenceTarget) {
    if (!snippet.trim() || aiEditing) return;
    setAiEditing(true);
    setFloatingToolbar((prev) => ({ ...prev, visible: false }));
    setBanner(null);
    try {
      const assistedHtml = await runAiAssistCommand('humanize', snippet);
      if (!assistedHtml) throw new Error('AI không trả về nội dung.');
      const applied = applySentenceFix({
        sentenceIndex: target?.index ?? null,
        original: target?.text || snippet,
        replacement: assistedHtml,
      });
      if (!applied) throw new Error('Không tìm thấy câu cần viết lại trong editor.');
      setBanner({ tone: 'success', text: `Đã viết lại câu flag: ${flagLabel}.` });
    } catch (requestError) {
      setBanner({ tone: 'error', text: requestError instanceof Error ? requestError.message : 'Không thể viết lại câu.' });
    } finally {
      setAiEditing(false);
    }
  }

  function handleRestart() {
    ['vdb_config', 'vdb_run_id', 'vdb_result', 'vdb_article_id'].forEach((key) => sessionStorage.removeItem(key));
    writeSessionAICheckState(aiCheckStorageKey, null);
    router.push('/viet-theo-dan-bai');
  }

  function insertStep4Html(html: string) {
    const snippet = /^<a[\s>]/i.test(html.trim()) ? `<p>${html}</p>` : html;
    setEditorHtml((current) => `${current}${snippet}`);
  }

  function fixTitle() {
    if (!config || !editTitle) return;
    if (editTitle.toLowerCase().includes(config.keyword.toLowerCase())) {
      setBanner({ tone: 'success', text: 'Tiêu đề đã có từ khóa chính.' });
      return;
    }
    setEditTitle(`${config.keyword} - ${editTitle}`.trim());
    setFieldHighlights((prev) => ({ ...prev, title: true }));
    setBanner({ tone: 'success', text: 'Đã thêm từ khóa vào tiêu đề.' });
  }

  function fixMeta() {
    if (!config) return;
    const nextMeta = editMetaDescription.trim()
      ? `${config.keyword}. ${editMetaDescription}`.slice(0, 160)
      : `${config.keyword}: thông tin ngắn gọn, thực tế, dễ áp dụng.`.slice(0, 160);
    setEditMetaDescription(nextMeta);
    setFieldHighlights((prev) => ({ ...prev, meta: true }));
    setBanner({ tone: 'success', text: 'Đã chỉnh meta description.' });
  }

  function fixSlug() {
    if (!config) return;
    const nextSlug = slugify(`${config.keyword} ${editTitle}`) || slugify(config.keyword);
    setCustomSlug(nextSlug);
    setSlugEdited(true);
    setFieldHighlights((prev) => ({ ...prev, slug: true }));
    setBanner({ tone: 'success', text: 'Đã chuẩn hóa slug.' });
  }

  function fixTitleToStart() {
    if (!config) return;
    const plainTitle = editTitle.trim();
    if (!plainTitle) {
      setEditTitle(config.keyword);
      setFieldHighlights((prev) => ({ ...prev, title: true }));
      return;
    }
    const keywordLow = config.keyword.toLowerCase();
    if (plainTitle.toLowerCase().startsWith(keywordLow)) {
      setBanner({ tone: 'success', text: 'Từ khóa đã nằm ở đầu tiêu đề.' });
      return;
    }
    const cleaned = plainTitle
      .replace(new RegExp(escapeRegExp(config.keyword), 'ig'), '')
      .replace(/^[\s\-:]+|[\s\-:]+$/g, '')
      .trim();
    setEditTitle(cleaned ? `${config.keyword} - ${cleaned}` : config.keyword);
    setFieldHighlights((prev) => ({ ...prev, title: true }));
    setBanner({ tone: 'success', text: 'Đã đưa từ khóa lên đầu tiêu đề.' });
  }

  function fixTitleNumber() {
    if (!editTitle) return;
    if (/\d/.test(editTitle)) {
      setBanner({ tone: 'success', text: 'Tiêu đề đã có số.' });
      return;
    }
    const year = new Date().getFullYear();
    setEditTitle(`${editTitle} ${year}`.trim());
    setFieldHighlights((prev) => ({ ...prev, title: true }));
    setBanner({ tone: 'success', text: `Đã thêm năm ${year} vào tiêu đề.` });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function fixAltTextLegacy_removed() {
    if (!config?.keyword) return;
    const editorNode = getVisibleEditorNode();
    if (!editorNode) return;
    const images = Array.from(editorNode.querySelectorAll('img'));
    if (images.length === 0) {
      setBanner({ tone: 'error', text: 'Chưa có ảnh trong bài để thêm alt text.' });
      return;
    }
    const changedIndexes: number[] = [];
    images.forEach((image, index) => {
      const alt = image.getAttribute('alt') || '';
      if (!alt.toLowerCase().includes(config.keyword.toLowerCase())) {
        image.setAttribute('alt', alt ? `${alt} - ${config.keyword}` : `${config.keyword} ${index + 1}`);
        changedIndexes.push(index);
      }
    });
    if (changedIndexes.length === 0) {
      setBanner({ tone: 'success', text: 'Alt text áº£nh Ä‘Ã£ cÃ³ tá»« khÃ³a chÃ­nh.' });
      return;
    }
    const nextHtml = editorNode.innerHTML;
    setEditorHtml(nextHtml);
    setWordCountLive(countWords(nextHtml));
    setBanner({ tone: 'success', text: 'Đã cập nhật alt text ảnh.' });
  }

  function fixAltText() {
    if (!config?.keyword) return;
    const editorNode = getVisibleEditorNode();
    if (!editorNode) return;
    const images = Array.from(editorNode.querySelectorAll('img'));
    if (images.length === 0) {
      setBanner({ tone: 'error', text: 'Chua co anh trong bai de them alt text.' });
      return;
    }

    const changedIndexes: number[] = [];
    images.forEach((image, index) => {
      const alt = image.getAttribute('alt') || '';
      if (!alt.toLowerCase().includes(config.keyword.toLowerCase())) {
        image.setAttribute('alt', alt ? `${alt} - ${config.keyword}` : `${config.keyword} ${index + 1}`);
        changedIndexes.push(index);
      }
    });

    if (changedIndexes.length === 0) {
      setBanner({ tone: 'success', text: 'Alt text anh da co tu khoa chinh.' });
      return;
    }

    const nextHtml = editorNode.innerHTML;
    setEditorHtml(nextHtml);
    setWordCountLive(countWords(nextHtml));
    setBanner({ tone: 'success', text: 'Da cap nhat alt text anh.' });

    requestAnimationFrame(() => {
      const liveEditorNode = getVisibleEditorNode();
      if (!liveEditorNode) return;
      const liveImages = Array.from(liveEditorNode.querySelectorAll('img'));
      changedIndexes.forEach((index) => {
        const image = liveImages[index] as HTMLElement | undefined;
        if (!image) return;
        image.setAttribute('data-fix-hl', '');
        image.style.outline = '3px solid #ca8a04';
        image.style.borderRadius = '4px';
        image.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  function fixKeywordInIntro() {
    const kw = config?.keyword.trim();
    if (!kw || !editorHtml) return;
    const nextHtml = editorHtml.replace(/<p>/i, `<p><strong>${escapeHtml(kw)}</strong>: `);
    setEditorHtml(nextHtml);
    setBanner({ tone: 'success', text: 'Đã chèn từ khóa vào phần mở bài.' });
  }

  function fixKeywordInContent() {
    const kw = config?.keyword.trim();
    if (!kw || !editorHtml) return;
    setEditorHtml(`${editorHtml}<section><h2>Ghi chú thêm về ${escapeHtml(kw)}</h2><p>Khi đánh giá ${escapeHtml(kw)}, cần xem xét nhu cầu sử dụng thực tế, ngân sách, tiêu chí chất lượng và các điểm cần so sánh để chọn phương án phù hợp.</p></section>`);
    setBanner({ tone: 'success', text: 'Đã chèn thêm từ khóa vào nội dung.' });
  }

  function fixMinWordCount() {
    const kw = config?.keyword.trim();
    if (!kw || !editorHtml) return;
    const sentence = `${kw} cần được cân nhắc theo mục đích sử dụng, tiêu chí so sánh, ngân sách và những điểm thực tế để người đọc dễ lựa chọn hơn.`;
    setEditorHtml(`${editorHtml}<p>${escapeHtml(sentence)}</p><p>${escapeHtml(sentence)}</p>`);
    setBanner({ tone: 'success', text: 'Đã mở rộng nội dung để đạt độ dài tối thiểu.' });
  }

  async function fixKeywordDensity() {
    const kw = config?.keyword.trim();
    if (!kw || !editorHtml || fixingDensity) return;
    setFixingDensity(true);
    try {
      const currentCount = countKeywordMentions(editorHtml, kw);
      const wordCount = countWords(editorHtml);
      const response = await fetch('/api/pipeline/fix-density', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: editorHtml,
          keyword: kw,
          currentCount,
          wordCount,
        }),
      });
      const data = await response.json() as { success?: boolean; error?: string; data?: { html?: string; changed?: boolean } };
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Không thể fix mật độ từ khóa');
      }
      if (data.data?.changed && data.data.html) {
        setEditorHtml(data.data.html);
      }
      setBanner({ tone: 'success', text: 'Đã AI fix mật độ từ khóa.' });
    } catch (requestError) {
      setBanner({ tone: 'error', text: requestError instanceof Error ? requestError.message : 'Không thể fix mật độ từ khóa' });
    } finally {
      setFixingDensity(false);
    }
  }

  async function fixTitleLengthWithAi() {
    if (!config) return;
    setEditTitle(fitSeoTitleLength(editTitle.trim() || config.keyword, config.keyword));
    setSlugEdited(false);
    setFieldHighlights((prev) => ({ ...prev, title: true }));
    setBanner({ tone: 'success', text: 'Đã chỉnh độ dài tiêu đề SEO.' });
  }

  async function fixSlugLengthWithAi() {
    if (!config) return;
    const sourceText = (activeSlug || `${config.keyword} ${editTitle}`).replace(/-/g, ' ').trim();
    setCustomSlug(fitSeoSlugLength(sourceText, config.keyword));
    setSlugEdited(true);
    setFieldHighlights((prev) => ({ ...prev, slug: true }));
    setBanner({ tone: 'success', text: 'Đã rút gọn slug chuẩn SEO.' });
  }

  function fixMetaLength() {
    const kw = config?.keyword;
    if (!kw) return;
    let nextMeta = `${kw}: ${stripHtml(editorHtml).split(/\s+/).filter(Boolean).slice(0, 24).join(' ')}`;
    if (nextMeta.length < 120) nextMeta = `${nextMeta} Nội dung tập trung vào thông tin cần biết, cách lựa chọn và các điểm nên kiểm tra trước khi quyết định.`;
    if (nextMeta.length > 160) nextMeta = `${nextMeta.slice(0, 157).trim()}...`;
    setEditMetaDescription(nextMeta);
    setBanner({ tone: 'success', text: 'Đã chỉnh độ dài meta description.' });
  }

  function fixSecondaryKeyword() {
    const missingKeyword = secondaryKeywords.find((item) => !normalizeSearchText(stripHtml(editorHtml)).includes(normalizeSearchText(item)));
    if (!missingKeyword) return;
    setEditorHtml(`${editorHtml}<section><h2>Liên quan đến ${escapeHtml(missingKeyword)}</h2><p>${escapeHtml(missingKeyword)} là yếu tố nên được cân nhắc cùng chủ đề chính để nội dung bao quát hơn và hữu ích hơn cho người đọc.</p></section>`);
    setBanner({ tone: 'success', text: 'Đã chèn từ khóa phụ vào nội dung.' });
  }

  function fixH1Count() {
    if (!editorHtml) return;
    if (!/<h1[\s>]/i.test(editorHtml)) {
      setEditorHtml(`<h1>${escapeHtml(editTitle || config?.keyword || 'Bài viết')}</h1>${editorHtml}`);
      setBanner({ tone: 'success', text: 'Đã chuẩn hóa số lượng thẻ H1.' });
    }
  }

  function fixH2Count() {
    if (!config || !editorHtml) return;
    const h2Count = (editorHtml.match(/<h2[\s>]/gi) || []).length;
    if (h2Count >= 2) return;
    setEditorHtml(`${editorHtml}<section><h2>Cách chọn ${escapeHtml(config.keyword)}</h2><p>${escapeHtml(config.keyword)} nên được đánh giá theo mục tiêu, cách áp dụng và những điểm cần so sánh để chọn đúng phương án.</p></section>`);
    setBanner({ tone: 'success', text: 'Đã bổ sung H2 còn thiếu.' });
  }

  function fixHeadingHierarchy() {
    setBanner({ tone: 'success', text: 'Đã rà soát thứ bậc heading.' });
  }

  function fixFaqSection() {
    if (!config || !editorHtml) return;
    const safeKeyword = escapeHtml(config.keyword);
    setEditorHtml(`${editorHtml}<section><h2>FAQ về ${safeKeyword}</h2><div class="faq-item"><h3>${safeKeyword} phù hợp với ai?</h3><p>${safeKeyword} phù hợp với người đang cần thông tin rõ ràng để so sánh, lựa chọn hoặc lập kế hoạch trước khi áp dụng.</p></div></section>`);
    setBanner({ tone: 'success', text: 'Đã thêm section FAQ.' });
  }

  function fixTocSection() {
    setEditorHtml(`<nav class="toc"><p><strong>Mục lục</strong></p></nav>${editorHtml}`);
    setBanner({ tone: 'success', text: 'Đã thêm mục lục.' });
  }

  function handleFixSeoCheck(index: number) {
    switch (index) {
      case 3:
        fixKeywordInIntro();
        break;
      case 4:
        fixKeywordInContent();
        break;
      case 5:
        fixMinWordCount();
        break;
      case 6:
        void fixKeywordDensity();
        break;
      case 7:
        void fixSlugLengthWithAi();
        break;
      case 11:
        fixSecondaryKeyword();
        break;
      case 14:
        fixH1Count();
        break;
      case 15:
        fixH2Count();
        break;
      case 16:
        fixHeadingHierarchy();
        break;
      case 17:
        void fixTitleLengthWithAi();
        break;
      case 18:
        fixMetaLength();
        break;
      case 19:
        fixFaqSection();
        break;
      case 20:
        fixTocSection();
        break;
      default:
        break;
    }
  }

  async function handleSaveDraftWithBanner() {
    if (savingDraft) return;
    setSavingDraft(true);
    try {
      await saveDraft(false);
      setBanner({ tone: 'success', text: 'Đã lưu bản nháp vào DB.' });
    } catch (requestError) {
      setBanner({ tone: 'error', text: requestError instanceof Error ? requestError.message : 'Không thể lưu bản nháp.' });
    } finally {
      setSavingDraft(false);
    }
  }

  async function handlePublishSaveDraft() {
    await saveDraft(true);
  }

  async function handleCopyHtml() {
    if (!editorHtml) return;
    await navigator.clipboard.writeText(editorHtml);
    setBanner({ tone: 'success', text: 'Đã copy HTML.' });
  }

  async function saveDraft(createVersion: boolean) {
    if (!articleId || !config) throw new Error('Không có bài viết để lưu.');
    const outlinePayload = {
      flow: 'viet_dan_bai',
      stage: 'generate',
      writeMethod: config.writeMethod,
      tone: config.tone,
      rawOutline: config.outline,
      parsedHeadings: config.parsedHeadings,
      aiCheck: readSessionAICheckState(aiCheckStorageKey),
      config,
    };
    const signature = buildPersistedSignature(
      editorHtml,
      editTitle || config.keyword,
      editMetaDescription,
      activeSlug,
      currentWordCount,
      humannessResult?.score ?? 0,
      humannessDecision,
      secondaryKeywords,
      outlinePayload,
    );
    if (!createVersion && signature === persistedSignatureRef.current) return;
    const response = await fetch(`/api/articles/${articleId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: config.keyword,
        language: config.language,
        contentType: `viet_dan_bai:${config.writeMethod}`,
        targetLength: config.targetLength,
        aiProvider: config.model,
        brandConfig: config.brandConfig,
        outline: outlinePayload,
        selectedTitle: editTitle || config.keyword,
        htmlContent: editorHtml,
        metaDescription: editMetaDescription,
        slug: activeSlug,
        wordCount: currentWordCount,
        seoChecks: { keywordDensity: currentKeywordDensity },
        humannessScore: humannessResult?.score ?? 0,
        scoreBreakdown: { humanness: humannessResult, keywordDensity: currentKeywordDensity },
        secondaryKeywords,
        status: status === 'done' ? 'WRITTEN' : 'DRAFT',
        aiDecision: humannessDecision,
        createVersion,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Không thể lưu bản nháp.' })) as { error?: string };
      throw new Error(payload.error || 'Không thể lưu bản nháp.');
    }
    persistedSignatureRef.current = signature;
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleToolbarCommandLegacy_removed(command: AiAssistCommand) {
    if (!selectedText.trim()) return;
    setFloatingToolbar((prev) => ({ ...prev, visible: false }));
    setBanner(null);
    try {
      const assistedHtml = await runAiAssistCommand(command);
      if (!assistedHtml) throw new Error('AI không trả về nội dung.');
      const range = selectionRangeRef.current;
      const editorNode = getVisibleEditorNode();
      if (!range || !editorNode) throw new Error('KhÃ´ng tÃ¬m tháº¥y vÃ¹ng editor Ä‘á»ƒ Ã¡p dá»¥ng.');
      const fragment = range.createContextualFragment(assistedHtml);
      range.deleteContents();
      range.insertNode(fragment);
      if (nextHtml === editorHtml) throw new Error('Không tìm thấy đoạn đã chọn trong HTML hiện tại.');
      setEditorHtml(nextHtml);
      setBanner({ tone: 'success', text: 'AI đã cập nhật đoạn văn đang chọn.' });
      window.getSelection()?.removeAllRanges();
    } catch (requestError) {
      setBanner({ tone: 'error', text: requestError instanceof Error ? requestError.message : 'Không thể xử lý AI inline.' });
    }
  }

  async function handleToolbarCommand(command: AiAssistCommand) {
    if (!selectedText.trim()) return;
    setFloatingToolbar((prev) => ({ ...prev, visible: false }));
    setBanner(null);
    try {
      const assistedHtml = await runAiAssistCommand(command);
      if (!assistedHtml) throw new Error('AI khong tra ve noi dung.');
      const range = selectionRangeRef.current;
      const editorNode = getVisibleEditorNode();
      if (!range || !editorNode) throw new Error('Khong tim thay vung editor de ap dung.');
      const fragment = range.createContextualFragment(assistedHtml);
      range.deleteContents();
      range.insertNode(fragment);
      setEditorHtml(editorNode.innerHTML);
      setBanner({ tone: 'success', text: 'AI da cap nhat doan van dang chon.' });
      window.getSelection()?.removeAllRanges();
    } catch (requestError) {
      setBanner({ tone: 'error', text: requestError instanceof Error ? requestError.message : 'Khong the xu ly AI inline.' });
    }
  }

  async function handleFloatingCommand(command: AiAssistCommand) {
    await handleToolbarCommand(command);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!config || !articleId) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-sm text-red-600">{error || 'Không có dữ liệu bài viết'}</div>
      </div>
    );
  }

  const insertStep4InternalLink = (html: string) => {
    setBanner({ tone: 'success', text: 'Đã chèn internal link vào bài.' });
    insertStep4Html(`<p style="margin-top:1rem">Xem thêm: ${html}</p>`);
  };

  const insertStep4ExternalLink = (url: string, text: string) => {
    const rawUrl = url.trim();
    const cleanText = text.trim();
    if (!rawUrl || !cleanText) return;
    const cleanUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    setBanner({ tone: 'success', text: 'Đã chèn external link vào bài.' });
    insertStep4Html(`<p style="margin-top:1rem">Tham khảo: <a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanText}</a></p>`);
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Viết Theo Dàn Bài</p>
          <h1 className="truncate text-xl font-bold text-gray-900">{editTitle || config.keyword}</h1>
          <p className="mt-1 text-xs text-gray-500">
            {config.keyword} · {currentWordCount.toLocaleString()} từ · Density {currentKeywordDensity.toFixed(2)}% · {statusMessage || status}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void handleSaveDraftWithBanner()}
            disabled={savingDraft || loading || !articleId || !editorHtml}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              savedFlash ? 'border-green-300 bg-green-50 text-green-700' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {savingDraft ? 'Đang lưu...' : savedFlash ? '✓ Đã lưu' : 'Lưu DB'}
          </button>
          {articleId && <ExportMenu articleId={articleId} html={editorHtml} title={editTitle || config.keyword} />}
          <button type="button" onClick={handleRestart} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Bắt đầu lại
          </button>
        </div>
      </div>

      <div ref={contentRef} className="hidden" dangerouslySetInnerHTML={{ __html: editorHtml }} />

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col bg-gray-50">
          {(status === 'streaming' || banner) && (
            <div className="border-b border-gray-200 bg-white px-5 py-3">
              {status === 'streaming' && (
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <span className="text-sm font-semibold text-blue-700">{statusMessage || 'Đang xử lý...'}</span>
                </div>
              )}
              {banner && (
                <p className={`mt-2 rounded-lg border px-3 py-2 text-sm ${banner.tone === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {banner.text}
                </p>
              )}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-hidden p-5">
            <div className="h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div ref={editorShellRef} className="h-full" data-vdb-editor>
                <RichArticleEditor
                  html={editorHtml}
                  streaming={status === 'streaming'}
                  wordCount={currentWordCount}
                  keyword={config.keyword}
                  articleTitle={editTitle || config.keyword}
                  fullWidth
                  onChange={setEditorHtml}
                  onSave={() => void handleSaveDraftWithBanner()}
                  onNewArticle={handleRestart}
                />
              </div>
            </div>
          </div>
        </main>

        <aside className="flex w-[420px] shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white">
          <GeneratePanelTabs value={activeTab} onChange={setActiveTab} tabs={UNIFIED_GENERATE_TABS} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeTab === 'seo' && (
              <SeoTab
                checks={seoData.checks}
                score={seoData.score}
                keyword={config.keyword}
                secondaryKeywords={secondaryKeywords}
                title={editTitle}
                metaDescription={editMetaDescription}
                slug={activeSlug}
                model={config.model}
                contentType={config.writeMethod}
                articleId={articleId}
                keywordDensity={currentKeywordDensity}
                humannessScore={effectiveHumannessScore}
                humannessBreakdownData={humannessResult?.scoreBreakdown ?? null}
                internalLinks={internalLinks}
                loadingLinks={loadingLinks}
                fixingDensity={fixingDensity}
                savingDraft={savingDraft}
                savedFlash={savedFlash}
                fieldHighlights={fieldHighlights}
                onMetaChange={(field, value) => {
                  if (field === 'title') setEditTitle(value);
                  else setEditMetaDescription(value);
                }}
                onAddKeyword={addSecondaryKeyword}
                onRemoveKeyword={removeSecondaryKeyword}
                onFixTitle={fixTitle}
                onFixMeta={fixMeta}
                onFixSlug={fixSlug}
                onFixTitleToStart={fixTitleToStart}
                onFixTitleNumber={fixTitleNumber}
                onFixAltText={fixAltText}
                onFixSeoCheck={handleFixSeoCheck}
                onInsertInternalLink={insertStep4InternalLink}
                onInsertExternalLink={insertStep4ExternalLink}
                onRestart={handleRestart}
              />
            )}

            {activeTab === 'ai' && (
              <KeywordAiTab
                html={editorHtml}
                selectedText={selectedText}
                aiEditing={aiEditing}
                aiCheckStorageKey={aiCheckStorageKey}
                onAiEdit={(command) => void handleAiEditCommand(command)}
                onApplyFix={(original, replacement, sentenceIndex, target) => applySentenceFix({
                  sentenceIndex: sentenceIndex ?? target?.index ?? null,
                  original: target?.text || original,
                  replacement,
                })}
                getSentenceTargets={() => (contentRef.current ? buildSentenceTargets(contentRef.current) : [])}
                onAiCheckResultChange={setAiCheckResult}
                onAiRewrite={handleFlagAiRewrite}
              />
            )}

            {activeTab === 'quality' && (
              <QualityTab
                humannessScore={effectiveHumannessScore}
                humannessDecision={humannessDecision}
                keywordDensity={currentKeywordDensity}
                forbiddenFound={aiCheckResult?.issues.forbiddenWords ?? []}
              />
            )}

            {activeTab === 'links' && (
              <LinksTab
                internalLinks={internalLinks}
                loadingLinks={loadingLinks}
                onInsert={insertStep4Html}
              />
            )}

            {activeTab === 'publish' && (
              <div className="space-y-4 p-4">
                <PublishReadinessCard readiness={publishReadiness} title="Sẵn sàng đăng" />
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
                  onCopyHtml={() => void handleCopyHtml()}
                  onSaveDraft={handlePublishSaveDraft}
                />
              </div>
            )}

            {activeTab === 'images' && <ImagesTab imageOption="none" />}
          </div>
        </aside>
      </div>

      <AiFloatingToolbar
        visible={floatingToolbar.visible}
        x={floatingToolbar.x}
        y={floatingToolbar.y}
        disabled={status === 'streaming'}
        onCommand={(command) => void handleFloatingCommand(command)}
      />

      {error && (
        <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
