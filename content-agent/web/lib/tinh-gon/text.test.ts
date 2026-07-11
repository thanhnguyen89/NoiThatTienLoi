import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampPercentage,
  computeKeywordDensity,
  countWords,
  escapeRegExp,
  sanitizeHtmlArticle,
  slugify,
  stripHtml,
  stripVietnamese,
  buildMetaDescription,
} from './text';

// ---------------------------------------------------------------------------
// escapeRegExp
// ---------------------------------------------------------------------------

test('escapeRegExp escapes special regex characters', () => {
  assert.equal(escapeRegExp('a.b*c'), 'a\\.b\\*c');
  assert.equal(escapeRegExp('price (VNĐ)'), 'price \\(VNĐ\\)');
  assert.equal(escapeRegExp('no-special'), 'no-special');
});

// ---------------------------------------------------------------------------
// stripVietnamese
// ---------------------------------------------------------------------------

test('stripVietnamese removes diacritics and replaces đ/Đ', () => {
  assert.equal(stripVietnamese('giường sắt'), 'giuong sat');
  assert.equal(stripVietnamese('Đặt hàng'), 'Dat hang');
  assert.equal(stripVietnamese('nội thất'), 'noi that');
  assert.equal(stripVietnamese(''), '');
});

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

test('slugify converts Vietnamese title to slug', () => {
  assert.equal(slugify('Giường Sắt 1m2'), 'giuong-sat-1m2');
  assert.equal(slugify('Nội Thất Minh Quân'), 'noi-that-minh-quan');
});

test('slugify strips special characters and collapses hyphens', () => {
  assert.equal(slugify('hello   world!'), 'hello-world');
  assert.equal(slugify('a--b___c'), 'a-b-c');
});

test('slugify truncates to 80 chars', () => {
  const long = 'a'.repeat(100);
  assert.equal(slugify(long).length, 80);
});

test('slugify returns empty string for empty input', () => {
  assert.equal(slugify(''), '');
});

// ---------------------------------------------------------------------------
// stripHtml
// ---------------------------------------------------------------------------

test('stripHtml removes tags and normalises whitespace', () => {
  const result = stripHtml('<p>Hello <strong>world</strong></p>');
  assert.equal(result, 'Hello world');
});

test('stripHtml converts block tags to newline then collapses', () => {
  const result = stripHtml('<h1>Title</h1><p>Para</p>');
  assert.ok(result.includes('Title'));
  assert.ok(result.includes('Para'));
});

test('stripHtml decodes &nbsp; and &amp;', () => {
  assert.ok(stripHtml('a&nbsp;b').includes('a b'));
  assert.ok(stripHtml('a&amp;b').includes('a&b'));
});

test('stripHtml returns empty string for empty input', () => {
  assert.equal(stripHtml(''), '');
});

// ---------------------------------------------------------------------------
// countWords
// ---------------------------------------------------------------------------

test('countWords counts words in plain HTML', () => {
  const html = '<p>Giường sắt giá rẻ toàn quốc</p>';
  assert.equal(countWords(html), 5);
});

test('countWords returns 0 for empty string', () => {
  assert.equal(countWords(''), 0);
});

test('countWords handles nested tags', () => {
  const html = '<article><h1>Tủ quần áo</h1><p>Giá tốt</p></article>';
  const count = countWords(html);
  assert.ok(count >= 4);
});

// ---------------------------------------------------------------------------
// computeKeywordDensity
// ---------------------------------------------------------------------------

test('computeKeywordDensity returns 0 for empty keyword', () => {
  assert.equal(computeKeywordDensity('<p>Some text</p>', ''), 0);
});

test('computeKeywordDensity returns 0 for empty html', () => {
  assert.equal(computeKeywordDensity('', 'giường sắt'), 0);
});

