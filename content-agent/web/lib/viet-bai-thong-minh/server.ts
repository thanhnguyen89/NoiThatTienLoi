import { Prisma } from '@prisma/client';
import { buildDataBlock } from '@/lib/google-search/prompt-inject';
import { fetchGoogleSearchData } from '@/lib/google-search/search';
import { SEO_PROMPT_RULES, SNIPPET_RULES_BY_TONE } from '@/lib/shared/prompt-rules';
import { computeSeoChecks } from '@/lib/shared/seo-checks';
import { buildMetaDescription, countWords, sanitizeHtmlArticle, slugify, stripHtml } from '@/lib/tinh-gon/text';
import { CONTENT_TYPES, getContentTypeDefaultLength } from './options';
import type {
  ContentType,
  SearchIntent,
  SemanticAnalysis,
  VbtArticleConfig,
  VbtStep1State,
  VbtStreamResult,
} from './types';

const VALID_CONTENT_TYPES = new Set<ContentType>(CONTENT_TYPES.map((item) => item.value));
const VALID_INTENTS = new Set<SearchIntent>(['informational', 'navigational', 'commercial', 'transactional']);

export function splitSecondaryKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function cleanUrlList(urls: string[], max = 3): string[] {
  return urls
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, max);
}

export async function crawlText(url: string, maxLength = 2500): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return '';

    const html = await response.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  } catch {
    return '';
  }
}

export async function crawlMany(urls: string[], max = 3): Promise<Array<{ url: string; text: string }>> {
  const cleaned = cleanUrlList(urls, max);
  const results = await Promise.allSettled(
    cleaned.map(async (url) => ({ url, text: await crawlText(url) })),
  );

  return results
    .filter((result): result is PromiseFulfilledResult<{ url: string; text: string }> => result.status === 'fulfilled')
    .map((result) => result.value)
    .filter((item) => item.text.length > 120);
}

export async function fetchGoogleContext(keyword: string, language: string): Promise<string> {
  const data = await fetchGoogleSearchData(keyword, { num: 5, crawl: true, language });
  return data ? buildDataBlock(data) : '';
}

export function extractJsonValue(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }

  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (block) {
    try {
      return JSON.parse(block[1]);
    } catch {
      // continue
    }
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      // continue
    }
  }

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // continue
    }
  }

  return null;
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : fallback;
}

export function fallbackSemantic(input: VbtStep1State, competitorInsights = ''): SemanticAnalysis {
  const secondary = splitSecondaryKeywords(input.secondaryKeywordsRaw);
  const estimatedWordCount = getContentTypeDefaultLength(input.contentType);

  return {
    macroContext: `Chủ đề "${input.keyword}" cần được giải quyết theo search intent, nhu cầu độc giả và độ sâu nội dung phù hợp.`,
    searchIntent: input.contentType === 'review' || input.contentType === 'comparison' ? 'commercial' : 'informational',
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
    semanticKeywords: secondary.length > 0 ? secondary : [`${input.keyword} là gì`, `cách chọn ${input.keyword}`, `${input.keyword} giá bao nhiêu`],
    suggestedContentType: input.contentType,
    estimatedWordCount,
    competitorInsights,
  };
}

export function parseSemanticResponse(text: string, input: VbtStep1State, competitorInsights = ''): SemanticAnalysis {
  const parsed = extractJsonValue(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fallbackSemantic(input, competitorInsights);
  }

  const record = parsed as Record<string, unknown>;
  const searchIntent = VALID_INTENTS.has(record.searchIntent as SearchIntent)
    ? record.searchIntent as SearchIntent
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
    estimatedWordCount: Number(record.estimatedWordCount) || getContentTypeDefaultLength(suggestedContentType),
    competitorInsights: String(record.competitorInsights || competitorInsights || ''),
  };
}

