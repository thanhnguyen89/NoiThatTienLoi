import { buildBrandPrompt } from '@/app/api/pipeline/_context';
import { buildDataBlock } from '@/lib/google-search/prompt-inject';
import { fetchGoogleSearchData } from '@/lib/google-search/search';
import type { GoogleSearchData } from '@/lib/google-search/types';
import { computeSeoChecks } from '@/lib/shared/seo-checks';
import { buildForbiddenList as buildTinhGonForbiddenList } from '@/lib/tinh-gon/forbidden';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import {
  buildOutlineFallback,
  buildOutlinePrompt as buildTinhGonOutlinePrompt,
  extractJsonPayload,
  normalizeOutlinePayload,
} from '@/lib/tinh-gon/outline';
import {
  buildMetaDescription,
  computeKeywordDensity,
  countWords,
  escapeRegExp,
  sanitizeHtmlArticle,
  slugify,
  stripHtml,
} from '@/lib/tinh-gon/text';
import type {
  TinhGonBrandConfig,
  TinhGonConfig,
  TinhGonOutlineData,
  TinhGonOutlineType,
} from '@/lib/tinh-gon/types';
import { buildKeywordWritingPrompt, generateKeywordOutline } from '@/lib/viet-theo-tu-khoa/outline-generator';
import type {
  AiOutlineObjective,
  AiOutlineSize,
  KeywordArticleConfig,
  KeywordSeoLink,
  KeywordTone,
} from '@/lib/viet-theo-tu-khoa/types';
import { buildOutlinePrompt as buildSearchOutlinePrompt, buildSearchWritePrompt } from '@/lib/viet-tu-google-search/prompt-builder';
import type { SearchResult, SearchSource, VtgsConfig } from '@/lib/viet-tu-google-search/types';
import { processGsKeyword } from '@/lib/viet-hang-loat-google-search/processor';
import type { BulkGsConfig } from '@/lib/viet-hang-loat-google-search/types';
import { parseOutline, renderOutlineForPrompt } from '@/lib/viet-theo-dan-bai/outline-parser';
import type { ParsedHeading } from '@/lib/viet-theo-dan-bai/types';
import type { ArticleStructure, ArticleTone, OutlineAIType, SourceConfig, SourceItem } from '@/lib/viet-theo-nguon/types';
import type { BulkFeatureId } from './features';
import type { BulkArticleConfig, BulkKeywordItem, BulkSeoAdvancedConfig } from './types';
import type { BulkWriterResult } from './writer';

type StepReporter = (step: string, detail: string, progress: number) => void;

export interface BulkProcessorResult extends BulkWriterResult {
  trace?: unknown;
}

interface ProcessParams {
  featureId: BulkFeatureId;
  config: BulkArticleConfig;
  item: BulkKeywordItem;
  sources?: SourceItem[];
  onStep: StepReporter;
}

const EMPTY_SEO: BulkSeoAdvancedConfig = {
  mainLink: '',
  keywordLinks: '',
  autoBold: 'none',
  footerContent: '',
};

const KEYWORD_TONES: KeywordTone[] = [
  'seo_basic',
  'seo_focus',
  'seo_extended',
  'seo_longform',
  'seo_nofaq',
  'how_to',
  'listicle',
  'comparison',
  'story',
  'technical',
  'friendly',
  'formal',
  'confident',
  'year_in_title',
  'cooking',
  'random',
];

const AI_OUTLINE_OBJECTIVES: AiOutlineObjective[] = [
  'basic',
  'problem_solution',
  'listicle',
  'comparison',
  'step_by_step',
  'story',
];

const AI_OUTLINE_SIZES: AiOutlineSize[] = ['2_3_h2', '3_4_h2', '5_6_h2', '7_8_h2', '9_10_h2'];

const TINH_GON_OUTLINE_TYPES: TinhGonOutlineType[] = [
  'review_product',
  'how_to_choose',
  'compare',
  'faq',
  'listicle',
  'problem_solution',
  'step_guide',
  'story_brand',
  'use_case',
  'buying_guide',
];

const SOURCE_STRUCTURES: ArticleStructure[] = [
  'auto',
  'inverted_pyramid',
  'storytelling',
  'qa',
  'how_to',
  'pro_con',
  'historical',
  'listicle',
  'profile',
  'review',
];

const SOURCE_TONES: ArticleTone[] = [
  'intimate',
  'formal',
  'friendly',
  'expert',
  'humorous',
  'inspirational',
  'nostalgic',
  'shocking',
  'conversational',
];

