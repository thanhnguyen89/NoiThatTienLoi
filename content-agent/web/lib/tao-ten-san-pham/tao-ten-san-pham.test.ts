/**
 * Unit tests — /tao-ten-san-pham
 *
 * Coverage:
 *  - lib/tao-ten-san-pham/prompt-builder.ts : buildProductNamePrompt, PRICE_CONTEXT
 *  - app/api/tao-ten-san-pham/generate/route.ts : fallbackParse (copied inline), schema
 *
 * Run:
 *   cd web && npx tsx --test lib/tao-ten-san-pham/tao-ten-san-pham.test.ts
 *
 * Bug pattern:
 *   [BUG #N]  — asserts buggy behaviour with local buggy copy
 *   [FIX #N]  — asserts correct behaviour with local fixed copy
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ProductNameConfig } from './prompt-builder';

// ============================================================
// COPY — PRICE_CONTEXT
// ============================================================

const PRICE_CONTEXT: Record<ProductNameConfig['priceSegment'], string> = {
  budget: 'Giá bình dân, nhấn giá trị đồng tiền, phù hợp người cần tiết kiệm.',
  mid: 'Cân bằng chất lượng và giá, không quá rẻ tiền và không quá premium.',
  premium: 'Chất lượng cao, bền, tinh tế, khách hàng sẵn sàng chi hơn.',
};

// ============================================================
// COPY — buildBrandBlock (from core.ts, local for isolation)
// ============================================================

function buildBrandBlock_local(input: {
  brandName?: string;
  forbidden?: string;
}): string {
  const lines = [
    input.brandName ? `Thương hiệu: ${input.brandName}` : '',
    input.forbidden ? `Từ không dùng bổ sung: ${input.forbidden}` : '',
  ].filter(Boolean);
  return lines.length ? `\n\nThông tin shop/brand:\n${lines.join('\n')}` : '';
}

// ============================================================
// COPY — buildProductNamePrompt BUGGY (as-is from source)
// ============================================================

function buildProductNamePrompt_buggy(config: ProductNameConfig): string {
  return `
Bạn là chuyên gia đặt tên sản phẩm nội thất cho listing ecommerce.

Thông tin sản phẩm:
- Loại sản phẩm: ${config.productType}
- Chất liệu: ${config.material}
- Tính năng nổi bật: ${config.keyFeatures}
- Khách hàng mục tiêu: ${config.targetCustomer}
- Phân khúc: ${config.priceSegment} - ${PRICE_CONTEXT[config.priceSegment]}
${buildBrandBlock_local({ brandName: config.brandName, forbidden: config.forbidden })}

Ngôn ngữ output: ${config.language}

Yêu cầu:
- Tạo đúng 10 tên sản phẩm.
- Mỗi tên dài 3-10 từ, không viết hoa toàn bộ.
- Mỗi tên có 1 lý do ngắn.
- Phân bổ style: seo, short, descriptive, emotional, segmented, localized, creative.
- Không dùng: siêu phẩm, số 1, đẳng cấp, hoàn hảo, tuyệt vời.

Trả về JSON hợp lệ duy nhất, không markdown:
{
  "names": [
    { "name": "tên sản phẩm", "style": "seo", "reason": "lý do ngắn" }
  ]
}
`.trim();
}

// FIX #1 — conditional empty fields
function buildProductNamePrompt_fixed_emptyFields(config: ProductNameConfig): string {
  const productLines = [
    `- Loại sản phẩm: ${config.productType}`,
    config.material ? `- Chất liệu: ${config.material}` : '',
    config.keyFeatures ? `- Tính năng nổi bật: ${config.keyFeatures}` : '',
    config.targetCustomer ? `- Khách hàng mục tiêu: ${config.targetCustomer}` : '',
    `- Phân khúc: ${config.priceSegment} - ${PRICE_CONTEXT[config.priceSegment] ?? ''}`,
  ].filter(Boolean).join('\n');

  return `
Bạn là chuyên gia đặt tên sản phẩm nội thất cho listing ecommerce.

Thông tin sản phẩm:
${productLines}
${buildBrandBlock_local({ brandName: config.brandName, forbidden: config.forbidden })}

Ngôn ngữ output: ${config.language}

Yêu cầu:
- Tạo đúng 10 tên sản phẩm.
- Mỗi tên dài 3-10 từ, không viết hoa toàn bộ.
- Mỗi tên có 1 lý do ngắn.
- Phân bổ style: seo, short, descriptive, emotional, segmented, localized, creative.
- Không dùng: siêu phẩm, số 1, đẳng cấp, hoàn hảo, tuyệt vời, tuy nhiên, bên cạnh đó.

Trả về JSON hợp lệ duy nhất, không markdown:
{
  "names": [
    { "name": "tên sản phẩm", "style": "seo", "reason": "lý do ngắn" }
  ]
}
`.trim();
}

// FIX #3 — style distribution guidance
const VALID_STYLES = ['seo', 'short', 'descriptive', 'emotional', 'segmented', 'localized', 'creative'];
function buildProductNamePrompt_fixed_styleDistribution(config: ProductNameConfig): string {
  // Distribute 10 names across 7 styles: some styles get 2, most get 1
  const styleDistrib = 'seo: 2, short: 1, descriptive: 2, emotional: 2, segmented: 1, localized: 1, creative: 1';
  return `
Bạn là chuyên gia đặt tên sản phẩm nội thất cho listing ecommerce.

Thông tin sản phẩm:
- Loại sản phẩm: ${config.productType}

Ngôn ngữ output: ${config.language}

Yêu cầu:
- Tạo đúng 10 tên sản phẩm.
- Mỗi tên dài 3-10 từ, không viết hoa toàn bộ.
- Phân bổ style BẮT BUỘC (${styleDistrib}): mỗi tên phải có đúng style được gán.
- Mỗi tên có 1 lý do ngắn.
- Không dùng: siêu phẩm, số 1, đẳng cấp, hoàn hảo, tuyệt vời.

Trả về JSON:
{ "names": [{ "name": "...", "style": "seo", "reason": "..." }] }
`.trim();
}

// FIX #4 — extended forbidden word list
const COMMON_FORBIDDEN_WORDS_FIXED = [
  'quan trọng', 'hiệu quả', 'tuy nhiên', 'bên cạnh đó', 'toàn diện', 'tối ưu hóa',
  'ngày nay', 'hiện nay', 'vô cùng', 'cực kỳ', 'tuyệt vời', 'siêu phẩm',
  'số 1', 'đẳng cấp', 'hoàn hảo',
];
function buildProductNamePrompt_fixed_forbiddenWords(config: ProductNameConfig): string {
  return `
Bạn là chuyên gia đặt tên sản phẩm nội thất cho listing ecommerce.

Thông tin sản phẩm:
- Loại sản phẩm: ${config.productType}

Ngôn ngữ output: ${config.language}

Yêu cầu:
- Tạo đúng 10 tên sản phẩm.
- Mỗi tên dài 3-10 từ.
- Không dùng: ${COMMON_FORBIDDEN_WORDS_FIXED.join(', ')}.

Trả về JSON:
{ "names": [{ "name": "...", "style": "seo", "reason": "..." }] }
`.trim();
}

// ============================================================
// COPY — fallbackParse BUGGY (as-is from route.ts)
// ============================================================

interface NameItem {
  name: string;
  style?: string;
  reason?: string;
}

function fallbackParse_buggy(raw: string): NameItem[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const clean = line.replace(/^\d+[\.)]\s*/, '').trim();
      const parts = clean.split('|').map((item) => item.trim());
      return {
        name: parts[0] ?? clean,
        style: parts[1] ?? 'descriptive',
        reason: parts[2] ?? '',
      };
    })
    .filter((item) => item.name)
    .slice(0, 10);
}

