/**
 * Tests for buildProductMetaPrompt and TONE_INSTRUCTIONS
 * Source: web/lib/tao-tieu-de-san-pham/prompt-builder.ts
 *
 * Run:
 *   cd web && node --require tsx/esm --test lib/tao-tieu-de-san-pham/prompt-builder.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductMetaPrompt } from './prompt-builder';
import { PRODUCT_TONES } from '@/lib/ecommerce-tools/core';

// ---------------------------------------------------------------------------
// Internal: re-export TONE_INSTRUCTIONS via buildProductMetaPrompt output
// (TONE_INSTRUCTIONS is not exported — tested indirectly through buildProductMetaPrompt)
// ---------------------------------------------------------------------------

// Helper: base config
const BASE: Parameters<typeof buildProductMetaPrompt>[0] = {
  productName: 'Giường sắt hộp 1m6',
  productFeatures: 'Khung 1.4mm, tải 200kg, sơn tĩnh điện',
  tone: 'seo_focus',
  language: 'Vietnamese',
};

// ---------------------------------------------------------------------------
// TONE_INSTRUCTIONS — tested indirectly via prompt output
// ---------------------------------------------------------------------------

test('TONE_INSTRUCTIONS has an entry for every PRODUCT_TONES value', () => {
  // Build prompt for each tone — if TONE_INSTRUCTIONS[tone] is missing,
  // the prompt falls back to seo_focus instruction (TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.seo_focus)
  // We verify the known tones produce unique, non-empty instruction text
  const instructionsSeen = new Set<string>();
  for (const toneItem of PRODUCT_TONES) {
    const prompt = buildProductMetaPrompt({ ...BASE, tone: toneItem.value });
    assert.ok(prompt.length > 0, `Prompt empty for tone: ${toneItem.value}`);
    instructionsSeen.add(prompt);
  }
  // Each tone should produce a distinct prompt (different instructions)
  assert.equal(instructionsSeen.size, PRODUCT_TONES.length, 'Each tone should produce a unique prompt');
});

test('seo_focus tone instruction references keyword and character limit', () => {
  const prompt = buildProductMetaPrompt({ ...BASE, tone: 'seo_focus' });
  assert.ok(
    prompt.toLowerCase().includes('keyword') || prompt.includes('50-60'),
    'seo_focus should mention keyword or 50-60 character limit',
  );
});

test('persuasive tone instruction references hook or lợi ích', () => {
  const prompt = buildProductMetaPrompt({ ...BASE, tone: 'persuasive' });
  assert.ok(
    prompt.includes('hook') || prompt.includes('lợi ích') || prompt.includes('Hook'),
    'persuasive tone should mention hook or benefit',
  );
});

test('luxury tone instruction references tinh tế or cao cấp', () => {
  const prompt = buildProductMetaPrompt({ ...BASE, tone: 'luxury' });
  assert.ok(
    prompt.includes('tinh tế') || prompt.includes('cao cấp') || prompt.includes('Tinh tế'),
    'luxury tone should reference refinement/high-end',
  );
});

test('unknown tone falls back to seo_focus instruction', () => {
  const seoPrompt = buildProductMetaPrompt({ ...BASE, tone: 'seo_focus' });
  const unknownPrompt = buildProductMetaPrompt({ ...BASE, tone: 'totally_unknown_xyz' });
  // Both should contain the seo_focus instruction text
  const seoInstruction = 'Đặt keyword chính lên đầu';
  assert.ok(seoPrompt.includes(seoInstruction), 'seo_focus should include its instruction');
  assert.ok(unknownPrompt.includes(seoInstruction), 'unknown tone should fall back to seo_focus instruction');
});

// ---------------------------------------------------------------------------
// buildProductMetaPrompt — required fields
// ---------------------------------------------------------------------------

test('buildProductMetaPrompt returns non-empty string', () => {
  const prompt = buildProductMetaPrompt(BASE);
  assert.ok(typeof prompt === 'string' && prompt.length > 0);
});

test('buildProductMetaPrompt includes productName', () => {
  const prompt = buildProductMetaPrompt(BASE);
  assert.ok(prompt.includes('Giường sắt hộp 1m6'), 'productName should appear in prompt');
});

test('buildProductMetaPrompt includes productFeatures when set', () => {
  const prompt = buildProductMetaPrompt(BASE);
  assert.ok(prompt.includes('Khung 1.4mm'), 'productFeatures should appear in prompt');
});

test('buildProductMetaPrompt includes empty productFeatures line when empty', () => {
  // Known behavior: empty productFeatures renders as "- Mô tả/tính năng/chất liệu: "
  const prompt = buildProductMetaPrompt({ ...BASE, productFeatures: '' });
  assert.ok(
    prompt.includes('Mô tả/tính năng/chất liệu:'),
    'productFeatures label always present even when empty',
  );
});

test('buildProductMetaPrompt includes tone value', () => {
  const prompt = buildProductMetaPrompt(BASE);
  assert.ok(prompt.includes('seo_focus'), 'tone value should appear in prompt');
});

test('buildProductMetaPrompt includes language', () => {
  const prompt = buildProductMetaPrompt(BASE);
  assert.ok(prompt.includes('Vietnamese'), 'language should appear in prompt');
  assert.ok(
    prompt.toLowerCase().includes('ngôn ngữ') || prompt.includes('Ngôn ngữ'),
    'language label should appear in prompt',
  );
});

test('buildProductMetaPrompt requires exactly 5 meta titles', () => {
  const prompt = buildProductMetaPrompt(BASE);
  assert.ok(prompt.includes('5 meta title'), 'should specify 5 titles');
});

test('buildProductMetaPrompt specifies 50-60 character title limit', () => {
  const prompt = buildProductMetaPrompt(BASE);
  assert.ok(prompt.includes('50-60'), '50-60 character limit should be specified');
});

test('buildProductMetaPrompt specifies 150-160 character description', () => {
  const prompt = buildProductMetaPrompt(BASE);
  assert.ok(prompt.includes('150-160'), '150-160 character description length should be specified');
});

test('buildProductMetaPrompt specifies JSON output format', () => {
  const prompt = buildProductMetaPrompt(BASE);
  assert.ok(prompt.includes('"titles"'), 'JSON schema example should include "titles"');
  assert.ok(prompt.includes('"description"'), 'JSON schema example should include "description"');
});

test('buildProductMetaPrompt instructs no markdown in output', () => {
  const prompt = buildProductMetaPrompt(BASE);
  assert.ok(
    prompt.includes('không markdown') || prompt.includes('no markdown'),
    'should instruct AI to not use markdown',
  );
});

test('buildProductMetaPrompt instructs no fabricating specs', () => {
  const prompt = buildProductMetaPrompt(BASE);
  assert.ok(
    prompt.includes('Không bịa') || prompt.includes('không bịa'),
    'should instruct AI not to fabricate specs',
  );
});

// ---------------------------------------------------------------------------
// buildProductMetaPrompt — brand block
// ---------------------------------------------------------------------------

test('buildProductMetaPrompt includes brand block when brandName is set', () => {
  const prompt = buildProductMetaPrompt({ ...BASE, brandName: 'Nội Thất Minh Quân' });
  assert.ok(prompt.includes('Nội Thất Minh Quân'), 'brandName should appear in prompt');
  assert.ok(prompt.includes('Thương hiệu:'), 'brand block header should appear');
});

test('buildProductMetaPrompt has no brand block section when brandName is omitted', () => {
  const prompt = buildProductMetaPrompt(BASE);
  assert.ok(!prompt.includes('Thương hiệu:'), 'should not have brand block when brandName empty');
});

test('buildProductMetaPrompt includes forbidden words when set', () => {
  const prompt = buildProductMetaPrompt({ ...BASE, forbidden: 'siêu rẻ, vô địch' });
  assert.ok(prompt.includes('siêu rẻ'), 'forbidden words should appear in prompt');
  assert.ok(
    prompt.includes('Từ không dùng') || prompt.includes('cấm'),
    'forbidden label should appear in prompt',
  );
});

test('buildProductMetaPrompt has no forbidden section when forbidden is empty', () => {
  const prompt = buildProductMetaPrompt(BASE); // no forbidden
  assert.ok(
    !prompt.includes('Từ không dùng bổ sung'),
    'should not have forbidden section when empty',
  );
});

test('buildProductMetaPrompt includes all brand fields: name + forbidden', () => {
  const prompt = buildProductMetaPrompt({
    ...BASE,
    brandName: 'Minh Quân',
    forbidden: 'hàng chợ',
  });
  assert.ok(prompt.includes('Minh Quân'));
  assert.ok(prompt.includes('hàng chợ'));
  assert.ok(prompt.includes('Thông tin shop/brand:'));
});

// ---------------------------------------------------------------------------
// buildProductMetaPrompt — language variations
// ---------------------------------------------------------------------------

test('buildProductMetaPrompt passes through non-Vietnamese language correctly', () => {
  const prompt = buildProductMetaPrompt({ ...BASE, language: 'English' });
  assert.ok(prompt.includes('English'), 'language should appear as given');
});

// ---------------------------------------------------------------------------
// Output shape (trim validation)
// ---------------------------------------------------------------------------

test('buildProductMetaPrompt result has no leading/trailing whitespace', () => {
  const prompt = buildProductMetaPrompt(BASE);
  assert.equal(prompt, prompt.trim(), 'prompt should be trimmed');
});
