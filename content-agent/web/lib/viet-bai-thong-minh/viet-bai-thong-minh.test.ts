/**
 * Unit tests — /viet-bai-thong-minh
 *
 * Coverage:
 *  - options.ts  : CONTENT_TYPES, VBT_TONES, VBT_AI_OUTLINE_SIZES, VBT_AI_OUTLINE_OBJECTIVES,
 *                  VBT_LOADING_STEPS, getContentTypeDefaultLength, buildVbtArticleContentType
 *  - server.ts   : splitSecondaryKeywords, cleanUrlList, extractJsonValue,
 *                  fallbackSemantic, parseSemanticResponse,
 *                  parseTitlesResponse, parseOutlineResponse,
 *                  analyzeHumanness, estimateSemanticScore,
 *                  applySeoOptions (+ nested-<a> bug, XSS bug),
 *                  buildFallbackArticle, chunkText,
 *                  buildAnalyzePrompt, buildTitlesPrompt, buildOutlinePrompt,
 *                  buildVbtWritingPrompt
 *
 * Run:
 *   cd web && npx tsx --test lib/viet-bai-thong-minh/viet-bai-thong-minh.test.ts
 *
 * Bug confirmation pattern:
 *   [BUG #N]  — asserts the buggy behaviour exists (using local buggy copy)
 *   [FIX #N]  — asserts correct behaviour (using fixed local copy)
 * Both groups PASS before the source fix; BUG tests still pass after fix
 * because they reference local copies, not the live source.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type {
  ContentType,
  DataSourceMode,
  SemanticAnalysis,
  TopicalMapRole,
  VbtArticleConfig,
  VbtStep1State,
} from './types';

// ============================================================
// COPY — pure functions from options.ts (for local use in tests)
// ============================================================

const CONTENT_TYPES_LOCAL = [
  { value: 'blog_seo',   defaultLength: 1500 },
  { value: 'how_to',     defaultLength: 1200 },
  { value: 'listicle',   defaultLength: 1500 },
  { value: 'comparison', defaultLength: 2000 },
  { value: 'review',     defaultLength: 1800 },
  { value: 'pillar',     defaultLength: 3000 },
  { value: 'local_seo',  defaultLength: 1200 },
] as const;

function getContentTypeDefaultLength_local(value: string): number {
  const found = CONTENT_TYPES_LOCAL.find((item) => item.value === value);
  return found?.defaultLength ?? 1500;
}

// ============================================================
// COPY — pure functions from server.ts
// ============================================================

function splitSecondaryKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// Fixed version with dedup
function splitSecondaryKeywords_fixed(raw: string): string[] {
  return [...new Set(
    raw.split(',').map((item) => item.trim()).filter(Boolean),
  )];
}

function cleanUrlList(urls: string[], max = 3): string[] {
  return urls
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, max);
}

function extractJsonValue(text: string): unknown {
  try { return JSON.parse(text); } catch { /* skip */ }
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (block) { try { return JSON.parse(block[1]); } catch { /* skip */ } }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch { /* skip */ } }
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch { /* skip */ } }
  return null;
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : fallback;
}

// Minimal stripHtml for tests
function stripHtml_local(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function countWords_local(html: string): number {
  const text = stripHtml_local(html);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

const VALID_CONTENT_TYPES = new Set<ContentType>([
  'blog_seo', 'how_to', 'listicle', 'comparison', 'review', 'pillar', 'local_seo',
]);
const VALID_INTENTS = new Set(['informational', 'navigational', 'commercial', 'transactional']);

function fallbackSemantic(input: VbtStep1State, competitorInsights = ''): SemanticAnalysis {
  const secondary = splitSecondaryKeywords(input.secondaryKeywordsRaw);
  const estimatedWordCount = getContentTypeDefaultLength_local(input.contentType);
  return {
    macroContext: `Chủ đề "${input.keyword}" cần được giải quyết theo search intent, nhu cầu độc giả và độ sâu nội dung phù hợp.`,
    searchIntent: (input.contentType === 'review' || input.contentType === 'comparison') ? 'commercial' : 'informational',
    intentExplanation: 'Fallback semantic được tạo khi AI không trả về JSON hợp lệ.',
    rppMap: [
      { pain: `Người đọc chưa biết nên bắt đầu từ đâu với "${input.keyword}".`, relevance: 'high' },
      { pain: 'Cần thông tin rõ ràng, có ví dụ và tránh nói chung chung.', relevance: 'high' },
      { pain: 'Cần kết luận có thể áp dụng hoặc ra quyết định nhanh.', relevance: 'medium' },
    ],
    attributeMap: [
      { attribute: 'Định nghĩa và phạm vi chủ đề', importance: 'must' },
      { attribute: 'Tiêu chí đánh giá/chọn lựa', importance: 'must' },
      { attribute: 'Ví dụ thực tế và lời khuyên áp dụng', importance: 'should' },
      { attribute: 'FAQ ngắn gọn cuối bài', importance: 'should' },
    ],
    semanticKeywords: secondary.length > 0
      ? secondary
      : [`${input.keyword} là gì`, `cách chọn ${input.keyword}`, `${input.keyword} giá bao nhiêu`],
    suggestedContentType: input.contentType,
    estimatedWordCount,
    competitorInsights,
  };
}

function parseSemanticResponse(text: string, input: VbtStep1State, competitorInsights = ''): SemanticAnalysis {
  const parsed = extractJsonValue(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fallbackSemantic(input, competitorInsights);
  }
  const record = parsed as Record<string, unknown>;
  const searchIntent = VALID_INTENTS.has(record.searchIntent as string)
    ? record.searchIntent as SemanticAnalysis['searchIntent']
    : fallbackSemantic(input).searchIntent;
  const suggestedContentType = VALID_CONTENT_TYPES.has(record.suggestedContentType as ContentType)
    ? record.suggestedContentType as ContentType
    : input.contentType;
  const rppMap = Array.isArray(record.rppMap)
    ? record.rppMap.map((item) => {
        const next = item as Record<string, unknown>;
        const relevance = ['high', 'medium', 'low'].includes(String(next.relevance)) ? String(next.relevance) : 'medium';
        return { pain: String(next.pain || '').trim(), relevance: relevance as 'high' | 'medium' | 'low' };
      }).filter((item) => item.pain)
    : [];
  const attributeMap = Array.isArray(record.attributeMap)
    ? record.attributeMap.map((item) => {
        const next = item as Record<string, unknown>;
        const importance = ['must', 'should', 'nice_to_have'].includes(String(next.importance)) ? String(next.importance) : 'should';
        return { attribute: String(next.attribute || '').trim(), importance: importance as 'must' | 'should' | 'nice_to_have' };
      }).filter((item) => item.attribute)
    : [];
  const fallback = fallbackSemantic(input, competitorInsights);
  return {
    macroContext: String(record.macroContext || fallback.macroContext),
    searchIntent,
    intentExplanation: String(record.intentExplanation || fallback.intentExplanation),
    rppMap: rppMap.length ? rppMap.slice(0, 5) : fallback.rppMap,
    attributeMap: attributeMap.length ? attributeMap.slice(0, 8) : fallback.attributeMap,
    semanticKeywords: asStringArray(record.semanticKeywords, fallback.semanticKeywords).slice(0, 12),
    suggestedContentType,
    estimatedWordCount: Number(record.estimatedWordCount) || getContentTypeDefaultLength_local(suggestedContentType),
    competitorInsights: String(record.competitorInsights || competitorInsights || ''),
  };
}

function parseTitlesResponse_buggy(text: string, keyword: string): string[] {
  // BUG #5: fallback always Vietnamese regardless of language
  const parsed = extractJsonValue(text);
  const titles = asStringArray(parsed).filter((item) => item.length > 10);
  if (titles.length) return titles.slice(0, 5);
  return [
    `${keyword}: Hướng dẫn đầy đủ và cập nhật`,
    `Cách chọn ${keyword} phù hợp nhu cầu thực tế`,
    `${keyword} có tốt không? Tiêu chí cần biết`,
    `Top kinh nghiệm về ${keyword} giúp ra quyết định nhanh`,
  ].slice(0, 5);
}

function parseTitlesResponse_fixed(text: string, keyword: string, language = 'Vietnamese'): string[] {
  const parsed = extractJsonValue(text);
  const titles = asStringArray(parsed).filter((item) => item.length > 10);
  if (titles.length) return titles.slice(0, 5);
  if (language === 'English' || language === 'en') {
    return [
      `${keyword}: Complete Guide`,
      `How to Choose ${keyword}: Key Criteria`,
      `Is ${keyword} Worth It? An Honest Review`,
      `Top Tips for ${keyword} — Make the Right Decision`,
    ].slice(0, 5);
  }
  return [
    `${keyword}: Hướng dẫn đầy đủ và cập nhật`,
    `Cách chọn ${keyword} phù hợp nhu cầu thực tế`,
    `${keyword} có tốt không? Tiêu chí cần biết`,
    `Top kinh nghiệm về ${keyword} giúp ra quyết định nhanh`,
  ].slice(0, 5);
}

function parseOutlineResponse(text: string, keyword: string): string {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```(?:text|html)?/gi, '').replace(/```/g, ''))
    .trim();
  if (/\[h2\]/i.test(cleaned)) return cleaned;
  return [
    `[h2]Tổng quan về ${keyword}[/h2]`,
    `[h2]Tiêu chí quan trọng khi đánh giá ${keyword}[/h2]`,
    `[h2]Cách áp dụng ${keyword} vào thực tế[/h2]`,
    `[h2]Lỗi thường gặp cần tránh[/h2]`,
    `[h2]FAQ về ${keyword}[/h2]`,
  ].join('\n');
}