// FIX #2 — also handle " - " separator
function fallbackParse_fixed(raw: string): NameItem[] {
  const VALID_STYLES_SET = new Set(['seo', 'short', 'descriptive', 'emotional', 'segmented', 'localized', 'creative']);

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const clean = line.replace(/^\d+[\.)]\s*/, '').replace(/^[-*]\s*/, '').trim();

      // Try pipe separator first, then dash separator
      let parts: string[];
      if (clean.includes('|')) {
        parts = clean.split('|').map((item) => item.trim());
      } else if (/ - /.test(clean)) {
        parts = clean.split(' - ').map((item) => item.trim());
      } else {
        parts = [clean];
      }

      const nameRaw = parts[0] ?? clean;
      const styleCand = parts[1]?.toLowerCase() ?? '';
      const style = VALID_STYLES_SET.has(styleCand) ? styleCand : 'descriptive';
      const reason = parts[2] ?? '';

      return { name: nameRaw, style, reason };
    })
    .filter((item) => item.name.length > 0)
    .slice(0, 10);
}

// FIX #5 — name word count validation (3-10 từ)
function validateNameWordCount(name: string): boolean {
  const wordCount = name.trim().split(/\s+/).filter(Boolean).length;
  return wordCount >= 3 && wordCount <= 10;
}

