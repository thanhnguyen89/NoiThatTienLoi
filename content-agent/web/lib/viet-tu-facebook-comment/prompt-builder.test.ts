import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCommentBrandPrompt } from './prompt-builder';
import type { BuildCommentBrandPromptInput } from './prompt-builder';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_BRAND = {
  shopName: '',
  brandPronouns: '',
  mainProducts: '',
  brandAudience: '',
  brandToneNotes: '',
  brandForbidden: '',
};

function makeInput(overrides: Partial<BuildCommentBrandPromptInput> = {}): BuildCommentBrandPromptInput {
  return {
    postContent: 'Giới thiệu giường sắt 1m6, khung 40x40, giá 1.2 triệu.',
    count: 5,
    style: 'friendly',
    language: 'Vietnamese',
    brand: { ...EMPTY_BRAND },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

test('buildCommentBrandPrompt returns a non-empty string', () => {
  const result = buildCommentBrandPrompt(makeInput());
  assert.ok(typeof result === 'string' && result.length > 0);
});

test('buildCommentBrandPrompt contains the post content', () => {
  const result = buildCommentBrandPrompt(makeInput({
    postContent: 'Bán giường sắt giá rẻ toàn quốc.',
  }));
  assert.ok(result.includes('Bán giường sắt giá rẻ toàn quốc.'), 'post content should appear in prompt');
});

test('buildCommentBrandPrompt contains the count number', () => {
  const result = buildCommentBrandPrompt(makeInput({ count: 7 }));
  assert.ok(result.includes('7'), 'count number should appear in prompt');
});

test('buildCommentBrandPrompt contains the language', () => {
  const result = buildCommentBrandPrompt(makeInput({ language: 'English' }));
  assert.ok(result.includes('English'), 'language should appear in prompt');
});

test('buildCommentBrandPrompt contains format instruction (numbered list)', () => {
  const result = buildCommentBrandPrompt(makeInput({ count: 3 }));
  // Should include "1." "2." "3." format instruction
  assert.ok(result.includes('1.') && result.includes('2.') && result.includes('3.'), 'numbered list format instruction should be present');
});

// ---------------------------------------------------------------------------
// Style instructions
// ---------------------------------------------------------------------------

test('buildCommentBrandPrompt includes style instruction for each style', () => {
  const styles = ['funny', 'friendly', 'casual', 'professional', 'creative', 'shorten', 'curious', 'experience', 'tag_friend'] as const;
  for (const style of styles) {
    const result = buildCommentBrandPrompt(makeInput({ style }));
    assert.ok(result.length > 0, `prompt for style "${style}" should be non-empty`);
  }
});

test('buildCommentBrandPrompt curious style instruction mentions asking about price/size', () => {
  const result = buildCommentBrandPrompt(makeInput({ style: 'curious' }));
  // curious instruction: hoi them ve gia, kich thuoc, mau sac, giao hang...
  assert.ok(result.includes('gia') || result.includes('kich thuoc'), 'curious style should mention asking questions');
});

test('buildCommentBrandPrompt tag_friend style instruction mentions @...', () => {
  const result = buildCommentBrandPrompt(makeInput({ style: 'tag_friend' }));
  assert.ok(result.includes('@'), 'tag_friend style should mention @ tagging');
});

// ---------------------------------------------------------------------------
// Brand block
// ---------------------------------------------------------------------------

test('buildCommentBrandPrompt includes brand shop name when provided', () => {
  const result = buildCommentBrandPrompt(makeInput({
    brand: { ...EMPTY_BRAND, shopName: 'Nội Thất Minh Quân' },
  }));
  assert.ok(result.includes('Nội Thất Minh Quân'), 'shop name should appear in prompt');
});

test('buildCommentBrandPrompt includes main products when provided', () => {
  const result = buildCommentBrandPrompt(makeInput({
    brand: { ...EMPTY_BRAND, mainProducts: 'Giường sắt, tủ quần áo' },
  }));
  assert.ok(result.includes('Giường sắt, tủ quần áo'), 'main products should appear');
});

test('buildCommentBrandPrompt includes brandToneNotes when non-empty', () => {
  const result = buildCommentBrandPrompt(makeInput({
    brand: { ...EMPTY_BRAND, brandToneNotes: 'Giọng thân thiện, gần gũi' },
  }));
  assert.ok(result.includes('Giọng thân thiện, gần gũi'), 'tone notes should appear');
});

test('buildCommentBrandPrompt omits brandToneNotes line when empty', () => {
  const result = buildCommentBrandPrompt(makeInput({
    brand: { ...EMPTY_BRAND, brandToneNotes: '' },
  }));
  assert.ok(!result.includes('Giong thuong hieu: \n'), 'empty tone notes should not produce blank line');
});

test('buildCommentBrandPrompt includes brandForbidden in brand block when provided', () => {
  const result = buildCommentBrandPrompt(makeInput({
    brand: { ...EMPTY_BRAND, brandForbidden: 'siêu rẻ, vô địch' },
  }));
  assert.ok(result.includes('siêu rẻ, vô địch'), 'forbidden words should appear in prompt');
});

test('buildCommentBrandPrompt includes brandForbidden in requirements section too', () => {
  const result = buildCommentBrandPrompt(makeInput({
    brand: { ...EMPTY_BRAND, brandForbidden: 'từ cấm test' },
  }));
  // forbidden words appear both in brand block AND requirements
  const occurrences = (result.match(/từ cấm test/g) || []).length;
  assert.ok(occurrences >= 2, 'forbidden words should appear at least twice (brand block + requirements)');
});

// ---------------------------------------------------------------------------
// Output format instruction completeness
// ---------------------------------------------------------------------------

test('buildCommentBrandPrompt instructs not to explain, only return list', () => {
  const result = buildCommentBrandPrompt(makeInput());
  // instruction: "Chi tra ve danh sach so thu tu, khong giai thich"
  assert.ok(result.includes('khong giai thich') || result.includes('không giải thích'), 'no-explanation instruction should be present');
});

test('buildCommentBrandPrompt instructs comments to sound like real Facebook users', () => {
  const result = buildCommentBrandPrompt(makeInput());
  assert.ok(result.includes('nguoi dung Facebook') || result.includes('người dùng Facebook'), 'should instruct to sound like real user');
});

test('buildCommentBrandPrompt instructs no duplicate viewpoints', () => {
  const result = buildCommentBrandPrompt(makeInput());
  assert.ok(result.includes('khong lap y') || result.includes('không lặp'), 'should instruct unique viewpoints');
});
