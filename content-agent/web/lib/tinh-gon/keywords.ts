import { stripVietnamese } from './text';

const FALLBACK_SUFFIXES = [
  'giá bao nhiêu',
  'loại nào tốt',
  'kích thước phổ biến',
  'có bền không',
  'cách chọn phù hợp',
  'ưu nhược điểm',
  'kinh nghiệm mua',
  'mẫu đáng cân nhắc',
  'cho phòng nhỏ',
  'bảo hành bao lâu',
];

export function normalizeKeywordList(items: string[], keyword: string, count: number): string[] {
  const normalizedBase = stripVietnamese(keyword).toLowerCase().trim();

  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => stripVietnamese(item).toLowerCase() !== normalizedBase),
    ),
  ).slice(0, count);
}

export function buildKeywordSuggestionsFallback(keyword: string, count = 8): string[] {
  const base = keyword.trim();
  if (!base) return [];

  const suggestions = [
    ...FALLBACK_SUFFIXES.map((suffix) => `${base} ${suffix}`),
    `mua ${base} ở đâu`,
    `${base} thực tế`,
    `review ${base}`,
  ];

  return normalizeKeywordList(suggestions, keyword, count);
}