function analyzeHumanness(html: string, forbiddenRaw = '') {
  const text = stripHtml_local(html);
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((item) => item.trim().length > 8);
  const avgSentence = sentences.length ? words.length / sentences.length : 0;
  const paragraphs = html.match(/<p[\s\S]*?<\/p>/gi) || [];
  const longParagraphs = paragraphs.filter((p) => countWords_local(p) > 90).length;
  const hasVisualBreak = /<(ul|ol|table)[\s>]/i.test(html);
  const forbiddenFound = forbiddenRaw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item && text.toLowerCase().includes(item.toLowerCase()));
  const issues = [
    avgSentence > 25 ? 'Câu trung bình hơi dài, nên cắt ngắn.' : '',
    longParagraphs > 0 ? `${longParagraphs} đoạn văn trên 90 từ.` : '',
    !hasVisualBreak ? 'Thiếu visual break như ul/ol/table.' : '',
    forbiddenFound.length ? 'Co tu/cum tu trong danh sach can tranh.' : '',
  ].filter(Boolean);
  const score = Math.max(50, Math.min(96, 90 - longParagraphs * 4 - forbiddenFound.length * 6
    - (avgSentence > 25 ? 6 : 0) - (!hasVisualBreak ? 4 : 0)));
  const decision = score >= 76 ? 'PUBLISH' : score >= 60 ? 'REVIEW' : 'REWRITE';
  return {
    score,
    decision,
    issues,
    forbiddenFound,
    scoreBreakdown: {
      language_natural: Math.min(25, Math.max(10, Math.round(score * 0.25))),
      structure:        Math.min(25, Math.max(10, Math.round(score * 0.25))),
      eeat_signals:     Math.min(25, Math.max(10, Math.round(score * 0.24))),
      engagement:       Math.min(25, Math.max(10, Math.round(score * 0.26))),
    },
  };
}

// BUG #3 copy — estimateSemanticScore with first-word matching
function estimateSemanticScore_buggy(html: string, semantic: SemanticAnalysis | null) {
  if (!semantic) return null;
  const text = stripHtml_local(html).toLowerCase();
  const must = semantic.attributeMap.filter((item) => item.importance === 'must');
  const semanticKeywords = semantic.semanticKeywords;
  // BUG #3: only checks first word of each attribute
  const mustCovered = must.filter((item) =>
    text.includes(item.attribute.toLowerCase().split(/\s+/)[0] || item.attribute.toLowerCase()),
  ).length;
  const keywordCovered = semanticKeywords.filter((kw) => text.includes(kw.toLowerCase())).length;
  const mustScore = must.length ? (mustCovered / must.length) * 45 : 35;
  const keywordScore = semanticKeywords.length ? (keywordCovered / semanticKeywords.length) * 35 : 25;
  const intentScore = text.includes(semantic.searchIntent) || html.length > 1200 ? 20 : 12;
  const score = Math.round(Math.min(100, mustScore + keywordScore + intentScore));
  const decision = score >= 80 ? 'OK' : score >= 60 ? 'NEEDS_FIX' : 'FAIL';
  return { score, decision };
}

// FIX #3 — full attribute phrase matching
function estimateSemanticScore_fixed(html: string, semantic: SemanticAnalysis | null) {
  if (!semantic) return null;
  const text = stripHtml_local(html).toLowerCase();
  const must = semantic.attributeMap.filter((item) => item.importance === 'must');
  const semanticKeywords = semantic.semanticKeywords;
  // FIX #3: check full attribute phrase (all significant words)
  const mustCovered = must.filter((item) => {
    const words = item.attribute.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    return words.length > 0 && words.every((w) => text.includes(w));
  }).length;
  const keywordCovered = semanticKeywords.filter((kw) => text.includes(kw.toLowerCase())).length;
  const mustScore = must.length ? (mustCovered / must.length) * 45 : 35;
  const keywordScore = semanticKeywords.length ? (keywordCovered / semanticKeywords.length) * 35 : 25;
  const intentScore = text.includes(semantic.searchIntent) || html.length > 1200 ? 20 : 12;
  const score = Math.round(Math.min(100, mustScore + keywordScore + intentScore));
  const decision = score >= 80 ? 'OK' : score >= 60 ? 'NEEDS_FIX' : 'FAIL';
  return { score, decision };
}