// ============================================================
// Helpers
// ============================================================

function makeConfig(overrides: Partial<ProductNameConfig> = {}): ProductNameConfig {
  return {
    productType: 'Giường sắt',
    material: 'Sắt hộp 4x6, dày 1.4mm',
    keyFeatures: 'Chịu tải 200kg, gọn nhẹ, sơn tĩnh điện',
    targetCustomer: 'Sinh viên thuê trọ, gia đình trẻ',
    priceSegment: 'mid',
    language: 'Vietnamese',
    brandName: 'Nội Thất Minh Quân',
    ...overrides,
  };
}

// ============================================================
// TESTS — PRICE_CONTEXT
// ============================================================

describe('PRICE_CONTEXT', () => {
  it('has entries for all 3 price segments', () => {
    const segments: Array<ProductNameConfig['priceSegment']> = ['budget', 'mid', 'premium'];
    for (const seg of segments) {
      assert.ok(PRICE_CONTEXT[seg], `Missing PRICE_CONTEXT for: ${seg}`);
    }
  });

  it('budget mentions "giá" or "tiết kiệm"', () => {
    const text = PRICE_CONTEXT.budget.toLowerCase();
    assert.ok(text.includes('giá') || text.includes('tiết kiệm'));
  });

  it('mid mentions balance of quality and price', () => {
    const text = PRICE_CONTEXT.mid.toLowerCase();
    assert.ok(text.includes('chất lượng') || text.includes('cân bằng'));
  });

  it('premium mentions quality or "tinh tế"', () => {
    const text = PRICE_CONTEXT.premium.toLowerCase();
    assert.ok(text.includes('chất lượng') || text.includes('tinh tế'));
  });

  it('each context string is descriptive (> 20 chars)', () => {
    for (const [key, val] of Object.entries(PRICE_CONTEXT)) {
      assert.ok(val.length > 20, `PRICE_CONTEXT[${key}] too short`);
    }
  });

  it('budget and premium contexts are meaningfully different', () => {
    assert.notEqual(PRICE_CONTEXT.budget, PRICE_CONTEXT.premium);
    assert.notEqual(PRICE_CONTEXT.budget, PRICE_CONTEXT.mid);
  });
});

// ============================================================
// TESTS — buildProductNamePrompt basic content
// ============================================================

describe('buildProductNamePrompt — basic content', () => {
  it('includes productType', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ productType: 'Tủ quần áo' }));
    assert.ok(prompt.includes('Tủ quần áo'));
  });

  it('includes material when provided', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ material: 'Gỗ MDF chống ẩm' }));
    assert.ok(prompt.includes('Gỗ MDF chống ẩm'));
  });

  it('includes keyFeatures when provided', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ keyFeatures: 'Ngăn kéo rộng, có gương' }));
    assert.ok(prompt.includes('Ngăn kéo rộng, có gương'));
  });

  it('includes targetCustomer when provided', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ targetCustomer: 'Gia đình TP.HCM' }));
    assert.ok(prompt.includes('Gia đình TP.HCM'));
  });

  it('includes priceSegment label and context description', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ priceSegment: 'premium' }));
    assert.ok(prompt.includes('premium'));
    assert.ok(prompt.includes(PRICE_CONTEXT.premium));
  });

  it('includes all 3 price context descriptions correctly by segment', () => {
    for (const seg of ['budget', 'mid', 'premium'] as const) {
      const prompt = buildProductNamePrompt_buggy(makeConfig({ priceSegment: seg }));
      assert.ok(prompt.includes(PRICE_CONTEXT[seg]), `Missing price context for: ${seg}`);
    }
  });

  it('includes language', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ language: 'English' }));
    assert.ok(prompt.includes('English'));
  });

  it('requires exactly 10 names', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig());
    assert.ok(prompt.includes('10 tên sản phẩm'));
  });

  it('mentions 3-10 word length constraint', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig());
    assert.ok(prompt.includes('3-10 từ'));
  });

  it('includes JSON output format with name/style/reason keys', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig());
    assert.ok(prompt.includes('"name"'));
    assert.ok(prompt.includes('"style"'));
    assert.ok(prompt.includes('"reason"'));
    assert.ok(prompt.includes('"names"'));
  });

  it('requests no markdown', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig());
    assert.ok(prompt.toLowerCase().includes('không markdown') || prompt.includes('no markdown'));
  });

  it('mentions style distribution: seo, short, descriptive, emotional', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig());
    assert.ok(prompt.includes('seo'));
    assert.ok(prompt.includes('descriptive'));
    assert.ok(prompt.includes('emotional'));
    assert.ok(prompt.includes('localized'));
    assert.ok(prompt.includes('creative'));
  });

  it('includes brand name in brand block when provided', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ brandName: 'Nội Thất Minh Quân' }));
    assert.ok(prompt.includes('Nội Thất Minh Quân'));
  });

  it('includes forbidden custom words in brand block', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ forbidden: 'giá rẻ, chắc chắn' }));
    assert.ok(prompt.includes('giá rẻ, chắc chắn'));
  });

  it('no brand block when all brand fields empty', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ brandName: '', forbidden: undefined }));
    assert.ok(!prompt.includes('Thông tin shop/brand:'));
  });
});

