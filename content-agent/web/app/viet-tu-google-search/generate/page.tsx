'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AICheckPanel, { type AppliedFixLocator } from '@/app/components/AICheckPanel';
import { AiFloatingToolbar } from '@/components/editor/AiFloatingToolbar';
import { readSessionAICheckState } from '@/lib/ai-check-persistence';
import { GeneratePanelTabs } from '@/components/generate/GeneratePanelTabs';
import { PublishPanel as GeneratePublishPanel } from '@/components/generate/PublishPanel';
import { RichArticleEditor } from '@/components/editor/RichArticleEditor';
import { ExportMenu } from '@/components/editor/ExportMenu';
import { useGenerateStream } from '@/hooks/useGenerateStream';
import { computeSeoChecks } from '@/lib/shared/seo-checks';
import { fitSeoSlugLength, fitSeoTitleLength, stripInlineHtml } from '@/lib/shared/seo-title-fix';
import type { SentenceTarget } from '@/lib/dom-sentences';
import { buildSentenceTargets } from '@/lib/dom-sentences';
import type { AICheckResult } from '@/lib/humanness/types';
import { UNIFIED_GENERATE_TABS, type GenerateTab } from '@/lib/shared/generate-tabs';
import {
  VTGS_ARTICLE_ID_SESSION_KEY,
  VTGS_RESULT_SESSION_KEY,
  VTGS_RUN_ID_SESSION_KEY,
  VTGS_SEARCH_RESULT_SESSION_KEY,
  VTGS_SESSION_KEY,
} from '@/lib/viet-tu-google-search/options';
import type { SearchResult, VtgsConfig, VtgsStreamResult } from '@/lib/viet-tu-google-search/types';
import type { AiAssistCommand } from '@/components/editor/AiAssistPanel';
import { HumannessPanel } from '@/components/tinh-gon/HumannessPanel';
import { InternalLinkSuggest } from '@/components/tinh-gon/InternalLinkSuggest';
import { KeywordDensityBar } from '@/components/tinh-gon/KeywordDensityBar';
import { computeKeywordDensity } from '@/lib/tinh-gon/text';
import type { TinhGonInternalLinkSuggestion } from '@/lib/tinh-gon/types';