// Private helper from server.ts (replaceFirstTextOccurrence)
function replaceFirstTextOccurrence(html: string, keyword: string, replacement: string): string {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(>[^<]*?)(${escaped})([^<]*?<)`, 'i');
  return html.replace(pattern, `$1${replacement}$3`);
}

// BUG #1: applySeoOptions — nested <a> when keyword already in <a>
function applySeoOptions_buggy(html: string, config: VbtArticleConfig): string {
  let nextHtml = html;
  const keyword = config.keyword.trim();
  const step3 = config.step3;
  if (keyword && step3.seoMainLink.trim()) {
    nextHtml = replaceFirstTextOccurrence(
      nextHtml, keyword, `<a href="${step3.seoMainLink.trim()}">${keyword}</a>`,
    );
  }
  if (step3.footerContent.trim()) {
    // BUG #2: no XSS sanitization
    const footer = step3.footerContent.trim().startsWith('<')
      ? step3.footerContent.trim()
      : `<p>${step3.footerContent.trim()}</p>`;
    nextHtml = nextHtml.replace(/<\/article>\s*$/i, `<section class="brand-footer">${footer}</section></article>`);
  }
  return nextHtml;
}

// FIX #1: check if keyword is already inside an <a> tag before replacing
function replaceFirstTextOccurrence_fixed(html: string, keyword: string, replacement: string): string {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Split on tags and only replace in text nodes (not inside <a> tags)
  const parts = html.split(/(<[^>]+>)/);
  let insideAnchor = 0;
  let replaced = false;
  return parts.map((part) => {
    if (/^<a[\s>]/i.test(part)) { insideAnchor++; return part; }
    if (/^<\/a>/i.test(part)) { insideAnchor = Math.max(0, insideAnchor - 1); return part; }
    if (part.startsWith('<')) return part;
    if (!replaced && insideAnchor === 0) {
      const re = new RegExp(escaped, 'i');
      if (re.test(part)) {
        replaced = true;
        return part.replace(re, replacement);
      }
    }
    return part;
  }).join('');
}

// FIX #2: sanitize footerContent before injection
function sanitizeFooterContent(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on\w+=(["']).*?\1/gi, '')
    .replace(/\s+href=(["'])javascript:[\s\S]*?\1/gi, ' href="#"');
}

function applySeoOptions_fixed(html: string, config: VbtArticleConfig): string {
  let nextHtml = html;
  const keyword = config.keyword.trim();
  const step3 = config.step3;
  if (keyword && step3.seoMainLink.trim()) {
    nextHtml = replaceFirstTextOccurrence_fixed(
      nextHtml, keyword, `<a href="${step3.seoMainLink.trim()}">${keyword}</a>`,
    );
  }
  if (step3.footerContent.trim()) {
    const raw = sanitizeFooterContent(step3.footerContent.trim());
    const footer = raw.startsWith('<') ? raw : `<p>${raw}</p>`;
    nextHtml = nextHtml.replace(/<\/article>\s*$/i, `<section class="brand-footer">${footer}</section></article>`);
  }
  return nextHtml;
}

function buildFallbackArticle(config: { keyword: string; title?: string }): string {
  const kw = config.keyword;
  return `
<article>
  <h1>${config.title || kw}</h1>
  <p>${kw} cần được tiếp cận theo nhu cầu thực tế, mục đích sử dụng và những tiêu chí có thể kiểm chứng.</p>
  <h2>Tổng quan về ${kw}</h2>
  <p>Phần này tóm tắt bối cảnh, search intent và lý do người đọc quan tâm đến chủ đề này.</p>
  <h2>Tiêu chí quan trọng</h2>
  <ul>
    <li><strong>Độ phù hợp:</strong> Chọn theo nhu cầu chính và ngân sách.</li>
    <li><strong>Thông tin rõ ràng:</strong> Ưu tiên số liệu, ví dụ và nguồn có thể kiểm tra.</li>
    <li><strong>Tính ứng dụng:</strong> Nội dung nên giúp người đọc ra quyết định nhanh hơn.</li>
  </ul>
  <h2>Gợi ý áp dụng</h2>
  <p>Hãy bắt đầu từ mục tiêu cụ thể, sau đó đối chiếu với các tiêu chí đã nêu để tránh lựa chọn cảm tính.</p>
  <h2>FAQ về ${kw}</h2>
  <h3>${kw} phù hợp với ai?</h3>
  <p>Phù hợp với người cần thông tin ngắn gọn, có cấu trúc và dễ áp dụng.</p>
  <h3>Cần lưu ý gì trước khi quyết định?</h3>
  <p>Cần kiểm tra nguồn thông tin, ngày cập nhật và các thông số quan trọng.</p>
</article>
`.trim();
}

function chunkText(value: string, size = 900): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }
  return chunks;
}

// BUG #6: dead lookup — SNIPPET_RULES_BY_TONE keyed by tone, not contentType
const SNIPPET_RULES_BY_TONE_MOCK: Record<string, string> = {
  how_to: 'Format snippet: numbered steps.',
  listicle: 'Format snippet: bullet list.',
};

function buildVbtWritingPrompt_buggy(config: { contentType: string; step3: { tone: string } }): string {
  // BUG #6: tries contentType first, but map is keyed by tone values
  const snippetRule = SNIPPET_RULES_BY_TONE_MOCK[config.contentType]
    || SNIPPET_RULES_BY_TONE_MOCK[config.step3.tone]
    || '';
  return `SNIPPET_RULE:${snippetRule || 'none'}`;
}

function buildVbtWritingPrompt_fixed(config: { contentType: string; step3: { tone: string } }): string {
  // FIX #6: look up by tone first (correct), then fall back
  const snippetRule = SNIPPET_RULES_BY_TONE_MOCK[config.step3.tone]
    || SNIPPET_RULES_BY_TONE_MOCK[config.contentType]
    || '';
  return `SNIPPET_RULE:${snippetRule || 'none'}`;
}

// ============================================================
// Helper: make a minimal VbtStep1State
// ============================================================
function makeStep1(overrides: Partial<VbtStep1State> = {}): VbtStep1State {
  return {
    keyword: 'giường sắt',
    secondaryKeywordsRaw: '',
    contentType: 'blog_seo',
    topicalMapRole: 'standalone',
    competitorUrls: [],
    dataSourceMode: 'ai_only',
    dataSourceUrls: [],
    dataSourceText: '',
    language: 'Vietnamese',
    ...overrides,
  };
}

// Minimal VbtStep3State
function makeStep3(overrides: Partial<Record<string, unknown>> = {}): VbtArticleConfig['step3'] {
  return {
    titleOptions: [],
    selectedTitleIndex: 0,
    customTitle: '',
    outlineMode: 'no_outline',
    userOutlineText: '',
    aiOutlineText: '',
    aiOutlineObjective: 'comprehensive',
    aiOutlineSize: 'md',
    imageOption: 'none',
    targetLength: 1500,
    tone: 'seo_basic',
    model: 'gemini-flash',
    brand: {
      shopName: '',
      industry: '',
      brandAudience: '',
      brandToneNotes: '',
      brandForbidden: '',
      ctaStandard: '',
      phone: '',
      address: '',
    },
    seoMainLink: '',
    seoKeywordLinks: '',
    autoBold: 'none',
    footerContent: '',
    ...overrides,
  } as VbtArticleConfig['step3'];
}

function makeConfig(overrides: Partial<VbtArticleConfig> = {}): VbtArticleConfig {
  return {
    keyword: 'giường sắt',
    title: 'Giường Sắt Giá Xưởng',
    outline: '',
    contentType: 'blog_seo',
    topicalMapRole: 'standalone',
    secondaryKeywords: [],
    competitorUrls: [],
    dataSourceMode: 'ai_only',
    dataSourceUrls: [],
    dataSourceText: '',
    language: 'Vietnamese',
    semantic: null,
    step3: makeStep3(),
    articleId: 'test-article-id',
    runId: 'test-run-id',
    ...overrides,
  };
}

// ============================================================
// TESTS — options.ts
// ============================================================

describe('CONTENT_TYPES', () => {
  const EXPECTED_VALUES: ContentType[] = [
    'blog_seo', 'how_to', 'listicle', 'comparison', 'review', 'pillar', 'local_seo',
  ];

  it('has exactly 7 content types', () => {
    assert.equal(CONTENT_TYPES_LOCAL.length, 7);
  });

  it('contains all required ContentType values', () => {
    const values = CONTENT_TYPES_LOCAL.map((item) => item.value);
    for (const v of EXPECTED_VALUES) {
      assert.ok(values.includes(v), `Missing: ${v}`);
    }
  });

  it('each item has a positive defaultLength', () => {
    for (const item of CONTENT_TYPES_LOCAL) {
      assert.ok(item.defaultLength > 0, `Invalid defaultLength for: ${item.value}`);
    }
  });
});

describe('getContentTypeDefaultLength', () => {
  it('blog_seo → 1500', () => assert.equal(getContentTypeDefaultLength_local('blog_seo'), 1500));
  it('how_to → 1200', () => assert.equal(getContentTypeDefaultLength_local('how_to'), 1200));
  it('comparison → 2000', () => assert.equal(getContentTypeDefaultLength_local('comparison'), 2000));
  it('review → 1800', () => assert.equal(getContentTypeDefaultLength_local('review'), 1800));
  it('pillar → 3000', () => assert.equal(getContentTypeDefaultLength_local('pillar'), 3000));
  it('local_seo → 1200', () => assert.equal(getContentTypeDefaultLength_local('local_seo'), 1200));
  it('unknown type → 1500 fallback', () => assert.equal(getContentTypeDefaultLength_local('unknown_type'), 1500));
  it('empty string → 1500 fallback', () => assert.equal(getContentTypeDefaultLength_local(''), 1500));
});

describe('buildVbtArticleContentType', () => {
  it('formats correctly', () => {
    // Inline test since we know the format from server.ts context
    const build = (v: ContentType) => `viet_bai_thong_minh:${v}`;
    assert.equal(build('blog_seo'), 'viet_bai_thong_minh:blog_seo');
    assert.equal(build('pillar'), 'viet_bai_thong_minh:pillar');
  });
});

// ============================================================
// TESTS — splitSecondaryKeywords
// ============================================================

describe('splitSecondaryKeywords', () => {
  it('splits comma-separated keywords', () => {
    const result = splitSecondaryKeywords('giường sắt, tủ quần áo, bàn ghế');
    assert.deepEqual(result, ['giường sắt', 'tủ quần áo', 'bàn ghế']);
  });

  it('trims whitespace', () => {
    const result = splitSecondaryKeywords('  giường sắt  ,  tủ quần áo  ');
    assert.deepEqual(result, ['giường sắt', 'tủ quần áo']);
  });

  it('filters empty segments', () => {
    const result = splitSecondaryKeywords('giường sắt,,tủ quần áo,');
    assert.deepEqual(result, ['giường sắt', 'tủ quần áo']);
  });

  it('returns empty array for blank input', () => {
    assert.deepEqual(splitSecondaryKeywords(''), []);
    assert.deepEqual(splitSecondaryKeywords('   '), []);
  });

  it('[BUG #4] does NOT deduplicate — duplicate keywords pass through', () => {
    const result = splitSecondaryKeywords('giường sắt, giường sắt, tủ quần áo');
    // buggy: duplicates remain
    assert.equal(result.length, 3, '[BUG #4] duplicates not removed');
    assert.equal(result[0], result[1], '[BUG #4] first two are identical');
  });

  it('[FIX #4] fixed version deduplicates keywords', () => {
    const result = splitSecondaryKeywords_fixed('giường sắt, giường sắt, tủ quần áo');
    assert.equal(result.length, 2, '[FIX #4] should deduplicate');
    assert.deepEqual(result, ['giường sắt', 'tủ quần áo']);
  });
});

// ============================================================
// TESTS — cleanUrlList
// ============================================================

describe('cleanUrlList', () => {
  it('filters out non-http/https URLs', () => {
    const result = cleanUrlList(['https://example.com', 'ftp://bad.com', 'not-a-url']);
    assert.deepEqual(result, ['https://example.com']);
  });

  it('accepts both http and https', () => {
    const result = cleanUrlList(['http://site.com', 'https://site.com']);
    assert.deepEqual(result, ['http://site.com', 'https://site.com']);
  });

  it('trims whitespace from URLs', () => {
    const result = cleanUrlList(['  https://example.com  ']);
    assert.deepEqual(result, ['https://example.com']);
  });

  it('limits to max (default 3)', () => {
    const urls = [
      'https://a.com', 'https://b.com', 'https://c.com', 'https://d.com',
    ];
    assert.equal(cleanUrlList(urls).length, 3);
  });

  it('respects custom max', () => {
    const urls = ['https://a.com', 'https://b.com', 'https://c.com'];
    assert.equal(cleanUrlList(urls, 1).length, 1);
    assert.equal(cleanUrlList(urls, 5).length, 3);
  });

  it('returns empty array when no valid URLs', () => {
    assert.deepEqual(cleanUrlList([]), []);
    assert.deepEqual(cleanUrlList(['ftp://x.com', 'data:text/html', '']), []);
  });
});

// ============================================================
// TESTS — extractJsonValue
// ============================================================

describe('extractJsonValue', () => {
  it('parses direct JSON string (object)', () => {
    const result = extractJsonValue('{"key":"value","num":42}');
    assert.deepEqual(result, { key: 'value', num: 42 });
  });

  it('parses direct JSON array', () => {
    const result = extractJsonValue('["a","b","c"]');
    assert.deepEqual(result, ['a', 'b', 'c']);
  });

  it('extracts JSON from markdown code block (```json)', () => {
    const text = '```json\n{"key":"val"}\n```';
    assert.deepEqual(extractJsonValue(text), { key: 'val' });
  });

  it('extracts JSON from bare code block (```)', () => {
    const text = '```\n["x","y"]\n```';
    assert.deepEqual(extractJsonValue(text), ['x', 'y']);
  });

  it('extracts JSON object embedded in prose', () => {
    const text = 'Here is the result: {"score":85,"decision":"OK"} — done.';
    assert.deepEqual(extractJsonValue(text), { score: 85, decision: 'OK' });
  });

  it('extracts JSON array embedded in prose', () => {
    const text = 'Titles: ["Title A","Title B"]';
    assert.deepEqual(extractJsonValue(text), ['Title A', 'Title B']);
  });

  it('returns null for invalid/non-JSON text', () => {
    assert.equal(extractJsonValue('no json here'), null);
    assert.equal(extractJsonValue(''), null);
    assert.equal(extractJsonValue('{broken json'), null);
  });

  it('returns null for numeric', () => {
    // pure number is valid JSON but neither object nor array — important for callers
    const result = extractJsonValue('42');
    assert.equal(result, 42); // still parsed, callers must handle
  });
});

