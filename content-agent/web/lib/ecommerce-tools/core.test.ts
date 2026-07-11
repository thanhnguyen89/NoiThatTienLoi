/**
 * Tests for pure utility functions and constants in ecommerce-tools/core.ts.
 *
 * Sources:
 *   web/lib/ecommerce-tools/core.ts                                   ← exported
 *   web/app/api/tao-tieu-de-san-pham/generate/route.ts               ← uses fallbackParseProductMeta
 *
 * Run:
 *   cd web && node --require tsx/esm --test lib/ecommerce-tools/core.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_TONES,
  ECOMMERCE_TABS,
  ECOMMERCE_SELECT_OPTIONS,
  COMMON_FORBIDDEN_WORDS,
  countWords,
  stripCodeFence,
  safeJsonParse,
  fallbackParseProductMeta,
  buildFaqSchema,
  buildBrandBlock,
} from './core';

// ===========================================================================
// CONSTANTS
// ===========================================================================

// ---------------------------------------------------------------------------
// PRODUCT_TONES
// ---------------------------------------------------------------------------

test('PRODUCT_TONES contains exactly 10 tone options', () => {
  assert.equal(PRODUCT_TONES.length, 10);
});

test('PRODUCT_TONES first item is seo_focus (default tone)', () => {
  assert.equal(PRODUCT_TONES[0].value, 'seo_focus');
});

test('PRODUCT_TONES each item has value and label', () => {
  for (const tone of PRODUCT_TONES) {
    assert.ok(tone.value, `Missing value`);
    assert.ok(tone.label, `Missing label for: ${tone.value}`);
  }
});

test('PRODUCT_TONES has no duplicate values', () => {
  const values = PRODUCT_TONES.map((t) => t.value);
  assert.equal(new Set(values).size, values.length, 'Duplicate tone values');
});

test('PRODUCT_TONES contains all expected tones', () => {
  const expected = ['seo_focus', 'persuasive', 'friendly', 'professional', 'luxury', 'bold', 'engaging', 'confident', 'direct', 'casual'];
  const values = PRODUCT_TONES.map((t) => t.value);
  for (const v of expected) {
    assert.ok(values.includes(v as typeof values[number]), `Missing tone: ${v}`);
  }
});

// ---------------------------------------------------------------------------
// ECOMMERCE_TABS
// ---------------------------------------------------------------------------

test('ECOMMERCE_TABS contains exactly 5 tabs', () => {
  assert.equal(ECOMMERCE_TABS.length, 5);
});

test('ECOMMERCE_TABS each tab has label and href', () => {
  for (const tab of ECOMMERCE_TABS) {
    assert.ok(tab.label, 'Missing label');
    assert.ok(tab.href.startsWith('/'), `href should start with /: ${tab.href}`);
  }
});

test('ECOMMERCE_TABS has no duplicate hrefs', () => {
  const hrefs = ECOMMERCE_TABS.map((t) => t.href);
  assert.equal(new Set(hrefs).size, hrefs.length, 'Duplicate hrefs');
});

test('ECOMMERCE_TABS includes /tao-tieu-de-san-pham', () => {
  const found = ECOMMERCE_TABS.some((t) => t.href === '/tao-tieu-de-san-pham');
  assert.ok(found, 'tao-tieu-de-san-pham tab should exist');
});

// ---------------------------------------------------------------------------
// ECOMMERCE_SELECT_OPTIONS
// ---------------------------------------------------------------------------

test('ECOMMERCE_SELECT_OPTIONS.productTones has same count as PRODUCT_TONES', () => {
  assert.equal(ECOMMERCE_SELECT_OPTIONS.productTones.length, PRODUCT_TONES.length);
});

test('ECOMMERCE_SELECT_OPTIONS.priceSegments has 3 options', () => {
  assert.equal(ECOMMERCE_SELECT_OPTIONS.priceSegments.length, 3);
});

test('ECOMMERCE_SELECT_OPTIONS.faqCounts includes 5, 7, 10', () => {
  const values = ECOMMERCE_SELECT_OPTIONS.faqCounts.map((f) => f.value);
  assert.ok(values.includes(5), 'faqCounts should include 5');
  assert.ok(values.includes(7), 'faqCounts should include 7');
  assert.ok(values.includes(10), 'faqCounts should include 10');
});

// ---------------------------------------------------------------------------
// COMMON_FORBIDDEN_WORDS
// ---------------------------------------------------------------------------

test('COMMON_FORBIDDEN_WORDS is a non-empty array', () => {
  assert.ok(Array.isArray(COMMON_FORBIDDEN_WORDS) && COMMON_FORBIDDEN_WORDS.length > 0);
});

test('COMMON_FORBIDDEN_WORDS all items are non-empty strings', () => {
  for (const word of COMMON_FORBIDDEN_WORDS) {
    assert.ok(typeof word === 'string' && word.trim().length > 0, `Invalid entry: "${word}"`);
  }
});

test('COMMON_FORBIDDEN_WORDS has no duplicates', () => {
  const unique = new Set(COMMON_FORBIDDEN_WORDS);
  assert.equal(unique.size, COMMON_FORBIDDEN_WORDS.length, 'Duplicate entries');
});

test('COMMON_FORBIDDEN_WORDS contains key AI words', () => {
  const mustHave = ['tuy nhiên', 'bên cạnh đó', 'vô cùng', 'siêu phẩm', 'hoàn hảo'];
  for (const word of mustHave) {
    assert.ok(COMMON_FORBIDDEN_WORDS.includes(word), `Missing: ${word}`);
  }
});

// ===========================================================================
// PURE FUNCTIONS
// ===========================================================================

// ---------------------------------------------------------------------------
// countWords
// ---------------------------------------------------------------------------

test('countWords returns correct count for normal sentence', () => {
  assert.equal(countWords('giường sắt hộp 1m6'), 4);
});

test('countWords returns 0 for empty string', () => {
  assert.equal(countWords(''), 0);
});

test('countWords returns 0 for whitespace-only string', () => {
  assert.equal(countWords('   '), 0);
});

test('countWords handles multiple consecutive spaces', () => {
  assert.equal(countWords('giường  sắt   hộp'), 3);
});

test('countWords handles leading and trailing whitespace', () => {
  assert.equal(countWords('  nội thất  '), 2);
});

// ---------------------------------------------------------------------------
// stripCodeFence
// ---------------------------------------------------------------------------

test('stripCodeFence removes ```json prefix and ``` suffix', () => {
  const input = '```json\n{"key":"value"}\n```';
  const result = stripCodeFence(input);
  assert.equal(result, '{"key":"value"}');
});

test('stripCodeFence removes plain ``` prefix', () => {
  const input = '```\n{"key":"value"}\n```';
  const result = stripCodeFence(input);
  assert.equal(result, '{"key":"value"}');
});

test('stripCodeFence removes ```html prefix', () => {
  const input = '```html\n<p>test</p>\n```';
  const result = stripCodeFence(input);
  assert.equal(result, '<p>test</p>');
});

test('stripCodeFence removes ```text prefix', () => {
  const input = '```text\nhello world\n```';
  const result = stripCodeFence(input);
  assert.equal(result, 'hello world');
});

test('stripCodeFence is case-insensitive for language tag', () => {
  const input = '```JSON\n{"key":"value"}\n```';
  const result = stripCodeFence(input);
  assert.equal(result, '{"key":"value"}');
});

test('stripCodeFence leaves plain JSON unchanged', () => {
  const input = '{"titles":["a","b"]}';
  const result = stripCodeFence(input);
  assert.equal(result, input);
});

test('stripCodeFence trims the result', () => {
  const input = '```json\n  {"key":"value"}  \n```';
  const result = stripCodeFence(input);
  assert.equal(result, '{"key":"value"}');
});

test('stripCodeFence removes fence even with leading whitespace before fence', () => {
  const input = '  ```json\n{"key":"value"}\n```';
  const result = stripCodeFence(input);
  assert.equal(result, '{"key":"value"}');
});

// ---------------------------------------------------------------------------
// safeJsonParse
// ---------------------------------------------------------------------------

test('safeJsonParse parses valid JSON object', () => {
  const result = safeJsonParse<{ titles: string[] }>('{"titles":["a","b"]}');
  assert.deepEqual(result, { titles: ['a', 'b'] });
});

test('safeJsonParse parses JSON wrapped in code fence', () => {
  const result = safeJsonParse<{ titles: string[] }>('```json\n{"titles":["a","b"]}\n```');
  assert.deepEqual(result, { titles: ['a', 'b'] });
});

test('safeJsonParse extracts JSON object embedded in extra text', () => {
  const result = safeJsonParse<{ titles: string[] }>('Here is the result:\n{"titles":["a","b"]}\nDone.');
  assert.deepEqual(result, { titles: ['a', 'b'] });
});

test('safeJsonParse returns null for invalid JSON', () => {
  const result = safeJsonParse('this is not json at all');
  assert.equal(result, null);
});

test('safeJsonParse returns null for empty string', () => {
  const result = safeJsonParse('');
  assert.equal(result, null);
});

test('safeJsonParse handles nested object correctly', () => {
  const raw = '{"titles":["a"],"description":"meta desc here"}';
  const result = safeJsonParse<{ titles: string[]; description: string }>(raw);
  assert.equal(result?.titles[0], 'a');
  assert.equal(result?.description, 'meta desc here');
});

test('safeJsonParse fallback handles array as top-level embedded in extra text', () => {
  const result = safeJsonParse<number[]>('Some text [1,2,3] end');
  assert.deepEqual(result, [1, 2, 3]);
});

// ---------------------------------------------------------------------------
// buildFaqSchema
// ---------------------------------------------------------------------------

test('buildFaqSchema returns valid JSON string', () => {
  const input = [{ question: 'Giá bao nhiêu?', answer: 'Liên hệ để biết giá.' }];
  const result = buildFaqSchema(input);
  assert.doesNotThrow(() => JSON.parse(result), 'buildFaqSchema output should be valid JSON');
});

test('buildFaqSchema includes @context https://schema.org', () => {
  const result = JSON.parse(buildFaqSchema([{ question: 'Q', answer: 'A' }]));
  assert.equal(result['@context'], 'https://schema.org');
});

test('buildFaqSchema uses FAQPage type', () => {
  const result = JSON.parse(buildFaqSchema([{ question: 'Q', answer: 'A' }]));
  assert.equal(result['@type'], 'FAQPage');
});

test('buildFaqSchema mainEntity has correct length', () => {
  const faqs = [
    { question: 'Q1', answer: 'A1' },
    { question: 'Q2', answer: 'A2' },
  ];
  const result = JSON.parse(buildFaqSchema(faqs));
  assert.equal(result.mainEntity.length, 2);
});

test('buildFaqSchema each mainEntity item has Question type', () => {
  const result = JSON.parse(buildFaqSchema([{ question: 'Q', answer: 'A' }]));
  assert.equal(result.mainEntity[0]['@type'], 'Question');
});

test('buildFaqSchema each Question has acceptedAnswer with Answer type', () => {
  const result = JSON.parse(buildFaqSchema([{ question: 'Q', answer: 'My answer here' }]));
  const answer = result.mainEntity[0].acceptedAnswer;
  assert.equal(answer['@type'], 'Answer');
  assert.equal(answer.text, 'My answer here');
});

test('buildFaqSchema name field matches question text', () => {
  const result = JSON.parse(buildFaqSchema([{ question: 'Giá bao nhiêu?', answer: 'A' }]));
  assert.equal(result.mainEntity[0].name, 'Giá bao nhiêu?');
});

test('buildFaqSchema handles empty array', () => {
  const result = JSON.parse(buildFaqSchema([]));
  assert.deepEqual(result.mainEntity, []);
});

// ---------------------------------------------------------------------------
// buildBrandBlock
// ---------------------------------------------------------------------------

test('buildBrandBlock returns empty string when all fields empty', () => {
  const result = buildBrandBlock({ brandName: '', forbidden: '' });
  assert.equal(result, '');
});

test('buildBrandBlock returns empty string when called with no fields', () => {
  const result = buildBrandBlock({});
  assert.equal(result, '');
});

test('buildBrandBlock includes brandName when set', () => {
  const result = buildBrandBlock({ brandName: 'Minh Quân' });
  assert.ok(result.includes('Thương hiệu: Minh Quân'));
});

test('buildBrandBlock includes forbidden when set', () => {
  const result = buildBrandBlock({ forbidden: 'siêu rẻ' });
  assert.ok(result.includes('Từ không dùng bổ sung: siêu rẻ'));
});

test('buildBrandBlock includes shopPhone when set', () => {
  const result = buildBrandBlock({ shopPhone: '0909 123 456' });
  assert.ok(result.includes('Hotline: 0909 123 456'));
});

test('buildBrandBlock includes shopAddress when set', () => {
  const result = buildBrandBlock({ shopAddress: 'TP.HCM' });
  assert.ok(result.includes('Địa chỉ: TP.HCM'));
});

test('buildBrandBlock starts with newline separator when non-empty', () => {
  const result = buildBrandBlock({ brandName: 'Minh Quân' });
  assert.ok(result.startsWith('\n'), 'brand block should start with newline separator');
});

test('buildBrandBlock includes Thông tin shop/brand header when non-empty', () => {
  const result = buildBrandBlock({ brandName: 'Minh Quân' });
  assert.ok(result.includes('Thông tin shop/brand:'));
});

test('buildBrandBlock skips falsy fields silently', () => {
  // Only brandName — no phone/address/forbidden
  const result = buildBrandBlock({ brandName: 'Minh Quân', forbidden: '' });
  assert.ok(!result.includes('Từ không dùng'), 'empty forbidden should be skipped');
  assert.ok(!result.includes('Hotline'), 'missing phone should be skipped');
});

test('buildBrandBlock all fields combined', () => {
  const result = buildBrandBlock({
    brandName: 'Minh Quân',
    forbidden: 'siêu rẻ',
    shopPhone: '0909',
    shopAddress: 'HCM',
  });
  assert.ok(result.includes('Minh Quân'));
  assert.ok(result.includes('siêu rẻ'));
  assert.ok(result.includes('0909'));
  assert.ok(result.includes('HCM'));
});

// ===========================================================================
// fallbackParseProductMeta
// ===========================================================================

test('fallbackParseProductMeta extracts numbered titles (N. format)', () => {
  const raw = `1. Giường sắt hộp 1m6 giá rẻ
2. Mua giường sắt chất lượng cao
3. Giường sắt nhà máy giao nhanh
4. Khung sắt dày 1.4mm chính hãng
5. Giường sắt bền đẹp giá xưởng`;
  const result = fallbackParseProductMeta(raw);
  assert.equal(result.titles.length, 5, 'should extract exactly 5 titles');
  assert.ok(result.titles[0].includes('Giường sắt hộp'), 'first title should be stripped of "1. "');
});

test('fallbackParseProductMeta extracts numbered titles (N) format)', () => {
  const raw = `1) Giường sắt hộp 1m6 giá rẻ
2) Mua giường sắt chất lượng cao
3) Giường sắt nhà máy giao nhanh`;
  const result = fallbackParseProductMeta(raw);
  assert.equal(result.titles.length, 3);
  assert.ok(!result.titles[0].startsWith('1)'), 'number prefix should be removed');
});

test('fallbackParseProductMeta extracts bullet titles (- format)', () => {
  const raw = `- Giường sắt hộp 1m6 giá rẻ
- Mua giường sắt chất lượng cao
- Giường sắt nhà máy giao nhanh`;
  const result = fallbackParseProductMeta(raw);
  assert.ok(result.titles.length >= 3);
  assert.ok(!result.titles[0].startsWith('-'), 'dash prefix should be removed');
});

test('fallbackParseProductMeta extracts bullet titles (* format)', () => {
  const raw = `* Giường sắt hộp 1m6 giá rẻ
* Mua giường sắt chất lượng cao`;
  const result = fallbackParseProductMeta(raw);
  assert.ok(result.titles.length >= 2);
  assert.ok(!result.titles[0].startsWith('*'), '* prefix should be removed');
});

test('fallbackParseProductMeta caps titles at 5 even if input has more', () => {
  const raw = Array.from({ length: 8 }, (_, i) => `${i + 1}. Title number ${i + 1}`).join('\n');
  const result = fallbackParseProductMeta(raw);
  assert.equal(result.titles.length, 5, 'should return at most 5 titles');
});

test('fallbackParseProductMeta filters out lines containing "titles" keyword', () => {
  const raw = `Here are the titles:
1. Giường sắt hộp 1m6 giá rẻ
2. Mua giường sắt chất lượng cao`;
  const result = fallbackParseProductMeta(raw);
  assert.ok(!result.titles.some((t) => t.toLowerCase().includes('here are the titles')), 'header line should be filtered');
});

test('fallbackParseProductMeta filters out lines containing "description" keyword', () => {
  const raw = `1. Giường sắt hộp 1m6 giá rẻ
description: meta description goes here
2. Another title`;
  const result = fallbackParseProductMeta(raw);
  assert.ok(!result.titles.some((t) => t.toLowerCase().includes('description')), 'description label should be filtered');
});

test('fallbackParseProductMeta detects description as line longer than 80 chars', () => {
  const longDesc = 'Mua giường sắt giá rẻ tại Nội Thất Minh Quân — giao nhanh toàn quốc, bảo hành 12 tháng, nhận đặt theo yêu cầu.';
  const raw = `1. Giường sắt hộp 1m6 giá rẻ
2. Mua giường sắt chất lượng cao
${longDesc}`;
  assert.ok(longDesc.length > 80, 'precondition: longDesc should be > 80 chars');
  const result = fallbackParseProductMeta(raw);
  assert.equal(result.description, longDesc, 'long line should be detected as description');
});

test('fallbackParseProductMeta returns empty description when no line exceeds 80 chars', () => {
  // Known issue: threshold of 80 is arbitrary — short descriptions missed
  const raw = `1. Giường sắt hộp 1m6 giá rẻ
2. Giường sắt tốt nhất`;
  const result = fallbackParseProductMeta(raw);
  assert.equal(result.description, '', 'should return empty description when all lines < 80 chars (known limitation)');
});

test('fallbackParseProductMeta returns empty titles and description for empty input', () => {
  const result = fallbackParseProductMeta('');
  assert.deepEqual(result.titles, []);
  assert.equal(result.description, '');
});

test('fallbackParseProductMeta strips "N:" prefix', () => {
  // Bug: regex only handles `N.` and `N)` but not `N:`
  const raw = '1: Giường sắt hộp 1m6 giá rẻ\n2: Mua giường sắt';
  const result = fallbackParseProductMeta(raw);
  assert.ok(!result.titles[0].startsWith('1:'), 'N: prefix should be removed');
});