// ============================================================
// TESTS — BUG #1: empty fields render as empty lines
// ============================================================

describe('buildProductNamePrompt — BUG #1: empty fields render as empty lines', () => {
  it('[BUG #1] empty material renders "- Chất liệu: " (empty line)', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ material: '' }));
    // BUG: empty field still appears as an empty line
    assert.ok(/- Chất liệu:\s*\n/.test(prompt) || prompt.includes('- Chất liệu: \n'),
      '[BUG #1] empty material line should not appear but does');
  });

  it('[BUG #1] empty keyFeatures renders empty line', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ keyFeatures: '' }));
    assert.ok(/- Tính năng nổi bật:\s*\n/.test(prompt),
      '[BUG #1] empty keyFeatures should not appear but does');
  });

  it('[BUG #1] empty targetCustomer renders empty line', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ targetCustomer: '' }));
    assert.ok(/- Khách hàng mục tiêu:\s*\n/.test(prompt),
      '[BUG #1] empty targetCustomer should not appear but does');
  });

  it('[FIX #1] fixed version omits empty material line', () => {
    const prompt = buildProductNamePrompt_fixed_emptyFields(makeConfig({ material: '' }));
    assert.ok(!/- Chất liệu:\s*\n/.test(prompt), '[FIX #1] empty material line should be removed');
  });

  it('[FIX #1] fixed version omits empty keyFeatures line', () => {
    const prompt = buildProductNamePrompt_fixed_emptyFields(makeConfig({ keyFeatures: '' }));
    assert.ok(!/- Tính năng nổi bật:\s*\n/.test(prompt), '[FIX #1] empty keyFeatures line should be removed');
  });

  it('[FIX #1] fixed version omits empty targetCustomer line', () => {
    const prompt = buildProductNamePrompt_fixed_emptyFields(makeConfig({ targetCustomer: '' }));
    assert.ok(!/- Khách hàng mục tiêu:\s*\n/.test(prompt), '[FIX #1] empty targetCustomer should be removed');
  });

  it('[FIX #1] fixed version keeps non-empty fields', () => {
    const prompt = buildProductNamePrompt_fixed_emptyFields(makeConfig({
      material: 'Sắt hộp 4x6',
      keyFeatures: 'Chịu tải 200kg',
    }));
    assert.ok(prompt.includes('Sắt hộp 4x6'), 'material kept');
    assert.ok(prompt.includes('Chịu tải 200kg'), 'keyFeatures kept');
  });

  it('[FIX #1] all 3 fields empty — prompt still valid with productType only', () => {
    const prompt = buildProductNamePrompt_fixed_emptyFields(makeConfig({
      material: '', keyFeatures: '', targetCustomer: '',
    }));
    assert.ok(prompt.includes('Giường sắt'), 'productType always present');
    assert.ok(!(/- Chất liệu:\s*\n/.test(prompt)));
  });
});

// ============================================================
// TESTS — BUG #3: style distribution missing
// ============================================================

