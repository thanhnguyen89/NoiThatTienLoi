import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommentList, joinComments, joinPlainComments } from './parser';

// ---------------------------------------------------------------------------
// parseCommentList — numbered list format (most common AI output)
// ---------------------------------------------------------------------------

test('parseCommentList parses standard numbered list', () => {
  const raw = `1. Mẫu giường này đẹp lắm, mình đang cần đây.
2. Giá hợp lý thật, inbox hỏi thêm nhé shop.
3. Chất lượng trông ổn, giao có nhanh không ạ?`;

  const result = parseCommentList(raw);

  assert.equal(result.length, 3);
  assert.ok(result[0].includes('Mẫu giường'), 'Number prefix should be stripped');
  assert.ok(!result[0].startsWith('1.'), 'Number prefix should be stripped');
  assert.ok(result[1].includes('Giá hợp lý'));
  assert.ok(result[2].includes('Chất lượng'));
});

test('parseCommentList strips number+period prefix', () => {
  const raw = '1. Comment đây\n2. Comment nữa';
  const result = parseCommentList(raw);
  assert.ok(!result[0].startsWith('1.'));
  assert.ok(!result[1].startsWith('2.'));
});

test('parseCommentList strips number+parenthesis prefix', () => {
  const raw = '1) Comment đây\n2) Comment nữa';
  const result = parseCommentList(raw);
  assert.ok(!result[0].startsWith('1)'));
  assert.ok(!result[1].startsWith('2)'));
});

test('parseCommentList strips dash/bullet prefix', () => {
  const raw = '- Comment đây\n* Comment nữa\n• Comment ba';
  const result = parseCommentList(raw);
  assert.ok(!result[0].startsWith('-'));
  assert.ok(!result[1].startsWith('*'));
  assert.ok(!result[2].startsWith('•'));
});

// ---------------------------------------------------------------------------
// parseCommentList — expectedCount truncation
// ---------------------------------------------------------------------------

test('parseCommentList truncates to expectedCount', () => {
  const raw = '1. A\n2. B\n3. C\n4. D\n5. E';
  const result = parseCommentList(raw, 3);
  assert.equal(result.length, 3);
});

test('parseCommentList returns all when expectedCount >= lines', () => {
  const raw = '1. A\n2. B';
  const result = parseCommentList(raw, 10);
  assert.equal(result.length, 2);
});

test('parseCommentList works without expectedCount', () => {
  const raw = '1. A\n2. B\n3. C';
  const result = parseCommentList(raw);
  assert.equal(result.length, 3);
});

// ---------------------------------------------------------------------------
// parseCommentList — JSON array format
// ---------------------------------------------------------------------------

test('parseCommentList parses JSON array format', () => {
  const raw = '["Comment một", "Comment hai", "Comment ba"]';
  const result = parseCommentList(raw, 3);
  assert.equal(result.length, 3);
  assert.ok(result[0].includes('Comment một'));
  assert.ok(result[1].includes('Comment hai'));
});

test('parseCommentList truncates JSON array to expectedCount', () => {
  const raw = '["A", "B", "C", "D", "E"]';
  const result = parseCommentList(raw, 2);
  assert.equal(result.length, 2);
});

test('parseCommentList falls through to line parser on invalid JSON', () => {
  const raw = '[not valid json]\n1. Comment thật';
  const result = parseCommentList(raw);
  assert.ok(result.length > 0, 'should fall through to line parser');
});

test('parseCommentList handles JSON array with numbered prefixes inside items', () => {
  const raw = '["1. Comment đây", "2. Comment nữa"]';
  const result = parseCommentList(raw);
  // cleanCommentLine strips the "1. " prefix inside each item
  assert.ok(!result[0].startsWith('1.'), 'prefix should be stripped from JSON items too');
});

// ---------------------------------------------------------------------------
// parseCommentList — header/preamble filtering
// ---------------------------------------------------------------------------

test('parseCommentList filters out "here are" header line', () => {
  const raw = `Here are 5 comments:
1. Comment một
2. Comment hai`;

  const result = parseCommentList(raw);
  const hasHeader = result.some((line) => /here are/i.test(line));
  assert.ok(!hasHeader, '"Here are" line should be filtered');
  assert.equal(result.length, 2);
});

test('parseCommentList filters out "danh sach" header line', () => {
  const raw = `Danh sach comment:
1. Comment một
2. Comment hai`;

  const result = parseCommentList(raw);
  const hasHeader = result.some((line) => /danh sach/i.test(line));
  assert.ok(!hasHeader, '"Danh sach" header should be filtered');
});

