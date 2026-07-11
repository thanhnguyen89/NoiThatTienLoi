/**
 * _context.ts — Brand context loader
 *
 * Ưu tiên:
 *   1. brandConfig từ form (nếu user điền tên thương hiệu)
 *   2. Đọc từ file context/ + sop/ (mặc định Nội Thất Minh Quân)
 *   3. Hardcoded fallback nếu cả 2 đều thất bại
 */

import { readFile } from 'fs/promises';
import { join }     from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrandConfig {
  name?:           string;   // Tên thương hiệu
  pronouns?:       string;   // Xưng hô: "Minh Quân / chúng tôi — anh/chị"
  audience?:       string;   // Đối tượng: "gia đình trẻ, sinh viên thuê trọ"
  forbiddenExtra?: string;   // Từ cấm bổ sung (cách nhau bởi dấu phẩy)
  toneNotes?:      string;   // Ghi chú giọng văn tự do
}

// ─── Forbidden words mặc định (từ CLAUDE.md) ─────────────────────────────────

export const DEFAULT_FORBIDDEN = [
  'quan trọng', 'hiệu quả', 'tuy nhiên', 'bên cạnh đó', 'đáng kể',
  'không thể phủ nhận', 'toàn diện', 'tối ưu hóa', 'đặc biệt quan trọng',
  'nhìn chung', 'thực tế cho thấy', 'chính vì vậy', 'Như vậy', 'Tóm lại',
  'Trong cuộc sống hiện đại', 'Ngày nay', 'Trong bài viết này', 'Trên đây là',
  'hy vọng bài viết', 'thông tin hữu ích', 'vô cùng', 'cực kỳ', 'tuyệt vời',
  'đáng chú ý', 'siêu phẩm', 'số 1', 'đẳng cấp', 'hoàn hảo',
];

// ─── File reader ──────────────────────────────────────────────────────────────

const ROOT = join(process.cwd(), '..'); // content-agent/web/../ = content-agent/

async function readSafe(filePath: string, maxChars = 2000): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return content.slice(0, maxChars);
  } catch {
    return '';
  }
}

// ─── Main builder ─────────────────────────────────────────────────────────────

/**
 * buildBrandPrompt — trả về đoạn prompt mô tả brand rules
 *
 * @param override  Nếu user điền form thương hiệu → dùng override
 *                  Nếu để trống → load từ context files (Minh Quân)
 */
export async function buildBrandPrompt(override?: BrandConfig): Promise<string> {

  // ── 1. User điền brand riêng ────────────────────────────────────────────────
  if (override?.name?.trim()) {
    const forbidden = [
      ...DEFAULT_FORBIDDEN,
      ...(override.forbiddenExtra ? override.forbiddenExtra.split(',').map((w) => w.trim()).filter(Boolean) : []),
    ].join('", "');

    return `## Thương hiệu: ${override.name.trim()}
${override.pronouns ? `- Xưng hô: ${override.pronouns}` : ''}
${override.audience ? `- Đối tượng khách hàng: ${override.audience}` : ''}
${override.toneNotes ? `- Giọng văn & quy tắc: ${override.toneNotes}` : '- Giọng văn: Chân thật – Chuyên nghiệp – Gần gũi'}
- Keyword density: 1.0–1.5%
- TUYỆT ĐỐI không dùng: "${forbidden}"`.trim();
  }

  // ── 2. Load từ context files (Nội Thất Minh Quân) ──────────────────────────
  const [brandGuideline, productCatalog, persona, sop] = await Promise.all([
    readSafe(join(ROOT, 'context', 'brand-guideline.md'),  2500),
    readSafe(join(ROOT, 'context', 'product-catalog.md'),  1500),
    readSafe(join(ROOT, 'context', 'customer-persona.md'), 1000),
    readSafe(join(ROOT, 'sop',     'content-sop.md'),      1500),
  ]);

  const sections: string[] = [];

  if (brandGuideline) sections.push(`## Brand Guideline:\n${brandGuideline}`);
  if (productCatalog)  sections.push(`## Product Catalog (tham khảo):\n${productCatalog}`);
  if (persona)         sections.push(`## Customer Persona:\n${persona}`);
  if (sop)             sections.push(`## Content SOP:\n${sop}`);

  if (sections.length > 0) {
    const forbidden = DEFAULT_FORBIDDEN.join('", "');
    return `${sections.join('\n\n')}

## Từ TUYỆT ĐỐI không dùng: "${forbidden}"
## Keyword density: 1.0–1.5%`;
  }

  // ── 3. Hardcoded fallback ───────────────────────────────────────────────────
  const forbidden = DEFAULT_FORBIDDEN.join('", "');
  return `## Thương hiệu: Nội Thất Minh Quân
- Xưng "Minh Quân" hoặc "chúng tôi", gọi khách "anh/chị" hoặc "quý khách"
- Giọng văn: Chân thật – Chuyên nghiệp – Gần gũi
- Số liệu cụ thể (kg, mm, ngày giao) thay tính từ chung chung
- CTA: "có sẵn – giao liền" / "báo giá trong ngày"
- TUYỆT ĐỐI không dùng: "${forbidden}"
- Keyword density: 1.0–1.5%`;
}

/**
 * buildForbiddenList — danh sách từ cấm kết hợp default + extra từ form
 */
export function buildForbiddenList(forbiddenExtra?: string): string[] {
  return [
    ...DEFAULT_FORBIDDEN,
    ...(forbiddenExtra ? forbiddenExtra.split(',').map((w) => w.trim()).filter(Boolean) : []),
  ];
}