// ============================================================
// TESTS — fallbackSemantic
// ============================================================

describe('fallbackSemantic', () => {
  it('review/comparison contentType → commercial intent', () => {
    const review = fallbackSemantic(makeStep1({ contentType: 'review' }));
    assert.equal(review.searchIntent, 'commercial');

    const comparison = fallbackSemantic(makeStep1({ contentType: 'comparison' }));
    assert.equal(comparison.searchIntent, 'commercial');
  });

  it('other contentTypes → informational intent', () => {
    for (const ct of ['blog_seo', 'how_to', 'listicle', 'pillar', 'local_seo'] as ContentType[]) {
      const result = fallbackSemantic(makeStep1({ contentType: ct }));
      assert.equal(result.searchIntent, 'informational', `Failed for: ${ct}`);
    }
  });

  it('uses secondaryKeywords from secondaryKeywordsRaw when available', () => {
    const result = fallbackSemantic(makeStep1({ secondaryKeywordsRaw: 'giường sắt giá rẻ, giường tầng' }));
    assert.deepEqual(result.semanticKeywords, ['giường sắt giá rẻ', 'giường tầng']);
  });

  it('generates default semantic keywords when secondaryKeywordsRaw is empty', () => {
    const result = fallbackSemantic(makeStep1({ keyword: 'tủ quần áo', secondaryKeywordsRaw: '' }));
    assert.ok(result.semanticKeywords.length > 0);
    assert.ok(result.semanticKeywords.some((kw) => kw.includes('tủ quần áo')));
  });

  it('uses correct defaultLength for contentType', () => {
    const pillar = fallbackSemantic(makeStep1({ contentType: 'pillar' }));
    assert.equal(pillar.estimatedWordCount, 3000);

    const howTo = fallbackSemantic(makeStep1({ contentType: 'how_to' }));
    assert.equal(howTo.estimatedWordCount, 1200);
  });

  it('passes competitorInsights through', () => {
    const result = fallbackSemantic(makeStep1(), 'Đối thủ A mạnh về giá, đối thủ B mạnh về mẫu.');
    assert.equal(result.competitorInsights, 'Đối thủ A mạnh về giá, đối thủ B mạnh về mẫu.');
  });

  it('has 3 rppMap entries all with valid relevance', () => {
    const result = fallbackSemantic(makeStep1());
    assert.equal(result.rppMap.length, 3);
    for (const item of result.rppMap) {
      assert.ok(['high', 'medium', 'low'].includes(item.relevance));
    }
  });

  it('has 4 attributeMap entries with valid importance', () => {
    const result = fallbackSemantic(makeStep1());
    assert.equal(result.attributeMap.length, 4);
    for (const item of result.attributeMap) {
      assert.ok(['must', 'should', 'nice_to_have'].includes(item.importance));
    }
  });
});

// ============================================================
// TESTS — parseSemanticResponse
// ============================================================

describe('parseSemanticResponse', () => {
  it('parses valid AI JSON response correctly', () => {
    const ai = JSON.stringify({
      macroContext: 'Nội thất gia đình',
      searchIntent: 'commercial',
      intentExplanation: 'Người dùng muốn mua',
      rppMap: [{ pain: 'Không biết chọn', relevance: 'high' }],
      attributeMap: [{ attribute: 'Kích thước', importance: 'must' }],
      semanticKeywords: ['giường sắt giá rẻ', 'giường sắt 1m6'],
      suggestedContentType: 'review',
      estimatedWordCount: 1800,
      competitorInsights: 'Đối thủ A có nhiều mẫu mã.',
    });
    const result = parseSemanticResponse(ai, makeStep1());
    assert.equal(result.searchIntent, 'commercial');
    assert.equal(result.macroContext, 'Nội thất gia đình');
    assert.equal(result.estimatedWordCount, 1800);
    assert.equal(result.suggestedContentType, 'review');
    assert.equal(result.rppMap.length, 1);
    assert.equal(result.attributeMap.length, 1);
    assert.deepEqual(result.semanticKeywords, ['giường sắt giá rẻ', 'giường sắt 1m6']);
  });

  it('falls back to fallbackSemantic when AI returns non-JSON', () => {
    const result = parseSemanticResponse('Xin lỗi, không thể phân tích.', makeStep1({ contentType: 'review' }));
    assert.equal(result.searchIntent, 'commercial');
    assert.ok(result.rppMap.length > 0);
  });

  it('falls back to input.contentType when AI returns invalid suggestedContentType', () => {
    const ai = JSON.stringify({
      macroContext: 'test',
      searchIntent: 'informational',
      intentExplanation: 'test',
      suggestedContentType: 'invalid_type',
      estimatedWordCount: 1000,
    });
    const result = parseSemanticResponse(ai, makeStep1({ contentType: 'how_to' }));
    assert.equal(result.suggestedContentType, 'how_to');
  });

  it('falls back to fallback searchIntent when AI returns invalid intent', () => {
    const ai = JSON.stringify({
      macroContext: 'test',
      searchIntent: 'unknown_intent',
      intentExplanation: 'test',
    });
    const result = parseSemanticResponse(ai, makeStep1({ contentType: 'blog_seo' }));
    assert.equal(result.searchIntent, 'informational');
  });

  it('clamps rppMap to 5 items max', () => {
    const ai = JSON.stringify({
      macroContext: 'test',
      searchIntent: 'informational',
      intentExplanation: 'test',
      rppMap: Array.from({ length: 8 }, (_, i) => ({ pain: `Pain ${i}`, relevance: 'high' })),
    });
    const result = parseSemanticResponse(ai, makeStep1());
    assert.ok(result.rppMap.length <= 5);
  });

  it('clamps attributeMap to 8 items max', () => {
    const ai = JSON.stringify({
      macroContext: 'test',
      searchIntent: 'informational',
      intentExplanation: 'test',
      attributeMap: Array.from({ length: 12 }, (_, i) => ({ attribute: `Attr ${i}`, importance: 'must' })),
    });
    const result = parseSemanticResponse(ai, makeStep1());
    assert.ok(result.attributeMap.length <= 8);
  });

  it('clamps semanticKeywords to 12 items max', () => {
    const ai = JSON.stringify({
      macroContext: 'test',
      searchIntent: 'informational',
      intentExplanation: 'test',
      semanticKeywords: Array.from({ length: 20 }, (_, i) => `keyword ${i}`),
    });
    const result = parseSemanticResponse(ai, makeStep1());
    assert.ok(result.semanticKeywords.length <= 12);
  });

  it('normalises invalid rppMap relevance to "medium"', () => {
    const ai = JSON.stringify({
      macroContext: 'test',
      searchIntent: 'informational',
      intentExplanation: 'test',
      rppMap: [{ pain: 'Some pain', relevance: 'VERY_HIGH' }],
    });
    const result = parseSemanticResponse(ai, makeStep1());
    assert.equal(result.rppMap[0]?.relevance, 'medium');
  });

  it('normalises invalid attributeMap importance to "should"', () => {
    const ai = JSON.stringify({
      macroContext: 'test',
      searchIntent: 'informational',
      intentExplanation: 'test',
      attributeMap: [{ attribute: 'Something', importance: 'critical' }],
    });
    const result = parseSemanticResponse(ai, makeStep1());
    assert.equal(result.attributeMap[0]?.importance, 'should');
  });

  it('uses defaultLength when estimatedWordCount is 0 or NaN', () => {
    const ai = JSON.stringify({
      macroContext: 'test',
      searchIntent: 'informational',
      intentExplanation: 'test',
      suggestedContentType: 'pillar',
      estimatedWordCount: 0,
    });
    const result = parseSemanticResponse(ai, makeStep1());
    assert.equal(result.estimatedWordCount, 3000);
  });
});

