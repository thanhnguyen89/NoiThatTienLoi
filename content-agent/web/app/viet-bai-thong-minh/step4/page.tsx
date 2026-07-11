'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AICheckPanel from '@/app/components/AICheckPanel';
import { EMPTY_BRAND_SECTION_STATE } from '@/components/BrandSection';
import type { AiAssistCommand } from '@/components/editor/AiAssistPanel';
import { AiFloatingToolbar } from '@/components/editor/AiFloatingToolbar';
import { ExportMenu } from '@/components/editor/ExportMenu';
import { RichArticleEditor } from '@/components/editor/RichArticleEditor';
import { GeneratePanelTabs } from '@/components/generate/GeneratePanelTabs';
import { LinksPanel as GenerateLinksPanel } from '@/components/generate/LinksPanel';
import { PublishPanel as GeneratePublishPanel } from '@/components/generate/PublishPanel';
import { QualityPanel as GenerateQualityPanel } from '@/components/generate/QualityPanel';
import { InternalLinkSuggest } from '@/components/tinh-gon/InternalLinkSuggest';
import { KeywordDensityBar } from '@/components/tinh-gon/KeywordDensityBar';
import { useGenerateStream } from '@/hooks/useGenerateStream';
import { buildSentenceTargets, type SentenceTarget } from '@/lib/dom-sentences';
import type { AICheckResult } from '@/lib/humanness/types';
import { UNIFIED_GENERATE_TABS, type GenerateTab } from '@/lib/shared/generate-tabs';
import { computeSeoChecks } from '@/lib/shared/seo-checks';
import type { TinhGonInternalLinkSuggestion } from '@/lib/tinh-gon/types';
import { CONTENT_TYPES, VBT_LOADING_STEPS, buildVbtArticleContentType, getContentTypeDefaultLength } from '@/lib/viet-bai-thong-minh/options';
import {
  clearVbtWorkflowStorage,
  parseStoredJson,
  readVbtStorage,
  writeVbtStorage,
} from '@/lib/viet-bai-thong-minh/storage';
import type {
  ContentType,
  DataSourceMode,
  SemanticAnalysis,
  TopicalMapRole,
  VbtStep1State,
  VbtStep3State,
  VbtStreamResult,
} from '@/lib/viet-bai-thong-minh/types';

interface DbArticlePayload {
  id: string;
  runId?: string | null;
  keyword?: string | null;
  language?: string | null;
  contentType?: string | null;
  sourceType?: string | null;
  targetLength?: number | null;
  aiProvider?: string | null;
  brandConfig?: unknown;
  meta?: unknown;
  competitorUrls?: string[] | null;
  competitorAnalysis?: string | null;
  outline?: unknown;
  selectedTitle?: string | null;
  userNotes?: string | null;
  secondaryKeywords?: string[] | null;
  htmlContent?: string | null;
  metaDescription?: string | null;
  slug?: string | null;
}

interface StoredVbtOutline {
  flow?: string;
  step1?: VbtStep1State;
  semantic?: SemanticAnalysis | null;
  step3?: VbtStep3State;
  title?: string;
  finalOutline?: string;
}

const VBT_CONTENT_TYPE_PREFIX = 'viet_bai_thong_minh:';
const CONTENT_TYPE_VALUES = CONTENT_TYPES.map((item) => item.value);
const DATA_SOURCE_MODE_VALUES: DataSourceMode[] = ['ai_only', 'url_crawl', 'manual_text', 'google_search'];
const TOPICAL_MAP_ROLE_VALUES: TopicalMapRole[] = ['hub', 'spoke', 'standalone'];
const SEARCH_INTENT_VALUES: Array<SemanticAnalysis['searchIntent']> = ['informational', 'navigational', 'commercial', 'transactional'];
const IMAGE_OPTION_VALUES: Array<VbtStep3State['imageOption']> = ['none', 'yandex', 'ai_generated', 'shutterstock'];
const AUTO_BOLD_VALUES: Array<VbtStep3State['autoBold']> = ['none', 'keyword', 'headings', 'both'];
const OUTLINE_MODE_VALUES: Array<VbtStep3State['outlineMode']> = ['no_outline', 'user_outline', 'ai_outline'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

function asPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function parseVbtContentType(value?: string | null): ContentType {
  const raw = value?.startsWith(VBT_CONTENT_TYPE_PREFIX)
    ? value.slice(VBT_CONTENT_TYPE_PREFIX.length)
    : value;
  return isOneOf(raw, CONTENT_TYPE_VALUES) ? raw : 'blog_seo';
}

function readStoredOutline(article: DbArticlePayload): StoredVbtOutline | null {
  const outline = isRecord(article.outline) ? article.outline : null;
  if (!outline) return null;

  return {
    flow: typeof outline.flow === 'string' ? outline.flow : undefined,
    step1: isRecord(outline.step1) ? outline.step1 as unknown as VbtStep1State : undefined,
    semantic: isRecord(outline.semantic) ? outline.semantic as unknown as SemanticAnalysis : outline.semantic === null ? null : undefined,
    step3: isRecord(outline.step3) ? outline.step3 as unknown as VbtStep3State : undefined,
    title: typeof outline.title === 'string' ? outline.title : undefined,
    finalOutline: typeof outline.finalOutline === 'string' ? outline.finalOutline : undefined,
  };
}

function isVbtArticle(article: DbArticlePayload, stored: StoredVbtOutline | null): boolean {
  const contentType = article.contentType || '';
  return (
    contentType.startsWith(VBT_CONTENT_TYPE_PREFIX)
    || stored?.flow === 'vbt'
    || isOneOf(contentType, CONTENT_TYPE_VALUES)
  );
}

function buildStep1FromArticle(article: DbArticlePayload, stored?: VbtStep1State): VbtStep1State {
  const meta = isRecord(article.meta) ? article.meta : {};
  const contentType = isOneOf(stored?.contentType, CONTENT_TYPE_VALUES)
    ? stored.contentType
    : parseVbtContentType(article.contentType);

  return {
    keyword: stored?.keyword || article.keyword || '',
    secondaryKeywordsRaw: typeof stored?.secondaryKeywordsRaw === 'string'
      ? stored.secondaryKeywordsRaw
      : asStringArray(article.secondaryKeywords).join(', '),
    contentType,
    topicalMapRole: isOneOf(stored?.topicalMapRole, TOPICAL_MAP_ROLE_VALUES)
      ? stored.topicalMapRole
      : isOneOf(meta.topicalMapRole, TOPICAL_MAP_ROLE_VALUES)
        ? meta.topicalMapRole
        : 'standalone',
    competitorUrls: asStringArray(stored?.competitorUrls).length
      ? asStringArray(stored?.competitorUrls)
      : asStringArray(article.competitorUrls),
    dataSourceMode: isOneOf(stored?.dataSourceMode, DATA_SOURCE_MODE_VALUES)
      ? stored.dataSourceMode
      : isOneOf(article.sourceType, DATA_SOURCE_MODE_VALUES)
        ? article.sourceType
        : 'ai_only',
    dataSourceUrls: asStringArray(stored?.dataSourceUrls),
    dataSourceText: stored?.dataSourceText || '',
    language: stored?.language || article.language || 'Vietnamese',
  };
}

function buildStep3FromArticle(
  article: DbArticlePayload,
  stored: VbtStep3State | undefined,
  title: string,
  contentType: ContentType,
): VbtStep3State {
  const meta = isRecord(article.meta) ? article.meta : {};
  const titleOptions = asStringArray(stored?.titleOptions).length
    ? asStringArray(stored?.titleOptions)
    : [title || article.keyword || 'Bài viết'];
  const selectedTitleIndex = Math.min(
    Math.max(asPositiveNumber(stored?.selectedTitleIndex) ?? 0, 0),
    Math.max(titleOptions.length - 1, 0),
  );
  const brand = {
    ...EMPTY_BRAND_SECTION_STATE,
    ...(isRecord(stored?.brand) ? stored?.brand : isRecord(article.brandConfig) ? article.brandConfig : {}),
  } as VbtStep3State['brand'];

  return {
    titleOptions,
    selectedTitleIndex,
    customTitle: stored?.customTitle ?? title,
    outlineMode: isOneOf(stored?.outlineMode, OUTLINE_MODE_VALUES)
      ? stored.outlineMode
      : article.userNotes?.trim()
        ? 'user_outline'
        : 'no_outline',
    userOutlineText: stored?.userOutlineText ?? article.userNotes ?? '',
    aiOutlineText: stored?.aiOutlineText ?? '',
    aiOutlineObjective: stored?.aiOutlineObjective || 'comprehensive',
    aiOutlineSize: stored?.aiOutlineSize || 'md',
    imageOption: isOneOf(stored?.imageOption, IMAGE_OPTION_VALUES)
      ? stored.imageOption
      : isOneOf(meta.imageOption, IMAGE_OPTION_VALUES)
        ? meta.imageOption
        : 'none',
    targetLength: asPositiveNumber(stored?.targetLength)
      ?? asPositiveNumber(article.targetLength)
      ?? getContentTypeDefaultLength(contentType),
    tone: stored?.tone || (typeof meta.tone === 'string' ? meta.tone : 'seo_extended'),
    model: stored?.model || article.aiProvider || 'gemini-flash',
    brand,
    seoMainLink: stored?.seoMainLink || '',
    seoKeywordLinks: stored?.seoKeywordLinks || '',
    autoBold: isOneOf(stored?.autoBold, AUTO_BOLD_VALUES) ? stored.autoBold : 'none',
    footerContent: stored?.footerContent || '',
  };
}

function buildSemanticFromArticle(
  article: DbArticlePayload,
  stored: SemanticAnalysis | null | undefined,
  step1: VbtStep1State,
): SemanticAnalysis | null {
  if (stored) return stored;

  const meta = isRecord(article.meta) ? article.meta : {};
  const semanticKeywords = asStringArray(meta.semanticKeywords);
  if (semanticKeywords.length === 0 && !article.competitorAnalysis) return null;

  return {
    macroContext: article.competitorAnalysis || '',
    searchIntent: isOneOf(meta.searchIntent, SEARCH_INTENT_VALUES) ? meta.searchIntent : 'informational',
    intentExplanation: '',
    rppMap: [],
    attributeMap: [],
    semanticKeywords,
    suggestedContentType: step1.contentType,
    estimatedWordCount: article.targetLength || getContentTypeDefaultLength(step1.contentType),
    competitorInsights: article.competitorAnalysis || undefined,
  };
}

async function fetchArticleById(articleId: string): Promise<DbArticlePayload | null> {
  const response = await fetch(`/api/articles/${encodeURIComponent(articleId)}`);
  if (!response.ok) return null;

  const payload = await response.json() as { success?: boolean; data?: { article?: DbArticlePayload } };
  return payload.success && payload.data?.article ? payload.data.article : null;
}

async function fetchArticleByRunId(runId: string): Promise<DbArticlePayload | null> {
  const response = await fetch(`/api/articles/by-runid/${encodeURIComponent(runId)}`);
  if (!response.ok) return null;

  const payload = await response.json() as { success?: boolean; data?: DbArticlePayload };
  return payload.success && payload.data ? payload.data : null;
}

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
    .slice(0, 75)
    .replace(/-+$/g, '');
}

