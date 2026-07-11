import { computeSeoChecks } from '@/lib/shared/seo-checks';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import {
  buildMetaDescription,
  computeKeywordDensity,
  countWords,
  escapeRegExp,
  sanitizeHtmlArticle,
  slugify,
  stripHtml,
} from '@/lib/tinh-gon/text';
import { renderOutlineForPrompt } from '@/lib/viet-theo-dan-bai/outline-parser';
import type { SourceItem } from '@/lib/viet-theo-nguon/types';
import { getBulkFeature, type BulkFeatureId } from './features';
import type { BulkArticleConfig, BulkKeywordItem } from './types';

export interface BulkWriterResult {
  title: string;
  html: string;
  metaDescription: string;
  slug: string;
  wordCount: number;
  humannessScore: number;
  humannessDecision: string;
  keywordDensity: number;
  seoScore: number;
  seoChecks: unknown;
  scoreBreakdown: unknown;
}

function brandPrompt(config: BulkArticleConfig): string {
  const brand = config.brand;
  if (!brand?.shopName && !brand?.brandDesc && !brand?.ctaStandard) return '';

  return `
## Thông tin thương hiệu
- Tên: ${brand.shopName || 'Không cung cấp'}
- Ngành hàng: ${brand.industry || 'Không cung cấp'}
- Mô tả: ${brand.brandDesc || 'Không cung cấp'}
- Đối tượng: ${brand.brandAudience || 'Không cung cấp'}
- Giọng văn/USP: ${brand.brandToneNotes || 'Không cung cấp'}
- Hotline: ${brand.phone || 'Không cung cấp'}
- Địa chỉ/Website: ${brand.address || 'Không cung cấp'}
- CTA: ${brand.ctaStandard || 'Không cung cấp'}
- Sản phẩm chính: ${brand.mainProducts || 'Không cung cấp'}
- Từ cần tránh: ${brand.brandForbidden || 'Không có'}
`.trim();
}

function buildSourcesBlock(sources: SourceItem[] | undefined): string {
  const validSources = (sources ?? []).filter((source) => !source.error && source.content?.trim());
  if (!validSources.length) return '';

  return `
## Nguồn đã thu thập
${validSources
  .slice(0, 5)
  .map((source, index) => {
    const tag = source.isUnique ? 'UNIQUE' : 'DUPLICATE - phải viết lại hoàn toàn';
    return `### Nguồn ${index + 1}: ${source.title || source.url}
URL: ${source.url}
Trạng thái: ${tag}
${source.content.slice(0, 2500)}`;
  })
  .join('\n\n---\n\n')}
`.trim();
}

function buildOutlineBlock(config: BulkArticleConfig): string {
  if (config.featureId === 'dan-bai' && config.parsedHeadings?.length) {
    return `
## Dàn bài bắt buộc
${renderOutlineForPrompt(config.parsedHeadings)}

Tuân thủ đúng thứ tự H2/H3 này. Không thêm heading ngoài dàn bài.
`.trim();
  }

  if (config.outlineMode === 'ai_outline') {
    return `
## Dàn ý
Tự tạo dàn ý phù hợp trước khi viết. Mục tiêu: ${config.aiOutlineObjective}. Kích thước: ${config.aiOutlineSize}.
`.trim();
  }

  if (config.featureId === 'tinh-gon') {
    return `
## Loại bài tinh gọn
Viết theo outline type: ${config.outlineType}. Bố cục ngắn, rõ ý, không lan man.
`.trim();
  }

  return '## Dàn ý\nAI tự chọn bố cục phù hợp nhất với keyword.';
}

function buildFeatureInstruction(featureId: BulkFeatureId, config: BulkArticleConfig): string {
  switch (featureId) {
    case 'smart':
      return `Flow thông minh: phân tích intent, chọn title tốt, tạo outline rồi viết bài ${config.contentType}. Vai trò topical map: ${config.topicalMapRole}. Nguồn dữ liệu: ${config.dataSourceMode}.`;
    case 'tu-khoa':
      return `Flow theo từ khóa: tập trung keyword chính, dùng secondary keywords tự nhiên, tone ${config.tone}.`;
    case 'tinh-gon':
      return `Flow tinh gọn: bài ${config.targetLength} từ, outline type ${config.outlineType}, viết trực tiếp và dễ đọc.`;
    case 'google-search':
      return `Flow Google Search: giả lập tổng hợp từ ${config.searchResultCount} nguồn, crawlMode=${config.crawlMode}, freshness=${config.addFreshnessDate ? 'có' : 'không'}. Nếu không có nguồn thật trong context, phải nêu nội dung ở mức evergreen, không bịa số liệu.`;
    case 'theo-nguon':
      return `Flow theo nguồn: viết dựa trên nguồn URL đã crawl, cấu trúc ${config.structure}, outlineAIType=${config.outlineAIType}. Không copy câu từ nguồn.`;
    case 'dan-bai':
      return `Flow theo dàn bài: dùng outline chung, phương pháp ${config.writeMethod}, tone ${config.tone}.`;
  }
}

function resolveTitle(item: BulkKeywordItem, config: BulkArticleConfig): string {
  if (config.featureId === 'dan-bai' && config.titleMode === 'keyword_as_title' && item.postTitle) {
    return item.postTitle;
  }
  if (config.titleMode === 'keyword_as_title') return item.postTitle || item.keyword;
  return '';
}