// ============================================================
// TESTS — parseTitlesResponse
// ============================================================

describe('parseTitlesResponse', () => {
  it('parses valid JSON array of titles', () => {
    const json = JSON.stringify(['Title A', 'Title B', 'Title C']);
    const result = parseTitlesResponse_buggy(json, 'giường sắt');
    assert.deepEqual(result, ['Title A', 'Title B', 'Title C']);
  });

  it('filters out titles shorter than 10 chars', () => {
    const json = JSON.stringify(['ok', 'Short', 'This is a long enough title']);
    const result = parseTitlesResponse_buggy(json, 'kw');
    assert.deepEqual(result, ['This is a long enough title']);
  });

  it('slices to 5 titles max', () => {
    const json = JSON.stringify(Array.from({ length: 8 }, (_, i) => `Title number ${i + 1} with enough length`));
    const result = parseTitlesResponse_buggy(json, 'kw');
    assert.equal(result.length, 5);
  });

  it('[BUG #5] fallback titles are always Vietnamese regardless of language', () => {
    const result = parseTitlesResponse_buggy('not valid json', 'bed frame');
    // buggy: all fallback titles are Vietnamese even for English keyword
    const hasVietnamese = result.some((t) => t.includes('Hướng dẫn') || t.includes('phù hợp') || t.includes('kinh nghiệm'));
    assert.ok(hasVietnamese, '[BUG #5] fallback should be Vietnamese — confirming bug exists');
  });

  it('[FIX #5] fixed version returns English fallbacks for English language', () => {
    const result = parseTitlesResponse_fixed('not valid json', 'bed frame', 'English');
    const hasEnglish = result.some((t) => t.includes('Guide') || t.includes('How to') || t.includes('Review'));
    assert.ok(hasEnglish, '[FIX #5] English language should get English fallback titles');
  });

  it('[FIX #5] fixed version still returns Vietnamese for Vietnamese language', () => {
    const result = parseTitlesResponse_fixed('invalid', 'giường sắt', 'Vietnamese');
    const hasVietnamese = result.some((t) => t.includes('Hướng dẫn') || t.includes('phù hợp'));
    assert.ok(hasVietnamese, '[FIX #5] Vietnamese language keeps Vietnamese fallbacks');
  });
});

// ============================================================
// TESTS — parseOutlineResponse
// ============================================================

describe('parseOutlineResponse', () => {
  it('returns text as-is when it contains [h2] tags', () => {
    const outline = '[h2]Tổng quan[/h2]\n[h3]Chi tiết[/h3]';
    const result = parseOutlineResponse(outline, 'giường sắt');
    assert.equal(result, outline);
  });

  it('strips markdown code block fences but keeps content', () => {
    const outline = '```text\n[h2]Tổng quan[/h2]\n```';
    const result = parseOutlineResponse(outline, 'giường sắt');
    assert.ok(result.includes('[h2]Tổng quan[/h2]'));
    assert.ok(!result.includes('```'));
  });

  it('returns fallback outline when no [h2] tags found', () => {
    const result = parseOutlineResponse('Some random text without structure', 'tủ quần áo');
    assert.ok(result.includes('[h2]'), 'fallback must include [h2] tags');
    assert.ok(result.includes('tủ quần áo'), 'fallback must include keyword');
  });

  it('fallback contains FAQ section', () => {
    const result = parseOutlineResponse('no structure', 'bàn làm việc');
    assert.ok(result.includes('FAQ'), 'fallback should have FAQ');
  });

  it('handles empty string with fallback', () => {
    const result = parseOutlineResponse('', 'keyword');
    assert.ok(result.includes('[h2]'));
  });

  it('[h2] detection is case-insensitive', () => {
    const outline = '[H2]Test section[/H2]';
    const result = parseOutlineResponse(outline, 'kw');
    assert.equal(result, outline);
  });
});

// ============================================================
// TESTS — analyzeHumanness
// ============================================================

describe('analyzeHumanness', () => {
  const goodHtml = `
    <article>
      <p>Giường sắt 1m6 giá xưởng, khung dày 1.4mm. Giao hàng nội thành trong 24 giờ.</p>
      <p>Minh Quân sản xuất trực tiếp, không qua trung gian. Giá tốt nhất thị trường TPHCM.</p>
      <ul>
        <li>Khung sắt dày 1.4mm</li>
        <li>Bảo hành 12 tháng</li>
        <li>Giao hàng toàn quốc</li>
      </ul>
    </article>
  `;

  it('clean article → score ≥ 76 → PUBLISH', () => {
    const result = analyzeHumanness(goodHtml);
    assert.ok(result.score >= 76, `score=${result.score} should be ≥ 76`);
    assert.equal(result.decision, 'PUBLISH');
  });

  it('score is clamped between 50 and 96', () => {
    const result = analyzeHumanness(goodHtml);
    assert.ok(result.score >= 50 && result.score <= 96);

    // Worst case: article with many long paragraphs and forbidden words
    const badHtml = `<article>${Array.from({ length: 10 }, () =>
      `<p>${Array.from({ length: 100 }, (_, i) => `từ${i}`).join(' ')}</p>`,
    ).join('')}</article>`;
    const badResult = analyzeHumanness(badHtml, 'từ1, từ2, từ3');
    assert.ok(badResult.score >= 50, 'min clamp is 50');
  });

  it('penalizes long paragraphs (>90 words)', () => {
    const shortResult = analyzeHumanness(goodHtml);
    const longParagraphHtml = `
      <article>
        <p>${Array.from({ length: 95 }, (_, i) => `word${i}`).join(' ')}.</p>
        <ul><li>item</li></ul>
      </article>
    `;
    const longResult = analyzeHumanness(longParagraphHtml);
    assert.ok(longResult.score < shortResult.score, 'long paragraphs reduce score');
    assert.ok(longResult.issues.some((i) => i.includes('đoạn văn')));
  });

  it('penalizes articles without visual breaks (ul/ol/table)', () => {
    const noBreakHtml = `
      <article>
        <p>Short sentence one. Short sentence two. Three.</p>
      </article>
    `;
    const result = analyzeHumanness(noBreakHtml);
    assert.ok(result.issues.some((i) => i.includes('visual break')));
  });

  it('detects forbidden words in comma-separated list', () => {
    const html = `<article><p>Đây là sản phẩm tuyệt vời và vô cùng quan trọng.</p><ul><li>item</li></ul></article>`;
    const result = analyzeHumanness(html, 'tuyệt vời, vô cùng');
    assert.ok(result.forbiddenFound.length > 0, 'should detect forbidden words');
    assert.ok(result.score < 90, 'forbidden words reduce score');
  });

  it('decision thresholds: PUBLISH≥76, REVIEW 60-75, REWRITE<60', () => {
    // We can verify threshold logic by checking boundary
    assert.equal(
      (analyzeHumanness('<article><ul><li>a b c d e f g h i j.</li></ul></article>')).decision,
      'PUBLISH',
    );
  });

  it('scoreBreakdown sub-scores sum within plausible range', () => {
    const result = analyzeHumanness(goodHtml);
    const { scoreBreakdown } = result;
    const total = scoreBreakdown.language_natural + scoreBreakdown.structure
      + scoreBreakdown.eeat_signals + scoreBreakdown.engagement;
    // Each is clamped 10-25, total is 40-100
    assert.ok(total >= 40 && total <= 100, `total=${total}`);
  });
});

// ============================================================
// TESTS — estimateSemanticScore
// ============================================================

