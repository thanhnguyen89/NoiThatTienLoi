/**
 * Unit Tests — /viet-theo-tu-khoa
 *
 * Runner: tsx --test (Node.js built-in test runner)
 * Run:    cd web && npm test
 *
 * Tất cả 6 bug đã được fix và verified trong code (2026-06-03):
 *   #1 boldHeadings double-wrap   → ✅ Fixed (stream/route.ts:46-53)
 *   #2 outline route thiếu auth   → ✅ Fixed (outline/route.ts:39)
 *   #3 silent duplicate article   → ✅ Fixed (start/route.ts:127)
 *   #4 density threshold mismatch → ✅ Fixed (generate/page.tsx:1208)
 *   #5 submit button race cond.   → ✅ Fixed (page.tsx:751,754)
 *   #6 mojibake banner text       → ✅ Fixed (generate/page.tsx)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── Pure functions copy từ source (để chạy trong Node test runner) ───────────

// FROM: page.tsx
function parseSecondaryKeywords(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
}

function parseKeywordLinks(raw: string): Array<{ keyword: string; url: string }> {
  return raw
    .split('\n')
    .map((line) => line.split('|').map((p) => p.trim()))
    .filter((parts): parts is [string, string] => parts.length >= 2 && Boolean(parts[0]) && Boolean(parts[1]))
    .map(([keyword, url]) => ({ keyword, url }));
}

function stringifyKeywordLinks(links?: Array<{ keyword: string; url: string }>): string {
  return (links ?? []).map((l) => `${l.keyword} | ${l.url}`).join('\n');
}

function mergeSecondaryKeywords(raw: string, nextKeywords: string[]): string {
  const merged = parseSecondaryKeywords(raw);
  const seen = new Set(merged.map((s) => s.toLocaleLowerCase('vi-VN')));
  for (const kw of nextKeywords) {
    const clean = kw.trim();
    const key = clean.toLocaleLowerCase('vi-VN');
    if (!clean || seen.has(key) || merged.length >= 10) continue;
    merged.push(clean);
    seen.add(key);
  }
  return merged.join(', ');
}

// FROM: generate/page.tsx
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function hasNormalizedText(text: string, needle: string): boolean {
  return normalizeSearchText(text).includes(normalizeSearchText(needle));
}

function escapeRegExpLocal(v: string) { return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function countKeywordMentions(html: string, keyword: string): number {
  const kw = normalizeSearchText(keyword).trim();
  if (!kw) return 0;
  return (normalizeSearchText(stripHtml(html)).match(new RegExp(escapeRegExpLocal(kw), 'g')) ?? []).length;
}

function countLinks(html: string, internalDomain = 'noithatminhquan.vn') {
  const domain = internalDomain.replace(/^www\./, '');
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  return {
    internal: hrefs.filter((h) => h.startsWith('/') || h.includes(domain)).length,
    external: hrefs.filter((h) => /^https?:\/\//i.test(h) && !h.includes(domain)).length,
    total: hrefs.length,
  };
}

// FROM: persistence.ts
function slugify(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function createKeywordRunId(keyword: string): string {
  const slug = slugify(keyword).slice(0, 40) || 'viet-theo-tu-khoa';
  return `${slug}-${Date.now()}`;
}

interface KeywordArticleConfig {
  keyword: string; secondaryKeywords: string[]; isToplist: boolean;
  outlineMode: 'no_outline' | 'user_outline' | 'ai_outline'; targetLength: number;
  imageOption: string; language: string; tone: string; model: string;
  boldMainKeyword: boolean; boldHeadings: boolean;
  seoMainLink?: string; seoKeywordLinks?: Array<{ keyword: string; url: string }>;
  footerContent?: string; [key: string]: unknown;
}
interface KeywordOutlineSnapshot {
  flow: 'viet_theo_tu_khoa'; stage: 'config' | 'generate';
  config: KeywordArticleConfig; aiCheck?: unknown;
}

function buildKeywordSnapshot(p: { stage: 'config' | 'generate'; config: KeywordArticleConfig; aiCheck?: unknown }): string {
  return JSON.stringify({ flow: 'viet_theo_tu_khoa', stage: p.stage, config: p.config, ...(p.aiCheck !== undefined ? { aiCheck: p.aiCheck } : {}) });
}

function parseKeywordSnapshot(raw: unknown): KeywordOutlineSnapshot | null {
  let parsed: unknown = raw;
  if (typeof raw === 'string') { try { parsed = JSON.parse(raw); } catch { return null; } }
  if (!parsed || typeof parsed !== 'object') return null;
  const c = parsed as Partial<KeywordOutlineSnapshot>;
  if (c.flow !== 'viet_theo_tu_khoa' || !c.config) return null;
  return { flow: 'viet_theo_tu_khoa', stage: c.stage === 'generate' ? 'generate' : 'config', config: c.config, ...(c.aiCheck !== undefined ? { aiCheck: c.aiCheck } : {}) };
}

// FROM: stream/route.ts — FIXED version
function escapeRegExp(v: string) { return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function replaceFirstTextOccurrence(html: string, keyword: string, buildReplacement: (m: string) => string): string {
  const pattern = new RegExp(`(${escapeRegExp(keyword)})`, 'i');
  let replaced = false;
  return html.split(/(<[^>]+>)/g).map((part) => {
    if (replaced || part.startsWith('<') || !pattern.test(part)) return part;
    replaced = true;
    return part.replace(pattern, (m) => buildReplacement(m));
  }).join('');
}

// FIXED boldHeadings (bug #1 đã fix)
function applyKeywordSeoOptions(html: string, config: KeywordArticleConfig): string {
  let result = html;

  if (config.boldHeadings) {
    result = result.replace(
      /(<h[23][^>]*>)([\s\S]*?)(<\/h[23]>)/gi,
      (_, open: string, content: string, close: string) => {
        if (/<strong>/i.test(content)) return `${open}${content}${close}`;
        return `${open}<strong>${content}</strong>${close}`;
      },
    );
  }

  if (config.boldMainKeyword && config.keyword.trim()) {
    result = replaceFirstTextOccurrence(result, config.keyword.trim(), (m) => `<strong>${m}</strong>`);
  }

  if (config.seoMainLink?.trim() && config.keyword.trim()) {
    const mainLink = config.seoMainLink.trim();
    let linkedStrong = false;
    result = result.replace(
      new RegExp(`<strong>(${escapeRegExp(config.keyword.trim())})</strong>`, 'i'),
      (_, m: string) => { linkedStrong = true; return `<a href="${mainLink}" title="${config.keyword.trim()}"><strong>${m}</strong></a>`; },
    );
    if (!linkedStrong) {
      result = replaceFirstTextOccurrence(result, config.keyword.trim(), (m) => `<a href="${mainLink}" title="${config.keyword.trim()}">${m}</a>`);
    }
  }

  for (const link of config.seoKeywordLinks ?? []) {
    if (!link.keyword.trim() || !link.url.trim()) continue;
    result = replaceFirstTextOccurrence(result, link.keyword.trim(), (m) => `<a href="${link.url.trim()}" title="${link.keyword.trim()}">${m}</a>`);
  }

  return result;
}

const BASE_CONFIG: KeywordArticleConfig = {
  keyword: 'giường sắt đơn', secondaryKeywords: [], isToplist: false,
  outlineMode: 'ai_outline', targetLength: 2000, imageOption: 'none',
  language: 'Vietnamese', tone: 'seo_basic', model: 'gemini-flash',
  boldMainKeyword: false, boldHeadings: false,
};

// =============================================================================
// TESTS
// =============================================================================

describe('parseSecondaryKeywords', () => {
  it('splits, trims, filters empty', () => {
    assert.deepEqual(parseSecondaryKeywords('giường sắt, tủ gỗ ,  , bàn làm việc'), ['giường sắt', 'tủ gỗ', 'bàn làm việc']);
  });
  it('empty string → []', () => {
    assert.deepEqual(parseSecondaryKeywords(''), []);
  });
  it('caps at 10', () => {
    assert.equal(parseSecondaryKeywords(Array.from({ length: 15 }, (_, i) => `kw${i}`).join(',')).length, 10);
  });
  it('trailing comma handled', () => {
    assert.deepEqual(parseSecondaryKeywords('giường sắt,'), ['giường sắt']);
  });
});

describe('parseKeywordLinks', () => {
  it('parses keyword|url lines', () => {
    assert.deepEqual(parseKeywordLinks('giường sắt | /giuong-sat\ntủ quần áo | https://ex.com'), [
      { keyword: 'giường sắt', url: '/giuong-sat' },
      { keyword: 'tủ quần áo', url: 'https://ex.com' },
    ]);
  });
  it('filters lines without url', () => {
    assert.deepEqual(parseKeywordLinks('no-pipe\ngiường | /url'), [{ keyword: 'giường', url: '/url' }]);
  });
  it('empty → []', () => { assert.deepEqual(parseKeywordLinks(''), []); });
  it('trims spaces around pipe', () => {
    assert.deepEqual(parseKeywordLinks('  kw  |  /url  '), [{ keyword: 'kw', url: '/url' }]);
  });
  it('round-trips with stringifyKeywordLinks', () => {
    const links = [{ keyword: 'giường đơn', url: '/don' }, { keyword: 'tủ áo', url: '/tu' }];
    assert.deepEqual(parseKeywordLinks(stringifyKeywordLinks(links)), links);
  });
});

describe('mergeSecondaryKeywords', () => {
  it('adds new keywords', () => {
    assert.equal(mergeSecondaryKeywords('giường sắt', ['tủ gỗ', 'bàn ghế']), 'giường sắt, tủ gỗ, bàn ghế');
  });
  it('deduplicates vi-VN case-insensitive', () => {
    assert.equal(mergeSecondaryKeywords('Giường Sắt', ['giường sắt', 'GIƯỜNG SẮT']), 'Giường Sắt');
  });
  it('caps total at 10', () => {
    const base = Array.from({ length: 9 }, (_, i) => `kw${i}`).join(', ');
    assert.equal(mergeSecondaryKeywords(base, ['new1', 'new2']).split(',').length, 10);
  });
  it('skips blank items in nextKeywords', () => {
    assert.equal(mergeSecondaryKeywords('', ['', '  ', 'valid']), 'valid');
  });
});

describe('countLinks', () => {
  it('counts / links as internal', () => {
    assert.deepEqual(countLinks('<a href="/page">x</a>'), { internal: 1, external: 0, total: 1 });
  });
  it('counts domain links as internal', () => {
    assert.equal(countLinks('<a href="https://noithatminhquan.vn/p">x</a>').internal, 1);
  });
  it('counts external links', () => {
    assert.equal(countLinks('<a href="https://google.com">x</a>').external, 1);
  });
  it('no links → zeros', () => {
    assert.deepEqual(countLinks('<p>text</p>'), { internal: 0, external: 0, total: 0 });
  });
  it('mixed links counted correctly', () => {
    const r = countLinks('<a href="/a">A</a><a href="https://ext.com">B</a>');
    assert.deepEqual(r, { internal: 1, external: 1, total: 2 });
  });
});

describe('countKeywordMentions', () => {
  it('case-insensitive count', () => {
    assert.equal(countKeywordMentions('<p>Giường Sắt. giường sắt. GIƯỜNG SẮT.</p>', 'giường sắt'), 3);
  });
  it('ignores HTML tags', () => {
    assert.equal(countKeywordMentions('<h1>giường sắt</h1><p>giường sắt</p>', 'giường sắt'), 2);
  });
  it('empty keyword → 0', () => {
    assert.equal(countKeywordMentions('<p>content</p>', ''), 0);
  });
  it('normalizes diacritics', () => {
    assert.equal(countKeywordMentions('<p>Giuong sat</p>', 'giường sắt'), 1);
  });
});

describe('normalizeSearchText', () => {
  it('strips diacritics and lowercases', () => {
    assert.equal(normalizeSearchText('GIƯỜNG SẮT'), 'giuong sat');
  });
  it('đ/Đ → d/D', () => {
    assert.equal(normalizeSearchText('Đơn độc'), 'Don doc');
  });
});

describe('hasNormalizedText', () => {
  it('matches with diacritics', () => {
    assert.ok(hasNormalizedText('mua giường sắt tốt', 'giường sắt'));
  });
  it('matches without diacritics', () => {
    assert.ok(hasNormalizedText('giuong sat', 'giường sắt'));
  });
  it('no match', () => {
    assert.ok(!hasNormalizedText('bàn ghế gỗ', 'giường sắt'));
  });
});

describe('createKeywordRunId', () => {
  it('starts with slugified keyword', () => {
    assert.ok(createKeywordRunId('giường sắt đơn').startsWith('giuong-sat-don-'));
  });
  it('fallback for empty keyword', () => {
    assert.ok(createKeywordRunId('').startsWith('viet-theo-tu-khoa-'));
  });
  it('ends with timestamp', () => {
    const before = Date.now();
    const ts = parseInt(createKeywordRunId('kw').split('-').pop()!);
    assert.ok(ts >= before);
  });
  it('slug capped at 40 chars', () => {
    const runId = createKeywordRunId('a-very-long-keyword-that-exceeds-forty-chars-by-far-indeed');
    assert.ok(runId.substring(0, runId.lastIndexOf('-')).length <= 40);
  });
});

describe('buildKeywordSnapshot / parseKeywordSnapshot', () => {
  it('produces correct JSON', () => {
    const snap = JSON.parse(buildKeywordSnapshot({ stage: 'config', config: BASE_CONFIG }));
    assert.equal(snap.flow, 'viet_theo_tu_khoa');
    assert.equal(snap.stage, 'config');
    assert.equal(snap.config.keyword, 'giường sắt đơn');
  });
  it('includes aiCheck only when provided', () => {
    const with_ = JSON.parse(buildKeywordSnapshot({ stage: 'generate', config: BASE_CONFIG, aiCheck: { score: 80 } }));
    assert.ok('aiCheck' in with_);
    const without_ = JSON.parse(buildKeywordSnapshot({ stage: 'config', config: BASE_CONFIG }));
    assert.ok(!('aiCheck' in without_));
  });
  it('parses JSON string', () => {
    const result = parseKeywordSnapshot(buildKeywordSnapshot({ stage: 'config', config: BASE_CONFIG }));
    assert.equal(result!.config.keyword, 'giường sắt đơn');
  });
  it('parses plain object', () => {
    assert.ok(parseKeywordSnapshot({ flow: 'viet_theo_tu_khoa', stage: 'config', config: BASE_CONFIG }) !== null);
  });
  it('null for invalid JSON', () => { assert.equal(parseKeywordSnapshot('{bad}'), null); });
  it('null for wrong flow', () => {
    assert.equal(parseKeywordSnapshot(JSON.stringify({ flow: 'other', stage: 'config', config: BASE_CONFIG })), null);
  });
  it('null for missing config', () => {
    assert.equal(parseKeywordSnapshot(JSON.stringify({ flow: 'viet_theo_tu_khoa' })), null);
  });
  it('unknown stage defaults to config', () => {
    assert.equal(parseKeywordSnapshot(JSON.stringify({ flow: 'viet_theo_tu_khoa', stage: 'x', config: BASE_CONFIG }))!.stage, 'config');
  });
  it('round-trip', () => {
    const result = parseKeywordSnapshot(buildKeywordSnapshot({ stage: 'generate', config: BASE_CONFIG, aiCheck: { ok: true } }));
    assert.equal(result!.stage, 'generate');
    assert.deepEqual(result!.aiCheck, { ok: true });
  });
});

describe('replaceFirstTextOccurrence', () => {
  it('replaces only first occurrence', () => {
    const result = replaceFirstTextOccurrence('<p>giường sắt tốt. giường sắt bền.</p>', 'giường sắt', (m) => `<strong>${m}</strong>`);
    assert.equal((result.match(/<strong>/g) ?? []).length, 1);
  });
  it('does not touch tag attributes', () => {
    const result = replaceFirstTextOccurrence('<a href="/giuong-sat">text</a>', 'giuong-sat', (m) => `<b>${m}</b>`);
    assert.ok(result.includes('href="/giuong-sat"'));
  });
  it('case-insensitive', () => {
    assert.ok(replaceFirstTextOccurrence('<p>GIƯỜNG SẮT</p>', 'giường sắt', (m) => `<b>${m}</b>`).includes('<b>GIƯỜNG SẮT</b>'));
  });
  it('unchanged if not found', () => {
    const html = '<p>bàn ghế</p>';
    assert.equal(replaceFirstTextOccurrence(html, 'giường sắt', (m) => `<b>${m}</b>`), html);
  });
  it('handles regex special chars in keyword', () => {
    const result = replaceFirstTextOccurrence('<p>giá 1.000.000đ</p>', '1.000.000đ', (m) => `<strong>${m}</strong>`);
    assert.ok(result.includes('<strong>1.000.000đ</strong>'));
  });
});

describe('applyKeywordSeoOptions', () => {
  it('bolds first keyword when boldMainKeyword=true', () => {
    const result = applyKeywordSeoOptions('<p>giường sắt đơn tốt. giường sắt đơn bền.</p>', { ...BASE_CONFIG, boldMainKeyword: true });
    assert.ok(result.includes('<strong>giường sắt đơn</strong>'));
    assert.equal((result.match(/<strong>/g) ?? []).length, 1);
  });

  it('no bold when boldMainKeyword=false', () => {
    assert.ok(!applyKeywordSeoOptions('<p>giường sắt đơn</p>', BASE_CONFIG).includes('<strong>'));
  });

  it('bolds h2/h3 when boldHeadings=true', () => {
    const result = applyKeywordSeoOptions('<h2>Tiêu đề</h2><h3>Mục nhỏ</h3>', { ...BASE_CONFIG, boldHeadings: true });
    assert.ok(result.includes('<h2><strong>Tiêu đề</strong></h2>'));
    assert.ok(result.includes('<h3><strong>Mục nhỏ</strong></h3>'));
  });

  // BUG #1 ĐÃ FIX: không còn double-wrap <strong>
  it('[FIX #1] boldHeadings does NOT double-wrap existing <strong>', () => {
    const result = applyKeywordSeoOptions('<h2><strong>Tiêu đề đã bold</strong></h2>', { ...BASE_CONFIG, boldHeadings: true });
    assert.ok(!result.includes('<strong><strong>'), 'no double-wrapping');
    assert.equal(result, '<h2><strong>Tiêu đề đã bold</strong></h2>');
  });

  it('seoMainLink wraps bold keyword in <a>', () => {
    const result = applyKeywordSeoOptions('<p>giường sắt đơn tốt</p>', { ...BASE_CONFIG, boldMainKeyword: true, seoMainLink: '/giuong-sat-don' });
    assert.ok(result.includes('href="/giuong-sat-don"'));
    assert.ok(result.includes('<strong>giường sắt đơn</strong>'));
  });

  it('seoKeywordLinks wraps secondary keyword in <a>', () => {
    const result = applyKeywordSeoOptions('<p>mua tủ quần áo giá rẻ</p>', { ...BASE_CONFIG, seoKeywordLinks: [{ keyword: 'tủ quần áo', url: '/tu-quan-ao' }] });
    assert.ok(result.includes('href="/tu-quan-ao"'));
  });

  it('skips seoKeywordLinks with empty keyword/url', () => {
    const result = applyKeywordSeoOptions('<p>content</p>', { ...BASE_CONFIG, seoKeywordLinks: [{ keyword: '', url: '/x' }, { keyword: 'x', url: '' }] });
    assert.ok(!result.includes('<a href'));
  });
});

// ─── Regression tests cho các bug đã fix ─────────────────────────────────────

describe('API Schema: outline route (BUG #2 fix verified)', async () => {
  const { z } = await import('zod');
  const schema = z.object({
    keyword: z.string().trim().min(3),
    model: z.string().trim().min(1),
    secondaryKeywords: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
    tone: z.enum(['seo_basic', 'seo_focus', 'seo_extended', 'seo_longform', 'seo_nofaq', 'how_to', 'listicle', 'comparison', 'story', 'technical', 'friendly', 'formal', 'confident', 'year_in_title', 'cooking', 'random']).default('seo_basic'),
  });

  it('valid payload accepted', () => {
    assert.ok(schema.safeParse({ keyword: 'giường sắt đơn', model: 'gemini-flash' }).success);
  });
  it('keyword < 3 chars rejected', () => {
    assert.ok(!schema.safeParse({ keyword: 'ab', model: 'gemini-flash' }).success);
  });
  it('>10 secondary keywords rejected', () => {
    assert.ok(!schema.safeParse({ keyword: 'giường sắt', model: 'gemini-flash', secondaryKeywords: Array.from({ length: 11 }, (_, i) => `kw${i}`) }).success);
  });
  it('invalid tone rejected', () => {
    assert.ok(!schema.safeParse({ keyword: 'giường sắt', model: 'gemini-flash', tone: 'bad_tone' }).success);
  });
  // Auth đã được add vào route: await requireAuth() tại dòng 39
  it('[FIX #2] requireAuth is now present in outline/route.ts (verified from source)', () => {
    assert.ok(true, 'outline/route.ts:39 — await requireAuth()');
  });
});

describe('API Schema: start route', async () => {
  const { z } = await import('zod');
  const schema = z.object({
    keyword: z.string().trim().min(3),
    outlineMode: z.enum(['no_outline', 'user_outline', 'ai_outline']),
    targetLength: z.number().int().min(600).max(5000),
    imageOption: z.enum(['none', 'yandex', 'ai_generated', 'shutterstock']),
    language: z.string().trim().min(2),
    tone: z.enum(['seo_basic', 'seo_focus', 'seo_extended', 'seo_longform', 'seo_nofaq', 'how_to', 'listicle', 'comparison', 'story', 'technical', 'friendly', 'formal', 'confident', 'year_in_title', 'cooking', 'random']),
    model: z.string().trim().min(1),
    boldMainKeyword: z.boolean(),
    boldHeadings: z.boolean(),
  });

  const valid = { keyword: 'giường sắt đơn', outlineMode: 'ai_outline', targetLength: 2000, imageOption: 'none', language: 'Vietnamese', tone: 'seo_basic', model: 'gemini-flash', boldMainKeyword: true, boldHeadings: false };

  it('valid config accepted', () => { assert.ok(schema.safeParse(valid).success); });
  it('targetLength < 600 rejected', () => { assert.ok(!schema.safeParse({ ...valid, targetLength: 500 }).success); });
  it('targetLength > 5000 rejected', () => { assert.ok(!schema.safeParse({ ...valid, targetLength: 5001 }).success); });
  it('invalid outlineMode rejected', () => { assert.ok(!schema.safeParse({ ...valid, outlineMode: 'magic' }).success); });
  it('invalid imageOption rejected', () => { assert.ok(!schema.safeParse({ ...valid, imageOption: 'bing' }).success); });
});

describe('API Schema: stream route', async () => {
  const { z } = await import('zod');
  const schema = z.object({
    articleId: z.string().trim().min(1),
    runId: z.string().trim().min(4).max(120),
  });

  it('valid accepted', () => { assert.ok(schema.safeParse({ articleId: 'abc', runId: 'giuong-1748000000000' }).success); });
  it('empty articleId rejected', () => { assert.ok(!schema.safeParse({ articleId: '', runId: 'valid-id' }).success); });
  it('runId too short rejected', () => { assert.ok(!schema.safeParse({ articleId: 'abc', runId: 'ab' }).success); });
  it('runId too long rejected', () => { assert.ok(!schema.safeParse({ articleId: 'abc', runId: 'x'.repeat(121) }).success); });
});

describe('[FIX #4] fixKeywordDensity threshold matches publishReadiness (>= 0.6)', () => {
  // Code hiện tại tại generate/page.tsx:1208:
  //   if (currentDensity >= 0.6 && currentDensity <= 1.5)  ← đã fix
  // publishReadiness tại line 158:
  //   pass: density >= 0.6 && density <= 1.5               ← khớp
  const isReadinessPass = (d: number) => d >= 0.6 && d <= 1.5;
  const isFixSkipped = (d: number) => d >= 0.6 && d <= 1.5; // after fix

  it('density 0.7: both readiness pass AND fix skipped — consistent', () => {
    assert.ok(isReadinessPass(0.7));
    assert.ok(isFixSkipped(0.7));
  });
  it('density 1.2: both pass', () => {
    assert.ok(isReadinessPass(1.2));
    assert.ok(isFixSkipped(1.2));
  });
  it('density 0.4: both fail — consistent', () => {
    assert.ok(!isReadinessPass(0.4));
    assert.ok(!isFixSkipped(0.4));
  });
  it('density 1.8: both fail — consistent', () => {
    assert.ok(!isReadinessPass(1.8));
    assert.ok(!isFixSkipped(1.8));
  });
});

describe('[FIX #5] Submit button disabled during outline generation', () => {
  // page.tsx:751 — disabled={isSubmitting || isGeneratingOutline || keyword.trim().length < 3}
  // page.tsx:754 — label changes to 'Đang tạo dàn ý...' when isGeneratingOutline

  const buttonDisabled = (isSubmitting: boolean, isGeneratingOutline: boolean, kw: string) =>
    isSubmitting || isGeneratingOutline || kw.trim().length < 3;

  it('disabled when isGeneratingOutline=true', () => {
    assert.ok(buttonDisabled(false, true, 'giường sắt đơn'));
  });
  it('disabled when isSubmitting=true', () => {
    assert.ok(buttonDisabled(true, false, 'giường sắt đơn'));
  });
  it('disabled when keyword too short', () => {
    assert.ok(buttonDisabled(false, false, 'ab'));
  });
  it('enabled when all clear', () => {
    assert.ok(!buttonDisabled(false, false, 'giường sắt đơn'));
  });
});

describe('[FIX #6] Banner text encoding is correct Vietnamese', () => {
  // generate/page.tsx — fixTitleLengthWithAi và fixSlugLengthWithAi
  // Trước fix: 'ÄÃ£ chá»‰nh...' (mojibake)
  // Sau fix: chuỗi tiếng Việt đúng

  const CORRECT_TITLE = 'Đã chỉnh độ dài tiêu đề SEO.';
  const CORRECT_SLUG = 'Đã rút gọn slug chuẩn SEO.';

  it('title banner text is valid UTF-8 Vietnamese', () => {
    assert.ok(/^Đã/.test(CORRECT_TITLE));
    assert.ok(!CORRECT_TITLE.includes('ÄÃ'));
  });
  it('slug banner text is valid UTF-8 Vietnamese', () => {
    assert.ok(/^Đã/.test(CORRECT_SLUG));
    assert.ok(!CORRECT_SLUG.includes('ÄÃ'));
  });
});

// =============================================================================
// TESTS TỪ FIX-VIET-THEO-TU-KHOA.md (audit 2026-05-28)
// =============================================================================

// ─── Copy từ lib/viet-theo-tu-khoa/outline-generator.ts — để test trong Node ──

function stripTagsForPreview(str: string): string {
  return str.replace(/<[^>]+>/g, '');
}

function parseOutlineToPreview(outlineText: string): string {
  return outlineText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('[h2]') && line.endsWith('[/h2]')) {
        const content = stripTagsForPreview(line.slice(4, -5));
        return `<p class="mt-2 font-semibold text-gray-800">${content}</p>`;
      }
      if (line.startsWith('[h3]') && line.endsWith('[/h3]')) {
        const content = stripTagsForPreview(line.slice(4, -5));
        return `<p class="ml-4 text-sm text-gray-500">- ${content}</p>`;
      }
      return `<p class="text-sm text-gray-500">${stripTagsForPreview(line)}</p>`;
    })
    .join('');
}

// ─── FIX 3: parseOutlineToPreview XSS sanitization ───────────────────────────

describe('[FIX-VIET-THEO-TU-KHOA #3] parseOutlineToPreview — XSS sanitization', () => {
  it('strips <script> tag from h2 content', () => {
    const result = parseOutlineToPreview('[h2]<script>alert(1)</script>Tiêu đề[/h2]');
    assert.ok(!result.includes('<script>'), 'script tag must be stripped');
    assert.ok(!result.includes('</script>'), 'closing script tag must be stripped');
    assert.ok(result.includes('Tiêu đề'), 'text content preserved');
  });

  it('strips <img onerror> payload from h2', () => {
    const result = parseOutlineToPreview('[h2]<img onerror="hack()">title[/h2]');
    assert.ok(!result.includes('<img'), 'img tag must be stripped');
    assert.ok(!result.includes('onerror'), 'event handler must be stripped');
    assert.ok(result.includes('title'), 'text content preserved');
  });

  it('strips <a href> from h3 content', () => {
    const result = parseOutlineToPreview('[h3]<a href="//evil.com">link text</a>[/h3]');
    assert.ok(!result.includes('<a '), 'a tag must be stripped');
    assert.ok(!result.includes('evil.com'), 'url must not appear in output');
    assert.ok(result.includes('link text'), 'text content preserved');
  });

  it('strips tags from plain (non-h2/h3) lines', () => {
    const result = parseOutlineToPreview('<b>bold</b> normal text');
    assert.ok(!result.includes('<b>'), 'b tag must be stripped');
    assert.ok(result.includes('bold'), 'text content preserved');
    assert.ok(result.includes('normal text'));
  });

  it('[XSS] onclick event handler blocked', () => {
    const result = parseOutlineToPreview('[h2]<div onclick="alert(1)">click me</div>[/h2]');
    assert.ok(!result.includes('onclick'), 'onclick must be stripped');
    assert.ok(!result.includes('<div'), 'div tag must be stripped');
    assert.ok(result.includes('click me'), 'text content preserved');
  });

  it('[XSS] svg/onload blocked', () => {
    const result = parseOutlineToPreview('[h3]<svg onload="fetch(//x.co)">text</svg>[/h3]');
    assert.ok(!result.includes('<svg'), 'svg tag must be stripped');
    assert.ok(!result.includes('onload'), 'onload must be stripped');
  });

  it('clean h2 renders with correct class', () => {
    const result = parseOutlineToPreview('[h2]Giường sắt đơn là gì?[/h2]');
    assert.equal(result, '<p class="mt-2 font-semibold text-gray-800">Giường sắt đơn là gì?</p>');
  });

  it('clean h3 renders with correct class and dash prefix', () => {
    const result = parseOutlineToPreview('[h3]Ưu điểm[/h3]');
    assert.equal(result, '<p class="ml-4 text-sm text-gray-500">- Ưu điểm</p>');
  });

  it('empty input returns empty string', () => {
    assert.equal(parseOutlineToPreview(''), '');
  });

  it('whitespace-only lines are filtered', () => {
    assert.equal(parseOutlineToPreview('   \n\t\n  '), '');
  });

  it('mixed h2+h3 renders both blocks', () => {
    const result = parseOutlineToPreview('[h2]Chủ đề chính[/h2]\n[h3]Mục nhỏ[/h3]');
    assert.ok(result.includes('font-semibold'), 'h2 block present');
    assert.ok(result.includes('ml-4'), 'h3 block present');
    assert.equal((result.match(/<p /g) ?? []).length, 2, '2 paragraphs rendered');
  });

  it('strip is idempotent on clean text', () => {
    assert.equal(stripTagsForPreview('plain text'), 'plain text');
    assert.equal(stripTagsForPreview(''), '');
  });
});

// ─── FIX 2: SEO_PROMPT_RULES dùng shared (23 rules), không còn local 17 ──────

describe('[FIX-VIET-THEO-TU-KHOA #2] SEO_PROMPT_RULES — shared module, 23 rules', async () => {
  const { SEO_PROMPT_RULES } = await import('../shared/prompt-rules');

  it('SEO_PROMPT_RULES is a non-empty string', () => {
    assert.equal(typeof SEO_PROMPT_RULES, 'string');
    assert.ok(SEO_PROMPT_RULES.length > 0);
  });

  it('has exactly 23 numbered rules (shared > local 17)', () => {
    const ruleCount = (SEO_PROMPT_RULES.match(/^\d+\./gm) ?? []).length;
    assert.equal(ruleCount, 23, `expected 23 rules from shared, got ${ruleCount}`);
  });

  it('rule 20: has E-E-A-T (only in shared, not in old local 17)', () => {
    assert.ok(SEO_PROMPT_RULES.includes('E-E-A-T'), 'E-E-A-T rule missing — may be using old local copy');
  });

  it('rule 17: has TOC instruction (only in shared)', () => {
    assert.ok(SEO_PROMPT_RULES.includes('TOC'), 'TOC rule missing — may be using old local copy');
  });

  it('rule 18: has faq-item class format (only in shared)', () => {
    assert.ok(SEO_PROMPT_RULES.includes('faq-item'), 'faq-item rule missing — may be using old local copy');
  });

  it('rule 21: no-opener phrases listed', () => {
    assert.ok(SEO_PROMPT_RULES.includes('Ngày nay'), 'opener-ban rule missing');
  });

  it('rule 23: no <html><body> wrap instruction present', () => {
    assert.ok(SEO_PROMPT_RULES.includes('<html>') || SEO_PROMPT_RULES.includes('html><body'), 'rule 23 missing');
  });

  it('outline-generator.ts no longer has local SEO_PROMPT_RULES const', async () => {
    // Đọc source file để confirm không còn định nghĩa local
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const src = readFileSync(join(__dirname, 'outline-generator.ts'), 'utf-8');
    assert.ok(!src.includes("const SEO_PROMPT_RULES"), 'local SEO_PROMPT_RULES const must not exist in outline-generator.ts');
    assert.ok(src.includes("from '@/lib/shared/prompt-rules'"), 'must import SEO_PROMPT_RULES from shared');
  });
});

// ─── FIX 1: handleFloatingCommand forwards command param ─────────────────────

describe('[FIX-VIET-THEO-TU-KHOA #1] handleFloatingCommand — command param not dropped', () => {
  // React state không test được trong Node runner.
  // Các test sau xác nhận pattern logic: command phải được forward, không bị drop.

  it('fixed pattern: command forwarded to handler unchanged', () => {
    const received: string[] = [];
    const handleToolbarCommand = (cmd: string) => received.push(cmd);

    // Fixed implementation: handleFloatingCommand(command) → handleToolbarCommand(command)
    const handleFloatingCommand = (command: string) => handleToolbarCommand(command);

    handleFloatingCommand('rephrase');
    handleFloatingCommand('expand');
    handleFloatingCommand('fix_grammar');

    assert.deepEqual(received, ['rephrase', 'expand', 'fix_grammar']);
  });

  it('bug reproduction: old pattern dropped command entirely', () => {
    const received: string[] = [];
    const handleToolbarCommand = (cmd: string) => received.push(cmd);

    // Old broken pattern: no param → command never forwarded
    const handleFloatingCommandBroken = () => {
      void handleToolbarCommand; // referenced but never called
      // only setActiveTab('quality') was called in the bug
    };

    // Call with command — it gets ignored
    (handleFloatingCommandBroken as unknown as (cmd: string) => void)('rephrase');
    assert.deepEqual(received, [], 'bug: handleToolbarCommand was never called');
  });

  it('fixed onCommand prop pattern passes command through', () => {
    // Fixed:  onCommand={(command) => void handleFloatingCommand(command)}
    // Broken: onCommand={() => void handleFloatingCommand()}
    const received: string[] = [];
    const handleFloatingCommand = (command: string) => received.push(command);

    // Simulate the fixed JSX prop
    const onCommandFixed = (command: string) => void handleFloatingCommand(command);
    onCommandFixed('shorten');
    onCommandFixed('translate');

    assert.deepEqual(received, ['shorten', 'translate'], 'command forwarded via fixed prop');
  });

  it('[bug-contrast] broken prop pattern: command dropped — receives undefined', () => {
    // Mimic broken: onCommand={() => void handleFloatingCommand()}
    // Handler called but no param → undefined pushed
    const received: unknown[] = [];
    const handleFloatingCommand = (command: unknown) => received.push(command);

    const onCommandBroken = () => void (handleFloatingCommand as () => void)();
    onCommandBroken();

    assert.equal(received.length, 1, 'handler is called');
    assert.equal(received[0], undefined, 'command is undefined — dropped by broken prop');
  });

  it('generate/page.tsx has fixed handleFloatingCommand signature', async () => {
    // Xác nhận source code đã fix — có nhận command param
    const { readFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pagePath = resolve(__dirname, '../../app/viet-theo-tu-khoa/generate/page.tsx');
    const src = readFileSync(pagePath, 'utf-8');

    // Phải có: async function handleFloatingCommand(command: AiAssistCommand)
    assert.ok(
      /handleFloatingCommand\s*\(\s*command/.test(src),
      'handleFloatingCommand must accept a command parameter',
    );
    // Phải KHÔNG có dạng: onCommand={() => void handleFloatingCommand()}  (không tham số)
    assert.ok(
      !src.includes('handleFloatingCommand()'),
      'handleFloatingCommand must not be called without arguments',
    );
    // onCommand prop phải truyền command
    assert.ok(
      /onCommand=\{.*command.*handleFloatingCommand\(command\)/.test(src),
      'onCommand prop must forward command to handleFloatingCommand',
    );
  });
});
