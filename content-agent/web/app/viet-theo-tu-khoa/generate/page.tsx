'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AICheckPanel, { type AppliedFixLocator } from '@/app/components/AICheckPanel';
import type { AiAssistCommand } from '@/components/editor/AiAssistPanel';
import { AiFloatingToolbar } from '@/components/editor/AiFloatingToolbar';
import { ExportMenu } from '@/components/editor/ExportMenu';
import { RichArticleEditor } from '@/components/editor/RichArticleEditor';
import { GeneratePanelTabs } from '@/components/generate/GeneratePanelTabs';
import { PublishPanel as GeneratePublishPanel } from '@/components/generate/PublishPanel';
import { HumannessPanel } from '@/components/tinh-gon/HumannessPanel';
import { InternalLinkSuggest } from '@/components/tinh-gon/InternalLinkSuggest';
import { KeywordDensityBar } from '@/components/tinh-gon/KeywordDensityBar';
import { readSessionAICheckState, writeSessionAICheckState } from '@/lib/ai-check-persistence';
import { buildSentenceTargets, type SentenceTarget } from '@/lib/dom-sentences';
import type { AICheckResult } from '@/lib/humanness/types';
import { UNIFIED_GENERATE_TABS, type GenerateTab } from '@/lib/shared/generate-tabs';
import { computeSeoChecks } from '@/lib/shared/seo-checks';
import { fitSeoSlugLength, fitSeoTitleLength, stripInlineHtml } from '@/lib/shared/seo-title-fix';
import { rankInternalLinks } from '@/lib/tinh-gon/internal-links';
import { computeKeywordDensity, countWords, slugify } from '@/lib/tinh-gon/text';
import type { TinhGonDecision, TinhGonHumannessResult, TinhGonInternalLinkSuggestion } from '@/lib/tinh-gon/types';
import { LS_BRAND_KEY, LS_CONFIG_KEY, LS_RUN_ID_KEY } from '@/lib/viet-theo-tu-khoa/options';
import { buildKeywordSnapshot, parseKeywordSnapshot } from '@/lib/viet-theo-tu-khoa/persistence';
import type { KeywordArticleConfig } from '@/lib/viet-theo-tu-khoa/types';
import { useGenerateStream } from '@/hooks/useGenerateStream';

interface DbArticlePayload {
  id: string;
  runId: string;
  keyword: string;
  language: string;
  contentType: string;
  targetLength: number;
  aiProvider: string;
  brandConfig?: KeywordArticleConfig['brandConfig'];
  outline?: unknown;
  selectedTitle: string;
  userNotes?: string | null;
  htmlContent: string;
  wordCount: number;
  metaDescription?: string | null;
  slug?: string | null;
  humannessScore?: number | null;
  aiDecision?: TinhGonDecision | null;
  seoChecks?: { keywordDensity?: number } | null;
  scoreBreakdown?: { humanness?: TinhGonHumannessResult; keywordDensity?: number } | null;
  secondaryKeywords?: string[];
  status?: ArticleStatusValue | null;
}

type ArticleStatusValue = 'DRAFT' | 'WRITING' | 'WRITTEN' | 'PUBLISHED' | 'ARCHIVED';

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