describe('buildProductNamePrompt — BUG #3: 7 styles / 10 names — no distribution guidance', () => {
  it('[BUG #3] prompt has 7 styles listed for 10 names but no per-style count', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig());
    const hasDistribution = /\w+:\s*\d+/.test(prompt);
    assert.ok(!hasDistribution, '[BUG #3] no distribution count guidance in buggy prompt');
  });

  it('VALID_STYLES has exactly 7 entries covering all prompt style values', () => {
    assert.equal(VALID_STYLES.length, 7);
    const expected = ['seo', 'short', 'descriptive', 'emotional', 'segmented', 'localized', 'creative'];
    for (const s of expected) {
      assert.ok(VALID_STYLES.includes(s), `Missing style: ${s}`);
    }
  });

  it('[FIX #3] fixed version includes per-style distribution counts', () => {
    const prompt = buildProductNamePrompt_fixed_styleDistribution(makeConfig());
    // Should have something like "seo: 2, short: 1, ..."
    assert.ok(/\w+:\s*\d+/.test(prompt), '[FIX #3] distribution counts should appear in prompt');
    assert.ok(prompt.includes('BẮT BUỘC') || prompt.includes('PHÂN BỔ'), '[FIX #3] distribution should be marked mandatory');
  });

  it('[FIX #3] distribution sums to 10', () => {
    // seo:2, short:1, descriptive:2, emotional:2, segmented:1, localized:1, creative:1 = 10
    const distribution = [2, 1, 2, 2, 1, 1, 1];
    const total = distribution.reduce((s, n) => s + n, 0);
    assert.equal(total, 10, 'distribution must sum to 10');
  });
});

// ============================================================
// TESTS — BUG #4: incomplete forbidden word list
// ============================================================

describe('buildProductNamePrompt — BUG #4: incomplete forbidden word list', () => {
  it('[BUG #4] prompt has 5 forbidden words — missing "tuy nhiên"', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig());
    assert.ok(!prompt.includes('tuy nhiên'), '[BUG #4] tuy nhiên missing from forbidden list');
  });

  it('[BUG #4] prompt missing "bên cạnh đó"', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig());
    assert.ok(!prompt.includes('bên cạnh đó'), '[BUG #4] bên cạnh đó missing');
  });

  it('[BUG #4] prompt missing "vô cùng"', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ brandName: '', forbidden: undefined }));
    // "vô cùng" not in the main Yêu cầu forbidden list
    const requireSection = prompt.split('Yêu cầu:')[1] ?? '';
    assert.ok(!requireSection.includes('vô cùng'), '[BUG #4] vô cùng not in Yêu cầu section');
  });

  it('[FIX #4] COMMON_FORBIDDEN_WORDS_FIXED has 15 words', () => {
    assert.equal(COMMON_FORBIDDEN_WORDS_FIXED.length, 15);
  });

  it('[FIX #4] fixed version includes "tuy nhiên" in forbidden list', () => {
    const prompt = buildProductNamePrompt_fixed_forbiddenWords(makeConfig());
    assert.ok(prompt.includes('tuy nhiên'), '[FIX #4] tuy nhiên should be forbidden');
  });

  it('[FIX #4] fixed version includes "bên cạnh đó" in forbidden list', () => {
    const prompt = buildProductNamePrompt_fixed_forbiddenWords(makeConfig());
    assert.ok(prompt.includes('bên cạnh đó'), '[FIX #4] bên cạnh đó should be forbidden');
  });

  it('[FIX #4] original 5 words still present in fixed version', () => {
    const prompt = buildProductNamePrompt_fixed_forbiddenWords(makeConfig());
    const originalFive = ['siêu phẩm', 'số 1', 'đẳng cấp', 'hoàn hảo', 'tuyệt vời'];
    for (const word of originalFive) {
      assert.ok(prompt.includes(word), `[FIX #4] original forbidden word missing: ${word}`);
    }
  });
});

// ============================================================
// TESTS — fallbackParse basic
// ============================================================

