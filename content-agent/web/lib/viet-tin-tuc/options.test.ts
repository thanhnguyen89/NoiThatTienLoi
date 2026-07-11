import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NEWS_STRUCTURES,
  NEWS_TONES,
  NEWS_LENGTHS,
  NEWS_LANGUAGE_MAP,
  DEFAULT_NEWS_LANG,
} from './options';
import type { NewsStructure, NewsTone } from './types';

// ---------------------------------------------------------------------------
// NEWS_STRUCTURES
// ---------------------------------------------------------------------------

test('NEWS_STRUCTURES contains all 10 valid structure types', () => {
  const expected: NewsStructure[] = [
    'auto', 'inverted_pyramid', 'storytelling', 'qa', 'how_to',
    'pro_con', 'historical', 'listicle', 'profile', 'review',
  ];

  const values = NEWS_STRUCTURES.map((item) => item.value);
  for (const type of expected) {
    assert.ok(values.includes(type), `Missing structure: ${type}`);
  }
  assert.equal(values.length, expected.length);
});

test('NEWS_STRUCTURES each item has value, icon, label and note', () => {
  for (const item of NEWS_STRUCTURES) {
    assert.ok(item.value, `Missing value in structure`);
    assert.ok(item.icon, `Missing icon for: ${item.value}`);
    assert.ok(item.label, `Missing label for: ${item.value}`);
    assert.ok(item.note, `Missing note for: ${item.value}`);
  }
});

test('NEWS_STRUCTURES first item is auto', () => {
  assert.equal(NEWS_STRUCTURES[0].value, 'auto');
});

// ---------------------------------------------------------------------------
// NEWS_TONES
// ---------------------------------------------------------------------------

test('NEWS_TONES contains all 9 valid tone types', () => {
  const expected: NewsTone[] = [
    'formal', 'intimate', 'friendly', 'expert', 'humorous',
    'inspirational', 'nostalgic', 'shocking', 'conversational',
  ];

  const values = NEWS_TONES.map((item) => item.value);
  for (const tone of expected) {
    assert.ok(values.includes(tone), `Missing tone: ${tone}`);
  }
  assert.equal(values.length, expected.length);
});

test('NEWS_TONES each item has value, label and note', () => {
  for (const item of NEWS_TONES) {
    assert.ok(item.value, `Missing value in tone`);
    assert.ok(item.label, `Missing label for: ${item.value}`);
    assert.ok(item.note, `Missing note for: ${item.value}`);
  }
});

test('NEWS_TONES first item is formal (default tone)', () => {
  assert.equal(NEWS_TONES[0].value, 'formal');
});

// ---------------------------------------------------------------------------
// NEWS_LENGTHS
// ---------------------------------------------------------------------------

test('NEWS_LENGTHS contains exactly 3 options', () => {
  assert.equal(NEWS_LENGTHS.length, 3);
});

test('NEWS_LENGTHS values are 400, 600, 800', () => {
  const values = NEWS_LENGTHS.map((item) => item.value);
  assert.deepEqual(values, [400, 600, 800]);
});

test('NEWS_LENGTHS default (index 1) is 600', () => {
  // DEFAULT_CONFIG in page.tsx sets targetLength: 600
  assert.equal(NEWS_LENGTHS[1].value, 600);
});

test('NEWS_LENGTHS each item has value and label', () => {
  for (const item of NEWS_LENGTHS) {
    assert.ok(item.value > 0, `Invalid value`);
    assert.ok(item.label, `Missing label for value: ${item.value}`);
  }
});

// ---------------------------------------------------------------------------
// NEWS_LANGUAGE_MAP
// ---------------------------------------------------------------------------

test('NEWS_LANGUAGE_MAP contains Vietnamese entry', () => {
  assert.ok('Vietnamese' in NEWS_LANGUAGE_MAP);
  assert.equal(NEWS_LANGUAGE_MAP.Vietnamese.hl, 'vi');
  assert.equal(NEWS_LANGUAGE_MAP.Vietnamese.gl, 'VN');
  assert.equal(NEWS_LANGUAGE_MAP.Vietnamese.ceid, 'VN:vi');
});

test('NEWS_LANGUAGE_MAP contains English entry', () => {
  assert.ok('English' in NEWS_LANGUAGE_MAP);
  assert.equal(NEWS_LANGUAGE_MAP.English.hl, 'en-US');
  assert.equal(NEWS_LANGUAGE_MAP.English.gl, 'US');
});

test('NEWS_LANGUAGE_MAP each entry has hl, gl, and ceid', () => {
  for (const [lang, entry] of Object.entries(NEWS_LANGUAGE_MAP)) {
    assert.ok(entry.hl, `Missing hl for: ${lang}`);
    assert.ok(entry.gl, `Missing gl for: ${lang}`);
    assert.ok(entry.ceid, `Missing ceid for: ${lang}`);
  }
});

test('NEWS_LANGUAGE_MAP ceid format is gl:hl-like', () => {
  // ceid should contain a colon, e.g. "VN:vi"
  for (const [lang, entry] of Object.entries(NEWS_LANGUAGE_MAP)) {
    assert.ok(entry.ceid.includes(':'), `ceid missing colon for: ${lang}`);
  }
});

test('DEFAULT_NEWS_LANG matches Vietnamese entry', () => {
  assert.deepEqual(DEFAULT_NEWS_LANG, NEWS_LANGUAGE_MAP.Vietnamese);
});

test('NEWS_LANGUAGE_MAP returns undefined for unknown language (no crash)', () => {
  // Simulates: NEWS_LANGUAGE_MAP[language] ?? DEFAULT_NEWS_LANG in route.ts
  const result = NEWS_LANGUAGE_MAP['Klingon'] ?? DEFAULT_NEWS_LANG;
  assert.deepEqual(result, DEFAULT_NEWS_LANG);
});