function buildPrompt(params: {
  featureId: BulkFeatureId;
  config: BulkArticleConfig;
  item: BulkKeywordItem;
  sources?: SourceItem[];
}): string {
  const { featureId, config, item, sources } = params;
  const feature = getBulkFeature(featureId);
  const forcedTitle = resolveTitle(item, config);
  const secondary = item.secondaryKeywords.length ? item.secondaryKeywords.join(', ') : 'Không có';
  const titleRule = forcedTitle
    ? `Dùng chính xác tiêu đề H1: "${forcedTitle}".`
    : `Tự tạo H1 hấp dẫn, có keyword "${item.keyword}", 50-70 ký tự.`;

  return `
Bạn là Senior SEO Writer. Viết một bài HTML hoàn chỉnh cho hệ thống Content Agent.

## Feature
${feature.title}
${buildFeatureInstruction(featureId, config)}

## Input
- Keyword chính: ${item.keyword}
- Keyword phụ: ${secondary}
- Ngôn ngữ: ${config.language}
- Độ dài mục tiêu: khoảng ${config.targetLength} từ
- Image option: ${config.imageOption}
- ${titleRule}

${brandPrompt(config)}

${buildOutlineBlock(config)}

${buildSourcesBlock(sources)}

## Quy tắc SEO và chất lượng
- Chỉ trả về HTML trong một thẻ <article>.
- Có đúng một <h1>. Dùng <h2>/<h3> rõ ràng.
- Keyword chính xuất hiện tự nhiên trong H1, đoạn đầu, ít nhất một H2 nếu phù hợp.
- Mật độ keyword khoảng 1.0-1.5%, không nhồi keyword.
- Đoạn văn tối đa 4 câu, sau vài đoạn nên có bullet list, bảng hoặc H3.
- Có ít nhất một ví dụ cụ thể, số liệu hoặc tiêu chí thực tế. Không bịa nguồn hay con số nếu không chắc.
- Kết bài có CTA tự nhiên nếu brand có CTA.
- Không thêm markdown fence, CSS, JavaScript hoặc lời giải thích ngoài bài viết.
`.trim();
}

function applySeoPostProcess(html: string, keyword: string, config: BulkArticleConfig): string {
  let result = html;
  const seo = config.seoAdvanced;

  if (seo.autoBold === 'keyword' || seo.autoBold === 'both') {
    result = result.replace(new RegExp(`(${escapeRegExp(keyword)})`, 'i'), '<strong>$1</strong>');
  }

  if (seo.autoBold === 'headings' || seo.autoBold === 'both') {
    result = result.replace(/<(h[23])>(.*?)<\/\1>/gi, '<$1><strong>$2</strong></$1>');
  }

  if (seo.mainLink.trim()) {
    const pattern = new RegExp(`(>[^<]*?)(${escapeRegExp(keyword)})([^<]*?<)`, 'i');
    result = result.replace(pattern, `$1<a href="${seo.mainLink.trim()}" title="${keyword}">$2</a>$3`);
  }

  for (const line of seo.keywordLinks.split('\n')) {
    const [rawKeyword, rawUrl] = line.split('|').map((part) => part?.trim());
    if (!rawKeyword || !rawUrl) continue;
    const pattern = new RegExp(`(${escapeRegExp(rawKeyword)})`, 'i');
    if (result.includes(`href="${rawUrl}"`)) continue;
    result = result.replace(pattern, `<a href="${rawUrl}" title="${rawKeyword}">$1</a>`);
  }

  if (seo.footerContent.trim()) {
    result = result.replace(/<\/article>\s*$/i, `<div class="article-footer">${seo.footerContent.trim()}</div></article>`);
  }

  return result;
}

function extractTitle(html: string, fallback: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return fallback;
  return stripHtml(match[1]) || fallback;
}

export async function generateBulkArticle(params: {
  featureId: BulkFeatureId;
  config: BulkArticleConfig;
  item: BulkKeywordItem;
  sources?: SourceItem[];
  onStep: (step: string, detail: string, progress: number) => void;
}): Promise<BulkWriterResult> {
  const feature = getBulkFeature(params.featureId);
  const model = buildTinhGonModel(params.config.modelId || 'gemini-flash');

  for (const step of feature.steps) {
    if (step.id !== 'writing' && step.id !== 'scoring') {
      params.onStep(step.id, step.label, step.progress);
    }
  }

  params.onStep('writing', 'AI đang viết bài', 70);
  const prompt = buildPrompt(params);
  const aiResult = await model.generateContent(prompt);
  const rawHtml = aiResult.response.text();
  const forcedTitle = resolveTitle(params.item, params.config);
  const sanitized = sanitizeHtmlArticle(rawHtml, forcedTitle || params.item.keyword);
  const html = applySeoPostProcess(sanitized, params.item.keyword, params.config);
  const title = extractTitle(html, forcedTitle || params.item.keyword);
  const wordCount = countWords(html);
  const metaDescription = buildMetaDescription(title, params.item.keyword);
  const slug = slugify(title || params.item.keyword);

  params.onStep('scoring', 'Đang chấm SEO và humanness', 92);
  const keywordDensity = computeKeywordDensity(html, params.item.keyword);
  const humanness = analyzeHumanness(html, undefined, {
    minWords: Math.min(800, Math.max(300, Math.round(params.config.targetLength * 0.6))),
  });
  const seo = computeSeoChecks({
    title,
    metaDescription,
    html,
    wordCount,
    keyword: params.item.keyword,
    secondaryKeywords: params.item.secondaryKeywords,
    slug,
    minWordCount: Math.min(800, Math.max(300, Math.round(params.config.targetLength * 0.6))),
    sourceCount: params.sources?.filter((source) => !source.error).length,
  });

  return {
    title,
    html,
    metaDescription,
    slug,
    wordCount,
    humannessScore: humanness.score,
    humannessDecision: humanness.decision,
    keywordDensity,
    seoScore: seo.score,
    seoChecks: seo.checks,
    scoreBreakdown: {
      humanness,
      keywordDensity,
      featureId: params.featureId,
    },
  };
}
