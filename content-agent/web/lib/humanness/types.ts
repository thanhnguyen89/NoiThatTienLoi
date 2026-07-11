export interface AIConfigData {
  FORBIDDEN_WORDS: string[];
  CLICHE_OPENINGS: string[];
}

export type HumannessDecision = 'PASS' | 'REVIEW' | 'FAIL';
export type HumannessRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type HumannessSeverity = 'critical' | 'warning' | 'info';
export type HumannessFlagType = 'banned_word' | 'rhythm' | 'specificity' | 'pronoun' | 'ai_voice';
export type BannedWordGroup =
  | 'group1_ai_transitions'
  | 'group2_cliche_openers'
  | 'group3_fluff_adjectives'
  | 'group4_ai_patterns'
  | 'group5_marketing_fluff'
  | 'generic';

export interface SentenceTargetLike {
  index: number;
  text: string;
}

export interface SentenceInsight {
  index: number;
  risk: 'SAFE' | 'WARNING' | 'DANGER';
  reasons: string[];
  suggestion: string;
}

export interface HumannessFlag {
  id: string;
  type: HumannessFlagType;
  severity: HumannessSeverity;
  sentenceIndex: number | null;
  sentenceIndexes: number[];
  snippet: string;
  label: string;
  reason: string;
  actionLabel: string;
  matchedTerms: string[];
  suggestion: string;
  group?: BannedWordGroup;
}

export interface HumannessIssues {
  forbiddenWords: string[];
  clicheOpenings: string[];
  uniformSentences: boolean;
  noSpecificData: boolean;
  passiveVoice: number;
  pronounIssues: string[];
  toneConsistencyScore: number;
}

export interface HumannessBreakdown {
  humannessScore: number;
  bannedWordScore: number;
  rhythmScore: number;
  specificityScore: number;
  pronounScore: number;
  toneScore: number;
  toneConsistencyScore: number;
}

export interface HumannessCounts {
  critical: number;
  warning: number;
  info: number;
  bannedWordCount: number;
  criticalFlags: number;
  warningFlags: number;
}

export interface AICheckResult {
  version: 2;
  humannessScore: number;
  aiScore: number;
  decision: HumannessDecision;
  riskLevel: HumannessRiskLevel;
  breakdown: HumannessBreakdown;
  counts: HumannessCounts;
  flags: HumannessFlag[];
  issues: HumannessIssues;
  sentenceInsights: SentenceInsight[];
  flaggedPhrases: string[];
  summary: string;
}

export interface AICheckApiResult {
  toneConsistencyScore: number;
  toneSummary: string;
  sentenceInsights: SentenceInsight[];
}