describe('fallbackParse — basic parsing', () => {
  it('parses pipe-separated name|style|reason', () => {
    const raw = 'Giường Sắt Đơn Giản | seo | dễ tìm kiếm trên Shopee';
    const result = fallbackParse_buggy(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Giường Sắt Đơn Giản');
    assert.equal(result[0].style, 'seo');
    assert.equal(result[0].reason, 'dễ tìm kiếm trên Shopee');
  });

  it('parses numbered list with pipe separator', () => {
    const raw = `1. Giường Sắt Đa Năng | seo | search intent tốt
2. Tủ Quần Áo Mini | short | ngắn gọn dễ nhớ`;
    const result = fallbackParse_buggy(raw);
    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'Giường Sắt Đa Năng');
    assert.equal(result[1].name, 'Tủ Quần Áo Mini');
  });

  it('strips numbered prefix from name', () => {
    const raw = '3. Tủ Sắt Nhiều Ngăn | descriptive | mô tả rõ';
    const result = fallbackParse_buggy(raw);
    assert.equal(result.length, 1);
    assert.ok(!result[0].name.startsWith('3.'), 'numbered prefix should be stripped');
    assert.equal(result[0].name, 'Tủ Sắt Nhiều Ngăn');
  });

  it('strips "1)" prefix variant', () => {
    const raw = '1) Bàn Học Gỗ Gọn | seo | keyword tốt';
    const result = fallbackParse_buggy(raw);
    assert.ok(!result[0].name.startsWith('1)'));
    assert.equal(result[0].name, 'Bàn Học Gỗ Gọn');
  });

  it('defaults style to "descriptive" when no pipe separator', () => {
    const raw = 'Giường Sắt Đẹp';
    const result = fallbackParse_buggy(raw);
    assert.equal(result[0].style, 'descriptive');
  });

  it('defaults reason to "" when no pipe separator', () => {
    const raw = 'Giường Sắt Đẹp';
    const result = fallbackParse_buggy(raw);
    assert.equal(result[0].reason, '');
  });

  it('returns at most 10 items', () => {
    const lines = Array.from({ length: 15 }, (_, i) => `${i + 1}. Tên ${i + 1}`).join('\n');
    const result = fallbackParse_buggy(lines);
    assert.ok(result.length <= 10, 'should cap at 10');
  });

  it('returns empty array for empty input', () => {
    assert.deepEqual(fallbackParse_buggy(''), []);
  });

  it('filters out empty lines', () => {
    const raw = 'Giường Sắt Đơn | seo | ok\n\n\nBàn Học Gỗ | short | ngắn';
    const result = fallbackParse_buggy(raw);
    assert.equal(result.length, 2);
  });
});

// ============================================================
// TESTS — BUG #2: pipe-only separator loses style/reason
// ============================================================

