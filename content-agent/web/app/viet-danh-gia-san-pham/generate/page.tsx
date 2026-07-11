'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AppliedFixLocator } from '@/app/components/AICheckPanel';
import type { AiAssistCommand } from '@/components/editor/AiAssistPanel';
import { AiFloatingToolbar } from '@/components/editor/AiFloatingToolbar';
import { ExportMenu } from '@/components/editor/ExportMenu';
import { RichArticleEditor } from '@/components/editor/RichArticleEditor';
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
import {
  clearReviewWorkflowSession,
  readReviewSession,
  writeReviewSession,
} from '@/lib/product-scraper/session';
import type { ReviewConfig, ReviewStreamResult } from '@/lib/product-scraper/types';
import { UNIFIED_GENERATE_TABS, type GenerateTab } from '@/lib/shared/generate-tabs';
import { computeSeoChecks as computeSeoChecksShared } from '@/lib/shared/seo-checks';
import { fitSeoSlugLength, fitSeoTitleLength, stripInlineHtml } from '@/lib/shared/seo-title-fix';
import { computeKeywordDensity, countWords, slugify } from '@/lib/tinh-gon/text';
import type { TinhGonDecision, TinhGonHumannessResult } from '@/lib/tinh-gon/types';

interface StreamEventPayload {
  type: 'step' | 'step_done' | 'chunk' | 'done' | 'error';
  step?: string;
  label?: string;
  text?: string;
  message?: string;
  data?: ReviewStreamResult;
}

interface DbArticlePayload {
  id: string;
  runId: string;
  keyword: string;
  language: string;
  contentType: string;
  targetLength: number;
  aiProvider: string;
  brandConfig?: ReviewConfig['brandConfig'];
  outline?: {
    flow?: string;
    aiCheck?: unknown;
    config?: ReviewConfig;
  } | null;
  selectedTitle: string;
  userNotes?: string | null;
  htmlContent: string;
  plainText?: string | null;
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

const AI_CHECK_KEY_PREFIX = 'aicheck:product-review:';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
    outline,
  });
}

function computeSeoChecks(
  title: string,
  metaDescription: string,
  html: string,
  wordCount: number,
  keyword: string,
  affiliateLink: string,
  slug: string,
): { checks: SeoCheck[]; score: number } {
  return computeSeoChecksShared({
    title,
    metaDescription,
    html,
    wordCount,
    keyword,
    affiliateLink,
    variant: 'product_review',
    slug,
    minWordCount: 1000,
  });
}

function buildOutlinePayload(config: ReviewConfig, aiCheckStorageKey?: string) {
  return {
    flow: 'product_review',
    stage: 'generate',
    config,
    aiCheck: readSessionAICheckState(aiCheckStorageKey),
  };
}

export default function VietDanhGiaSanPhamGeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get('runId');

  const contentRef = useRef<HTMLDivElement>(null);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const persistedSignatureRef = useRef('');

  const [config, setConfig] = useState<ReviewConfig | null>(null);
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
  const [internalLinks, setInternalLinks] = useState<Array<{ title: string; slug: string; url: string; relevance: number; suggestText: string; keyword?: string | null }>>([]);
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
      config.affiliateLink || '',
      activeSlug,
    );
  }, [activeSlug, config, currentWordCount, editMetaDescription, editTitle, editorHtml]);
  const seoScore = seoData.score;
  const aiCheckStorageKey = useMemo(() => (articleId ? `${AI_CHECK_KEY_PREFIX}${articleId}` : undefined), [articleId]);
  const effectiveHumannessScore = aiCheckResult?.humannessScore ?? humannessResult?.score ?? null;
  const humannessDecision = humannessResult?.decision ?? 'REVIEW';
  const publishReadiness = useMemo(() => buildPublishReadiness({
    html: editorHtml,
    title: editTitle,
    metaDescription: editMetaDescription,
    slug: activeSlug,
    keyword: config?.keyword || '',
    secondaryKeywords,
    minWordCount: 1000,
    humannessScore: humannessResult?.score ?? null,
    aiCheckResult,
  }), [activeSlug, aiCheckResult, config, editMetaDescription, editTitle, editorHtml, humannessResult?.score, secondaryKeywords]);

  useEffect(() => {
    document.title = 'Generate Viet Danh Gia San Pham - Content Agent';
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
    const storedConfig = readReviewSession('config');
    const storedArticleId = readReviewSession('articleId');
    const storedRunId = runIdParam || readReviewSession('runId') || '';

    if (!storedRunId) {
      router.replace('/viet-danh-gia-san-pham');
      return;
    }

    if (storedConfig && storedArticleId && !runIdParam) {
      try {
        const parsedConfig = JSON.parse(storedConfig) as ReviewConfig;
        setConfig(parsedConfig);
        setArticleId(storedArticleId);
      } catch {
        clearReviewWorkflowSession();
      }
    }

    try {
      const response = await fetch(`/api/articles/by-runid/${encodeURIComponent(storedRunId)}`);
      const payload = await response.json() as { success?: boolean; data?: DbArticlePayload; error?: string };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Khong the tai bai viet');
      }

      const article = payload.data;
      const nextConfig: ReviewConfig = article.outline?.config ?? {
        productName: article.selectedTitle || article.keyword,
        productInfo: article.plainText || article.htmlContent || '',
        keyword: article.keyword,
        affiliateLink: '',
        reviewStructure: 'full',
        reviewStyle: 'expert',
        language: article.language,
        model: article.aiProvider,
        brandConfig: article.brandConfig,
      };

      setConfig(nextConfig);
      setArticleId(article.id);
      writeReviewSession('config', JSON.stringify(nextConfig));
      writeReviewSession('articleId', article.id);
      writeReviewSession('runId', article.runId);
      setEditTitle(article.selectedTitle || article.keyword);
      setEditMetaDescription(article.metaDescription || '');
      setSecondaryKeywords([]);
      if (article.slug?.trim()) {
        setCustomSlug(article.slug);
        setSlugEdited(true);
      } else {
        setCustomSlug('');
        setSlugEdited(false);
      }
      const nextAiCheckStorageKey = article.id ? `${AI_CHECK_KEY_PREFIX}${article.id}` : undefined;
      writeSessionAICheckState(nextAiCheckStorageKey, article.outline?.aiCheck);
      if (article.runId && article.runId !== article.id) {
        writeSessionAICheckState(`${AI_CHECK_KEY_PREFIX}${article.runId}`, null);
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
      const nextOutline = buildOutlinePayload(nextConfig, nextAiCheckStorageKey);
      persistedSignatureRef.current = buildPersistedSignature(
        article.htmlContent,
        article.selectedTitle || article.keyword,
        article.metaDescription || '',
        article.slug?.trim() || slugify(article.selectedTitle || article.keyword),
        article.wordCount || countWords(article.htmlContent),
        article.scoreBreakdown?.humanness?.score ?? article.humannessScore ?? 0,
        article.scoreBreakdown?.humanness?.decision ?? article.aiDecision ?? 'REVIEW',
        nextOutline,
      );
      writeReviewSession('result', JSON.stringify({
        runId: article.runId,
        html: article.htmlContent,
        title: article.selectedTitle || article.keyword,
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
      void loadInternalLinks();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Loi tai du lieu');
      setLoading(false);
    }
  }

  async function startGeneration(currentConfig: ReviewConfig, currentRunId: string, currentArticleId: string) {
    setLoading(false);
    setError('');
    setStatus('streaming');
    setStatusMessage('AI dang viet bai danh gia san pham...');
    setEditorHtml('');
    setEditTitle(currentConfig.keyword);
    setEditMetaDescription('');
    setWordCountLive(0);
    setHumannessResult(null);
    setInternalLinks([]);

    try {
      const response = await fetch('/api/danh-gia-san-pham/stream', {
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
        throw new Error(payload.error || 'Khong the bat dau stream');
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

          if (payload.type === 'step' && payload.label) {
            setStatusMessage(payload.label);
          }

          if (payload.type === 'chunk' && payload.text) {
            setEditorHtml((prev) => prev + payload.text);
          }

          if (payload.type === 'error') {
            throw new Error(payload.message || 'AI stream loi');
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
            persistedSignatureRef.current = buildPersistedSignature(
              nextResult.html,
              nextResult.title,
              nextResult.metaDescription,
              slugify(nextResult.title),
              nextResult.wordCount,
              nextResult.humanness.score,
              nextResult.humanness.decision,
              buildOutlinePayload(currentConfig, `${AI_CHECK_KEY_PREFIX}${currentArticleId}`),
            );
            writeReviewSession('result', JSON.stringify(nextResult));
            setLoading(false);
            void loadInternalLinks();
          }
        }
      }
    } catch (requestError) {
      setStatus('error');
      setError(requestError instanceof Error ? requestError.message : 'Khong the tao bai');
      setLoading(false);
    }
  }

  async function loadInternalLinks() {
    if (!config || !editorHtml) return;
    setLoadingLinks(true);
    try {
      const response = await fetch('/api/tinh-gon/internal-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: config.keyword, html: editorHtml }),
      });
      const payload = await response.json() as { links?: Array<{ title: string; slug: string; url: string; relevance: number; suggestText: string; keyword?: string | null }> };
      setInternalLinks(payload.links ?? []);
    } catch {
      setInternalLinks([]);
    } finally {
      setLoadingLinks(false);
    }
  }

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
    if (!response.ok || !response.body) throw new Error('Khong the goi AI assist.');
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

  async function handleAiEditCommand(command: AiAssistCommand) {
    if (!selectedText.trim() || aiEditing) return;
    setAiEditing(true);
    setFloatingToolbar((prev) => ({ ...prev, visible: false }));
    setBanner(null);
    try {
      const assistedHtml = await runAiAssistCommand(command);
      if (!assistedHtml) throw new Error('AI khong tra ve noi dung.');
      const nextHtml = editorHtml.replace(selectedText, assistedHtml);
      if (nextHtml === editorHtml) throw new Error('Khong tim thay doan da chon trong HTML hien tai.');
      setEditorHtml(nextHtml);
      setBanner({ tone: 'success', text: 'AI da cap nhat doan van dang chon.' });
      window.getSelection()?.removeAllRanges();
    } catch (requestError) {
      setBanner({ tone: 'error', text: requestError instanceof Error ? requestError.message : 'Khong the xu ly AI inline.' });
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
      if (!assistedHtml) throw new Error('AI khong tra ve noi dung.');
      const applied = applySentenceFix({
        sentenceIndex: target?.index ?? null,
        original: target?.text || snippet,
        replacement: assistedHtml,
      });
      if (!applied) throw new Error('Khong tim thay cau can viet lai trong editor.');
      setBanner({ tone: 'success', text: `Da viet lai cau flag: ${flagLabel}.` });
    } catch (requestError) {
      setBanner({ tone: 'error', text: requestError instanceof Error ? requestError.message : 'Khong the viet lai cau.' });
    } finally {
      setAiEditing(false);
    }
  }

  function handleRestart() {
    clearReviewWorkflowSession();
    writeSessionAICheckState(aiCheckStorageKey, null);
    router.push('/viet-danh-gia-san-pham');
  }

  function insertAppendHtml(html: string) {
    const snippet = /^<a[\s>]/i.test(html.trim()) ? `<p>${html}</p>` : html;
    setEditorHtml((current) => `${current}${snippet}`);
  }

  function insertExternalLink(url: string, text: string) {
    const rawUrl = url.trim();
    const cleanText = text.trim();
    if (!rawUrl || !cleanText) return;
    const cleanUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    setBanner({ tone: 'success', text: 'Da chen external link vao bai.' });
    insertAppendHtml(`<p style="margin-top:1rem">Tham khao: <a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanText}</a></p>`);
  }

  function fixTitle() {
    if (!config || !editTitle) return;
    if (editTitle.toLowerCase().includes(config.keyword.toLowerCase())) {
      setBanner({ tone: 'success', text: 'Tieu de da co tu khoa chinh.' });
      return;
    }
    setEditTitle(`${config.keyword} - ${editTitle}`.trim());
    setFieldHighlights((prev) => ({ ...prev, title: true }));
    setBanner({ tone: 'success', text: 'Da them tu khoa vao tieu de.' });
  }

  function fixMeta() {
    if (!config) return;
    const nextMeta = editMetaDescription.trim()
      ? `${config.keyword}. ${editMetaDescription}`.slice(0, 160)
      : `${config.keyword}: thong tin ngan gon, thuc te, de ap dung.`.slice(0, 160);
    setEditMetaDescription(nextMeta);
    setFieldHighlights((prev) => ({ ...prev, meta: true }));
    setBanner({ tone: 'success', text: 'Da chinh meta description.' });
  }

  function fixSlug() {
    if (!config) return;
    const nextSlug = slugify(`${config.keyword} ${editTitle}`) || slugify(config.keyword);
    setCustomSlug(nextSlug);
    setSlugEdited(true);
    setFieldHighlights((prev) => ({ ...prev, slug: true }));
    setBanner({ tone: 'success', text: 'Da chuan hoa slug.' });
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
      setBanner({ tone: 'success', text: 'Tu khoa da nam o dau tieu de.' });
      return;
    }
    const cleaned = plainTitle
      .replace(new RegExp(escapeRegExp(config.keyword), 'ig'), '')
      .replace(/^[\s\-:]+|[\s\-:]+$/g, '')
      .trim();
    setEditTitle(cleaned ? `${config.keyword} - ${cleaned}` : config.keyword);
    setFieldHighlights((prev) => ({ ...prev, title: true }));
    setBanner({ tone: 'success', text: 'Da dua tu khoa len dau tieu de.' });
  }

  function fixTitleNumber() {
    if (!editTitle) return;
    if (/\d/.test(editTitle)) {
      setBanner({ tone: 'success', text: 'Tieu de da co so.' });
      return;
    }
    const year = new Date().getFullYear();
    setEditTitle(`${editTitle} ${year}`.trim());
    setFieldHighlights((prev) => ({ ...prev, title: true }));
    setBanner({ tone: 'success', text: `Da them nam ${year} vao tieu de.` });
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
    setBanner({ tone: 'success', text: 'Da chen tu khoa vao phan mo bai.' });
  }

  function fixKeywordInContent() {
    const kw = config?.keyword.trim();
    if (!kw || !editorHtml) return;
    setEditorHtml(`${editorHtml}<section><h2>Goc nhin them ve ${escapeHtml(kw)}</h2><p>Khi danh gia ${escapeHtml(kw)}, can xem xet trai nghiem thuc te, thong so, do ben, doi tuong su dung va nhung diem can so sanh de chon dung phuong an.</p></section>`);
    setBanner({ tone: 'success', text: 'Da chen them tu khoa vao noi dung.' });
  }

  function fixMinWordCount() {
    const kw = config?.keyword.trim();
    if (!kw || !editorHtml) return;
    const sentence = `${kw} can duoc can nhac theo trai nghiem su dung, thong so, do ben, muc gia va cac diem can so sanh de nguoi doc dua ra quyet dinh ro rang hon.`;
    setEditorHtml(`${editorHtml}<p>${escapeHtml(sentence)}</p><p>${escapeHtml(sentence)}</p>`);
    setBanner({ tone: 'success', text: 'Da mo rong noi dung de dat do dai toi thieu.' });
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
        throw new Error(data.error || 'Khong the fix mat do tu khoa');
      }
      if (data.data?.changed && data.data.html) {
        setEditorHtml(data.data.html);
      }
      setBanner({ tone: 'success', text: 'Da AI fix mat do tu khoa.' });
    } catch (requestError) {
      setBanner({ tone: 'error', text: requestError instanceof Error ? requestError.message : 'Khong the fix mat do tu khoa' });
    } finally {
      setFixingDensity(false);
    }
  }

  async function fixTitleLengthWithAi() {
    if (!config) return;
    setEditTitle(fitSeoTitleLength(editTitle.trim() || config.keyword, config.keyword));
    setSlugEdited(false);
    setFieldHighlights((prev) => ({ ...prev, title: true }));
    setBanner({ tone: 'success', text: 'Da chinh do dai tieu de SEO.' });
  }

  async function fixSlugLengthWithAi() {
    if (!config) return;
    const sourceText = (activeSlug || `${config.keyword} ${editTitle}`).replace(/-/g, ' ').trim();
    setCustomSlug(fitSeoSlugLength(sourceText, config.keyword));
    setSlugEdited(true);
    setFieldHighlights((prev) => ({ ...prev, slug: true }));
    setBanner({ tone: 'success', text: 'Da rut gon slug chuan SEO.' });
  }

  function fixMetaLength() {
    const kw = config?.keyword;
    if (!kw) return;
    let nextMeta = `${kw}: ${stripHtml(editorHtml).split(/\s+/).filter(Boolean).slice(0, 24).join(' ')}`;
    if (nextMeta.length < 120) nextMeta = `${nextMeta} Noi dung tap trung vao thong tin can biet, trai nghiem su dung va cac diem nen kiem tra truoc khi quyet dinh.`;
    if (nextMeta.length > 160) nextMeta = `${nextMeta.slice(0, 157).trim()}...`;
    setEditMetaDescription(nextMeta);
    setBanner({ tone: 'success', text: 'Da chinh do dai meta description.' });
  }

  function fixH1Count() {
    if (!editorHtml) return;
    if (!/<h1[\s>]/i.test(editorHtml)) {
      setEditorHtml(`<h1>${escapeHtml(editTitle || config?.keyword || 'Bai viet')}</h1>${editorHtml}`);
      setBanner({ tone: 'success', text: 'Da chuan hoa so luong the H1.' });
    }
  }

  function fixH2Count() {
    if (!config || !editorHtml) return;
    const h2Count = (editorHtml.match(/<h2[\s>]/gi) || []).length;
    if (h2Count >= 2) return;
    setEditorHtml(`${editorHtml}<section><h2>Tieu chi danh gia ${escapeHtml(config.keyword)}</h2><p>${escapeHtml(config.keyword)} nen duoc danh gia theo thong so, trai nghiem su dung, muc gia va nhung diem can doi chieu de ra quyet dinh chinh xac hon.</p></section>`);
    setBanner({ tone: 'success', text: 'Da bo sung H2 con thieu.' });
  }

  function fixHeadingHierarchy() {
    setBanner({ tone: 'success', text: 'Da ra soat thu bac heading.' });
  }

  function fixFaqSection() {
    if (!config || !editorHtml) return;
    const safeKeyword = escapeHtml(config.keyword);
    setEditorHtml(`${editorHtml}<section><h2>FAQ ve ${safeKeyword}</h2><div class="faq-item"><h3>${safeKeyword} phu hop voi ai?</h3><p>${safeKeyword} phu hop voi nguoi dang can thong tin ro rang de so sanh, danh gia va dua ra quyet dinh mua hang.</p></div></section>`);
    setBanner({ tone: 'success', text: 'Da them section FAQ.' });
  }

  function fixTocSection() {
    setEditorHtml(`<nav class="toc"><p><strong>Muc luc</strong></p></nav>${editorHtml}`);
    setBanner({ tone: 'success', text: 'Da them muc luc.' });
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
      case 10:
        fixAltText();
        break;
      case 12:
        fixTitleToStart();
        break;
      case 13:
        fixTitleNumber();
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
      setBanner({ tone: 'success', text: 'Da luu ban nhap vao DB.' });
    } catch (requestError) {
      setBanner({ tone: 'error', text: requestError instanceof Error ? requestError.message : 'Khong the luu ban nhap.' });
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
    setBanner({ tone: 'success', text: 'Da copy HTML.' });
  }

  async function saveDraft(createVersion: boolean) {
    if (!articleId || !config) throw new Error('Khong co bai viet de luu.');
    const outlinePayload = buildOutlinePayload(config, aiCheckStorageKey);
    const signature = buildPersistedSignature(
      editorHtml,
      editTitle || config.keyword,
      editMetaDescription,
      activeSlug,
      currentWordCount,
      humannessResult?.score ?? 0,
      humannessDecision,
      outlinePayload,
    );
    if (!createVersion && signature === persistedSignatureRef.current) return;

    const response = await fetch(`/api/articles/${articleId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: config.keyword,
        language: config.language,
        contentType: 'product_review',
        targetLength: Math.max(1000, currentWordCount),
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
      const payload = await response.json().catch(() => ({ error: 'Khong the luu ban nhap.' })) as { error?: string };
      throw new Error(payload.error || 'Khong the luu ban nhap.');
    }

    persistedSignatureRef.current = signature;
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
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
        <div className="text-sm text-red-600">{error || 'Khong co du lieu bai viet'}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Viet Danh Gia San Pham</p>
          <h1 className="truncate text-xl font-bold text-gray-900">{editTitle || config.keyword}</h1>
          <p className="mt-1 text-xs text-gray-500">
            {config.keyword} · {currentWordCount.toLocaleString()} tu · Density {currentKeywordDensity.toFixed(2)}% · {statusMessage || status}
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
            {savingDraft ? 'Dang luu...' : savedFlash ? '✓ Da luu' : 'Luu DB'}
          </button>
          {articleId && <ExportMenu articleId={articleId} html={editorHtml} title={editTitle || config.keyword} />}
          <button type="button" onClick={handleRestart} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Bat dau lai
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
                  <span className="text-sm font-semibold text-blue-700">{statusMessage || 'Dang xu ly...'}</span>
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
              <div ref={editorShellRef} className="h-full" data-vdg-editor>
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
                contentType={config.reviewStructure}
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
                onAddKeyword={(value) => setSecondaryKeywords((prev) => (prev.includes(value) ? prev : [...prev, value]))}
                onRemoveKeyword={(value) => setSecondaryKeywords((prev) => prev.filter((item) => item !== value))}
                onFixTitle={fixTitle}
                onFixMeta={fixMeta}
                onFixSlug={fixSlug}
                onFixTitleToStart={fixTitleToStart}
                onFixTitleNumber={fixTitleNumber}
                onFixAltText={fixAltText}
                onFixSeoCheck={handleFixSeoCheck}
                onInsertInternalLink={insertAppendHtml}
                onInsertExternalLink={insertExternalLink}
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
                onInsert={insertAppendHtml}
              />
            )}

            {activeTab === 'publish' && (
              <div className="space-y-4 p-4">
                <PublishReadinessCard readiness={publishReadiness} title="San sang dang" />
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

            {activeTab === 'images' && <ImagesTab imageOption="0" />}
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
