import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMENT_BRAND_STYLES,
  VTFC_SESSION_KEY,
  VTFC_BRAND_KEY,
  BATCH_SIZE,
  COMMENT_COUNTS,
  FREE_USER_MAX_WORDS,
} from './options';
import type { CommentBrandStyle } from './types';

// ---------------------------------------------------------------------------
// COMMENT_BRAND_STYLES
// ---------------------------------------------------------------------------

test('COMMENT_BRAND_STYLES contains exactly 9 styles', () => {
  assert.equal(COMMENT_BRAND_STYLES.length, 9);
});

test('COMMENT_BRAND_STYLES contains all valid CommentBrandStyle values', () => {
  const expected: CommentBrandStyle[] = [
    'funny', 'shorten', 'creative', 'friendly', 'casual',
    'professional', 'curious', 'experience', 'tag_friend',
  ];
  const values = COMMENT_BRAND_STYLES.map((item) => item.value);
  for (const style of expected) {
    assert.ok(values.includes(style), `Missing CommentBrandStyle: ${style}`);
  }
});

test('COMMENT_BRAND_STYLES each item has value, label, emoji, note', () => {
  for (const item of COMMENT_BRAND_STYLES) {
    assert.ok(item.value, `Missing value`);
    assert.ok(item.label, `Missing label for: ${item.value}`);
    assert.ok(item.emoji, `Missing emoji for: ${item.value}`);
    assert.ok(item.note, `Missing note for: ${item.value}`);
  }
});

test('COMMENT_BRAND_STYLES curious has hot flag set to true', () => {
  const curious = COMMENT_BRAND_STYLES.find((item) => item.value === 'curious');
  assert.ok(curious, 'curious style not found');
  assert.equal(curious!.hot, true);
});

test('COMMENT_BRAND_STYLES experience has hot flag set to true', () => {
  const experience = COMMENT_BRAND_STYLES.find((item) => item.value === 'experience');
  assert.ok(experience, 'experience style not found');
  assert.equal(experience!.hot, true);
});

test('COMMENT_BRAND_STYLES non-hot styles do not have hot flag', () => {
  const nonHotStyles: CommentBrandStyle[] = ['funny', 'shorten', 'creative', 'friendly', 'casual', 'professional', 'tag_friend'];
  for (const value of nonHotStyles) {
    const item = COMMENT_BRAND_STYLES.find((s) => s.value === value);
    assert.ok(item, `${value} not found`);
    assert.ok(!item!.hot, `${value} should not have hot flag`);
  }
});

test('COMMENT_BRAND_STYLES has no duplicate values', () => {
  const values = COMMENT_BRAND_STYLES.map((item) => item.value);
  const unique = new Set(values);
  assert.equal(unique.size, values.length, 'Duplicate style values found');
});

// ---------------------------------------------------------------------------
// VTFC_SESSION_KEY / VTFC_BRAND_KEY
// ---------------------------------------------------------------------------

test('VTFC_SESSION_KEY is a non-empty string', () => {
  assert.ok(typeof VTFC_SESSION_KEY === 'string' && VTFC_SESSION_KEY.length > 0);
});

test('VTFC_BRAND_KEY is a non-empty string', () => {
  assert.ok(typeof VTFC_BRAND_KEY === 'string' && VTFC_BRAND_KEY.length > 0);
});

test('VTFC_SESSION_KEY and VTFC_BRAND_KEY are different keys', () => {
  assert.notEqual(VTFC_SESSION_KEY, VTFC_BRAND_KEY);
});

// ---------------------------------------------------------------------------
// Re-exported constants from facebook-comment/options
// ---------------------------------------------------------------------------

test('BATCH_SIZE is a positive integer', () => {
  assert.ok(typeof BATCH_SIZE === 'number' && BATCH_SIZE > 0 && Number.isInteger(BATCH_SIZE));
});

test('BATCH_SIZE is 10', () => {
  assert.equal(BATCH_SIZE, 10);
});

test('COMMENT_COUNTS contains expected values', () => {
  const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50];
  assert.deepEqual([...COMMENT_COUNTS], expected);
});

test('COMMENT_COUNTS first value is 1 and last is 50', () => {
  assert.equal(COMMENT_COUNTS[0], 1);
  assert.equal(COMMENT_COUNTS[COMMENT_COUNTS.length - 1], 50);
});

test('COMMENT_COUNTS contains 14 values', () => {
  assert.equal(COMMENT_COUNTS.length, 14);
});

test('FREE_USER_MAX_WORDS is 500', () => {
  assert.equal(FREE_USER_MAX_WORDS, 500);
});
