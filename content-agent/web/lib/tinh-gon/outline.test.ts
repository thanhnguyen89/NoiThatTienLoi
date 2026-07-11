import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOutlineFallback, extractJsonPayload, normalizeOutlinePayload } from './outline';
import type { TinhGonConfig } from './types';

const baseConfig: TinhGonConfig = {
  keyword: 'giường sắt 1m2',
  outlineType: 'review_product',
  language: 'Vietnamese',
  model: 'gemini-flash',
  targetLength: 1000,
  secondaryKeywords: ['giường sắt giá rẻ'],
  notes: '',
};

test('extractJsonPayload parses fenced json', () => {
  const payload = extractJsonPayload('```json\n{"titleOptions":["A"],"sections":[]}\n```');
  assert.deepEqual(payload, { titleOptions: ['A'], sections: [] });
});

test('buildOutlineFallback creates bounded sections and title options', () => {
  const outline = buildOutlineFallback(baseConfig);

  assert.ok(outline.sections.length >= 4 && outline.sections.length <= 8);
  assert.equal(outline.titleOptions.length, 3);
  assert.equal(outline.selectedTitle, outline.titleOptions[0]);
  assert.ok(outline.sections.every((section) => section.targetWords >= 80 && section.targetWords <= 260));
});

test('normalizeOutlinePayload keeps AI titles and falls back for invalid sections', () => {
  const outline = normalizeOutlinePayload(
    {
      titleOptions: ['Tiêu đề A', 'Tiêu đề B'],
      sections: [{ heading: 'Mở bài', notes: 'ngắn' }],
      angle: 'Góc test',
      searchIntent: 'Intent test',
      contentGaps: ['Gap 1'],
      estimatedWords: 900,
    },
    baseConfig,
  );

  assert.deepEqual(outline.titleOptions, ['Tiêu đề A', 'Tiêu đề B']);
  assert.equal(outline.selectedTitle, 'Tiêu đề A');
  assert.ok(outline.sections.length >= 4);
  assert.equal(outline.angle, 'Góc test');
  assert.equal(outline.searchIntent, 'Intent test');
});
