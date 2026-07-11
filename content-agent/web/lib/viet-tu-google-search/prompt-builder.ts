import type { SearchResult, VtgsConfig } from './types';

const SEO_PROMPT_RULES = `
Core rules:
1. Return HTML fragment only. No markdown fence, no explanations.
2. Start with one H1 containing the main keyword.
3. First paragraph must include the main keyword naturally.
4. Use H2/H3, short paragraphs, lists, tables, FAQ, and at least one trusted external source link.
5. Keep keyword density around 1.0-1.5% without stuffing.
6. Add a table of contents after the intro for articles above 1200 words.
7. Paragraphs should stay under 4 sentences; break long text with H3, ul, ol, or table.
8. Add one FAQ section near the end using HTML.
9. If a brand CTA is provided, use it naturally in the conclusion.
10. Do not invent unverifiable facts. If sources are thin, state practical guidance instead.
`.trim();

function buildBrandBlock(config: VtgsConfig): string {
  const brand = config.brandConfig;
  const raw = config.brand;
  const lines = [
    brand?.name || raw.shopName ? `Brand: ${brand?.name || raw.shopName}` : '',
    raw.industry ? `Industry: ${raw.industry}` : '',
    raw.mainProducts ? `Main products: ${raw.mainProducts}` : '',
    raw.brandPronouns ? `Brand pronouns: ${raw.brandPronouns}` : '',
    raw.brandAudience ? `Audience wording: ${raw.brandAudience}` : '',
    raw.phone ? `Phone: ${raw.phone}` : '',
    raw.address ? `Address: ${raw.address}` : '',
    raw.ctaStandard ? `CTA: ${raw.ctaStandard}` : '',
    raw.brandForbidden ? `Forbidden words: ${raw.brandForbidden}` : '',
    brand?.toneNotes ? `Tone notes: ${brand.toneNotes}` : '',
  ].filter(Boolean);

  return lines.length ? `Brand context:\n${lines.join('\n')}` : 'Brand context: use a neutral helpful voice.';
}

function buildSearchContext(searchResult: SearchResult | null): string {
  if (!searchResult || searchResult.sources.length === 0) {
    return 'Search context: no live search context. Write from general knowledge and avoid fresh claims.';
  }

  const sources = searchResult.sources
    .map((source, index) => {
      const content = source.content || source.snippet;
      return [
        `Source ${index + 1}: ${source.title}`,
        `URL: ${source.url}`,
        `Snippet: ${source.snippet}`,
        content ? `Content excerpt: ${content.slice(0, 1600)}` : '',
      ].filter(Boolean).join('\n');
    })
    .join('\n\n---\n\n');

  return `Search synthesis:\n${searchResult.synthesis}\n\nSources:\n${sources}`;
}

function buildOutlineBlock(config: VtgsConfig, finalOutline?: string): string {
  const outline = (finalOutline || config.editedOutline || config.userOutlineText || '').trim();
  if (!outline || config.outlineMode === 'no_outline') {
    return 'Outline: create the best SEO outline from search intent and sources.';
  }

  return `Required outline:\n${outline}`;
}

function buildSeoAdvancedBlock(config: VtgsConfig): string {
  const seo = config.seoAdvanced;
  const lines = [
    seo.mainLink ? `Link first main keyword occurrence to: ${seo.mainLink}` : '',
    seo.keywordLinks ? `Additional keyword links, format keyword | URL:\n${seo.keywordLinks}` : '',
    seo.autoBold !== 'none' ? `Auto bold mode: ${seo.autoBold}` : '',
    seo.footerContent ? `Append this footer/CTA content if relevant:\n${seo.footerContent}` : '',
    seo.focusKeyphrase ? `Focus keyphrase: ${seo.focusKeyphrase}` : '',
    seo.enableFeaturedSnippet ? 'Optimize for featured snippet with definition/list/table block.' : '',
  ].filter(Boolean);

  return lines.length ? `SEO advanced:\n${lines.join('\n')}` : '';
}

export function buildSearchWritePrompt(params: {
  config: VtgsConfig;
  searchResult: SearchResult | null;
  finalOutline?: string;
}): string {
  const { config, searchResult, finalOutline } = params;
  const secondary = config.secondaryKeywords.length ? config.secondaryKeywords.join(', ') : 'none';
  const freshness = config.addFreshnessDate
    ? `Add an article meta line near the top: "Cap nhat: ${new Date().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}".`
    : 'Do not add a freshness meta line unless useful.';

  return `
You are a senior SEO writer. Write a complete article from Google Search context.

Article config:
- Main keyword: ${config.keyword}
- Secondary keywords: ${secondary}
- Language: ${config.language}
- Tone: ${config.tone}
- Target length: about ${config.targetLength} words
- Image option: ${config.imageOption}
- Crawl mode: ${config.crawlMode}
- Freshness: ${freshness}

${buildBrandBlock(config)}

${buildSearchContext(searchResult)}

${buildOutlineBlock(config, finalOutline)}

${buildSeoAdvancedBlock(config)}

${SEO_PROMPT_RULES}

Output must be clean HTML only.
`.trim();
}

export function buildOutlinePrompt(config: VtgsConfig, searchResult?: SearchResult | null): string {
  return `
Create an SEO outline for this article.

Keyword: ${config.keyword}
Language: ${config.language}
Objective: ${config.aiOutlineObjective}
Size: ${config.aiOutlineSize}
Target length: ${config.targetLength} words
Secondary keywords: ${config.secondaryKeywords.join(', ') || 'none'}

${buildSearchContext(searchResult ?? null)}

Return plain text outline using [h2] and [h3] tags, one item per line.
`.trim();
}
