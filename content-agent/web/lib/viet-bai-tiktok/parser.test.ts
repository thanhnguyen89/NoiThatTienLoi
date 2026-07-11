import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTiktokOutput } from './parser';

// ---------------------------------------------------------------------------
// Structured output — TITLE / CAPTION / HASHTAGS labels
// ---------------------------------------------------------------------------

test('parseTiktokOutput extracts TITLE, CAPTION, HASHTAGS from structured EN labels', () => {
  const raw = `TITLE: Giường sắt 250kg không gãy
CAPTION:
Mình vừa test giường khung 40x40 với 2 người ngồi nhảy mạnh. Nan gỗ không cong, mối hàn không nứt. Giá xưởng chỉ 1.2 triệu.
HASHTAGS:
#noithatminhquan #giuongsat #giaxuong`;

  const result = parseTiktokOutput(raw);

  assert.equal(result.title, 'Giường sắt 250kg không gãy');
  assert.ok(result.caption.includes('Mình vừa test'), 'caption should contain body text');
  assert.ok(!result.caption.includes('CAPTION:'), 'caption label should be removed');
  assert.ok(result.hashtags.includes('#noithatminhquan'));
  assert.ok(result.hashtags.includes('#giuongsat'));
  assert.ok(result.hashtags.includes('#giaxuong'));
});

test('parseTiktokOutput recognizes Vietnamese labels TIÊU ĐỀ and MÔ TẢ', () => {
  const raw = `TIÊU ĐỀ: Mẫu giường mới 2026
MÔ TẢ:
Khung sắt vuông 40x40, sơn tĩnh điện trắng.
HASHTAGS:
#noithat #giuongmoi`;

  const result = parseTiktokOutput(raw);

  assert.equal(result.title, 'Mẫu giường mới 2026');
  assert.ok(result.caption.includes('Khung sắt'), 'caption should contain body text');
  assert.ok(result.hashtags.includes('#noithat'));
  assert.ok(result.hashtags.includes('#giuongmoi'));
});

// ---------------------------------------------------------------------------
// Markdown stripping
// ---------------------------------------------------------------------------

test('parseTiktokOutput strips **bold** from title and caption', () => {
  const raw = `TITLE: **Giá xưởng** không qua trung gian
CAPTION:
**Minh Quân** chuyên cung cấp giường sắt giá tốt từ xưởng.
HASHTAGS:
#giaxuong`;

  const result = parseTiktokOutput(raw);

  assert.ok(!result.title.includes('**'), 'title should not contain **');
  assert.ok(!result.caption.includes('**'), 'caption should not contain **');
  assert.equal(result.title, 'Giá xưởng không qua trung gian');
  assert.ok(result.caption.includes('Minh Quân'));
});

test('parseTiktokOutput strips *italic* from caption', () => {
  const raw = `TITLE: Giường sắt giá rẻ
CAPTION:
Mình có *giường sắt* 1m6 giao liền.
HASHTAGS:
#giuongsat`;

  const result = parseTiktokOutput(raw);
  assert.ok(!result.caption.includes('*giường'), 'italic should be stripped');
  assert.ok(result.caption.includes('giường sắt'));
});

test('parseTiktokOutput strips ## heading markers', () => {
  const raw = `## TITLE: Giường sắt 990k
### CAPTION:
Mình có hàng sẵn giao liền.
HASHTAGS:
#giuongsat`;

  const result = parseTiktokOutput(raw);
  assert.ok(!result.title.startsWith('#'), 'title should not start with #');
});

// ---------------------------------------------------------------------------
// Emoji stripping from title
// ---------------------------------------------------------------------------

test('parseTiktokOutput strips emoji from title', () => {
  const raw = `TITLE: 🔥 Giá sốc tháng 6 🔥
CAPTION:
Giường sắt 990k giao liền toàn quốc.
HASHTAGS:
#sale #giuongsat`;

  const result = parseTiktokOutput(raw);
  assert.ok(!result.title.includes('🔥'), 'emoji should be stripped from title');
  assert.ok(result.title.includes('Giá sốc'), 'title text should remain');
});

// ---------------------------------------------------------------------------
// Title truncation to 50 chars
// ---------------------------------------------------------------------------

test('parseTiktokOutput truncates title to 50 characters', () => {
  const longTitle = 'Giường sắt khung vuông 40x40 sơn tĩnh điện đen giá xưởng';
  const raw = `TITLE: ${longTitle}
CAPTION:
Inbox mình để báo giá.
HASHTAGS:
#giuongsat`;

  const result = parseTiktokOutput(raw);
  assert.ok(result.title.length <= 50, `Title length ${result.title.length} exceeds 50`);
});

test('parseTiktokOutput does not truncate short title', () => {
  const raw = `TITLE: Giường sắt 990k
CAPTION:
Hàng có sẵn.
HASHTAGS:
#giuongsat`;

  const result = parseTiktokOutput(raw);
  assert.equal(result.title, 'Giường sắt 990k');
});

// ---------------------------------------------------------------------------
// Quote stripping from title
// ---------------------------------------------------------------------------

test('parseTiktokOutput strips leading and trailing quotes from title', () => {
  const raw = `TITLE: "Giường sắt giá xưởng"
CAPTION:
Giao nhanh toàn quốc.
HASHTAGS:
#noithat`;

  const result = parseTiktokOutput(raw);
  assert.ok(!result.title.startsWith('"'), 'leading quote should be stripped');
  assert.ok(!result.title.endsWith('"'), 'trailing quote should be stripped');
  assert.ok(result.title.includes('Giường'), 'title text should remain');
});

// ---------------------------------------------------------------------------
// Hashtag deduplication (case-insensitive)
// ---------------------------------------------------------------------------