test('computeKeywordDensity is Vietnamese-normalised', () => {
  // "giường sắt" appears once in a ~10-word paragraph
  const html = '<p>Giường sắt 1m2 là lựa chọn phổ biến cho phòng trọ nhỏ.</p>';
  const density = computeKeywordDensity(html, 'giường sắt');
  assert.ok(density > 0);
  assert.ok(density < 100);
});

test('computeKeywordDensity returns finite number rounded to 2 decimal places', () => {
  const html = '<p>giường sắt giường sắt giường sắt nội thất giá rẻ</p>';
  const density = computeKeywordDensity(html, 'giường sắt');
  assert.ok(Number.isFinite(density));
  assert.equal(density, parseFloat(density.toFixed(2)));
});

// ---------------------------------------------------------------------------
// clampPercentage
// ---------------------------------------------------------------------------

test('clampPercentage clamps values to [0, 100]', () => {
  assert.equal(clampPercentage(-5), 0);
  assert.equal(clampPercentage(105), 100);
  assert.equal(clampPercentage(75.5), 75.5);
  assert.equal(clampPercentage(0), 0);
  assert.equal(clampPercentage(100), 100);
});

// ---------------------------------------------------------------------------
// buildMetaDescription
// ---------------------------------------------------------------------------

test('buildMetaDescription produces ≤160 char string with keyword', () => {
  const meta = buildMetaDescription('Giường sắt 1m2 loại tốt', 'giường sắt 1m2');
  assert.ok(meta.length <= 160);
  assert.ok(meta.toLowerCase().includes('giường sắt 1m2'));
});

test('buildMetaDescription truncates long description with ellipsis', () => {
  const longTitle = 'a'.repeat(200);
  const meta = buildMetaDescription(longTitle, 'keyword');
  assert.ok(meta.length <= 160);
  assert.ok(meta.endsWith('...'));
});

test('buildMetaDescription uses angle over title when provided', () => {
  const meta = buildMetaDescription('Title Text', 'keyword', 'Góc nhìn thực tế');
  assert.ok(meta.includes('Góc nhìn thực tế'));
});

// ---------------------------------------------------------------------------
// sanitizeHtmlArticle
// ---------------------------------------------------------------------------

test('sanitizeHtmlArticle extracts <article> block when present', () => {
  const raw = 'Preamble\n<article><h1>Title</h1><p>Body</p></article>\nPostamble';
  const result = sanitizeHtmlArticle(raw, 'Fallback');
  assert.ok(result.startsWith('<article>'));
  assert.ok(result.endsWith('</article>'));
  assert.ok(!result.includes('Preamble'));
});

test('sanitizeHtmlArticle strips markdown fences', () => {
  const raw = '```html\n<article><h1>Hi</h1></article>\n```';
  const result = sanitizeHtmlArticle(raw, 'Fallback');
  assert.ok(!result.includes('```'));
});

test('sanitizeHtmlArticle wraps html without <article> tag', () => {
  const raw = '<h1>Title</h1><p>Paragraph</p>';
  const result = sanitizeHtmlArticle(raw, 'Fallback');
  assert.ok(result.startsWith('<article>'));
  assert.ok(result.endsWith('</article>'));
});

test('sanitizeHtmlArticle adds fallback h1 when html has no h1', () => {
  const raw = '<p>Just a paragraph without heading.</p>';
  const result = sanitizeHtmlArticle(raw, 'My Fallback Title');
  assert.ok(result.includes('<h1>My Fallback Title</h1>'));
});

test('sanitizeHtmlArticle converts plain text to html', () => {
  const raw = 'First line\nSecond line\nThird line';
  const result = sanitizeHtmlArticle(raw, 'Title');
  assert.ok(result.startsWith('<article>'));
  assert.ok(result.includes('<p>'));
});

test('sanitizeHtmlArticle returns fallback for empty input', () => {
  const result = sanitizeHtmlArticle('', 'Empty Title');
  assert.ok(result.includes('<h1>Empty Title</h1>'));
  assert.ok(result.includes('Nội dung tạm thời chưa được tạo'));
});
