import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMENT_STYLES,
  COMMENT_COUNTS,
  COMMENT_LANGUAGES,
  FACEBOOK_COMMENT_EMOJI_GROUPS,
  FACEBOOK_COMMENT_EMOJIS,
  FREE_USER_MAX_WORDS,
  BATCH_SIZE,
} from './options';
import type { CommentStyle } from './types';

// ---------------------------------------------------------------------------
// COMMENT_STYLES
// ---------------------------------------------------------------------------

test('COMMENT_STYLES contains exactly 6 styles', () => {
  assert.equal(COMMENT_STYLES.length, 6);
});

test('COMMENT_STYLES contains all valid CommentStyle values', () => {
  const expected: CommentStyle[] = ['funny', 'shorten', 'creative', 'friendly', 'casual', 'professional'];
  const values = COMMENT_STYLES.map((item) => item.value);
  for (const style of expected) {
    assert.ok(values.includes(style), `Missing CommentStyle: ${style}`);
  }
});

test('COMMENT_STYLES each item has value, label, emoji, note', () => {
  for (const item of COMMENT_STYLES) {
    assert.ok(item.value, `Missing value`);
    assert.ok(item.label, `Missing label for: ${item.value}`);
    assert.ok(item.emoji, `Missing emoji for: ${item.value}`);
    assert.ok(item.note, `Missing note for: ${item.value}`);
  }
});

test('COMMENT_STYLES has no duplicate values', () => {
  const values = COMMENT_STYLES.map((item) => item.value);
  const unique = new Set(values);
  assert.equal(unique.size, values.length, 'Duplicate CommentStyle values found');
});

test('COMMENT_STYLES first item is funny', () => {
  assert.equal(COMMENT_STYLES[0].value, 'funny');
});

// ---------------------------------------------------------------------------
// COMMENT_COUNTS
// ---------------------------------------------------------------------------

test('COMMENT_COUNTS contains 14 values', () => {
  assert.equal(COMMENT_COUNTS.length, 14);
});

test('COMMENT_COUNTS starts at 1 and ends at 50', () => {
  assert.equal(COMMENT_COUNTS[0], 1);
  assert.equal(COMMENT_COUNTS[COMMENT_COUNTS.length - 1], 50);
});

test('COMMENT_COUNTS sequential 1-10 then jumps to 20 30 40 50', () => {
  assert.deepEqual([...COMMENT_COUNTS], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50]);
});

test('COMMENT_COUNTS has no duplicate values', () => {
  const unique = new Set(COMMENT_COUNTS);
  assert.equal(unique.size, COMMENT_COUNTS.length);
});

test('COMMENT_COUNTS all values are positive integers', () => {
  for (const count of COMMENT_COUNTS) {
    assert.ok(Number.isInteger(count) && count > 0, `Invalid count: ${count}`);
  }
});

// ---------------------------------------------------------------------------
// COMMENT_LANGUAGES
// ---------------------------------------------------------------------------

test('COMMENT_LANGUAGES contains Vietnamese as first entry', () => {
  assert.equal(COMMENT_LANGUAGES[0].value, 'Vietnamese');
});

test('COMMENT_LANGUAGES each entry has value and label', () => {
  for (const lang of COMMENT_LANGUAGES) {
    assert.ok(lang.value, `Missing value in language entry`);
    assert.ok(lang.label, `Missing label for: ${lang.value}`);
  }
});

test('COMMENT_LANGUAGES has at least 10 languages', () => {
  assert.ok(COMMENT_LANGUAGES.length >= 10, `Only ${COMMENT_LANGUAGES.length} languages`);
});

test('COMMENT_LANGUAGES has no duplicate values', () => {
  const values = COMMENT_LANGUAGES.map((item) => item.value);
  const unique = new Set(values);
  assert.equal(unique.size, values.length, 'Duplicate language values found');
});

// ---------------------------------------------------------------------------
// FACEBOOK_COMMENT_EMOJI_GROUPS
// ---------------------------------------------------------------------------

test('FACEBOOK_COMMENT_EMOJI_GROUPS contains exactly 10 groups', () => {
  assert.equal(FACEBOOK_COMMENT_EMOJI_GROUPS.length, 10);
});

test('FACEBOOK_COMMENT_EMOJI_GROUPS each group has label and emojis', () => {
  for (const group of FACEBOOK_COMMENT_EMOJI_GROUPS) {
    assert.ok(group.label, `Missing label in group`);
    assert.ok(Array.isArray(group.emojis), `emojis should be array in group: ${group.label}`);
  }
});

test('FACEBOOK_COMMENT_EMOJI_GROUPS each group has exactly 20 emojis', () => {
  for (const group of FACEBOOK_COMMENT_EMOJI_GROUPS) {
    assert.equal(group.emojis.length, 20, `Group "${group.label}" has ${group.emojis.length} emojis, expected 20`);
  }
});

test('FACEBOOK_COMMENT_EMOJI_GROUPS has no duplicate group labels', () => {
  const labels = FACEBOOK_COMMENT_EMOJI_GROUPS.map((g) => g.label);
  const unique = new Set(labels);
  assert.equal(unique.size, labels.length, 'Duplicate group labels found');
});

test('FACEBOOK_COMMENT_EMOJI_GROUPS contains Hot group', () => {
  const found = FACEBOOK_COMMENT_EMOJI_GROUPS.some((g) => g.label.includes('Hot'));
  assert.ok(found, 'Hot emoji group should exist');
});

test('FACEBOOK_COMMENT_EMOJI_GROUPS contains CTA group', () => {
  const found = FACEBOOK_COMMENT_EMOJI_GROUPS.some((g) => g.label.includes('CTA'));
  assert.ok(found, 'CTA emoji group should exist');
});

// ---------------------------------------------------------------------------
// FACEBOOK_COMMENT_EMOJIS — flat array derived from groups
// ---------------------------------------------------------------------------

test('FACEBOOK_COMMENT_EMOJIS total count equals 10 groups × 20 emojis', () => {
  assert.equal(FACEBOOK_COMMENT_EMOJIS.length, 200);
});

test('FACEBOOK_COMMENT_EMOJIS contains duplicates across groups (known issue)', () => {
  // 💎 appears in both "Hot" and "Giá" groups — duplicate is a known design issue
  // See fix-bug-facebook-comment.md for details
  const seen = new Set<string>();
  let duplicateCount = 0;
  for (const emoji of FACEBOOK_COMMENT_EMOJIS) {
    if (seen.has(emoji)) duplicateCount++;
    else seen.add(emoji);
  }
  assert.ok(duplicateCount > 0, 'FACEBOOK_COMMENT_EMOJIS should contain duplicates across groups (documenting known issue)');
});

test('FACEBOOK_COMMENT_EMOJIS is derived correctly from groups via flatMap', () => {
  const expectedFirst = FACEBOOK_COMMENT_EMOJI_GROUPS[0]!.emojis[0];
  assert.equal(FACEBOOK_COMMENT_EMOJIS[0], expectedFirst, 'First emoji should match first emoji of first group');
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

test('FREE_USER_MAX_WORDS is 500', () => {
  assert.equal(FREE_USER_MAX_WORDS, 500);
});

test('BATCH_SIZE is 10', () => {
  assert.equal(BATCH_SIZE, 10);
});

test('BATCH_SIZE evenly divides smallest COMMENT_COUNTS jump (20)', () => {
  // 20 / BATCH_SIZE = 2 batches — should produce integer
  assert.equal(20 % BATCH_SIZE, 0, 'BATCH_SIZE should divide 20 evenly');
});
