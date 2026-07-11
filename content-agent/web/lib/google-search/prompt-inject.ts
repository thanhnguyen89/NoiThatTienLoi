import type { GoogleSearchData } from './types';

export function buildDataBlock(data: GoogleSearchData): string {
  if (!data.items.length) return '';

  const lines: string[] = [
    `## DỮ LIỆU THỰC TẾ TỪ GOOGLE (${data.items.length} kết quả top đầu)`,
    `Keyword: "${data.keyword}"`,
    `Tổng kết quả: ${Number(data.totalResults).toLocaleString()}`,
    '',
    '⚠️ Hãy dùng dữ liệu này làm nền tảng thực tế. KHÔNG bịa thêm thông tin.',
    '⚠️ Viết bài MỚI hoàn toàn — KHÔNG sao chép. Học cấu trúc, không copy nội dung.',
    '',
  ];

  data.items.forEach((item, index) => {
    lines.push(`### [${index + 1}] ${item.title}`);
    lines.push(`URL: ${item.link}`);
    lines.push(`Tóm tắt: ${item.snippet}`);
    if (item.extractedText && item.extractedText.length > 100) {
      lines.push('Nội dung:');
      lines.push(item.extractedText.slice(0, 1500));
    }
    lines.push('');
  });

  lines.push('---');
  lines.push('Dựa vào dữ liệu trên để viết bài chính xác, thực tế, vượt trội hơn các bài đang rank.');

  return lines.join('\n');
}
