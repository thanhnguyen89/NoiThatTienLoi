import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNewsConfig } from './types';

// ---------------------------------------------------------------------------
// normalizeNewsConfig
// ---------------------------------------------------------------------------

test('normalizeNewsConfig fills all defaults when input is empty', () => {
  const config = normalizeNewsConfig({});

  assert.equal(config.keyword, '');
  assert.equal(config.language, 'Vietnamese');
  assert.equal(config.structure, 'auto');
  assert.equal(config.tone, 'formal');
  assert.equal(config.model, 'gemini-flash');
  assert.equal(config.targetLength, 600);
  assert.deepEqual(config.secondaryKeywords, []);
});

test('normalizeNewsConfig preserves provided values', () => {
  const config = normalizeNewsConfig({
    keyword: 'xu hướng nội thất 2026',
    language: 'English',
    structure: 'listicle',
    tone: 'expert',
    model: 'gpt-4o',
    targetLength: 800,
    secondaryKeywords: ['nội thất hiện đại', 'phong cách tối giản'],
  });

  assert.equal(config.keyword, 'xu hướng nội thất 2026');
  assert.equal(config.language, 'English');
  assert.equal(config.structure, 'listicle');
  assert.equal(config.tone, 'expert');
  assert.equal(config.model, 'gpt-4o');
  assert.equal(config.targetLength, 800);
  assert.deepEqual(config.secondaryKeywords, ['nội thất hiện đại', 'phong cách tối giản']);
});

test('normalizeNewsConfig trims and filters secondaryKeywords', () => {
  const config = normalizeNewsConfig({
    keyword: 'test',
    secondaryKeywords: ['  giá rẻ  ', '', '  ', 'toàn quốc'],
  });

  assert.deepEqual(config.secondaryKeywords, ['giá rẻ', 'toàn quốc']);
});

test('normalizeNewsConfig returns empty array when secondaryKeywords is not an array', () => {
  // @ts-expect-error testing runtime robustness
  const config = normalizeNewsConfig({ secondaryKeywords: 'not-an-array' });
  assert.deepEqual(config.secondaryKeywords, []);
});

test('normalizeNewsConfig returns empty array when secondaryKeywords is null', () => {
  // @ts-expect-error testing runtime robustness
  const config = normalizeNewsConfig({ secondaryKeywords: null });
  assert.deepEqual(config.secondaryKeywords, []);
});

test('normalizeNewsConfig preserves brandConfig when provided', () => {
  const config = normalizeNewsConfig({
    keyword: 'test',
    brandConfig: { name: 'Nội Thất Minh Quân', pronouns: 'chúng tôi' },
  });

  assert.equal(config.brandConfig?.name, 'Nội Thất Minh Quân');
  assert.equal(config.brandConfig?.pronouns, 'chúng tôi');
});

test('normalizeNewsConfig brandConfig is undefined when not provided', () => {
  const config = normalizeNewsConfig({ keyword: 'test' });
  assert.equal(config.brandConfig, undefined);
});

test('normalizeNewsConfig preserves seoOptions when provided', () => {
  const config = normalizeNewsConfig({
    keyword: 'test',
    seoOptions: { mainLink: 'https://example.com', autoBold: 'keyword' },
  });

  assert.equal(config.seoOptions?.mainLink, 'https://example.com');
  assert.equal(config.seoOptions?.autoBold, 'keyword');
});

test('normalizeNewsConfig handles partial input with only keyword', () => {
  const config = normalizeNewsConfig({ keyword: 'giá nội thất tháng 5' });

  assert.equal(config.keyword, 'giá nội thất tháng 5');
  assert.equal(config.structure, 'auto');
  assert.equal(config.tone, 'formal');
  assert.equal(config.targetLength, 600);
});

test('normalizeNewsConfig does NOT trim keyword itself', () => {
  // trimming is done in page.tsx handleNext(), not here
  const config = normalizeNewsConfig({ keyword: '  khoảng trắng  ' });
  assert.equal(config.keyword, '  khoảng trắng  ');
});
