import { escapeRegExp, stripVietnamese } from '@/lib/tinh-gon/text';
import type { HumannessFlag, SentenceTargetLike } from './types';

const VAGUE_WORDS = [
  'bền',
  'đẹp',
  'tốt',
  'chất lượng',
  'chắc chắn',
  'phù hợp',
  'tiện lợi',
  'ấn tượng',
];

const ALLOWED_TECHNICAL = [
  'kích thước',
  'chất liệu',
  'bảo hành',
  'tải trọng',
  'khung sắt',
  'ván mdf',
  'sơn tĩnh điện',
  'giao hàng',
];

const SPECIFIC_DATA_REGEX = /\d+([.,]\d+)?\s*(mm|cm|m|kg|%|ngày|tuần|tháng|triệu|nghìn|đ|m2|m²|giờ)/iu;

function normalizeText(value: string): string {
  return stripVietnamese(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildSnippet(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > 120 ? `${compact.slice(0, 119).trimEnd()}…` : compact;
}

function findMatchedTerms(text: string): string[] {
  const normalized = normalizeText(text);
  return VAGUE_WORDS.filter((term) => {
    const matcher = new RegExp(`(^|\\W)${escapeRegExp(normalizeText(term))}(?=$|\\W)`, 'i');
    return matcher.test(normalized);
  });
}

export function checkSpecificity(sentences: SentenceTargetLike[]): HumannessFlag[] {
  const flags: HumannessFlag[] = [];

  for (const sentence of sentences) {
    if (sentence.text.includes('?') || SPECIFIC_DATA_REGEX.test(sentence.text)) {
      continue;
    }

    const matchedTerms = findMatchedTerms(sentence.text);
    if (matchedTerms.length === 0) {
      continue;
    }

    const normalized = normalizeText(sentence.text);
    const hasTechnicalContext = ALLOWED_TECHNICAL.some((term) => normalized.includes(normalizeText(term)));
    if (hasTechnicalContext && matchedTerms.length === 1) {
      continue;
    }

    flags.push({
      id: `specificity:${sentence.index}:${normalizeText(matchedTerms.join('-')).slice(0, 40)}`,
      type: 'specificity',
      severity: 'info',
      sentenceIndex: sentence.index,
      sentenceIndexes: [sentence.index],
      snippet: buildSnippet(sentence.text),
      label: 'Thiếu dữ kiện cụ thể',
      reason: `Câu dùng mô tả chung (${matchedTerms.join(', ')}) nhưng chưa có thông số hoặc ví dụ cụ thể.`,
      actionLabel: 'Thêm dữ kiện',
      matchedTerms,
      suggestion: '',
    });
  }

  return flags;
}