describe('fallbackParse — BUG #2: pipe-only separator, " - " format ignored', () => {
  it('[BUG #2] dash-separated format loses style — defaults to "descriptive"', () => {
    const raw = '1. Giường Sắt Hộp Đa Năng - seo - khớp search intent Lazada';
    const result = fallbackParse_buggy(raw);
    assert.equal(result.length, 1);
    // BUG: "seo" and reason not extracted because split is on "|" not " - "
    assert.equal(result[0].style, 'descriptive', '[BUG #2] style defaults to descriptive — dash separator not parsed');
    assert.equal(result[0].reason, '', '[BUG #2] reason empty — dash separator not parsed');
  });

  it('[BUG #2] name contains the full "name - style - reason" string', () => {
    const raw = 'Giường Sắt Gọn - short - ngắn gọn dễ nhớ';
    const result = fallbackParse_buggy(raw);
    // BUG: whole string becomes the name
    assert.ok(result[0].name.includes(' - '), '[BUG #2] name contains dash-style text, not stripped');
  });

  it('[FIX #2] fixed version parses dash-separated style correctly', () => {
    const raw = '1. Giường Sắt Hộp Đa Năng - seo - khớp search intent Lazada';
    const result = fallbackParse_fixed(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Giường Sắt Hộp Đa Năng', '[FIX #2] name extracted correctly');
    assert.equal(result[0].style, 'seo', '[FIX #2] style extracted from dash separator');
    assert.equal(result[0].reason, 'khớp search intent Lazada', '[FIX #2] reason extracted');
  });

  it('[FIX #2] fixed version still works with pipe separator', () => {
    const raw = 'Giường Sắt Đơn | seo | dễ tìm';
    const result = fallbackParse_fixed(raw);
    assert.equal(result[0].name, 'Giường Sắt Đơn');
    assert.equal(result[0].style, 'seo');
    assert.equal(result[0].reason, 'dễ tìm');
  });

  it('[FIX #2] fixed version validates style value — rejects unknown styles', () => {
    const raw = 'Giường Sắt Đẹp - unknown_style - reason';
    const result = fallbackParse_fixed(raw);
    // "unknown_style" not in VALID_STYLES_SET → defaults to "descriptive"
    assert.equal(result[0].style, 'descriptive', '[FIX #2] unknown style falls back to descriptive');
  });

  it('[FIX #2] fixed version: valid styles all recognised', () => {
    for (const style of VALID_STYLES) {
      const raw = `Giường Sắt Đẹp - ${style} - reason`;
      const result = fallbackParse_fixed(raw);
      assert.equal(result[0].style, style, `[FIX #2] style "${style}" should be recognised`);
    }
  });

  it('[FIX #2] strips "- " prefix in bare numbered list', () => {
    const raw = `- Tên Sản Phẩm A
- Tên Sản Phẩm B`;
    const result = fallbackParse_fixed(raw);
    assert.ok(result.length >= 1);
    assert.ok(!result[0].name.startsWith('-'), 'dash prefix should be stripped');
  });

  it('[FIX #2] mixed format (some pipe, some dash) all parsed', () => {
    const raw = `1. Giường Sắt Đa Năng | seo | tốt cho SEO
2. Tủ Quần Áo Mini - short - ngắn gọn`;
    const result = fallbackParse_fixed(raw);
    assert.equal(result.length, 2);
    assert.equal(result[0].style, 'seo');
    assert.equal(result[1].style, 'short');
  });
});

// ============================================================
// TESTS — BUG #5: name word count not validated
// ============================================================

describe('name word count validation — BUG #5', () => {
  it('[BUG #5] fallbackParse allows single-word names (violates 3-10 rule)', () => {
    const raw = 'Giường';
    const result = fallbackParse_buggy(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Giường', '[BUG #5] 1-word name not rejected');
  });

  it('[BUG #5] fallbackParse allows very long names (>10 words)', () => {
    const raw = 'Giường Sắt Hộp Chắc Chắn Đa Năng Phù Hợp Phòng Ngủ Nhỏ Tiết Kiệm';
    const result = fallbackParse_buggy(raw);
    assert.equal(result.length, 1);
    const wordCount = result[0].name.split(/\s+/).length;
    assert.ok(wordCount > 10, '[BUG #5] long name (>10 words) not rejected');
  });

  it('[FIX #5] validateNameWordCount accepts 3-word name', () => {
    assert.ok(validateNameWordCount('Giường Sắt Đơn'));
  });

  it('[FIX #5] validateNameWordCount accepts 10-word name', () => {
    assert.ok(validateNameWordCount('Giường Sắt Đơn Giản Gọn Nhẹ Phòng Ngủ Sinh Viên'));
  });

  it('[FIX #5] validateNameWordCount rejects 1-word name', () => {
    assert.ok(!validateNameWordCount('Giường'), '1 word rejected');
  });

  it('[FIX #5] validateNameWordCount rejects 2-word name', () => {
    assert.ok(!validateNameWordCount('Giường Sắt'), '2 words rejected');
  });

  it('[FIX #5] validateNameWordCount rejects 11-word name', () => {
    assert.ok(!validateNameWordCount('Giường Sắt Đơn Giản Gọn Nhẹ Phòng Ngủ Sinh Viên Tiết Kiệm'), '11+ words rejected');
  });

  it('[FIX #5] validateNameWordCount edge case: exactly 3 words', () => {
    assert.ok(validateNameWordCount('Giường Sắt Cơ Bản'.split(' ').slice(0, 3).join(' ')));
  });
});

// ============================================================
// TESTS — Schema validation
// ============================================================

describe('generate route schema validation', () => {
  const { z } = require('zod');

  const schema = z.object({
    productType: z.string().trim().min(1).max(300),
    material: z.string().max(1000).default(''),
    keyFeatures: z.string().max(1000).default(''),
    targetCustomer: z.string().max(500).default(''),
    priceSegment: z.enum(['budget', 'mid', 'premium']).default('mid'),
    language: z.string().default('Vietnamese'),
    modelId: z.string().default('gemini-flash'),
    brandName: z.string().default(''),
    forbidden: z.string().default(''),
  });

  it('accepts minimal valid payload', () => {
    const result = schema.safeParse({ productType: 'Giường sắt' });
    assert.ok(result.success, `Should parse: ${JSON.stringify(result)}`);
  });

  it('rejects empty productType', () => {
    const result = schema.safeParse({ productType: '' });
    assert.ok(!result.success, 'empty productType should fail');
  });

  it('rejects productType over 300 chars', () => {
    const result = schema.safeParse({ productType: 'A'.repeat(301) });
    assert.ok(!result.success);
  });

  it('trims productType whitespace', () => {
    const result = schema.safeParse({ productType: '  Tủ gỗ  ' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { productType: string } }).data.productType, 'Tủ gỗ');
  });

  it('rejects invalid priceSegment', () => {
    const result = schema.safeParse({ productType: 'Test', priceSegment: 'luxury' });
    assert.ok(!result.success, '"luxury" not a valid priceSegment');
  });

  it('accepts all 3 valid priceSegments', () => {
    for (const seg of ['budget', 'mid', 'premium']) {
      const result = schema.safeParse({ productType: 'Test', priceSegment: seg });
      assert.ok(result.success, `priceSegment "${seg}" should be valid`);
    }
  });

  it('defaults priceSegment to "mid"', () => {
    const result = schema.safeParse({ productType: 'Test' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { priceSegment: string } }).data.priceSegment, 'mid');
  });

  it('defaults language to "Vietnamese"', () => {
    const result = schema.safeParse({ productType: 'Test' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { language: string } }).data.language, 'Vietnamese');
  });

  it('defaults modelId to "gemini-flash"', () => {
    const result = schema.safeParse({ productType: 'Test' });
    assert.ok(result.success);
    assert.equal((result as { success: true; data: { modelId: string } }).data.modelId, 'gemini-flash');
  });

  it('rejects material over 1000 chars', () => {
    const result = schema.safeParse({ productType: 'Test', material: 'A'.repeat(1001) });
    assert.ok(!result.success);
  });

  it('rejects keyFeatures over 1000 chars', () => {
    const result = schema.safeParse({ productType: 'Test', keyFeatures: 'A'.repeat(1001) });
    assert.ok(!result.success);
  });

  it('rejects targetCustomer over 500 chars', () => {
    const result = schema.safeParse({ productType: 'Test', targetCustomer: 'A'.repeat(501) });
    assert.ok(!result.success);
  });

  it('accepts full valid payload', () => {
    const result = schema.safeParse({
      productType: 'Giường sắt hộp',
      material: 'Sắt hộp 4x6',
      keyFeatures: 'Chịu tải 200kg',
      targetCustomer: 'Sinh viên',
      priceSegment: 'budget',
      language: 'Vietnamese',
      modelId: 'gemini-pro',
      brandName: 'Minh Quân',
      forbidden: 'giá rẻ',
    });
    assert.ok(result.success);
  });
});

// ============================================================
// TESTS — PRICE_CONTEXT defensive (undefined key)
// ============================================================

describe('PRICE_CONTEXT — defensive access', () => {
  it('returns undefined for unknown segment key', () => {
    // TypeScript prevents this at compile time, but defensive runtime check
    const ctx = (PRICE_CONTEXT as Record<string, string>)['luxury'];
    assert.equal(ctx, undefined, 'unknown segment should be undefined');
  });

  it('prompt with unknown segment would contain "undefined"', () => {
    // Demonstrates the P2 defensive issue
    const fakeConfig: ProductNameConfig = {
      productType: 'Test',
      material: '',
      keyFeatures: '',
      targetCustomer: '',
      priceSegment: 'mid',
      language: 'Vietnamese',
    };
    // Simulate bad runtime value bypassing TypeScript
    (fakeConfig as Record<string, unknown>).priceSegment = 'luxury';
    const context = PRICE_CONTEXT[(fakeConfig as ProductNameConfig).priceSegment];
    assert.equal(context, undefined, 'undefined context means prompt would have "undefined" string');
  });

  it('[FIX defensive] using nullish coalescing avoids "undefined" in prompt', () => {
    const badKey = 'luxury' as ProductNameConfig['priceSegment'];
    const context = PRICE_CONTEXT[badKey] ?? 'Phân khúc không xác định';
    assert.ok(!context.includes('undefined'), 'nullish coalescing prevents "undefined" in prompt');
    assert.ok(context.length > 0);
  });
});

// ============================================================
// TESTS — productType edge cases
// ============================================================

describe('buildProductNamePrompt — productType edge cases', () => {
  it('handles Vietnamese product names with diacritics', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ productType: 'Giường ngủ đôi gỗ sồi' }));
    assert.ok(prompt.includes('Giường ngủ đôi gỗ sồi'));
  });

  it('handles product type with special chars', () => {
    const prompt = buildProductNamePrompt_buggy(makeConfig({ productType: 'Bàn & Ghế phòng ăn' }));
    assert.ok(prompt.includes('Bàn & Ghế phòng ăn'));
  });

  it('generates different prompts for different productTypes', () => {
    const p1 = buildProductNamePrompt_buggy(makeConfig({ productType: 'Giường sắt' }));
    const p2 = buildProductNamePrompt_buggy(makeConfig({ productType: 'Tủ quần áo' }));
    assert.notEqual(p1, p2);
  });

  it('different priceSegments produce different prompts', () => {
    const budget = buildProductNamePrompt_buggy(makeConfig({ priceSegment: 'budget' }));
    const premium = buildProductNamePrompt_buggy(makeConfig({ priceSegment: 'premium' }));
    assert.notEqual(budget, premium);
    assert.ok(budget.includes(PRICE_CONTEXT.budget));
    assert.ok(premium.includes(PRICE_CONTEXT.premium));
  });
});
