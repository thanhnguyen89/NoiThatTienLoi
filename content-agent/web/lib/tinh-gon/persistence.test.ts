import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTinhGonContentType, buildTinhGonSnapshot, createTinhGonRunId, parseTinhGonSnapshot } from './persistence';
import type { TinhGonConfig } from './types';

const baseConfig: TinhGonConfig = {
  keyword: 'giường sắt 1m2',
  outlineType: 'review_product',
  language: 'Vietnamese',
  model: 'gemini-flash',
  targetLength: 1000,
  secondaryKeywords: ['giường sắt giá rẻ'],
  notes: 'test notes',
};

test('buildTinhGonContentType prefixes outline type', () => {
  assert.equal(buildTinhGonContentType('review_product'), 'tinh_gon:review_product');
});

test('createTinhGonRunId returns stable slug-based prefix', () => {
  const runId = createTinhGonRunId('Giường sắt 1m2');
  assert.equal(runId.startsWith('giuong-sat-1m2-'), true);
});

test('parseTinhGonSnapshot restores serialized snapshot', () => {
  const raw = buildTinhGonSnapshot({
    stage: 'outline',
    config: baseConfig,
    outline: null,
  });

  const parsed = parseTinhGonSnapshot(raw);
  assert.ok(parsed);
  assert.equal(parsed?.flow, 'tinh_gon');
  assert.equal(parsed?.stage, 'outline');
  assert.equal(parsed?.config.keyword, baseConfig.keyword);
});