export function buildAnalyzePrompt(input: VbtStep1State, competitorData: string, googleData: string): string {
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

export function buildTitlesPrompt(params: {
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

export function parseTitlesResponse(text: string, keyword: string): string[] {
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

export function buildOutlinePrompt(params: {
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

export function parseOutlineResponse(text: string, keyword: string): string {
  const cleaned = text.replace(/```[\s\S]*?```/g, (block) => block.replace(/```(?:text|html)?/gi, '').replace(/```/g, '')).trim();
  if (/\[h2\]/i.test(cleaned)) return cleaned;

  return [
    `[h2]Tổng quan về ${keyword}[/h2]`,
    `[h2]Tiêu chí quan trọng khi đánh giá ${keyword}[/h2]`,
    `[h2]Cách áp dụng ${keyword} vào thực tế[/h2]`,
    `[h2]Lỗi thường gặp cần tránh[/h2]`,
    `[h2]FAQ về ${keyword}[/h2]`,
  ].join('\n');
}

export function buildVbtWritingPrompt(config: VbtArticleConfig, contextData: string): string {
  const brand = config.step3.brand;
  const seo = {
    mainLink: config.step3.seoMainLink,
    keywordLinks: config.step3.seoKeywordLinks,
    autoBold: config.step3.autoBold,
    footerContent: config.step3.footerContent,
  };
  const semanticMust = config.semantic?.attributeMap
    .filter((item) => item.importance === 'must')
    .map((item) => item.attribute)
    .join(', ');
  const snippetRule =
    SNIPPET_RULES_BY_TONE[config.contentType]
    || SNIPPET_RULES_BY_TONE[config.step3.tone]
    || '';

  return `
Bạn là SEO Writer chuyên nghiệp. Viết bài HTML hoàn chỉnh, hữu ích, tự nhiên - không lộ dấu vết AI.

${SEO_PROMPT_RULES}

${snippetRule ? `${snippetRule}\n` : ''}
THÔNG TIN BÀI VIẾT:
- Keyword chính: ${config.keyword}
- Tiêu đề: ${config.title}
- Loại nội dung: ${config.contentType}
- Topical role: ${config.topicalMapRole}
- Độ dài mục tiêu khoảng: ${config.step3.targetLength} từ
- Ngôn ngữ: ${config.language}
- Giọng văn: ${config.step3.tone}
- Keyword phụ: ${config.secondaryKeywords.join(', ') || 'không có'}
- Image option: ${config.step3.imageOption}

BRAND:
${brand.shopName ? `- Thương hiệu: ${brand.shopName}` : '- Dùng brand mặc định nếu cần.'}
${brand.industry ? `- Ngành hàng: ${brand.industry}` : ''}
${brand.brandAudience ? `- Đối tượng: ${brand.brandAudience}` : ''}
${brand.brandToneNotes ? `- Ghi chú tone: ${brand.brandToneNotes}` : ''}
${brand.brandForbidden ? `- Từ/cụm từ cần tránh: ${brand.brandForbidden}` : ''}
${brand.ctaStandard ? `- CTA chuẩn: ${brand.ctaStandard}` : ''}
${brand.phone || brand.address ? `- Liên hệ/địa chỉ: ${[brand.phone, brand.address].filter(Boolean).join(' - ')}` : ''}

SEMANTIC:
${config.semantic ? `
- Macro context: ${config.semantic.macroContext}
- Search intent: ${config.semantic.searchIntent} (${config.semantic.intentExplanation})
- Must-cover attributes: ${semanticMust || 'không có'}
- Từ khóa semantic: ${config.semantic.semanticKeywords.join(', ')}
- Pain points: ${config.semantic.rppMap.map((item) => `${item.pain} (${item.relevance})`).join(' | ')}
` : '- Không có semantic analysis.'}

DÀN Ý:
${config.outline || 'Không có dàn ý, hãy tự xây dựng cấu trúc phù hợp.'}

DỮ LIỆU BỔ SUNG:
${contextData || 'Không có.'}

SEO ADVANCED:
${seo.mainLink ? `Gắn internal link ${seo.mainLink} vào lần xuất hiện đầu tiên của keyword chính.` : ''}
${seo.keywordLinks ? `Keyword links:\n${seo.keywordLinks}` : ''}
${seo.autoBold !== 'none' ? `Auto-bold mode: ${seo.autoBold}` : ''}
${seo.footerContent ? `Thêm footer content cuối bài:\n${seo.footerContent}` : ''}

Chỉ trả về HTML, không giải thích.
`.trim();
}

function replaceFirstTextOccurrence(html: string, keyword: string, replacement: string): string {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(>[^<]*?)(${escaped})([^<]*?<)`, 'i');
  return html.replace(pattern, `$1${replacement}$3`);
}

export function sanitizeVbtHtml(raw: string, fallbackTitle: string): string {
  return sanitizeHtmlArticle(raw, fallbackTitle)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+on\w+=(["']).*?\1/gi, '')
    .replace(/\s+href=(["'])javascript:[\s\S]*?\1/gi, ' href="#"');
}

export function applySeoOptions(html: string, config: VbtArticleConfig): string {
  let nextHtml = html;
  const keyword = config.keyword.trim();
  const step3 = config.step3;

  if (keyword && step3.seoMainLink.trim()) {
    nextHtml = replaceFirstTextOccurrence(
      nextHtml,
      keyword,
      `<a href="${step3.seoMainLink.trim()}">${keyword}</a>`,
    );
  }

  if (step3.seoKeywordLinks.trim()) {
    const pairs = step3.seoKeywordLinks
      .split(/\n+/)
      .map((line) => line.split('|').map((item) => item.trim()))
      .filter((parts): parts is [string, string] => parts.length >= 2 && Boolean(parts[0]) && /^https?:\/\//i.test(parts[1]));

    for (const [linkKeyword, url] of pairs) {
      nextHtml = replaceFirstTextOccurrence(nextHtml, linkKeyword, `<a href="${url}">${linkKeyword}</a>`);
    }
  }

  if (keyword && (step3.autoBold === 'keyword' || step3.autoBold === 'both')) {
    nextHtml = replaceFirstTextOccurrence(nextHtml, keyword, `<strong>${keyword}</strong>`);
  }

  if (step3.autoBold === 'headings' || step3.autoBold === 'both') {
    nextHtml = nextHtml.replace(/<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi, '<$1$2><strong>$3</strong></$1>');
  }

  if (step3.footerContent.trim()) {
    const footer = step3.footerContent.trim().startsWith('<')
      ? step3.footerContent.trim()
      : `<p>${step3.footerContent.trim()}</p>`;
    nextHtml = nextHtml.replace(/<\/article>\s*$/i, `<section class="brand-footer">${footer}</section></article>`);
  }

  return nextHtml;
}

export function analyzeHumanness(html: string, forbiddenRaw = '') {
  const text = stripHtml(html);
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((item) => item.trim().length > 8);
  const avgSentence = sentences.length ? words.length / sentences.length : 0;
  const paragraphs = html.match(/<p[\s\S]*?<\/p>/gi) || [];
  const longParagraphs = paragraphs.filter((paragraph) => countWords(paragraph) > 90).length;
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
  const score = Math.max(50, Math.min(96, 90 - longParagraphs * 4 - forbiddenFound.length * 6 - (avgSentence > 25 ? 6 : 0) - (!hasVisualBreak ? 4 : 0)));
  const decision = score >= 76 ? 'PUBLISH' : score >= 60 ? 'REVIEW' : 'REWRITE';

  return {
    score,
    decision,
    issues,
    forbiddenFound,
    scoreBreakdown: {
      language_natural: Math.min(25, Math.max(10, Math.round(score * 0.25))),
      structure: Math.min(25, Math.max(10, Math.round(score * 0.25))),
      eeat_signals: Math.min(25, Math.max(10, Math.round(score * 0.24))),
      engagement: Math.min(25, Math.max(10, Math.round(score * 0.26))),
    },
  } as const;
}

export function estimateSemanticScore(html: string, semantic: SemanticAnalysis | null): { score: number; decision: 'OK' | 'NEEDS_FIX' | 'FAIL' } | null {
  if (!semantic) return null;
  const text = stripHtml(html).toLowerCase();
  const must = semantic.attributeMap.filter((item) => item.importance === 'must');
  const semanticKeywords = semantic.semanticKeywords;
  const mustCovered = must.filter((item) => text.includes(item.attribute.toLowerCase().split(/\s+/)[0] || item.attribute.toLowerCase())).length;
  const keywordCovered = semanticKeywords.filter((keyword) => text.includes(keyword.toLowerCase())).length;
  const mustScore = must.length ? (mustCovered / must.length) * 45 : 35;
  const keywordScore = semanticKeywords.length ? (keywordCovered / semanticKeywords.length) * 35 : 25;
  const intentScore = text.includes(semantic.searchIntent) || html.length > 1200 ? 20 : 12;
  const score = Math.round(Math.min(100, mustScore + keywordScore + intentScore));
  const decision = score >= 80 ? 'OK' : score >= 60 ? 'NEEDS_FIX' : 'FAIL';
  return { score, decision };
}

export function buildFallbackArticle(config: VbtArticleConfig): string {
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

export function buildStreamResult(params: {
  config: VbtArticleConfig;
  html: string;
  articleId: string;
  runId: string;
  metaDescription?: string;
}): VbtStreamResult {
  const titleMatch = params.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() || params.config.title;
  const wordCount = countWords(params.html);
  const slug = slugify(title);
  const metaDescription = params.metaDescription || buildMetaDescription(title, params.config.keyword, params.config.semantic?.macroContext);
  const seo = computeSeoChecks({
    title,
    metaDescription,
    html: params.html,
    wordCount,
    keyword: params.config.keyword,
    secondaryKeywords: params.config.secondaryKeywords,
    slug,
    minWordCount: params.config.contentType === 'pillar' ? 2500 : Math.min(800, Math.max(500, Math.round(params.config.step3.targetLength * 0.5))),
  });
  const human = analyzeHumanness(params.html, params.config.step3.brand.brandForbidden);
  const semantic = estimateSemanticScore(params.html, params.config.semantic);

  return {
    articleId: params.articleId,
    runId: params.runId,
    html: params.html,
    title,
    metaDescription,
    slug,
    wordCount,
    seoScore: seo.score,
    humannessScore: human.score,
    decision: human.decision,
    semanticScore: semantic?.score,
    semanticDecision: semantic?.decision,
    issues: human.issues,
    forbiddenFound: human.forbiddenFound,
  };
}

export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function chunkText(value: string, size = 900): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }
  return chunks;
}
