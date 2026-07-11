'use client';

import AICheckPanel from '@/app/components/AICheckPanel';
import type { AiAssistCommand } from '@/components/editor/AiAssistPanel';
import { HumannessPanel } from '@/components/tinh-gon/HumannessPanel';
import { InternalLinkSuggest } from '@/components/tinh-gon/InternalLinkSuggest';
import { KeywordDensityBar } from '@/components/tinh-gon/KeywordDensityBar';
import type { SentenceTarget } from '@/lib/dom-sentences';
import type { AICheckResult } from '@/lib/humanness/types';
import { computeKeywordDensity, countWords } from '@/lib/tinh-gon/text';
import type { TinhGonDecision, TinhGonHumannessResult, TinhGonInternalLinkSuggestion } from '@/lib/tinh-gon/types';

type ReadinessPriority = 'high' | 'medium' | 'low';

interface PublishSignal {
  key: string;
  label: string;
  pass: boolean;
  detail: string;
  priority: ReadinessPriority;
}

export interface SeoCheckItem {
  label: string;
  pass: boolean;
  fixable?: boolean;
  detail?: string;
  group: 'basic' | 'advanced' | 'title';
}

export interface PublishReadiness {
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

function countLinks(html: string, internalDomain = 'noithatminhquan.vn') {
  const rawDomain = internalDomain.replace(/^www\./, '');
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]);
  const internal = hrefs.filter((href) => href.startsWith('/') || href.includes(rawDomain)).length;
  const external = hrefs.filter((href) => /^https?:\/\//i.test(href) && !href.includes(rawDomain)).length;
  return { internal, external, total: hrefs.length };
}

export function buildPublishReadiness(input: {
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

export function PublishReadinessCard({
  readiness,
  title = 'Sẵn sàng đăng',
}: {
  readiness: PublishReadiness;
  title?: string;
}) {
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
        <div
          className={`h-full rounded-full ${readiness.status === 'ready' ? 'bg-green-500' : readiness.status === 'blocked' ? 'bg-red-500' : 'bg-amber-500'}`}
          style={{ width: `${readiness.score}%` }}
        />
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

export function SeoTab({
  checks,
  score,
  keyword,
  secondaryKeywords,
  title,
  metaDescription,
  slug,
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
  checks: SeoCheckItem[];
  score: number;
  keyword: string;
  secondaryKeywords: string[];
  title: string;
  metaDescription: string;
  slug: string;
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

  const humannessBreakdown = useMemo(() => {
    if (humannessBreakdownData) {
      return [
        ['Ngôn ngữ tự nhiên', humannessBreakdownData.language_natural],
        ['Cấu trúc bài', humannessBreakdownData.structure],
        ['E-E-A-T', humannessBreakdownData.eeat_signals],
        ['Engagement', humannessBreakdownData.engagement],
      ] as const;
    }
    const scoreValue = humannessScore ?? 0;
    return [
      ['Ngôn ngữ tự nhiên', Math.round(scoreValue * 0.25)],
      ['Cấu trúc bài', Math.round(scoreValue * 0.25)],
      ['E-E-A-T', Math.round(scoreValue * 0.24)],
      ['Engagement', Math.round(scoreValue * 0.26)],
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
          <SeoScoreBar score={score} />
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
                }`}>{siteUrl} › {slug}</p>
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
          const groupItems = checks
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

export function KeywordAiTab({
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
        <p className="mt-1 text-xs text-gray-400">
          {hasSelection ? `Đã chọn ${selectedText.length} ký tự để AI chỉnh.` : 'Bôi đen đoạn văn ngay trong editor bên trái rồi chọn lệnh AI Edit.'}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {AI_COMMANDS.map((command) => (
            <button
              key={command.value}
              type="button"
              onClick={() => onAiEdit(command.value)}
              disabled={!hasSelection || aiEditing}
              className="rounded-lg border border-blue-200 px-3 py-2 text-xs text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
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
            onApplyFix={onApplyFix}
            storageKey={aiCheckStorageKey}
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

export function QualityTab({
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
          <p className="text-3xl font-black text-gray-300">-</p>
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

export function LinksTab({
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

export function ImagesTab({ imageOption }: { imageOption: string }) {
  return (
    <div className="p-4">
      <div data-image-option={imageOption} className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
        <p className="text-sm font-bold text-gray-700">Thư viện hình ảnh</p>
        <p className="mt-1 text-xs text-gray-400">Đang phát triển</p>
      </div>
    </div>
  );
}