const AI_COMMANDS: Array<{ value: AiAssistCommand; label: string }> = [
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

function hasNormalizedText(text: string, needle: string): boolean {
  return normalizeSearchText(text).includes(normalizeSearchText(needle));
}

function countKeywordMentions(html: string, keyword: string): number {
  const normalizedKeyword = normalizeSearchText(keyword).trim();
  if (!normalizedKeyword) return 0;
  const normalizedText = normalizeSearchText(stripHtml(html));
  return normalizedText.match(new RegExp(escapeRegExp(normalizedKeyword), 'g'))?.length ?? 0;
}

function countLinks(html: string, internalDomain = 'noithatminhquan.vn') {
  const rawDomain = internalDomain.replace(/^www\./, '');
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]);
  const internal = hrefs.filter((href) => href.startsWith('/') || href.includes(rawDomain)).length;
  const external = hrefs.filter((href) => /^https?:\/\//i.test(href) && !href.includes(rawDomain)).length;
  return { internal, external, total: hrefs.length };
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
  const density = computeKeywordDensity(input.html, input.keyword);
  const hasSpecificData = /(\d+\s?(cm|mm|m2|m²|kg|%|năm|ngày|giờ)|\d{4}|₫|vnd|vnđ)/i.test(plainText);
  const keywordInTitle = hasNormalizedText(input.title, input.keyword);
  const keywordInSlug = normalizeSearchText(input.slug).replace(/[^a-z0-9]+/g, '-').includes(
    normalizeSearchText(input.keyword).replace(/[^a-z0-9]+/g, '-'),
  );
  const secondaryCovered = input.secondaryKeywords.filter((item) => hasNormalizedText(plainText, item)).length;
  const effectiveHumanness = input.aiCheckResult?.humannessScore ?? input.humannessScore ?? null;
  const aiCriticalFlags = input.aiCheckResult?.counts.criticalFlags ?? null;
  const aiBannedCount = input.aiCheckResult?.counts.bannedWordCount ?? null;
  const aiToneScore = input.aiCheckResult?.breakdown.toneConsistencyScore ?? null;

  const items: PublishSignal[] = [
    { key: 'title', label: 'Title có keyword và độ dài hợp lý', pass: keywordInTitle && input.title.length >= 40 && input.title.length <= 70, detail: `${input.title.length} ký tự`, priority: 'high' },
    { key: 'meta', label: 'Meta description 120-160 ký tự', pass: input.metaDescription.length >= 120 && input.metaDescription.length <= 160, detail: `${input.metaDescription.length} ký tự`, priority: 'high' },
    { key: 'slug', label: 'Slug chứa keyword', pass: input.slug.length <= 75 && keywordInSlug, detail: `${input.slug.length} ký tự`, priority: 'medium' },
    { key: 'length', label: 'Độ dài đạt ngưỡng tối thiểu', pass: wordCount >= input.minWordCount, detail: `${wordCount.toLocaleString()}/${input.minWordCount.toLocaleString()} từ`, priority: 'high' },
    { key: 'density', label: 'Mật độ từ khóa tự nhiên', pass: density >= 0.6 && density <= 1.5, detail: `${density}%`, priority: 'high' },
    { key: 'internal', label: 'Có internal link', pass: links.internal >= 1, detail: `${links.internal} internal link`, priority: 'high' },
    { key: 'external', label: 'Có external link', pass: links.external >= 1, detail: `${links.external} external link`, priority: 'medium' },
    { key: 'semantic', label: 'Có keyword phụ hoặc semantic trong nội dung', pass: input.secondaryKeywords.length === 0 || secondaryCovered > 0, detail: input.secondaryKeywords.length ? `${secondaryCovered}/${input.secondaryKeywords.length} keyword phụ` : 'Không cấu hình keyword phụ', priority: 'medium' },
    { key: 'eeat', label: 'Có số liệu hoặc ngữ cảnh cụ thể', pass: hasSpecificData, detail: hasSpecificData ? 'Có dữ kiện cụ thể' : 'Nên thêm số liệu, năm, thông số', priority: 'medium' },
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
  return {
    score,
    status: failed.some((item) => item.priority === 'high') ? 'blocked' : score >= 85 ? 'ready' : 'review',
    items,
    failed,
    highPriorityFailed: failed.filter((item) => item.priority === 'high'),
  };
}

function PublishReadinessCard({ readiness, title = 'Sẵn sàng đăng' }: { readiness: PublishReadiness; title?: string }) {
  const tone = readiness.status === 'ready'
    ? { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', label: 'Có thể đăng' }
    : readiness.status === 'blocked'
      ? { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Cần sửa trước' }
      : { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Nên rà soát' };
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
        <div className={`h-full rounded-full ${readiness.status === 'ready' ? 'bg-green-500' : readiness.status === 'blocked' ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${readiness.score}%` }} />
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
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <p className="mt-1 text-xs" style={{ color }}>{label}</p>
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
  humannessBreakdownData,
  internalLinks,
  loadingLinks,
  fixingDensity,
  savingDraft,
  savedFlash,
  fieldHighlights,
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
  humannessBreakdownData?: TinhGonHumannessResult['scoreBreakdown'] | null;
  internalLinks: TinhGonInternalLinkSuggestion[];
  loadingLinks: boolean;
  fixingDensity: boolean;
  savingDraft: boolean;
  savedFlash: boolean;
  fieldHighlights: { title: boolean; slug: boolean; meta: boolean };
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
    if (humannessBreakdownData) {
      return [
        ['Ngôn ngữ tự nhiên', humannessBreakdownData.language_natural],
        ['Cấu trúc bài', humannessBreakdownData.structure],
        ['E-E-A-T', humannessBreakdownData.eeat_signals],
        ['Engagement', humannessBreakdownData.engagement],
      ] as const;
    }
    const score = humannessScore ?? 0;
    return [
      ['Ngôn ngữ tự nhiên', Math.round(score * 0.25)],
      ['Cấu trúc bài', Math.round(score * 0.25)],
      ['E-E-A-T', Math.round(score * 0.24)],
      ['Engagement', Math.round(score * 0.26)],
    ] as const;
  }, [humannessBreakdownData, humannessScore]);

  function addKeyword() {
    const value = newKeyword.trim();
    if (!value) return;
    onAddKeyword(value);
    setNewKeyword('');
  }

  const fixActions: Record<number, { label: string; onClick: () => void; disabled?: boolean }> = {
    0: { label: '🔧 Sửa — Thêm từ khóa vào tiêu đề', onClick: onFixTitle },
    1: { label: '🔧 Sửa — Chèn từ khóa vào meta', onClick: onFixMeta },
    2: { label: '🔧 Sửa — Tạo slug chuẩn', onClick: onFixSlug },
    3: { label: '🔧 Sửa — Chèn từ khóa vào mở bài', onClick: () => onFixSeoCheck(3) },
    4: { label: '🔧 Sửa — Chèn từ khóa vào nội dung', onClick: () => onFixSeoCheck(4) },
    5: { label: '🔧 Sửa — Mở rộng nội dung', onClick: () => onFixSeoCheck(5) },
    6: {
      label: fixingDensity ? 'AI đang xử lý...' : '⚡ AI sửa — Tăng mật độ từ khóa',
      onClick: () => onFixSeoCheck(6),
      disabled: fixingDensity,
    },
    7: { label: '⚡ AI sửa — Rút gọn slug', onClick: () => onFixSeoCheck(7) },
    8: {
      label: '🔧 Sửa — Chèn internal link',
      onClick: () => {
        if (internalLinks[0]) {
          setInternalUrl(internalLinks[0].url);
          setInternalText(internalLinks[0].suggestText || internalLinks[0].title);
        }
        setFixingInternal((prev) => !prev);
      },
    },
    9: { label: '🔧 Sửa — Chèn external link', onClick: () => setFixingExternal((prev) => !prev) },
    10: { label: '🔧 Sửa — Tự động thêm alt text', onClick: onFixAltText },
    11: { label: '🔧 Sửa — Chèn từ khóa phụ', onClick: () => onFixSeoCheck(11) },
    12: { label: '🔧 Sửa — Đưa từ khóa lên đầu tiêu đề', onClick: onFixTitleToStart },
    13: { label: `🔧 Sửa — Thêm năm ${new Date().getFullYear()}`, onClick: onFixTitleNumber },
    14: { label: '🔧 Sửa — Chuẩn hóa thẻ H1', onClick: () => onFixSeoCheck(14) },
    15: { label: '🔧 Sửa — Thêm H2', onClick: () => onFixSeoCheck(15) },
    16: { label: '🔧 Sửa — Sửa thứ bậc heading', onClick: () => onFixSeoCheck(16) },
    17: { label: '⚡ AI sửa — Chỉnh độ dài tiêu đề', onClick: () => onFixSeoCheck(17) },
    18: { label: '🔧 Sửa — Chỉnh độ dài meta', onClick: () => onFixSeoCheck(18) },
    19: { label: '🔧 Sửa — Thêm FAQ', onClick: () => onFixSeoCheck(19) },
    20: { label: '🔧 Sửa — Thêm mục lục', onClick: () => onFixSeoCheck(20) },
  };

  return (
    <div className="p-4">
      <div className="space-y-5">
        <div className="space-y-3">
          <SeoScoreBar score={seo.score} />
          <KeywordDensityBar density={keyword ? keywordDensity : null} />
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Trạng thái draft</span>
            <span className={`text-xs ${savedFlash ? 'text-green-600' : savingDraft ? 'text-blue-600' : 'text-gray-400'}`}>
              {savedFlash ? 'Đã lưu' : savingDraft ? 'Đang lưu...' : articleId ? 'DB linked' : ''}
            </span>
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
                    {groupErrors === 0 ? '✓ Ổn' : `${groupErrors} Lỗi`}
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
                                disabled={action.disabled}
                                className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
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
              <span className="text-xs font-semibold text-gray-700">Điểm tự nhiên</span>
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
function KeywordAiTab({
  html,
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
  selectedText: string;
  aiEditing: boolean;
  aiCheckStorageKey?: string;
  onAiEdit: (command: AiAssistCommand) => void;
  onApplyFix: (original: string, replacement: string, sentenceIndex?: number, target?: SentenceTarget) => boolean | void | Promise<boolean | void>;
  getSentenceTargets: () => SentenceTarget[];
  onAiCheckResultChange?: (result: AICheckResult | null) => void;
  onAiRewrite?: (snippet: string, flagLabel: string, target?: SentenceTarget) => void;
}) {
  const hasSelection = selectedText.trim().length > 0;
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-700">AI Edit theo vùng chọn</p>
        <p className="mt-1 text-xs text-gray-400">{hasSelection ? `Đã chọn ${selectedText.length} ký tự để AI chỉnh.` : 'Bôi đen đoạn văn ngay trong editor bên trái rồi chọn lệnh AI Edit.'}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {AI_COMMANDS.map((command) => (
            <button key={command.value} type="button" onClick={() => onAiEdit(command.value)} disabled={!hasSelection || aiEditing} className="rounded-lg border border-blue-200 px-3 py-2 text-xs text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45">
              {aiEditing ? 'Đang xử lý...' : command.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {html ? (
          <AICheckPanel html={html} onApplyFix={onApplyFix} storageKey={aiCheckStorageKey} getSentenceTargets={getSentenceTargets} onResultChange={onAiCheckResultChange} onAiRewrite={onAiRewrite} />
        ) : (
          <div className="p-4 text-sm text-gray-500">Chờ nội dung được tạo trước khi kiểm tra AI.</div>
        )}
      </div>
    </div>
  );
}

function QualityTab({
  humannessScore,
  humannessDecision,
  keywordDensity,
  forbiddenFound,
}: {
  humannessScore: number | null;
  humannessDecision: TinhGonDecision;
  keywordDensity: number;
  forbiddenFound: string[];
}) {
  return (
    <div className="space-y-4 p-4">
      {humannessScore !== null ? (
        <HumannessPanel
          score={humannessScore}
          decision={humannessDecision}
          issues={[]}
          forbiddenFound={forbiddenFound}
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
          <span className="text-xs font-semibold text-gray-700">Keyword Density</span>
          <span className="text-sm font-bold text-gray-800">{keywordDensity.toFixed(2)}%</span>
        </div>
        <KeywordDensityBar density={keywordDensity} />
      </div>
    </div>
  );
}

function LinksTab({
  internalLinks,
  loadingLinks,
  onInsert,
}: {
  internalLinks: TinhGonInternalLinkSuggestion[];
  loadingLinks: boolean;
  onInsert: (html: string) => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Internal links gợi ý</p>
          {loadingLinks && <span className="text-xs text-gray-400">Đang tải...</span>}
        </div>
        <InternalLinkSuggest links={internalLinks} onInsert={onInsert} />
        {!loadingLinks && internalLinks.length === 0 && (
          <p className="text-sm text-gray-500">Chưa có gợi ý internal link phù hợp.</p>
        )}
      </div>
    </div>
  );
}

function ImagesTab({ imageOption }: { imageOption: string }) {
  return (
    <div className="p-4">
      <div data-image-option={imageOption} className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
        <p className="text-sm font-bold text-gray-700">Thư viện hình ảnh</p>
        <p className="mt-1 text-xs text-gray-400">Đang phát triển</p>
      </div>
    </div>
  );
}

function SeoCheckAction(index: number): { label: string; tab: GenerateTab } | null {
  switch (index) {
    case 3:
    case 4:
    case 5:
    case 6:
    case 11:
    case 14:
    case 15:
    case 16:
    case 17:
    case 18:
    case 19:
    case 20:
      return { label: 'Mở tab SEO để sửa nhanh', tab: 'seo' };
    default:
      return null;
  }
}

void SeoCheckAction;

export default function VietTheoTuKhoaGeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get('runId');
  const contentRef = useRef<HTMLDivElement>(null);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const persistedSignatureRef = useRef('');
  const loadRequestRef = useRef(0);

  const [config, setConfig] = useState<KeywordArticleConfig | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [editorHtml, setEditorHtml] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editMetaDescription, setEditMetaDescription] = useState('');
  const [wordCountLive, setWordCountLive] = useState(0);
  const [humannessScore, setHumannessScore] = useState(0);
  const [humannessDecision, setHumannessDecision] = useState<TinhGonDecision>('REVIEW');
  const [humannessResult, setHumannessResult] = useState<TinhGonHumannessResult | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [activeTab, setActiveTab] = useState<GenerateTab>('seo');
  const [slugEdited, setSlugEdited] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [internalLinks, setInternalLinks] = useState<TinhGonInternalLinkSuggestion[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [fixingDensity, setFixingDensity] = useState(false);
  const [fixingTitleLength, setFixingTitleLength] = useState(false);
  const [fixingSlugLength, setFixingSlugLength] = useState(false);
  const [fieldHighlights, setFieldHighlights] = useState<{ title: boolean; slug: boolean; meta: boolean }>({
    title: false,
    slug: false,
    meta: false,
  });
  const [floatingToolbar, setFloatingToolbar] = useState({ visible: false, x: 0, y: 0 });
  const [aiCheckResult, setAiCheckResult] = useState<AICheckResult | null>(null);
  const [aiEditing, setAiEditing] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const {
    streaming,
    outputHtml,
    error: streamError,
    statusMessage: streamStatusMessage,
    lastEvent,
    startStream,
    abort: abortGenerateStream,
    reset: resetGenerateStream,
  } = useGenerateStream('/api/viet-theo-tu-khoa/stream');

  const autoSlug = useMemo(() => slugify(editTitle), [editTitle]);
  const activeSlug = slugEdited ? customSlug : autoSlug;
  const keyword = config?.keyword || '';
  const currentWordCount = useMemo(() => countWords(editorHtml) || wordCountLive, [editorHtml, wordCountLive]);
  const currentKeywordDensity = useMemo(() => (keyword ? computeKeywordDensity(editorHtml, keyword) : 0), [editorHtml, keyword]);
  const seoScore = useMemo(() => {
    if (!config?.keyword) return 0;
    return computeSeoChecks({
      title: editTitle,
      metaDescription: editMetaDescription,
      html: editorHtml,
      wordCount: currentWordCount,
      keyword: config.keyword,
      secondaryKeywords: config.secondaryKeywords,
      slug: activeSlug,
      minWordCount: Math.min(800, config.targetLength),
    }).score;
  }, [activeSlug, config, currentWordCount, editMetaDescription, editTitle, editorHtml]);
  const aiCheckStorageKey = useMemo(() => (articleId ? `aicheck:ttk:${articleId}` : undefined), [articleId]);
  const effectiveHumannessScore = aiCheckResult?.humannessScore ?? humannessScore ?? null;
  const publishReadiness = useMemo(() => buildPublishReadiness({
    html: editorHtml,
    title: editTitle,
    metaDescription: editMetaDescription,
    slug: activeSlug,
    keyword: config?.keyword || '',
    secondaryKeywords: config?.secondaryKeywords || [],
    minWordCount: Math.min(800, config?.targetLength || 800),
    humannessScore,
    aiCheckResult,
  }), [activeSlug, aiCheckResult, config?.keyword, config?.secondaryKeywords, config?.targetLength, editMetaDescription, editTitle, editorHtml, humannessScore]);

  const isActiveLoad = useCallback((loadId: number) => loadRequestRef.current === loadId, []);

  const resetPageStateForLoad = useCallback(() => {
    persistedSignatureRef.current = '';
    setConfig(null);
    setArticleId(null);
    setError('');
    setStatus('idle');
    setStatusMessage('');
    setEditorHtml('');
    setEditTitle('');
    setEditMetaDescription('');
    setWordCountLive(0);
    setHumannessScore(0);
    setHumannessDecision('REVIEW');
    setHumannessResult(null);
    setSelectedText('');
    setSlugEdited(false);
    setCustomSlug('');
    setSavedFlash(false);
    setInternalLinks([]);
    setLoadingLinks(false);
    setFixingDensity(false);
    setFieldHighlights({ title: false, slug: false, meta: false });
    setAiCheckResult(null);
    setBanner(null);
    setFloatingToolbar((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    document.title = 'Generate Viết Theo Từ Khóa - Content Agent';
    const loadId = loadRequestRef.current + 1;
    loadRequestRef.current = loadId;
    resetGenerateStream();
    resetPageStateForLoad();
    setLoading(true);
    void bootstrap(loadId);
    return () => {
      loadRequestRef.current += 1;
      abortGenerateStream();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runIdParam, abortGenerateStream, resetGenerateStream, resetPageStateForLoad]);

  useEffect(() => {
    if (!outputHtml) return;
    setEditorHtml(outputHtml);
    setWordCountLive(countWords(outputHtml));
  }, [outputHtml]);

  useEffect(() => {
    setWordCountLive(countWords(editorHtml));
  }, [editorHtml]);

  useEffect(() => {
    if (streaming) setStatus('streaming');
  }, [streaming]);

  useEffect(() => {
    if (streamStatusMessage) setStatusMessage(streamStatusMessage);
  }, [streamStatusMessage]);

  useEffect(() => {
    if (!streamError) return;
    setStatus('error');
    setError(streamError);
    setStatusMessage(streamError);
  }, [streamError]);

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === 'humanness') {
      setHumannessScore(lastEvent.score ?? 0);
      setHumannessDecision((lastEvent.decision as TinhGonDecision) || 'REVIEW');
      if (lastEvent.humanness && typeof lastEvent.humanness === 'object') {
        setHumannessResult(lastEvent.humanness as TinhGonHumannessResult);
      }
    }
    if (lastEvent.type === 'done') {
      const data = lastEvent.data && typeof lastEvent.data === 'object' ? lastEvent.data as { wordCount?: number } : {};
      setStatus('done');
      setWordCountLive(data.wordCount ?? lastEvent.wordCount ?? countWords(outputHtml || editorHtml));
      setStatusMessage('Hoàn tất');
    }
    if (lastEvent.type === 'error') {
      setStatus('error');
      setError(lastEvent.message || 'Lỗi stream');
      setStatusMessage(lastEvent.message || 'Lỗi stream');
    }
  }, [editorHtml, lastEvent, outputHtml]);

  useEffect(() => {
    function handleSelection() {
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
    }
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

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

  function addSecondaryKeyword(keywordToAdd: string) {
    const value = keywordToAdd.trim();
    if (!value || !config) return;
    setConfig((prev) => prev && !prev.secondaryKeywords.includes(value) ? { ...prev, secondaryKeywords: [...prev.secondaryKeywords, value] } : prev);
  }

  function removeSecondaryKeyword(keywordToRemove: string) {
    setConfig((prev) => prev ? { ...prev, secondaryKeywords: prev.secondaryKeywords.filter((item) => item !== keywordToRemove) } : prev);
  }

  function getCurrentHtml() {
    return editorHtml;
  }

  function getEditorNode() {
    return editorShellRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null;
  }

  function containerFromHtml(html: string) {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container;
  }

  function appendSeoSection(html: string, heading: string, bodyHtml: string) {
    return `${html}<section><h2>${escapeHtml(heading)}</h2>${bodyHtml}</section>`;
  }

  function applySeoHtmlFix(nextHtml: string, message: string) {
    setEditorHtml(nextHtml);
    setWordCountLive(countWords(nextHtml));
    setBanner({ tone: 'success', text: message });
  }

  function fixTitle() {
    if (!config?.keyword || !editTitle) return;
    const kw = config.keyword.trim();
    if (editTitle.toLowerCase().includes(kw.toLowerCase())) {
      setBanner({ tone: 'success', text: 'Tiêu đề đã có từ khóa chính.' });
      return;
    }
    const fixed = `${kw} - ${editTitle}`;
    setEditTitle(fixed);
    setSlugEdited(false);
    setFieldHighlights((prev) => ({ ...prev, title: true }));
    setBanner({ tone: 'success', text: 'Đã thêm từ khóa vào tiêu đề.' });
  }

  function fixMeta() {
    if (!config) return;
    if (editMetaDescription.toLowerCase().includes(config.keyword.toLowerCase())) {
      setBanner({ tone: 'success', text: 'Meta description đã có từ khóa chính.' });
      return;
    }
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

  function fixKeywordInIntro() {
    const kw = config?.keyword.trim();
    const sourceHtml = getCurrentHtml();
    if (!kw || !sourceHtml) return;
    const container = containerFromHtml(sourceHtml);
    const firstParagraph = container.querySelector('p');
    if (firstParagraph) {
      firstParagraph.insertAdjacentHTML('afterbegin', `<strong>${escapeHtml(kw)}</strong>: `);
      applySeoHtmlFix(container.innerHTML, 'Đã chèn từ khóa vào phần mở bài.');
      return;
    }
    const intro = document.createElement('p');
    intro.innerHTML = `<strong>${escapeHtml(kw)}</strong> là chủ đề chính của bài viết này.`;
    const h1 = container.querySelector('h1');
    if (h1) h1.insertAdjacentElement('afterend', intro);
    else container.prepend(intro);
    applySeoHtmlFix(container.innerHTML, 'Đã thêm đoạn mở bài có từ khóa.');
  }

  function fixKeywordInContent() {
    const kw = config?.keyword.trim();
    const sourceHtml = getCurrentHtml();
    if (!kw || !sourceHtml) return;
    const nextHtml = appendSeoSection(sourceHtml, `Ghi chú thêm về ${kw}`, `<p>Khi đánh giá ${escapeHtml(kw)}, cần xem xét nhu cầu sử dụng thực tế, ngân sách, tiêu chí chất lượng và các điểm cần so sánh để chọn phương án phù hợp.</p>`);
    applySeoHtmlFix(nextHtml, 'Đã chèn thêm từ khóa vào nội dung.');
  }

  function fixMinWordCount() {
    const kw = config?.keyword.trim();
    const sourceHtml = getCurrentHtml();
    const minWordCount = Math.min(800, config?.targetLength || 800);
    const currentCount = countWords(sourceHtml);
    const missing = Math.max(0, minWordCount - currentCount);
    if (!kw || !sourceHtml || missing === 0) return;
    const sentence = `${kw} cần được cân nhắc theo mục đích sử dụng, tiêu chí so sánh, ngân sách và những điểm thực tế để người đọc dễ lựa chọn hơn.`;
    const paragraphs: string[] = [];
    let total = 0;
    while (total < missing) {
      paragraphs.push(`<p>${escapeHtml(sentence)}</p>`);
      total += countWords(sentence);
    }
    applySeoHtmlFix(appendSeoSection(sourceHtml, `Thông tin bổ sung về ${kw}`, paragraphs.join('')), 'Đã mở rộng nội dung để đạt độ dài tối thiểu.');
  }

  async function fixKeywordDensity() {
    const kw = config?.keyword.trim();
    const sourceHtml = getCurrentHtml();
    if (!kw || !sourceHtml || fixingDensity) return;

    const currentDensity = computeKeywordDensity(sourceHtml, kw);
    if (currentDensity >= 0.6 && currentDensity <= 1.5) {
      setBanner({ tone: 'success', text: 'Mật độ từ khóa đã nằm trong ngưỡng mục tiêu (0.6–1.5%).' });
      return;
    }

    if (currentDensity > 1.5) {
      const container = containerFromHtml(sourceHtml);
      const maxAllowed = Math.max(1, Math.floor(countWords(sourceHtml) * 0.014));
      const pattern = new RegExp(escapeRegExp(kw), 'gi');
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

    setFixingDensity(true);

    try {
      const currentCount = countKeywordMentions(sourceHtml, kw);
      const wordCount = countWords(sourceHtml);
      const response = await fetch('/api/pipeline/fix-density', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: sourceHtml,
          keyword: kw,
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
        throw new Error(data.error || 'Không thể fix mật độ từ khóa');
      }

      if (!data.data?.changed || !data.data.html) {
        setBanner({ tone: 'success', text: 'Mật độ từ khóa đã nằm trong ngưỡng mục tiêu.' });
        return;
      }

      const nextHtml = data.data.html;
      const nextDensity = computeKeywordDensity(nextHtml, kw);
      applySeoHtmlFix(nextHtml, `Đã AI fix mật độ từ khóa lên ${nextDensity.toFixed(2)}%.`);
      setTimeout(() => {
        void saveDraft(false).catch(() => null);
      }, 500);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Không thể fix mật độ từ khóa';
      setBanner({ tone: 'error', text: message });
      setError(message);
    } finally {
      setFixingDensity(false);
    }
  }

  function fixSecondaryKeyword() {
    const sourceHtml = getCurrentHtml();
    const plain = normalizeSearchText(stripHtml(sourceHtml));
    const missingKeyword = (config?.secondaryKeywords || []).find((item) => !plain.includes(normalizeSearchText(item)));
    if (!missingKeyword || !sourceHtml) return;
    const nextHtml = appendSeoSection(sourceHtml, `Liên quan đến ${missingKeyword}`, `<p>${escapeHtml(missingKeyword)} là yếu tố nên được cân nhắc cùng chủ đề chính để nội dung bao quát hơn và hữu ích hơn cho người đọc.</p>`);
    applySeoHtmlFix(nextHtml, 'Đã chèn từ khóa phụ vào nội dung.');
  }

  function fixH1Count() {
    const sourceHtml = getCurrentHtml();
    if (!sourceHtml) return;
    const container = containerFromHtml(sourceHtml);
    const h1s = Array.from(container.querySelectorAll('h1'));
    if (h1s.length === 0) {
      const h1 = document.createElement('h1');
      h1.textContent = editTitle || config?.keyword || 'Bài viết';
      container.prepend(h1);
    } else {
      h1s.slice(1).forEach((heading) => {
        const h2 = document.createElement('h2');
        h2.innerHTML = heading.innerHTML;
        heading.replaceWith(h2);
      });
    }
    applySeoHtmlFix(container.innerHTML, 'Đã chuẩn hóa số lượng thẻ H1.');
  }

  function fixH2Count() {
    const kw = config?.keyword;
    const sourceHtml = getCurrentHtml();
    if (!kw || !sourceHtml) return;
    const currentH2Count = (sourceHtml.match(/<h2[\s>]/gi) || []).length;
    let nextHtml = sourceHtml;
    const missing = Math.max(0, 2 - currentH2Count);
    for (let index = 0; index < missing; index += 1) {
      nextHtml = appendSeoSection(nextHtml, index === 0 ? `Cách chọn ${kw}` : `Lưu ý khi dùng ${kw}`, `<p>${escapeHtml(kw)} nên được đánh giá theo mục tiêu, cách áp dụng và những điểm cần so sánh để chọn đúng phương án.</p>`);
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
      heading.replaceWith(replacement);
    });
    applySeoHtmlFix(container.innerHTML, 'Đã sửa thứ bậc heading.');
  }

  async function fixTitleLengthWithAi() {
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
      setSlugEdited(false);
      setFieldHighlights((prev) => ({ ...prev, title: true }));
      setBanner({ tone: 'success', text: 'Đã chỉnh độ dài tiêu đề SEO.' });
    } catch {
      setEditTitle(fitSeoTitleLength(sourceTitle, config.keyword));
      setSlugEdited(false);
      setFieldHighlights((prev) => ({ ...prev, title: true }));
      setBanner({ tone: 'success', text: 'Đã chỉnh độ dài tiêu đề SEO.' });
    } finally {
      setFixingTitleLength(false);
    }
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
      setBanner({ tone: 'success', text: 'Đã rút gọn slug chuẩn SEO.' });
    } catch {
      setCustomSlug(fitSeoSlugLength(sourceText, config.keyword));
      setSlugEdited(true);
      setFieldHighlights((prev) => ({ ...prev, slug: true }));
      setBanner({ tone: 'success', text: 'Đã rút gọn slug chuẩn SEO.' });
    } finally {
      setFixingSlugLength(false);
    }
  }

  function fixMetaLength() {
    const kw = config?.keyword;
    const words = stripHtml(getCurrentHtml()).split(/\s+/).filter(Boolean).slice(0, 24).join(' ');
    if (!kw) return;
    let nextMeta = `${kw}: ${words || 'bài viết giải thích rõ ràng, dễ hiểu và có lưu ý thực tế cho người đọc.'}`;
    if (nextMeta.length < 120) nextMeta = `${nextMeta} Nội dung tập trung vào thông tin cần biết, cách lựa chọn và các điểm nên kiểm tra trước khi quyết định.`;
    if (nextMeta.length > 160) nextMeta = `${nextMeta.slice(0, 157).trim()}...`;
    setEditMetaDescription(nextMeta);
    setBanner({ tone: 'success', text: 'Đã chỉnh độ dài meta description.' });
  }

  function fixFaqSection() {
    const kw = config?.keyword;
    const sourceHtml = getCurrentHtml();
    if (!kw || !sourceHtml) return;
    const safeKeyword = escapeHtml(kw);
    const faqHtml = `
      <div class="faq-item"><h3>${safeKeyword} phù hợp với ai?</h3><p>${safeKeyword} phù hợp với người đang cần thông tin rõ ràng để so sánh, lựa chọn hoặc lập kế hoạch trước khi áp dụng.</p></div>
      <div class="faq-item"><h3>Cần lưu ý gì khi chọn ${safeKeyword}?</h3><p>Nên kiểm tra nhu cầu thực tế, tiêu chí quan trọng, ngân sách và các yếu tố liên quan để tránh chọn sai.</p></div>
      <div class="faq-item"><h3>${safeKeyword} có cần bảo trì hay theo dõi thêm không?</h3><p>Tùy từng trường hợp, bạn nên theo dõi hướng dẫn sử dụng và cập nhật các lưu ý mới để áp dụng hiệu quả hơn.</p></div>
    `;
    applySeoHtmlFix(appendSeoSection(sourceHtml, `FAQ về ${kw}`, faqHtml), 'Đã thêm section FAQ.');
  }

  function fixTocSection() {
    const sourceHtml = getCurrentHtml();
    if (!sourceHtml) return;
    const container = containerFromHtml(sourceHtml);
    let headings = Array.from(container.querySelectorAll('h2'));
    if (headings.length === 0) {
      const h2 = document.createElement('h2');
      h2.textContent = `Tổng quan về ${config?.keyword || editTitle || 'bài viết'}`;
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
    nav.innerHTML = `<p><strong>Mục lục</strong></p><ul>${headings.map((heading) => `<li><a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.textContent || heading.id)}</a></li>`).join('')}</ul>`;
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

  function fixAltText() {
    if (!config?.keyword) return;
    const editorNode = getEditorNode();
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
      setBanner({ tone: 'success', text: 'Alt text ảnh đã có từ khóa chính.' });
      return;
    }
    const nextHtml = editorNode.innerHTML;
    setEditorHtml(nextHtml);
    setWordCountLive(countWords(nextHtml));
    setBanner({ tone: 'success', text: 'Đã cập nhật alt text ảnh.' });
    requestAnimationFrame(() => {
      const liveEditorNode = getEditorNode();
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

  async function saveDraft(createVersion: boolean) {
    if (!articleId || !config) throw new Error('Không có bài viết để lưu.');
    const nextSnapshot = buildKeywordSnapshot({ stage: 'generate', config, aiCheck: readSessionAICheckState(aiCheckStorageKey) });
    const signature = JSON.stringify({ html: editorHtml, title: editTitle, metaDescription: editMetaDescription, wordCount: currentWordCount, humannessScore, humannessDecision, snapshot: nextSnapshot });
    if (!createVersion && signature === persistedSignatureRef.current) return;
    const response = await fetch(`/api/articles/${articleId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: config.keyword,
        language: config.language,
        contentType: `viet_theo_tu_khoa:${config.outlineMode}`,
        targetLength: config.targetLength,
        aiProvider: config.model,
        brandConfig: config.brandConfig,
        outline: nextSnapshot,
        selectedTitle: editTitle || config.keyword,
        htmlContent: editorHtml,
        metaDescription: editMetaDescription,
        slug: activeSlug,
        wordCount: currentWordCount,
        seoChecks: { keywordDensity: currentKeywordDensity },
        humannessScore,
        scoreBreakdown: { humanness: humannessResult, keywordDensity: currentKeywordDensity },
        secondaryKeywords: config.secondaryKeywords,
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

  function handleRestart() {
    sessionStorage.removeItem(LS_CONFIG_KEY);
    sessionStorage.removeItem(LS_RUN_ID_KEY);
    localStorage.removeItem(LS_BRAND_KEY);
    writeSessionAICheckState(aiCheckStorageKey, null);
    router.push('/viet-theo-tu-khoa');
  }

  function applyStoredSlug(slug?: string | null) {
    const nextSlug = slug?.trim() || '';
    if (nextSlug) {
      setCustomSlug(nextSlug);
      setSlugEdited(true);
      return;
    }
    setCustomSlug('');
    setSlugEdited(false);
  }

  async function bootstrap(loadId: number) {
    const storedRunId = runIdParam || sessionStorage.getItem(LS_RUN_ID_KEY) || '';
    const storedConfig = sessionStorage.getItem(LS_CONFIG_KEY);
    if (!storedRunId) {
      if (isActiveLoad(loadId)) router.replace('/viet-theo-tu-khoa');
      return;
    }
    if (storedConfig) {
      try {
        const parsedConfig = JSON.parse(storedConfig) as KeywordArticleConfig;
        if (isActiveLoad(loadId)) setConfig(parsedConfig);
      } catch {
        sessionStorage.removeItem(LS_CONFIG_KEY);
      }
    }
    try {
      const response = await fetch(`/api/articles/by-runid/${encodeURIComponent(storedRunId)}`);
      const payload = await response.json() as { success?: boolean; data?: DbArticlePayload; error?: string };
      if (!isActiveLoad(loadId)) return;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Không tải được bài viết');
      }
      await hydrateFromArticle(payload.data, Boolean(runIdParam), loadId);
    } catch (requestError) {
      if (!isActiveLoad(loadId)) return;
      setError(requestError instanceof Error ? requestError.message : 'Lỗi tải dữ liệu');
      setLoading(false);
    }
  }

  async function hydrateFromArticle(article: DbArticlePayload, fromRunId = false, loadId = loadRequestRef.current) {
    if (!isActiveLoad(loadId)) return;
    const hasSavedContent = Boolean(article.htmlContent?.trim());
    setArticleId(article.id);
    sessionStorage.setItem(LS_RUN_ID_KEY, article.runId);
    const snapshot = parseKeywordSnapshot(article.outline);
    if (snapshot?.config) {
      setConfig(snapshot.config);
      sessionStorage.setItem(LS_CONFIG_KEY, JSON.stringify(snapshot.config));
    }
    setEditTitle(article.selectedTitle || article.keyword);
    setEditMetaDescription(article.metaDescription || '');
    applyStoredSlug(article.slug);
    setEditorHtml(article.htmlContent || '');
    setWordCountLive(article.wordCount || countWords(article.htmlContent || ''));
    setHumannessScore(article.humannessScore || 0);
    setHumannessDecision((article.aiDecision as TinhGonDecision) || 'REVIEW');
    setHumannessResult(article.scoreBreakdown?.humanness ?? null);
    if (snapshot?.aiCheck !== undefined) writeSessionAICheckState(`aicheck:ttk:${article.id}`, snapshot.aiCheck);
    setAiCheckResult(null);
    if (!hasSavedContent) {
      await runArticleStream(article.id, article.runId, loadId);
      return;
    }
    if (fromRunId) {
      persistedSignatureRef.current = JSON.stringify({ html: article.htmlContent, title: article.selectedTitle, metaDescription: article.metaDescription || '', wordCount: article.wordCount });
    }
    if (!isActiveLoad(loadId)) return;
    setStatus('done');
    setStatusMessage('Hoan tat');
    setLoading(false);
  }

  async function runArticleStream(nextArticleId: string, nextRunId: string, loadId = loadRequestRef.current) {
    if (!isActiveLoad(loadId)) return;
    setLoading(false);
    setStatus('streaming');
    setStatusMessage('AI đang viết bài...');
    setEditorHtml('');
    setWordCountLive(0);
    const completed = await startStream({ articleId: nextArticleId, runId: nextRunId });
    if (!completed || !isActiveLoad(loadId)) return;
    await reloadArticle(nextRunId, loadId);
  }

  async function reloadArticle(nextRunId: string, loadId = loadRequestRef.current) {
    const response = await fetch(`/api/articles/by-runid/${encodeURIComponent(nextRunId)}`);
    const payload = await response.json() as { success?: boolean; data?: DbArticlePayload };
    if (!isActiveLoad(loadId) || !response.ok || !payload.success || !payload.data) return;
    const article = payload.data;
    const snapshot = parseKeywordSnapshot(article.outline);
    if (snapshot?.config) setConfig(snapshot.config);
    setArticleId(article.id);
    setEditTitle(article.selectedTitle || article.keyword);
    setEditMetaDescription(article.metaDescription || '');
    applyStoredSlug(article.slug);
    setEditorHtml(article.htmlContent || '');
    setWordCountLive(article.wordCount || countWords(article.htmlContent || ''));
    setHumannessScore(article.humannessScore || 0);
    setHumannessDecision((article.aiDecision as TinhGonDecision) || 'REVIEW');
    setHumannessResult(article.scoreBreakdown?.humanness ?? null);
    setStatus('done');
    setStatusMessage('Hoan tat');
  }

  async function runAiAssistCommand(command: AiAssistCommand, text = selectedText.trim()): Promise<string> {
    if (!config || (!text && command !== 'intro' && command !== 'conclusion')) return '';
    const response = await fetch('/api/editor/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, text: text || config.keyword, keyword: config.keyword, model: config.model }),
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

  async function handleToolbarCommand(command: AiAssistCommand) {
    if (!selectedText.trim()) return;
    setFloatingToolbar((prev) => ({ ...prev, visible: false }));
    setBanner(null);
    try {
      const assistedHtml = await runAiAssistCommand(command);
      if (!assistedHtml) throw new Error('AI không trả về nội dung.');
      const range = selectionRangeRef.current;
      const editorNode = editorShellRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null;
      if (!range || !editorNode) throw new Error('Không tìm thấy vùng editor để áp dụng.');
      const fragment = range.createContextualFragment(assistedHtml);
      range.deleteContents();
      range.insertNode(fragment);
      setEditorHtml(editorNode.innerHTML);
      setBanner({ tone: 'success', text: 'AI đã cập nhật đoạn văn đang chọn.' });
      window.getSelection()?.removeAllRanges();
    } catch (requestError) {
      setBanner({ tone: 'error', text: requestError instanceof Error ? requestError.message : 'Không thể xử lý AI inline.' });
    }
  }

  async function handleAiEditCommand(command: AiAssistCommand) {
    if (!selectedText.trim() || aiEditing) return;
    setAiEditing(true);
    setFloatingToolbar((prev) => ({ ...prev, visible: false }));
    setBanner(null);
    try {
      const assistedHtml = await runAiAssistCommand(command);
      if (!assistedHtml) throw new Error('AI không trả về nội dung.');
      const nextHtml = editorHtml.replace(selectedText, assistedHtml);
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
    if (targets.length === 0) {
      return null;
    }

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
    if (!editorNode.contains(range.commonAncestorContainer)) {
      return false;
    }

    scrollRangeIntoView(range);
    if (markRangeAsAppliedFix(range)) {
      return true;
    }

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
        if (target) {
          revealSentenceTarget(target);
        }
      });
    });
  }

  function applySentenceFix(locator: AppliedFixLocator): boolean {
    const replacement = locator.replacement.trim();
    if (!replacement) {
      return false;
    }

    if (typeof document === 'undefined') {
      return false;
    }

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
    if (!fallbackOriginal) {
      return false;
    }

    const nextHtml = editorHtml.replace(fallbackOriginal, replacement);
    if (nextHtml === editorHtml) {
      return false;
    }

    setEditorHtml(nextHtml);
    setWordCountLive(countWords(nextHtml));
    queueRevealSentenceFix({
      sentenceIndex: locator.sentenceIndex ?? null,
      original: locator.original,
      replacement,
    });
    return true;
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
      setBanner({ tone: 'success', text: `Đã viết lại câu flag: ${flagLabel} và đưa editor đến đúng chỗ.` });
    } catch (requestError) {
      setBanner({ tone: 'error', text: requestError instanceof Error ? requestError.message : 'Không thể viết lại câu.' });
    } finally {
      setAiEditing(false);
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

  const insertStep4Html = (html: string) => {
    const snippet = /^<a[\s>]/i.test(html.trim()) ? `<p>${html}</p>` : html;
    setEditorHtml((current) => `${current}${snippet}`);
  };

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
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Viết Theo Từ Khóa</p>
          <h1 className="truncate text-xl font-bold text-gray-900">{editTitle || config.keyword}</h1>
          <p className="mt-1 text-xs text-gray-500">{config.keyword} · {currentWordCount.toLocaleString()} từ · Density {currentKeywordDensity.toFixed(2)}% · {statusMessage || status}</p>
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
          <button type="button" onClick={handleRestart} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Bắt đầu lại</button>
        </div>
      </div>

      <div ref={contentRef} className="hidden" dangerouslySetInnerHTML={{ __html: editorHtml }} />

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col bg-gray-50">
          {(streaming || banner) && (
            <div className="border-b border-gray-200 bg-white px-5 py-3">
              {streaming && (
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
              <div ref={editorShellRef} className="h-full" data-ttk-editor>
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
                html={editorHtml}
                keyword={config.keyword}
                secondaryKeywords={config.secondaryKeywords}
                title={editTitle}
                metaDescription={editMetaDescription}
                slug={activeSlug}
                minWordCount={Math.min(800, config.targetLength)}
                model={config.model}
                contentType={config.outlineMode}
                articleId={articleId || ''}
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

            {activeTab === 'images' && <ImagesTab imageOption={config.imageOption} />}
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