function fallbackMeta(keyword: string): string {
  const text = `${keyword} - Bài viết SEO được tạo từ phân tích semantic, có outline, kiểm tra chất lượng và quy trình xuất bản.`;
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
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

function computeKeywordDensity(html: string, keyword: string): number {
  const wordCount = stripHtml(html).split(/\s+/).filter(Boolean).length;
  if (!wordCount || !keyword.trim()) return 0;

  const normalizedText = normalizeSearchText(stripHtml(html));
  const normalizedKeyword = normalizeSearchText(keyword.trim());
  const matches = normalizedText.match(new RegExp(escapeRegExp(normalizedKeyword), 'g')) || [];
  return Number(((matches.length / wordCount) * 100).toFixed(2));
}

function countWords(htmlOrText: string): number {
  return stripHtml(htmlOrText).split(/\s+/).filter(Boolean).length;
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
  const wordCount = countWords(input.html);
  const links = countLinks(input.html);
  const paragraphs = input.html.match(/<p[\s\S]*?<\/p>/gi) || [];
  const longParagraphCount = paragraphs.filter((paragraph) => countWords(paragraph) > 90).length;
  const h1Count = (input.html.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (input.html.match(/<h2[\s>]/gi) || []).length;
  const imageCount = (input.html.match(/<img[\s>]/gi) || []).length;
  const imageAltWithKeyword = new RegExp(`alt=["'][^"']*${escapeRegExp(input.keyword)}[^"']*["']`, 'i').test(input.html);
  const secondaryCovered = input.secondaryKeywords.filter((item) => hasNormalizedText(plainText, item)).length;
  const density = computeKeywordDensity(input.html, input.keyword);
  const hasFaq = /faq|câu hỏi thường gặp|cau hoi thuong gap|class=["'][^"']*faq/i.test(input.html);
  const hasToc = /<nav[\s>]|mục lục|muc luc/i.test(input.html);
  const hasVisualBreak = /<(ul|ol|table|blockquote)[\s>]/i.test(input.html);
  const hasSpecificData = /(\d+\s?(cm|mm|m2|m²|kg|%|năm|ngày|giờ)|\d{4}|₫|vnd|vnđ)/i.test(plainText);
  const hasCta = /(liên hệ|gọi|hotline|tư vấn|báo giá|đặt mua|xem thêm|tham khảo|đăng ký)/i.test(plainText);
  const keywordInTitle = hasNormalizedText(input.title, input.keyword);
  const keywordInIntro = hasNormalizedText(plainText.slice(0, Math.ceil(plainText.length * 0.12)), input.keyword);
  const keywordInSlug = normalizeSearchText(input.slug).replace(/[^a-z0-9]+/g, '-').includes(
    normalizeSearchText(input.keyword).replace(/[^a-z0-9]+/g, '-'),
  );
  const effectiveHumanness = input.aiCheckResult?.humannessScore ?? input.humannessScore ?? null;
  const aiCriticalFlags = input.aiCheckResult?.counts.criticalFlags ?? null;
  const aiBannedCount = input.aiCheckResult?.counts.bannedWordCount ?? null;
  const aiToneScore = input.aiCheckResult?.breakdown.toneConsistencyScore ?? null;

  const items: PublishSignal[] = [
    {
      key: 'title',
      label: 'Title có keyword và dài 50-70 ký tự',
      pass: keywordInTitle && input.title.length >= 50 && input.title.length <= 70,
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
      label: 'Slug ngắn và chứa keyword',
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
      label: 'Mật độ keyword tự nhiên',
      pass: density >= 0.6 && density <= 1.8,
      detail: `${density}%`,
      priority: 'high',
    },
    {
      key: 'intro',
      label: 'Keyword xuất hiện sớm trong mở bài',
      pass: keywordInIntro,
      detail: keywordInIntro ? 'Có trong 12% đầu bài' : 'Chưa thấy ở đầu bài',
      priority: 'medium',
    },
    {
      key: 'headings',
      label: 'Heading rõ cấu trúc',
      pass: h1Count === 1 && h2Count >= 2,
      detail: `${h1Count} H1, ${h2Count} H2`,
      priority: 'high',
    },
    {
      key: 'readability',
      label: 'Đoạn văn dễ đọc',
      pass: longParagraphCount === 0 && hasVisualBreak,
      detail: longParagraphCount === 0 ? 'Không có đoạn >90 từ' : `${longParagraphCount} đoạn dài`,
      priority: 'medium',
    },
    {
      key: 'internal',
      label: 'Có internal link',
      pass: links.internal >= 1,
      detail: `${links.internal} internal link`,
      priority: 'high',
    },
    {
      key: 'external',
      label: 'Có nguồn/link ngoài đáng tin',
      pass: links.external >= 1,
      detail: `${links.external} external link`,
      priority: 'medium',
    },
    {
      key: 'semantic',
      label: 'Có keyword phụ/semantic trong nội dung',
      pass: input.secondaryKeywords.length === 0 || secondaryCovered > 0,
      detail: input.secondaryKeywords.length ? `${secondaryCovered}/${input.secondaryKeywords.length} keyword phụ` : 'Không cấu hình keyword phụ',
      priority: 'medium',
    },
    {
      key: 'faq',
      label: 'Có FAQ cho truy vấn dài',
      pass: wordCount < 1000 || hasFaq,
      detail: hasFaq ? 'Có FAQ' : 'Bài dài nhưng chưa có FAQ',
      priority: 'medium',
    },
    {
      key: 'toc',
      label: 'Có mục lục cho bài dài',
      pass: wordCount < 1500 || hasToc,
      detail: hasToc ? 'Có TOC' : 'Bài dài nhưng chưa có TOC',
      priority: 'low',
    },
    {
      key: 'eeat',
      label: 'Có số liệu/ngữ cảnh cụ thể',
      pass: hasSpecificData,
      detail: hasSpecificData ? 'Có dữ kiện cụ thể' : 'Nên thêm số liệu, năm, thông số',
      priority: 'medium',
    },
    {
      key: 'cta',
      label: 'Có CTA hoặc bước tiếp theo',
      pass: hasCta,
      detail: hasCta ? 'Có tín hiệu CTA' : 'Nên thêm CTA cuối bài',
      priority: 'low',
    },
    {
      key: 'image',
      label: 'Ảnh có alt text chứa keyword',
      pass: imageCount === 0 || imageAltWithKeyword,
      detail: imageCount === 0 ? 'Bài chưa có ảnh' : `${imageCount} ảnh`,
      priority: 'low',
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

function isVbtStreamResult(value: unknown): value is VbtStreamResult {
  return Boolean(value && typeof value === 'object' && 'articleId' in value && 'html' in value);
}

function isNodeInside(container: HTMLElement | null, node: Node | null): boolean {
  if (!container || !node) return false;
  return container.contains(node.nodeType === Node.ELEMENT_NODE ? node : node.parentNode);
}

const VBT_AI_EDIT_COMMANDS: Array<{ value: AiAssistCommand; label: string }> = [
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

function SemanticScoreCard({ score, decision }: { score?: number; decision?: string }) {
  if (score == null) return null;
  const tone = score >= 80 ? 'text-violet-700' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-violet-900">Điểm semantic</p>
        <p className={`text-xl font-black ${tone}`}>{score}/100</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-violet-600" style={{ width: `${score}%` }} />
      </div>
      {decision && <p className="mt-2 text-xs font-semibold text-violet-700">Quyết định: {decision}</p>}
    </div>
  );
}

function PublishReadinessCard({
  readiness,
  title = 'Sẵn sàng đăng',
  compact = false,
}: {
  readiness: PublishReadiness;
  title?: string;
  compact?: boolean;
}) {
  const tone = readiness.status === 'ready'
    ? { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', label: 'Có thể đăng' }
    : readiness.status === 'blocked'
      ? { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Cần sửa trước' }
      : { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Nên rà soát' };
  const visibleIssues = readiness.failed.slice(0, compact ? 4 : 7);

  return (
    <div className={`rounded-xl border p-4 ${tone.bg} ${tone.border}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-black ${tone.text}`}>{title}</p>
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

      {visibleIssues.length > 0 ? (
        <div className="mt-3 space-y-2">
          {visibleIssues.map((item) => (
            <div key={item.key} className="rounded-lg bg-white/75 p-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  item.priority === 'high'
                    ? 'bg-red-100 text-red-700'
                    : item.priority === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-500'
                }`}>
                  {item.priority === 'high' ? 'Cao' : item.priority === 'medium' ? 'Vừa' : 'Thấp'}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-gray-500">{item.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-white/75 p-2 text-xs font-semibold text-green-700">
          Không còn lỗi quan trọng. Vẫn nên đọc lại thủ công trước khi publish.
        </p>
      )}
    </div>
  );
}

function SignalChecklist({ items }: { items: PublishSignal[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.key} className="flex items-start gap-2 rounded-lg border border-gray-100 bg-white p-2">
          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] text-white ${
            item.pass ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {item.pass ? '✓' : '×'}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-xs leading-snug ${item.pass ? 'text-gray-500' : 'font-semibold text-gray-800'}`}>{item.label}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

void SignalChecklist;

function getChecklistAction(item: PublishSignal): { label: string; tab: GenerateTab } | null {
  if (item.pass) return null;

  switch (item.key) {
    case 'internal':
      return { label: 'Mở tab Links để chèn internal link', tab: 'links' };
    case 'external':
      return { label: 'Mở tab SEO để thêm external source', tab: 'seo' };
    case 'eeat':
      return { label: 'Mở tab AI để thêm dữ kiện cụ thể', tab: 'ai' };
    case 'human':
    case 'ai-banned':
    case 'ai-critical':
    case 'ai-tone':
      return { label: 'Mở tab AI để scan và sửa câu bị lộ AI', tab: 'ai' };
    default:
      return { label: 'Mở tab SEO để sửa nhanh', tab: 'seo' };
  }
}

function QualityTab({
  result,
  outputHtml,
  readiness,
  onOpenTab,
}: {
  result: VbtStreamResult | null;
  outputHtml: string;
  readiness: PublishReadiness;
  onOpenTab: (tab: GenerateTab) => void;
}) {
  const paragraphs = outputHtml.match(/<p[\s\S]*?<\/p>/gi) || [];
  const longParagraphCount = paragraphs.filter((paragraph) => stripHtml(paragraph).split(/\s+/).filter(Boolean).length > 90).length;
  const hasVisualBreak = /<(ul|ol|table)[\s>]/i.test(outputHtml);
  const wordCount = stripHtml(outputHtml).split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4 p-4">
      <PublishReadinessCard readiness={readiness} title="Hiệu quả khi đăng" />

      <GenerateQualityPanel
        humannessScore={result?.humannessScore ?? (outputHtml ? 70 : null)}
        decision={result?.decision ?? 'REVIEW'}
        issues={result?.issues ?? (longParagraphCount > 0 ? [`${longParagraphCount} đoạn văn dài cần cắt ngắn.`] : [])}
        forbiddenFound={result?.forbiddenFound ?? []}
        summaryItems={[
          {
            label: 'Paragraphs',
            value: longParagraphCount === 0 ? 'Không có đoạn quá dài' : `${longParagraphCount} đoạn trên 90 từ`,
            tone: longParagraphCount === 0 ? 'good' : 'warn',
          },
          {
            label: 'Visual breaks',
            value: hasVisualBreak ? 'Có danh sách/bảng' : 'Nên thêm ul/ol/table',
            tone: hasVisualBreak ? 'good' : 'warn',
          },
          { label: 'Số từ', value: String(result?.wordCount ?? wordCount), tone: 'muted' },
        ]}
      >
        <SemanticScoreCard score={result?.semanticScore} decision={result?.semanticDecision} />
      </GenerateQualityPanel>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-gray-800">Checklist đăng website</p>
          <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-500">
            {readiness.items.filter((item) => item.pass).length}/{readiness.items.length}
          </span>
        </div>
        <div className="space-y-2">
          {readiness.items
            .filter((item) => item.priority !== 'low')
            .map((item) => {
              const action = getChecklistAction(item);
              return (
                <div key={item.key} className="rounded-lg border border-gray-100 bg-white p-2">
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] text-white ${
                      item.pass ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {item.pass ? '✓' : '×'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs leading-snug ${item.pass ? 'text-gray-500' : 'font-semibold text-gray-800'}`}>{item.label}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">{item.detail}</p>
                      {!item.pass && action && (
                        <button
                          type="button"
                          onClick={() => onOpenTab(action.tab)}
                          className="mt-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-800"
                        >
                          {action.label}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
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
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1 text-xs" style={{ color }}>{label}</p>
    </div>
  );
}

function AiTab({
  html,
  keyword,
  wordCount,
  keywordDensity,
  readiness,
  selectedText,
  aiEditing,
  aiCheckStorageKey,
  onAiEdit,
  onApplyFix,
  getSentenceTargets,
  onAiCheckResultChange,
  onAiRewrite,
}: {
  html: string;
  keyword: string;
  wordCount: number;
  keywordDensity: number;
  readiness: PublishReadiness;
  selectedText: string;
  aiEditing: boolean;
  aiCheckStorageKey?: string;
  onAiEdit: (command: AiAssistCommand) => void;
  onApplyFix: (original: string, replacement: string, sentenceIndex?: number, target?: SentenceTarget) => boolean | void | Promise<boolean | void>;
  getSentenceTargets: () => ReturnType<typeof buildSentenceTargets>;
  onAiCheckResultChange?: (result: AICheckResult | null) => void;
  onAiRewrite?: (snippet: string, flagLabel: string, target?: SentenceTarget) => void;
}) {
  const hasSelection = selectedText.trim().length > 0;

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-blue-900">Mục tiêu kiểm tra AI</p>
            <p className="mt-1 text-xs leading-5 text-blue-700">
              Trước khi đăng: AI risk thấp, không còn câu DANGER, có dữ kiện cụ thể và câu văn không đều nhịp.
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
            readiness.status === 'ready'
              ? 'bg-green-100 text-green-700'
              : readiness.status === 'blocked'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
          }`}>
            {readiness.score}/100
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-800">SEO nhanh</p>
            <p className="mt-1 text-xs text-gray-500">Tính trực tiếp từ nội dung editor.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
            {wordCount.toLocaleString()} từ
          </span>
        </div>
      </div>

      <KeywordDensityBar density={keyword ? keywordDensity : null} />

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-bold text-gray-800">AI chỉnh theo vùng chọn</p>
        <p className="mt-1 text-xs text-gray-500">
          {hasSelection
            ? `Đã chọn ${selectedText.length} ký tự để AI chỉnh.`
            : 'Bôi đen đoạn văn ngay trong editor bên trái rồi chọn lệnh AI chỉnh.'}
        </p>

        {hasSelection && (
          <div className="mt-3 max-h-24 overflow-y-auto rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
            {selectedText}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          {VBT_AI_EDIT_COMMANDS.map((command) => (
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
        {html ? (
          <AICheckPanel
            html={html}
            storageKey={aiCheckStorageKey}
            onApplyFix={onApplyFix}
            getSentenceTargets={getSentenceTargets}
            onResultChange={onAiCheckResultChange}
            onAiRewrite={onAiRewrite}
          />
        ) : (
          <div className="p-4 text-sm text-gray-500">Chờ nội dung được tạo trước khi kiểm tra AI.</div>
        )}
      </div>
    </div>
  );
}

function ImagesTab({ imageOption }: { imageOption: string }) {
  return (
    <div className="p-4">
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
        <p className="text-sm font-bold text-gray-700">Thư viện hình ảnh</p>
        <p className="mt-1 text-xs text-gray-400">Đang phát triển</p>
        <p className="mt-3 text-[11px] font-medium text-gray-500">Cấu hình hiện tại: {imageOption}</p>
      </div>
    </div>
  );
}

function SeoTab({
  html,
  keyword,
  secondaryKeywords,
  title,
  metaDescription,
  slug,
  minWordCount,
  model,
  contentType,
  articleId,
  keywordDensity,
  humannessScore,
  readiness,
  internalLinks,
  loadingLinks,
  onMetaChange,
  onAddKeyword,
  onRemoveKeyword,
  onFixTitle,
  onFixMeta,
  onFixSlug,
  onFixTitleToStart,
  onFixTitleNumber,
  onFixAltText,
  onFixSeoCheck,
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
  minWordCount: number;
  model: string;
  contentType: string;
  articleId: string;
  keywordDensity: number;
  humannessScore: number | null;
  readiness: PublishReadiness;
  internalLinks: TinhGonInternalLinkSuggestion[];
  loadingLinks: boolean;
  onMetaChange: (field: 'title' | 'description', value: string) => void;
  onAddKeyword: (keyword: string) => void;
  onRemoveKeyword: (keyword: string) => void;
  onFixTitle: () => void;
  onFixMeta: () => void;
  onFixSlug: () => void;
  onFixTitleToStart: () => void;
  onFixTitleNumber: () => void;
  onFixAltText: () => void;
  onFixSeoCheck: (index: number) => void;
  onInsertInternalLink: (html: string) => void;
  onInsertExternalLink: (url: string, text: string) => void;
  onRestart: () => void;
}) {
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
      minWordCount,
    });
  }, [html, keyword, metaDescription, minWordCount, secondaryKeywords, slug, title]);

  const humannessBreakdown = useMemo(() => {
    const score = humannessScore ?? 0;
    return [
      ['Ngôn ngữ tự nhiên', Math.round(score * 0.25)],
      ['Cấu trúc bài', Math.round(score * 0.25)],
      ['E-E-A-T', Math.round(score * 0.24)],
      ['Engagement', Math.round(score * 0.26)],
    ] as const;
  }, [humannessScore]);

  function addKeyword() {
    const value = newKeyword.trim();
    if (!value) return;
    onAddKeyword(value);
    setNewKeyword('');
  }

  const fixActions: Record<number, { label: string; onClick: () => void }> = {
    0: { label: 'Fix - Thêm từ khóa vào tiêu đề', onClick: onFixTitle },
    1: { label: 'Fix - Chèn từ khóa vào meta', onClick: onFixMeta },
    2: { label: 'Fix - Tạo slug chuẩn', onClick: onFixSlug },
    3: { label: 'Fix - Chèn từ khóa vào mở bài', onClick: () => onFixSeoCheck(3) },
    4: { label: 'Fix - Chèn từ khóa vào nội dung', onClick: () => onFixSeoCheck(4) },
    5: { label: 'Fix - Mở rộng nội dung', onClick: () => onFixSeoCheck(5) },
    6: { label: 'Fix - Tăng mật độ từ khóa', onClick: () => onFixSeoCheck(6) },
    7: { label: 'Fix - Rút gọn slug', onClick: onFixSlug },
    8: {
      label: 'Fix - Chèn internal link',
      onClick: () => {
        if (internalLinks[0]) {
          setInternalUrl(internalLinks[0].url);
          setInternalText(internalLinks[0].suggestText || internalLinks[0].title);
        }
        setFixingInternal((prev) => !prev);
      },
    },
    9: { label: 'Fix - Chèn external link', onClick: () => setFixingExternal((prev) => !prev) },
    10: { label: 'Fix - Tự động thêm alt text', onClick: onFixAltText },
    11: { label: 'Fix - Chèn từ khóa phụ', onClick: () => onFixSeoCheck(11) },
    12: { label: 'Fix - Đưa từ khóa lên đầu tiêu đề', onClick: onFixTitleToStart },
    13: { label: `Fix - Thêm năm ${new Date().getFullYear()}`, onClick: onFixTitleNumber },
    14: { label: 'Fix - Chuẩn hóa thẻ H1', onClick: () => onFixSeoCheck(14) },
    15: { label: 'Fix - Thêm H2', onClick: () => onFixSeoCheck(15) },
    16: { label: 'Fix - Sửa thứ bậc heading', onClick: () => onFixSeoCheck(16) },
    17: { label: 'Fix - Chỉnh độ dài tiêu đề', onClick: () => onFixSeoCheck(17) },
    18: { label: 'Fix - Chỉnh độ dài meta', onClick: () => onFixSeoCheck(18) },
    19: { label: 'Fix - Thêm FAQ', onClick: () => onFixSeoCheck(19) },
    20: { label: 'Fix - Thêm mục lục', onClick: () => onFixSeoCheck(20) },
  };

  return (
    <div className="p-4">
      <div className="space-y-5">
        <div className="space-y-3">
          <PublishReadinessCard readiness={readiness} compact />
          <SeoScoreBar score={seo.score} />
          <KeywordDensityBar density={keyword ? keywordDensity : null} />
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Trạng thái draft</span>
            <span className="text-xs text-gray-400">{articleId ? 'DB linked' : ''}</span>
          </div>
          <div className="space-y-1 text-xs text-gray-500">
            <p>Keyword: <span className="text-gray-700">{keyword}</span></p>
            <p>Model: <span className="text-gray-700">{model}</span></p>
            <p>Loại bài: <span className="text-gray-700">{contentType}</span></p>
          </div>
          <div className="border-t border-gray-100 pt-2">
            <label className="mb-2 block text-xs font-semibold text-gray-700">Meta description</label>
            <textarea
              value={metaDescription}
              onChange={(event) => onMetaChange('description', event.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setShowSerp((prev) => !prev)}
            className="flex w-full items-center justify-between bg-gray-50 px-3 py-2.5 text-left transition-colors hover:bg-gray-100"
          >
            <span className="text-xs font-semibold text-gray-700">SERP Preview</span>
            <span className="text-xs text-gray-400">{showSerp ? '▾' : '▸'}</span>
          </button>
          {showSerp && (
            <div className="p-3">
              <p className="mb-2 break-all rounded px-2 py-1 font-mono text-xs text-gray-400">/{slug}</p>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="line-clamp-2 rounded px-2 py-1 text-sm font-medium leading-snug text-blue-700">{title}</p>
                <p className="mt-0.5 truncate rounded px-2 py-1 text-xs text-green-700">{siteUrl} ⇠ {slug}</p>
                <p className="mt-1 line-clamp-3 rounded px-2 py-1 text-xs leading-relaxed text-gray-600">
                  {metaDescription || 'Meta description sẽ hiển thị ở đây'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {secondaryKeywords.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700"
              >
                {item}
                <button type="button" onClick={() => onRemoveKeyword(item)} className="text-blue-400 hover:text-blue-700">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newKeyword}
              onChange={(event) => setNewKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addKeyword();
              }}
              placeholder="Thêm từ khóa..."
              className="flex-1 rounded border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs text-white hover:bg-blue-700"
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
          const groupItems = seo.checks
            .map((check, index) => ({ check, index }))
            .filter(({ check }) => check.group === key);
          const groupErrors = groupItems.filter(({ check }) => !check.pass).length;

          return (
            <div key={key} className="border-t border-gray-100 pt-2">
              <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between py-1.5 text-left"
              >
                <span className="text-xs font-semibold text-gray-700">{label}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                    groupErrors === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {groupErrors === 0 ? '✓ All Good' : `${groupErrors} Lỗi`}
                  </span>
                  <span className="text-xs text-gray-400">{open ? '−' : '+'}</span>
                </div>
              </button>

              {open && (
                <div className="mb-2 mt-1 space-y-2">
                  {groupItems.map(({ check, index }) => {
                    const action = fixActions[index];
                    return (
                      <div key={index}>
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs text-white ${
                            check.pass ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {check.pass ? '✓' : '×'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs leading-snug ${check.pass ? 'text-gray-500' : 'font-medium text-gray-800'}`}>
                              {check.label}
                              {check.detail && <span className="font-normal text-gray-400"> — {check.detail}</span>}
                            </p>

                            {!check.pass && action && (
                              <button
                                type="button"
                                onClick={action.onClick}
                                className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800"
                              >
                                {action.label}
                              </button>
                            )}
                          </div>
                        </div>

                        {!check.pass && index === 8 && fixingInternal && (
                          <div className="ml-6 mt-2 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                            <p className="text-xs font-semibold text-blue-700">Chèn internal link cuối bài</p>
                            <input
                              type="text"
                              value={internalUrl}
                              onChange={(event) => setInternalUrl(event.target.value)}
                              placeholder="/slug-hoac-url-day-du"
                              className="w-full rounded border border-blue-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                            <input
                              type="text"
                              value={internalText}
                              onChange={(event) => setInternalText(event.target.value)}
                              placeholder="Anchor text"
                              className="w-full rounded border border-blue-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onInsertInternalLink(`<a href="${internalUrl}">${internalText}</a>`);
                                  setFixingInternal(false);
                                }}
                                disabled={!internalUrl.trim() || !internalText.trim()}
                                className="flex-1 rounded bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300"
                              >
                                Chèn vào bài
                              </button>
                              <button
                                type="button"
                                onClick={() => setFixingInternal(false)}
                                className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        )}

                        {!check.pass && index === 9 && fixingExternal && (
                          <div className="ml-6 mt-2 space-y-2 rounded-lg border border-purple-200 bg-purple-50 p-3">
                            <p className="text-xs font-semibold text-purple-700">Chèn external link cuối bài</p>
                            <input
                              type="text"
                              value={externalUrl}
                              onChange={(event) => setExternalUrl(event.target.value)}
                              placeholder="https://example.com/nguon-tham-khao"
                              className="w-full rounded border border-purple-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                            />
                            <input
                              type="text"
                              value={externalText}
                              onChange={(event) => setExternalText(event.target.value)}
                              placeholder="Tên nguồn tham khảo"
                              className="w-full rounded border border-purple-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onInsertExternalLink(externalUrl, externalText);
                                  setFixingExternal(false);
                                  setExternalUrl('');
                                  setExternalText('');
                                }}
                                disabled={!externalUrl.trim() || !externalText.trim()}
                                className="flex-1 rounded bg-purple-600 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:bg-gray-300"
                              >
                                Chèn vào bài
                              </button>
                              <button
                                type="button"
                                onClick={() => setFixingExternal(false)}
                                className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {humannessScore !== null && (
          <div className="border-t border-gray-100 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">Humanness Score</span>
              <span className={`text-sm font-bold ${
                humannessScore >= 76 ? 'text-green-600' : humannessScore >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {humannessScore}/100
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${
                  humannessScore >= 76 ? 'bg-green-500' : humannessScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${humannessScore}%` }}
              />
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

        <button
          type="button"
          onClick={onRestart}
          className="w-full rounded-lg border border-orange-300 py-2 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-50"
        >
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
    </div>
  );
}

function LinksTab({
  semantic,
  step1,
  outputHtml,
  internalLinks,
  loadingLinks,
  onInsert,
}: {
  semantic: SemanticAnalysis | null;
  step1: VbtStep1State;
  outputHtml: string;
  internalLinks: TinhGonInternalLinkSuggestion[];
  loadingLinks: boolean;
  onInsert: (html: string) => void;
}) {
  const links = countLinks(outputHtml);
  const plainText = stripHtml(outputHtml);
  const semanticKeywords = semantic?.semanticKeywords ?? [];
  const coveredSemantic = semanticKeywords.filter((keyword) => hasNormalizedText(plainText, keyword));
  const linkStatus = links.internal >= 1 && links.external >= 1
    ? { label: 'Tốt', tone: 'border-green-200 bg-green-50 text-green-700' }
    : links.internal >= 1 || links.external >= 1
      ? { label: 'Cần bổ sung', tone: 'border-amber-200 bg-amber-50 text-amber-700' }
      : { label: 'Thiếu link', tone: 'border-red-200 bg-red-50 text-red-700' };

  return (
    <div className="space-y-4 p-4">
      <div className={`rounded-xl border p-4 ${linkStatus.tone}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black">Sức mạnh liên kết</p>
            <p className="mt-1 text-xs opacity-80">Mục tiêu: 1-3 internal link, 1-2 external link có nguồn tin cậy.</p>
          </div>
          <span className="rounded-full bg-white/75 px-2 py-1 text-xs font-bold">{linkStatus.label}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white/75 p-2">
            <p className="text-lg font-black">{links.internal}</p>
            <p className="text-[11px] opacity-70">Internal</p>
          </div>
          <div className="rounded-lg bg-white/75 p-2">
            <p className="text-lg font-black">{links.external}</p>
            <p className="text-[11px] opacity-70">External</p>
          </div>
          <div className="rounded-lg bg-white/75 p-2">
            <p className="text-lg font-black">{coveredSemantic.length}</p>
            <p className="text-[11px] opacity-70">Semantic</p>
          </div>
        </div>
      </div>

      <GenerateLinksPanel
      cards={[
        {
          key: 'semantic',
          title: 'Từ khóa semantic',
          body: semantic?.semanticKeywords.length ? (
            <div className="flex flex-wrap gap-2">
              {semantic.semanticKeywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => onInsert(`<p><strong>${keyword}</strong>: </p>`)}
                  className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 hover:bg-violet-100"
                >
                  Chèn {keyword}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Không có semantic keyword.</p>
          ),
        },
        {
          key: 'internal',
          title: 'Liên kết nội bộ',
          body: loadingLinks ? (
            <p className="text-sm text-gray-500">Đang tìm bài liên quan...</p>
          ) : internalLinks.length > 0 ? (
            <InternalLinkSuggest links={internalLinks} onInsert={onInsert} />
          ) : (
            <p className="text-sm text-gray-500">
              {/<a\s/i.test(outputHtml)
                ? 'Bài đã có link. Kiểm tra anchor text trước khi xuất bản.'
                : 'Không tìm thấy bài liên quan để chèn liên kết nội bộ.'}
            </p>
          ),
        },
        {
          key: 'source',
          title: 'Nguồn dữ liệu',
          body: (
            <div className="space-y-2 text-sm text-gray-500">
              <p>Chế độ: <span className="font-semibold text-gray-800">{step1.dataSourceMode}</span></p>
              {step1.dataSourceUrls.length > 0 && <p>URLs: {step1.dataSourceUrls.join(', ')}</p>}
              {step1.competitorUrls.length > 0 && <p>Đối thủ: {step1.competitorUrls.length} URL</p>}
            </div>
          ),
        },
      ]}
      />
    </div>
  );
}

export default function VietBaiThongMinhStep4() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryArticleId = searchParams.get('articleId') || '';
  const queryRunId = searchParams.get('runId') || '';
  const startedRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const [runId, setRunId] = useState('');
  const [step1, setStep1] = useState<VbtStep1State | null>(null);
  const [step3, setStep3] = useState<VbtStep3State | null>(null);
  const [semantic, setSemantic] = useState<SemanticAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<GenerateTab>('seo');
  const [editableHtml, setEditableHtml] = useState('');
  const [streamDone, setStreamDone] = useState(false);
  const [title, setTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [articleId, setArticleId] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarX, setToolbarX] = useState(0);
  const [toolbarY, setToolbarY] = useState(0);
  const [aiEditing, setAiEditing] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [internalLinks, setInternalLinks] = useState<TinhGonInternalLinkSuggestion[]>([]);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [aiCheckResult, setAiCheckResult] = useState<AICheckResult | null>(null);
  const {
    streaming,
    activeStep,
    completedSteps,
    outputHtml,
    streamResult,
    error: streamError,
    startStream,
    abort,
  } = useGenerateStream('/api/vbt/stream');

  const finalResult = isVbtStreamResult(streamResult) ? streamResult : null;
  const displayedHtml = streamDone ? editableHtml : outputHtml;
  const secondaryKeywords = useMemo(
    () => step1?.secondaryKeywordsRaw.split(',').map((item) => item.trim()).filter(Boolean) ?? [],
    [step1?.secondaryKeywordsRaw],
  );
  const panelTitle = title || step3?.customTitle.trim() || step3?.titleOptions[step3?.selectedTitleIndex || 0] || step1?.keyword || '';
  const panelMeta = metaDescription || fallbackMeta(step1?.keyword || '');
  const panelSlug = slug || slugify(panelTitle);
  const effectiveHumannessScore = aiCheckResult?.humannessScore ?? finalResult?.humannessScore ?? null;
  const minWordCount = step1?.contentType === 'pillar'
    ? 2500
    : Math.min(800, Math.max(500, Math.round((step3?.targetLength || 1200) * 0.5)));
  const aiCheckStorageKey = useMemo(
    () => (articleId ? `aicheck:vbt:${articleId}` : 'aicheck:vbt:temp'),
    [articleId],
  );

  const currentSeo = useMemo(() => {
    const wordCount = stripHtml(displayedHtml).split(/\s+/).filter(Boolean).length;
    return computeSeoChecks({
      title: panelTitle,
      metaDescription: panelMeta,
      html: displayedHtml,
      wordCount,
      keyword: step1?.keyword || '',
      secondaryKeywords,
      slug: panelSlug,
      minWordCount,
    });
  }, [displayedHtml, minWordCount, panelMeta, panelSlug, panelTitle, secondaryKeywords, step1?.keyword]);
  const keywordDensity = useMemo(
    () => computeKeywordDensity(displayedHtml, step1?.keyword || ''),
    [displayedHtml, step1?.keyword],
  );
  const publishReadiness = useMemo(
    () => buildPublishReadiness({
      html: displayedHtml,
      title: panelTitle,
      metaDescription: panelMeta,
      slug: panelSlug,
      keyword: step1?.keyword || '',
      secondaryKeywords,
      minWordCount,
      humannessScore: finalResult?.humannessScore ?? null,
      aiCheckResult,
    }),
    [aiCheckResult, displayedHtml, finalResult?.humannessScore, minWordCount, panelMeta, panelSlug, panelTitle, secondaryKeywords, step1?.keyword],
  );

  useEffect(() => {
    document.title = 'Viết Bài Thông Minh - Bước 4';
    let alive = true;
    startedRef.current = false;
    setStep1(null);
    setStep3(null);
    setSemantic(null);
    setRunId('');
    setArticleId('');
    setEditableHtml('');
    setStreamDone(false);
    setTitle('');
    setMetaDescription('');
    setSlug('');
    setAiCheckResult(null);
    setBanner(null);

    function hydrateFromStorage(
      storedRunId: string,
      storedStep1: VbtStep1State,
      storedStep3: VbtStep3State,
      storedSemantic: SemanticAnalysis | null,
    ) {
      setStep1(storedStep1);
      setStep3(storedStep3);
      setSemantic(storedSemantic);
      setTitle(storedStep3.customTitle.trim() || storedStep3.titleOptions[storedStep3.selectedTitleIndex] || storedStep1.keyword);
      setRunId(storedRunId);
    }

    function hydrateFromArticle(article: DbArticlePayload, fallbackRunId: string): boolean {
      const stored = readStoredOutline(article);
      if (!isVbtArticle(article, stored)) return false;

      const nextStep1 = buildStep1FromArticle(article, stored?.step1);
      const nextTitle = article.selectedTitle?.trim()
        || stored?.title?.trim()
        || stored?.step3?.customTitle?.trim()
        || nextStep1.keyword;
      const nextStep3 = buildStep3FromArticle(article, stored?.step3, nextTitle, nextStep1.contentType);
      const nextSemantic = buildSemanticFromArticle(article, stored?.semantic, nextStep1);
      const nextRunId = article.runId || fallbackRunId;
      const savedHtml = article.htmlContent?.trim() ? article.htmlContent : '';

      setStep1(nextStep1);
      setStep3(nextStep3);
      setSemantic(nextSemantic);
      setArticleId(article.id);
      setTitle(nextTitle);
      setMetaDescription(article.metaDescription || '');
      setSlug(article.slug || slugify(nextTitle));
      setEditableHtml(savedHtml);
      setStreamDone(Boolean(savedHtml));
      startedRef.current = Boolean(savedHtml);

      writeVbtStorage('step1', JSON.stringify(nextStep1));
      writeVbtStorage('step3', JSON.stringify(nextStep3));
      writeVbtStorage('semantic', JSON.stringify(nextSemantic));
      if (nextRunId) {
        writeVbtStorage('runId', nextRunId);
        setRunId(nextRunId);
      }

      return true;
    }

    async function hydrate() {
      const urlArticleId = queryArticleId.trim();
      const urlRunId = queryRunId.trim();
      const storedRunId = readVbtStorage('runId');
      const storedStep1 = parseStoredJson<VbtStep1State>('step1');
      const storedStep3 = parseStoredJson<VbtStep3State>('step3');
      const storedSemantic = parseStoredJson<SemanticAnalysis>('semantic');

      if (urlArticleId) {
        const article = await fetchArticleById(urlArticleId);
        if (!alive) return;
        if (article && hydrateFromArticle(article, urlRunId)) return;

        if (urlRunId) {
          const runArticle = await fetchArticleByRunId(urlRunId);
          if (!alive) return;
          if (runArticle && hydrateFromArticle(runArticle, urlRunId)) return;
        }

        router.replace('/dashboard/articles');
        return;
      }

      const lookupRunId = urlRunId || storedRunId || '';
      if (lookupRunId) {
        const article = await fetchArticleByRunId(lookupRunId);
        if (!alive) return;
        if (article && hydrateFromArticle(article, lookupRunId)) return;
        if (urlRunId) {
          router.replace('/dashboard/articles');
          return;
        }
      }

      if (storedRunId && storedStep1 && storedStep3) {
        hydrateFromStorage(storedRunId, storedStep1, storedStep3, storedSemantic);
        return;
      }

      router.replace('/viet-bai-thong-minh');
    }

    void hydrate();
    return () => {
      alive = false;
    };
  }, [queryArticleId, queryRunId, router]);

  useEffect(() => {
    if (!runId || startedRef.current) return;
    startedRef.current = true;
    void startStream({ runId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    if (!finalResult) return;
    setEditableHtml(finalResult.html);
    setStreamDone(true);
    setTitle(finalResult.title);
    setMetaDescription(finalResult.metaDescription);
    setSlug(finalResult.slug);
    setArticleId(finalResult.articleId);
  }, [finalResult]);

  useEffect(() => {
    const semanticKeywords = semantic?.semanticKeywords ?? [];
    if (!articleId || semanticKeywords.length === 0) {
      setInternalLinks([]);
      return;
    }

    let alive = true;

    async function loadInternalLinks() {
      setLoadingLinks(true);
      try {
        const response = await fetch('/api/vbt/internal-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keywords: semanticKeywords,
            currentArticleId: articleId,
          }),
        });
        const payload = await response.json() as { links?: TinhGonInternalLinkSuggestion[] };
        if (alive) {
          setInternalLinks(payload.links ?? []);
        }
      } catch {
        if (alive) {
          setInternalLinks([]);
        }
      } finally {
        if (alive) {
          setLoadingLinks(false);
        }
      }
    }

    void loadInternalLinks();
    return () => {
      alive = false;
    };
  }, [articleId, semantic?.semanticKeywords]);

  function handleMetaChange(field: 'title' | 'description', value: string) {
    if (field === 'title') {
      setTitle(value);
      setSlug(slugify(value));
      return;
    }
    setMetaDescription(value);
  }

  function handleEditorChange(html: string) {
    setEditableHtml(html);
    setStreamDone(true);
  }

  function insertHtml(html: string) {
    const snippet = /^<a[\s>]/i.test(html.trim()) ? `<p>${html}</p>` : html;
    setEditableHtml((prev) => `${prev || displayedHtml}${snippet}`);
    setStreamDone(true);
  }

  function addSecondaryKeyword(keyword: string) {
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

  function removeSecondaryKeyword(keyword: string) {
    if (!step1) return;
    const next = step1.secondaryKeywordsRaw
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item && item !== keyword);
    const nextStep1 = { ...step1, secondaryKeywordsRaw: next.join(', ') };
    setStep1(nextStep1);
    writeVbtStorage('step1', JSON.stringify(nextStep1));
  }

  function insertInternalLink(html: string) {
    insertHtml(`<p style="margin-top:1rem">Xem thêm: ${html}</p>`);
  }

  function insertExternalLink(url: string, text: string) {
    const rawUrl = url.trim();
    const cleanText = text.trim();
    if (!rawUrl || !cleanText) return;
    const cleanUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    insertHtml(`<p style="margin-top:1rem">Tham khảo: <a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanText}</a></p>`);
  }

  function getCurrentHtml() {
    return editableHtml || displayedHtml;
  }

  function applySeoHtmlFix(nextHtml: string, message: string) {
    handleEditorChange(nextHtml);
    setBanner({ tone: 'success', text: message });
  }

  function containerFromHtml(html: string) {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container;
  }

  function appendSeoSection(html: string, heading: string, bodyHtml: string) {
    return `${html}<section><h2>${escapeHtml(heading)}</h2>${bodyHtml}</section>`;
  }

  function fixKeywordInIntro() {
    if (!step1) return;
    const keyword = step1.keyword.trim();
    const sourceHtml = getCurrentHtml();
    if (!keyword || !sourceHtml) return;

    const container = containerFromHtml(sourceHtml);
    const firstParagraph = container.querySelector('p');
    if (firstParagraph) {
      firstParagraph.insertAdjacentHTML('afterbegin', `<strong>${escapeHtml(keyword)}</strong>: `);
      applySeoHtmlFix(container.innerHTML, 'Đã chèn từ khóa vào phần mở bài.');
      return;
    }

    const intro = document.createElement('p');
    intro.innerHTML = `<strong>${escapeHtml(keyword)}</strong> là chủ đề chính của bài viết này.`;
    const h1 = container.querySelector('h1');
    if (h1) h1.insertAdjacentElement('afterend', intro);
    else container.prepend(intro);
    applySeoHtmlFix(container.innerHTML, 'Đã thêm đoạn mở bài có từ khóa.');
  }

  function fixKeywordInContent() {
    if (!step1) return;
    const keyword = step1.keyword.trim();
    const sourceHtml = getCurrentHtml();
    if (!keyword || !sourceHtml) return;

    const nextHtml = appendSeoSection(
      sourceHtml,
      `Ghi chú thêm về ${keyword}`,
      `<p>Khi đánh giá ${escapeHtml(keyword)}, cần xem xét nhu cầu sử dụng thực tế, ngân sách, không gian và độ bền để chọn giải pháp phù hợp.</p>`,
    );
    applySeoHtmlFix(nextHtml, 'Đã chèn thêm từ khóa vào nội dung.');
  }

  function fixMinWordCount() {
    if (!step1) return;
    const keyword = step1.keyword.trim();
    const sourceHtml = getCurrentHtml();
    const currentCount = countWords(sourceHtml);
    const missing = Math.max(0, minWordCount - currentCount);
    if (!keyword || !sourceHtml || missing === 0) return;

    const sentence = `${keyword} cần được cân nhắc theo mục đích sử dụng, kích thước không gian, chất liệu, ngân sách và mức độ bảo trì để lựa chọn hợp lý hơn.`;
    const sentences: string[] = [];
    while (countWords(sentences.join(' ')) < missing) {
      sentences.push(sentence);
    }

    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += 4) {
      paragraphs.push(`<p>${escapeHtml(sentences.slice(i, i + 4).join(' '))}</p>`);
    }

    applySeoHtmlFix(
      appendSeoSection(sourceHtml, `Thông tin bổ sung về ${keyword}`, paragraphs.join('')),
      'Đã mở rộng nội dung để đạt độ dài tối thiểu.',
    );
  }

  function fixKeywordDensity() {
    if (!step1) return;
    const keyword = step1.keyword.trim();
    const sourceHtml = getCurrentHtml();
    if (!keyword || !sourceHtml) return;

    const currentDensity = computeKeywordDensity(sourceHtml, keyword);
    if (currentDensity > 1.5) {
      const container = containerFromHtml(sourceHtml);
      const maxAllowed = Math.max(1, Math.floor(countWords(sourceHtml) * 0.014));
      const pattern = new RegExp(escapeRegExp(keyword), 'gi');
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let seen = 0;
      let node = walker.nextNode();
      while (node) {
        node.textContent = node.textContent?.replace(pattern, (match) => {
          seen += 1;
          return seen > maxAllowed ? 'chủ đề này' : match;
        }) ?? '';
        node = walker.nextNode();
      }
      applySeoHtmlFix(container.innerHTML, 'Đã giảm bớt số lần lặp từ khóa.');
      return;
    }

    const sentences: string[] = [];
    let nextHtml = sourceHtml;
    let guard = 0;
    while (computeKeywordDensity(nextHtml, keyword) < 1 && guard < 80) {
      sentences.push(`Với ${keyword}, người đọc nên đối chiếu nhu cầu sử dụng, chất liệu, kích thước và ngân sách trước khi quyết định.`);
      const body = sentences.map((sentence) => `<p>${escapeHtml(sentence)}</p>`).join('');
      nextHtml = appendSeoSection(sourceHtml, `Lưu ý khi chọn ${keyword}`, body);
      guard += 1;
    }

    applySeoHtmlFix(nextHtml, 'Đã tăng mật độ từ khóa bằng đoạn bổ sung.');
  }

  function fixSecondaryKeyword() {
    const sourceHtml = getCurrentHtml();
    const plain = normalizeSearchText(stripHtml(sourceHtml));
    const missingKeyword = secondaryKeywords.find((item) => !plain.includes(normalizeSearchText(item)));
    if (!missingKeyword || !sourceHtml) return;

    const nextHtml = appendSeoSection(
      sourceHtml,
      `Liên quan đến ${missingKeyword}`,
      `<p>${escapeHtml(missingKeyword)} là yếu tố nên được cân nhắc cùng chủ đề chính để nội dung bao quát hơn và hữu ích hơn cho người đọc.</p>`,
    );
    applySeoHtmlFix(nextHtml, 'Đã chèn từ khóa phụ vào nội dung.');
  }

  function fixH1Count() {
    const sourceHtml = getCurrentHtml();
    if (!sourceHtml) return;

    const container = containerFromHtml(sourceHtml);
    const h1s = Array.from(container.querySelectorAll('h1'));
    if (h1s.length === 0) {
      const h1 = document.createElement('h1');
      h1.textContent = panelTitle || step1?.keyword || 'Bài viết';
      container.prepend(h1);
    } else {
      h1s.slice(1).forEach((heading) => {
        const h2 = document.createElement('h2');
        h2.innerHTML = heading.innerHTML;
        Array.from(heading.attributes).forEach((attr) => h2.setAttribute(attr.name, attr.value));
        heading.replaceWith(h2);
      });
    }
    applySeoHtmlFix(container.innerHTML, 'Đã chuẩn hóa số lượng thẻ H1.');
  }

  function fixH2Count() {
    if (!step1) return;
    const sourceHtml = getCurrentHtml();
    if (!sourceHtml) return;

    const currentH2Count = (sourceHtml.match(/<h2[\s>]/gi) || []).length;
    let nextHtml = sourceHtml;
    const missing = Math.max(0, 2 - currentH2Count);
    for (let index = 0; index < missing; index += 1) {
      nextHtml = appendSeoSection(
        nextHtml,
        index === 0 ? `Cách chọn ${step1.keyword}` : `Lưu ý khi sử dụng ${step1.keyword}`,
        `<p>${escapeHtml(step1.keyword)} nên được đánh giá theo nhu cầu thực tế, thông số, độ bền và ngân sách để chọn đúng phương án.</p>`,
      );
    }
    applySeoHtmlFix(nextHtml, 'Đã bổ sung H2 còn thiếu.');
  }

  function fixHeadingHierarchy() {
    const sourceHtml = getCurrentHtml();
    if (!sourceHtml) return;

    const container = containerFromHtml(sourceHtml);
    let maxSeen = 1;
    Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6')).forEach((heading) => {
      const currentLevel = Number.parseInt(heading.tagName.slice(1), 10);
      const nextLevel = currentLevel > maxSeen + 1 ? maxSeen + 1 : currentLevel;
      maxSeen = Math.max(maxSeen, nextLevel);
      if (nextLevel === currentLevel) return;

      const replacement = document.createElement(`h${nextLevel}`);
      replacement.innerHTML = heading.innerHTML;
      Array.from(heading.attributes).forEach((attr) => replacement.setAttribute(attr.name, attr.value));
      heading.replaceWith(replacement);
    });
    applySeoHtmlFix(container.innerHTML, 'Đã sửa thứ bậc heading.');
  }

  function fixTitleLength() {
    const year = new Date().getFullYear();
    let nextTitle = panelTitle.trim() || step1?.keyword || '';
    if (!nextTitle) return;

    const additions = [`chi tiết ${year}`, 'dễ hiểu', 'cho người mới', 'kèm lưu ý thực tế'];
    for (const item of additions) {
      if (nextTitle.length >= 50) break;
      nextTitle = `${nextTitle} ${item}`.trim();
    }
    if (nextTitle.length > 70) {
      nextTitle = nextTitle.slice(0, 70).replace(/\s+\S*$/, '').trim();
    }
    setTitle(nextTitle);
    setSlug(slugify(nextTitle));
    setBanner({ tone: 'success', text: 'Đã chỉnh độ dài tiêu đề SEO.' });
  }

  function fixMetaLength() {
    if (!step1) return;
    const words = stripHtml(getCurrentHtml()).split(/\s+/).filter(Boolean).slice(0, 24).join(' ');
    let nextMeta = `${step1.keyword}: ${words || 'hướng dẫn chi tiết, dễ hiểu, có lưu ý thực tế để bạn chọn đúng giải pháp phù hợp.'}`;
    if (nextMeta.length < 120) {
      nextMeta = `${nextMeta} Bài viết tập trung vào thông tin cần biết, cách lựa chọn và những điểm nên kiểm tra trước khi quyết định.`;
    }
    if (nextMeta.length > 160) {
      nextMeta = `${nextMeta.slice(0, 157).trim()}...`;
    }
    setMetaDescription(nextMeta);
    setBanner({ tone: 'success', text: 'Đã chỉnh độ dài meta description.' });
  }

  function fixFaqSection() {
    if (!step1) return;
    const keyword = escapeHtml(step1.keyword);
    const sourceHtml = getCurrentHtml();
    if (!sourceHtml) return;

    const faqHtml = `
      <div class="faq-item"><h3>${keyword} phù hợp với ai?</h3><p>${keyword} phù hợp với người đang cần thông tin rõ ràng để so sánh, lựa chọn hoặc lập kế hoạch trước khi mua hay sử dụng.</p></div>
      <div class="faq-item"><h3>Cần lưu ý gì khi chọn ${keyword}?</h3><p>Nên kiểm tra nhu cầu thực tế, thông số quan trọng, ngân sách, độ bền và điều kiện bảo hành để tránh chọn sai.</p></div>
      <div class="faq-item"><h3>${keyword} có cần bảo trì không?</h3><p>Tùy từng trường hợp, bạn nên theo dõi hướng dẫn sử dụng, vệ sinh định kỳ và xử lý sớm các dấu hiệu bất thường.</p></div>
    `;
    applySeoHtmlFix(appendSeoSection(sourceHtml, `FAQ về ${step1.keyword}`, faqHtml), 'Đã thêm section FAQ.');
  }

  function fixTocSection() {
    const sourceHtml = getCurrentHtml();
    if (!sourceHtml) return;

    const container = containerFromHtml(sourceHtml);
    let headings = Array.from(container.querySelectorAll('h2'));
    if (headings.length === 0) {
      const h2 = document.createElement('h2');
      h2.textContent = `Tổng quan về ${step1?.keyword || panelTitle || 'bài viết'}`;
      container.append(h2);
      const p = document.createElement('p');
      p.textContent = 'Phần này tóm tắt các điểm chính để người đọc dễ theo dõi nội dung.';
      container.append(p);
      headings = [h2];
    }

    headings.forEach((heading, index) => {
      if (!heading.id) heading.id = slugify(heading.textContent || `muc-${index + 1}`) || `muc-${index + 1}`;
    });

    const nav = document.createElement('nav');
    nav.className = 'toc';
    nav.innerHTML = `<p><strong>Mục lục</strong></p><ul>${headings
      .map((heading) => `<li><a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.textContent || heading.id)}</a></li>`)
      .join('')}</ul>`;

    const existingToc = container.querySelector('nav.toc');
    existingToc?.remove();
    const h1 = container.querySelector('h1');
    if (h1) h1.insertAdjacentElement('afterend', nav);
    else container.prepend(nav);
    applySeoHtmlFix(container.innerHTML, 'Đã thêm mục lục.');
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
        fixKeywordDensity();
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
        fixTitleLength();
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

  function fixAltText() {
    if (!step1) return;
    const sourceHtml = editableHtml || displayedHtml;
    if (!sourceHtml) return;

    const container = document.createElement('div');
    container.innerHTML = sourceHtml;
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length === 0) {
      setBanner({ tone: 'error', text: 'Chưa có ảnh trong bài để thêm alt text.' });
      return;
    }

    images.forEach((image, index) => {
      const alt = image.getAttribute('alt') || '';
      if (!alt.toLowerCase().includes(step1.keyword.toLowerCase())) {
        image.setAttribute('alt', alt ? `${alt} - ${step1.keyword}` : `${step1.keyword} ${index + 1}`);
      }
    });
    handleEditorChange(container.innerHTML);
    setBanner({ tone: 'success', text: 'Đã cập nhật alt text ảnh.' });
  }

  function handleEditorSelect() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setToolbarVisible(false);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!isNodeInside(editorShellRef.current, range.commonAncestorContainer)) {
      setToolbarVisible(false);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 10) {
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

  function getSentenceTargets() {
    if (!contentRef.current) return [];
    return buildSentenceTargets(contentRef.current);
  }

  function getVisibleEditorNode(): HTMLElement | null {
    return editorShellRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null;
  }

  function getEditorScrollContainer(): HTMLElement | null {
    return getVisibleEditorNode()?.parentElement ?? null;
  }

  function normalizeFixText(value: string): string {
    return stripHtml(value).replace(/\s+/g, ' ').trim();
  }

  function findVisibleSentenceTarget(locator: {
    sentenceIndex?: number | null;
    original?: string;
    replacement: string;
  }): SentenceTarget | null {
    const editorNode = getVisibleEditorNode();
    if (!editorNode) return null;

    const targets = buildSentenceTargets(editorNode);
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
      if (directTarget && matchesTarget(directTarget)) {
        return directTarget;
      }
    }

    return targets.find(matchesTarget) || null;
  }

  function resetFixHighlightElement(element: HTMLElement) {
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

  function clearAppliedFixHighlights() {
    const editorNode = getVisibleEditorNode();
    if (!editorNode) return;

    editorNode.querySelectorAll('[data-fix-hl="applied"]').forEach((node) => {
      const element = node as HTMLElement;
      if (element.getAttribute('data-fix-inline') === 'true') {
        const parent = element.parentNode;
        if (!parent) return;
        while (element.firstChild) {
          parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
        return;
      }

      resetFixHighlightElement(element);
    });
    editorNode.dispatchEvent(new Event('editor-highlight-sync', { bubbles: true }));
  }

  function markRangeAsAppliedFix(range: Range, options?: { scroll?: boolean; select?: boolean }): boolean {
    const editorNode = getVisibleEditorNode();
    if (!editorNode || !editorNode.contains(range.commonAncestorContainer)) {
      return false;
    }

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

      if (options?.scroll !== false) {
        highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      if (options?.select !== false) {
        const selection = window.getSelection();
        const caretRange = document.createRange();
        caretRange.setStartAfter(highlight);
        caretRange.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caretRange);
        editorNode.focus();
      }

      editorNode.dispatchEvent(new Event('editor-highlight-sync', { bubbles: true }));
      return true;
    } catch {
      return false;
    }
  }

  function queueAppliedFixHighlight(
    locator: { sentenceIndex?: number | null; original?: string; replacement: string },
    restoreScrollTop?: number | null,
    options?: { scroll?: boolean; select?: boolean },
  ) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const scrollContainer = getEditorScrollContainer();
        if (scrollContainer && restoreScrollTop != null) {
          scrollContainer.scrollTop = restoreScrollTop;
        }

        clearAppliedFixHighlights();
        const target = findVisibleSentenceTarget(locator);
        if (target) {
          markRangeAsAppliedFix(target.range.cloneRange(), {
            scroll: options?.scroll ?? true,
            select: options?.select ?? true,
          });
        }
      });
    });
  }

  function replaceSentenceTarget(target: SentenceTarget | undefined, replacement: string): boolean {
    if (!target || !contentRef.current) {
      return false;
    }

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

  function applyAICheckFix(original: string, replacement: string, _sentenceIndex?: number, target?: SentenceTarget) {
    const restoreScrollTop = getEditorScrollContainer()?.scrollTop ?? null;
    const locator = {
      sentenceIndex: _sentenceIndex ?? target?.index ?? null,
      original: target?.text || original,
      replacement,
    };
    const replaced = replaceSentenceTarget(target, replacement);
    if (replaced) {
      queueAppliedFixHighlight(locator, restoreScrollTop);
      setBanner({ tone: 'success', text: 'Đã áp dụng gợi ý AI Check vào bài viết.' });
      return;
    }

    const sourceHtml = editableHtml || displayedHtml;
    const nextHtml = sourceHtml.replace(original, replacement);
    if (nextHtml !== sourceHtml) {
      handleEditorChange(nextHtml);
      queueAppliedFixHighlight(locator, restoreScrollTop);
      setBanner({ tone: 'success', text: 'Đã áp dụng gợi ý AI Check vào bài viết.' });
    }
  }

  async function runAiAssistCommand(command: AiAssistCommand, text = selectedText.trim()): Promise<string> {
    if (!step1 || (!text && command !== 'intro' && command !== 'conclusion')) {
      return '';
    }

    const response = await fetch('/api/editor/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command,
        text: text || step1.keyword,
        keyword: step1.keyword,
        model: step3?.model || 'gemini-flash',
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
        if (payload.text) {
          finalText += payload.text;
        }
      }
    }

    return finalText.trim();
  }

  async function handleToolbarCommand(command: AiAssistCommand) {
    if (!selectedText.trim()) return;

    setToolbarVisible(false);
    setBanner(null);

    try {
      const assistedHtml = await runAiAssistCommand(command);
      if (!assistedHtml) {
        throw new Error('AI không trả về nội dung.');
      }

      const range = selectionRangeRef.current;
      const editorNode = editorShellRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null;
      if (!range || !editorNode) {
        throw new Error('Không tìm thấy vùng editor để áp dụng.');
      }

      const fragment = range.createContextualFragment(assistedHtml);
      range.deleteContents();
      range.insertNode(fragment);
      handleEditorChange(editorNode.innerHTML);
      setBanner({ tone: 'success', text: 'AI đã cập nhật đoạn văn đang chọn.' });
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      setBanner({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Không thể xử lý AI inline.',
      });
    }
  }

  async function handleFlagAiRewrite(snippet: string, flagLabel: string, target?: SentenceTarget) {
    if (!snippet.trim() || aiEditing) return;

    setAiEditing(true);
    setToolbarVisible(false);
    setBanner(null);

    try {
      const assistedHtml = await runAiAssistCommand('humanize', snippet);
      if (!assistedHtml) {
        throw new Error('AI không trả về nội dung.');
      }

      const restoreScrollTop = getEditorScrollContainer()?.scrollTop ?? null;
      const locator = {
        sentenceIndex: target?.index ?? null,
        original: target?.text || snippet,
        replacement: assistedHtml,
      };

      if (target && replaceSentenceTarget(target, assistedHtml)) {
        queueAppliedFixHighlight(locator, restoreScrollTop);
        setBanner({ tone: 'success', text: `Đã viết lại câu flag: ${flagLabel}.` });
        return;
      }

      const sourceHtml = editableHtml || displayedHtml;
      const nextHtml = sourceHtml.replace(snippet, assistedHtml);
      if (nextHtml === sourceHtml) {
        throw new Error('Không tìm thấy câu cần viết lại trong HTML hiện tại.');
      }
      handleEditorChange(nextHtml);
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

  async function handleAiEditCommand(command: AiAssistCommand) {
    if (!selectedText.trim() || aiEditing) return;

    setAiEditing(true);
    setToolbarVisible(false);
    setBanner(null);

    try {
      const assistedHtml = await runAiAssistCommand(command);
      if (!assistedHtml) {
        throw new Error('AI không trả về nội dung.');
      }

      const range = selectionRangeRef.current;
      const editorNode = editorShellRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null;
      if (range && editorNode && isNodeInside(editorNode, range.commonAncestorContainer)) {
        const fragment = range.createContextualFragment(assistedHtml);
        range.deleteContents();
        range.insertNode(fragment);
        handleEditorChange(editorNode.innerHTML);
      } else {
        const sourceHtml = editableHtml || displayedHtml;
        const nextHtml = sourceHtml.replace(selectedText, assistedHtml);
        if (nextHtml === sourceHtml) {
          throw new Error('Không tìm thấy đoạn đã chọn trong HTML hiện tại.');
        }
        handleEditorChange(nextHtml);
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

  async function handleCopyHtml() {
    if (!displayedHtml) return;
    await navigator.clipboard.writeText(displayedHtml);
    setBanner({ tone: 'success', text: 'Đã copy HTML.' });
  }

  async function handleSaveDraft() {
    if (!articleId || !step1 || !step3 || !displayedHtml) {
      throw new Error('Chưa có nội dung hoặc articleId để lưu.');
    }
    setBanner(null);

    const wordCount = stripHtml(displayedHtml).split(/\s+/).filter(Boolean).length;
    const response = await fetch(`/api/articles/${articleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selectedTitle: panelTitle,
        contentType: buildVbtArticleContentType(step1.contentType),
        language: step1.language,
        sourceType: step1.dataSourceMode,
        targetLength: step3.targetLength,
        aiProvider: step3.model,
        secondaryKeywords,
        htmlContent: displayedHtml,
        metaDescription: panelMeta,
        slug: panelSlug,
        seoScore: currentSeo.score,
        seoChecks: currentSeo.checks,
        wordCount,
        status: 'WRITTEN',
        createVersion: true,
      }),
    });

    if (!response.ok) {
      throw new Error('Không thể lưu bản nháp.');
    }
  }

  async function handleSaveDraftWithBanner() {
    if (savingDraft) return;
    setSavingDraft(true);
    try {
      await handleSaveDraft();
      setBanner({ tone: 'success', text: 'Đã lưu bản nháp.' });
    } catch (error) {
      setBanner({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Không thể lưu bản nháp.',
      });
    } finally {
      setSavingDraft(false);
    }
  }

  function handleRestart() {
    clearVbtWorkflowStorage();
    router.push('/viet-bai-thong-minh');
  }

  function fixTitle() {
    if (!step1?.keyword || !panelTitle) return;
    const kw = step1.keyword.trim();
    if (panelTitle.toLowerCase().includes(kw.toLowerCase())) return;
    const fixed = `${kw} - ${panelTitle}`;
    setTitle(fixed);
    setSlug(slugify(fixed));
  }

  function fixMeta() {
    if (!step1?.keyword || !displayedHtml) return;
    const words = stripHtml(displayedHtml).split(/\s+/).filter(Boolean).slice(0, 30).join(' ');
    setMetaDescription(`${step1.keyword}: ${words}...`.slice(0, 160));
  }

  function fixSlug() {
    if (!panelTitle) return;
    setSlug(slugify(panelTitle));
  }

  function fixTitleToStart() {
    if (!step1?.keyword || !panelTitle) return;
    const kw = step1.keyword.trim();
    if (panelTitle.toLowerCase().startsWith(kw.toLowerCase())) return;
    const fixed = `${kw} - ${panelTitle}`;
    setTitle(fixed);
    setSlug(slugify(fixed));
  }

  function fixTitleNumber() {
    if (!panelTitle) return;
    const hasNumber = /\d/.test(panelTitle);
    if (hasNumber) return;
    const fixed = `${panelTitle} - Top 10`;
    setTitle(fixed);
    setSlug(slugify(fixed));
  }

  if (!step1 || !step3) return null;

  const loading = streaming && !streamDone;
  const wordCount = stripHtml(displayedHtml).split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-gray-50">
      <div ref={contentRef} className="hidden" aria-hidden dangerouslySetInnerHTML={{ __html: displayedHtml }} />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-gray-950">Viết Bài Thông Minh</h1>
            <p className="truncate text-sm text-gray-500">{step1.keyword}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSaveDraftWithBanner()}
              disabled={savingDraft || loading || !articleId || !displayedHtml}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingDraft ? 'Đang lưu...' : 'Lưu DB'}
            </button>
            {articleId && <ExportMenu articleId={articleId} html={displayedHtml} title={panelTitle} />}
            {streaming && (
              <button
                type="button"
                onClick={abort}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Dừng
              </button>
            )}
            <button
              type="button"
              onClick={handleRestart}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Bắt đầu lại
            </button>
          </div>
        </header>

        {(loading || streamError || banner) && (
          <div className="border-b border-gray-200 bg-white px-5 py-3">
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <span className="text-sm font-semibold text-blue-700">
                    {VBT_LOADING_STEPS.find((step) => step.key === activeStep)?.label || 'Đang xử lý...'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {VBT_LOADING_STEPS.map((step) => {
                    const done = completedSteps.includes(step.key);
                    const active = activeStep === step.key;
                    return (
                      <span
                        key={step.key}
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          done
                            ? 'bg-green-50 text-green-700'
                            : active
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {streamError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{streamError}</p>}
            {banner && (
              <p className={`rounded-lg border px-3 py-2 text-sm ${
                banner.tone === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
              >
                {banner.text}
              </p>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-hidden p-5">
          <div className="h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div
              ref={editorShellRef}
              className="h-full"
              onMouseUp={handleEditorSelect}
              onKeyUp={handleEditorSelect}
            >
              <RichArticleEditor
                html={displayedHtml}
                streaming={loading}
                wordCount={wordCount}
                keyword={step1.keyword}
                articleTitle={panelTitle}
                fullWidth
                onChange={handleEditorChange}
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
              html={displayedHtml}
              keyword={step1.keyword}
              secondaryKeywords={secondaryKeywords}
              title={panelTitle}
              metaDescription={panelMeta}
              slug={panelSlug}
              minWordCount={minWordCount}
              model={step3.model}
              contentType={step1.contentType}
              articleId={articleId}
              keywordDensity={keywordDensity}
              humannessScore={effectiveHumannessScore}
              readiness={publishReadiness}
              internalLinks={internalLinks}
              loadingLinks={loadingLinks}
              onMetaChange={handleMetaChange}
              onAddKeyword={addSecondaryKeyword}
              onRemoveKeyword={removeSecondaryKeyword}
              onFixTitle={fixTitle}
              onFixMeta={fixMeta}
              onFixSlug={fixSlug}
              onFixTitleToStart={fixTitleToStart}
              onFixTitleNumber={fixTitleNumber}
              onFixAltText={fixAltText}
              onFixSeoCheck={handleFixSeoCheck}
              onInsertInternalLink={insertInternalLink}
              onInsertExternalLink={insertExternalLink}
              onRestart={handleRestart}
            />
          )}
          {activeTab === 'ai' && (
            <AiTab
              html={displayedHtml}
              keyword={step1.keyword}
              wordCount={wordCount}
              keywordDensity={keywordDensity}
              readiness={publishReadiness}
              selectedText={selectedText}
              aiEditing={aiEditing}
              aiCheckStorageKey={aiCheckStorageKey}
              onAiEdit={(command) => void handleAiEditCommand(command)}
              onApplyFix={applyAICheckFix}
              getSentenceTargets={getSentenceTargets}
              onAiCheckResultChange={setAiCheckResult}
              onAiRewrite={handleFlagAiRewrite}
            />
          )}
          {activeTab === 'quality' && (
            <QualityTab
              result={finalResult}
              outputHtml={displayedHtml}
              readiness={publishReadiness}
              onOpenTab={setActiveTab}
            />
          )}
          {activeTab === 'links' && (
            <LinksTab
              semantic={semantic}
              step1={step1}
              outputHtml={displayedHtml}
              internalLinks={internalLinks}
              loadingLinks={loadingLinks}
              onInsert={insertHtml}
            />
          )}
          {activeTab === 'publish' && articleId ? (
            <GeneratePublishPanel
              articleId={articleId}
              keyword={step1.keyword}
              title={panelTitle}
              metaDescription={panelMeta}
              slug={panelSlug}
              wordCount={wordCount}
              seoScore={currentSeo.score}
              onTitleChange={setTitle}
              onMetaDescriptionChange={setMetaDescription}
              onSlugChange={setSlug}
              onCopyHtml={() => void handleCopyHtml()}
              onSaveDraft={handleSaveDraft}
            />
          ) : activeTab === 'publish' ? (
            <div className="p-4 text-sm text-gray-500">Chờ stream hoàn tất để tạo articleId trước khi xuất bản.</div>
          ) : null}
          {activeTab === 'images' && <ImagesTab imageOption={step3.imageOption} />}
        </div>
      </aside>

      <AiFloatingToolbar
        visible={toolbarVisible && !loading}
        x={toolbarX}
        y={toolbarY}
        disabled={loading}
        onCommand={(command) => void handleToolbarCommand(command)}
      />
    </div>
  );
}
