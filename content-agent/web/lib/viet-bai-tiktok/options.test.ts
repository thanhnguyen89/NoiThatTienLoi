import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VIDEO_TYPES,
  HOOK_STYLES,
  CTA_STYLES,
  EMOJI_LEVELS,
  TOPIC_EXAMPLES,
  TIKTOK_CHAR_WARNING,
  LS_KEY_CONFIG,
  LS_KEY_BRAND,
} from './options';
import type { VideoType, HookStyle, TikTokCTA, EmojiLevel } from './types';

// ---------------------------------------------------------------------------
// VIDEO_TYPES
// ---------------------------------------------------------------------------

test('VIDEO_TYPES contains exactly 5 video types', () => {
  assert.equal(VIDEO_TYPES.length, 5);
});

test('VIDEO_TYPES contains all valid VideoType values', () => {
  const expected: VideoType[] = ['product_demo', 'load_test', 'price_reveal', 'new_arrival', 'promotion'];
  const values = VIDEO_TYPES.map((item) => item.value);
  for (const type of expected) {
    assert.ok(values.includes(type), `Missing VideoType: ${type}`);
  }
});

test('VIDEO_TYPES each item has value, label, icon, note', () => {
  for (const item of VIDEO_TYPES) {
    assert.ok(item.value, `Missing value`);
    assert.ok(item.label, `Missing label for: ${item.value}`);
    assert.ok(item.icon, `Missing icon for: ${item.value}`);
    assert.ok(item.note, `Missing note for: ${item.value}`);
  }
});

test('VIDEO_TYPES first item is product_demo (default)', () => {
  assert.equal(VIDEO_TYPES[0].value, 'product_demo');
});

test('VIDEO_TYPES has no duplicate values', () => {
  const values = VIDEO_TYPES.map((item) => item.value);
  const unique = new Set(values);
  assert.equal(unique.size, values.length, 'Duplicate VideoType values found');
});

// ---------------------------------------------------------------------------
// HOOK_STYLES
// ---------------------------------------------------------------------------

test('HOOK_STYLES contains exactly 5 hook styles', () => {
  assert.equal(HOOK_STYLES.length, 5);
});

test('HOOK_STYLES contains all valid HookStyle values', () => {
  const expected: HookStyle[] = ['pov', 'challenge', 'number', 'question', 'story'];
  const values = HOOK_STYLES.map((item) => item.value);
  for (const style of expected) {
    assert.ok(values.includes(style), `Missing HookStyle: ${style}`);
  }
});

test('HOOK_STYLES each item has value, label, icon, note, example', () => {
  for (const item of HOOK_STYLES) {
    assert.ok(item.value, `Missing value`);
    assert.ok(item.label, `Missing label for: ${item.value}`);
    assert.ok(item.icon, `Missing icon for: ${item.value}`);
    assert.ok(item.note, `Missing note for: ${item.value}`);
    assert.ok(item.example, `Missing example for: ${item.value}`);
  }
});

test('HOOK_STYLES pov has hot flag set to true', () => {
  const pov = HOOK_STYLES.find((item) => item.value === 'pov');
  assert.ok(pov, 'pov style not found');
  assert.equal(pov!.hot, true);
});

test('HOOK_STYLES challenge has hot flag set to true', () => {
  const challenge = HOOK_STYLES.find((item) => item.value === 'challenge');
  assert.ok(challenge, 'challenge style not found');
  assert.equal(challenge!.hot, true);
});

test('HOOK_STYLES number, question, story do not have hot flag', () => {
  for (const value of ['number', 'question', 'story'] as HookStyle[]) {
    const item = HOOK_STYLES.find((h) => h.value === value);
    assert.ok(item, `${value} not found`);
    assert.ok(!item!.hot, `${value} should not have hot flag`);
  }
});

test('HOOK_STYLES has no duplicate values', () => {
  const values = HOOK_STYLES.map((item) => item.value);
  const unique = new Set(values);
  assert.equal(unique.size, values.length, 'Duplicate HookStyle values found');
});

