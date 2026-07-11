import { stripHtml, stripVietnamese } from '@/lib/tinh-gon/text';
import { scanBannedWords } from './bannedWordScanner';
import { checkPronouns } from './pronounChecker';
import { checkSentenceRhythm } from './rhythmChecker';
import { checkSpecificity } from './specificityChecker';
import type {
  AICheckApiResult,
  AICheckResult,
  AIConfigData,
  HumannessDecision,
  HumannessFlag,
  HumannessRiskLevel,
  SentenceInsight,
  SentenceTargetLike,
} from './types';

const PASSIVE_REGEX = /\b(được|bị)\s+\w+/giu;
const SPECIFIC_DATA_REGEX = /\d+([.,]\d+)?\s*(mm|cm|m|kg|%|ngày|tuần|tháng|triệu|nghìn|đ|m2|m²|giờ)/giu;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeText(value: string): string {
  return stripVietnamese(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function severityRank(severity: HumannessFlag['severity']): number {
  if (severity === 'critical') return 0;
  if (severity === 'warning') return 1;
  return 2;
}

function createDecision(score: number): HumannessDecision {
  if (score >= 76) return 'PASS';
  if (score >= 60) return 'REVIEW';
  return 'FAIL';
}

function createRiskLevel(score: number): HumannessRiskLevel {
  if (score >= 76) return 'LOW';
  if (score >= 60) return 'MEDIUM';
  return 'HIGH';
}

function buildAiVoiceFlags(sentenceInsights: SentenceInsight[], existingFlags: HumannessFlag[]): HumannessFlag[] {
  const covered = new Set(
    existingFlags
      .map((flag) => flag.sentenceIndex)
      .filter((value): value is number => value !== null),
  );

  return sentenceInsights
    .filter((insight) => insight.risk !== 'SAFE' && !covered.has(insight.index))
    .map((insight) => ({
      id: `ai-voice:${insight.index}`,
      type: 'ai_voice',
      severity: insight.risk === 'DANGER' ? 'critical' : 'warning',
      sentenceIndex: insight.index,
      sentenceIndexes: [insight.index],
      snippet: '',
      label: 'Giọng câu dễ lộ AI',
      reason: insight.reasons[0] || 'Câu có nhịp và cách diễn đạt quá trơn, dễ bị đánh dấu là AI.',
      actionLabel: 'Sửa ngay',
      matchedTerms: [],
      suggestion: insight.suggestion,
    }));
}

function attachSentenceInsights(flags: HumannessFlag[], sentenceInsights: SentenceInsight[]): HumannessFlag[] {
  const insightMap = new Map(sentenceInsights.map((insight) => [insight.index, insight]));

  return flags.map((flag) => {
    if (flag.sentenceIndex === null) {
      return flag;
    }

    const insight = insightMap.get(flag.sentenceIndex);
    if (!insight) {
      return flag;
    }

    return {
      ...flag,
      severity: insight.risk === 'DANGER'
        ? 'critical'
        : insight.risk === 'WARNING' && flag.severity === 'info'
          ? 'warning'
          : flag.severity,
      suggestion: insight.suggestion || flag.suggestion,
    };
  });
}

function summarize(result: {
  humannessScore: number;
  criticalFlags: number;
  warningFlags: number;
  toneConsistencyScore: number;
  bannedWordCount: number;
}): string {
  const { humannessScore, criticalFlags, warningFlags, toneConsistencyScore, bannedWordCount } = result;

  if (humannessScore >= 76) {
    return `Bài viết khá tự nhiên (${humannessScore}/100). Còn ${warningFlags} cảnh báo nhẹ${bannedWordCount ? ` và ${bannedWordCount} từ cần rà lại` : ''}.`;
  }

  if (humannessScore >= 60) {
    return `Bài viết cần rà soát thêm (${humannessScore}/100). Còn ${criticalFlags} lỗi nặng, ${warningFlags} cảnh báo và tone ${toneConsistencyScore}/100.`;
  }

  return `Bài viết đang dưới ngưỡng publish (${humannessScore}/100). Còn ${criticalFlags} lỗi nặng${bannedWordCount ? `, ${bannedWordCount} từ cấm` : ''} và tone chưa ổn định.`;
}

export function extractSentenceTargets(html: string): SentenceTargetLike[] {
  const text = stripHtml(html);
  if (!text) return [];

  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 20)
    .map((textValue, index) => ({ index, text: textValue }));
}

export function buildAICheckResult(input: {
  html: string;
  config: AIConfigData;
  sentences?: SentenceTargetLike[];
  aiResult?: Partial<AICheckApiResult> | null;
}): AICheckResult {
  const sentences = input.sentences && input.sentences.length > 0
    ? input.sentences
    : extractSentenceTargets(input.html);
  const sentenceInsights = input.aiResult?.sentenceInsights ?? [];

  const banned = scanBannedWords(sentences, input.config);
  const rhythmFlags = checkSentenceRhythm(sentences);
  const specificityFlags = checkSpecificity(sentences);
  const pronounFlags = checkPronouns(sentences);
  const passiveVoice = (stripHtml(input.html).match(PASSIVE_REGEX) || []).length;
  const specificDataHits = (stripHtml(input.html).match(SPECIFIC_DATA_REGEX) || []).length;
  const noSpecificData = specificDataHits === 0;
  const toneConsistencyScore = clamp(Math.round(input.aiResult?.toneConsistencyScore ?? 82), 0, 100);

  const mergedFlags = attachSentenceInsights(
    [
      ...banned.flags,
      ...rhythmFlags,
      ...specificityFlags,
      ...pronounFlags,
    ],
    sentenceInsights,
  );
  const allFlags = [
    ...mergedFlags,
    ...buildAiVoiceFlags(sentenceInsights, mergedFlags),
  ]
    .sort((left, right) => {
      const severityDiff = severityRank(left.severity) - severityRank(right.severity);
      if (severityDiff !== 0) return severityDiff;
      return (left.sentenceIndex ?? Number.MAX_SAFE_INTEGER) - (right.sentenceIndex ?? Number.MAX_SAFE_INTEGER);
    })
    .map((flag) => {
      if (flag.snippet) return flag;
      const sentence = flag.sentenceIndex === null ? null : sentences.find((item) => item.index === flag.sentenceIndex);
      return {
        ...flag,
        snippet: sentence?.text.replace(/\s+/g, ' ').trim() ?? '',
      };
    });

  const criticalBannedFlags = allFlags.filter((flag) => flag.type === 'banned_word' && flag.severity === 'critical').length;
  const bannedWordScore = clamp(100 - banned.forbiddenWords.length * 18 - criticalBannedFlags * 10, 0, 100);
  const rhythmScore = clamp(100 - rhythmFlags.length * 14, 0, 100);
  const specificityScore = clamp(100 - specificityFlags.length * 12 - (noSpecificData ? 12 : 0), 0, 100);
  const pronounScore = clamp(100 - pronounFlags.length * 22, 0, 100);
  const toneScore = toneConsistencyScore;
  const criticalFlags = allFlags.filter((flag) => flag.severity === 'critical').length;
  const warningFlags = allFlags.filter((flag) => flag.severity === 'warning').length;
  const infoFlags = allFlags.filter((flag) => flag.severity === 'info').length;
  const humannessScore = clamp(
    Math.round(
      bannedWordScore * 0.35
      + rhythmScore * 0.15
      + specificityScore * 0.15
      + pronounScore * 0.15
      + toneScore * 0.2
      - criticalFlags * 4
      - banned.forbiddenWords.length * 2,
    ),
    0,
    100,
  );

  const decision = createDecision(humannessScore);
  const riskLevel = createRiskLevel(humannessScore);
  const flaggedPhrases = unique([
    ...banned.forbiddenWords,
    ...allFlags.flatMap((flag) => flag.matchedTerms),
  ]).slice(0, 20);

  return {
    version: 2,
    humannessScore,
    aiScore: 100 - humannessScore,
    decision,
    riskLevel,
    breakdown: {
      humannessScore,
      bannedWordScore,
      rhythmScore,
      specificityScore,
      pronounScore,
      toneScore,
      toneConsistencyScore,
    },
    counts: {
      critical: criticalFlags,
      warning: warningFlags,
      info: infoFlags,
      bannedWordCount: banned.forbiddenWords.length,
      criticalFlags,
      warningFlags,
    },
    flags: allFlags,
    issues: {
      forbiddenWords: banned.forbiddenWords,
      clicheOpenings: banned.clicheOpenings,
      uniformSentences: rhythmFlags.length > 0,
      noSpecificData,
      passiveVoice,
      pronounIssues: unique(pronounFlags.flatMap((flag) => flag.matchedTerms)),
      toneConsistencyScore,
    },
    sentenceInsights,
    flaggedPhrases,
    summary: summarize({
      humannessScore,
      criticalFlags,
      warningFlags,
      toneConsistencyScore,
      bannedWordCount: banned.forbiddenWords.length,
    }),
  };
}