test('parseCommentList filters out "result"/"output" header lines', () => {
  const raw = `Result:
1. Comment thật
Output:
2. Comment nữa`;

  const result = parseCommentList(raw);
  const hasResult = result.some((line) => /^result|^output/i.test(line));
  assert.ok(!hasResult, 'result/output lines should be filtered');
});

test('parseCommentList filters out code fence lines', () => {
  const raw = '```\n1. Comment đây\n2. Comment nữa\n```';
  const result = parseCommentList(raw);
  const hasFence = result.some((line) => line.startsWith('```'));
  assert.ok(!hasFence, 'code fence should be filtered');
});

// ---------------------------------------------------------------------------
// parseCommentList — deduplication
// ---------------------------------------------------------------------------

test('parseCommentList deduplicates identical comments', () => {
  const raw = '1. Mẫu đẹp quá\n2. Mẫu đẹp quá\n3. Comment khác';
  const result = parseCommentList(raw);
  assert.equal(result.length, 2, 'Duplicate should be removed');
});

test('parseCommentList deduplicates case-insensitively', () => {
  const raw = '1. INBOX SHOP\n2. inbox shop\n3. Comment mới';
  const result = parseCommentList(raw);
  assert.equal(result.length, 2, 'Case-insensitive duplicate should be removed');
});

// ---------------------------------------------------------------------------
// parseCommentList — quote stripping
// ---------------------------------------------------------------------------

test('parseCommentList strips leading and trailing quotes from items', () => {
  const raw = '1. "Giường này đẹp thật"\n2. \'Inbox hỏi giá nha\'';
  const result = parseCommentList(raw);
  assert.ok(!result[0].startsWith('"'), 'leading quote stripped');
  assert.ok(!result[0].endsWith('"'), 'trailing quote stripped');
  assert.ok(!result[1].startsWith("'"), 'leading quote stripped');
});

// ---------------------------------------------------------------------------
// parseCommentList — empty/edge cases
// ---------------------------------------------------------------------------

test('parseCommentList returns empty array for empty string', () => {
  const result = parseCommentList('');
  assert.deepEqual(result, []);
});

test('parseCommentList returns empty array for whitespace-only string', () => {
  const result = parseCommentList('   \n\n  ');
  assert.deepEqual(result, []);
});

test('parseCommentList handles single comment line without number', () => {
  const result = parseCommentList('Inbox shop hỏi thêm nhé');
  assert.equal(result.length, 1);
  assert.ok(result[0].includes('Inbox shop'));
});

// ---------------------------------------------------------------------------
// parseCommentList — fallback (paragraph split)
// ---------------------------------------------------------------------------

test('parseCommentList falls back to paragraph split when no numbered lines', () => {
  // A block of text with double newline separators
  const raw = `Mình thấy mẫu này ổn lắm.

Hỏi thêm về giá nhé shop.`;

  const result = parseCommentList(raw);
  // Should produce at least 1 item from fallback paragraph split
  assert.ok(result.length >= 1);
});

// ---------------------------------------------------------------------------
// joinComments
// ---------------------------------------------------------------------------

test('joinComments formats as numbered list with newlines', () => {
  const comments = ['Comment một', 'Comment hai', 'Comment ba'];
  const result = joinComments(comments);
  assert.ok(result.startsWith('1. Comment một'), 'should start with 1.');
  assert.ok(result.includes('2. Comment hai'));
  assert.ok(result.includes('3. Comment ba'));
});

test('joinComments handles single comment', () => {
  const result = joinComments(['Chỉ một comment']);
  assert.equal(result, '1. Chỉ một comment');
});

test('joinComments handles empty array', () => {
  const result = joinComments([]);
  assert.equal(result, '');
});

test('joinComments joins with \\n separators', () => {
  const result = joinComments(['A', 'B']);
  const lines = result.split('\n');
  assert.equal(lines.length, 2);
  assert.equal(lines[0], '1. A');
  assert.equal(lines[1], '2. B');
});

// ---------------------------------------------------------------------------
// joinPlainComments
// ---------------------------------------------------------------------------

test('joinPlainComments joins with \\n\\n default separator', () => {
  const result = joinPlainComments(['A', 'B', 'C']);
  assert.equal(result, 'A\n\nB\n\nC');
});

test('joinPlainComments accepts custom separator', () => {
  const result = joinPlainComments(['A', 'B', 'C'], '\n---\n');
  assert.equal(result, 'A\n---\nB\n---\nC');
});

test('joinPlainComments handles empty array', () => {
  const result = joinPlainComments([]);
  assert.equal(result, '');
});

test('joinPlainComments handles single item', () => {
  const result = joinPlainComments(['Only one']);
  assert.equal(result, 'Only one');
});