const VTGS_AI_EDIT_COMMANDS: Array<{ value: AiAssistCommand; label: string }> = [
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

interface PublishFixAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface PublishFixFeedback {
  tone: 'success' | 'error' | 'info';
  text: string;
}

type EditorFixHighlightTone = 'pending' | 'applied';

interface HighlightCharPoint {
  node: Text;
  offset: number;
}

interface StoredVtgsOutlinePayload {
  config?: VtgsConfig;
  finalOutline?: string;
  searchResult?: SearchResult | null;
  aiCheck?: unknown;
}

interface VtgsDbArticlePayload {
  id: string;
  runId: string;
  keyword: string;
  language: string;
  contentType: string;
  targetLength: number;
  aiProvider: string;
  brandConfig?: VtgsConfig['brandConfig'];
  outline?: unknown;
  selectedTitle: string;
  userNotes?: string | null;
  secondaryKeywords: string[];
  htmlContent?: string | null;
  wordCount?: number | null;
  metaDescription?: string | null;
  slug?: string | null;
  seoScore?: number | null;
  humannessScore?: number | null;
  aiDecision?: string | null;
  meta?: {
    searchSources?: SearchResult['sources'];
    searchedAt?: string | null;
    crawlMode?: VtgsConfig['crawlMode'];
    addFreshnessDate?: boolean;
  } | null;
}

const STEP_LABELS: Record<string, string> = {
  searching: 'Đang tìm nguồn từ Google...',
  crawling: 'Đang crawl nội dung...',
  synthesizing: 'Đang tổng hợp ngữ cảnh...',
  outlining: 'Đang chuẩn bị dàn ý...',
  writing: 'Đang viết bài...',
  seo_check: 'Đang kiểm tra SEO và lưu DB...',
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripTemporaryFixMarkup(html: string): string {
  if (typeof document === 'undefined' || !html.includes('data-fix-hl')) {
    return html;
  }

  const container = document.createElement('div');
  container.innerHTML = html;

  container.querySelectorAll('[data-fix-hl]').forEach((node) => {
    const element = node as HTMLElement;

    if (element.getAttribute('data-fix-inline') === 'true') {
      const parent = element.parentNode;
      if (parent) {
        while (element.firstChild) {
          parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
      }
      return;
    }

    element.removeAttribute('data-fix-hl');
    element.style.background = '';
    element.style.borderLeft = '';
    element.style.paddingLeft = '';
    element.style.borderRadius = '';
    element.style.outline = '';
    element.style.boxShadow = '';
    element.style.fontWeight = '';
    element.style.padding = '';
    if (!element.getAttribute('style')) {
      element.removeAttribute('style');
    }
  });

  return container.innerHTML;
}

function shouldInsertSeparator(currentText: string, nextText: string): boolean {
  if (!currentText || !nextText) return false;
  const prevChar = currentText[currentText.length - 1];
  const nextChar = nextText[0];
  return !/\s/.test(prevChar) && !/\s/.test(nextChar);
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function fallbackMeta(keyword: string): string {
  const text = `${keyword} - Tổng hợp từ Google Search, có kiểm tra SEO, nguồn tham khảo và gợi ý tối ưu để xuất bản nhanh hơn.`;
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function isVtgsResult(value: unknown): value is VtgsStreamResult {
  return Boolean(value && typeof value === 'object' && 'articleId' in value);
}

function parseStoredOutlinePayload(value: unknown): StoredVtgsOutlinePayload | null {
  if (!value || typeof value !== 'object') return null;
  return value as StoredVtgsOutlinePayload;
}

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
  secondaryKeywords: string[];
  minWordCount: number;
  humannessScore?: number | null;
  aiCheckResult?: AICheckResult | null;
}): PublishReadiness {
  const plainText = stripHtml(input.html);
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const links = countLinks(input.html);
  const hasSpecificData = /(\d+\s?(cm|mm|m2|m²|kg|%|năm|ngày|giờ)|\d{4}|₫|vnd|vnđ)/i.test(plainText);
  const keywordInTitle = hasNormalizedText(input.title, input.keyword);
  const keywordInSlug = normalizeSearchText(input.slug).replace(/[^a-z0-9]+/g, '-').includes(
    normalizeSearchText(input.keyword).replace(/[^a-z0-9]+/g, '-'),
  );
  const secondaryCovered = input.secondaryKeywords.filter((item) => hasNormalizedText(plainText, item)).length;
  const density = input.keyword ? Number((((plainText.match(new RegExp(normalizeSearchText(input.keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length / Math.max(wordCount, 1)) * 100).toFixed(2)) : 0;
  const effectiveHumanness = input.aiCheckResult?.humannessScore ?? input.humannessScore ?? null;
  const aiCriticalFlags = input.aiCheckResult?.counts.criticalFlags ?? null;
  const aiBannedCount = input.aiCheckResult?.counts.bannedWordCount ?? null;
  const aiToneScore = input.aiCheckResult?.breakdown.toneConsistencyScore ?? null;

  const items: PublishSignal[] = [
    {
      key: 'title',
      label: 'Tiêu đề có từ khóa và độ dài hợp lý',
      pass: keywordInTitle && input.title.length >= 40 && input.title.length <= 70,
      detail: `${input.title.length} ký tự`,
      priority: 'high',
    },
    {
      key: 'meta',
      label: 'Meta description 120-160 ký tự',
      pass: input.metaDescription.length >= 120 && input.metaDescription.length <= 160,
      detail: `${input.metaDescription.length} ký tự`,
      priority: 'high',
    },
    {
      key: 'slug',
      label: 'Slug chứa từ khóa',
      pass: input.slug.length <= 75 && keywordInSlug,
      detail: `${input.slug.length} ký tự`,
      priority: 'medium',
    },
    {
      key: 'length',
      label: 'Độ dài đạt ngưỡng tối thiểu',
      pass: wordCount >= input.minWordCount,
      detail: `${wordCount.toLocaleString()}/${input.minWordCount.toLocaleString()} từ`,
      priority: 'high',
    },
    {
      key: 'density',
      label: 'Mật độ từ khóa tự nhiên',
      pass: density >= 0.6 && density <= 1.5,
      detail: `${density}%`,
      priority: 'high',
    },
    {
      key: 'internal',
      label: 'Có liên kết nội bộ',
      pass: links.internal >= 1,
      detail: `${links.internal} liên kết nội bộ`,
      priority: 'high',
    },
    {
      key: 'external',
      label: 'Có nguồn/link ngoài đáng tin',
      pass: links.external >= 1,
      detail: `${links.external} liên kết ngoài`,
      priority: 'medium',
    },
    {
      key: 'semantic',
      label: 'Có từ khóa phụ/semantic trong nội dung',
      pass: input.secondaryKeywords.length === 0 || secondaryCovered > 0,
      detail: input.secondaryKeywords.length ? `${secondaryCovered}/${input.secondaryKeywords.length} từ khóa phụ` : 'Không cấu hình từ khóa phụ',
      priority: 'medium',
    },
    {
      key: 'eeat',
      label: 'Có số liệu/ngữ cảnh cụ thể',
      pass: hasSpecificData,
      detail: hasSpecificData ? 'Có dữ kiện cụ thể' : 'Nên thêm số liệu, năm, thông số',
      priority: 'medium',
    },
    {
      key: 'human',
      label: 'Giọng văn đủ tự nhiên',
      pass: effectiveHumanness != null && effectiveHumanness >= 76,
      detail: effectiveHumanness == null ? 'Chưa scan AI tab' : `${effectiveHumanness}/100`,
      priority: 'high',
    },
    {
      key: 'ai-banned',
      label: 'AI Check không còn từ cấm',
      pass: aiBannedCount != null && aiBannedCount === 0,
      detail: aiBannedCount == null ? 'Chưa scan AI tab' : `${aiBannedCount} từ cấm`,
      priority: 'high',
    },
    {
      key: 'ai-critical',
      label: 'AI Check không còn flag đỏ',
      pass: aiCriticalFlags != null && aiCriticalFlags === 0,
      detail: aiCriticalFlags == null ? 'Chưa scan AI tab' : `${aiCriticalFlags} flag đỏ`,
      priority: 'high',
    },
    {
      key: 'ai-tone',
      label: 'Tone consistency ổn định',
      pass: aiToneScore != null && aiToneScore >= 70,
      detail: aiToneScore == null ? 'Chưa scan AI tab' : `${aiToneScore}/100`,
      priority: 'medium',
    },
  ];

  const weight: Record<ReadinessPriority, number> = { high: 3, medium: 2, low: 1 };
  const total = items.reduce((sum, item) => sum + weight[item.priority], 0);
  const passed = items.reduce((sum, item) => sum + (item.pass ? weight[item.priority] : 0), 0);
  const score = Math.round((passed / total) * 100);
  const failed = items.filter((item) => !item.pass);
  const highPriorityFailed = failed.filter((item) => item.priority === 'high');

  return {
    score,
    status: highPriorityFailed.length > 0 ? 'blocked' : score >= 85 ? 'ready' : 'review',
    items,
    failed,
    highPriorityFailed,
  };
}

function PublishReadinessCard({
  readiness,
  actions,
  feedbacks,
}: {
  readiness: PublishReadiness;
  actions?: Partial<Record<string, PublishFixAction>>;
  feedbacks?: Partial<Record<string, PublishFixFeedback>>;
}) {
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
        <div
          className={`h-full rounded-full ${readiness.status === 'ready' ? 'bg-green-500' : readiness.status === 'blocked' ? 'bg-red-500' : 'bg-amber-500'}`}
          style={{ width: `${readiness.score}%` }}
        />
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
                <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                  item.priority === 'high'
                    ? 'bg-red-100 text-red-700'
                    : item.priority === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                }`}>
                  {item.priority === 'high' ? 'Cao' : item.priority === 'medium' ? 'Vừa' : 'Thấp'}
                </span>
              </div>
              {actions?.[item.key] && (
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={actions[item.key]?.onClick}
                    disabled={actions[item.key]?.disabled}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actions[item.key]?.label}
                  </button>
                  {feedbacks?.[item.key] && (
                    <p className={`text-[11px] ${
                      feedbacks[item.key]?.tone === 'success'
                        ? 'text-green-700'
                        : feedbacks[item.key]?.tone === 'error'
                          ? 'text-red-700'
                          : 'text-blue-700'
                    }`}>
                      {feedbacks[item.key]?.text}
                    </p>
                  )}
                </div>
              )}
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
        <span className="text-xs font-semibold text-gray-700">Điểm SEO</span>
        <span className="text-sm font-bold" style={{ color }}>{score}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <p className="mt-1 text-xs" style={{ color }}>{label}</p>
    </div>
  );
}

function QualityTab({ result, keywordDensity }: { result: VtgsStreamResult | null; keywordDensity: number }) {
  return (
    <div className="space-y-4 p-4">
      {result ? (
        <HumannessPanel
          score={result.humannessScore}
          decision={result.decision}
          issues={[]}
          forbiddenFound={[]}
          stale={false}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-3xl font-black text-gray-300">—</p>
          <p className="mt-1 text-xs text-gray-400">Điểm tự nhiên sẽ có sau khi bài viết hoàn tất</p>
        </div>
      )}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">Mật độ từ khóa</span>
          <span className="text-sm font-bold text-gray-800">{keywordDensity.toFixed(2)}%</span>
        </div>
        <KeywordDensityBar density={keywordDensity} />
      </div>
    </div>
  );
}

function LinksTab({
  searchResult,
  onInsert,
}: {
  searchResult: SearchResult | null;
  onInsert: (html: string) => void;
}) {
  const sources = searchResult?.sources || [];

  return (
    <div className="space-y-3 p-4">
      {sources.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <div className="mb-2 text-3xl">🔎</div>
          <p className="mb-1 text-sm font-semibold text-gray-700">Chưa có nguồn Google Search</p>
          <p className="text-xs text-gray-400">Nếu tìm kiếm thất bại, bài vẫn có thể được viết theo chế độ chỉ dùng AI.</p>
        </div>
      ) : (
        sources.map((source, index) => (
          <div key={`${source.url}-${index}`} className="rounded-lg border border-gray-200 bg-white p-4">
            <a href={source.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-sm font-semibold text-blue-700 underline">
              {source.title}
            </a>
            <p className="mt-1 line-clamp-3 text-xs text-gray-500">{source.snippet}</p>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              <span className={source.crawled ? 'text-green-600' : 'text-gray-400'}>
                {source.crawled ? 'Đã crawl' : 'Chỉ có mô tả ngắn'} - {source.wordCount} từ
              </span>
              <button
                type="button"
                onClick={() => onInsert(`<p>Nguồn tham khảo: <a href="${source.url}" rel="nofollow noopener" target="_blank">${source.title}</a></p>`)}
                className="rounded-lg bg-blue-50 px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100"
              >
                Chèn nguồn
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SeoTab({
  html,
  keyword,
  secondaryKeywords,
  title,
  metaDescription,
  slug,
  seoScore,
  articleId,
  humannessScore,
  modelId,
  keywordDensity,
  internalLinks,
  loadingLinks,
  fieldHighlights,
  fixingDensity,
  fixingTitleLength,
  fixingSlugLength,
  onMetaChange,
  onAddKeyword,
  onRemoveKeyword,
  onFixTitle,
  onFixMeta,
  onFixSlug,
  onFixTitleToStart,
  onFixTitleNumber,
  onFixAltText,
  onFixDensity,
  onFixTitleLength,
  onFixSlugLength,
  onInsertInternalLink,
  onInsertExternalLink,
  onRestart,
}: {
  html: string;
  keyword: string;
  secondaryKeywords: string[];
  title: string;
  metaDescription: string;
  slug: string;
  seoScore: number;
  articleId: string;
  humannessScore: number | null;
  modelId: string;
  keywordDensity: number;
  internalLinks: TinhGonInternalLinkSuggestion[];
  loadingLinks: boolean;
  fieldHighlights: { title: boolean; slug: boolean; meta: boolean };
  fixingDensity: boolean;
  fixingTitleLength: boolean;
  fixingSlugLength: boolean;
  onMetaChange: (field: 'title' | 'description', value: string) => void;
  onAddKeyword: (value: string) => void;
  onRemoveKeyword: (value: string) => void;
  onFixTitle: () => void;
  onFixMeta: () => void;
  onFixSlug: () => void;
  onFixTitleToStart: () => void;
  onFixTitleNumber: () => void;
  onFixAltText: () => void;
  onFixDensity: () => void;
  onFixTitleLength: () => void;
  onFixSlugLength: () => void;
  onInsertInternalLink: (html: string) => void;
  onInsertExternalLink: (url: string, text: string) => void;
  onRestart: () => void;
}) {
  const seo = useMemo(() => {
    const wordCount = stripHtml(html).split(/\s+/).filter(Boolean).length;
    return computeSeoChecks({
      title,
      metaDescription,
      html,
      wordCount,
      keyword,
      secondaryKeywords,
      slug,
      minWordCount: 400,
    });
  }, [html, keyword, metaDescription, secondaryKeywords, slug, title]);

  const [newKeyword, setNewKeyword] = useState('');
  const [showSerp, setShowSerp] = useState(true);
  const [openBasic, setOpenBasic] = useState(true);
  const [openAdvanced, setOpenAdvanced] = useState(true);
  const [openTitle, setOpenTitle] = useState(true);
  const [fixingInternal, setFixingInternal] = useState(false);
  const [internalUrl, setInternalUrl] = useState('');
  const [internalText, setInternalText] = useState('');
  const [fixingExternal, setFixingExternal] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalText, setExternalText] = useState('');
  const siteUrl = 'noithatminhquan.vn';
  const humannessBreakdown = useMemo(() => {
    const score = humannessScore ?? 0;
    return [
      ['Ngôn ngữ tự nhiên', Math.round(score * 0.25)],
      ['Cấu trúc bài', Math.round(score * 0.25)],
      ['E-E-A-T', Math.round(score * 0.24)],
      ['Engagement', Math.round(score * 0.26)],
    ] as const;
  }, [humannessScore]);

  return (
    <div className="space-y-5 p-4">
      <div className="space-y-3">
        <SeoScoreBar score={seoScore} />
        <KeywordDensityBar density={keyword ? keywordDensity : null} />
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">Trạng thái draft</span>
          <span className="text-xs text-gray-400">{articleId ? 'Đã liên kết dữ liệu' : ''}</span>
        </div>
        <div className="space-y-1 text-xs text-gray-500">
          <p>Từ khóa: <span className="text-gray-700">{keyword}</span></p>
          <p>Mô hình: <span className="text-gray-700">{modelId}</span></p>
        </div>
        <div className="border-t border-gray-100 pt-2">
          <label className="mb-2 block text-xs font-semibold text-gray-700">Meta description</label>
          <textarea
            value={metaDescription}
            onChange={(event) => onMetaChange('description', event.target.value)}
            rows={4}
            className={`w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldHighlights.meta ? 'border-yellow-300 bg-yellow-50 text-yellow-900' : 'border-gray-300'
            }`}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => setShowSerp((prev) => !prev)}
          className="flex w-full items-center justify-between bg-gray-50 px-3 py-2.5 text-left transition-colors hover:bg-gray-100"
        >
          <span className="text-xs font-semibold text-gray-700">Xem trước SERP</span>
          <span className="text-xs text-gray-400">{showSerp ? '▾' : '▸'}</span>
        </button>
        {showSerp && (
          <div className="p-3">
            <p className={`mb-2 break-all rounded px-2 py-1 font-mono text-xs ${
              fieldHighlights.slug ? 'border border-yellow-300 bg-yellow-50 text-yellow-800' : 'text-gray-400'
            }`}>/{slug}</p>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className={`line-clamp-2 rounded px-2 py-1 text-sm font-medium leading-snug text-blue-700 ${
                fieldHighlights.title ? 'border border-yellow-300 bg-yellow-50' : ''
              }`}>{title}</p>
              <p className={`mt-0.5 truncate rounded px-2 py-1 text-xs ${
                fieldHighlights.slug ? 'border border-yellow-300 bg-yellow-50 text-yellow-800' : 'text-green-700'
              }`}>{siteUrl} ▸ {slug}</p>
              <p className={`mt-1 line-clamp-3 rounded px-2 py-1 text-xs leading-relaxed ${
                fieldHighlights.meta ? 'border border-yellow-300 bg-yellow-50 text-yellow-900' : 'text-gray-600'
              }`}>
                {metaDescription || 'Meta description sẽ hiển thị ở đây'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {secondaryKeywords.map((item) => (
            <span key={item} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
              {item}
              <button type="button" onClick={() => onRemoveKeyword(item)} className="text-blue-400 hover:text-blue-700">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newKeyword}
            onChange={(event) => setNewKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onAddKeyword(newKeyword);
                setNewKeyword('');
              }
            }}
            placeholder="Thêm từ khóa..."
            className="flex-1 rounded border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button type="button" onClick={() => { onAddKeyword(newKeyword); setNewKeyword(''); }} className="rounded-lg bg-blue-600 px-4 py-2 text-xs text-white hover:bg-blue-700">+</button>
        </div>
      </div>

      {([
        { key: 'basic', label: 'SEO Cơ bản', open: openBasic, setOpen: setOpenBasic },
        { key: 'advanced', label: 'Nâng cao', open: openAdvanced, setOpen: setOpenAdvanced },
        { key: 'title', label: 'Tiêu đề thu hút', open: openTitle, setOpen: setOpenTitle },
      ] as const).map(({ key, label, open, setOpen }) => {
        const groupItems = seo.checks.map((check, index) => ({ check, index })).filter(({ check }) => check.group === key);
        const groupErrors = groupItems.filter(({ check }) => !check.pass).length;

        return (
          <div key={key} className="border-t border-gray-100 pt-2">
            <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-1.5 text-left">
              <span className="text-xs font-semibold text-gray-700">{label}</span>
              <div className="flex items-center gap-1.5">
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${groupErrors === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                  {groupErrors === 0 ? '✓ Ổn' : `${groupErrors} Lỗi`}
                </span>
                <span className="text-xs text-gray-400">{open ? '−' : '+'}</span>
              </div>
            </button>

            {open && (
              <div className="mb-2 mt-1 space-y-2">
                {groupItems.map(({ check, index }) => (
                  <div key={index}>
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs text-white ${check.pass ? 'bg-green-500' : 'bg-red-500'}`}>
                        {check.pass ? '✓' : '×'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-snug ${check.pass ? 'text-gray-500' : 'font-medium text-gray-800'}`}>
                          {check.label}
                          {check.detail && <span className="font-normal text-gray-400"> — {check.detail}</span>}
                        </p>
                        {!check.pass && index === 0 && <button type="button" onClick={onFixTitle} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Thêm từ khóa vào tiêu đề</button>}
                        {!check.pass && index === 1 && <button type="button" onClick={onFixMeta} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Chèn từ khóa vào meta</button>}
                        {!check.pass && index === 2 && <button type="button" onClick={onFixSlug} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Tạo slug chuẩn</button>}
                        {!check.pass && index === 6 && <button type="button" onClick={onFixDensity} disabled={fixingDensity} className="mt-0.5 text-xs font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50">{fixingDensity ? 'AI đang xử lý...' : '⚡ AI sửa — Tăng mật độ từ khóa'}</button>}
                        {!check.pass && index === 8 && <button type="button" onClick={() => {
                          if (internalLinks[0]) {
                            setInternalUrl(internalLinks[0].url);
                            setInternalText(internalLinks[0].suggestText || internalLinks[0].title);
                          }
                          setFixingInternal((prev) => !prev);
                        }} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Chèn liên kết nội bộ</button>}
                        {!check.pass && index === 9 && <button type="button" onClick={() => setFixingExternal((prev) => !prev)} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Chèn liên kết ngoài</button>}
                        {!check.pass && index === 10 && <button type="button" onClick={onFixAltText} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Tự động thêm alt text</button>}
                        {!check.pass && index === 12 && <button type="button" onClick={onFixTitleToStart} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Đưa từ khóa lên đầu tiêu đề</button>}
                        {!check.pass && index === 13 && <button type="button" onClick={onFixTitleNumber} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Thêm năm {new Date().getFullYear()}</button>}
                      </div>
                    </div>

                    {!check.pass && index === 17 && (
                      <button type="button" onClick={onFixTitleLength} disabled={fixingTitleLength} className="ml-6 mt-1 text-xs font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50">
                        {fixingTitleLength ? 'AI đang xử lý...' : '⚡ AI sửa — Chỉnh tiêu đề 50-70 ký tự'}
                      </button>
                    )}
                    {!check.pass && index === 7 && (
                      <button type="button" onClick={onFixSlugLength} disabled={fixingSlugLength} className="ml-6 mt-1 text-xs font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50">
                        {fixingSlugLength ? 'AI đang xử lý...' : '⚡ AI sửa — Rút gọn slug dưới 75 ký tự'}
                      </button>
                    )}

                    {!check.pass && index === 8 && fixingInternal && (
                      <div className="ml-6 mt-2 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <p className="text-xs font-semibold text-blue-700">Chèn liên kết nội bộ cuối bài</p>
                        <input type="text" value={internalUrl} onChange={(event) => setInternalUrl(event.target.value)} placeholder="/slug-hoac-url-day-du" className="w-full rounded border border-blue-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        <input type="text" value={internalText} onChange={(event) => setInternalText(event.target.value)} placeholder="Anchor text" className="w-full rounded border border-blue-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { onInsertInternalLink(`<a href="${internalUrl}">${internalText}</a>`); setFixingInternal(false); }} disabled={!internalUrl.trim() || !internalText.trim()} className="flex-1 rounded bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">Chèn vào bài</button>
                          <button type="button" onClick={() => setFixingInternal(false)} className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50">Hủy</button>
                        </div>
                      </div>
                    )}
                    {!check.pass && index === 9 && fixingExternal && (
                      <div className="ml-6 mt-2 space-y-2 rounded-lg border border-purple-200 bg-purple-50 p-3">
                        <p className="text-xs font-semibold text-purple-700">Chèn liên kết ngoài cuối bài</p>
                        <input type="text" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://example.com/nguon-tham-khao" className="w-full rounded border border-purple-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" />
                        <input type="text" value={externalText} onChange={(event) => setExternalText(event.target.value)} placeholder="Tên nguồn tham khảo" className="w-full rounded border border-purple-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { onInsertExternalLink(externalUrl, externalText); setFixingExternal(false); setExternalUrl(''); setExternalText(''); }} disabled={!externalUrl.trim() || !externalText.trim()} className="flex-1 rounded bg-purple-600 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:bg-gray-300">Chèn vào bài</button>
                          <button type="button" onClick={() => setFixingExternal(false)} className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50">Hủy</button>
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

      {humannessScore !== null && (
        <div className="border-t border-gray-100 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Điểm tự nhiên</span>
            <span className={`text-sm font-bold ${humannessScore >= 76 ? 'text-green-600' : humannessScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
              {humannessScore}/100
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full rounded-full ${humannessScore >= 76 ? 'bg-green-500' : humannessScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${humannessScore}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {humannessBreakdown.map(([label, value]) => (
              <div key={label as string} className="rounded-lg bg-gray-50 p-2 text-center">
                <p className="text-sm font-bold text-gray-800">{value as number}</p>
                <p className="mt-0.5 text-xs leading-tight text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={onRestart} className="w-full rounded-lg border border-orange-300 py-2 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-50">
        Viết lại từ đầu
      </button>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Internal links gợi ý</p>
          {loadingLinks && <span className="text-xs text-gray-400">Đang tải...</span>}
        </div>
        <InternalLinkSuggest links={internalLinks} onInsert={onInsertInternalLink} />
        {!loadingLinks && internalLinks.length === 0 && (
          <p className="text-sm text-gray-500">Chưa có gợi ý internal link phù hợp.</p>
        )}
      </div>
    </div>
  );
}

function AiTab({
  html,
  selectedText,
  aiEditing,
  aiCheckStorageKey,
  scanSignal,
  onScanConsumed,
  onAiEdit,
  onApplyFix,
  onRevealApplied,
  getSentenceTargets,
  onAiCheckResultChange,
  onAiRewrite,
}: {
  html: string;
  selectedText: string;
  aiEditing: boolean;
  aiCheckStorageKey?: string;
  scanSignal?: number;
  onScanConsumed?: (signal: number) => void;
  onAiEdit: (command: AiAssistCommand) => void;
  onApplyFix: (original: string, replacement: string, sentenceIndex?: number, target?: SentenceTarget) => void;
  onRevealApplied: (locator: AppliedFixLocator) => void;
  getSentenceTargets: () => SentenceTarget[];
  onAiCheckResultChange?: (result: AICheckResult | null) => void;
  onAiRewrite?: (snippet: string, flagLabel: string, target?: SentenceTarget) => void;
}) {
  const hasSelection = selectedText.trim().length > 0;

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-700">AI Edit theo vùng chọn</p>
        <p className="mt-1 text-xs text-gray-400">
          {hasSelection
            ? `Đã chọn ${selectedText.length} ký tự để AI chỉnh.`
            : 'Bôi đen đoạn văn ngay trong editor bên trái rồi chọn lệnh AI Edit.'}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {VTGS_AI_EDIT_COMMANDS.map((command) => (
            <button
              key={command.value}
              type="button"
              onClick={() => onAiEdit(command.value)}
              disabled={!hasSelection || aiEditing}
              className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {aiEditing ? 'Đang xử lý...' : command.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <AICheckPanel
          html={html}
          storageKey={aiCheckStorageKey}
          scanSignal={scanSignal}
          onScanConsumed={onScanConsumed}
          onApplyFix={onApplyFix}
          onRevealApplied={onRevealApplied}
          getSentenceTargets={getSentenceTargets}
          onResultChange={onAiCheckResultChange}
          onAiRewrite={onAiRewrite}
        />
      </div>
    </div>
  );
}

function ImagesTab() {
  return (
    <div className="p-4">
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
        <p className="text-sm font-bold text-gray-700">Thư viện hình ảnh</p>
        <p className="mt-1 text-xs text-gray-400">Đang phát triển</p>
      </div>
    </div>
  );
}

function PublishTab({
  readiness,
  readinessActions,
  readinessFeedbacks,
  articleId,
  keyword,
  title,
  metaDescription,
  slug,
  seoScore,
  wordCount,
  onTitleChange,
  onMetaDescriptionChange,
  onSlugChange,
  onCopyHtml,
  onSaveDraft,
}: {
  readiness: PublishReadiness;
  readinessActions?: Partial<Record<string, PublishFixAction>>;
  readinessFeedbacks?: Partial<Record<string, PublishFixFeedback>>;
  articleId: string;
  keyword: string;
  title: string;
  metaDescription: string;
  slug: string;
  seoScore: number;
  wordCount: number;
  onTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onCopyHtml?: () => void;
  onSaveDraft?: () => Promise<void> | void;
}) {
  return (
    <div className="space-y-4 p-4">
      <PublishReadinessCard readiness={readiness} actions={readinessActions} feedbacks={readinessFeedbacks} />
      <GeneratePublishPanel
        articleId={articleId}
        keyword={keyword}
        title={title}
        metaDescription={metaDescription}
        slug={slug}
        wordCount={wordCount}
        seoScore={seoScore}
        onTitleChange={onTitleChange}
        onMetaDescriptionChange={onMetaDescriptionChange}
        onSlugChange={onSlugChange}
        onCopyHtml={onCopyHtml}
        onSaveDraft={onSaveDraft}
      />
    </div>
  );
}

function VtgsSeoTab({
  html,
  keyword,
  secondaryKeywords,
  title,
  metaDescription,
  slug,
  seoScore,
  articleId,
  humannessScore,
  modelId,
  keywordDensity,
  internalLinks,
  loadingLinks,
  fieldHighlights,
  fixingDensity,
  fixingTitleLength,
  fixingSlugLength,
  onMetaChange,
  onAddKeyword,
  onRemoveKeyword,
  onFixTitle,
  onFixMeta,
  onFixSlug,
  onFixTitleToStart,
  onFixTitleNumber,
  onFixAltText,
  onFixDensity,
  onFixTitleLength,
  onFixSlugLength,
  onInsertInternalLink,
  onInsertExternalLink,
  onRestart,
}: {
  html: string;
  keyword: string;
  secondaryKeywords: string[];
  title: string;
  metaDescription: string;
  slug: string;
  seoScore: number;
  articleId: string;
  humannessScore: number | null;
  modelId: string;
  keywordDensity: number;
  internalLinks: TinhGonInternalLinkSuggestion[];
  loadingLinks: boolean;
  fieldHighlights: { title: boolean; slug: boolean; meta: boolean };
  fixingDensity: boolean;
  fixingTitleLength: boolean;
  fixingSlugLength: boolean;
  onMetaChange: (field: 'title' | 'description', value: string) => void;
  onAddKeyword: (value: string) => void;
  onRemoveKeyword: (value: string) => void;
  onFixTitle: () => void;
  onFixMeta: () => void;
  onFixSlug: () => void;
  onFixTitleToStart: () => void;
  onFixTitleNumber: () => void;
  onFixAltText: () => void;
  onFixDensity: () => void;
  onFixTitleLength: () => void;
  onFixSlugLength: () => void;
  onInsertInternalLink: (html: string) => void;
  onInsertExternalLink: (url: string, text: string) => void;
  onRestart: () => void;
}) {
  const seo = useMemo(() => {
    const wordCount = stripHtml(html).split(/\s+/).filter(Boolean).length;
    return computeSeoChecks({
      title,
      metaDescription,
      html,
      wordCount,
      keyword,
      secondaryKeywords,
      slug,
      minWordCount: 400,
    });
  }, [html, keyword, metaDescription, secondaryKeywords, slug, title]);

  const [newKeyword, setNewKeyword] = useState('');
  const [showSerp, setShowSerp] = useState(true);
  const [openBasic, setOpenBasic] = useState(true);
  const [openAdvanced, setOpenAdvanced] = useState(true);
  const [openTitle, setOpenTitle] = useState(true);
  const [fixingInternal, setFixingInternal] = useState(false);
  const [internalUrl, setInternalUrl] = useState('');
  const [internalText, setInternalText] = useState('');
  const [fixingExternal, setFixingExternal] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalText, setExternalText] = useState('');
  const siteUrl = 'noithatminhquan.vn';
  const humannessBreakdown = useMemo(() => {
    const score = humannessScore ?? 0;
    return [
      ['Ngôn ngữ tự nhiên', Math.round(score * 0.25)],
      ['Cấu trúc bài', Math.round(score * 0.25)],
      ['E-E-A-T', Math.round(score * 0.24)],
      ['Engagement', Math.round(score * 0.26)],
    ] as const;
  }, [humannessScore]);

  return (
    <div className="space-y-5 p-4">
      <div className="space-y-3">
        <SeoScoreBar score={seoScore} />
        <KeywordDensityBar density={keyword ? keywordDensity : null} />
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">Trạng thái draft</span>
          <span className="text-xs text-gray-400">{articleId ? 'Đã liên kết dữ liệu' : ''}</span>
        </div>
        <div className="space-y-1 text-xs text-gray-500">
          <p>Từ khóa: <span className="text-gray-700">{keyword}</span></p>
          <p>Mô hình: <span className="text-gray-700">{modelId}</span></p>
        </div>
        <div className="border-t border-gray-100 pt-2">
          <label className="mb-2 block text-xs font-semibold text-gray-700">Meta description</label>
          <textarea
            value={metaDescription}
            onChange={(event) => onMetaChange('description', event.target.value)}
            rows={4}
            className={`w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldHighlights.meta ? 'border-yellow-300 bg-yellow-50 text-yellow-900' : 'border-gray-300'
            }`}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => setShowSerp((prev) => !prev)}
          className="flex w-full items-center justify-between bg-gray-50 px-3 py-2.5 text-left transition-colors hover:bg-gray-100"
        >
          <span className="text-xs font-semibold text-gray-700">Xem trước SERP</span>
          <span className="text-xs text-gray-400">{showSerp ? '▾' : '▸'}</span>
        </button>
        {showSerp && (
          <div className="p-3">
            <p className={`mb-2 break-all rounded px-2 py-1 font-mono text-xs ${
              fieldHighlights.slug ? 'border border-yellow-300 bg-yellow-50 text-yellow-800' : 'text-gray-400'
            }`}>/{slug}</p>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className={`line-clamp-2 rounded px-2 py-1 text-sm font-medium leading-snug text-blue-700 ${
                fieldHighlights.title ? 'border border-yellow-300 bg-yellow-50' : ''
              }`}>{title}</p>
              <p className={`mt-0.5 truncate rounded px-2 py-1 text-xs ${
                fieldHighlights.slug ? 'border border-yellow-300 bg-yellow-50 text-yellow-800' : 'text-green-700'
              }`}>{siteUrl} ▸ {slug}</p>
              <p className={`mt-1 line-clamp-3 rounded px-2 py-1 text-xs leading-relaxed ${
                fieldHighlights.meta ? 'border border-yellow-300 bg-yellow-50 text-yellow-900' : 'text-gray-600'
              }`}>
                {metaDescription || 'Meta description sẽ hiển thị ở đây'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {secondaryKeywords.map((item) => (
            <span key={item} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
              {item}
              <button type="button" onClick={() => onRemoveKeyword(item)} className="text-blue-400 hover:text-blue-700">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newKeyword}
            onChange={(event) => setNewKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onAddKeyword(newKeyword);
                setNewKeyword('');
              }
            }}
            placeholder="Thêm từ khóa..."
            className="flex-1 rounded border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button type="button" onClick={() => { onAddKeyword(newKeyword); setNewKeyword(''); }} className="rounded-lg bg-blue-600 px-4 py-2 text-xs text-white hover:bg-blue-700">+</button>
        </div>
      </div>

      {([
        { key: 'basic', label: 'SEO Cơ bản', open: openBasic, setOpen: setOpenBasic },
        { key: 'advanced', label: 'Nâng cao', open: openAdvanced, setOpen: setOpenAdvanced },
        { key: 'title', label: 'Tiêu đề thu hút', open: openTitle, setOpen: setOpenTitle },
      ] as const).map(({ key, label, open, setOpen }) => {
        const groupItems = seo.checks.map((check, index) => ({ check, index })).filter(({ check }) => check.group === key);
        const groupErrors = groupItems.filter(({ check }) => !check.pass).length;
        return (
          <div key={key} className="border-t border-gray-100 pt-2">
            <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-1.5 text-left">
              <span className="text-xs font-semibold text-gray-700">{label}</span>
              <div className="flex items-center gap-1.5">
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${groupErrors === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                  {groupErrors === 0 ? '✓ Ổn' : `${groupErrors} Lỗi`}
                </span>
                <span className="text-xs text-gray-400">{open ? '−' : '+'}</span>
              </div>
            </button>
            {open && (
              <div className="mb-2 mt-1 space-y-2">
                {groupItems.map(({ check, index }) => (
                  <div key={index}>
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs text-white ${check.pass ? 'bg-green-500' : 'bg-red-500'}`}>{check.pass ? '✓' : '×'}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-snug ${check.pass ? 'text-gray-500' : 'font-medium text-gray-800'}`}>
                          {check.label}
                          {check.detail && <span className="font-normal text-gray-400"> — {check.detail}</span>}
                        </p>
                        {!check.pass && index === 0 && <button type="button" onClick={onFixTitle} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Thêm từ khóa vào tiêu đề</button>}
                        {!check.pass && index === 1 && <button type="button" onClick={onFixMeta} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Chèn từ khóa vào meta</button>}
                        {!check.pass && index === 2 && <button type="button" onClick={onFixSlug} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Tạo slug chuẩn</button>}
                        {!check.pass && index === 6 && <button type="button" onClick={onFixDensity} disabled={fixingDensity} className="mt-0.5 text-xs font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50">{fixingDensity ? 'AI đang xử lý...' : '⚡ AI sửa — Tăng mật độ từ khóa'}</button>}
                        {!check.pass && index === 8 && <button type="button" onClick={() => {
                          if (internalLinks[0]) {
                            setInternalUrl(internalLinks[0].url);
                            setInternalText(internalLinks[0].suggestText || internalLinks[0].title);
                          }
                          setFixingInternal((prev) => !prev);
                        }} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Chèn liên kết nội bộ</button>}
                        {!check.pass && index === 9 && <button type="button" onClick={() => setFixingExternal((prev) => !prev)} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Chèn liên kết ngoài</button>}
                        {!check.pass && index === 10 && <button type="button" onClick={onFixAltText} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Tự động thêm alt text</button>}
                        {!check.pass && index === 12 && <button type="button" onClick={onFixTitleToStart} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Đưa từ khóa lên đầu tiêu đề</button>}
                        {!check.pass && index === 13 && <button type="button" onClick={onFixTitleNumber} className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800">🔧 Sửa — Thêm năm {new Date().getFullYear()}</button>}
                      </div>
                    </div>
                    {!check.pass && index === 17 && <button type="button" onClick={onFixTitleLength} disabled={fixingTitleLength} className="ml-6 mt-1 text-xs font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50">{fixingTitleLength ? 'AI đang xử lý...' : '⚡ AI sửa — Chỉnh tiêu đề 50-70 ký tự'}</button>}
                    {!check.pass && index === 7 && <button type="button" onClick={onFixSlugLength} disabled={fixingSlugLength} className="ml-6 mt-1 text-xs font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50">{fixingSlugLength ? 'AI đang xử lý...' : '⚡ AI sửa — Rút gọn slug dưới 75 ký tự'}</button>}
                    {!check.pass && index === 8 && fixingInternal && (
                      <div className="ml-6 mt-2 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <p className="text-xs font-semibold text-blue-700">Chèn liên kết nội bộ cuối bài</p>
                        <input type="text" value={internalUrl} onChange={(event) => setInternalUrl(event.target.value)} placeholder="/slug-hoac-url-day-du" className="w-full rounded border border-blue-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        <input type="text" value={internalText} onChange={(event) => setInternalText(event.target.value)} placeholder="Anchor text" className="w-full rounded border border-blue-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { onInsertInternalLink(`<a href="${internalUrl}">${internalText}</a>`); setFixingInternal(false); }} disabled={!internalUrl.trim() || !internalText.trim()} className="flex-1 rounded bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">Chèn vào bài</button>
                          <button type="button" onClick={() => setFixingInternal(false)} className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50">Hủy</button>
                        </div>
                      </div>
                    )}
                    {!check.pass && index === 9 && fixingExternal && (
                      <div className="ml-6 mt-2 space-y-2 rounded-lg border border-purple-200 bg-purple-50 p-3">
                        <p className="text-xs font-semibold text-purple-700">Chèn liên kết ngoài cuối bài</p>
                        <input type="text" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://example.com/nguon-tham-khao" className="w-full rounded border border-purple-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" />
                        <input type="text" value={externalText} onChange={(event) => setExternalText(event.target.value)} placeholder="Tên nguồn tham khảo" className="w-full rounded border border-purple-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { onInsertExternalLink(externalUrl, externalText); setFixingExternal(false); setExternalUrl(''); setExternalText(''); }} disabled={!externalUrl.trim() || !externalText.trim()} className="flex-1 rounded bg-purple-600 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:bg-gray-300">Chèn vào bài</button>
                          <button type="button" onClick={() => setFixingExternal(false)} className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50">Hủy</button>
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
      {humannessScore !== null && (
        <div className="border-t border-gray-100 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Điểm tự nhiên</span>
            <span className={`text-sm font-bold ${humannessScore >= 76 ? 'text-green-600' : humannessScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{humannessScore}/100</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full rounded-full ${humannessScore >= 76 ? 'bg-green-500' : humannessScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${humannessScore}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {humannessBreakdown.map(([label, value]) => (
              <div key={label} className="rounded-lg bg-gray-50 p-2 text-center">
                <p className="text-sm font-bold text-gray-800">{value}</p>
                <p className="mt-0.5 text-xs leading-tight text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <button type="button" onClick={onRestart} className="w-full rounded-lg border border-orange-300 py-2 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-50">Viết lại từ đầu</button>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Internal links gợi ý</p>
          {loadingLinks && <span className="text-xs text-gray-400">Đang tải...</span>}
        </div>
        <InternalLinkSuggest links={internalLinks} onInsert={onInsertInternalLink} />
        {!loadingLinks && internalLinks.length === 0 && <p className="text-sm text-gray-500">Chưa có gợi ý internal link phù hợp.</p>}
      </div>
    </div>
  );
}

export default function VietTuGoogleSearchGeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get('runId');
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedSignatureRef = useRef('');
  const editorShellRef = useRef<HTMLDivElement>(null);
  const latestAppliedFixRef = useRef<AppliedFixLocator | null>(null);
  const latestAppliedScrollTopRef = useRef<number | null>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const [config, setConfig] = useState<VtgsConfig | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [activeTab, setActiveTab] = useState<GenerateTab>('seo');
  const [sessionReady, setSessionReady] = useState(false);
  const [editableHtml, setEditableHtml] = useState('');
  const [streamDone, setStreamDone] = useState(false);
  const [title, setTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [articleId, setArticleId] = useState('');
  const [runId, setRunId] = useState('');
  const [seoScore, setSeoScore] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [aiEditing, setAiEditing] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarX, setToolbarX] = useState(0);
  const [toolbarY, setToolbarY] = useState(0);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [aiCheckResult, setAiCheckResult] = useState<AICheckResult | null>(null);
  const [internalLinks, setInternalLinks] = useState<TinhGonInternalLinkSuggestion[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [fieldHighlights, setFieldHighlights] = useState<{ title: boolean; slug: boolean; meta: boolean }>({
    title: false,
    slug: false,
    meta: false,
  });
  const [fixingDensity, setFixingDensity] = useState(false);
  const [fixingTitleLength, setFixingTitleLength] = useState(false);
  const [fixingSlugLength, setFixingSlugLength] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [aiCheckScanSignal, setAiCheckScanSignal] = useState(0);
  const [readinessFeedbacks, setReadinessFeedbacks] = useState<Partial<Record<string, PublishFixFeedback>>>({});
  const {
    streaming,
    activeStep,
    completedSteps,
    outputHtml,
    streamResult,
    error: streamError,
    startStream,
    abort,
  } = useGenerateStream('/api/viet-tu-google-search/stream');

  const finalResult = isVtgsResult(streamResult) ? streamResult : null;
  const displayedHtml = streamDone ? editableHtml : outputHtml;
  const panelTitle = title || `${config?.keyword || ''}: Hướng dẫn cập nhật`;
  const panelMeta = metaDescription || fallbackMeta(config?.keyword || '');
  const panelSlug = slug || slugify(panelTitle);
  const currentWordCount = useMemo(
    () => stripHtml(displayedHtml).split(/\s+/).filter(Boolean).length,
    [displayedHtml],
  );
  const currentKeywordDensity = useMemo(
    () => (config?.keyword ? computeKeywordDensity(displayedHtml, config.keyword) : 0),
    [config?.keyword, displayedHtml],
  );
  const currentSeoChecks = useMemo(() => {
    if (!config) return null;
    return computeSeoChecks({
      title: panelTitle,
      metaDescription: panelMeta,
      html: displayedHtml,
      wordCount: currentWordCount,
      keyword: config.keyword,
      secondaryKeywords: config.secondaryKeywords,
      slug: panelSlug,
      sourceCount: searchResult?.sources.length || 0,
      minWordCount: 400,
    });
  }, [config, currentWordCount, displayedHtml, panelMeta, panelSlug, panelTitle, searchResult?.sources.length]);
  const currentSeoScore = currentSeoChecks?.score ?? seoScore;
  const aiCheckStorageKey = useMemo(
    () => (articleId ? `aicheck:vtgs:${articleId}` : undefined),
    [articleId],
  );
  const effectiveHumannessScore = aiCheckResult?.humannessScore ?? finalResult?.humannessScore ?? null;
  const publishReadiness = useMemo(
    () => buildPublishReadiness({
      html: displayedHtml,
      title: panelTitle,
      metaDescription: panelMeta,
      slug: panelSlug,
      keyword: config?.keyword || '',
      secondaryKeywords: config?.secondaryKeywords || [],
      minWordCount: 400,
      humannessScore: finalResult?.humannessScore ?? null,
      aiCheckResult,
    }),
    [aiCheckResult, config?.keyword, config?.secondaryKeywords, displayedHtml, finalResult?.humannessScore, panelMeta, panelSlug, panelTitle],
  );
  const currentPersistSignature = useMemo(
    () => [
      articleId,
      panelTitle,
      panelMeta,
      panelSlug,
      displayedHtml,
      config?.keyword || '',
      config?.crawlMode || '',
      config?.addFreshnessDate ? 'fresh' : 'plain',
    ].join('|'),
    [articleId, config?.addFreshnessDate, config?.crawlMode, config?.keyword, displayedHtml, panelMeta, panelSlug, panelTitle],
  );
  const resolvedHumannessScore = effectiveHumannessScore ?? currentSeoScore;
  const resolvedAiDecision = finalResult?.decision
    ?? (resolvedHumannessScore >= 76 ? 'PUBLISH' : resolvedHumannessScore >= 60 ? 'REVIEW' : 'REWRITE');

  function clearVtgsSession() {
    sessionStorage.removeItem(VTGS_SESSION_KEY);
    sessionStorage.removeItem(VTGS_RESULT_SESSION_KEY);
    sessionStorage.removeItem(VTGS_RUN_ID_SESSION_KEY);
    sessionStorage.removeItem(VTGS_ARTICLE_ID_SESSION_KEY);
    sessionStorage.removeItem(VTGS_SEARCH_RESULT_SESSION_KEY);
  }

  function applyLoadedResult(nextConfig: VtgsConfig, nextResult: VtgsStreamResult, nextSearchResult: SearchResult | null) {
    setConfig(nextConfig);
    setSearchResult(nextSearchResult);
    setEditableHtml(nextResult.html);
    setStreamDone(true);
    setTitle(nextResult.title);
    setMetaDescription(nextResult.metaDescription);
    setSlug(nextResult.slug || slugify(nextResult.title));
    setArticleId(nextResult.articleId);
    setRunId(nextResult.runId);
    setSeoScore(nextResult.seoScore);
    setWordCount(nextResult.wordCount);
    lastSavedSignatureRef.current = [
      nextResult.articleId,
      nextResult.title,
      nextResult.metaDescription,
      nextResult.slug || slugify(nextResult.title),
      nextResult.html,
      nextConfig.keyword,
      nextConfig.crawlMode,
      nextConfig.addFreshnessDate ? 'fresh' : 'plain',
    ].join('|');
  }

  async function loadFromDatabase(targetRunId: string) {
    const response = await fetch(`/api/articles/by-runid/${encodeURIComponent(targetRunId)}`);
    const payload = await response.json() as {
      success?: boolean;
      error?: string;
      data?: VtgsDbArticlePayload;
    };

    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error || 'Không thể tải bài viết từ database.');
    }

    const article = payload.data;
    const storedOutline = parseStoredOutlinePayload(article.outline);
    const nextConfig = storedOutline?.config;

    if (!nextConfig) {
      throw new Error('Không tìm thấy cấu hình VTGS trong bài viết đã lưu.');
    }

    const nextSearchResult = storedOutline?.searchResult
      ?? (article.meta?.searchSources
        ? {
            keyword: article.keyword,
            sources: article.meta.searchSources,
            synthesis: '',
            relatedKeywords: article.secondaryKeywords || [],
            searchedAt: article.meta.searchedAt || new Date().toISOString(),
          }
        : null);

    sessionStorage.setItem(VTGS_SESSION_KEY, JSON.stringify(nextConfig));
    sessionStorage.setItem(VTGS_RUN_ID_SESSION_KEY, article.runId);
    sessionStorage.setItem(VTGS_ARTICLE_ID_SESSION_KEY, article.id);
    if (nextSearchResult) {
      sessionStorage.setItem(VTGS_SEARCH_RESULT_SESSION_KEY, JSON.stringify(nextSearchResult));
    } else {
      sessionStorage.removeItem(VTGS_SEARCH_RESULT_SESSION_KEY);
    }

    if (article.htmlContent) {
      const restoredResult: VtgsStreamResult = {
        articleId: article.id,
        runId: article.runId,
        html: article.htmlContent,
        title: article.selectedTitle || nextConfig.keyword,
        metaDescription: article.metaDescription || '',
        slug: article.slug || slugify(article.selectedTitle || nextConfig.keyword),
        wordCount: article.wordCount || stripHtml(article.htmlContent).split(/\s+/).filter(Boolean).length,
        seoScore: article.seoScore || 0,
        humannessScore: article.humannessScore || 0,
        decision: (article.aiDecision as VtgsStreamResult['decision']) || 'REVIEW',
        sources: nextSearchResult?.sources || [],
      };
      sessionStorage.setItem(VTGS_RESULT_SESSION_KEY, JSON.stringify(restoredResult));
      applyLoadedResult(nextConfig, restoredResult, nextSearchResult);
      return true;
    }

    setConfig(nextConfig);
    setSearchResult(nextSearchResult);
    setArticleId(article.id);
    setRunId(article.runId);
    await runPipeline(nextConfig);
  }

  async function bootstrap() {
    setSessionReady(false);

    if (runIdParam) {
      await loadFromDatabase(runIdParam);
      setSessionReady(true);
      return true;
    }

    const rawConfig = sessionStorage.getItem(VTGS_SESSION_KEY);
    if (!rawConfig) {
      router.push('/viet-tu-google-search');
      return true;
    }

    const nextConfig = JSON.parse(rawConfig) as VtgsConfig;
    const rawSearchResult = sessionStorage.getItem(VTGS_SEARCH_RESULT_SESSION_KEY);
    const rawResult = sessionStorage.getItem(VTGS_RESULT_SESSION_KEY);
    const storedArticleId = sessionStorage.getItem(VTGS_ARTICLE_ID_SESSION_KEY) || '';
    const storedRunId = sessionStorage.getItem(VTGS_RUN_ID_SESSION_KEY) || '';
    const nextSearchResult = rawSearchResult ? JSON.parse(rawSearchResult) as SearchResult : null;

    if (rawResult && storedArticleId && storedRunId) {
      const storedResult = JSON.parse(rawResult) as VtgsStreamResult;
      if (storedResult.articleId === storedArticleId && storedResult.runId === storedRunId) {
        applyLoadedResult(nextConfig, storedResult, nextSearchResult);
        setSessionReady(true);
        return;
      }
    }

    if (storedRunId) {
      await loadFromDatabase(storedRunId);
      setSessionReady(true);
      return;
    }

    setConfig(nextConfig);
    setSearchResult(nextSearchResult);
    setArticleId(storedArticleId);
    setRunId(storedRunId);
    setSessionReady(true);
    await runPipeline(nextConfig);
  }

  useEffect(() => {
    if (!config?.keyword || !displayedHtml.trim()) {
      setInternalLinks([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setLoadingLinks(true);
        try {
          const response = await fetch('/api/tinh-gon/internal-links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword: config.keyword, html: displayedHtml }),
          });
          const payload = await response.json() as { links?: TinhGonInternalLinkSuggestion[] };
          setInternalLinks(payload.links || []);
        } catch {
          setInternalLinks([]);
        } finally {
          setLoadingLinks(false);
        }
      })();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [config?.keyword, displayedHtml]);

  useEffect(() => {
    const latestAppliedFix = latestAppliedFixRef.current;
    const restoreScrollTop = latestAppliedScrollTopRef.current;
    latestAppliedScrollTopRef.current = null;

    if (activeTab !== 'ai' || !aiCheckResult) {
      clearTemporaryFixHighlights('pending');
      if (latestAppliedFix) {
        scheduleHighlightForLocator(latestAppliedFix, 'applied', {
          restoreScrollTop,
          scroll: false,
          select: false,
        });
      }
      return;
    }

    highlightPendingSnippets(
      aiCheckResult.flags.slice(0, 10).map((flag) => flag.snippet),
      latestAppliedFix,
    );
    if (latestAppliedFix) {
      scheduleHighlightForLocator(latestAppliedFix, 'applied', {
        restoreScrollTop,
        scroll: false,
        select: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, aiCheckResult, displayedHtml]);

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap();
      } catch {
        clearVtgsSession();
        router.push('/viet-tu-google-search');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, runIdParam]);

  useEffect(() => {
    if (!finalResult) return;
    setEditableHtml(finalResult.html);
    setStreamDone(true);
    setTitle(finalResult.title);
    setMetaDescription(finalResult.metaDescription);
    setSlug(finalResult.slug || slugify(finalResult.title));
    setArticleId(finalResult.articleId);
    setRunId(finalResult.runId);
    setSeoScore(finalResult.seoScore);
    setWordCount(finalResult.wordCount);
  }, [finalResult]);

  useEffect(() => {
    if (!sessionReady || !config) return;
    sessionStorage.setItem(VTGS_SESSION_KEY, JSON.stringify(config));
  }, [config, sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;
    if (searchResult) {
      sessionStorage.setItem(VTGS_SEARCH_RESULT_SESSION_KEY, JSON.stringify(searchResult));
      return;
    }
    sessionStorage.removeItem(VTGS_SEARCH_RESULT_SESSION_KEY);
  }, [searchResult, sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;
    if (articleId) {
      sessionStorage.setItem(VTGS_ARTICLE_ID_SESSION_KEY, articleId);
      return;
    }
    sessionStorage.removeItem(VTGS_ARTICLE_ID_SESSION_KEY);
  }, [articleId, sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;
    if (runId) {
      sessionStorage.setItem(VTGS_RUN_ID_SESSION_KEY, runId);
      return;
    }
    sessionStorage.removeItem(VTGS_RUN_ID_SESSION_KEY);
  }, [runId, sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!articleId || !runId || !displayedHtml.trim()) {
      sessionStorage.removeItem(VTGS_RESULT_SESSION_KEY);
      return;
    }

    const nextResult: VtgsStreamResult = {
      articleId,
      runId,
      html: displayedHtml,
      title: panelTitle,
      metaDescription: panelMeta,
      slug: panelSlug,
      wordCount: currentWordCount,
      seoScore: currentSeoScore,
      humannessScore: resolvedHumannessScore,
      decision: resolvedAiDecision,
      sources: searchResult?.sources || finalResult?.sources || [],
    };

    sessionStorage.setItem(VTGS_RESULT_SESSION_KEY, JSON.stringify(nextResult));
  }, [
    articleId,
    currentSeoScore,
    currentWordCount,
    displayedHtml,
    finalResult?.sources,
    panelMeta,
    panelSlug,
    panelTitle,
    resolvedAiDecision,
    resolvedHumannessScore,
    runId,
    sessionReady,
    searchResult?.sources,
  ]);

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
    if (!articleId || !config || !streamDone) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      if (currentPersistSignature === lastSavedSignatureRef.current || !currentSeoChecks) return;

      void (async () => {
        try {
          const response = await fetch(`/api/articles/${articleId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              keyword: config.keyword,
              language: config.language,
              contentType: `viet_tu_google_search:${config.crawlMode || 'auto'}`,
              targetLength: config.targetLength,
              aiProvider: config.modelId,
              brandConfig: config.brandConfig || config.brand,
              competitorUrls: searchResult?.sources.map((source) => source.url) || [],
              competitorAnalysis: searchResult?.synthesis || '',
              sourceType: searchResult?.sources.length ? 'google_search' : 'ai_only',
              meta: {
                searchSources: searchResult?.sources || [],
                searchedAt: searchResult?.searchedAt || null,
                crawlMode: config.crawlMode,
                addFreshnessDate: config.addFreshnessDate,
              },
              outline: {
                flow: 'viet_tu_google_search',
                stage: 'generate',
                config,
                finalOutline: config.editedOutline || config.userOutlineText || '',
                searchResult,
                aiCheck: readSessionAICheckState(aiCheckStorageKey),
              },
              selectedTitle: panelTitle,
              userNotes: config.editedOutline || config.userOutlineText || '',
              secondaryKeywords: config.secondaryKeywords,
              htmlContent: displayedHtml,
              plainText: stripHtml(displayedHtml),
              wordCount: currentWordCount,
              metaDescription: panelMeta,
              slug: panelSlug,
              seoScore: currentSeoChecks.score,
              seoChecks: currentSeoChecks.checks,
              humannessScore: resolvedHumannessScore,
              scoreBreakdown: {
                language_natural: Math.round(resolvedHumannessScore * 0.25),
                structure: Math.round(resolvedHumannessScore * 0.25),
                eeat_signals: Math.round(resolvedHumannessScore * 0.24),
                engagement: Math.round(resolvedHumannessScore * 0.26),
              },
              aiDecision: resolvedAiDecision,
            }),
          });

          if (response.ok) {
            lastSavedSignatureRef.current = currentPersistSignature;
          }
        } catch {
          // keep dirty so the next change can retry
        }
      })();
    }, 1200);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    articleId,
    aiCheckStorageKey,
    config,
    currentPersistSignature,
    currentSeoChecks,
    currentWordCount,
    displayedHtml,
    panelMeta,
    panelSlug,
    panelTitle,
    resolvedAiDecision,
    resolvedHumannessScore,
    searchResult,
    streamDone,
  ]);

  async function saveDraft(createVersion: boolean) {
    if (!articleId || !config) {
      throw new Error('Không có bài viết để lưu.');
    }
    if (!displayedHtml.trim()) {
      throw new Error('Chưa có nội dung để lưu.');
    }
    if (!currentSeoChecks) {
      throw new Error('Không thể tính SEO cho bản nháp hiện tại.');
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    if (!createVersion && currentPersistSignature === lastSavedSignatureRef.current) {
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1500);
      return;
    }

    const response = await fetch(`/api/articles/${articleId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: config.keyword,
        language: config.language,
        contentType: `viet_tu_google_search:${config.crawlMode || 'auto'}`,
        targetLength: config.targetLength,
        aiProvider: config.modelId,
        brandConfig: config.brandConfig || config.brand,
        outline: {
          flow: 'viet_tu_google_search',
          stage: 'generate',
          config,
          finalOutline: config.editedOutline || config.userOutlineText || '',
          searchResult,
          aiCheck: readSessionAICheckState(aiCheckStorageKey),
        },
        selectedTitle: panelTitle,
        userNotes: config.editedOutline || config.userOutlineText || '',
        htmlContent: displayedHtml,
        metaDescription: panelMeta,
        slug: panelSlug,
        wordCount: currentWordCount,
        seoScore: currentSeoChecks.score,
        seoChecks: currentSeoChecks.checks,
        humannessScore: resolvedHumannessScore,
        scoreBreakdown: {
          language_natural: Math.round(resolvedHumannessScore * 0.25),
          structure: Math.round(resolvedHumannessScore * 0.25),
          eeat_signals: Math.round(resolvedHumannessScore * 0.24),
          engagement: Math.round(resolvedHumannessScore * 0.26),
        },
        secondaryKeywords: config.secondaryKeywords,
        status: 'WRITTEN',
        aiDecision: resolvedAiDecision,
        createVersion,
      }),
    });

    const payload = await response.json().catch(() => ({ error: 'Không thể lưu bài viết.' })) as {
      success?: boolean;
      error?: string;
    };

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Không thể lưu bài viết.');
    }

    lastSavedSignatureRef.current = currentPersistSignature;
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  }

  async function handleSaveDraftWithBanner() {
    if (savingDraft) return;
    setSavingDraft(true);
    try {
      await saveDraft(false);
      setBanner({ tone: 'success', text: 'Đã lưu bài viết vào DB.' });
    } catch (requestError) {
      setBanner({ tone: 'error', text: requestError instanceof Error ? requestError.message : 'Không thể lưu bài viết.' });
    } finally {
      setSavingDraft(false);
      return true;
    }

    return false;
  }

  async function handlePublishSaveDraft() {
    await saveDraft(true);
  }

  async function runPipeline(nextConfig: VtgsConfig) {
    let nextSearchResult: SearchResult | null = null;

    if (nextConfig.crawlMode !== 'no_crawl') {
      setSearching(true);
      setSearchError('');
      try {
        const response = await fetch('/api/viet-tu-google-search/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword: nextConfig.keyword,
            count: nextConfig.searchResultCount,
            crawlMode: nextConfig.crawlMode,
            language: nextConfig.language,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error((data as { error?: string }).error || 'Search failed');
        }
        nextSearchResult = data as SearchResult;
        setSearchResult(nextSearchResult);
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : 'Tìm kiếm thất bại. Tiếp tục theo chế độ AI-only.');
      } finally {
        setSearching(false);
      }
    }

    await startStream({
      config: nextConfig,
      searchResult: nextSearchResult,
      finalOutline: nextConfig.editedOutline || nextConfig.userOutlineText || '',
    });
  }

  function handleMetaChange(field: 'title' | 'description', value: string) {
    if (field === 'title') {
      setTitle(value);
      setSlug(slugify(value));
    } else {
      setMetaDescription(value);
    }
  }

  function fixTitle() {
    if (!config) return;
    if (panelTitle.toLowerCase().includes(config.keyword.toLowerCase())) return;
    const nextTitle = `${config.keyword} - ${panelTitle}`.trim();
    setTitle(nextTitle);
    setSlug(slugify(nextTitle));
    setFieldHighlights((prev) => ({ ...prev, title: true }));
  }

  function fixMetaDescription() {
    if (!config) return;
    if (panelMeta.toLowerCase().includes(config.keyword.toLowerCase())) return;
    const nextMeta = panelMeta.trim()
      ? `${config.keyword}. ${panelMeta}`.slice(0, 160)
      : `${config.keyword}: thông tin ngắn gọn, thực tế, dễ áp dụng.`.slice(0, 160);
    setMetaDescription(nextMeta);
    setFieldHighlights((prev) => ({ ...prev, meta: true }));
  }

  function fixUrlSlug() {
    if (!config) return;
    const nextSlug = slugify(`${config.keyword} ${panelTitle}`) || slugify(config.keyword);
    setSlug(nextSlug);
    setFieldHighlights((prev) => ({ ...prev, slug: true }));
  }

  function fixTitleToStart() {
    if (!config) return;
    const plainTitle = panelTitle.trim();
    if (!plainTitle) {
      setTitle(config.keyword);
      return;
    }
    const keywordLow = config.keyword.toLowerCase();
    if (plainTitle.toLowerCase().startsWith(keywordLow)) return;
    const cleaned = plainTitle.replace(new RegExp(config.keyword, 'ig'), '').replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, '').trim();
    const nextTitle = cleaned ? `${config.keyword} - ${cleaned}` : config.keyword;
    setTitle(nextTitle);
    setSlug(slugify(nextTitle));
    setFieldHighlights((prev) => ({ ...prev, title: true }));
  }

  function fixTitleNumber() {
    if (/\d/.test(panelTitle)) return;
    const nextTitle = `${panelTitle} ${new Date().getFullYear()}`.trim();
    setTitle(nextTitle);
    setSlug(slugify(nextTitle));
    setFieldHighlights((prev) => ({ ...prev, title: true }));
  }

  async function fixTitleLengthWithAi() {
    if (!config || fixingTitleLength) return;
    const sourceTitle = panelTitle.trim() || config.keyword.trim();
    if (!sourceTitle) return;
    setFixingTitleLength(true);
    try {
      let nextTitle = sourceTitle;
      if (sourceTitle.length >= 10) {
        const assisted = await runAiAssistCommand(sourceTitle.length > 70 ? 'shorten' : 'rewrite', sourceTitle);
        if (assisted) nextTitle = stripInlineHtml(assisted);
      }
      const fixed = fitSeoTitleLength(nextTitle, config.keyword);
      setTitle(fixed);
      setSlug(slugify(fixed));
      setFieldHighlights((prev) => ({ ...prev, title: true }));
    } finally {
      setFixingTitleLength(false);
    }
  }

  async function fixSlugLengthWithAi() {
    if (!config || fixingSlugLength) return;
    const sourceText = (panelSlug || `${config.keyword} ${panelTitle}`).replace(/-/g, ' ').trim();
    if (!sourceText) return;
    setFixingSlugLength(true);
    try {
      let nextText = sourceText;
      if (sourceText.length >= 10) {
        const assisted = await runAiAssistCommand('shorten', sourceText);
        if (assisted) nextText = stripInlineHtml(assisted);
      }
      setSlug(fitSeoSlugLength(nextText, config.keyword));
      setFieldHighlights((prev) => ({ ...prev, slug: true }));
    } finally {
      setFixingSlugLength(false);
    }
  }

  async function callFixDensity() {
    if (!config || fixingDensity) return null;
    setFixingDensity(true);
    try {
      const beforeDensity = currentKeywordDensity;
      const plainText = displayedHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const currentCount = (plainText.toLowerCase().match(new RegExp(config.keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      const response = await fetch('/api/pipeline/fix-density', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: displayedHtml,
          keyword: config.keyword,
          currentCount,
          wordCount: currentWordCount,
        }),
      });
      const data = await response.json() as { success?: boolean; data?: { html?: string; changed?: boolean } };
      if (!response.ok || !data.success) {
        throw new Error('Không thể sửa mật độ từ khóa.');
      }

      const nextHtml = data.data?.html || displayedHtml;
      const afterDensity = computeKeywordDensity(nextHtml, config.keyword);
      const changed = Boolean(data.data?.changed && data.data?.html);

      if (changed && data.data?.html) {
        setEditableHtml(data.data.html);
        setStreamDone(true);
      }
      return {
        beforeDensity,
        afterDensity,
        changed,
        valid: afterDensity >= 0.6 && afterDensity <= 1.5,
      };
    } catch (error) {
      setBanner({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Không thể sửa mật độ từ khóa.',
      });
      throw error;
    } finally {
      setFixingDensity(false);
    }
  }

  function fixAltText() {
    const editorNode = editorShellRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null;
    if (!editorNode || !config) return;
    const images = Array.from(editorNode.querySelectorAll('img'));
    images.forEach((image, index) => {
      const alt = image.getAttribute('alt') || '';
      if (!alt.toLowerCase().includes(config.keyword.toLowerCase())) {
        image.setAttribute('alt', alt ? `${alt} - ${config.keyword}` : `${config.keyword} ${index + 1}`);
      }
    });
    setEditableHtml(editorNode.innerHTML);
    setStreamDone(true);
  }

  function addKeywordTag(value: string) {
    const nextValue = value.trim();
    if (!nextValue || !config) return;
    setConfig((prev) => prev && !prev.secondaryKeywords.includes(nextValue)
      ? { ...prev, secondaryKeywords: [...prev.secondaryKeywords, nextValue] }
      : prev);
  }

  function removeKeywordTag(value: string) {
    setConfig((prev) => prev ? { ...prev, secondaryKeywords: prev.secondaryKeywords.filter((item) => item !== value) } : prev);
  }

  function insertInternalLink(html: string) {
    setEditableHtml((prev) => `${prev}<p>Xem thêm: ${html}</p>`);
    setStreamDone(true);
  }

  function insertExternalLink(url: string, text: string) {
    const href = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
    setEditableHtml((prev) => `${prev}<p>Tham khảo: <a href="${href}" target="_blank" rel="noopener noreferrer">${text.trim()}</a></p>`);
    setStreamDone(true);
  }

  function insertHtml(html: string) {
    setEditableHtml((prev) => `${prev}${html}`);
  }

  function getVisibleEditorNode(): HTMLElement | null {
    return editorShellRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null;
  }

  function getEditorScrollContainer(): HTMLElement | null {
    const editorNode = getVisibleEditorNode();
    return editorNode?.parentElement ?? null;
  }

  function normalizeFixText(value: string): string {
    return stripHtml(value).replace(/\s+/g, ' ').trim();
  }

  function isBlockHighlightTag(tagName: string): boolean {
    return ['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TD', 'TH', 'FIGCAPTION'].includes(tagName);
  }

  function getHighlightElementForNode(node: Node): HTMLElement | null {
    const editorNode = getVisibleEditorNode();
    if (!editorNode) return null;

    if (node instanceof HTMLElement) {
      if (isBlockHighlightTag(node.tagName)) {
        return node;
      }

      const blockParent = node.closest('p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, figcaption');
      if (blockParent instanceof HTMLElement && editorNode.contains(blockParent)) {
        return blockParent;
      }

      return editorNode.contains(node) ? node : null;
    }

    if (node.parentElement) {
      const blockParent = node.parentElement.closest('p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, figcaption');
      if (blockParent instanceof HTMLElement && editorNode.contains(blockParent)) {
        return blockParent;
      }

      return editorNode.contains(node.parentElement) ? node.parentElement : null;
    }

    return null;
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

    const element = getHighlightElementForNode(range.commonAncestorContainer);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function notifyEditorHighlightSync() {
    getVisibleEditorNode()?.dispatchEvent(new Event('editor-highlight-sync', { bubbles: true }));
  }

  function resetTemporaryFixElement(element: HTMLElement) {
    element.removeAttribute('data-fix-hl');
    element.removeAttribute('data-fix-inline');
    element.style.background = '';
    element.style.borderLeft = '';
    element.style.paddingLeft = '';
    element.style.borderRadius = '';
    element.style.outline = '';
    element.style.boxShadow = '';
    element.style.fontWeight = '';
    element.style.padding = '';
    if (!element.getAttribute('style')) {
      element.removeAttribute('style');
    }
  }

  function clearTemporaryFixHighlights(tone?: EditorFixHighlightTone) {
    const editorNode = getVisibleEditorNode();
    if (!editorNode) return;

    editorNode.querySelectorAll('[data-fix-hl]').forEach((node) => {
      const element = node as HTMLElement;
      const currentTone = element.getAttribute('data-fix-hl') as EditorFixHighlightTone | null;
      if (tone && currentTone !== tone) {
        return;
      }

      if (element.getAttribute('data-fix-inline') === 'true') {
        const parent = element.parentNode;
        if (parent) {
          while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
          }
          parent.removeChild(element);
        }
        return;
      }

      resetTemporaryFixElement(element);
    });
    notifyEditorHighlightSync();
  }

  function highlightTemporaryElement(
    element: HTMLElement,
    tone: EditorFixHighlightTone,
    options?: { scroll?: boolean; clearSameTone?: boolean },
  ) {
    if (options?.clearSameTone !== false) {
      clearTemporaryFixHighlights(tone);
    }

    if (tone === 'applied') {
      const pendingAncestor = element.parentElement?.closest('[data-fix-hl="pending"]');
      if (pendingAncestor instanceof HTMLElement) {
        resetTemporaryFixElement(pendingAncestor);
      }
    }

    element.setAttribute('data-fix-hl', tone);
    const isInline = element.getAttribute('data-fix-inline') === 'true';

    if (isInline) {
      element.style.background = tone === 'applied' ? '#fecaca' : '#fef08a';
      element.style.borderLeft = '';
      element.style.paddingLeft = '';
      element.style.borderRadius = '5px';
      element.style.fontWeight = tone === 'applied' ? '700' : '';
      element.style.outline = tone === 'applied' ? '2px solid #dc2626' : '2px solid #ca8a04';
      element.style.boxShadow = tone === 'applied' ? '0 0 0 3px rgba(220,38,38,0.2)' : '0 0 0 2px rgba(202,138,4,0.08)';
      element.style.padding = tone === 'applied' ? '0 2px' : '';
    } else {
      element.style.background = tone === 'applied' ? '#fee2e2' : '#fef08a';
      element.style.borderLeft = tone === 'applied' ? '4px solid #dc2626' : '3px solid #ca8a04';
      element.style.paddingLeft = '10px';
      element.style.borderRadius = '0 4px 4px 0';
      element.style.outline = '';
      element.style.boxShadow = tone === 'applied' ? '0 0 0 3px rgba(220,38,38,0.14)' : '';
      element.style.fontWeight = tone === 'applied' ? '700' : '';
    }

    if (options?.scroll) {
      const scrollContainer = getEditorScrollContainer();
      if (scrollContainer) {
        const elementRect = element.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetTop = Math.max(
          0,
          scrollContainer.scrollTop + (elementRect.top - containerRect.top) - (scrollContainer.clientHeight / 2) + (elementRect.height / 2),
        );

        if (Math.abs(scrollContainer.scrollTop - targetTop) < 8) {
          scrollContainer.scrollTop = Math.max(0, targetTop - 48);
        }

        window.requestAnimationFrame(() => {
          scrollContainer.scrollTo({ top: targetTop, behavior: 'smooth' });
        });
      } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    notifyEditorHighlightSync();
  }

  function scheduleHighlightForSnippet(
    snippet: string,
    tone: EditorFixHighlightTone = 'applied',
    options?: { scroll?: boolean },
  ) {
    const normalizedSnippet = normalizeFixText(snippet);
    if (!normalizedSnippet) return;

    const snippetHead = normalizedSnippet.slice(0, 120);
    const tryHighlight = () => {
      const editorNode = getVisibleEditorNode();
      if (!editorNode) return;

      const blocks = Array.from(editorNode.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, figcaption'));
      const matchedBlock = blocks.find((block) => {
        const text = (block.textContent || '').replace(/\s+/g, ' ').trim();
        return text.includes(normalizedSnippet) || text.includes(snippetHead) || normalizedSnippet.includes(text.slice(0, 80));
      });

      if (matchedBlock instanceof HTMLElement) {
        highlightTemporaryElement(matchedBlock, tone, { scroll: options?.scroll ?? tone === 'applied' });
      }
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(tryHighlight);
    });
  }

  function highlightPendingSnippets(snippets: string[], appliedLocator?: AppliedFixLocator | null) {
    const editorNode = getVisibleEditorNode();
    if (!editorNode) return;

    clearTemporaryFixHighlights('pending');

    const normalizedSnippets = snippets
      .map((snippet) => stripHtml(snippet).replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 10);

    if (normalizedSnippets.length === 0) return;

    const appliedReplacement = appliedLocator ? normalizeFixText(appliedLocator.replacement) : '';
    const appliedOriginal = appliedLocator?.original ? normalizeFixText(appliedLocator.original) : '';
    const blocks = Array.from(editorNode.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, figcaption'));
    blocks.forEach((block) => {
      const text = (block.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      if (
        block instanceof HTMLElement
        && (
          block.getAttribute('data-fix-hl') === 'applied'
          || Boolean(block.querySelector('[data-fix-hl="applied"]'))
          || (appliedReplacement && (text.includes(appliedReplacement) || appliedReplacement.includes(text.slice(0, 80))))
          || (appliedOriginal && appliedReplacement && text.includes(appliedReplacement) && !text.includes(appliedOriginal))
        )
      ) {
        return;
      }

      const matched = normalizedSnippets.some((snippet) => text.includes(snippet) || snippet.includes(text.slice(0, 80)));
      if (matched && block instanceof HTMLElement) {
        highlightTemporaryElement(block, 'pending', { scroll: false, clearSameTone: false });
      }
    });
  }

  function getSentenceTargets() {
    const editorNode = getVisibleEditorNode();
    if (!editorNode) return [] as SentenceTarget[];

    const blocks = Array.from(editorNode.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, figcaption'));
    const scopedTargets = blocks.flatMap((block) => buildSentenceTargets(block as HTMLElement));

    if (scopedTargets.length === 0) {
      return buildSentenceTargets(editorNode);
    }

    return scopedTargets.map((target, index) => ({
      ...target,
      index,
    }));
  }

  function findSnippetRangeInTarget(target: SentenceTarget, snippet: string): Range | null {
    const editorNode = getVisibleEditorNode();
    if (!editorNode) return null;

    const range = target.range.cloneRange();
    if (!editorNode.contains(range.commonAncestorContainer)) {
      return null;
    }

    const normalizedSnippet = normalizeFixText(snippet);
    if (!normalizedSnippet) {
      return null;
    }

    const rootNode = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentNode;

    if (!rootNode) {
      return null;
    }

    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!(node instanceof Text) || !node.textContent) {
          return NodeFilter.FILTER_REJECT;
        }

        try {
          return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        } catch {
          return NodeFilter.FILTER_REJECT;
        }
      },
    });

    let combined = '';
    const map: Array<HighlightCharPoint | null> = [];
    let currentNode: Text | null;

    while ((currentNode = walker.nextNode() as Text | null)) {
      const text = currentNode.textContent || '';
      if (!text) continue;

      let startOffset = 0;
      let endOffset = text.length;

      if (currentNode === range.startContainer) {
        startOffset = range.startOffset;
      }

      if (currentNode === range.endContainer) {
        endOffset = range.endOffset;
      }

      const slice = text.slice(startOffset, endOffset);
      if (!slice) continue;

      if (shouldInsertSeparator(combined, slice)) {
        combined += ' ';
        map.push(null);
      }

      for (let index = 0; index < slice.length; index += 1) {
        const char = slice[index];
        const point = { node: currentNode, offset: startOffset + index };

        if (/\s/.test(char)) {
          if (!combined || combined[combined.length - 1] === ' ') {
            continue;
          }
          combined += ' ';
          map.push(point);
          continue;
        }

        combined += char;
        map.push(point);
      }
    }

    const matchIndex = combined.indexOf(normalizedSnippet);
    if (matchIndex < 0) {
      return null;
    }

    const matchEnd = matchIndex + normalizedSnippet.length;
    let startPoint: HighlightCharPoint | null = null;
    let endPoint: HighlightCharPoint | null = null;

    for (let index = matchIndex; index < matchEnd; index += 1) {
      if (map[index]) {
        startPoint = map[index];
        break;
      }
    }

    for (let index = matchEnd - 1; index >= matchIndex; index -= 1) {
      if (map[index]) {
        endPoint = map[index];
        break;
      }
    }

    if (!startPoint || !endPoint) {
      return null;
    }

    const matchRange = document.createRange();
    matchRange.setStart(startPoint.node, startPoint.offset);
    matchRange.setEnd(endPoint.node, endPoint.offset + 1);
    return matchRange;
  }

  function highlightRangePrecisely(
    range: Range,
    tone: EditorFixHighlightTone = 'applied',
    options?: { scroll?: boolean; select?: boolean },
  ): boolean {
    try {
      const wrapper = document.createElement('mark');
      wrapper.setAttribute('data-fix-hl', tone);
      wrapper.setAttribute('data-fix-inline', 'true');
      const fragment = range.extractContents();
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);
      // Do not clear the same tone here: the newly inserted inline mark would unwrap itself.
      highlightTemporaryElement(wrapper, tone, {
        scroll: options?.scroll ?? true,
        clearSameTone: false,
      });

      if (tone === 'applied' && options?.select !== false) {
        const selection = window.getSelection();
        const caretRange = document.createRange();
        caretRange.setStartAfter(wrapper);
        caretRange.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caretRange);
        getVisibleEditorNode()?.focus();
      }

      return true;
    } catch {
      return false;
    }
  }

  function highlightSentenceTarget(
    target: SentenceTarget,
    tone: EditorFixHighlightTone = 'applied',
    snippet?: string,
    options?: { scroll?: boolean; select?: boolean },
  ): boolean {
    const editorNode = getVisibleEditorNode();
    if (!editorNode) return false;

    const shouldScroll = options?.scroll ?? true;
    const preciseRange = snippet ? findSnippetRangeInTarget(target, snippet) : null;
    if (preciseRange && highlightRangePrecisely(preciseRange, tone, { scroll: shouldScroll, select: options?.select })) {
      return true;
    }

    const range = target.range.cloneRange();
    if (!editorNode.contains(range.commonAncestorContainer)) {
      return false;
    }

    try {
      return highlightRangePrecisely(range, tone, { scroll: shouldScroll, select: options?.select });
    } catch {
      const block = getHighlightElementForNode(range.commonAncestorContainer);
      if (!block) return false;
      highlightTemporaryElement(block, tone, { scroll: shouldScroll });
      return true;
    }
  }

  function scheduleHighlightForLocator(
    locator: AppliedFixLocator,
    tone: EditorFixHighlightTone = 'applied',
    options?: { restoreScrollTop?: number | null; scroll?: boolean; select?: boolean },
  ): boolean {
    const run = () => {
      const scrollContainer = getEditorScrollContainer();
      if (scrollContainer && options?.restoreScrollTop != null) {
        scrollContainer.scrollTop = options.restoreScrollTop;
      }

      if (tone === 'applied') {
        clearTemporaryFixHighlights('applied');
      }

      const target = findSentenceTargetForLocator(locator);
      if (target) {
        highlightSentenceTarget(target, tone, locator.replacement, {
          scroll: options?.scroll ?? tone === 'applied',
          select: options?.select,
        });
        return;
      }

      scheduleHighlightForSnippet(locator.replacement, tone, { scroll: options?.scroll ?? tone === 'applied' });
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run);
    });

    return true;
  }

  function rememberAppliedFix(locator: AppliedFixLocator, restoreScrollTop?: number | null) {
    latestAppliedFixRef.current = locator;
    latestAppliedScrollTopRef.current = restoreScrollTop ?? null;
  }

  function clearRememberedAppliedFix() {
    latestAppliedFixRef.current = null;
    latestAppliedScrollTopRef.current = null;
  }

  function queueAppliedFixHighlight(
    locator: AppliedFixLocator,
    restoreScrollTop?: number | null,
    options?: { scroll?: boolean; select?: boolean },
  ) {
    rememberAppliedFix(locator, restoreScrollTop);
    scheduleHighlightForLocator(locator, 'applied', {
      restoreScrollTop,
      scroll: options?.scroll ?? true,
      select: options?.select ?? true,
    });
  }

  function replaceSentenceTarget(target: SentenceTarget | undefined, replacement: string): boolean {
    const editorNode = getVisibleEditorNode();
    if (!target || !editorNode) return false;
    const restoreScrollTop = getEditorScrollContainer()?.scrollTop ?? null;

    const range = target.range.cloneRange();
    if (!editorNode.contains(range.commonAncestorContainer)) {
      return false;
    }

    const fragment = range.createContextualFragment(replacement);
    range.deleteContents();
    range.insertNode(fragment);
    const nextHtml = stripTemporaryFixMarkup(editorNode.innerHTML);
    setEditableHtml(nextHtml);
    setStreamDone(true);
    const locator = {
      sentenceIndex: target.index,
      original: target.text,
      replacement,
    };
    queueAppliedFixHighlight(locator, restoreScrollTop);
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function applyAICheckFixLegacy(original: string, replacement: string, _sentenceIndex?: number, target?: SentenceTarget) {
    if (replaceSentenceTarget(target, replacement)) {
      setBanner({ tone: 'success', text: 'Đã áp dụng gợi ý AI Check vào bài viết.' });
      return;
    }

    const nextHtml = displayedHtml.replace(original, replacement);
    if (nextHtml !== displayedHtml) {
      setEditableHtml(nextHtml);
      setStreamDone(true);
      scheduleHighlightForSnippet(replacement);
      setBanner({ tone: 'success', text: 'Đã áp dụng gợi ý AI Check vào bài viết.' });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function applyAICheckFixWithHighlightLegacy(original: string, replacement: string, _sentenceIndex?: number, target?: SentenceTarget): boolean {
    if (replaceSentenceTarget(target, replacement)) {
      setBanner({ tone: 'success', text: 'ÄÃ£ Ã¡p dá»¥ng gá»£i Ã½ AI Check vÃ o bÃ i viáº¿t.' });
      return true;
    }

    const nextHtml = displayedHtml.replace(original, replacement);
    if (nextHtml !== displayedHtml) {
      setEditableHtml(nextHtml);
      setStreamDone(true);
      scheduleHighlightForSnippet(replacement);
      setBanner({ tone: 'success', text: 'ÄÃ£ Ã¡p dá»¥ng gá»£i Ã½ AI Check vÃ o bÃ i viáº¿t.' });
      return true;
    }

    setBanner({ tone: 'error', text: 'KhÃ´ng tÃ¬m tháº¥y Ä‘oáº¡n cáº§n Ã¡p dá»¥ng trong bÃ i viáº¿t.' });
    return false;
  }

  function applyAICheckFix(original: string, replacement: string, _sentenceIndex?: number, target?: SentenceTarget): boolean {
    if (replaceSentenceTarget(target, replacement)) {
      setBanner({ tone: 'success', text: 'Đã áp dụng gợi ý AI Check vào bài viết. Đoạn vừa sửa đã chuyển từ vàng sang đỏ trong editor.' });
      return true;
    }

    const nextHtml = displayedHtml.replace(original, replacement);
    if (nextHtml !== displayedHtml) {
      const restoreScrollTop = getEditorScrollContainer()?.scrollTop ?? null;
      const locator = {
        sentenceIndex: _sentenceIndex ?? null,
        original,
        replacement,
      };
      setEditableHtml(nextHtml);
      setStreamDone(true);
      queueAppliedFixHighlight(locator, restoreScrollTop);
      setBanner({ tone: 'success', text: 'Đã áp dụng gợi ý AI Check vào bài viết. Đoạn vừa sửa đã chuyển từ vàng sang đỏ trong editor.' });
      return true;
    }

    setBanner({ tone: 'error', text: 'Không tìm thấy đoạn cần áp dụng trong bài viết.' });
    return false;
  }

  async function runAiAssistCommand(command: AiAssistCommand, text = selectedText.trim()): Promise<string> {
    if (!config || (!text && command !== 'intro' && command !== 'conclusion')) {
      return '';
    }

    const response = await fetch('/api/editor/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command,
        text: text || config.keyword,
        keyword: config.keyword,
        model: config.modelId,
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
        const line = event
          .split('\n')
          .map((item) => item.trim())
          .find((item) => item.startsWith('data: '));
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
        setEditableHtml(editorNode.innerHTML);
        setStreamDone(true);
        scheduleHighlightForSnippet(assistedHtml);
      } else {
        const nextHtml = displayedHtml.replace(selectedText, assistedHtml);
        if (nextHtml === displayedHtml) throw new Error('Không tìm thấy đoạn đã chọn trong HTML hiện tại.');
        setEditableHtml(nextHtml);
        setStreamDone(true);
        scheduleHighlightForSnippet(assistedHtml);
      }

      setBanner({ tone: 'success', text: 'AI đã cập nhật đoạn văn đang chọn.' });
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      setBanner({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Không thể xử lý AI inline.',
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

      const nextHtml = displayedHtml.replace(snippet, assistedHtml);
      if (nextHtml === displayedHtml) throw new Error('Không tìm thấy câu cần viết lại trong HTML hiện tại.');
      const restoreScrollTop = getEditorScrollContainer()?.scrollTop ?? null;
      const locator = {
        sentenceIndex: target?.index ?? null,
        original: target?.text || snippet,
        replacement: assistedHtml,
      };
      setEditableHtml(nextHtml);
      setStreamDone(true);
      queueAppliedFixHighlight(locator, restoreScrollTop);
      setBanner({ tone: 'success', text: `Đã viết lại câu flag: ${flagLabel}.` });
    } catch (error) {
      setBanner({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Không thể viết lại câu.',
      });
    } finally {
      setAiEditing(false);
    }
  }

  function requestAiScanFromPublish() {
    setActiveTab('ai');
    setAiCheckScanSignal((prev) => prev + 1);
  }

  function handleAiScanConsumed(signal: number) {
    setAiCheckScanSignal((prev) => (prev === signal ? 0 : prev));
  }

  function findSentenceTargetForLocator(locator: AppliedFixLocator): SentenceTarget | null {
    const targets = getSentenceTargets();
    if (targets.length === 0) {
      return null;
    }

    const normalizedReplacement = normalizeFixText(locator.replacement);
    const normalizedOriginal = normalizeFixText(locator.original || '');

    if (locator.sentenceIndex != null) {
      const directTarget = targets[locator.sentenceIndex];
      if (directTarget) {
        const directText = normalizeFixText(directTarget.text);
        if (
          (normalizedReplacement && (directText.includes(normalizedReplacement) || normalizedReplacement.includes(directText)))
          || (normalizedOriginal && (directText.includes(normalizedOriginal) || normalizedOriginal.includes(directText)))
        ) {
          return directTarget;
        }
      }
    }

    return targets.find((target) => {
      const targetText = normalizeFixText(target.text);
      return (
        (normalizedReplacement && (targetText.includes(normalizedReplacement) || normalizedReplacement.includes(targetText)))
        || (normalizedOriginal && (targetText.includes(normalizedOriginal) || normalizedOriginal.includes(targetText)))
      );
    }) || null;
  }

  function revealSentenceTarget(target: SentenceTarget, snippet?: string): boolean {
    const editorNode = getVisibleEditorNode();
    if (!editorNode) return false;

    const range = target.range.cloneRange();
    if (!editorNode.contains(range.commonAncestorContainer)) {
      return false;
    }

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    scrollRangeIntoView(range);
    return highlightSentenceTarget(target, 'applied', snippet || target.text);
  }

  function handleRevealAppliedFix(locator: AppliedFixLocator) {
    const restoreScrollTop = getEditorScrollContainer()?.scrollTop ?? null;
    rememberAppliedFix(locator, restoreScrollTop);
    const target = findSentenceTargetForLocator(locator);
    if (target && revealSentenceTarget(target, locator.replacement)) {
      setBanner({ tone: 'success', text: 'Đã đưa editor đến đúng câu vừa sửa và bôi đỏ đoạn đó.' });
      return;
    }

    queueAppliedFixHighlight(locator, restoreScrollTop);
    setBanner({ tone: 'success', text: 'Đã đưa editor đến đoạn vừa sửa và bôi đỏ đoạn đó.' });
  }

  function handleQuickInternalLinkFix() {
    if (internalLinks[0]) {
      insertInternalLink(`<a href="${internalLinks[0].url}">${internalLinks[0].suggestText || internalLinks[0].title}</a>`);
      setReadinessFeedbacks((prev) => ({
        ...prev,
        internal: { tone: 'success', text: 'Đã chèn nhanh 1 internal link vào cuối bài.' },
      }));
      setBanner({ tone: 'success', text: 'Đã chèn nhanh 1 internal link vào cuối bài.' });
      return;
    }

    setActiveTab('links');
    setReadinessFeedbacks((prev) => ({
      ...prev,
      internal: { tone: 'info', text: 'Đã mở tab Links để chọn internal link thủ công.' },
    }));
    setBanner({ tone: 'error', text: 'Chưa có internal link gợi ý để chèn nhanh. Hãy chọn thủ công ở tab Links.' });
  }

  async function handleCopyHtml() {
    if (!displayedHtml) return;
    await navigator.clipboard.writeText(displayedHtml);
  }

  function handleRestart() {
    clearVtgsSession();
    router.push('/viet-tu-google-search');
  }

  const readinessActions: Partial<Record<string, PublishFixAction>> = {
    title: {
      label: fixingTitleLength ? 'Đang sửa...' : 'Sửa tiêu đề',
      onClick: () => {
        setActiveTab('seo');
        if (panelTitle.length < 40 || panelTitle.length > 70) {
          void fixTitleLengthWithAi();
          return;
        }
        fixTitleToStart();
      },
      disabled: fixingTitleLength,
    },
    meta: {
      label: 'Sửa meta',
      onClick: () => {
        setActiveTab('seo');
        fixMetaDescription();
      },
    },
    length: {
      label: 'Mở editor',
      onClick: () => {
        setActiveTab('seo');
        editorShellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    },
    slug: {
      label: fixingSlugLength ? 'Đang sửa...' : 'Sửa slug',
      onClick: () => {
        setActiveTab('seo');
        if (panelSlug.length > 75) {
          void fixSlugLengthWithAi();
          return;
        }
        fixUrlSlug();
      },
      disabled: fixingSlugLength,
    },
    density: {
      label: fixingDensity ? 'Đang sửa...' : 'Sửa ngay',
      onClick: () => {
        setReadinessFeedbacks((prev) => ({
          ...prev,
          density: { tone: 'info', text: 'Đang phân tích và sửa mật độ từ khóa...' },
        }));
        void (async () => {
          try {
            const result = await callFixDensity();
            if (!result) return;

            const beforeText = `${result.beforeDensity.toFixed(2)}%`;
            const afterText = `${result.afterDensity.toFixed(2)}%`;

            if (result.valid) {
              setReadinessFeedbacks((prev) => ({
                ...prev,
                density: { tone: 'success', text: `Đã cập nhật mật độ: ${beforeText} -> ${afterText}.` },
              }));
              return;
            }

            if (result.changed) {
              setReadinessFeedbacks((prev) => ({
                ...prev,
                density: { tone: 'info', text: `AI đã chỉnh nhưng mật độ hiện vẫn là ${afterText}.` },
              }));
              return;
            }

            setReadinessFeedbacks((prev) => ({
              ...prev,
              density: { tone: 'error', text: `AI chưa sửa được, mật độ vẫn là ${afterText}.` },
            }));
          } catch {
            setReadinessFeedbacks((prev) => ({
              ...prev,
              density: { tone: 'error', text: 'Không thể tự sửa mật độ từ khóa.' },
            }));
          }
        })();
      },
      disabled: fixingDensity,
    },
    internal: {
      label: internalLinks.length > 0 ? 'Chèn link' : 'Mở Links',
      onClick: handleQuickInternalLinkFix,
    },
    external: {
      label: 'Mở SEO',
      onClick: () => setActiveTab('seo'),
    },
    semantic: {
      label: 'Mở SEO',
      onClick: () => setActiveTab('seo'),
    },
    eeat: {
      label: 'Mở SEO',
      onClick: () => setActiveTab('seo'),
    },
    human: {
      label: aiCheckResult ? 'Mở AI tab' : 'Quét AI',
      onClick: () => {
        if (aiCheckResult) {
          setActiveTab('ai');
          return;
        }
        requestAiScanFromPublish();
      },
    },
    'ai-banned': {
      label: aiCheckResult ? 'Mở AI tab' : 'Quét AI',
      onClick: () => {
        if (aiCheckResult) {
          setActiveTab('ai');
          return;
        }
        requestAiScanFromPublish();
      },
    },
    'ai-critical': {
      label: aiCheckResult ? 'Mở AI tab' : 'Quét AI',
      onClick: () => {
        if (aiCheckResult) {
          setActiveTab('ai');
          return;
        }
        requestAiScanFromPublish();
      },
    },
    'ai-tone': {
      label: aiCheckResult ? 'Mở AI tab' : 'Quét AI',
      onClick: () => {
        if (aiCheckResult) {
          setActiveTab('ai');
          return;
        }
        requestAiScanFromPublish();
      },
    },
  };

  if (!config) {
    return null;
  }

  const loading = searching || streaming;

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-gray-50">
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-gray-950">Viết từ tìm kiếm Google</h1>
            <p className="truncate text-sm text-gray-500">{config.keyword}</p>
          </div>
          <div className="flex items-center gap-2">
            {articleId && <ExportMenu articleId={articleId} html={displayedHtml} title={panelTitle} />}
            <button
              type="button"
              onClick={() => void handleSaveDraftWithBanner()}
              disabled={savingDraft || loading || !articleId || !displayedHtml}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                savedFlash
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {savingDraft ? 'Đang lưu...' : savedFlash ? '✓ Đã lưu' : 'Lưu DB'}
            </button>
            {loading && (
              <button
                type="button"
                onClick={abort}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Dừng tạo
              </button>
            )}
            <Link href="/viet-tu-google-search" className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cấu hình lại
            </Link>
          </div>
        </header>

        {(loading || searchError || streamError || banner) && (
          <div className="border-b border-gray-200 bg-white px-5 py-3">
            {loading && (
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="text-sm font-semibold text-blue-700">
                  {searching ? STEP_LABELS.searching : STEP_LABELS[activeStep] || 'Đang xử lý...'}
                </span>
              </div>
            )}
            {completedSteps.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {completedSteps.map((step) => (
                  <span key={step} className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                    Hoàn tất: {step}
                  </span>
                ))}
              </div>
            )}
            {searchError && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Cảnh báo tìm kiếm: {searchError}. Quy trình tiếp tục theo chế độ chỉ dùng AI.
              </p>
            )}
            {streamError && (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{streamError}</p>
            )}
            {banner && (
              <p className={`mt-2 rounded-lg border px-3 py-2 text-sm ${
                banner.tone === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}>
                {banner.text}
              </p>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-hidden p-5">
          <div className="h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div ref={editorShellRef} className="h-full">
              {displayedHtml ? (
                <RichArticleEditor
                  html={displayedHtml}
                  streaming={loading}
                  wordCount={wordCount}
                  keyword={config.keyword}
                  articleTitle={panelTitle}
                  fullWidth
                  onSave={() => void handleSaveDraftWithBanner()}
                  onChange={(html) => {
                    setEditableHtml(stripTemporaryFixMarkup(html));
                    setStreamDone(true);
                  }}
                  onClearHighlights={clearRememberedAppliedFix}
                />
              ) : (
                <div className="h-full space-y-5 p-8">
                  <div className="h-8 w-2/3 animate-pulse rounded bg-gray-200" />
                  <div className="space-y-3">
                    <div className="h-4 animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-4/6 animate-pulse rounded bg-gray-200" />
                  </div>
                  <div className="h-6 w-1/2 animate-pulse rounded bg-gray-200" />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <aside className="flex w-[420px] shrink-0 flex-col border-l border-gray-200 bg-white">
        <GeneratePanelTabs value={activeTab} onChange={setActiveTab} tabs={UNIFIED_GENERATE_TABS} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeTab === 'seo' && (
            <VtgsSeoTab
              html={displayedHtml}
              keyword={config.keyword}
              secondaryKeywords={config.secondaryKeywords}
              title={panelTitle}
              metaDescription={panelMeta}
              slug={panelSlug}
              seoScore={currentSeoScore}
              articleId={articleId}
              humannessScore={effectiveHumannessScore}
              modelId={config.modelId}
              keywordDensity={config.keyword ? computeKeywordDensity(displayedHtml, config.keyword) : 0}
              internalLinks={internalLinks}
              loadingLinks={loadingLinks}
              fieldHighlights={fieldHighlights}
              fixingDensity={fixingDensity}
              fixingTitleLength={fixingTitleLength}
              fixingSlugLength={fixingSlugLength}
              onMetaChange={handleMetaChange}
              onAddKeyword={addKeywordTag}
              onRemoveKeyword={removeKeywordTag}
              onFixTitle={fixTitle}
              onFixMeta={fixMetaDescription}
              onFixSlug={fixUrlSlug}
              onFixTitleToStart={fixTitleToStart}
              onFixTitleNumber={fixTitleNumber}
              onFixAltText={fixAltText}
              onFixDensity={() => void callFixDensity()}
              onFixTitleLength={() => void fixTitleLengthWithAi()}
              onFixSlugLength={() => void fixSlugLengthWithAi()}
              onInsertInternalLink={insertInternalLink}
              onInsertExternalLink={insertExternalLink}
              onRestart={handleRestart}
            />
          )}
          {activeTab === 'ai' && (
            <AiTab
              html={displayedHtml}
              selectedText={selectedText}
              aiEditing={aiEditing}
              aiCheckStorageKey={aiCheckStorageKey}
              scanSignal={aiCheckScanSignal}
              onScanConsumed={handleAiScanConsumed}
              onAiEdit={(command) => void handleAiEditCommand(command)}
              onApplyFix={applyAICheckFix}
              onRevealApplied={handleRevealAppliedFix}
              getSentenceTargets={getSentenceTargets}
              onAiCheckResultChange={setAiCheckResult}
              onAiRewrite={handleFlagAiRewrite}
            />
          )}
          {activeTab === 'quality' && <QualityTab result={finalResult} keywordDensity={currentKeywordDensity} />}
          {activeTab === 'links' && <LinksTab searchResult={searchResult} onInsert={insertHtml} />}
          {activeTab === 'publish' && (
            <PublishTab
              readiness={publishReadiness}
              readinessActions={readinessActions}
              readinessFeedbacks={readinessFeedbacks}
              articleId={articleId}
              keyword={config.keyword}
              title={panelTitle}
              metaDescription={panelMeta}
              slug={panelSlug}
              seoScore={currentSeoScore}
              wordCount={currentWordCount}
              onTitleChange={setTitle}
              onMetaDescriptionChange={setMetaDescription}
              onSlugChange={setSlug}
              onCopyHtml={() => void handleCopyHtml()}
              onSaveDraft={handlePublishSaveDraft}
            />
          )}
          {activeTab === 'images' && <ImagesTab />}
        </div>
      </aside>

      <AiFloatingToolbar
        visible={toolbarVisible && !loading}
        x={toolbarX}
        y={toolbarY}
        disabled={loading}
        onCommand={(command) => void handleAiEditCommand(command)}
      />
    </div>
  );
}
