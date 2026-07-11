'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import ModelPicker from '@/app/components/ModelPicker';
import { ECOMMERCE_TABS } from '@/lib/ecommerce-tools/core';
import { SUPPORTED_LANGUAGES } from '@/lib/shared/options';

type FieldValue = string | number | boolean | string[];

export interface EcommerceField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'rating' | 'checkboxes' | 'switch' | 'model' | 'language';
  placeholder?: string;
  rows?: number;
  min?: number;
  max?: number;
  options?: Array<{ value: string | number; label: string }>;
}

export type EcommerceToolKind = 'meta' | 'name' | 'description' | 'review' | 'faq';

interface ProductData {
  name: string;
  info: string;
  price?: string;
  rating?: string;
}

interface MetaTitle {
  text: string;
  copied: boolean;
}

interface NameVariant {
  name: string;
  style: string;
  reason: string;
  copied: boolean;
}

interface FaqItem {
  question: string;
  answer: string;
  faqType: string;
  copied: boolean;
}

interface EcommerceToolPageProps {
  kind: EcommerceToolKind;
  title: string;
  subtitle: string;
  endpoint: string;
  fetchUrlEndpoint: string;
  generateLabel: string;
  fields: EcommerceField[];
  defaultValues: Record<string, FieldValue>;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getString(value: FieldValue | undefined): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function getBoolean(value: FieldValue | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return Boolean(value);
}

function makeEventPayload(line: string): unknown | null {
  if (!line.startsWith('data: ')) return null;
  try {
    return JSON.parse(line.slice(6)) as unknown;
  } catch {
    return null;
  }
}

function sanitizeStructuredHtml(raw: string): string {
  return raw
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math)[^>]*\/?\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/\s+(href|src|xlink:href)\s*=\s*"[^"]*javascript:[^"]*"/gi, '')
    .replace(/\s+(href|src|xlink:href)\s*=\s*'[^']*javascript:[^']*'/gi, '')
    .replace(/\s+style\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+style\s*=\s*'[^']*'/gi, '');
}

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

const STOP_WORDS = new Set([
  'cho',
  'cua',
  'cung',
  'dang',
  'den',
  'gia',
  'hang',
  'loai',
  'mau',
  'nhieu',
  'san',
  'pham',
  'the',
  'va',
  'voi',
]);

const CTA_PATTERNS = [
  'chon',
  'dat hang',
  'dat mua',
  'gia tot',
  'kham pha',
  'lien he',
  'mua',
  'nhan',
  'so huu',
  'tham khao',
  'tu van',
  'xem',
];

