import { computeSeoChecks } from '@/lib/shared/seo-checks';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import { buildMetaDescription, countWords, sanitizeHtmlArticle, slugify, stripHtml } from '@/lib/tinh-gon/text';
import { analyzeHumanness } from '@/lib/tinh-gon/humanness';
import { searchAndCrawl } from './searcher';
import { buildGoogleSearchOutlinePrompt, buildGoogleSearchWritePrompt } from './prompt-builder';
import type { BulkGsConfig, BulkGsProcessResult, BulkGsStep } from './types';

function buildBrandPrompt(config: BulkGsConfig): string {
  return [
    config.brandName ? `Brand: ${config.brandName}` : '',
    config.brandPhone ? `Phone: ${config.brandPhone}` : '',
    config.brandAddress ? `Address: ${config.brandAddress}` : '',
    config.brandCta ? `CTA: ${config.brandCta}` : '',
  ].filter(Boolean).join('\n');
}

function buildVtgsConfig(config: BulkGsConfig, keyword: string) {
  return {
    keyword,
    secondaryKeywords: [],
    imageOption: config.imageOption,
    language: config.language,
    outlineMode: config.outlineMode,
    targetLength: config.targetLength,
    userOutlineText: '',
    aiOutlineObjective: config.aiOutlineObjective || 'basic',
    aiOutlineSize: config.aiOutlineSize || '5_6_h2',
    editedOutline: '',
    tone: config.tone,
    modelId: config.modelId,
    brand: {
      shopName: config.brandName || '',
      brandPronouns: '',
      brandAudience: '',
      brandToneNotes: buildBrandPrompt(config),
      brandForbidden: '',
      brandDesc: '',
      industry: '',
      mainProducts: '',
      phone: config.brandPhone || '',
      address: config.brandAddress || '',
      ctaStandard: config.brandCta || '',
      latitude: '',
      longitude: '',
      openingHours: '',
      priceRange: '',
      selectedProfileId: config.brandSelectedProfileId || '',
    },
    seoAdvanced: {
      mainLink: config.seoInternalLinks || '',
      keywordLinks: config.seoAppendContent || '',
      autoBold: (config.seoAutoBold || 'none') as 'none' | 'keyword' | 'headings' | 'both',
      footerContent: '',
      customSlug: config.seoCustomSlug || '',
      noIndex: Boolean(config.seoNoIndex),
      focusKeyphrase: keyword,
      enableFeaturedSnippet: true,
    },
    searchResultCount: config.searchResultCount,
    crawlMode: config.crawlMode,
    addFreshnessDate: config.addFreshnessDate,
  };
}

export async function processGsKeyword(
  keyword: string,
  config: BulkGsConfig,
  onStep: (step: BulkGsStep, detail: string, progress: number) => void,
): Promise<BulkGsProcessResult> {
  onStep('searching', `Search Google for "${keyword}"`, 18);
  const searchResult = await searchAndCrawl(keyword, {
    searchResultCount: config.searchResultCount,
    crawlMode: config.crawlMode,
    language: config.language,
  });

  onStep('synthesizing', `Collected ${searchResult.sources.length} sources`, 38);
  const vtgsConfig = buildVtgsConfig(config, keyword);
  const model = buildTinhGonModel(config.modelId || 'gemini-flash');

  let outline = '';
  if (config.outlineMode === 'ai_outline') {
    onStep('writing', 'Generate outline from Google context', 52);
    outline = (await model.generateContent(buildGoogleSearchOutlinePrompt(vtgsConfig, searchResult))).response.text().trim();
  }

  onStep('writing', 'Write article from Google Search context', 72);
  const rawHtml = (await model.generateContent(buildGoogleSearchWritePrompt(vtgsConfig, searchResult, outline))).response.text();
  const html = sanitizeHtmlArticle(rawHtml, keyword);
  const title = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || keyword).replace(/<[^>]+>/g, '').trim() || keyword;
  const metaDescription = buildMetaDescription(title, keyword, searchResult.synthesis);
  const wordCount = countWords(html);
  const slug = config.seoCustomSlug?.trim() || slugify(title);

  onStep('scoring', 'Score SEO and humanness', 92);
  const seo = computeSeoChecks({
    title,
    metaDescription,
    html,
    wordCount,
    keyword,
    slug,
    minWordCount: Math.min(800, Math.max(400, Math.round(config.targetLength * 0.75))),
    sourceCount: searchResult.sources.length,
  });
  const humanness = analyzeHumanness(html);

  return {
    title,
    wordCount,
    humanness: humanness.score,
    sourcesCount: searchResult.sources.length,
    searchResult,
    html,
    metaDescription,
    slug,
    seoScore: seo.score,
  };
}
