import { escapeRegExp, stripVietnamese } from '@/lib/tinh-gon/text';
import type { HumannessFlag, SentenceTargetLike } from './types';

const DISALLOWED_PRONOUNS = ['mình', 'em', 'tôi'];

function normalizeText(value: string): string {
  return stripVietnamese(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildSnippet(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > 120 ? `${compact.slice(0, 119).trimEnd()}…` : compact;
}

export function checkPronouns(sentences: SentenceTargetLike[]): HumannessFlag[] {
  const flags: HumannessFlag[] = [];

  for (const sentence of sentences) {
    const normalized = normalizeText(sentence.text);
    const matchedTerms = DISALLOWED_PRONOUNS.filter((term) => {
      const matcher = new RegExp(`(^|\\W)${escapeRegExp(normalizeText(term))}(?=$|\\W)`, 'i');
      return matcher.test(normalized);
    });

    if (matchedTerms.length === 0) {
      continue;
    }

    flags.push({
      id: `pronoun:${sentence.index}:${normalizeText(matchedTerms.join('-')).slice(0, 40)}`,
      type: 'pronoun',
      severity: 'warning',
      sentenceIndex: sentence.index,
      sentenceIndexes: [sentence.index],
      snippet: buildSnippet(sentence.text),
      label: 'Sai xưng hô kênh blog',
      reason: `Phát hiện cách xưng hô ${matchedTerms.join(', ')}. Nên đổi sang "Nội Thất Minh Quân", "chúng tôi" hoặc "bạn".`,
      actionLabel: 'Đổi xưng hô',
      matchedTerms,
      suggestion: '',
    });
  }

  return flags;
}