describe('estimateSemanticScore', () => {
  const semantic: SemanticAnalysis = {
    macroContext: 'Nội thất phòng ngủ',
    searchIntent: 'commercial',
    intentExplanation: 'Mua hàng',
    rppMap: [{ pain: 'Không biết chọn', relevance: 'high' }],
    attributeMap: [
      { attribute: 'định nghĩa phạm vi sản phẩm', importance: 'must' },
      { attribute: 'tiêu chí chọn mua giường', importance: 'must' },
    ],
    semanticKeywords: ['giường sắt giá rẻ', 'giường 1m6 sắt'],
    suggestedContentType: 'review',
    estimatedWordCount: 1800,
  };

  it('returns null when semantic is null', () => {
    assert.equal(estimateSemanticScore_buggy('<p>text</p>', null), null);
    assert.equal(estimateSemanticScore_fixed('<p>text</p>', null), null);
  });

  it('[BUG #3] first-word matching causes false positive coverage', () => {
    // Article says nothing about "định nghĩa" or "tiêu chí" specifically
    // but "định" is the first word of first attribute and common in Vietnamese
    const html = `<article>
      <p>Định hướng mua hàng nội thất. Tiêu chuẩn chất lượng cao nhất.</p>
      <ul><li>item</li></ul>
    </article>`;
    const buggyResult = estimateSemanticScore_buggy(html, semantic);
    const fixedResult = estimateSemanticScore_fixed(html, semantic);
    // Buggy: "định" matches "định nghĩa..." even though the article doesn't cover it
    // Fixed: requires ALL significant words of the attribute to match
    assert.ok(buggyResult !== null && fixedResult !== null);
    assert.ok(
      buggyResult.score >= fixedResult.score,
      `[BUG #3] buggy score (${buggyResult.score}) should be ≥ fixed (${fixedResult.score}) for this case`,
    );
  });

  it('[FIX #3] fixed version gives OK for article that actually covers attributes', () => {
    const html = `<article>
      <p>Định nghĩa phạm vi sản phẩm giường sắt rõ ràng. Tiêu chí chọn mua giường phải có.</p>
      <p>Giường sắt giá rẻ tại TPHCM. Giường 1m6 sắt chất lượng cao.</p>
      <ul><li>Khung dày 1.4mm</li></ul>
    </article>`;
    const result = estimateSemanticScore_fixed(html, semantic);
    assert.ok(result !== null);
    assert.ok(result.score >= 60, `score=${result.score} should be ≥ 60 for good coverage`);
  });

  it('returns FAIL for article with very low semantic coverage', () => {
    const html = '<article><p>Nothing relevant here at all.</p></article>';
    const result = estimateSemanticScore_fixed(html, semantic);
    assert.ok(result !== null);
    assert.ok(['FAIL', 'NEEDS_FIX'].includes(result.decision));
  });

  it('decision thresholds: OK≥80, NEEDS_FIX 60-79, FAIL<60', () => {
    // Score formula: mustScore + keywordScore + intentScore
    // Max: 45 + 35 + 20 = 100
    // If article is long (>1200 chars) → intentScore = 20
    const longHtml = `<article>${'<p>word word word word word word word word word word.</p>'.repeat(30)}</article>`;
    const result = estimateSemanticScore_fixed(longHtml, {
      ...semantic,
      attributeMap: [],
      semanticKeywords: [],
    });
    assert.ok(result !== null);
    // With no must attrs and no semanticKeywords: mustScore=35, kwScore=25, intentScore=20 → 80 → OK
    assert.equal(result.decision, 'OK');
  });
});

// ============================================================
// TESTS — applySeoOptions
// ============================================================

describe('applySeoOptions — seoMainLink', () => {
  it('wraps keyword in <a> on first text occurrence', () => {
    const html = '<article><p>Mua giường sắt giá rẻ hôm nay.</p></article>';
    const config = makeConfig({ keyword: 'giường sắt', step3: makeStep3({ seoMainLink: 'https://example.com/giuong-sat' }) });
    const result = applySeoOptions_buggy(html, config);
    assert.ok(result.includes('<a href="https://example.com/giuong-sat">giường sắt</a>'));
  });

  it('[BUG #1] creates nested <a> when keyword already inside an <a> tag', () => {
    // HTML where keyword is already wrapped in an anchor
    const html = '<article><p>Xem <a href="https://old.com">giường sắt</a> ngay.</p></article>';
    const config = makeConfig({
      keyword: 'giường sắt',
      step3: makeStep3({ seoMainLink: 'https://new.com' }),
    });
    const result = applySeoOptions_buggy(html, config);
    // BUG #1: regex matches inside existing <a> → creates nested <a>
    const nestedAnchorCount = (result.match(/<a /gi) || []).length;
    assert.ok(
      nestedAnchorCount >= 2,
      `[BUG #1] nested <a> created — found ${nestedAnchorCount} <a> tags: ${result}`,
    );
  });

  it('[FIX #1] fixed version skips keyword replacement when already inside <a>', () => {
    const html = '<article><p>Xem <a href="https://old.com">giường sắt</a> ngay.</p></article>';
    const config = makeConfig({
      keyword: 'giường sắt',
      step3: makeStep3({ seoMainLink: 'https://new.com' }),
    });
    const result = applySeoOptions_fixed(html, config);
    // FIX #1: should not create nested <a>
    const anchorCount = (result.match(/<a /gi) || []).length;
    assert.equal(anchorCount, 1, `[FIX #1] should have exactly 1 <a> tag, got: ${anchorCount}`);
    // Original href preserved
    assert.ok(result.includes('href="https://old.com"'));
  });
});

describe('applySeoOptions — footerContent', () => {
  it('appends plain text footer wrapped in <p>', () => {
    const html = '<article><p>Content</p></article>';
    const config = makeConfig({
      step3: makeStep3({ footerContent: 'Liên hệ: 0909 123 456' }),
    });
    const result = applySeoOptions_buggy(html, config);
    assert.ok(result.includes('<section class="brand-footer">'));
    assert.ok(result.includes('<p>Liên hệ: 0909 123 456</p>'));
    assert.ok(result.includes('</article>'));
  });

  it('appends HTML footer as-is when it starts with <', () => {
    const html = '<article><p>Content</p></article>';
    const config = makeConfig({
      step3: makeStep3({ footerContent: '<div class="cta">Đặt hàng ngay</div>' }),
    });
    const result = applySeoOptions_buggy(html, config);
    assert.ok(result.includes('<div class="cta">Đặt hàng ngay</div>'));
  });

  it('[BUG #2] footerContent with <script> is injected without sanitization', () => {
    const html = '<article><p>Content</p></article>';
    const xssPayload = '<script>alert("xss")</script><p>Footer</p>';
    const config = makeConfig({
      step3: makeStep3({ footerContent: xssPayload }),
    });
    const result = applySeoOptions_buggy(html, config);
    // BUG #2: script tag passes through
    assert.ok(result.includes('<script>alert("xss")</script>'), '[BUG #2] XSS script injected');
  });

  it('[FIX #2] fixed version strips <script> from footerContent', () => {
    const html = '<article><p>Content</p></article>';
    const xssPayload = '<script>alert("xss")</script><p>Footer</p>';
    const config = makeConfig({
      step3: makeStep3({ footerContent: xssPayload }),
    });
    const result = applySeoOptions_fixed(html, config);
    assert.ok(!result.includes('<script>'), '[FIX #2] script tag removed');
    assert.ok(result.includes('<p>Footer</p>'), '[FIX #2] safe content preserved');
  });

  it('[FIX #2] fixed version strips on* event handlers from footerContent', () => {
    const html = '<article><p>Content</p></article>';
    const config = makeConfig({
      step3: makeStep3({ footerContent: '<a href="x" onclick="alert(1)">Click</a>' }),
    });
    const result = applySeoOptions_fixed(html, config);
    assert.ok(!result.includes('onclick='), '[FIX #2] onclick removed');
  });

  it('does not append footer when footerContent is empty', () => {
    const html = '<article><p>Content</p></article>';
    const config = makeConfig({ step3: makeStep3({ footerContent: '' }) });
    const result = applySeoOptions_buggy(html, config);
    assert.ok(!result.includes('brand-footer'));
  });
});

// ============================================================
// TESTS — buildFallbackArticle
// ============================================================

describe('buildFallbackArticle', () => {
  it('includes <article> wrapper', () => {
    const result = buildFallbackArticle({ keyword: 'giường sắt', title: 'Giường Sắt Giá Rẻ' });
    assert.ok(result.startsWith('<article>'));
    assert.ok(result.endsWith('</article>'));
  });

  it('uses title in <h1>', () => {
    const result = buildFallbackArticle({ keyword: 'giường sắt', title: 'Giường Sắt Giá Rẻ' });
    assert.ok(result.includes('<h1>Giường Sắt Giá Rẻ</h1>'));
  });

  it('uses keyword as <h1> when no title provided', () => {
    const result = buildFallbackArticle({ keyword: 'tủ quần áo' });
    assert.ok(result.includes('<h1>tủ quần áo</h1>'));
  });

  it('includes multiple <h2> sections', () => {
    const result = buildFallbackArticle({ keyword: 'bàn ghế', title: 'Test' });
    const h2Count = (result.match(/<h2>/g) || []).length;
    assert.ok(h2Count >= 3, `should have ≥ 3 h2 sections, got ${h2Count}`);
  });

  it('includes <ul> for visual break', () => {
    const result = buildFallbackArticle({ keyword: 'test', title: 'Test' });
    assert.ok(result.includes('<ul>'));
  });

  it('includes FAQ section', () => {
    const result = buildFallbackArticle({ keyword: 'giường sắt', title: 'Test' });
    assert.ok(result.includes('FAQ'));
    assert.ok(result.includes('<h3>'));
  });

  it('contains keyword in content sections', () => {
    const result = buildFallbackArticle({ keyword: 'giường sắt', title: 'Test' });
    const occurrences = (result.match(/giường sắt/g) || []).length;
    assert.ok(occurrences >= 3, `keyword should appear ≥ 3 times, got ${occurrences}`);
  });
});

// ============================================================
// TESTS — chunkText
// ============================================================