const SOURCE_OUTLINE_TYPES: OutlineAIType[] = [
  'h2h3_detail',
  'h2_10',
  'h2_8',
  'h2_6',
  'h2_4',
  'problem',
  'step',
  'compare',
  'story',
];

const STRUCTURE_INSTRUCTIONS: Record<ArticleStructure, string> = {
  auto: 'Choose the structure that best matches the keyword intent.',
  inverted_pyramid: 'Use inverted pyramid: key facts first, details later.',
  storytelling: 'Use a narrative sequence with context, event, consequence, and lesson.',
  qa: 'Use question and answer structure with clear answers.',
  how_to: 'Use step-by-step instructions.',
  pro_con: 'Use pros and cons with a balanced conclusion.',
  historical: 'Use timeline/history structure.',
  listicle: 'Use listicle structure with numbered or clearly separated sections.',
  profile: 'Use profile structure for a person, brand, or organization.',
  review: 'Use review structure with criteria, evidence, pros, cons, and recommendation.',
};

const SOURCE_TONE_INSTRUCTIONS: Record<ArticleTone, string> = {
  intimate: 'Warm, conversational, close to the reader.',
  formal: 'Formal, precise, suitable for business/professional readers.',
  friendly: 'Friendly, easy to read, practical.',
  expert: 'Expert, evidence-led, clear criteria and caveats.',
  humorous: 'Light humor where appropriate, but not childish.',
  inspirational: 'Motivating and positive, while staying factual.',
  nostalgic: 'Soft nostalgic tone without losing clarity.',
  shocking: 'Strong opening and contrast, but no clickbait or fake claims.',
  conversational: 'Natural spoken style, direct and easy to follow.',
};

const DAN_BAI_WRITE_METHODS: Record<string, string> = {
  balance: 'Write balanced sections, avoid over-expanding any single heading, keep the article easy to scan.',
  detail: 'Write deeper explanations for each heading, add examples and practical criteria where useful.',
};

const DAN_BAI_TONES: Record<string, string> = {
  seo_focus: 'SEO-focused, concise, keyword-aware, no stuffing.',
  confident: 'Confident, direct, decisive, practical.',
  friendly: 'Friendly, natural, easy to understand.',
};

function safeSeo(config: BulkArticleConfig): BulkSeoAdvancedConfig {
  return { ...EMPTY_SEO, ...(config.seoAdvanced ?? {}) };
}

function safeBrand(config: BulkArticleConfig) {
  return config.brand ?? {
    shopName: '',
    industry: '',
    brandPronouns: '',
    brandAudience: '',
    brandToneNotes: '',
    brandDesc: '',
    latitude: '',
    longitude: '',
    openingHours: '',
    priceRange: '',
    phone: '',
    address: '',
    brandForbidden: '',
    ctaStandard: '',
    mainProducts: '',
    selectedProfileId: '',
  };
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumber(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBrandConfig(config: BulkArticleConfig): TinhGonBrandConfig | undefined {
  const brand = safeBrand(config);
  const toneNotes = [
    cleanText(brand.brandToneNotes),
    cleanText(brand.brandDesc) ? `Brand description: ${cleanText(brand.brandDesc)}` : '',
    cleanText(brand.phone) ? `Hotline: ${cleanText(brand.phone)}` : '',
    cleanText(brand.address) ? `Address: ${cleanText(brand.address)}` : '',
    cleanText(brand.ctaStandard) ? `CTA: ${cleanText(brand.ctaStandard)}` : '',
    cleanText(brand.mainProducts) ? `Main products: ${cleanText(brand.mainProducts)}` : '',
    cleanText(brand.industry) ? `Industry: ${cleanText(brand.industry)}` : '',
  ].filter(Boolean).join('\n');

  const brandConfig: TinhGonBrandConfig = {
    name: cleanText(brand.shopName) || undefined,
    pronouns: cleanText(brand.brandPronouns) || undefined,
    audience: cleanText(brand.brandAudience) || undefined,
    forbiddenExtra: cleanText(brand.brandForbidden) || undefined,
    description: cleanText(brand.brandDesc) || undefined,
    latitude: toNumber(cleanText(brand.latitude)),
    longitude: toNumber(cleanText(brand.longitude)),
    openingHours: cleanText(brand.openingHours) || undefined,
    priceRange: cleanText(brand.priceRange) || undefined,
    toneNotes: toneNotes || undefined,
  };

  return Object.values(brandConfig).some(Boolean) ? brandConfig : undefined;
}

async function getBrandPrompt(config: BulkArticleConfig): Promise<string> {
  const brandConfig = toBrandConfig(config);
  return buildBrandPrompt(brandConfig);
}

function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function parseSeoKeywordLinks(raw: string): KeywordSeoLink[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [keyword, url] = line.split('|').map((part) => part?.trim());
      return keyword && url ? { keyword, url } : null;
    })
    .filter((item): item is KeywordSeoLink => Boolean(item));
}