function significantTokens(text: string): string[] {
  return Array.from(new Set(normalizeSearchText(text).match(/[a-z0-9]+/g) ?? []))
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function textContainsMeaningfulTerm(text: string, term: string): boolean {
  const normalizedText = normalizeSearchText(text);
  const normalizedTerm = normalizeSearchText(term).trim();
  if (!normalizedTerm) return false;
  if (normalizedText.includes(normalizedTerm)) return true;

  const titleTokens = new Set(significantTokens(text));
  const tokens = significantTokens(term);
  if (!tokens.length) return false;

  const matched = tokens.filter((token) => titleTokens.has(token)).length;
  return matched >= Math.min(2, tokens.length);
}

function hasCta(text: string): boolean {
  const normalizedText = normalizeSearchText(text);
  return CTA_PATTERNS.some((pattern) => normalizedText.includes(pattern));
}

function getTitleChecks(title: string, values: Record<string, FieldValue>) {
  const keyword = getString(values.productName);
  const brand = getString(values.brandName);

  return {
    keyword: textContainsMeaningfulTerm(title, keyword),
    brand: brand ? textContainsMeaningfulTerm(title, brand) : null,
    cta: hasCta(title),
  };
}

type CheckState = 'pass' | 'fail' | 'neutral';

function checkBadgeClasses(state: CheckState): string {
  if (state === 'pass') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (state === 'fail') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-gray-200 bg-gray-50 text-gray-500';
}

function styleBadgeClasses(style: string): string {
  const normalized = normalizeSearchText(style).trim();
  const classes: Record<string, string> = {
    creative: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
    descriptive: 'bg-sky-50 text-sky-700 ring-sky-200',
    emotional: 'bg-rose-50 text-rose-700 ring-rose-200',
    general: 'bg-blue-50 text-blue-700 ring-blue-200',
    localized: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    purchase: 'bg-green-50 text-green-700 ring-green-200',
    segmented: 'bg-amber-50 text-amber-700 ring-amber-200',
    seo: 'bg-blue-50 text-blue-700 ring-blue-200',
    short: 'bg-purple-50 text-purple-700 ring-purple-200',
    technical: 'bg-orange-50 text-orange-700 ring-orange-200',
  };

  return classes[normalized] ?? 'bg-gray-100 text-gray-600 ring-gray-200';
}

function splitReviewVerdict(text: string): { body: string; verdict: string } {
  const lines = text.split('\n');
  const verdictIndex = lines.findIndex((line) => {
    const normalized = normalizeSearchText(line)
      .replace(/^[\s#>*-]+/, '')
      .replace(/^\*+/, '')
      .trim();
    return normalized.startsWith('ket luan');
  });

  if (verdictIndex === -1) {
    return { body: text, verdict: '' };
  }

  const verdictFirstLine = lines[verdictIndex]
    .replace(/^[\s#>*-]*(?:\*\*)?\s*(?:Kết\s*luận|Ket\s*luan)\s*:?\s*(?:\*\*)?\s*/i, '')
    .replace(/\*\*$/g, '')
    .trim();

  return {
    body: lines.slice(0, verdictIndex).join('\n').trim(),
    verdict: [verdictFirstLine, ...lines.slice(verdictIndex + 1)].join('\n').trim(),
  };
}

function buildCopyText(params: {
  kind: EcommerceToolKind;
  titles: MetaTitle[];
  description: string;
  names: NameVariant[];
  textOutput: string;
  faqs: FaqItem[];
}) {
  if (params.kind === 'meta') {
    return [
      'TITLES:',
      ...params.titles.map((item, index) => `${index + 1}. ${item.text}`),
      '',
      'DESCRIPTION:',
      params.description,
    ].join('\n');
  }

  if (params.kind === 'name') {
    return params.names
      .map((item, index) => `${index + 1}. ${item.name} | ${item.style} | ${item.reason}`)
      .join('\n');
  }

  if (params.kind === 'faq') {
    return params.faqs
      .map((item, index) => `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`)
      .join('\n\n');
  }

  return params.textOutput;
}

export function EcommerceToolPage({
  kind,
  title,
  subtitle,
  endpoint,
  fetchUrlEndpoint,
  generateLabel,
  fields,
  defaultValues,
}: EcommerceToolPageProps) {
  const pathname = usePathname();
  const abortRef = useRef<AbortController | null>(null);
  const [values, setValues] = useState<Record<string, FieldValue>>(defaultValues);
  const [productUrl, setProductUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [copyAllLabel, setCopyAllLabel] = useState('Sao chép tất cả');
  const [copyHtmlLabel, setCopyHtmlLabel] = useState('Sao chép HTML');
  const [schemaCopyLabel, setSchemaCopyLabel] = useState('Sao chép JSON-LD');
  const [titles, setTitles] = useState<MetaTitle[]>([]);
  const [metaDescription, setMetaDescription] = useState('');
  const [names, setNames] = useState<NameVariant[]>([]);
  const [textOutput, setTextOutput] = useState('');
  const [finalWordCount, setFinalWordCount] = useState(0);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [faqSchema, setFaqSchema] = useState('');
  const [openFaqIndexes, setOpenFaqIndexes] = useState<number[]>([]);

  const outputText = useMemo(
    () => buildCopyText({ kind, titles, description: metaDescription, names, textOutput, faqs }),
    [faqs, kind, metaDescription, names, textOutput, titles],
  );

  function updateField(name: string, next: FieldValue) {
    setValues((prev) => ({ ...prev, [name]: next }));
  }

  function resetOutput() {
    setDone(false);
    setError('');
    setCopyAllLabel('Sao chép tất cả');
    setCopyHtmlLabel('Sao chép HTML');
    setSchemaCopyLabel('Sao chép JSON-LD');
    setTitles([]);
    setMetaDescription('');
    setNames([]);
    setTextOutput('');
    setFinalWordCount(0);
    setFaqs([]);
    setFaqSchema('');
    setOpenFaqIndexes([]);
  }

  function applyProductData(data: ProductData) {
    setValues((prev) => {
      const next = { ...prev };
      if ('productName' in next) next.productName = data.name;
      if ('productType' in next) next.productType = data.name;
      if ('productFeatures' in next) next.productFeatures = data.info;
      if ('specs' in next) next.specs = data.info;
      if ('keyFeatures' in next && !getString(next.keyFeatures)) next.keyFeatures = data.info;
      if ('keyBenefits' in next && !getString(next.keyBenefits)) next.keyBenefits = data.info;
      if ('pros' in next && data.rating && !getString(next.pros)) next.pros = `Điểm đánh giá nguồn: ${data.rating}`;
      return next;
    });
  }

  async function handleFetchUrl() {
    const url = productUrl.trim();
    if (!url) {
      setError('Nhập URL sản phẩm trước khi lấy dữ liệu.');
      return;
    }

    setScraping(true);
    setError('');

    try {
      const response = await fetch(fetchUrlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const payload = (await response.json()) as { success?: boolean; data?: ProductData; error?: string };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Không thể lấy thông tin từ URL.');
      }

      applyProductData(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể lấy thông tin từ URL.');
    } finally {
      setScraping(false);
    }
  }

  async function handleGenerate() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    resetOutput();
    setLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        const raw = await response.text();
        try {
          const parsed = JSON.parse(raw) as { message?: string; error?: string };
          throw new Error(parsed.message || parsed.error || raw);
        } catch {
          throw new Error(raw || 'Không thể tạo nội dung.');
        }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const dataLine = part
            .split('\n')
            .map((line) => line.trim())
            .find((line) => line.startsWith('data: '));
          if (!dataLine) continue;

          const payload = makeEventPayload(dataLine) as {
            type?: string;
            text?: string;
            index?: number;
            name?: string;
            style?: string;
            reason?: string;
            question?: string;
            answer?: string;
            faqType?: string;
            message?: string;
            wordCount?: number;
            schema?: string;
          } | null;

          if (!payload?.type) continue;

          if (payload.type === 'title' && payload.text) {
            setTitles((prev) => [...prev, { text: payload.text ?? '', copied: false }]);
          } else if (payload.type === 'desc') {
            setMetaDescription(payload.text ?? '');
          } else if (payload.type === 'name' && payload.name) {
            setNames((prev) => [
              ...prev,
              {
                name: payload.name ?? '',
                style: payload.style ?? 'descriptive',
                reason: payload.reason ?? '',
                copied: false,
              },
            ]);
          } else if (payload.type === 'chunk') {
            setTextOutput((prev) => prev + (payload.text ?? ''));
          } else if (payload.type === 'faq' && payload.question) {
            if (payload.index === 0) setOpenFaqIndexes([0]);
            setFaqs((prev) => [
              ...prev,
              {
                question: payload.question ?? '',
                answer: payload.answer ?? '',
                faqType: payload.faqType ?? 'general',
                copied: false,
              },
            ]);
          } else if (payload.type === 'done') {
            setDone(true);
            if (payload.wordCount) setFinalWordCount(payload.wordCount);
            if (payload.schema) setFaqSchema(payload.schema);
          } else if (payload.type === 'error') {
            setError(payload.message || 'AI trả về lỗi.');
          }
        }
      }
    } catch (requestError) {
      if ((requestError as Error).name !== 'AbortError') {
        setError(requestError instanceof Error ? requestError.message : 'Không thể tạo nội dung.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyText(text: string, onDone: () => void) {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
    onDone();
  }

  function toggleFaq(index: number) {
    setOpenFaqIndexes((prev) => (
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    ));
  }

  function renderField(field: EcommerceField) {
    const value = values[field.name];
    const label = (
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">
        {field.label}
      </label>
    );

    if (field.type === 'model') {
      return (
        <div key={field.name}>
          <ModelPicker value={getString(value)} onChange={(next) => updateField(field.name, next)} size="sm" label={field.label} />
        </div>
      );
    }

    if (field.type === 'language') {
      return (
        <div key={field.name}>
          {label}
          <select
            value={getString(value)}
            onChange={(event) => {
              const selected = event.target.value;
              const option = field.options?.find((item) => String(item.value) === selected);
              updateField(field.name, typeof option?.value === 'number' ? option.value : selected);
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SUPPORTED_LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.name} className="md:col-span-2">
          {label}
          <textarea
            value={getString(value)}
            onChange={(event) => updateField(field.name, event.target.value)}
            rows={field.rows ?? 5}
            placeholder={field.placeholder}
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.name}>
          {label}
          <select
            value={getString(value)}
            onChange={(event) => updateField(field.name, event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(field.options ?? []).map((item) => (
              <option key={String(item.value)} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === 'number') {
      return (
        <div key={field.name}>
          {label}
          <input
            type="number"
            min={field.min}
            max={field.max}
            value={Number(value ?? 0)}
            onChange={(event) => updateField(field.name, Number(event.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );
    }

    if (field.type === 'rating') {
      const current = Math.max(field.min ?? 1, Math.min(field.max ?? 5, Number(value ?? 0)));
      return (
        <div key={field.name}>
          {label}
          <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => updateField(field.name, rating)}
                className={`text-2xl leading-none transition-colors ${
                  rating <= current ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'
                }`}
                aria-label={`${rating} sao`}
              >
                ★
              </button>
            ))}
            <span className="ml-2 text-sm font-semibold text-gray-700">{current}/5</span>
          </div>
        </div>
      );
    }

    if (field.type === 'checkboxes') {
      const current = Array.isArray(value) ? value : [];
      return (
        <div key={field.name} className="md:col-span-2">
          {label}
          <div className="grid gap-2 sm:grid-cols-3">
            {(field.options ?? []).map((item) => {
              const itemValue = String(item.value);
              const checked = current.includes(itemValue);
              return (
                <label key={itemValue} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...current, itemValue]
                        : current.filter((entry) => entry !== itemValue);
                      updateField(field.name, next.length ? next : [itemValue]);
                    }}
                  />
                  <span>{item.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    if (field.type === 'switch') {
      const checked = getBoolean(value);
      return (
        <div
          key={field.name}
          className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 md:col-span-2"
        >
          <span>
            <span className="block text-xs font-bold uppercase tracking-wide text-gray-500">{field.label}</span>
            {field.placeholder && <span className="mt-1 block text-xs leading-5 text-gray-500">{field.placeholder}</span>}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={field.label}
            onClick={() => updateField(field.name, !checked)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              checked ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                checked ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      );
    }

    return (
      <div key={field.name}>
        {label}
        <input
          type="text"
          value={getString(value)}
          onChange={(event) => updateField(field.name, event.target.value)}
          placeholder={field.placeholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    );
  }

  const isStructuredDescription = kind === 'description' && getString(values.format) === 'structured';
  const structuredHtmlOutput = isStructuredDescription ? sanitizeStructuredHtml(textOutput) : '';

  function renderOutput() {
    if (kind === 'meta') {
      return (
        <div className="space-y-4">
          {titles.map((item, index) => {
            const checks = getTitleChecks(item.text, values);
            const badges: Array<{ label: string; state: CheckState }> = [
              { label: 'Keyword', state: checks.keyword ? 'pass' : 'fail' },
              { label: 'Brand', state: checks.brand == null ? 'neutral' : checks.brand ? 'pass' : 'fail' },
              { label: 'CTA', state: checks.cta ? 'pass' : 'fail' },
            ];

            return (
              <div key={`${item.text}-${index}`} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-400">Tiêu đề {index + 1}</p>
                    <p className="mt-1 text-base font-semibold text-gray-900">{item.text}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {badges.map((badge) => (
                        <span
                          key={badge.label}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold uppercase ${checkBadgeClasses(badge.state)}`}
                        >
                          <span>{badge.state === 'pass' ? '✓' : badge.state === 'fail' ? '!' : '-'}</span>
                          {badge.label}
                        </span>
                      ))}
                    </div>
                    <p className={`mt-2 text-xs ${item.text.length > 60 ? 'text-red-600' : item.text.length < 50 ? 'text-amber-600' : 'text-green-600'}`}>
                      {item.text.length} ký tự
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyText(item.text, () => {
                      setTitles((prev) => prev.map((entry, i) => (i === index ? { ...entry, copied: true } : entry)));
                      setTimeout(() => setTitles((prev) => prev.map((entry, i) => (i === index ? { ...entry, copied: false } : entry))), 1200);
                    })}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {item.copied ? 'Đã chép' : 'Sao chép'}
                  </button>
                </div>
              </div>
            );
          })}

          {metaDescription && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase text-blue-500">Mô tả meta</p>
              <p className="mt-1 text-sm leading-6 text-gray-800">{metaDescription}</p>
              <p className={`mt-2 text-xs ${metaDescription.length > 160 ? 'text-red-600' : 'text-green-700'}`}>
                {metaDescription.length} ký tự
              </p>
            </div>
          )}

          {(titles[0] || metaDescription) && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-bold uppercase text-gray-400">Xem trước SERP</p>
              <p className="mt-3 text-lg text-blue-700">{titles[0]?.text || title}</p>
              <p className="text-sm text-green-700">https://example.com/san-pham</p>
              <p className="mt-1 text-sm leading-6 text-gray-600">{metaDescription}</p>
            </div>
          )}
        </div>
      );
    }

    if (kind === 'name') {
      return (
        <div className="grid gap-3 lg:grid-cols-2">
          {names.map((item, index) => (
            <div key={`${item.name}-${index}`} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`rounded px-2 py-1 text-xs font-bold uppercase ring-1 ${styleBadgeClasses(item.style)}`}>{item.style}</span>
                  <h3 className="mt-2 text-base font-bold text-gray-900">{item.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{item.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyText(item.name, () => {
                    setNames((prev) => prev.map((entry, i) => (i === index ? { ...entry, copied: true } : entry)));
                    setTimeout(() => setNames((prev) => prev.map((entry, i) => (i === index ? { ...entry, copied: false } : entry))), 1200);
                  })}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {item.copied ? 'Đã chép' : 'Sao chép'}
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (kind === 'faq') {
      return (
        <div className="space-y-4">
          {faqs.map((item, index) => {
            const open = openFaqIndexes.includes(index);

            return (
              <div key={`${item.question}-${index}`} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={open}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className={`rounded px-2 py-1 text-xs font-bold uppercase ring-1 ${styleBadgeClasses(item.faqType)}`}>{item.faqType}</span>
                    <span className="mt-2 flex items-start gap-2">
                      <span className="text-base font-bold text-gray-900">Q{index + 1}: {item.question}</span>
                      <span className={`ml-auto text-lg leading-none text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyText(`Q: ${item.question}\nA: ${item.answer}`, () => {
                      setFaqs((prev) => prev.map((entry, i) => (i === index ? { ...entry, copied: true } : entry)));
                      setTimeout(() => setFaqs((prev) => prev.map((entry, i) => (i === index ? { ...entry, copied: false } : entry))), 1200);
                    })}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {item.copied ? 'Đã chép' : 'Sao chép'}
                  </button>
                </div>
                <div className={`grid transition-all duration-200 ${open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="border-t border-gray-100 pt-3 text-sm leading-6 text-gray-700">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    const reviewSections = kind === 'review' ? splitReviewVerdict(textOutput) : null;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase text-gray-400">Nội dung đã tạo</p>
          {(finalWordCount > 0 || textOutput) && (
            <span className="text-xs text-gray-500">
              {finalWordCount || wordCount(textOutput)} từ
            </span>
          )}
        </div>
        {kind === 'review' ? (
          <div className="space-y-4">
            {reviewSections?.body && (
              <div className="whitespace-pre-wrap text-sm leading-7 text-gray-800">{reviewSections.body}</div>
            )}
            {reviewSections?.verdict && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Kết luận</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-emerald-950">{reviewSections.verdict}</p>
              </div>
            )}
          </div>
        ) : (
          <div
            className={isStructuredDescription ? 'prose max-w-none text-sm leading-7 text-gray-800' : 'whitespace-pre-wrap text-sm leading-7 text-gray-800'}
            dangerouslySetInnerHTML={isStructuredDescription ? { __html: structuredHtmlOutput } : undefined}
          >
            {isStructuredDescription ? null : textOutput}
          </div>
        )}
      </div>
    );
  }

  const hasOutput = Boolean(titles.length || metaDescription || names.length || textOutput || faqs.length);

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="flex overflow-x-auto px-4">
          {ECOMMERCE_TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${
                  active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid w-full gap-6 p-6 xl:grid-cols-[430px_minmax(0,1fr)]">
        <section className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Công cụ Ecommerce nhanh</p>
            <h1 className="mt-1 text-2xl font-black text-gray-900">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">{subtitle}</p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Lấy thông tin từ URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={productUrl}
                onChange={(event) => setProductUrl(event.target.value)}
                placeholder="https://..."
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => void handleFetchUrl()}
                disabled={scraping}
                className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {scraping ? 'Đang lấy' : 'Lấy'}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {fields.map(renderField)}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Đang tạo...' : generateLabel}
            </button>
            {loading && (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                Dừng
              </button>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Đầu ra</p>
              <h2 className="mt-1 text-xl font-black text-gray-900">{done ? 'Đã tạo xong' : loading ? 'Đang tạo' : 'Kết quả'}</h2>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {isStructuredDescription && structuredHtmlOutput && (
                <button
                  type="button"
                  onClick={() => void copyText(structuredHtmlOutput, () => {
                    setCopyHtmlLabel('Đã sao chép');
                    setTimeout(() => setCopyHtmlLabel('Sao chép HTML'), 1200);
                  })}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {copyHtmlLabel}
                </button>
              )}
              {kind === 'faq' && faqSchema && (
                <button
                  type="button"
                  onClick={() => void copyText(faqSchema, () => {
                    setSchemaCopyLabel('Đã sao chép');
                    setTimeout(() => setSchemaCopyLabel('Sao chép JSON-LD'), 1200);
                  })}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {schemaCopyLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => void copyText(outputText, () => {
                  setCopyAllLabel('Đã sao chép');
                  setTimeout(() => setCopyAllLabel('Sao chép tất cả'), 1200);
                })}
                disabled={!hasOutput}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {copyAllLabel}
              </button>
            </div>
          </div>

          <div className="mt-5 min-h-[540px] rounded-lg bg-gray-50 p-4">
            {hasOutput ? (
              renderOutput()
            ) : (
              <div className="flex min-h-[500px] items-center justify-center rounded-lg border border-dashed border-gray-300 text-center text-sm text-gray-400">
                Kết quả sẽ hiển thị ở đây sau khi tạo.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