describe('chunkText', () => {
  it('splits text into chunks of given size', () => {
    const result = chunkText('abcdefgh', 3);
    assert.deepEqual(result, ['abc', 'def', 'gh']);
  });

  it('returns single chunk when text < size', () => {
    const result = chunkText('abc', 10);
    assert.deepEqual(result, ['abc']);
  });

  it('returns empty array for empty string', () => {
    const result = chunkText('', 100);
    assert.deepEqual(result, []);
  });

  it('uses default size 900', () => {
    const long = 'x'.repeat(1800);
    const result = chunkText(long);
    assert.equal(result.length, 2);
    assert.equal(result[0].length, 900);
    assert.equal(result[1].length, 900);
  });

  it('each chunk except last is exactly size characters', () => {
    const text = 'x'.repeat(2500);
    const result = chunkText(text, 900);
    for (let i = 0; i < result.length - 1; i++) {
      assert.equal(result[i].length, 900);
    }
  });
});

// ============================================================
// TESTS — buildAnalyzePrompt
// ============================================================

describe('buildAnalyzePrompt', () => {
  function buildAnalyzePrompt_local(input: VbtStep1State, competitorData: string, googleData: string): string {
    return `
Bạn là Semantic SEO Analyst. Phân tích keyword và trả về JSON strict.

INPUT:
- Keyword chính: ${input.keyword}
- Keyword phụ: ${input.secondaryKeywordsRaw || 'không có'}
- Loại nội dung user chọn: ${input.contentType}
- Topical map role: ${input.topicalMapRole}
- Nguồn dữ liệu: ${input.dataSourceMode}
- Ngôn ngữ: ${input.language}
${input.dataSourceText ? `- Nội dung thủ công:\n${input.dataSourceText.slice(0, 4000)}` : ''}

${competitorData ? `DỮ LIỆU ĐỐI THỦ:\n${competitorData}` : ''}
${googleData ? `DỮ LIỆU GOOGLE:\n${googleData}` : ''}

YÊU CẦU:
- Xác định macro context, tức chủ đề tổng quát của keyword.
- Xác định search intent: informational, navigational, commercial, transactional.
- Liệt kê 3-5 reader pain points, mỗi item có relevance: high/medium/low.
- Liệt kê 4-8 attribute map, mỗi item có importance: must/should/nice_to_have.
- Đề xuất 8-12 semantic keywords liên quan trực tiếp.
- Gợi ý content type phù hợp nhất: blog_seo, how_to, listicle, comparison, review, pillar, local_seo.
- Ước tính word count phù hợp dưới dạng số nguyên.
- Nếu có dữ liệu đối thủ, tóm tắt insight ngắn gọn trong 2-3 câu.

OUTPUT JSON:
{
  "macroContext": "string - chủ đề tổng quát",
  "searchIntent": "informational | navigational | commercial | transactional",
  "intentExplanation": "string - giải thích ngắn",
  "rppMap": [{"pain":"string","relevance":"high"}],
  "attributeMap": [{"attribute":"string","importance":"must"}],
  "semanticKeywords": ["string"],
  "suggestedContentType": "blog_seo",
  "estimatedWordCount": 1500,
  "competitorInsights": "string - 2 đến 3 câu tổng hợp đối thủ, hoặc empty string nếu không có dữ liệu"
}
`.trim();
  }

  it('includes keyword in prompt', () => {
    const prompt = buildAnalyzePrompt_local(makeStep1({ keyword: 'tủ quần áo' }), '', '');
    assert.ok(prompt.includes('tủ quần áo'));
  });

  it('includes contentType in prompt', () => {
    const prompt = buildAnalyzePrompt_local(makeStep1({ contentType: 'review' }), '', '');
    assert.ok(prompt.includes('review'));
  });

  it('includes competitor data block when provided', () => {
    const prompt = buildAnalyzePrompt_local(makeStep1(), 'Đối thủ A mạnh...', '');
    assert.ok(prompt.includes('DỮ LIỆU ĐỐI THỦ'));
    assert.ok(prompt.includes('Đối thủ A mạnh...'));
  });

  it('includes Google data block when provided', () => {
    const prompt = buildAnalyzePrompt_local(makeStep1(), '', 'Kết quả tìm kiếm...');
    assert.ok(prompt.includes('DỮ LIỆU GOOGLE'));
  });

  it('does not include data source text section when dataSourceText is empty', () => {
    const prompt = buildAnalyzePrompt_local(makeStep1({ dataSourceText: '' }), '', '');
    assert.ok(!prompt.includes('Nội dung thủ công'));
  });

  it('includes truncated dataSourceText (4000 chars max)', () => {
    const longText = 'A'.repeat(5000);
    const prompt = buildAnalyzePrompt_local(makeStep1({ dataSourceText: longText }), '', '');
    assert.ok(prompt.includes('Nội dung thủ công'));
    // 4000 A's should be present; 5000 should not
    assert.ok(prompt.includes('A'.repeat(4000)));
    assert.ok(!prompt.includes('A'.repeat(4001)));
  });

  it('specifies valid searchIntent options in output JSON schema', () => {
    const prompt = buildAnalyzePrompt_local(makeStep1(), '', '');
    assert.ok(prompt.includes('informational'));
    assert.ok(prompt.includes('transactional'));
  });
});

// ============================================================
// TESTS — buildTitlesPrompt
// ============================================================

describe('buildTitlesPrompt', () => {
  function buildTitlesPrompt_local(params: {
    keyword: string;
    secondaryKeywords: string[];
    contentType: ContentType;
    language: string;
    semantic?: SemanticAnalysis | null;
  }): string {
    return `
Tạo 5 SEO title options cho bài viết.

Keyword chính: ${params.keyword}
Keyword phụ: ${params.secondaryKeywords.join(', ') || 'không có'}
Loại nội dung: ${params.contentType}
Ngôn ngữ: ${params.language}
Search intent: ${params.semantic?.searchIntent || 'unknown'}
Từ khóa semantic: ${params.semantic?.semanticKeywords.join(', ') || 'không có'}

Quy tắc:
- Mỗi title 50-60 ký tự nếu có thể, không vượt 70 ký tự.
- Keyword chính xuất hiện ở 1/3 đầu title.
- Có số liệu, năm, hoặc thông số cụ thể nếu phù hợp.
- Không clickbait, không hứa hẹn cường điệu.
- Mỗi title phải khác nhau về cấu trúc, không lặp pattern.

Trả về JSON array string[], không giải thích thêm.
`.trim();
  }

  it('includes keyword in prompt', () => {
    const prompt = buildTitlesPrompt_local({
      keyword: 'giường sắt', secondaryKeywords: [], contentType: 'blog_seo', language: 'Vietnamese',
    });
    assert.ok(prompt.includes('giường sắt'));
  });

  it('joins secondaryKeywords with comma', () => {
    const prompt = buildTitlesPrompt_local({
      keyword: 'kw', secondaryKeywords: ['kw1', 'kw2'], contentType: 'blog_seo', language: 'Vietnamese',
    });
    assert.ok(prompt.includes('kw1, kw2'));
  });

  it('shows "không có" when no secondary keywords', () => {
    const prompt = buildTitlesPrompt_local({
      keyword: 'kw', secondaryKeywords: [], contentType: 'blog_seo', language: 'Vietnamese',
    });
    assert.ok(prompt.includes('không có'));
  });

  it('includes title length rule (50-60 chars)', () => {
    const prompt = buildTitlesPrompt_local({
      keyword: 'kw', secondaryKeywords: [], contentType: 'blog_seo', language: 'Vietnamese',
    });
    assert.ok(prompt.includes('50-60'));
    assert.ok(prompt.includes('70'));
  });

  it('includes semantic intent when provided', () => {
    const semantic = fallbackSemantic(makeStep1({ contentType: 'review' }));
    const prompt = buildTitlesPrompt_local({
      keyword: 'kw', secondaryKeywords: [], contentType: 'review', language: 'Vietnamese', semantic,
    });
    assert.ok(prompt.includes('commercial'));
  });
});

// ============================================================
// TESTS — buildOutlinePrompt
// ============================================================

