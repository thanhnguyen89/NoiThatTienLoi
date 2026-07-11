import { DEFAULT_FORBIDDEN_WORDS, mergeForbiddenWords } from './forbidden';
import { countWords, stripHtml, stripVietnamese } from './text';
import type { TinhGonDecision, TinhGonHumannessResult } from './types';

const PASSIVE_REGEX = /\b(được|bị)\s+\w+/giu;
const SPECIFIC_DATA_REGEX = /\d+([.,]\d+)?\s*(mm|cm|m|kg|%|ngày|tuần|tháng|triệu|nghìn|đ|m2|m²|giờ)/giu;
const TRANSITION_REGEX = /\b(tuy nhiên|bên cạnh đó|nhìn chung|chính vì vậy|như vậy|tóm lại)\b/giu;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getDecision(score: number): TinhGonDecision {
  if (score >= 76) return 'PUBLISH';
  if (score >= 60) return 'REVIEW';
  return 'REWRITE';
}

function buildBreakdown(result: {
  score: number;
  issues: string[];
  forbiddenFound: string[];
  metrics: {
    sentenceCount: number;
    averageSentenceLength: number;
    passiveVoiceHits: number;
    specificDataHits: number;
    repeatedStarterHits: number;
    uniformSentencePattern: boolean;
  };
}): TinhGonHumannessResult['scoreBreakdown'] {
  const { metrics, forbiddenFound, issues, score } = result;

  const raw = [
    25 - Math.min(8, forbiddenFound.length * 2) - Math.min(6, metrics.passiveVoiceHits) - Math.min(4, metrics.repeatedStarterHits * 2),
    25 - (metrics.uniformSentencePattern ? 5 : 0) - (metrics.averageSentenceLength > 26 || metrics.averageSentenceLength < 8 ? 4 : 0) - (metrics.sentenceCount < 6 ? 2 : 0),
    25 - (metrics.specificDataHits === 0 ? 8 : metrics.specificDataHits < 3 ? 3 : 0) - (issues.some((issue) => issue.includes('Nội dung còn mỏng')) ? 3 : 0),
    25 - (metrics.uniformSentencePattern ? 3 : 0) - (metrics.repeatedStarterHits > 0 ? 3 : 0) - (issues.some((issue) => issue.includes('Nhịp câu')) ? 3 : 0),
  ].map((item) => Math.max(0, Math.min(25, Math.round(item))));

  const rawTotal = raw.reduce((sum, item) => sum + item, 0);
  let diff = score - rawTotal;
  let cursor = 0;

  while (diff !== 0 && cursor < 64) {
    const index = cursor % raw.length;
    if (diff > 0 && raw[index] < 25) {
      raw[index] += 1;
      diff -= 1;
    } else if (diff < 0 && raw[index] > 0) {
      raw[index] -= 1;
      diff += 1;
    }
    cursor += 1;
  }

  return {
    language_natural: raw[0],
    structure: raw[1],
    eeat_signals: raw[2],
    engagement: raw[3],
  };
}

export function extractSentences(html: string): string[] {
  const text = stripHtml(html);
  if (!text) return [];

  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 20);
}

/**
 * @param forbiddenList Danh sách từ cấm đã được build sẵn (từ DB + brandExtra).
 *   Nếu không truyền → tự merge DEFAULT_FORBIDDEN_WORDS (dùng khi không có DB context).
 */
export function analyzeHumanness(
  html: string,
  forbiddenList?: string[],
  options?: {
    minWords?: number;
    minSpecificDataHits?: number;
  },
): TinhGonHumannessResult {
  const text = stripHtml(html);
  const normalizedText = stripVietnamese(text).toLowerCase();
  const sentences = extractSentences(html);
  const minWords = options?.minWords ?? 500;
  const minSpecificDataHits = options?.minSpecificDataHits ?? 1;
  const sentenceWordCounts = sentences.map((sentence) => sentence.split(/\s+/).filter(Boolean).length);
  const averageSentenceLength = sentenceWordCounts.length
    ? Number((sentenceWordCounts.reduce((sum, count) => sum + count, 0) / sentenceWordCounts.length).toFixed(1))
    : 0;

  const mergedForbidden = forbiddenList ?? mergeForbiddenWords();
  const forbiddenFound = mergedForbidden.filter((word) =>
    normalizedText.includes(stripVietnamese(word).toLowerCase()),
  );

  const passiveVoiceHits = (text.match(PASSIVE_REGEX) || []).length;
  const specificDataHits = (text.match(SPECIFIC_DATA_REGEX) || []).length;
  const transitionHits = (text.match(TRANSITION_REGEX) || []).length;

  const starterMap = new Map<string, number>();
  for (const sentence of sentences) {
    const starter = stripVietnamese(sentence).toLowerCase().split(/\s+/).slice(0, 2).join(' ');
    if (!starter) continue;
    starterMap.set(starter, (starterMap.get(starter) || 0) + 1);
  }
  const repeatedStarterHits = Array.from(starterMap.values()).filter((count) => count >= 3).length;

  const uniformSentencePattern =
    sentenceWordCounts.length >= 5 &&
    sentenceWordCounts.filter((count) => count >= 14 && count <= 22).length / sentenceWordCounts.length >= 0.65;

  const issues: string[] = [];
  let score = 100;

  if (forbiddenFound.length) {
    score -= clamp(forbiddenFound.length * 6, 6, 30);
    issues.push(`Có ${forbiddenFound.length} từ/cụm từ dễ lộ giọng AI.`);
  }

  if (passiveVoiceHits >= 3) {
    score -= clamp(passiveVoiceHits * 2, 6, 14);
    issues.push('Nhiều câu bị động, nên đổi sang chủ động để tự nhiên hơn.');
  }

  if (specificDataHits < minSpecificDataHits) {
    score -= 10;
    issues.push('Thiếu số liệu hoặc chi tiết cụ thể để tăng độ tin cậy.');
  }

  if (uniformSentencePattern) {
    score -= 8;
    issues.push('Độ dài câu đang khá đều, đọc có cảm giác máy viết.');
  }

  if (averageSentenceLength > 26 || averageSentenceLength < 8) {
    score -= 6;
    issues.push('Nhịp câu chưa cân bằng, nên phối hợp câu ngắn và câu trung bình.');
  }

  if (repeatedStarterHits > 0 || transitionHits >= 4) {
    score -= 6;
    issues.push('Cách mở câu hoặc chuyển ý bị lặp lại khá nhiều.');
  }

  if (countWords(html) < minWords) {
    score -= 4;
    issues.push('Nội dung còn mỏng, cần thêm vài chi tiết thực tế.');
  }

  const finalScore = clamp(Math.round(score), 0, 100);
  const scoreBreakdown = buildBreakdown({
    score: finalScore,
    issues,
    forbiddenFound,
    metrics: {
      sentenceCount: sentences.length,
      averageSentenceLength,
      passiveVoiceHits,
      specificDataHits,
      repeatedStarterHits,
      uniformSentencePattern,
    },
  });

  return {
    score: finalScore,
    decision: getDecision(finalScore),
    issues,
    forbiddenFound: forbiddenFound.length ? forbiddenFound : [...DEFAULT_FORBIDDEN_WORDS].slice(0, 0),
    metrics: {
      sentenceCount: sentences.length,
      averageSentenceLength,
      passiveVoiceHits,
      specificDataHits,
      repeatedStarterHits,
      uniformSentencePattern,
    },
    scoreBreakdown,
  };
}
