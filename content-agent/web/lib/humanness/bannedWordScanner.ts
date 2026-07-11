import { escapeRegExp, stripVietnamese } from '@/lib/tinh-gon/text';
import type { AIConfigData, BannedWordGroup, HumannessFlag, SentenceTargetLike } from './types';

const FLUFF_ADJECTIVES = new Set([
  'da dang',
  'phong phu',
  'da dang va phong phu',
  'vo cung',
  'cuc ky',
  'tuyet voi',
  'dang chu y',
]);

const AI_PATTERNS = new Set(['khong chi', 'ma con']);
const MARKETING_FLUFF = new Set(['sieu pham', 'so 1', 'dang cap', 'hoan hao']);

export interface BannedWordScanResult {
  flags: HumannessFlag[];
  forbiddenWords: string[];
  clicheOpenings: string[];
}

function normalizeText(value: string): string {
  return stripVietnamese(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildSnippet(text: string, maxLength = 120): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1).trimEnd()}…` : compact;
}

function startsWithPhrase(sentence: string, phrase: string): boolean {
  const normalizedSentence = normalizeText(sentence);
  const normalizedPhrase = normalizeText(phrase);
  return normalizedSentence.startsWith(normalizedPhrase);
}

function includesPhrase(sentence: string, phrase: string): boolean {
  const normalizedSentence = normalizeText(sentence);
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return false;

  const matcher = new RegExp(`(^|\\W)${escapeRegExp(normalizedPhrase)}(?=$|\\W)`, 'i');
  return matcher.test(normalizedSentence);
}

function classifyBannedGroup(term: string, clicheOpenings: string[]): BannedWordGroup {
  const normalized = normalizeText(term);

  if (clicheOpenings.some((item) => normalizeText(item) === normalized)) {
    return 'group2_cliche_openers';
  }

  if (AI_PATTERNS.has(normalized)) {
    return 'group4_ai_patterns';
  }

  if (MARKETING_FLUFF.has(normalized)) {
    return 'group5_marketing_fluff';
  }

  if (FLUFF_ADJECTIVES.has(normalized)) {
    return 'group3_fluff_adjectives';
  }

  return 'group1_ai_transitions';
}

function buildLabel(group: BannedWordGroup, matchedTerms: string[]): string {
  switch (group) {
    case 'group2_cliche_openers':
      return 'Mở câu sáo rỗng';
    case 'group3_fluff_adjectives':
      return 'Tính từ rỗng nghĩa';
    case 'group4_ai_patterns':
      return 'Pattern AI quá rõ';
    case 'group5_marketing_fluff':
      return 'Marketing fluff';
    case 'generic':
      return matchedTerms.length > 1 ? 'Từ cấm AI' : `Từ cấm: ${matchedTerms[0]}`;
    default:
      return 'Transition word kiểu AI';
  }
}

function buildReason(group: BannedWordGroup, matchedTerms: string[]): string {
  const joinedTerms = matchedTerms.join(', ');
  switch (group) {
    case 'group2_cliche_openers':
      return `Câu mở đầu bằng cụm sáo rỗng (${joinedTerms}), dễ tạo cảm giác mẫu AI.`;
    case 'group3_fluff_adjectives':
      return `Câu dùng tính từ chung chung (${joinedTerms}) nhưng chưa bổ sung dữ kiện cụ thể.`;
    case 'group4_ai_patterns':
      return `Pattern "${joinedTerms}" là dấu hiệu AI phổ biến, nên đổi cấu trúc câu.`;
    case 'group5_marketing_fluff':
      return `Cụm marketing quá tay (${joinedTerms}) làm giọng bài thiếu tự nhiên.`;
    default:
      return `Phát hiện cụm từ chuyển ý kiểu AI (${joinedTerms}), nên viết lại theo ngữ cảnh tự nhiên hơn.`;
  }
}

function buildSuggestion(sentence: string, matchedTerms: string[], group: BannedWordGroup): string {
  const cleanedSentence = matchedTerms.reduce((current, term) => {
    const matcher = new RegExp(escapeRegExp(term), 'gi');
    return current.replace(matcher, '').replace(/\s{2,}/g, ' ').trim();
  }, sentence);

  if (group === 'group4_ai_patterns') {
    return cleanedSentence || sentence;
  }

  return cleanedSentence !== sentence ? cleanedSentence : '';
}

export function scanBannedWords(sentences: SentenceTargetLike[], config: AIConfigData): BannedWordScanResult {
  const forbiddenFlags: HumannessFlag[] = [];
  const foundForbidden: string[] = [];
  const foundCliches: string[] = [];
  const forbiddenWords = config.FORBIDDEN_WORDS ?? [];
  const clicheOpenings = config.CLICHE_OPENINGS ?? [];

  for (const sentence of sentences) {
    const matchedForbidden = dedupe(
      forbiddenWords.filter((term) => includesPhrase(sentence.text, term)),
    );
    const matchedCliches = dedupe(
      clicheOpenings.filter((term) => startsWithPhrase(sentence.text, term)),
    );

    const patternMatch = includesPhrase(sentence.text, 'không chỉ') && includesPhrase(sentence.text, 'mà còn');
    const matchedTerms = dedupe([
      ...matchedForbidden,
      ...matchedCliches,
      ...(patternMatch ? ['không chỉ', 'mà còn'] : []),
    ]);

    if (matchedTerms.length === 0) {
      continue;
    }

    foundForbidden.push(...matchedForbidden, ...(patternMatch ? ['không chỉ', 'mà còn'] : []));
    foundCliches.push(...matchedCliches);

    const groups = matchedTerms.map((term) =>
      patternMatch && (normalizeText(term) === 'khong chi' || normalizeText(term) === 'ma con')
        ? 'group4_ai_patterns'
        : classifyBannedGroup(term, clicheOpenings),
    );

    const group = groups.includes('group5_marketing_fluff')
      ? 'group5_marketing_fluff'
      : groups.includes('group4_ai_patterns')
        ? 'group4_ai_patterns'
        : groups.includes('group3_fluff_adjectives')
          ? 'group3_fluff_adjectives'
          : groups.includes('group2_cliche_openers')
            ? 'group2_cliche_openers'
            : groups[0] || 'generic';

    const severity = group === 'group4_ai_patterns' || group === 'group5_marketing_fluff' ? 'critical' : 'warning';
    forbiddenFlags.push({
      id: `banned:${sentence.index}:${normalizeText(matchedTerms.join('-')).slice(0, 40)}`,
      type: 'banned_word',
      severity,
      sentenceIndex: sentence.index,
      sentenceIndexes: [sentence.index],
      snippet: buildSnippet(sentence.text),
      label: buildLabel(group, matchedTerms),
      reason: buildReason(group, matchedTerms),
      actionLabel: 'Sửa ngay',
      matchedTerms,
      suggestion: buildSuggestion(sentence.text, matchedTerms, group),
      group,
    });
  }

  return {
    flags: forbiddenFlags,
    forbiddenWords: dedupe(foundForbidden),
    clicheOpenings: dedupe(foundCliches),
  };
}