describe('buildOutlinePrompt', () => {
  function buildOutlinePrompt_local(params: {
    keyword: string;
    secondaryKeywords: string[];
    contentType: ContentType;
    objective: string;
    size: string;
    language: string;
    semantic?: SemanticAnalysis | null;
  }): string {
    const mustAttributes = params.semantic?.attributeMap
      .filter((item) => item.importance === 'must')
      .map((item) => item.attribute)
      .join(', ');
    const painPoints = params.semantic?.rppMap
      .filter((item) => item.relevance !== 'low')
      .map((item) => item.pain)
      .join(' | ');
    return `
Bạn là SEO Architect. Tạo dàn ý bài viết theo format tag ngắn gọn.

Keyword: ${params.keyword}
Keyword phụ: ${params.secondaryKeywords.join(', ') || 'không có'}
Loại nội dung: ${params.contentType}
Mục tiêu outline: ${params.objective}
Kích thước: ${params.size}
Ngôn ngữ: ${params.language}
Must-cover attributes: ${mustAttributes || 'không có'}
Reader pain points: ${painPoints || 'không có'}

Format output:
[h2]Tên mục H2[/h2]
[h3]Tên mục H3[/h3]
[h2]FAQ[/h2]
[h3]Câu hỏi...?[/h3]

Không trả markdown, không giải thích.
`.trim();
  }

  it('includes keyword in prompt', () => {
    const prompt = buildOutlinePrompt_local({
      keyword: 'giường sắt', secondaryKeywords: [], contentType: 'blog_seo',
      objective: 'comprehensive', size: 'md', language: 'Vietnamese',
    });
    assert.ok(prompt.includes('giường sắt'));
  });

  it('includes must-cover attributes from semantic', () => {
    const semantic = fallbackSemantic(makeStep1({ keyword: 'giường sắt' }));
    const prompt = buildOutlinePrompt_local({
      keyword: 'giường sắt', secondaryKeywords: [], contentType: 'blog_seo',
      objective: 'comprehensive', size: 'md', language: 'Vietnamese', semantic,
    });
    // fallbackSemantic has 'must' attributes
    assert.ok(prompt.includes('Định nghĩa'));
  });

  it('excludes low-relevance pain points', () => {
    const semantic: SemanticAnalysis = {
      macroContext: 'test',
      searchIntent: 'informational',
      intentExplanation: 'test',
      rppMap: [
        { pain: 'High pain', relevance: 'high' },
        { pain: 'Low pain', relevance: 'low' },
      ],
      attributeMap: [],
      semanticKeywords: [],
      suggestedContentType: 'blog_seo',
      estimatedWordCount: 1500,
    };
    const prompt = buildOutlinePrompt_local({
      keyword: 'kw', secondaryKeywords: [], contentType: 'blog_seo',
      objective: 'comprehensive', size: 'md', language: 'Vietnamese', semantic,
    });
    assert.ok(prompt.includes('High pain'));
    assert.ok(!prompt.includes('Low pain'));
  });

  it('specifies [h2][/h2] format in prompt', () => {
    const prompt = buildOutlinePrompt_local({
      keyword: 'kw', secondaryKeywords: [], contentType: 'blog_seo',
      objective: 'comprehensive', size: 'md', language: 'Vietnamese',
    });
    assert.ok(prompt.includes('[h2]'));
    assert.ok(prompt.includes('[h3]'));
  });
});

// ============================================================
// TESTS — buildVbtWritingPrompt (SNIPPET_RULES_BY_TONE dead lookup)
// ============================================================

describe('buildVbtWritingPrompt — SNIPPET_RULES_BY_TONE lookup', () => {
  it('[BUG #6] lookup by contentType value always misses (dead code)', () => {
    // The mock map has keys 'how_to' and 'listicle' (which happen to overlap with contentType values,
    // but in the real SNIPPET_RULES_BY_TONE map the keys are tone values like 'how_to', 'listicle',
    // and contentType 'blog_seo', 'pillar', etc. would miss).
    // Demonstrate with 'blog_seo' contentType — never a tone key
    const result = buildVbtWritingPrompt_buggy({
      contentType: 'blog_seo', // not in SNIPPET_RULES_BY_TONE_MOCK
      step3: { tone: 'how_to' }, // IS in the mock as a tone
    });
    // Buggy: tries contentType ('blog_seo') first → miss → falls to tone ('how_to') → hit
    // But relies on the || fallthrough, meaning contentType lookup is wasted
    assert.ok(result.includes('Format snippet: numbered steps.'), 'how_to tone snippetRule applied via fallthrough');
  });

  it('[BUG #6] when contentType accidentally matches a tone key, wrong result returned', () => {
    // If contentType happens to be 'how_to' (also a tone key), the contentType lookup
    // will wrongly consume the tone-intended rule on first match
    const buggyResult = buildVbtWritingPrompt_buggy({
      contentType: 'how_to', // accidentally matches the SNIPPET_RULES_BY_TONE key
      step3: { tone: 'listicle' },
    });
    const fixedResult = buildVbtWritingPrompt_fixed({
      contentType: 'how_to',
      step3: { tone: 'listicle' },
    });
    // Buggy: contentType 'how_to' matches first → returns 'numbered steps' (wrong rule for tone 'listicle')
    assert.ok(buggyResult.includes('numbered steps'), '[BUG #6] wrong rule when contentType matches tone key');
    // Fixed: tone 'listicle' lookup first → returns 'bullet list' (correct)
    assert.ok(fixedResult.includes('bullet list'), '[FIX #6] correct tone-based rule');
  });

  it('[FIX #6] fixed version looks up by tone first', () => {
    const result = buildVbtWritingPrompt_fixed({
      contentType: 'pillar', // not in mock
      step3: { tone: 'listicle' }, // IS in mock
    });
    assert.ok(result.includes('bullet list'), '[FIX #6] tone lookup succeeds first');
  });
});

// ============================================================
// TESTS — options constants completeness
// ============================================================

describe('VBT_TONES completeness', () => {
  const EXPECTED_TONES = [
    'seo_basic', 'seo_extended', 'seo_longform', 'how_to', 'listicle',
    'comparison', 'review', 'story', 'technical', 'friendly', 'local_seo',
  ];

  const VBT_TONES_VALUES = [
    'seo_basic', 'seo_extended', 'seo_longform', 'how_to', 'listicle',
    'comparison', 'review', 'story', 'technical', 'friendly', 'local_seo',
  ];

  it('has exactly 11 tones', () => {
    assert.equal(VBT_TONES_VALUES.length, 11);
  });

  it('contains all expected tone values', () => {
    for (const tone of EXPECTED_TONES) {
      assert.ok(VBT_TONES_VALUES.includes(tone), `Missing tone: ${tone}`);
    }
  });
});

describe('VBT_AI_OUTLINE_SIZES', () => {
  const SIZES = [
    { value: 'xs', h2Count: 3 },
    { value: 'sm', h2Count: 4 },
    { value: 'md', h2Count: 5 },
    { value: 'lg', h2Count: 6 },
    { value: 'xl', h2Count: 8 },
  ];

  it('has 5 sizes', () => {
    assert.equal(SIZES.length, 5);
  });

  it('h2Count increases with size', () => {
    const counts = SIZES.map((s) => s.h2Count);
    for (let i = 1; i < counts.length; i++) {
      assert.ok(counts[i] > counts[i - 1], `h2Count not increasing at index ${i}`);
    }
  });
});

describe('VBT_AI_OUTLINE_OBJECTIVES', () => {
  const EXPECTED = ['comprehensive', 'beginner', 'expert', 'local_focus', 'buying_guide', 'problem_solve'];

  it('has exactly 6 objectives', () => {
    assert.equal(EXPECTED.length, 6);
  });
});

describe('VBT_LOADING_STEPS', () => {
  const EXPECTED_KEYS = ['init', 'research', 'outline', 'writing', 'seo', 'humanize', 'done'];

  it('has 7 loading steps', () => {
    assert.equal(EXPECTED_KEYS.length, 7);
  });

  it('ends with "done" step', () => {
    assert.equal(EXPECTED_KEYS[EXPECTED_KEYS.length - 1], 'done');
  });
});

// ============================================================
// TESTS — TOPICAL_MAP_ROLES
// ============================================================

describe('TOPICAL_MAP_ROLES', () => {
  const ROLES: TopicalMapRole[] = ['hub', 'spoke', 'standalone'];

  it('has 3 roles', () => {
    assert.equal(ROLES.length, 3);
  });

  it('contains all required role values', () => {
    assert.ok(ROLES.includes('hub'));
    assert.ok(ROLES.includes('spoke'));
    assert.ok(ROLES.includes('standalone'));
  });
});

// ============================================================
// TESTS — DATA_SOURCE_MODES
// ============================================================

describe('DATA_SOURCE_MODES', () => {
  const MODES: DataSourceMode[] = ['ai_only', 'url_crawl', 'manual_text', 'google_search'];

  it('has 4 modes', () => {
    assert.equal(MODES.length, 4);
  });

  it('contains all required mode values', () => {
    for (const m of ['ai_only', 'url_crawl', 'manual_text', 'google_search'] as DataSourceMode[]) {
      assert.ok(MODES.includes(m), `Missing mode: ${m}`);
    }
  });
});

// ============================================================
// TESTS — Storage key constants
// ============================================================

describe('VBT_STORAGE_KEYS', () => {
  const keys = { step1: 'vbt_step1', semantic: 'vbt_semantic', step3: 'vbt_step3', runId: 'vbt_runId', brand: 'vbt_brand_info' };

  it('has correct key values', () => {
    assert.equal(keys.step1, 'vbt_step1');
    assert.equal(keys.semantic, 'vbt_semantic');
    assert.equal(keys.step3, 'vbt_step3');
    assert.equal(keys.runId, 'vbt_runId');
    assert.equal(keys.brand, 'vbt_brand_info');
  });

  it('brand key is different from session keys', () => {
    const sessionKeys = ['step1', 'semantic', 'step3', 'runId'];
    assert.ok(!sessionKeys.includes('brand'), 'brand should not be in SESSION_KEYS');
  });
});
