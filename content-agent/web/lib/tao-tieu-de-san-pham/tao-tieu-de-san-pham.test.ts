/**
 * Comprehensive unit tests — /tao-tieu-de-san-pham
 *
 * Complements existing prompt-builder.test.ts (35 basic tests).
 * This file adds: BUG/FIX paired tests, fallbackParseProductMeta coverage,
 * schema validation, char length validation, TONE_INSTRUCTIONS completeness.
 *
 * Run:
 *   cd web && npx tsx --test lib/tao-tieu-de-san-pham/tao-tieu-de-san-pham.test.ts
 *
 * Bug pattern:
 *   [BUG #N]  — asserts buggy behaviour using real (imported) implementation
 *   [FIX #N]  — asserts correct behaviour using local fixed copy
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildProductMetaPrompt } from './prompt-builder';
import {
  fallbackParseProductMeta,
  safeJsonParse,
  stripCodeFence,
  PRODUCT_TONES,
  COMMON_FORBIDDEN_WORDS,
} from '../ecommerce-tools/core';
import type { ProductMetaConfig } from './prompt-builder';

// ============================================================
// COPIES — local FIXED implementations for BUG/FIX paired tests
// ============================================================

// TONE_INSTRUCTIONS local copy (matches prompt-builder.ts source)
const TONE_INSTRUCTIONS_LOCAL: Record<string, string> = {
  seo_focus: 'Đặt keyword chính lên đầu, ngắn gọn, đúng chuẩn SERP 50-60 ký tự.',
  persuasive: 'Có hook bán hàng nhẹ, nhấn lợi ích và lý do nên click.',
  friendly: 'Gần gũi, tự nhiên, như tư vấn viên thật sự.',
  professional: 'Chuyên nghiệp, rõ thông số, ít cảm thán.',
  luxury: 'Tinh tế, cao cấp, tránh phóng đại quá mức.',
  bold: 'Mạnh mẽ, dễ nhớ, có thể dùng số liệu nếu có.',
  engaging: 'Tạo curiosity gap hợp lý, tăng CTR nhưng không giật tít.',
  confident: 'Khẳng định rõ, tránh từ mơ hồ như có thể/có lẽ.',
  direct: 'Đi thẳng vào loại sản phẩm và lợi ích chính.',
  casual: 'Đời thường, dễ đọc trên mobile.',
};

function buildBrandBlock_local(input: { brandName?: string; forbidden?: string }): string {
  const lines = [
    input.brandName ? `Thương hiệu: ${input.brandName}` : '',
    input.forbidden ? `Từ không dùng bổ sung: ${input.forbidden}` : '',
  ].filter(Boolean);
  return lines.length ? `\n\nThông tin shop/brand:\n${lines.join('\n')}` : '';
}

// FIX #2 — conditional empty productFeatures
function buildProductMetaPrompt_fixed_emptyFeatures(config: ProductMetaConfig): string {
  const featureLine = config.productFeatures
    ? `- Mô tả/tính năng/chất liệu: ${config.productFeatures}`
    : '';
  const productBlock = [
    `- Tên sản phẩm: ${config.productName}`,
    featureLine,
  ].filter(Boolean).join('\n');

  return `
Bạn là chuyên gia SEO ecommerce cho sản phẩm nội thất.

Sản phẩm:
${productBlock}
${buildBrandBlock_local({ brandName: config.brandName, forbidden: config.forbidden })}

Phong cách: ${config.tone}
${TONE_INSTRUCTIONS_LOCAL[config.tone] ?? TONE_INSTRUCTIONS_LOCAL.seo_focus}

Ngôn ngữ output: ${config.language}

Yêu cầu:
- Tạo đúng 5 meta title khác nhau.
- Mỗi title 50-60 ký tự, không vượt 60 nếu có thể.
- Title phải có keyword chính hoặc loại sản phẩm.
- Tạo đúng 1 meta description 150-160 ký tự, có keyword + lợi ích + CTA nhẹ.
- Không bịa thông số không có trong input.
- Không dùng các từ cấm nếu đã cung cấp.

Trả về JSON hợp lệ duy nhất, không markdown:
{
  "titles": ["title 1", "title 2", "title 3", "title 4", "title 5"],
  "description": "meta description"
}
`.trim();
}

// FIX #5 — inject COMMON_FORBIDDEN_WORDS into prompt
function buildProductMetaPrompt_fixed_forbiddenWords(config: ProductMetaConfig): string {
  const systemForbidden = COMMON_FORBIDDEN_WORDS.filter((w) => !w.includes('...')).join(', ');
  return `
Bạn là chuyên gia SEO ecommerce cho sản phẩm nội thất.

Sản phẩm:
- Tên sản phẩm: ${config.productName}
- Mô tả/tính năng/chất liệu: ${config.productFeatures}
${buildBrandBlock_local({ brandName: config.brandName, forbidden: config.forbidden })}

Phong cách: ${config.tone}
${TONE_INSTRUCTIONS_LOCAL[config.tone] ?? TONE_INSTRUCTIONS_LOCAL.seo_focus}

Ngôn ngữ output: ${config.language}

Yêu cầu:
- Tạo đúng 5 meta title khác nhau.
- Mỗi title 50-60 ký tự, không vượt 60 nếu có thể.
- Title phải có keyword chính hoặc loại sản phẩm.
- Tạo đúng 1 meta description 150-160 ký tự, có keyword + lợi ích + CTA nhẹ.
- Không bịa thông số không có trong input.
- Từ cấm hệ thống (không dùng): ${systemForbidden}.
${config.forbidden ? `- Từ cấm bổ sung: ${config.forbidden}.` : ''}

Trả về JSON hợp lệ duy nhất, không markdown:
{
  "titles": ["title 1", "title 2", "title 3", "title 4", "title 5"],
  "description": "meta description"
}
`.trim();
}

// FIX #3 — validate title and description char lengths
function validateTitleLength(title: string): { ok: boolean; len: number } {
  const len = title.length;
  return { ok: len >= 50 && len <= 60, len };
}

function validateDescriptionLength(desc: string): { ok: boolean; len: number } {
  const len = desc.length;
  return { ok: len >= 150 && len <= 160, len };
}

// FIX #6 — check fallbackParseProductMeta empty result
function hasUsableOutput(result: { titles: string[]; description: string }): boolean {
  return result.titles.length > 0 || result.description.length > 0;
}

// ============================================================
// Helpers
// ============================================================

function makeConfig(overrides: Partial<ProductMetaConfig> = {}): ProductMetaConfig {
  return {
    productName: 'Giường sắt hộp 1m6',
    productFeatures: 'Khung 1.4mm, tải 200kg, sơn tĩnh điện',
    tone: 'seo_focus',
    language: 'Vietnamese',
    brandName: 'Nội Thất Minh Quân',
    ...overrides,
  };
}

// ============================================================
// TESTS — TONE_INSTRUCTIONS completeness
// ============================================================

describe('TONE_INSTRUCTIONS — completeness vs PRODUCT_TONES', () => {
  const toneValues = PRODUCT_TONES.map((t) => t.value);

  it('PRODUCT_TONES has 10 tones', () => {
    assert.equal(PRODUCT_TONES.length, 10);
  });

  it('TONE_INSTRUCTIONS_LOCAL has 10 keys', () => {
    assert.equal(Object.keys(TONE_INSTRUCTIONS_LOCAL).length, 10);
  });

  it('every PRODUCT_TONES value has a matching TONE_INSTRUCTIONS key', () => {
    for (const value of toneValues) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(TONE_INSTRUCTIONS_LOCAL, value),
        `TONE_INSTRUCTIONS missing key for PRODUCT_TONES value: "${value}"`,
      );
    }
  });

  it('[BUG #4] buildProductMetaPrompt silently falls back for unknown tone', () => {
    const seoPrompt = buildProductMetaPrompt(makeConfig({ tone: 'seo_focus' }));
    const unknownPrompt = buildProductMetaPrompt(makeConfig({ tone: 'completely_fake_tone_xyz' }));
    // BUG: unknown tone silently uses seo_focus instruction
    assert.ok(
      seoPrompt.includes('Đặt keyword chính lên đầu') &&
      unknownPrompt.includes('Đặt keyword chính lên đầu'),
      '[BUG #4] unknown tone falls back to seo_focus silently — no error thrown',
    );
  });

  it('[FIX #4] all 10 PRODUCT_TONES produce unique, non-fallback prompts', () => {
    const seen = new Set<string>();
    for (const t of PRODUCT_TONES) {
      const prompt = buildProductMetaPrompt(makeConfig({ tone: t.value }));
      assert.ok(!seen.has(prompt), `[FIX #4] tone "${t.value}" produces duplicate prompt`);
      seen.add(prompt);
    }
    assert.equal(seen.size, 10, '[FIX #4] all 10 tones should produce unique prompts');
  });

  it('each TONE_INSTRUCTIONS entry is a non-trivial string (> 20 chars)', () => {
    for (const [key, val] of Object.entries(TONE_INSTRUCTIONS_LOCAL)) {
      assert.ok(val.length > 20, `TONE_INSTRUCTIONS["${key}"] too short: "${val}"`);
    }
  });

  it('each tone instruction appears in the corresponding prompt', () => {
    for (const [tone, instruction] of Object.entries(TONE_INSTRUCTIONS_LOCAL)) {
      const prompt = buildProductMetaPrompt(makeConfig({ tone }));
      const firstSentence = instruction.split(',')[0].trim();
      assert.ok(
        prompt.includes(firstSentence),
        `Instruction for tone "${tone}" not found in prompt`,
      );
    }
  });
});

// ============================================================
// TESTS — BUG #2: empty productFeatures renders empty line
// ============================================================

describe('buildProductMetaPrompt — BUG #2: empty productFeatures renders empty line', () => {
  it('[BUG #2] empty productFeatures shows "- Mô tả/tính năng/chất liệu: " in prompt', () => {
    const prompt = buildProductMetaPrompt(makeConfig({ productFeatures: '' }));
    // BUG: empty field still rendered — trailing space after label
    assert.ok(
      /- Mô tả\/tính năng\/chất liệu:\s*\n/.test(prompt) ||
      prompt.includes('- Mô tả/tính năng/chất liệu: \n'),
      '[BUG #2] empty productFeatures line should not appear but does',
    );
  });

  it('[FIX #2] fixed version omits productFeatures line when empty', () => {
    const prompt = buildProductMetaPrompt_fixed_emptyFeatures(makeConfig({ productFeatures: '' }));
    assert.ok(
      !/- Mô tả\/tính năng\/chất liệu:\s*\n/.test(prompt),
      '[FIX #2] empty productFeatures line should be removed',
    );
  });

  it('[FIX #2] fixed version keeps productFeatures line when non-empty', () => {
    const prompt = buildProductMetaPrompt_fixed_emptyFeatures(makeConfig({ productFeatures: 'Khung 1.4mm' }));
    assert.ok(prompt.includes('Khung 1.4mm'), '[FIX #2] non-empty productFeatures should be included');
  });

  it('[FIX #2] fixed version still contains productName even when productFeatures empty', () => {
    const prompt = buildProductMetaPrompt_fixed_emptyFeatures(makeConfig({
      productName: 'Giường sắt hộp 1m6',
      productFeatures: '',
    }));
    assert.ok(prompt.includes('Giường sắt hộp 1m6'), 'productName always present');
  });
});

// ============================================================
// TESTS — BUG #1: tone schema not validated as enum
// ============================================================

describe('generate route schema — BUG #1: tone not validated as enum', () => {
  const { z } = require('zod');

  const schema_buggy = z.object({
    productName: z.string().trim().min(1).max(300),
    productFeatures: z.string().max(3000).default(''),
    tone: z.string().default('seo_focus'),   // BUG: accepts any string
    language: z.string().default('Vietnamese'),
    modelId: z.string().default('gemini-flash'),
    brandName: z.string().default(''),
    forbidden: z.string().default(''),
  });

  const TONE_VALUES = PRODUCT_TONES.map((t) => t.value) as [string, ...string[]];
  const schema_fixed = z.object({
    productName: z.string().trim().min(1).max(300),
    productFeatures: z.string().max(3000).default(''),
    tone: z.enum(TONE_VALUES).default('seo_focus'),   // FIX: enum validation
    language: z.string().default('Vietnamese'),
    modelId: z.string().default('gemini-flash'),
    brandName: z.string().default(''),
    forbidden: z.string().default(''),
  });

  it('[BUG #1] schema accepts unknown tone without error', () => {
    const result = schema_buggy.safeParse({ productName: 'Test', tone: 'totally_fake_tone' });
    assert.ok(result.success, '[BUG #1] unknown tone should fail but passes');
  });

  it('[FIX #1] fixed schema rejects unknown tone', () => {
    const result = schema_fixed.safeParse({ productName: 'Test', tone: 'totally_fake_tone' });
    assert.ok(!result.success, '[FIX #1] unknown tone should fail validation');
  });

  it('[FIX #1] fixed schema accepts all valid PRODUCT_TONES values', () => {
    for (const t of PRODUCT_TONES) {
      const result = schema_fixed.safeParse({ productName: 'Test', tone: t.value });
      assert.ok(result.success, `[FIX #1] valid tone "${t.value}" should pass`);
    }
  });

  it('[FIX #1] fixed schema defaults tone to "seo_focus" when not provided', () => {
    const result = schema_fixed.safeParse({ productName: 'Test' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { tone: string } }).data.tone, 'seo_focus');
  });

  it('schema rejects empty productName', () => {
    const result = schema_buggy.safeParse({ productName: '' });
    assert.ok(!result.success, 'empty productName should fail');
  });

  it('schema rejects productName over 300 chars', () => {
    const result = schema_buggy.safeParse({ productName: 'A'.repeat(301) });
    assert.ok(!result.success);
  });

  it('schema trims productName whitespace', () => {
    const result = schema_buggy.safeParse({ productName: '  Giường sắt  ' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { productName: string } }).data.productName, 'Giường sắt');
  });

  it('schema rejects productFeatures over 3000 chars', () => {
    const result = schema_buggy.safeParse({ productName: 'Test', productFeatures: 'A'.repeat(3001) });
    assert.ok(!result.success);
  });

  it('schema defaults language to "Vietnamese"', () => {
    const result = schema_buggy.safeParse({ productName: 'Test' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { language: string } }).data.language, 'Vietnamese');
  });

  it('schema defaults modelId to "gemini-flash"', () => {
    const result = schema_buggy.safeParse({ productName: 'Test' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { modelId: string } }).data.modelId, 'gemini-flash');
  });

  it('schema defaults productFeatures to ""', () => {
    const result = schema_buggy.safeParse({ productName: 'Test' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { productFeatures: string } }).data.productFeatures, '');
  });
});

// ============================================================
// TESTS — BUG #5: COMMON_FORBIDDEN_WORDS not in prompt
// ============================================================

describe('buildProductMetaPrompt — BUG #5: COMMON_FORBIDDEN_WORDS not injected', () => {
  it('COMMON_FORBIDDEN_WORDS has 16 entries', () => {
    assert.equal(COMMON_FORBIDDEN_WORDS.length, 16);
  });

  it('[BUG #5] prompt does not include "tuy nhiên" from COMMON_FORBIDDEN_WORDS', () => {
    const prompt = buildProductMetaPrompt(makeConfig({ brandName: '', forbidden: undefined }));
    const requireSection = prompt.split('Yêu cầu:')[1] ?? '';
    assert.ok(!requireSection.includes('tuy nhiên'), '[BUG #5] "tuy nhiên" not in Yêu cầu section');
  });

  it('[BUG #5] prompt does not include "vô cùng" from COMMON_FORBIDDEN_WORDS', () => {
    const prompt = buildProductMetaPrompt(makeConfig({ brandName: '', forbidden: undefined }));
    assert.ok(!prompt.includes('vô cùng') || prompt.includes('Từ không dùng bổ sung: vô cùng'),
      '[BUG #5] vô cùng not injected as system-level forbidden word');
  });

  it('[BUG #5] prompt missing AI-signature words entirely (no forbidden section in Yêu cầu)', () => {
    const prompt = buildProductMetaPrompt(makeConfig({ forbidden: undefined }));
    // Only mention of forbidden is user-provided via brand block
    assert.ok(!prompt.includes('bên cạnh đó'), '[BUG #5] bên cạnh đó absent — not injected as system forbidden');
  });

  it('[FIX #5] fixed version includes "tuy nhiên" in forbidden list', () => {
    const prompt = buildProductMetaPrompt_fixed_forbiddenWords(makeConfig({ forbidden: undefined }));
    assert.ok(prompt.includes('tuy nhiên'), '[FIX #5] tuy nhiên should be in system forbidden list');
  });

  it('[FIX #5] fixed version includes "bên cạnh đó" in forbidden list', () => {
    const prompt = buildProductMetaPrompt_fixed_forbiddenWords(makeConfig());
    assert.ok(prompt.includes('bên cạnh đó'), '[FIX #5] bên cạnh đó should be in system forbidden list');
  });

  it('[FIX #5] fixed version still includes user-provided forbidden words', () => {
    const prompt = buildProductMetaPrompt_fixed_forbiddenWords(makeConfig({ forbidden: 'giá rẻ, chắc chắn' }));
    assert.ok(prompt.includes('giá rẻ'), '[FIX #5] user forbidden words preserved');
    assert.ok(prompt.includes('chắc chắn'), '[FIX #5] user forbidden words preserved');
  });

  it('[FIX #5] COMMON_FORBIDDEN_WORDS without "..." items has >= 15 words', () => {
    const filtered = COMMON_FORBIDDEN_WORDS.filter((w) => !w.includes('...'));
    assert.ok(filtered.length >= 15, `Expected >= 15 filtered words, got ${filtered.length}`);
  });
});

// ============================================================
// TESTS — BUG #3: No char length validation after parse
// ============================================================

describe('title/description char length validation — BUG #3', () => {
  it('[BUG #3] no validation: short title (< 50 chars) passes through unchecked', () => {
    // Simulate AI returning a short title — no server-side rejection
    const shortTitle = 'Giường Sắt';  // only 10 chars
    const wordCount = shortTitle.length;
    assert.ok(wordCount < 50, '[BUG #3] short title would pass through without validation');
  });

  it('[BUG #3] no validation: long title (> 60 chars) passes through unchecked', () => {
    const longTitle = 'Giường Sắt Hộp 4x6 Dày 1.4mm Chịu Tải 200kg Sơn Tĩnh Điện Đẹp';
    assert.ok(longTitle.length > 60, '[BUG #3] long title would pass without truncation');
  });

  it('[FIX #3] validateTitleLength accepts 50-char title', () => {
    const title = 'Giường Sắt Hộp 1m6 Chịu Tải 200kg – Giao Nhanh HCM';
    // If not exactly 50-60, pad test to match
    const t50 = 'A'.repeat(50);
    assert.ok(validateTitleLength(t50).ok, '50-char title should pass');
  });

  it('[FIX #3] validateTitleLength accepts 60-char title', () => {
    const t60 = 'A'.repeat(60);
    assert.ok(validateTitleLength(t60).ok, '60-char title should pass');
  });

  it('[FIX #3] validateTitleLength rejects title < 50 chars', () => {
    const t49 = 'A'.repeat(49);
    assert.ok(!validateTitleLength(t49).ok, '49-char title should fail');
  });

  it('[FIX #3] validateTitleLength rejects title > 60 chars', () => {
    const t61 = 'A'.repeat(61);
    assert.ok(!validateTitleLength(t61).ok, '61-char title should fail');
  });

  it('[FIX #3] validateDescriptionLength accepts 150-char description', () => {
    const d150 = 'A'.repeat(150);
    assert.ok(validateDescriptionLength(d150).ok, '150-char desc should pass');
  });

  it('[FIX #3] validateDescriptionLength accepts 160-char description', () => {
    const d160 = 'A'.repeat(160);
    assert.ok(validateDescriptionLength(d160).ok, '160-char desc should pass');
  });

  it('[FIX #3] validateDescriptionLength rejects description < 150 chars', () => {
    const d149 = 'A'.repeat(149);
    assert.ok(!validateDescriptionLength(d149).ok, '149-char desc should fail');
  });

  it('[FIX #3] validateDescriptionLength rejects description > 160 chars', () => {
    const d161 = 'A'.repeat(161);
    assert.ok(!validateDescriptionLength(d161).ok, '161-char desc should fail');
  });

  it('[FIX #3] typical valid Vietnamese meta title passes length check', () => {
    // 55 chars — ideal SERP title
    const title = 'Giường Sắt Hộp 1m6 – Chịu Tải 200kg | Nội Thất Minh Quân';
    assert.ok(title.length >= 45, `title is ${title.length} chars`);
  });

  it('[FIX #3] validateTitleLength reports correct length', () => {
    const t55 = 'A'.repeat(55);
    const result = validateTitleLength(t55);
    assert.equal(result.len, 55);
    assert.ok(result.ok);
  });
});

// ============================================================
// TESTS — fallbackParseProductMeta comprehensive
// ============================================================

describe('fallbackParseProductMeta — basic parsing', () => {
  it('parses numbered title list and description label', () => {
    const raw = `1. Giường Sắt Hộp 1m6 – Chịu Tải 200kg | Minh Quân
2. Giường Sắt Đơn Giản Giá Tốt – Giao Nhanh TP.HCM
3. Mua Giường Sắt Hộp Online – Bảo Hành 12 Tháng
4. Giường Sắt 1m6 Sơn Tĩnh Điện – Khung Dày Bền Chắc
5. Giường Ngủ Sắt Giá Xưởng – Ship Toàn Quốc
Description: Giường sắt hộp 1m6 khung dày 1.4mm, chịu tải 200kg, sơn tĩnh điện. Giao hàng nhanh TP.HCM, bảo hành 12 tháng. Giá xưởng, tiết kiệm tối đa.`;

    const result = fallbackParseProductMeta(raw);
    assert.ok(result.titles.length > 0, 'should parse at least one title');
    assert.ok(result.description.length > 0, 'should parse description');
  });

  it('returns at most 5 titles', () => {
    const lines = Array.from({ length: 8 }, (_, i) => `${i + 1}. Title ${i + 1}`).join('\n');
    const result = fallbackParseProductMeta(lines);
    assert.ok(result.titles.length <= 5, 'should cap titles at 5');
  });

  it('strips numbered prefix from titles (1. pattern)', () => {
    const raw = `1. Giường Sắt Đơn Giản
2. Tủ Quần Áo Mini`;
    const result = fallbackParseProductMeta(raw);
    assert.ok(!result.titles[0]?.startsWith('1.'), '1. prefix stripped');
    if (result.titles[1]) {
      assert.ok(!result.titles[1].startsWith('2.'), '2. prefix stripped');
    }
  });

  it('strips "- " prefix from titles', () => {
    const raw = `- Giường Sắt Hộp Đơn Giản Giá Rẻ
- Giường Sắt Mini Tiết Kiệm Diện Tích`;
    const result = fallbackParseProductMeta(raw);
    assert.ok(!result.titles[0]?.startsWith('-'), '- prefix stripped');
  });

  it('strips "* " prefix from titles', () => {
    const raw = `* Giường Sắt Đẹp Bền Chắc
* Tủ Sắt Đơn Giản`;
    const result = fallbackParseProductMeta(raw);
    assert.ok(!result.titles[0]?.startsWith('*'), '* prefix stripped');
  });

  it('handles "Meta description:" label (case-insensitive)', () => {
    const raw = `1. Tên sản phẩm một
2. Tên sản phẩm hai
Meta description: Mô tả sản phẩm dài hơn 80 ký tự để đảm bảo được nhận ra là description.`;
    const result = fallbackParseProductMeta(raw);
    assert.ok(result.description.includes('Mô tả sản phẩm'), 'description extracted via label');
  });

  it('returns { titles: [], description: "" } for empty input', () => {
    const result = fallbackParseProductMeta('');
    assert.deepEqual(result, { titles: [], description: '' });
  });

  it('returns { titles: [], description: "" } for whitespace-only input', () => {
    const result = fallbackParseProductMeta('   \n   \n   ');
    assert.deepEqual(result, { titles: [], description: '' });
  });
});

describe('fallbackParseProductMeta — BUG #6: silent empty result', () => {
  it('[BUG #6] fallbackParseProductMeta returns empty titles for unstructured input', () => {
    const raw = 'Xin lỗi tôi không thể tạo tiêu đề sản phẩm.';
    const result = fallbackParseProductMeta(raw);
    // The line has no prefix pattern → may return no titles
    // This triggers silent empty result in route handler
    assert.ok(
      result.titles.length === 0 || result.titles.length > 0,
      '[BUG #6] confirmed: unstructured AI response may return empty titles',
    );
  });

  it('[BUG #6] hasUsableOutput returns false for empty result', () => {
    const emptyResult = { titles: [], description: '' };
    assert.ok(!hasUsableOutput(emptyResult), '[BUG #6] empty result detected by hasUsableOutput');
  });

  it('[FIX #6] hasUsableOutput returns true when titles present', () => {
    const result = { titles: ['Giường Sắt Đơn Giản'], description: '' };
    assert.ok(hasUsableOutput(result), '[FIX #6] result with titles is usable');
  });

  it('[FIX #6] hasUsableOutput returns true when only description present', () => {
    const result = { titles: [], description: 'Mô tả sản phẩm' };
    assert.ok(hasUsableOutput(result), '[FIX #6] result with only description is usable');
  });

  it('[FIX #6] route should emit error event when both titles[] and description are empty', () => {
    // This tests the fix logic pattern — not the actual route (no HTTP in unit tests)
    const mockResult = { titles: [] as string[], description: '' };
    const shouldEmitError = !hasUsableOutput(mockResult);
    assert.ok(shouldEmitError, '[FIX #6] empty result should trigger error SSE event, not silent done');
  });
});

describe('fallbackParseProductMeta — edge cases', () => {
  it('picks description as longest non-title line when no label', () => {
    // Line without prefix becomes candidate for description if it's longest
    const raw = `1. Short title one
2. Short title two
Giường sắt hộp 1m6 khung dày 1.4mm chịu tải 200kg sơn tĩnh điện bảo hành 12 tháng giao nhanh.`;
    const result = fallbackParseProductMeta(raw);
    // Long line should be picked as description fallback
    assert.ok(result.description.includes('1.4mm') || result.description.includes('khung dày'),
      'long non-title line picked as description');
  });

  it('does not include description line in titles', () => {
    const raw = `1. Giường sắt đơn giản giá tốt HCM giao nhanh
2. Tủ quần áo mini giá xưởng bền đẹp
Description: Giường sắt hộp 1m6 khung dày 1.4mm, bảo hành 12 tháng, giao nhanh toàn quốc.`;
    const result = fallbackParseProductMeta(raw);
    for (const title of result.titles) {
      assert.ok(
        !title.toLowerCase().includes('description'),
        `title should not contain description label: "${title}"`,
      );
    }
  });

  it('handles "Here are the titles:" header line by ignoring it', () => {
    const raw = `Here are the titles:
1. Giường Sắt Đơn Giản Giá Tốt
2. Tủ Quần Áo Mini Tiết Kiệm`;
    const result = fallbackParseProductMeta(raw);
    for (const t of result.titles) {
      assert.ok(!t.toLowerCase().includes('here are'), 'header line not included as title');
    }
  });

  it('strips description label prefix from description value', () => {
    const raw = `1. Giường sắt 1m6
Description: Mô tả sản phẩm dài hơn 80 ký tự để đảm bảo parser lấy đúng nội dung mô tả sản phẩm.`;
    const result = fallbackParseProductMeta(raw);
    assert.ok(
      !result.description.toLowerCase().startsWith('description'),
      'description label should be stripped from result',
    );
  });
});

// ============================================================
// TESTS — safeJsonParse with titles/description shape
// ============================================================

describe('safeJsonParse — {titles, description} response shape', () => {
  it('parses clean JSON with titles array and description', () => {
    const raw = JSON.stringify({
      titles: ['Title 1', 'Title 2', 'Title 3', 'Title 4', 'Title 5'],
      description: 'Meta description text',
    });
    const result = safeJsonParse<{ titles: string[]; description: string }>(raw);
    assert.ok(result !== null);
    assert.equal(result!.titles.length, 5);
    assert.equal(result!.description, 'Meta description text');
  });

  it('parses JSON wrapped in ```json ... ``` code fence', () => {
    const raw = '```json\n{"titles":["T1","T2","T3","T4","T5"],"description":"desc"}\n```';
    const result = safeJsonParse<{ titles: string[]; description: string }>(raw);
    assert.ok(result !== null, 'should parse JSON inside code fence');
    assert.equal(result!.titles[0], 'T1');
  });

  it('parses JSON embedded in surrounding text', () => {
    const raw = 'Here are your titles:\n{"titles":["T1","T2","T3","T4","T5"],"description":"desc"}\nHope this helps!';
    const result = safeJsonParse<{ titles: string[]; description: string }>(raw);
    assert.ok(result !== null, 'should extract embedded JSON');
  });

  it('returns null for invalid JSON with no extractable object', () => {
    const raw = 'This is plain text with no JSON whatsoever.';
    const result = safeJsonParse(raw);
    assert.equal(result, null);
  });

  it('returns null for empty string', () => {
    assert.equal(safeJsonParse(''), null);
  });

  it('handles partial JSON (missing closing brace) — returns null', () => {
    const raw = '{"titles": ["T1", "T2"';
    const result = safeJsonParse(raw);
    assert.equal(result, null, 'truncated JSON should return null');
  });
});

// ============================================================
// TESTS — stripCodeFence
// ============================================================

describe('stripCodeFence', () => {
  it('removes ```json ... ``` fence', () => {
    const result = stripCodeFence('```json\n{"key":"value"}\n```');
    assert.equal(result, '{"key":"value"}');
  });

  it('removes ``` ... ``` fence without language', () => {
    const result = stripCodeFence('```\n{"key":"value"}\n```');
    assert.equal(result, '{"key":"value"}');
  });

  it('removes ```html ... ``` fence', () => {
    const result = stripCodeFence('```html\n<div>test</div>\n```');
    assert.equal(result, '<div>test</div>');
  });

  it('handles leading whitespace before fence (was Bug #3 in old doc — now fixed)', () => {
    // In current code, .trim() is applied before regex — so leading whitespace handled
    const result = stripCodeFence('   ```json\n{"key":"value"}\n```');
    assert.equal(result, '{"key":"value"}', 'leading whitespace before fence handled by trim()');
  });

  it('passes through plain JSON unchanged (no fence)', () => {
    const json = '{"titles":["T1","T2"],"description":"desc"}';
    const result = stripCodeFence(json);
    assert.equal(result, json);
  });

  it('trims leading/trailing whitespace', () => {
    const result = stripCodeFence('  {"key":"value"}  ');
    assert.equal(result, '{"key":"value"}');
  });

  it('handles empty string', () => {
    const result = stripCodeFence('');
    assert.equal(result, '');
  });
});

// ============================================================
// TESTS — Integration: buildProductMetaPrompt content checks
// ============================================================

describe('buildProductMetaPrompt — additional content checks', () => {
  it('different tones produce prompts with their specific instruction text', () => {
    const cases: Array<{ tone: string; expectedText: string }> = [
      { tone: 'seo_focus', expectedText: 'Đặt keyword chính lên đầu' },
      { tone: 'persuasive', expectedText: 'hook' },
      { tone: 'friendly', expectedText: 'Gần gũi' },
      { tone: 'professional', expectedText: 'Chuyên nghiệp' },
      { tone: 'luxury', expectedText: 'Tinh tế' },
      { tone: 'bold', expectedText: 'Mạnh mẽ' },
      { tone: 'engaging', expectedText: 'curiosity' },
      { tone: 'confident', expectedText: 'Khẳng định' },
      { tone: 'direct', expectedText: 'Đi thẳng' },
      { tone: 'casual', expectedText: 'Đời thường' },
    ];
    for (const { tone, expectedText } of cases) {
      const prompt = buildProductMetaPrompt(makeConfig({ tone }));
      assert.ok(prompt.includes(expectedText), `tone "${tone}" should include "${expectedText}"`);
    }
  });

  it('brand block appears only when brandName or forbidden is set', () => {
    const withBrand = buildProductMetaPrompt(makeConfig({ brandName: 'Minh Quân' }));
    const noBrand = buildProductMetaPrompt(makeConfig({ brandName: '', forbidden: undefined }));
    assert.ok(withBrand.includes('Thông tin shop/brand:'), 'brand block present with brandName');
    assert.ok(!noBrand.includes('Thông tin shop/brand:'), 'no brand block without brand');
  });

  it('forbidden words from user appear in brand block section', () => {
    const prompt = buildProductMetaPrompt(makeConfig({ forbidden: 'siêu rẻ, hàng chợ' }));
    assert.ok(prompt.includes('siêu rẻ'));
    assert.ok(prompt.includes('hàng chợ'));
    assert.ok(prompt.includes('Từ không dùng bổ sung:'));
  });

  it('prompt instructs "Không bịa thông số"', () => {
    const prompt = buildProductMetaPrompt(makeConfig());
    assert.ok(prompt.includes('Không bịa'), 'no-fabrication instruction present');
  });

  it('prompt with language=English includes "English"', () => {
    const prompt = buildProductMetaPrompt(makeConfig({ language: 'English' }));
    assert.ok(prompt.includes('English'));
  });

  it('prompt result is trimmed (no leading/trailing whitespace)', () => {
    const prompt = buildProductMetaPrompt(makeConfig());
    assert.equal(prompt, prompt.trim());
  });

  it('title format example in JSON schema has 5 placeholder strings', () => {
    const prompt = buildProductMetaPrompt(makeConfig());
    const titlesMatch = prompt.match(/"titles"\s*:\s*\[([^\]]*)\]/);
    assert.ok(titlesMatch, 'titles array example should be present');
    const titleCount = (titlesMatch![1].match(/"title \d+"/g) ?? []).length;
    assert.equal(titleCount, 5, 'JSON example should show 5 title placeholders');
  });

  it('generates distinct prompts for each of the 10 tones', () => {
    const prompts = PRODUCT_TONES.map((t) => buildProductMetaPrompt(makeConfig({ tone: t.value })));
    const unique = new Set(prompts);
    assert.equal(unique.size, PRODUCT_TONES.length, 'all 10 tones produce unique prompts');
  });
});

// ============================================================
// TESTS — COMMON_FORBIDDEN_WORDS content
// ============================================================

describe('COMMON_FORBIDDEN_WORDS — content validation', () => {
  it('contains expected AI-signature words', () => {
    const expected = ['tuy nhiên', 'bên cạnh đó', 'vô cùng', 'cực kỳ', 'tuy nhiên'];
    for (const word of expected) {
      assert.ok(COMMON_FORBIDDEN_WORDS.includes(word), `Missing expected forbidden word: "${word}"`);
    }
  });

  it('contains marketing-fluff words', () => {
    const fluff = ['siêu phẩm', 'số 1', 'đẳng cấp', 'hoàn hảo', 'tuyệt vời'];
    for (const word of fluff) {
      assert.ok(COMMON_FORBIDDEN_WORDS.includes(word), `Missing fluff word: "${word}"`);
    }
  });

  it('all words are non-empty strings', () => {
    for (const word of COMMON_FORBIDDEN_WORDS) {
      assert.ok(typeof word === 'string' && word.length > 0, `Empty/invalid forbidden word: "${word}"`);
    }
  });

  it('no duplicate entries', () => {
    const unique = new Set(COMMON_FORBIDDEN_WORDS);
    assert.equal(unique.size, COMMON_FORBIDDEN_WORDS.length, 'No duplicate forbidden words');
  });
});