test('parseTiktokOutput deduplicates hashtags case-insensitively', () => {
  const raw = `TITLE: Test
CAPTION:
Caption content.
HASHTAGS:
#NoiThat #noithat #NOITHAT #giuongsat`;

  const result = parseTiktokOutput(raw);
  const noithatTags = result.hashtags.filter((t) => t.toLowerCase() === '#noithat');
  assert.equal(noithatTags.length, 1, 'Duplicate #noithat should appear only once');
  assert.ok(result.hashtags.includes('#giuongsat'));
});

test('parseTiktokOutput merges hashtags from section and raw text, deduplicating', () => {
  const raw = `TITLE: Test
CAPTION:
Caption without tags.
HASHTAGS:
#noithat #giuongsat #noithat`;

  const result = parseTiktokOutput(raw);
  const count = result.hashtags.filter((t) => t.toLowerCase() === '#noithat').length;
  assert.equal(count, 1, 'Duplicate in HASHTAGS section should be deduplicated');
});

// ---------------------------------------------------------------------------
// Hashtag cleanup from caption body
// ---------------------------------------------------------------------------

test('parseTiktokOutput removes hashtags from caption body', () => {
  const raw = `TITLE: Test
CAPTION:
Giường sắt giá rẻ #noithat inbox ngay nha.
HASHTAGS:
#noithat #giuongsat`;

  const result = parseTiktokOutput(raw);
  assert.ok(!result.caption.includes('#noithat'), 'hashtag should be removed from caption');
});

// ---------------------------------------------------------------------------
// Hashtag normalization
// ---------------------------------------------------------------------------

test('parseTiktokOutput normalizes ## double-hash to single #', () => {
  const raw = `TITLE: Test
CAPTION:
Caption here.
HASHTAGS:
##noithat #giuongsat`;

  const result = parseTiktokOutput(raw);
  const doubleHash = result.hashtags.filter((t) => t.startsWith('##'));
  assert.equal(doubleHash.length, 0, 'No tags should start with ##');
});

test('parseTiktokOutput strips hyphens from hashtag text via normalizeTag', () => {
  // extractHashtags captures #noi-that via regex (includes -),
  // but normalizeTag strips non-[\p{L}\p{N}_] chars, so hyphen is removed.
  // This is a known behavior gap — see fix-bug-viet-bai-tiktok.md
  const raw = `TITLE: Test
CAPTION:
Caption here.
HASHTAGS:
#noi-that`;

  const result = parseTiktokOutput(raw);
  // hyphen is stripped by normalizeTag: #noi-that → #noithat
  const withHyphen = result.hashtags.filter((t) => t.includes('-'));
  assert.equal(withHyphen.length, 0, 'Hyphens should be stripped from hashtag text');
  // the tag should still exist, just without the hyphen
  assert.ok(result.hashtags.length > 0);
});

// ---------------------------------------------------------------------------
// Unstructured fallback (no section labels)
// ---------------------------------------------------------------------------

test('parseTiktokOutput uses first line as title fallback in unstructured output', () => {
  const raw = `Giường sắt chịu lực 250kg
Khung vuông 40x40mm, mối hàn chuẩn, nan gỗ chắc.
Inbox mình báo giá ngay nhé.`;

  const result = parseTiktokOutput(raw);
  // first non-empty line becomes title (up to 50 chars)
  assert.ok(result.title.length > 0, 'title should not be empty');
  assert.ok(result.caption.length > 0, 'caption should have remaining lines');
  // title should NOT duplicate in caption
  const titleInCaption = result.caption.startsWith(result.title);
  assert.ok(!titleInCaption, 'title line should not repeat in caption');
});

test('parseTiktokOutput handles single-line unstructured input', () => {
  const raw = 'Inbox mình để được báo giá ngay nhé';
  const result = parseTiktokOutput(raw);
  // either title or caption should have content
  const hasContent = result.title.length > 0 || result.caption.length > 0;
  assert.ok(hasContent, 'should produce some output for single-line input');
});

// ---------------------------------------------------------------------------
// Empty / whitespace-only input
// ---------------------------------------------------------------------------

test('parseTiktokOutput returns empty strings and array for empty input', () => {
  const result = parseTiktokOutput('');
  assert.equal(result.title, '');
  assert.equal(result.caption, '');
  assert.deepEqual(result.hashtags, []);
});

test('parseTiktokOutput returns empty for whitespace-only input', () => {
  const result = parseTiktokOutput('   \n\n  ');
  assert.equal(result.title, '');
  assert.equal(result.caption, '');
  assert.deepEqual(result.hashtags, []);
});

// ---------------------------------------------------------------------------
// Fallback title from caption when title section is missing
// ---------------------------------------------------------------------------

test('parseTiktokOutput falls back to first sentence of caption when TITLE is absent', () => {
  const raw = `CAPTION:
Giường sắt 1m6 chịu lực 200kg. Khung vuông 40x40, giao liền.
HASHTAGS:
#giuongsat`;

  const result = parseTiktokOutput(raw);
  assert.ok(result.title.length > 0, 'fallback title should be generated');
  assert.ok(result.title.length <= 50, 'fallback title must be <= 50 chars');
});

// ---------------------------------------------------------------------------
// Return shape
// ---------------------------------------------------------------------------

test('parseTiktokOutput always returns { title, caption, hashtags } shape', () => {
  const result = parseTiktokOutput('anything here');
  assert.ok('title' in result);
  assert.ok('caption' in result);
  assert.ok('hashtags' in result);
  assert.ok(Array.isArray(result.hashtags));
  assert.ok(typeof result.title === 'string');
  assert.ok(typeof result.caption === 'string');
});
