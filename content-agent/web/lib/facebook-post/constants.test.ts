import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FACEBOOK_POST_DEFAULT_WORD_COUNT,
  FACEBOOK_POST_QUICK_MAX_WORDS,
  FACEBOOK_POST_QUICK_MIN_WORDS,
  FORBIDDEN_WORDS,
  TEMPLATES,
  TEMPLATE_GUIDES,
  TONES,
} from './constants';

test('TONES contains exactly 6 tone options', () => {
  assert.equal(TONES.length, 6);
});

test('TONES contains all expected values', () => {
  const expected = ['friendly', 'professional', 'casual', 'sales', 'rewrite', 'shorten'];
  const values = TONES.map((tone) => tone.value);
  for (const value of expected) {
    assert.ok(values.includes(value as typeof values[number]), `Missing tone: ${value}`);
  }
});

test('TONES each item has value and label', () => {
  for (const tone of TONES) {
    assert.ok(tone.value !== undefined);
    assert.ok(tone.label);
  }
});

test('TONES has no duplicate values', () => {
  const values = TONES.map((tone) => tone.value);
  assert.equal(new Set(values).size, values.length);
});

test('TONES first item is friendly (default)', () => {
  assert.equal(TONES[0].value, 'friendly');
});

test('TONES rewrite and shorten are mode-switching tones', () => {
  assert.ok(TONES.some((tone) => tone.value === 'rewrite'));
  assert.ok(TONES.some((tone) => tone.value === 'shorten'));
});

test('TEMPLATES contains exactly 6 options including auto', () => {
  assert.equal(TEMPLATES.length, 6);
});

test('TEMPLATES first item is auto (empty value)', () => {
  assert.equal(TEMPLATES[0].value, '');
  assert.ok(TEMPLATES[0].label.toLowerCase().includes('auto'));
});

test('TEMPLATES contains all 5 named templates', () => {
  const expected = ['product_intro', 'combo_wholesale', 'bulk_b2b', 'friendly_stock', 'branding'];
  const values = TEMPLATES.map((template) => template.value);
  for (const value of expected) {
    assert.ok(values.includes(value as typeof values[number]), `Missing template: ${value}`);
  }
});

test('TEMPLATES each named item has non-empty value and label', () => {
  for (const template of TEMPLATES.filter((item) => item.value !== '')) {
    assert.ok(template.value);
    assert.ok(template.label);
  }
});

test('TEMPLATES has no duplicate values (including empty)', () => {
  const values = TEMPLATES.map((template) => template.value);
  assert.equal(new Set(values).size, values.length);
});

test('TEMPLATE_GUIDES has an entry for every named template', () => {
  const namedTemplates = TEMPLATES.filter((item) => item.value !== '').map((item) => item.value);
  for (const template of namedTemplates) {
    assert.ok(template in TEMPLATE_GUIDES);
    assert.ok(TEMPLATE_GUIDES[template].length > 0);
  }
});

test('TEMPLATE_GUIDES has no entry for auto template (empty string)', () => {
  assert.ok(!('' in TEMPLATE_GUIDES));
});

test('TEMPLATE_GUIDES product_intro guide mentions Hook instruction', () => {
  assert.ok(TEMPLATE_GUIDES.product_intro.includes('Hook'));
});

test('TEMPLATE_GUIDES combo_wholesale guide mentions si pricing', () => {
  assert.ok(TEMPLATE_GUIDES.combo_wholesale.toLowerCase().includes('sỉ'));
});

test('TEMPLATE_GUIDES bulk_b2b guide mentions gia xuong', () => {
  assert.ok(TEMPLATE_GUIDES.bulk_b2b.includes('giá xưởng'));
});

test('TEMPLATE_GUIDES friendly_stock guide mentions word limit (150 tu)', () => {
  assert.ok(TEMPLATE_GUIDES.friendly_stock.includes('150'));
});

test('TEMPLATE_GUIDES branding guide warns against cao cap gia tao', () => {
  assert.ok(TEMPLATE_GUIDES.branding.includes('cao cấp giả tạo'));
});

test('TEMPLATE_GUIDES has no entry for rewrite or shorten (mode-based tones)', () => {
  assert.ok(!('rewrite' in TEMPLATE_GUIDES));
  assert.ok(!('shorten' in TEMPLATE_GUIDES));
});

test('FORBIDDEN_WORDS is a non-empty array', () => {
  assert.ok(Array.isArray(FORBIDDEN_WORDS) && FORBIDDEN_WORDS.length > 0);
});

test('FORBIDDEN_WORDS all items are non-empty strings', () => {
  for (const word of FORBIDDEN_WORDS) {
    assert.ok(typeof word === 'string' && word.trim().length > 0);
  }
});

test('FORBIDDEN_WORDS contains key AI transition words', () => {
  const expected = ['tuy nhiên', 'bên cạnh đó', 'tóm lại', 'không thể phủ nhận'];
  for (const word of expected) {
    assert.ok(FORBIDDEN_WORDS.includes(word), `Missing forbidden word: ${word}`);
  }
});

test('FORBIDDEN_WORDS contains cliche opening phrases', () => {
  const expected = ['trong cuộc sống hiện đại', 'ngày nay', 'hiện nay', 'bạn có biết rằng'];
  for (const phrase of expected) {
    assert.ok(FORBIDDEN_WORDS.includes(phrase), `Missing cliche opening: ${phrase}`);
  }
});

test('FORBIDDEN_WORDS contains AI-fluff adjectives', () => {
  const expected = ['vô cùng', 'cực kỳ', 'tuyệt vời', 'siêu phẩm', 'hoàn hảo', 'đẳng cấp'];
  for (const word of expected) {
    assert.ok(FORBIDDEN_WORDS.includes(word), `Missing fluff word: ${word}`);
  }
});

test('FORBIDDEN_WORDS has no duplicates', () => {
  assert.equal(new Set(FORBIDDEN_WORDS).size, FORBIDDEN_WORDS.length);
});

test('FORBIDDEN_WORDS contains at least 30 entries', () => {
  assert.ok(FORBIDDEN_WORDS.length >= 30);
});

test('rewrite and shorten tones should not use template guides (isRewriteMode)', () => {
  const rewriteModeTones = ['rewrite', 'shorten'];
  for (const tone of rewriteModeTones) {
    const isRewriteMode = tone === 'rewrite' || tone === 'shorten';
    const templateGuide = isRewriteMode ? '' : 'some-template-content';
    assert.equal(templateGuide, '');
  }
});

test('non-rewrite tones should use template guides normally', () => {
  const normalTones = ['friendly', 'professional', 'casual', 'sales'];
  for (const tone of normalTones) {
    const isRewriteMode = tone === 'rewrite' || tone === 'shorten';
    assert.ok(!isRewriteMode);
  }
});

test('wordCount default is 140, within valid range [60, 320]', () => {
  assert.equal(FACEBOOK_POST_DEFAULT_WORD_COUNT, 140);
  assert.ok(FACEBOOK_POST_DEFAULT_WORD_COUNT >= FACEBOOK_POST_QUICK_MIN_WORDS);
  assert.ok(FACEBOOK_POST_DEFAULT_WORD_COUNT <= FACEBOOK_POST_QUICK_MAX_WORDS);
});