// ---------------------------------------------------------------------------
// CTA_STYLES
// ---------------------------------------------------------------------------

test('CTA_STYLES contains exactly 4 CTA styles', () => {
  assert.equal(CTA_STYLES.length, 4);
});

test('CTA_STYLES contains all valid TikTokCTA values', () => {
  const expected: TikTokCTA[] = ['inbox', 'comment_key', 'bio_link', 'phone'];
  const values = CTA_STYLES.map((item) => item.value);
  for (const cta of expected) {
    assert.ok(values.includes(cta), `Missing TikTokCTA: ${cta}`);
  }
});

test('CTA_STYLES each item has value, label, icon, example', () => {
  for (const item of CTA_STYLES) {
    assert.ok(item.value, `Missing value`);
    assert.ok(item.label, `Missing label for: ${item.value}`);
    assert.ok(item.icon, `Missing icon for: ${item.value}`);
    assert.ok(item.example, `Missing example for: ${item.value}`);
  }
});

test('CTA_STYLES first item is inbox (default)', () => {
  assert.equal(CTA_STYLES[0].value, 'inbox');
});

test('CTA_STYLES has no duplicate values', () => {
  const values = CTA_STYLES.map((item) => item.value);
  const unique = new Set(values);
  assert.equal(unique.size, values.length, 'Duplicate TikTokCTA values found');
});

// ---------------------------------------------------------------------------
// EMOJI_LEVELS
// ---------------------------------------------------------------------------

test('EMOJI_LEVELS contains exactly 4 levels', () => {
  assert.equal(EMOJI_LEVELS.length, 4);
});

test('EMOJI_LEVELS values are in order: none, low, medium, high', () => {
  const values = EMOJI_LEVELS.map((item) => item.value) as EmojiLevel[];
  assert.deepEqual(values, ['none', 'low', 'medium', 'high']);
});

test('EMOJI_LEVELS each item has value, label, note', () => {
  for (const item of EMOJI_LEVELS) {
    assert.ok(item.value, `Missing value`);
    assert.ok(item.label, `Missing label for: ${item.value}`);
    assert.ok(item.note, `Missing note for: ${item.value}`);
  }
});

test('EMOJI_LEVELS has no duplicate values', () => {
  const values = EMOJI_LEVELS.map((item) => item.value);
  const unique = new Set(values);
  assert.equal(unique.size, values.length, 'Duplicate EmojiLevel values found');
});

// ---------------------------------------------------------------------------
// TOPIC_EXAMPLES
// ---------------------------------------------------------------------------

test('TOPIC_EXAMPLES has an entry for every VideoType', () => {
  const videoTypeValues = VIDEO_TYPES.map((item) => item.value);
  for (const type of videoTypeValues) {
    assert.ok(type in TOPIC_EXAMPLES, `Missing TOPIC_EXAMPLES entry for: ${type}`);
    assert.ok(TOPIC_EXAMPLES[type].length > 0, `Empty example for: ${type}`);
  }
});

test('TOPIC_EXAMPLES has no extra keys beyond VideoType values', () => {
  const videoTypeValues = VIDEO_TYPES.map((item) => item.value) as VideoType[];
  const exampleKeys = Object.keys(TOPIC_EXAMPLES) as VideoType[];
  assert.equal(exampleKeys.length, videoTypeValues.length, 'TOPIC_EXAMPLES key count mismatch');
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

test('TIKTOK_CHAR_WARNING is exactly 1500', () => {
  assert.equal(TIKTOK_CHAR_WARNING, 1500);
});

test('LS_KEY_CONFIG is a non-empty string', () => {
  assert.ok(typeof LS_KEY_CONFIG === 'string' && LS_KEY_CONFIG.length > 0);
});

test('LS_KEY_BRAND is a non-empty string', () => {
  assert.ok(typeof LS_KEY_BRAND === 'string' && LS_KEY_BRAND.length > 0);
});

test('LS_KEY_CONFIG and LS_KEY_BRAND are different keys', () => {
  assert.notEqual(LS_KEY_CONFIG, LS_KEY_BRAND);
});
