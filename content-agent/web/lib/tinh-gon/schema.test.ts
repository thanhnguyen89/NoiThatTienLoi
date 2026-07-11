/**
 * Unit tests cho schema validation của /viet-tinh-gon
 *
 * Các schema này mirror client-side validation trên page.tsx:
 *   - keyword phải từ 3 ký tự trở lên
 *   - targetLength: 800–1500
 *   - outlineType: chỉ chấp nhận enum hợp lệ
 *   - secondaryKeywords: tối đa 12 từ khóa phụ
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tinhGonConfigSchema,
  startRequestSchema,
  streamRequestSchema,
  suggestKeywordsRequestSchema,
  humannessRequestSchema,
  aiEditRequestSchema,
  tinhGonOutlineSchema,
} from './schema';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function ok(schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) {
  const result = schema.safeParse(value);
  assert.equal(result.success, true, `Expected valid but got invalid for: ${JSON.stringify(value)}`);
}

function fail(schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) {
  const result = schema.safeParse(value);
  assert.equal(result.success, false, `Expected invalid but got valid for: ${JSON.stringify(value)}`);
}

const VALID_CONFIG = {
  keyword: 'giường sắt 1m2',
  outlineType: 'review_product',
  language: 'Vietnamese',
  model: 'gemini-flash',
  targetLength: 1000,
  secondaryKeywords: ['giường sắt giá rẻ'],
  notes: '',
  dataSource: 'ai_only',
};

// ---------------------------------------------------------------------------
// tinhGonConfigSchema — mirrors validation in page.tsx handleNext()
// ---------------------------------------------------------------------------

test('tinhGonConfigSchema accepts valid config', () => {
  ok(tinhGonConfigSchema, VALID_CONFIG);
});

test('tinhGonConfigSchema rejects keyword shorter than 3 chars', () => {
  fail(tinhGonConfigSchema, { ...VALID_CONFIG, keyword: 'ab' });
});

test('tinhGonConfigSchema rejects empty keyword', () => {
  fail(tinhGonConfigSchema, { ...VALID_CONFIG, keyword: '' });
});

test('tinhGonConfigSchema rejects keyword longer than 200 chars', () => {
  fail(tinhGonConfigSchema, { ...VALID_CONFIG, keyword: 'a'.repeat(201) });
});

test('tinhGonConfigSchema rejects targetLength below 800', () => {
  fail(tinhGonConfigSchema, { ...VALID_CONFIG, targetLength: 799 });
});

test('tinhGonConfigSchema rejects targetLength above 1500', () => {
  fail(tinhGonConfigSchema, { ...VALID_CONFIG, targetLength: 1501 });
});

test('tinhGonConfigSchema accepts targetLength at boundary 800', () => {
  ok(tinhGonConfigSchema, { ...VALID_CONFIG, targetLength: 800 });
});

test('tinhGonConfigSchema accepts targetLength at boundary 1500', () => {
  ok(tinhGonConfigSchema, { ...VALID_CONFIG, targetLength: 1500 });
});

test('tinhGonConfigSchema rejects invalid outlineType', () => {
  fail(tinhGonConfigSchema, { ...VALID_CONFIG, outlineType: 'invalid_type' });
});

test('tinhGonConfigSchema accepts all valid outlineTypes', () => {
  const validTypes = [
    'review_product', 'how_to_choose', 'compare', 'faq',
    'listicle', 'problem_solution', 'step_guide',
    'story_brand', 'use_case', 'buying_guide',
  ];
  for (const outlineType of validTypes) {
    ok(tinhGonConfigSchema, { ...VALID_CONFIG, outlineType });
  }
});

test('tinhGonConfigSchema rejects more than 12 secondaryKeywords', () => {
  fail(tinhGonConfigSchema, {
    ...VALID_CONFIG,
    secondaryKeywords: Array.from({ length: 13 }, (_, i) => `keyword-${i}`),
  });
});

test('tinhGonConfigSchema defaults secondaryKeywords to [] when omitted', () => {
  const { secondaryKeywords: _, ...withoutKw } = VALID_CONFIG;
  const result = tinhGonConfigSchema.safeParse(withoutKw);
  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data.secondaryKeywords, []);
  }
});

test('tinhGonConfigSchema accepts optional brandConfig', () => {
  ok(tinhGonConfigSchema, {
    ...VALID_CONFIG,
    brandConfig: {
      name: 'Nội Thất Minh Quân',
      pronouns: 'chúng tôi',
      audience: 'gia đình trẻ',
    },
  });
});

// ---------------------------------------------------------------------------
// startRequestSchema
// ---------------------------------------------------------------------------

test('startRequestSchema wraps config correctly', () => {
  ok(startRequestSchema, { config: VALID_CONFIG });
});

test('startRequestSchema rejects missing config', () => {
  fail(startRequestSchema, {});
});

test('startRequestSchema rejects invalid nested config', () => {
  fail(startRequestSchema, { config: { ...VALID_CONFIG, keyword: 'ab' } });
});

// ---------------------------------------------------------------------------
// suggestKeywordsRequestSchema
// ---------------------------------------------------------------------------

test('suggestKeywordsRequestSchema accepts valid request', () => {
  ok(suggestKeywordsRequestSchema, { keyword: 'giường sắt', count: 8, model: 'gemini-flash' });
});

test('suggestKeywordsRequestSchema rejects count below 3', () => {
  fail(suggestKeywordsRequestSchema, { keyword: 'giường sắt', count: 2 });
});

test('suggestKeywordsRequestSchema rejects count above 12', () => {
  fail(suggestKeywordsRequestSchema, { keyword: 'giường sắt', count: 13 });
});

test('suggestKeywordsRequestSchema accepts without model (optional)', () => {
  ok(suggestKeywordsRequestSchema, { keyword: 'giường sắt' });
});

// ---------------------------------------------------------------------------
// humannessRequestSchema
// ---------------------------------------------------------------------------

test('humannessRequestSchema accepts html longer than 20 chars', () => {
  ok(humannessRequestSchema, { html: '<p>Nội dung đủ dài để kiểm tra humanness.</p>' });
});

test('humannessRequestSchema rejects html shorter than 20 chars', () => {
  fail(humannessRequestSchema, { html: '<p>Ngắn</p>' });
});

test('humannessRequestSchema accepts optional forbiddenExtra as string', () => {
  ok(humannessRequestSchema, {
    html: '<p>Nội dung đủ dài để kiểm tra humanness score của bài viết.</p>',
    forbiddenExtra: 'siêu phẩm,số 1',
  });
});

test('humannessRequestSchema accepts optional forbiddenExtra as array', () => {
  ok(humannessRequestSchema, {
    html: '<p>Nội dung đủ dài để kiểm tra humanness score của bài viết.</p>',
    forbiddenExtra: ['siêu phẩm', 'số 1'],
  });
});

// ---------------------------------------------------------------------------
// aiEditRequestSchema
// ---------------------------------------------------------------------------

const VALID_AI_EDIT = {
  selectedText: 'Đây là đoạn văn cần chỉnh sửa bằng AI.',
  command: 'shorten',
  context: { keyword: 'giường sắt', model: 'gemini-flash' },
};

test('aiEditRequestSchema accepts valid request', () => {
  ok(aiEditRequestSchema, VALID_AI_EDIT);
});

test('aiEditRequestSchema rejects selectedText shorter than 10 chars', () => {
  fail(aiEditRequestSchema, { ...VALID_AI_EDIT, selectedText: 'Ngắn quá' });
});

test('aiEditRequestSchema rejects invalid command', () => {
  fail(aiEditRequestSchema, { ...VALID_AI_EDIT, command: 'dance' });
});

test('aiEditRequestSchema accepts all valid commands', () => {
  const validCommands = ['shorten', 'expand', 'humanize', 'more_spec', 'stronger_cta', 'rewrite'];
  for (const command of validCommands) {
    ok(aiEditRequestSchema, { ...VALID_AI_EDIT, command });
  }
});

// ---------------------------------------------------------------------------
// tinhGonOutlineSchema — used when storing outline from startRequestSchema response
// ---------------------------------------------------------------------------

const VALID_OUTLINE = {
  titleOptions: ['Giường sắt 1m2 có đáng mua?'],
  selectedTitle: 'Giường sắt 1m2 có đáng mua?',
  sections: [
    { id: 'section-1', heading: 'Tổng quan sản phẩm', notes: 'Mô tả ngắn', targetWords: 150 },
    { id: 'section-2', heading: 'Ưu điểm', notes: '', targetWords: 150 },
    { id: 'section-3', heading: 'Nhược điểm', notes: '', targetWords: 150 },
    { id: 'section-4', heading: 'Kết luận', notes: 'CTA', targetWords: 150 },
  ],
  angle: 'Đánh giá thực tế cho khách hàng phổ thông',
  searchIntent: 'Người đọc muốn ra quyết định mua nhanh',
  contentGaps: ['Thiếu số liệu cụ thể'],
  estimatedWords: 1000,
  userNotes: '',
};

test('tinhGonOutlineSchema accepts valid outline', () => {
  ok(tinhGonOutlineSchema, VALID_OUTLINE);
});

test('tinhGonOutlineSchema requires at least 1 title option', () => {
  fail(tinhGonOutlineSchema, { ...VALID_OUTLINE, titleOptions: [] });
});

test('tinhGonOutlineSchema requires at least 1 section', () => {
  fail(tinhGonOutlineSchema, { ...VALID_OUTLINE, sections: [] });
});

test('tinhGonOutlineSchema rejects section targetWords below 80', () => {
  const badSection = { ...VALID_OUTLINE.sections[0], targetWords: 79 };
  fail(tinhGonOutlineSchema, { ...VALID_OUTLINE, sections: [badSection, ...VALID_OUTLINE.sections.slice(1)] });
});

test('tinhGonOutlineSchema rejects section targetWords above 260', () => {
  const badSection = { ...VALID_OUTLINE.sections[0], targetWords: 261 };
  fail(tinhGonOutlineSchema, { ...VALID_OUTLINE, sections: [badSection, ...VALID_OUTLINE.sections.slice(1)] });
});

test('tinhGonOutlineSchema rejects estimatedWords below 800', () => {
  fail(tinhGonOutlineSchema, { ...VALID_OUTLINE, estimatedWords: 799 });
});

test('tinhGonOutlineSchema rejects estimatedWords above 1500', () => {
  fail(tinhGonOutlineSchema, { ...VALID_OUTLINE, estimatedWords: 1501 });
});

// ---------------------------------------------------------------------------
// streamRequestSchema — used in generate/page.tsx startGeneration()
// ---------------------------------------------------------------------------

test('streamRequestSchema accepts valid payload', () => {
  ok(streamRequestSchema, {
    articleId: 'art-123',
    runId: 'giuong-sat-1m2-1234567890',
    config: VALID_CONFIG,
    outline: VALID_OUTLINE,
  });
});

test('streamRequestSchema rejects missing articleId', () => {
  fail(streamRequestSchema, {
    runId: 'giuong-sat-1m2-1234567890',
    config: VALID_CONFIG,
    outline: VALID_OUTLINE,
  });
});

test('streamRequestSchema rejects runId shorter than 4 chars', () => {
  fail(streamRequestSchema, {
    articleId: 'art-123',
    runId: 'ab',
    config: VALID_CONFIG,
    outline: VALID_OUTLINE,
  });
});
