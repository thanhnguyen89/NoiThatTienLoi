import type { FacebookPostRequest } from './types';

export function buildBrandContext(params: FacebookPostRequest): string {
  const lines: string[] = [];

  if (params.shopName) lines.push(`THƯƠNG HIỆU / SHOP: ${params.shopName}`);
  if (params.industry) lines.push(`NGÀNH HÀNG: ${params.industry}`);
  if (params.brandPronouns) lines.push(`XƯNG HÔ: ${params.brandPronouns}`);
  if (params.brandAudience) lines.push(`ĐỐI TƯỢNG KHÁCH HÀNG: ${params.brandAudience}`);
  if (params.mainProducts.trim()) lines.push(`SẢN PHẨM CHÍNH: ${params.mainProducts.trim()}`);
  if (params.phone) lines.push(`HOTLINE: ${params.phone}`);
  if (params.address) lines.push(`ĐỊA CHỈ / WEBSITE: ${params.address}`);

  if (params.brandDesc.trim()) {
    lines.push('');
    lines.push('MÔ TẢ THƯƠNG HIỆU:');
    lines.push(params.brandDesc.trim());
  }

  if (params.brandToneNotes.trim()) {
    lines.push('');
    lines.push('GIỌNG VĂN / USP / ĐỊNH VỊ:');
    lines.push(params.brandToneNotes.trim());
  }

  if (params.ctaStandard.trim()) {
    lines.push('');
    lines.push('CTA CHUẨN — BẮT BUỘC dùng câu này (hoặc biến thể rất gần) ở cuối bài:');
    lines.push(params.ctaStandard.trim());
  }

  if (params.brandForbidden.trim()) {
    lines.push('');
    lines.push(`TỪ CẤM BỔ SUNG (KHÔNG ĐƯỢC DÙNG): ${params.brandForbidden.trim()}`);
  }

  if (lines.length === 0) {
    return '(Không có thông tin thương hiệu — hãy suy luận từ từ khóa và viết bài phù hợp)';
  }

  return lines.join('\n');
}
