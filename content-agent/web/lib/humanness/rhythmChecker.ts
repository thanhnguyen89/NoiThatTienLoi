import type { HumannessFlag, SentenceTargetLike } from './types';

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function buildSnippet(sentences: string[]): string {
  const joined = sentences.join(' ').replace(/\s+/g, ' ').trim();
  return joined.length > 140 ? `${joined.slice(0, 139).trimEnd()}…` : joined;
}

export function checkSentenceRhythm(sentences: SentenceTargetLike[]): HumannessFlag[] {
  const flags: HumannessFlag[] = [];

  for (let start = 0; start <= sentences.length - 3; start += 1) {
    const window = sentences.slice(start, start + 3);
    const counts = window.map((sentence) => countWords(sentence.text));
    const hasShortSentence = counts.some((count) => count < 5);
    const hasQuestion = window.some((sentence) => sentence.text.includes('?'));
    if (hasShortSentence || hasQuestion) {
      continue;
    }

    const min = Math.min(...counts);
    const max = Math.max(...counts);
    if (max - min > 3) {
      continue;
    }

    const anchor = window[1];
    const average = Math.round(counts.reduce((sum, value) => sum + value, 0) / counts.length);
    flags.push({
      id: `rhythm:${window[0].index}-${window[2].index}`,
      type: 'rhythm',
      severity: 'info',
      sentenceIndex: anchor.index,
      sentenceIndexes: window.map((sentence) => sentence.index),
      snippet: buildSnippet(window.map((sentence) => sentence.text)),
      label: 'Nhịp câu quá đều',
      reason: `${window.length} câu liên tiếp cùng nhịp khoảng ${average} từ, dễ tạo cảm giác máy viết.`,
      actionLabel: 'Phá nhịp',
      matchedTerms: [],
      suggestion: '',
    });
  }

  return flags;
}