function sourceImageOption(imageOption: BulkArticleConfig['imageOption']): SourceConfig['imageOption'] {
  if (imageOption === 'yandex') return 'yandex';
  if (imageOption === 'ai_generated') return 'ai';
  if (imageOption === 'shutterstock') return 'shutterstock';
  return '0';
}

function targetMinWords(config: BulkArticleConfig): number {
  return Math.min(800, Math.max(300, Math.round(Number(config.targetLength || 1200) * 0.6)));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanGeneratedTitle(raw: string, fallback: string): string {
  const title = stripHtml(raw)
    .split('\n')[0]
    .replace(/^["'#\s:-]+/, '')
    .replace(/["'\s]+$/, '')
    .trim();
  return title || fallback;
}

function forceH1(html: string, title: string): string {
  const safeTitle = escapeHtml(title);
  if (/<h1[\s\S]*?<\/h1>/i.test(html)) {
    return html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, `<h1>${safeTitle}</h1>`);
  }
  return html.replace(/<article[^>]*>/i, (match) => `${match}<h1>${safeTitle}</h1>`);
}

function extractTitle(html: string, fallback: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? stripHtml(match[1]) || fallback : fallback;
}

function stripArticleWrapper(html: string): string {
  return html
    .replace(/```html/gi, '')
    .replace(/```/g, '')
    .replace(/<\/?article[^>]*>/gi, '')
    .replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '')
    .trim();
}

function fragmentToHtml(raw: string): string {
  const fragment = stripArticleWrapper(raw);
  if (!fragment) return '';
  if (/<[^>]+>/.test(fragment)) return fragment;
  return fragment
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

function applySeoPostProcess(html: string, keyword: string, config: BulkArticleConfig): string {
  let result = html;
  const seo = safeSeo(config);

  if (seo.autoBold === 'keyword' || seo.autoBold === 'both') {
    result = result.replace(new RegExp(`(${escapeRegExp(keyword)})`, 'i'), '<strong>$1</strong>');
  }

  if (seo.autoBold === 'headings' || seo.autoBold === 'both') {
    result = result.replace(/<(h[23])>(.*?)<\/\1>/gi, '<$1><strong>$2</strong></$1>');
  }

  const mainLink = seo.mainLink.trim();
  if (mainLink) {
    const pattern = new RegExp(`(>[^<]*?)(${escapeRegExp(keyword)})([^<]*?<)`, 'i');
    result = result.replace(pattern, `$1<a href="${mainLink}" title="${keyword}">$2</a>$3`);
  }

  for (const line of seo.keywordLinks.split('\n')) {
    const [rawKeyword, rawUrl] = line.split('|').map((part) => part?.trim());
    if (!rawKeyword || !rawUrl || result.includes(`href="${rawUrl}"`)) continue;
    result = result.replace(new RegExp(`(${escapeRegExp(rawKeyword)})`, 'i'), `<a href="${rawUrl}" title="${rawKeyword}">$1</a>`);
  }

  const footerContent = seo.footerContent.trim();
  if (footerContent) {
    result = result.replace(/<\/article>\s*$/i, `<div class="article-footer">${footerContent}</div></article>`);
  }

  return result;
}

async function generateText(modelId: string, prompt: string): Promise<string> {
  const model = buildTinhGonModel(modelId || 'gemini-flash');
  const response = await model.generateContent(prompt);
  return response.response.text().trim();
}

async function finalizeArticle(params: {
  rawHtml: string;
  config: BulkArticleConfig;
  item: BulkKeywordItem;
  fallbackTitle: string;
  forcedTitle?: string;
  sourceCount?: number;
  trace?: unknown;
}): Promise<BulkProcessorResult> {
  const { config, item, fallbackTitle, forcedTitle, sourceCount, trace } = params;
  const titleForSanitize = forcedTitle || fallbackTitle || item.keyword;
  let html = sanitizeHtmlArticle(params.rawHtml, titleForSanitize);
  if (forcedTitle) html = forceH1(html, forcedTitle);
  html = applySeoPostProcess(html, item.keyword, config);

  const title = forcedTitle || extractTitle(html, titleForSanitize);
  const wordCount = countWords(html);
  const metaDescription = buildMetaDescription(title, item.keyword);
  const slug = slugify(title || item.keyword);
  const keywordDensity = computeKeywordDensity(html, item.keyword);
  const humanness = analyzeHumanness(html, undefined, { minWords: targetMinWords(config) });
  const seo = computeSeoChecks({
    title,
    metaDescription,
    html,
    wordCount,
    keyword: item.keyword,
    secondaryKeywords: item.secondaryKeywords,
    slug,
    minWordCount: targetMinWords(config),
    sourceCount,
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
      featureId: config.featureId,
    },
    trace,
  };
}

function buildKeywordConfig(config: BulkArticleConfig, item: BulkKeywordItem, outline?: string): KeywordArticleConfig {
  const seo = safeSeo(config);
  return {
    keyword: item.keyword,
    secondaryKeywords: item.secondaryKeywords,
    isToplist: false,
    outlineMode: config.outlineMode,
    targetLength: config.targetLength,
    aiOutlineObjective: pick(config.aiOutlineObjective, AI_OUTLINE_OBJECTIVES, 'basic'),
    aiOutlineSize: pick(config.aiOutlineSize, AI_OUTLINE_SIZES, '5_6_h2'),
    resolvedOutline: outline,
    imageOption: config.imageOption,
    language: config.language,
    tone: pick(config.tone, KEYWORD_TONES, 'seo_basic'),
    model: config.modelId,
    seoMainLink: seo.mainLink,
    seoKeywordLinks: parseSeoKeywordLinks(seo.keywordLinks),
    footerContent: seo.footerContent,
    boldMainKeyword: seo.autoBold === 'keyword' || seo.autoBold === 'both',
    boldHeadings: seo.autoBold === 'headings' || seo.autoBold === 'both',
    brandConfig: toBrandConfig(config),
    dataSource: config.dataSourceMode,
  };
}

async function processTuKhoa(params: ProcessParams): Promise<BulkProcessorResult> {
  const { config, item, onStep } = params;
  onStep('outline', 'Prepare keyword outline', 20);
  let keywordConfig = buildKeywordConfig(config, item);
  let outline = '';

  if (config.outlineMode === 'ai_outline') {
    outline = await generateKeywordOutline(keywordConfig);
    keywordConfig = buildKeywordConfig(config, item, outline);
  }

  const brandContext = await getBrandPrompt(config);
  const forcedTitle = config.titleMode === 'keyword_as_title' ? item.postTitle || item.keyword : undefined;
  const titleRule = forcedTitle
    ? `\nRequired H1 title: "${forcedTitle}". Do not change this title.`
    : '\nCreate a compelling H1 title that includes the main keyword.';

  onStep('writing', 'Write article from keyword config', 70);
  const rawHtml = await generateText(
    config.modelId,
    `${brandContext}\n\n${buildKeywordWritingPrompt(keywordConfig, outline)}${titleRule}`,
  );

  onStep('scoring', 'Score SEO and humanness', 92);
  return finalizeArticle({
    rawHtml,
    config,
    item,
    fallbackTitle: item.postTitle || item.keyword,
    forcedTitle,
    trace: { processor: 'tu-khoa', outline },
  });
}

function buildTinhGonConfig(config: BulkArticleConfig, item: BulkKeywordItem): TinhGonConfig {
  return {
    keyword: item.keyword,
    outlineType: pick(config.outlineType, TINH_GON_OUTLINE_TYPES, 'review_product'),
    language: config.language,
    model: config.modelId,
    targetLength: config.targetLength,
    secondaryKeywords: item.secondaryKeywords,
    notes: item.postTitle ? `Preferred title: ${item.postTitle}` : '',
    dataSource: config.dataSourceMode,
    brandConfig: toBrandConfig(config),
  };
}

async function generateTinhGonOutline(config: BulkArticleConfig, item: BulkKeywordItem): Promise<TinhGonOutlineData> {
  const tinhGonConfig = buildTinhGonConfig(config, item);
  try {
    const raw = await generateText(config.modelId, buildTinhGonOutlinePrompt(tinhGonConfig));
    const outline = normalizeOutlinePayload(extractJsonPayload(raw), tinhGonConfig);
    if (config.titleMode === 'keyword_as_title') {
      return { ...outline, selectedTitle: item.postTitle || item.keyword };
    }
    return outline;
  } catch {
    const outline = buildOutlineFallback(tinhGonConfig);
    return config.titleMode === 'keyword_as_title'
      ? { ...outline, selectedTitle: item.postTitle || item.keyword }
      : outline;
  }
}

function buildTinhGonSectionPrompt(params: {
  config: BulkArticleConfig;
  item: BulkKeywordItem;
  outline: TinhGonOutlineData;
  section: TinhGonOutlineData['sections'][number];
  brandPrompt: string;
  forbiddenList: string[];
  previousHeadings: string[];
}): string {
  const { config, item, outline, section, brandPrompt, forbiddenList, previousHeadings } = params;
  return `
You are writing one section of a concise SEO article.

Article title: ${outline.selectedTitle}
Main keyword: ${item.keyword}
Secondary keywords: ${item.secondaryKeywords.join(', ') || 'none'}
Language: ${config.language}
Target section words: ${section.targetWords}
Article angle: ${outline.angle}
Search intent: ${outline.searchIntent}
Current H2: ${section.heading}
Section notes: ${section.notes || 'none'}
Previous headings already written: ${previousHeadings.join(' | ') || 'none'}

${brandPrompt}

Forbidden words/phrases: ${forbiddenList.join(', ')}

Rules:
- Return HTML fragment only. Do not include <article>, <h1>, or this H2 again.
- Write 2-5 short paragraphs, and add a list/table if useful.
- Use concrete criteria, examples, and practical advice.
- Do not copy generic filler. Do not invent unverifiable facts.
- Keep the main keyword natural, no stuffing.
`.trim();
}

async function processTinhGon(params: ProcessParams): Promise<BulkProcessorResult> {
  const { config, item, onStep } = params;
  onStep('outline', 'Generate concise outline', 25);
  const outline = await generateTinhGonOutline(config, item);
  const brandPrompt = await getBrandPrompt(config);
  const brandConfig = toBrandConfig(config);
  const forbiddenList = buildTinhGonForbiddenList([], brandConfig?.forbiddenExtra);
  const htmlParts = [`<article><h1>${escapeHtml(outline.selectedTitle)}</h1>`];
  const previousHeadings: string[] = [];

  for (const [index, section] of outline.sections.entries()) {
    const progress = Math.min(85, 35 + Math.round(((index + 1) / outline.sections.length) * 45));
    onStep('writing', `Write section ${index + 1}/${outline.sections.length}`, progress);
    const sectionHtml = await generateText(
      config.modelId,
      buildTinhGonSectionPrompt({
        config,
        item,
        outline,
        section,
        brandPrompt,
        forbiddenList,
        previousHeadings,
      }),
    );
    htmlParts.push(`<section><h2>${escapeHtml(section.heading)}</h2>${fragmentToHtml(sectionHtml)}</section>`);
    previousHeadings.push(section.heading);
  }

  htmlParts.push('</article>');
  onStep('scoring', 'Score SEO and humanness', 92);
  return finalizeArticle({
    rawHtml: htmlParts.join(''),
    config,
    item,
    fallbackTitle: outline.selectedTitle,
    forcedTitle: outline.selectedTitle,
    trace: { processor: 'tinh-gon', outline },
  });
}

function buildSourceConfig(config: BulkArticleConfig, item: BulkKeywordItem): SourceConfig {
  const seo = safeSeo(config);
  return {
    keyword: item.keyword,
    secondaryKeywords: item.secondaryKeywords,
    language: config.language,
    outlineMode: config.outlineMode === 'ai_outline' ? 'ai' : 'none',
    outlineAIType: pick(config.outlineAIType, SOURCE_OUTLINE_TYPES, 'h2_6'),
    customOutline: '',
    structure: pick(config.structure, SOURCE_STRUCTURES, 'auto'),
    tone: pick(config.tone, SOURCE_TONES, 'friendly'),
    model: config.modelId,
    targetLength: config.targetLength,
    imageOption: sourceImageOption(config.imageOption),
    seoOptions: {
      mainLink: seo.mainLink,
      keywordLinks: seo.keywordLinks,
      boldKeyword: seo.autoBold === 'keyword' || seo.autoBold === 'both',
      boldHeading: seo.autoBold === 'headings' || seo.autoBold === 'both',
      footerContent: seo.footerContent,
    },
    brandConfig: toBrandConfig(config),
  };
}

function validSources(sources?: SourceItem[]): SourceItem[] {
  return (sources ?? []).filter((source) => !source.error && source.content?.trim());
}

function buildSourcesBlock(sources: SourceItem[]): string {
  return sources
    .slice(0, 5)
    .map((source, index) => {
      const uniqueness = source.isUnique ? 'unique source' : 'duplicate source, rewrite fully';
      return `
Source ${index + 1}: ${source.title || source.url}
URL: ${source.url}
Status: ${uniqueness}
Word count: ${source.wordCount}
Excerpt:
${source.content.slice(0, 3000)}
`.trim();
    })
    .join('\n\n---\n\n');
}

async function generateTheoNguonOutline(config: SourceConfig, sources: SourceItem[]): Promise<string> {
  return generateText(
    config.model,
    `
Create a source-based SEO outline.

Keyword: ${config.keyword}
Language: ${config.language}
Outline type: ${config.outlineAIType}
Structure: ${config.structure}
Target length: ${config.targetLength}
Secondary keywords: ${config.secondaryKeywords.join(', ') || 'none'}

Sources:
${buildSourcesBlock(sources)}

Return plain text outline only. Use [h2] and [h3] tags. Do not copy source wording.
`.trim(),
  );
}

function buildTheoNguonPrompt(params: {
  config: SourceConfig;
  item: BulkKeywordItem;
  sources: SourceItem[];
  outline: string;
  brandPrompt: string;
  forbiddenList: string[];
  forcedTitle?: string;
}): string {
  const { config, item, sources, outline, brandPrompt, forbiddenList, forcedTitle } = params;
  return `
You are a senior source-based SEO writer.

Main keyword: ${config.keyword}
Secondary keywords: ${config.secondaryKeywords.join(', ') || 'none'}
Language: ${config.language}
Target length: about ${config.targetLength} words
Structure: ${STRUCTURE_INSTRUCTIONS[config.structure]}
Tone: ${SOURCE_TONE_INSTRUCTIONS[config.tone]}
${forcedTitle ? `Required H1 title: "${forcedTitle}".` : 'Create a compelling H1 title that includes the main keyword.'}

${brandPrompt}

Forbidden words/phrases: ${forbiddenList.join(', ')}

Sources:
${buildSourcesBlock(sources)}

${outline ? `Required outline:\n${outline}` : 'Create the best outline from the source context.'}

SEO rules:
- Return one complete <article> only.
- Use exactly one <h1>, then clear <h2>/<h3>.
- Rewrite completely. Do not copy source sentences.
- Synthesize across sources, mention source links naturally when useful.
- Include practical examples, criteria, and caveats.
- Use keyword naturally in H1, intro, and at least one H2 if suitable.
- Do not invent data that is not in sources.
- Keyword links config: ${config.seoOptions.keywordLinks || 'none'}
- Footer content: ${config.seoOptions.footerContent || 'none'}
- Current item raw input: ${item.raw}
`.trim();
}

async function processTheoNguon(params: ProcessParams): Promise<BulkProcessorResult> {
  const { config, item, sources, onStep } = params;
  const cleanSources = validSources(sources);
  if (!cleanSources.length) throw new Error('No valid source content for source-based bulk article');

  const sourceConfig = buildSourceConfig(config, item);
  const forcedTitle = config.titleMode === 'keyword_as_title' ? item.postTitle || item.keyword : undefined;
  onStep('outline', 'Prepare source outline', 25);
  const outline = sourceConfig.outlineMode === 'ai' ? await generateTheoNguonOutline(sourceConfig, cleanSources) : '';
  const brandPrompt = await getBrandPrompt(config);
  const forbiddenList = buildTinhGonForbiddenList([], sourceConfig.brandConfig?.forbiddenExtra);

  onStep('writing', 'Write from crawled sources', 72);
  const rawHtml = await generateText(
    sourceConfig.model,
    buildTheoNguonPrompt({
      config: sourceConfig,
      item,
      sources: cleanSources,
      outline,
      brandPrompt,
      forbiddenList,
      forcedTitle,
    }),
  );

  onStep('scoring', 'Score SEO and humanness', 92);
  return finalizeArticle({
    rawHtml,
    config,
    item,
    fallbackTitle: item.postTitle || item.keyword,
    forcedTitle,
    sourceCount: cleanSources.length,
    trace: {
      processor: 'theo-nguon',
      outline,
      sources: cleanSources.map((source) => ({ url: source.url, title: source.title, wordCount: source.wordCount })),
    },
  });
}

function googleToSearchResult(data: GoogleSearchData | null): SearchResult | null {
  if (!data) return null;
  const sources: SearchSource[] = data.items.map((item) => ({
    url: item.link,
    title: item.title,
    snippet: item.snippet,
    content: item.extractedText ?? null,
    crawled: Boolean(item.extractedText),
    wordCount: item.extractedText ? countWords(item.extractedText) : 0,
  }));

  return {
    keyword: data.keyword,
    sources,
    synthesis: sources
      .slice(0, 5)
      .map((source, index) => `${index + 1}. ${source.title}: ${source.snippet}`)
      .join('\n'),
    relatedKeywords: [],
    searchedAt: data.fetchedAt,
  };
}

function buildVtgsConfig(config: BulkArticleConfig, item: BulkKeywordItem): VtgsConfig {
  const seo = safeSeo(config);
  return {
    keyword: item.keyword,
    secondaryKeywords: item.secondaryKeywords,
    imageOption: config.imageOption,
    language: config.language,
    outlineMode: config.outlineMode,
    targetLength: config.targetLength,
    userOutlineText: '',
    aiOutlineObjective: config.aiOutlineObjective || 'basic',
    aiOutlineSize: config.aiOutlineSize || '5_6_h2',
    editedOutline: '',
    tone: config.tone || 'seo_basic',
    modelId: config.modelId,
    brand: safeBrand(config),
    brandConfig: toBrandConfig(config),
    seoAdvanced: {
      ...seo,
      customSlug: '',
      noIndex: false,
      focusKeyphrase: item.keyword,
      enableFeaturedSnippet: true,
    },
    searchResultCount: config.searchResultCount,
    crawlMode: config.crawlMode,
    addFreshnessDate: Boolean(config.addFreshnessDate),
  };
}

async function processGoogleSearch(params: ProcessParams): Promise<BulkProcessorResult> {
  const { config, item, onStep } = params;
  const result = await processGsKeyword(
    item.keyword,
    {
      keywords: [item.keyword],
      duplicateMode: 'allow',
      searchResultCount: config.searchResultCount,
      crawlMode: config.crawlMode,
      addFreshnessDate: config.addFreshnessDate,
      imageOption: config.imageOption,
      imageCount: config.imageCount,
      language: config.language,
      outlineMode: config.outlineMode === 'ai_outline' ? 'ai_outline' : 'no_outline',
      targetLength: config.targetLength,
      aiOutlineObjective: config.aiOutlineObjective,
      aiOutlineSize: config.aiOutlineSize,
      tone: config.tone,
      modelId: config.modelId,
      brandName: config.brand.shopName,
      brandPhone: config.brand.phone,
      brandAddress: config.brand.address,
      brandCta: config.brand.ctaStandard,
      brandSelectedProfileId: config.brand.selectedProfileId,
      seoInternalLinks: config.seoAdvanced.mainLink,
      seoAppendContent: config.seoAdvanced.keywordLinks,
      seoAutoBold: config.seoAdvanced.autoBold,
    } satisfies BulkGsConfig,
    onStep as (step: string, detail: string, progress: number) => void,
  );

  return {
    title: result.title,
    html: result.html,
    metaDescription: result.metaDescription,
    slug: result.slug,
    wordCount: result.wordCount,
    humannessScore: result.humanness,
    humannessDecision: result.humanness >= 76 ? 'PUBLISH' : result.humanness >= 60 ? 'REVIEW' : 'REWRITE',
    keywordDensity: 0,
    seoScore: result.seoScore,
    seoChecks: [],
    scoreBreakdown: {},
    trace: {
      processor: 'google-search',
      search: result.searchResult,
    },
  };
}

function buildDanBaiPrompt(params: {
  config: BulkArticleConfig;
  item: BulkKeywordItem;
  headings: ParsedHeading[];
  brandPrompt: string;
  forcedTitle?: string;
}): string {
  const { config, item, headings, brandPrompt, forcedTitle } = params;
  const method = DAN_BAI_WRITE_METHODS[config.writeMethod] ?? DAN_BAI_WRITE_METHODS.balance;
  const tone = DAN_BAI_TONES[config.tone] ?? DAN_BAI_TONES.seo_focus;
  return `
You are a senior SEO writer. Write an article from the fixed outline.

Main keyword: ${item.keyword}
Secondary keywords: ${item.secondaryKeywords.join(', ') || 'none'}
Language: ${config.language}
Target length: about ${config.targetLength} words
Writing method: ${method}
Tone: ${tone}
${forcedTitle ? `Required H1 title: "${forcedTitle}".` : 'Create a compelling H1 title that includes the main keyword.'}

${brandPrompt}

Required outline:
${renderOutlineForPrompt(headings)}

Rules:
- Return one complete <article> only.
- Follow the exact H2/H3 order. Do not add new heading levels outside the outline.
- Expand every H2 and H3 with useful content, examples, criteria, and practical details.
- Use the main keyword naturally in intro and headings where suitable.
- Do not write generic filler or fake facts.
- Keep paragraphs short and readable.
`.trim();
}

async function processDanBai(params: ProcessParams): Promise<BulkProcessorResult> {
  const { config, item, onStep } = params;
  const headings = config.parsedHeadings?.length ? config.parsedHeadings : parseOutline(config.sharedOutline);
  if (!headings.length) throw new Error('Outline is required for bulk outline writing');

  const forcedTitle = config.titleMode === 'keyword_as_title' ? item.postTitle || item.keyword : undefined;
  const brandPrompt = await getBrandPrompt(config);
  onStep('writing', 'Write from fixed outline', 72);
  const rawHtml = await generateText(
    config.modelId,
    buildDanBaiPrompt({
      config,
      item,
      headings,
      brandPrompt,
      forcedTitle,
    }),
  );

  onStep('scoring', 'Score SEO and humanness', 92);
  return finalizeArticle({
    rawHtml,
    config,
    item,
    fallbackTitle: item.postTitle || item.keyword,
    forcedTitle,
    trace: { processor: 'dan-bai', outline: renderOutlineForPrompt(headings), headings },
  });
}

async function processSmart(params: ProcessParams): Promise<BulkProcessorResult> {
  const { config, item, onStep } = params;
  let googleData: GoogleSearchData | null = null;
  if (config.dataSourceMode === 'google_search') {
    onStep('analysis', 'Fetch Google context for semantic analysis', 12);
    googleData = await fetchGoogleSearchData(item.keyword, {
      num: Math.min(config.searchResultCount || 5, 10) as 3 | 5 | 10,
      crawl: config.crawlMode === 'auto',
      language: config.language,
    });
  }

  const dataBlock = googleData ? buildDataBlock(googleData) : '';
  const brandPrompt = await getBrandPrompt(config);

  onStep('analysis', 'Analyze semantic intent', 18);
  const semantic = await generateText(
    config.modelId,
    `
Analyze the semantic intent for a Vietnamese SEO article.
Keyword: ${item.keyword}
Secondary keywords: ${item.secondaryKeywords.join(', ') || 'none'}
Content type: ${config.contentType}
Topical map role: ${config.topicalMapRole}
Language: ${config.language}

${dataBlock}

Return concise bullet points: intent, audience, angle, must-cover entities, risks to avoid.
`.trim(),
  );

  onStep('outline', 'Create title and outline', 35);
  const titleRaw = await generateText(
    config.modelId,
    `
Create one high-CTR SEO H1 title.
Keyword: ${item.keyword}
Language: ${config.language}
Semantic analysis:
${semantic}

Return title only. No quotes, no markdown.
`.trim(),
  );
  const title = cleanGeneratedTitle(titleRaw, item.postTitle || item.keyword);
  const outline = await generateText(
    config.modelId,
    `
Create a complete SEO outline.
Title: ${title}
Keyword: ${item.keyword}
Secondary keywords: ${item.secondaryKeywords.join(', ') || 'none'}
Target length: ${config.targetLength}
Content type: ${config.contentType}
Semantic analysis:
${semantic}

Return plain text outline using [h2] and [h3] tags.
`.trim(),
  );

  onStep('writing', 'Write smart bulk article', 72);
  const rawHtml = await generateText(
    config.modelId,
    `
You are a senior SEO writer. Write the final article.

Required H1 title: "${title}"
Keyword: ${item.keyword}
Secondary keywords: ${item.secondaryKeywords.join(', ') || 'none'}
Language: ${config.language}
Tone: ${config.tone}
Target length: about ${config.targetLength} words

${brandPrompt}

Semantic analysis:
${semantic}

${dataBlock}

Required outline:
${outline}

Rules:
- Return one complete <article> only.
- Use exactly one H1, then H2/H3.
- Add practical examples, criteria, and concise explanations.
- Use keyword naturally, no stuffing.
- Include lists/tables/FAQ when useful.
- Do not invent unverifiable facts.
`.trim(),
  );

  onStep('scoring', 'Score SEO and humanness', 92);
  return finalizeArticle({
    rawHtml,
    config,
    item,
    fallbackTitle: title,
    forcedTitle: title,
    sourceCount: googleData?.items.length ?? 0,
    trace: {
      processor: 'smart',
      semantic,
      title,
      outline,
      googleFetchedAt: googleData?.fetchedAt ?? null,
    },
  });
}

export async function processBulkArticleVariant(params: ProcessParams): Promise<BulkProcessorResult> {
  switch (params.featureId) {
    case 'tu-khoa':
      return processTuKhoa(params);
    case 'tinh-gon':
      return processTinhGon(params);
    case 'google-search':
      return processGoogleSearch(params);
    case 'theo-nguon':
      return processTheoNguon(params);
    case 'dan-bai':
      return processDanBai(params);
    case 'smart':
    default:
      return processSmart(params);
  }
}
