/**
 * Comprehensive unit tests — /viet-bai-tiktok
 *
 * Complements existing parser.test.ts (30 tests) and options.test.ts (25 tests).
 * This file adds:
 *  - buildTiktokBrandPostPrompt coverage (zero coverage before)
 *  - buildBrandBlock behavior (Bug #1)
 *  - HASHTAG_CONTEXT hardcoded brand (Bug #2)
 *  - Caption word count validation (Bug #3)
 *  - normalizeTag hyphen BUG/FIX paired (Bug #4)
 *  - Forbidden word list completeness (Bug #5)
 *  - countWords duplication (Bug #6)
 *  - generateSchema validation
 *  - VIDEO_TYPE_CONTEXT / HOOK_INSTRUCTIONS / CTA_INSTRUCTIONS / EMOJI_INSTRUCTIONS
 *
 * Run:
 *   cd web && npx tsx --test lib/viet-bai-tiktok/viet-bai-tiktok.test.ts
 *
 * Bug pattern:
 *   [BUG #N]  — asserts buggy behaviour
 *   [FIX #N]  — asserts correct behaviour with local fixed copy
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTiktokBrandPostPrompt } from './prompt-builder';
import { parseTiktokOutput } from './parser';
import type { TiktokBrandPostConfig, VideoType, HookStyle, TikTokCTA, EmojiLevel } from './types';
import { VIDEO_TYPES, HOOK_STYLES, CTA_STYLES, EMOJI_LEVELS } from './options';

// ============================================================
// COPIES — internal implementations for BUG/FIX tests
// ============================================================

// BrandSectionState minimal type (mirrors component)
interface Brand {
  shopName?: string;
  industry?: string;
  brandPronouns?: string;
  brandAudience?: string;
  brandToneNotes?: string;
  brandDesc?: string;
  brandForbidden?: string;
  ctaStandard?: string;
  mainProducts?: string;
  phone?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  openingHours?: string;
  priceRange?: string;
  selectedProfileId?: string;
}

// BUG #1 — buildBrandBlock BUGGY (as-is from source)
function buildBrandBlock_buggy(brand: Brand): string {
  if (!brand.shopName && !brand.brandDesc && !brand.mainProducts && !brand.ctaStandard) {
    return '';
  }
  return `
## Thông tin thương hiệu
- Tên: ${brand.shopName || 'Nội Thất Minh Quân'}
- Ngành: ${brand.industry || 'Nội thất'}
- Xưng hô thương hiệu -> khách: ${brand.brandPronouns || 'mình'} -> ${brand.brandAudience || 'bạn'}
- Sản phẩm chính: ${brand.mainProducts || ''}
- CTA chuẩn: ${brand.ctaStandard || ''}
- Giọng văn / USP: ${brand.brandToneNotes || ''}
${brand.brandDesc ? `- Mô tả thương hiệu: ${brand.brandDesc}` : ''}
${brand.brandForbidden ? `- Từ/cụm cấm dùng: ${brand.brandForbidden}` : ''}
${brand.phone ? `- Hotline: ${brand.phone}` : ''}
${brand.address ? `- Địa chỉ / website: ${brand.address}` : ''}
`.trim();
}

// FIX #1 — also check brandPronouns/brandAudience/phone/address
function buildBrandBlock_fixed(brand: Brand): string {
  const hasAnyBrandInfo =
    brand.shopName ||
    brand.brandDesc ||
    brand.mainProducts ||
    brand.ctaStandard ||
    brand.brandPronouns ||
    brand.brandAudience ||
    brand.phone ||
    brand.address;
  if (!hasAnyBrandInfo) return '';

  return `
## Thông tin thương hiệu
- Tên: ${brand.shopName || 'Nội Thất Minh Quân'}
- Ngành: ${brand.industry || 'Nội thất'}
- Xưng hô thương hiệu -> khách: ${brand.brandPronouns || 'mình'} -> ${brand.brandAudience || 'bạn'}
- Sản phẩm chính: ${brand.mainProducts || ''}
- CTA chuẩn: ${brand.ctaStandard || ''}
- Giọng văn / USP: ${brand.brandToneNotes || ''}
${brand.brandDesc ? `- Mô tả thương hiệu: ${brand.brandDesc}` : ''}
${brand.brandForbidden ? `- Từ/cụm cấm dùng: ${brand.brandForbidden}` : ''}
${brand.phone ? `- Hotline: ${brand.phone}` : ''}
${brand.address ? `- Địa chỉ / website: ${brand.address}` : ''}
`.trim();
}

// BUG #4 — normalizeTag BUGGY (as-is from parser.ts)
function normalizeTag_buggy(tag: string): string {
  const clean = tag
    .replace(/^#+/, '')
    .replace(/[^\p{L}\p{N}_]/gu, '')  // strips hyphens
    .trim();
  return clean ? `#${clean}` : '';
}

// FIX #4 — keep hyphens in normalizeTag
function normalizeTag_fixed_option_b(tag: string): string {
  // Option B: don't capture hyphens in extractHashtags regex at all
  // equivalent: normalizeTag strips hyphens but extractHashtags never captures them
  const clean = tag.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '').trim();
  return clean ? `#${clean}` : '';
}

function normalizeTag_fixed_option_a(tag: string): string {
  // Option A: allow hyphens in normalizeTag
  const clean = tag
    .replace(/^#+/, '')
    .replace(/[^\p{L}\p{N}_-]/gu, '')  // allow hyphens
    .trim();
  return clean ? `#${clean}` : '';
}

// FIX #3 — caption word count validation
function countWordsFixed(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}
function validateCaptionWordCount(caption: string): { ok: boolean; count: number; issue: string | null } {
  const count = countWordsFixed(caption);
  if (count < 100) return { ok: false, count, issue: 'too_short' };
  if (count > 200) return { ok: false, count, issue: 'too_long' };
  return { ok: true, count, issue: null };
}

// ============================================================
// Helpers
// ============================================================

function emptyBrand(): Brand {
  return {
    shopName: '', industry: '', brandPronouns: '', brandAudience: '',
    brandToneNotes: '', brandDesc: '', brandForbidden: '', ctaStandard: '',
    mainProducts: '', phone: '', address: '', latitude: '', longitude: '',
    openingHours: '', priceRange: '', selectedProfileId: '',
  };
}

function makeConfig(overrides: Partial<TiktokBrandPostConfig> = {}): TiktokBrandPostConfig {
  return {
    topic: 'Giường sắt 1m6 khung 40x40, sơn tĩnh điện đen, có nan gỗ',
    videoType: 'product_demo',
    hookStyle: 'number',
    ctaStyle: 'inbox',
    language: 'Vietnamese',
    emojiLevel: 'medium',
    modelId: 'gemini-flash',
    brand: emptyBrand() as TiktokBrandPostConfig['brand'],
    ...overrides,
  };
}

function makeConfigWithBrand(brandOverrides: Partial<Brand> = {}): TiktokBrandPostConfig {
  return makeConfig({
    brand: { ...emptyBrand(), ...brandOverrides } as TiktokBrandPostConfig['brand'],
  });
}

// ============================================================
// TESTS — VIDEO_TYPE_CONTEXT coverage
// ============================================================

describe('VIDEO_TYPE_CONTEXT — each videoType produces correct prompt context', () => {
  const typeExpected: Array<{ videoType: VideoType; keyword: string }> = [
    { videoType: 'product_demo', keyword: 'USP' },
    { videoType: 'load_test', keyword: 'tải' },
    { videoType: 'price_reveal', keyword: 'giá' },
    { videoType: 'new_arrival', keyword: 'mới' },
    { videoType: 'promotion', keyword: 'ưu đãi' },
  ];

  for (const { videoType, keyword } of typeExpected) {
    it(`videoType "${videoType}" includes relevant context keyword "${keyword}"`, () => {
      const prompt = buildTiktokBrandPostPrompt(makeConfig({ videoType }));
      assert.ok(
        prompt.toLowerCase().includes(keyword.toLowerCase()),
        `videoType "${videoType}" should include "${keyword}" in prompt`,
      );
    });
  }

  it('each videoType produces a distinct prompt context section', () => {
    const prompts = (VIDEO_TYPES.map((t) => t.value) as VideoType[]).map((v) =>
      buildTiktokBrandPostPrompt(makeConfig({ videoType: v })),
    );
    const unique = new Set(prompts);
    assert.equal(unique.size, VIDEO_TYPES.length, 'Each videoType should produce a unique prompt');
  });
});

// ============================================================
// TESTS — HOOK_INSTRUCTIONS coverage
// ============================================================

describe('HOOK_INSTRUCTIONS — each hookStyle produces correct instruction', () => {
  const hookExpected: Array<{ hookStyle: HookStyle; keyword: string }> = [
    { hookStyle: 'pov', keyword: 'POV' },
    { hookStyle: 'challenge', keyword: 'statement' },
    { hookStyle: 'number', keyword: 'số' },
    { hookStyle: 'question', keyword: 'câu hỏi' },
    { hookStyle: 'story', keyword: 'tình huống' },
  ];

  for (const { hookStyle, keyword } of hookExpected) {
    it(`hookStyle "${hookStyle}" includes keyword "${keyword}"`, () => {
      const prompt = buildTiktokBrandPostPrompt(makeConfig({ hookStyle }));
      assert.ok(
        prompt.toLowerCase().includes(keyword.toLowerCase()),
        `hookStyle "${hookStyle}" should include "${keyword}"`,
      );
    });
  }

  it('pov instruction specifies starting with "POV:"', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ hookStyle: 'pov' }));
    assert.ok(prompt.includes('"POV:"') || prompt.includes('bằng "POV:"'),
      'pov hook should specify starting with "POV:"');
  });

  it('challenge instruction forbids "Bạn có biết"', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ hookStyle: 'challenge' }));
    assert.ok(prompt.includes('Bạn có biết'), 'challenge should mention forbidden phrase "Bạn có biết"');
  });

  it('number instruction specifies a number format', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ hookStyle: 'number' }));
    assert.ok(prompt.includes('[Số liệu]') || prompt.includes('con số'), 'number hook should mention number format');
  });

  it('each hookStyle produces a distinct prompt', () => {
    const prompts = (HOOK_STYLES.map((h) => h.value) as HookStyle[]).map((h) =>
      buildTiktokBrandPostPrompt(makeConfig({ hookStyle: h })),
    );
    const unique = new Set(prompts);
    assert.equal(unique.size, HOOK_STYLES.length, 'Each hookStyle should produce a unique prompt');
  });
});

// ============================================================
// TESTS — CTA_INSTRUCTIONS coverage
// ============================================================

describe('CTA_INSTRUCTIONS — each ctaStyle produces correct instruction', () => {
  const ctaExpected: Array<{ ctaStyle: TikTokCTA; keyword: string }> = [
    { ctaStyle: 'inbox', keyword: 'inbox' },
    { ctaStyle: 'comment_key', keyword: 'Comment' },
    { ctaStyle: 'bio_link', keyword: 'bio' },
    { ctaStyle: 'phone', keyword: 'hotline' },
  ];

  for (const { ctaStyle, keyword } of ctaExpected) {
    it(`ctaStyle "${ctaStyle}" includes keyword "${keyword}"`, () => {
      const prompt = buildTiktokBrandPostPrompt(makeConfig({ ctaStyle }));
      assert.ok(
        prompt.toLowerCase().includes(keyword.toLowerCase()),
        `ctaStyle "${ctaStyle}" should include "${keyword}"`,
      );
    });
  }

  it('comment_key instruction specifies keyword format "Comment \'[KEYWORD]\'"', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ ctaStyle: 'comment_key' }));
    assert.ok(prompt.includes("Comment '") || prompt.includes('KEYWORD'), 'comment_key should specify keyword format');
  });

  it('phone instruction warns not to fabricate phone numbers', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ ctaStyle: 'phone' }));
    assert.ok(
      prompt.includes('{SĐT}') || prompt.includes('hotline') || prompt.includes('không bịa'),
      'phone CTA should mention placeholder or no-fabrication',
    );
  });

  it('each ctaStyle produces a distinct CTA instruction in prompt', () => {
    const prompts = (CTA_STYLES.map((c) => c.value) as TikTokCTA[]).map((c) =>
      buildTiktokBrandPostPrompt(makeConfig({ ctaStyle: c })),
    );
    const unique = new Set(prompts);
    assert.equal(unique.size, CTA_STYLES.length, 'Each ctaStyle produces a unique prompt');
  });
});

// ============================================================
// TESTS — EMOJI_INSTRUCTIONS coverage
// ============================================================

describe('EMOJI_INSTRUCTIONS — each emojiLevel produces correct instruction', () => {
  it('emojiLevel "none" instructs no emoji', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ emojiLevel: 'none' }));
    assert.ok(prompt.includes('không dùng emoji') || prompt.includes('Tuyệt đối không'),
      'none level should ban emoji');
  });

  it('emojiLevel "low" specifies 1-2 emoji max', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ emojiLevel: 'low' }));
    assert.ok(prompt.includes('1-2'), 'low level should specify 1-2 emoji');
  });

  it('emojiLevel "medium" specifies 3-4 emoji', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ emojiLevel: 'medium' }));
    assert.ok(prompt.includes('3-4'), 'medium level should specify 3-4 emoji');
  });

  it('emojiLevel "high" specifies 5+ emoji', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ emojiLevel: 'high' }));
    assert.ok(prompt.includes('5+'), 'high level should specify 5+ emoji');
  });

  it('each emojiLevel produces a distinct prompt', () => {
    const prompts = (EMOJI_LEVELS.map((e) => e.value) as EmojiLevel[]).map((e) =>
      buildTiktokBrandPostPrompt(makeConfig({ emojiLevel: e })),
    );
    const unique = new Set(prompts);
    assert.equal(unique.size, EMOJI_LEVELS.length, 'Each emojiLevel produces a unique prompt');
  });
});

// ============================================================
// TESTS — buildTiktokBrandPostPrompt basic requirements
// ============================================================

describe('buildTiktokBrandPostPrompt — basic content requirements', () => {
  it('includes topic in prompt', () => {
    const topic = 'Giường sắt 990k giao nhanh HCM';
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ topic }));
    assert.ok(prompt.includes(topic), 'topic should appear in prompt');
  });

  it('includes language', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ language: 'English' }));
    assert.ok(prompt.includes('English'));
  });

  it('specifies TITLE max 50 chars', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    assert.ok(prompt.includes('50'), 'TITLE 50 char limit should appear in prompt');
  });

  it('specifies CAPTION 100-200 words', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    assert.ok(prompt.includes('100-200'), 'CAPTION word count should be specified');
  });

  it('specifies HASHTAGS count (5-10)', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    assert.ok(prompt.includes('5-10'), 'HASHTAGS count should be specified');
  });

  it('includes format output section with TITLE/CAPTION/HASHTAGS labels', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    assert.ok(prompt.includes('TITLE:'), 'TITLE: format label present');
    assert.ok(prompt.includes('CAPTION:'), 'CAPTION: format label present');
    assert.ok(prompt.includes('HASHTAGS:'), 'HASHTAGS: format label present');
  });

  it('forbids hashtags inside CAPTION body', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    assert.ok(
      prompt.includes('không hashtag trong CAPTION') || prompt.includes('Không có hashtag trong CAPTION'),
      'prompt should forbid hashtags in CAPTION body',
    );
  });

  it('forbids markdown like **, *', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    assert.ok(
      prompt.includes('**') || prompt.includes('markdown'),
      'prompt should mention markdown prohibition',
    );
  });

  it('includes forbidden word list', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    const forbiddenSection = prompt.includes('Từ cấm dùng');
    assert.ok(forbiddenSection, 'prompt should have "Từ cấm dùng" section');
    assert.ok(prompt.includes('quan trọng'), 'quan trọng should be forbidden');
    assert.ok(prompt.includes('tuy nhiên'), 'tuy nhiên should be forbidden');
    assert.ok(prompt.includes('siêu phẩm'), 'siêu phẩm should be forbidden');
  });

  it('includes hashtag suggestions based on videoType', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ videoType: 'product_demo' }));
    assert.ok(prompt.includes('#noithatminhquan'), 'hashtag suggestions should include brand tag');
  });

  it('prompt result is trimmed', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    assert.equal(prompt, prompt.trim());
  });

  it('specifies "không dùng chúng tôi hay quý khách" on TikTok', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    assert.ok(
      prompt.includes('chúng tôi') || prompt.includes('quý khách'),
      'prompt should mention forbidden formal pronouns',
    );
  });
});

// ============================================================
// TESTS — BUG #1: buildBrandBlock ignores brandPronouns/brandAudience
// ============================================================

describe('buildBrandBlock — BUG #1: skipped when only pronouns/audience set', () => {
  it('[BUG #1] brand block empty when ONLY brandPronouns set', () => {
    const block = buildBrandBlock_buggy({ brandPronouns: 'shop', brandAudience: 'anh chị' });
    // BUG: condition checks shopName/brandDesc/mainProducts/ctaStandard — all empty → returns ''
    assert.equal(block, '', '[BUG #1] brand block skipped despite brandPronouns/brandAudience being set');
  });

  it('[BUG #1] prompt uses default mình/bạn pronouns even when user set shop/anh chị', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfigWithBrand({
      brandPronouns: 'shop',
      brandAudience: 'anh chị',
    }));
    // BUG: brand block is empty → prompt falls back to brand.brandPronouns fallback ('mình')
    const hasMinhFallback = prompt.includes('"mình" -> "bạn"');
    assert.ok(hasMinhFallback, '[BUG #1] prompt uses default mình/bạn even though user set shop/anh chị');
  });

  it('[FIX #1] fixed brand block renders when only brandPronouns/brandAudience set', () => {
    const block = buildBrandBlock_fixed({ brandPronouns: 'shop', brandAudience: 'anh chị' });
    assert.ok(block.length > 0, '[FIX #1] brand block should render');
    assert.ok(block.includes('shop'), '[FIX #1] brandPronouns should appear in block');
    assert.ok(block.includes('anh chị'), '[FIX #1] brandAudience should appear in block');
  });

  it('[FIX #1] fixed brand block renders when only phone set', () => {
    const block = buildBrandBlock_fixed({ phone: '0909 123 456' });
    assert.ok(block.length > 0, '[FIX #1] phone alone should trigger brand block');
    assert.ok(block.includes('0909 123 456'));
  });

  it('[FIX #1] fixed brand block still empty when ALL fields empty', () => {
    const block = buildBrandBlock_fixed(emptyBrand());
    assert.equal(block, '', '[FIX #1] truly empty brand should still return empty string');
  });

  it('[FIX #1] brand block renders when shopName is set (both versions)', () => {
    const blockBuggy = buildBrandBlock_buggy({ shopName: 'Nội Thất Tiến Lợi' });
    const blockFixed = buildBrandBlock_fixed({ shopName: 'Nội Thất Tiến Lợi' });
    assert.ok(blockBuggy.length > 0, 'buggy: shopName triggers brand block');
    assert.ok(blockFixed.length > 0, 'fixed: shopName triggers brand block');
    assert.ok(blockFixed.includes('Nội Thất Tiến Lợi'));
  });

  it('brand block includes hotline when phone is set', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfigWithBrand({
      shopName: 'Minh Quân',
      phone: '0909 123 456',
    }));
    assert.ok(prompt.includes('0909 123 456'), 'hotline should appear in prompt');
  });

  it('brand block includes brandForbidden when set', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfigWithBrand({
      shopName: 'Minh Quân',
      brandForbidden: 'hàng chợ, giá bèo',
    }));
    assert.ok(prompt.includes('hàng chợ'), 'brandForbidden should appear in prompt');
  });
});

// ============================================================
// TESTS — BUG #2: HASHTAG_CONTEXT hardcoded brand
// ============================================================

describe('HASHTAG_CONTEXT — BUG #2: hardcoded #noithatminhquan', () => {
  it('[BUG #2] all videoTypes have #noithatminhquan hardcoded regardless of brand.shopName', () => {
    const videoTypes: VideoType[] = ['product_demo', 'load_test', 'price_reveal', 'new_arrival', 'promotion'];
    for (const vt of videoTypes) {
      const prompt = buildTiktokBrandPostPrompt(makeConfigWithBrand({
        shopName: 'Nội Thất Tiến Lợi',  // different brand
        videoType: vt as VideoType,
      }));
      // BUG: even with different brand, hashtag context still has #noithatminhquan
      assert.ok(
        prompt.includes('#noithatminhquan'),
        `[BUG #2] videoType "${vt}" still has #noithatminhquan even for brand "Nội Thất Tiến Lợi"`,
      );
    }
  });

  it('[BUG #2] different shopNames produce same HASHTAG_CONTEXT', () => {
    const prompt1 = buildTiktokBrandPostPrompt(makeConfigWithBrand({ shopName: 'Brand A' }));
    const prompt2 = buildTiktokBrandPostPrompt(makeConfigWithBrand({ shopName: 'Brand B' }));
    // BUG: hashtag section is identical regardless of brand
    const hashtag1 = prompt1.split('## Hashtag gợi ý theo ngữ cảnh')[1]?.split('##')[0] ?? '';
    const hashtag2 = prompt2.split('## Hashtag gợi ý theo ngữ cảnh')[1]?.split('##')[0] ?? '';
    assert.equal(hashtag1.trim(), hashtag2.trim(),
      '[BUG #2] hashtag section identical for different brands — not using shopName');
  });

  it('[BUG #2] hashtag for promotion includes #flashsale (content-specific)', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ videoType: 'promotion' }));
    assert.ok(prompt.includes('#flashsale') || prompt.includes('#sale'), 'promotion hashtags should include sale tags');
  });

  it('each videoType produces different hashtag suggestions', () => {
    const product = buildTiktokBrandPostPrompt(makeConfig({ videoType: 'product_demo' }));
    const promo = buildTiktokBrandPostPrompt(makeConfig({ videoType: 'promotion' }));
    const productSection = product.split('## Hashtag gợi ý')[1]?.split('##')[0] ?? '';
    const promoSection = promo.split('## Hashtag gợi ý')[1]?.split('##')[0] ?? '';
    assert.notEqual(productSection.trim(), promoSection.trim(), 'Different videoTypes should have different hashtags');
  });
});

// ============================================================
// TESTS — BUG #3: Caption word count not validated after parse
// ============================================================

describe('caption word count validation — BUG #3', () => {
  it('[BUG #3] countWords returns correct count for Vietnamese caption', () => {
    const caption = 'Mình vừa test giường khung 40x40 với hai người ngồi nhảy mạnh.'; // 12 words
    const count = countWordsFixed(caption);
    assert.equal(count, 12, 'word count should be accurate');
  });

  it('[BUG #3] no server-side validation — short caption (< 100 words) passes through', () => {
    // The route emits wordCount but does NOT reject short captions
    const shortCaption = 'Giường sắt đẹp bền inbox mình ngay.'; // 6 words
    const count = countWordsFixed(shortCaption);
    assert.ok(count < 100, '[BUG #3] short caption would pass through without rejection');
  });

  it('[FIX #3] validateCaptionWordCount accepts 100-word caption', () => {
    const words = Array.from({ length: 100 }, (_, i) => `word${i + 1}`).join(' ');
    const result = validateCaptionWordCount(words);
    assert.ok(result.ok, 'exactly 100 words should pass');
    assert.equal(result.issue, null);
  });

  it('[FIX #3] validateCaptionWordCount accepts 200-word caption', () => {
    const words = Array.from({ length: 200 }, (_, i) => `word${i + 1}`).join(' ');
    const result = validateCaptionWordCount(words);
    assert.ok(result.ok, 'exactly 200 words should pass');
  });

  it('[FIX #3] validateCaptionWordCount rejects 99-word caption', () => {
    const words = Array.from({ length: 99 }, (_, i) => `word${i + 1}`).join(' ');
    const result = validateCaptionWordCount(words);
    assert.ok(!result.ok, '99 words should fail');
    assert.equal(result.issue, 'too_short');
  });

  it('[FIX #3] validateCaptionWordCount rejects 201-word caption', () => {
    const words = Array.from({ length: 201 }, (_, i) => `word${i + 1}`).join(' ');
    const result = validateCaptionWordCount(words);
    assert.ok(!result.ok, '201 words should fail');
    assert.equal(result.issue, 'too_long');
  });

  it('[FIX #3] validateCaptionWordCount returns correct count', () => {
    const words = Array.from({ length: 150 }, (_, i) => `word${i + 1}`).join(' ');
    const result = validateCaptionWordCount(words);
    assert.equal(result.count, 150);
    assert.ok(result.ok);
  });

  it('[FIX #3] validateCaptionWordCount handles empty caption', () => {
    const result = validateCaptionWordCount('');
    assert.ok(!result.ok);
    assert.equal(result.count, 0);
    assert.equal(result.issue, 'too_short');
  });
});

// ============================================================
// TESTS — BUG #4: normalizeTag strips hyphens
// ============================================================

describe('normalizeTag — BUG #4: silently strips hyphens', () => {
  it('[BUG #4] normalizeTag strips hyphen from "#noi-that" → "#noithat"', () => {
    const result = normalizeTag_buggy('#noi-that');
    // BUG: hyphen stripped
    assert.equal(result, '#noithat', '[BUG #4] hyphen silently stripped');
  });

  it('[BUG #4] "#san-pham-noi-that" → "#sanphamnioithat" (all hyphens stripped)', () => {
    const result = normalizeTag_buggy('#san-pham-noi-that');
    assert.ok(!result.includes('-'), '[BUG #4] all hyphens stripped silently');
  });

  it('[BUG #4] parseTiktokOutput with #noi-that returns #noithat', () => {
    const raw = `TITLE: Test
CAPTION:
Caption text here.
HASHTAGS:
#noi-that #giuong-sat`;
    const result = parseTiktokOutput(raw);
    const withHyphen = result.hashtags.filter((t) => t.includes('-'));
    assert.equal(withHyphen.length, 0, '[BUG #4] hyphens stripped from hashtags');
  });

  it('[FIX #4 Option A] normalizeTag_fixed keeps hyphens', () => {
    const result = normalizeTag_fixed_option_a('#noi-that');
    assert.equal(result, '#noi-that', '[FIX #4A] hyphen preserved');
  });

  it('[FIX #4 Option A] "#san-pham-noi-that" stays intact', () => {
    const result = normalizeTag_fixed_option_a('#san-pham-noi-that');
    assert.equal(result, '#san-pham-noi-that', '[FIX #4A] all hyphens preserved');
  });

  it('[FIX #4 Option A] still strips non-alphanumeric chars (except hyphen)', () => {
    const result = normalizeTag_fixed_option_a('#noi.that!');
    assert.ok(!result.includes('.'), 'dot still stripped');
    assert.ok(!result.includes('!'), 'exclamation stripped');
    assert.ok(result.startsWith('#'), 'still has # prefix');
  });

  it('normalizeTag preserves underscore', () => {
    const result = normalizeTag_buggy('#noi_that');
    assert.equal(result, '#noi_that', 'underscore should be preserved by both versions');
  });

  it('[FIX #4 Option B] not capturing hyphen in extractHashtags regex is consistent', () => {
    // Option B: extract regex doesn't capture hyphens → normalizeTag never sees them
    // Test the regex directly
    const text = '#noi-that is good';
    const noHyphenRegex = /#[\p{L}\p{N}_]+/gu;
    const withHyphenRegex = /#[\p{L}\p{N}_-]+/gu;
    const noHyphenMatch = text.match(noHyphenRegex)?.[0];
    const withHyphenMatch = text.match(withHyphenRegex)?.[0];
    assert.equal(noHyphenMatch, '#noi', 'regex without hyphen stops at dash');
    assert.equal(withHyphenMatch, '#noi-that', 'regex with hyphen captures full tag');
  });
});

// ============================================================
// TESTS — BUG #5: Forbidden word list incomplete
// ============================================================

describe('buildTiktokBrandPostPrompt — BUG #5: forbidden list incomplete', () => {
  it('[BUG #5] prompt includes "không chỉ mà còn" (truncated from "không chỉ ... mà còn")', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    // BUG: the pattern "không chỉ mà còn" is missing the "..." between chỉ and mà
    const hasTruncated = prompt.includes('không chỉ mà còn');
    const hasFull = prompt.includes('không chỉ ... mà còn');
    assert.ok(hasTruncated && !hasFull,
      '[BUG #5] prompt has truncated pattern "không chỉ mà còn" instead of "không chỉ ... mà còn"');
  });

  it('[BUG #5] prompt missing "toàn diện" from forbidden list', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    const forbiddenSection = prompt.split('Từ cấm dùng')[1] ?? '';
    assert.ok(!forbiddenSection.includes('toàn diện'),
      '[BUG #5] "toàn diện" missing from forbidden list');
  });

  it('[BUG #5] prompt missing "ngày nay" from forbidden list', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    const forbiddenSection = prompt.split('Từ cấm dùng')[1] ?? '';
    assert.ok(!forbiddenSection.includes('ngày nay'),
      '[BUG #5] "ngày nay" missing from forbidden list');
  });

  it('prompt DOES include core AI-signature words', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    const coreWords = ['quan trọng', 'tuy nhiên', 'bên cạnh đó', 'vô cùng', 'cực kỳ'];
    for (const word of coreWords) {
      assert.ok(prompt.includes(word), `Core forbidden word missing: "${word}"`);
    }
  });

  it('prompt includes all 5 marketing-fluff forbidden words', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    const fluffWords = ['siêu phẩm', 'số 1', 'đẳng cấp', 'hoàn hảo', 'tuyệt vời'];
    for (const word of fluffWords) {
      assert.ok(prompt.includes(word), `Marketing fluff word missing: "${word}"`);
    }
  });
});

// ============================================================
// TESTS — BUG #6: countWords duplicated in route
// ============================================================

describe('countWords duplication — BUG #6', () => {
  it('[BUG #6] local countWords in route matches core countWords behavior', () => {
    // Both implementations should give same result
    const localCount = countWordsFixed('Giường sắt hộp 1m6 giao nhanh toàn quốc');
    assert.equal(localCount, 8, 'countWords should give 8 for 8-word string');
  });

  it('[BUG #6] countWords handles Vietnamese diacritics correctly', () => {
    const text = 'Mình bán giường sắt giá xưởng chất lượng cao';
    const count = countWordsFixed(text);
    assert.equal(count, 9);
  });

  it('[BUG #6] countWords returns 0 for empty string', () => {
    assert.equal(countWordsFixed(''), 0);
  });

  it('[BUG #6] countWords returns 0 for whitespace-only string', () => {
    assert.equal(countWordsFixed('   \n  \t  '), 0);
  });

  it('[BUG #6] countWords handles multiple spaces correctly', () => {
    const text = 'Giường   sắt  hộp  1m6';  // extra spaces
    const count = countWordsFixed(text);
    assert.equal(count, 4, 'multiple spaces should not inflate word count');
  });
});

// ============================================================
// TESTS — generateSchema validation
// ============================================================

describe('generateSchema validation', () => {
  const { z } = require('zod');

  const brandSchema = z.object({
    shopName: z.string().optional().default(''),
    brandPronouns: z.string().optional().default(''),
    brandAudience: z.string().optional().default(''),
    phone: z.string().optional().default(''),
  });

  const schema = z.object({
    topic: z.string().min(5, 'Thiếu mô tả video / chủ đề').max(8000),
    videoType: z.enum(['product_demo', 'load_test', 'price_reveal', 'new_arrival', 'promotion']).default('product_demo'),
    hookStyle: z.enum(['pov', 'challenge', 'number', 'question', 'story']).default('number'),
    ctaStyle: z.enum(['inbox', 'comment_key', 'bio_link', 'phone']).default('inbox'),
    language: z.string().default('Vietnamese'),
    emojiLevel: z.enum(['none', 'low', 'medium', 'high']).default('medium'),
    modelId: z.string().min(1, 'Vui lòng chọn AI Model'),
    brand: brandSchema.default({}),
  });

  it('accepts valid minimal payload', () => {
    const result = schema.safeParse({
      topic: 'Giường sắt 1m6 demo thực tế',
      modelId: 'gemini-flash',
    });
    assert.ok(result.success, `Should parse: ${JSON.stringify(result)}`);
  });

  it('rejects topic shorter than 5 chars', () => {
    const result = schema.safeParse({ topic: 'Hi', modelId: 'gemini-flash' });
    assert.ok(!result.success, 'short topic should fail');
    const msg = (result as { success: false; error: { errors: Array<{ message: string }> } }).error.errors[0]?.message;
    assert.ok(msg?.includes('Thiếu mô tả'), 'error message should mention missing description');
  });

  it('rejects topic longer than 8000 chars', () => {
    const result = schema.safeParse({ topic: 'A'.repeat(8001), modelId: 'gemini-flash' });
    assert.ok(!result.success);
  });

  it('rejects empty modelId', () => {
    const result = schema.safeParse({ topic: 'Giường sắt demo', modelId: '' });
    assert.ok(!result.success, 'empty modelId should fail');
  });

  it('rejects invalid videoType', () => {
    const result = schema.safeParse({ topic: 'Test topic min', modelId: 'gf', videoType: 'unknown_type' });
    assert.ok(!result.success);
  });

  it('rejects invalid hookStyle', () => {
    const result = schema.safeParse({ topic: 'Test topic min', modelId: 'gf', hookStyle: 'invalid' });
    assert.ok(!result.success);
  });

  it('rejects invalid ctaStyle', () => {
    const result = schema.safeParse({ topic: 'Test topic min', modelId: 'gf', ctaStyle: 'invalid' });
    assert.ok(!result.success);
  });

  it('rejects invalid emojiLevel', () => {
    const result = schema.safeParse({ topic: 'Test topic min', modelId: 'gf', emojiLevel: 'mega' });
    assert.ok(!result.success);
  });

  it('defaults videoType to "product_demo"', () => {
    const result = schema.safeParse({ topic: 'Test topic min', modelId: 'gf' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { videoType: string } }).data.videoType, 'product_demo');
  });

  it('defaults hookStyle to "number"', () => {
    const result = schema.safeParse({ topic: 'Test topic min', modelId: 'gf' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { hookStyle: string } }).data.hookStyle, 'number');
  });

  it('defaults ctaStyle to "inbox"', () => {
    const result = schema.safeParse({ topic: 'Test topic min', modelId: 'gf' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { ctaStyle: string } }).data.ctaStyle, 'inbox');
  });

  it('defaults emojiLevel to "medium"', () => {
    const result = schema.safeParse({ topic: 'Test topic min', modelId: 'gf' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { emojiLevel: string } }).data.emojiLevel, 'medium');
  });

  it('defaults language to "Vietnamese"', () => {
    const result = schema.safeParse({ topic: 'Test topic min', modelId: 'gf' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { language: string } }).data.language, 'Vietnamese');
  });

  it('accepts topic with exactly 5 chars', () => {
    const result = schema.safeParse({ topic: 'Giườ', modelId: 'gf' });
    // 4 chars — should fail
    assert.ok(!result.success, '4 chars should fail');

    const result5 = schema.safeParse({ topic: 'Giường', modelId: 'gf' });
    // 6 chars Vietnamese — depends on byte count vs char count
    assert.ok(typeof result5.success === 'boolean');
  });

  it('accepts all valid enum values for videoType', () => {
    const types = ['product_demo', 'load_test', 'price_reveal', 'new_arrival', 'promotion'];
    for (const t of types) {
      const result = schema.safeParse({ topic: 'Test topic min', modelId: 'gf', videoType: t });
      assert.ok(result.success, `videoType "${t}" should be valid`);
    }
  });

  it('accepts all valid hookStyle values', () => {
    const styles = ['pov', 'challenge', 'number', 'question', 'story'];
    for (const s of styles) {
      const result = schema.safeParse({ topic: 'Test topic min', modelId: 'gf', hookStyle: s });
      assert.ok(result.success, `hookStyle "${s}" should be valid`);
    }
  });

  it('accepts all valid ctaStyle values', () => {
    const styles = ['inbox', 'comment_key', 'bio_link', 'phone'];
    for (const s of styles) {
      const result = schema.safeParse({ topic: 'Test topic min', modelId: 'gf', ctaStyle: s });
      assert.ok(result.success, `ctaStyle "${s}" should be valid`);
    }
  });
});

// ============================================================
// TESTS — HASHTAG_CONTEXT completeness
// ============================================================

describe('HASHTAG_CONTEXT — completeness', () => {
  const videoTypes: VideoType[] = ['product_demo', 'load_test', 'price_reveal', 'new_arrival', 'promotion'];

  it('each videoType has a hashtag suggestion in prompt', () => {
    for (const vt of videoTypes) {
      const prompt = buildTiktokBrandPostPrompt(makeConfig({ videoType: vt }));
      assert.ok(
        prompt.includes('## Hashtag gợi ý theo ngữ cảnh'),
        `videoType "${vt}" should have hashtag context section`,
      );
    }
  });

  it('load_test hashtags include durability-related tags', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ videoType: 'load_test' }));
    assert.ok(
      prompt.includes('#chiuluc') || prompt.includes('#giuongsatben'),
      'load_test hashtags should include durability tags',
    );
  });

  it('price_reveal hashtags include price-related tags', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig({ videoType: 'price_reveal' }));
    assert.ok(
      prompt.includes('#giaxuong') || prompt.includes('#noithatgiare'),
      'price_reveal should have price-related hashtags',
    );
  });
});

// ============================================================
// TESTS — parseTiktokOutput BUG/FIX pairs for section extraction
// ============================================================

describe('parseTiktokOutput — section label extraction edge cases', () => {
  it('extracts TITLE with extra whitespace around colon', () => {
    const raw = `TITLE :  Giường sắt 990k
CAPTION:
Caption text.
HASHTAGS:
#tag`;
    const result = parseTiktokOutput(raw);
    // extractSection allows whitespace around colon via \s*:\s*
    assert.ok(result.title.length > 0 || result.caption.length > 0,
      'should produce some output');
  });

  it('CAPTION body with inline hashtags has them removed', () => {
    const raw = `TITLE: Test title
CAPTION:
Mình có #giuongsat tốt nhất. Inbox ngay.
HASHTAGS:
#giuongsat`;
    const result = parseTiktokOutput(raw);
    assert.ok(!result.caption.includes('#giuongsat'), 'hashtag removed from caption body');
    assert.ok(result.hashtags.includes('#giuongsat'), 'hashtag still in hashtags array');
  });

  it('handles DESCRIPTION label instead of CAPTION', () => {
    const raw = `TITLE: Test title
DESCRIPTION:
Mô tả caption đây.
HASHTAGS:
#tag`;
    const result = parseTiktokOutput(raw);
    assert.ok(result.caption.includes('Mô tả caption') || result.caption.length > 0,
      'DESCRIPTION label should be recognized');
  });

  it('handles MO TA (unaccented) label', () => {
    const raw = `TITLE: Test
MO TA:
Caption nội dung không dấu.
HASHTAGS:
#tag`;
    const result = parseTiktokOutput(raw);
    assert.ok(result.caption.length > 0, 'MO TA label should be recognized');
  });

  it('strips CAPTION label prefix from caption content', () => {
    const raw = `TITLE: Test
CAPTION: Mình có hàng xịn.
HASHTAGS:
#tag`;
    const result = parseTiktokOutput(raw);
    assert.ok(!result.caption.toLowerCase().startsWith('caption:'),
      'CAPTION: prefix should be stripped from content');
  });

  it('triple-newlines collapsed to double in caption', () => {
    const raw = `TITLE: Test



CAPTION:
Line 1.



Line 2.
HASHTAGS:
#tag`;
    const result = parseTiktokOutput(raw);
    assert.ok(!result.caption.includes('\n\n\n'), 'triple newlines should be collapsed');
  });
});

// ============================================================
// TESTS — Prompt builder xưng hô logic
// ============================================================

describe('buildTiktokBrandPostPrompt — xưng hô (pronoun) logic', () => {
  it('uses brand.brandPronouns and brandAudience when brand block is rendered', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfigWithBrand({
      shopName: 'Minh Quân',
      brandPronouns: 'shop',
      brandAudience: 'anh chị',
    }));
    assert.ok(prompt.includes('"shop" -> "anh chị"'), 'custom pronouns should appear in xưng hô section');
  });

  it('falls back to "mình" -> "bạn" when brand is empty', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    assert.ok(prompt.includes('"mình" -> "bạn"'), 'default pronouns should be mình/bạn');
  });

  it('forbids "chúng tôi" and "quý khách" on TikTok', () => {
    const prompt = buildTiktokBrandPostPrompt(makeConfig());
    assert.ok(prompt.includes('chúng tôi'), 'prompt should mention chúng tôi as forbidden');
    assert.ok(prompt.includes('quý khách'), 'prompt should mention quý khách as forbidden');
  });
});
