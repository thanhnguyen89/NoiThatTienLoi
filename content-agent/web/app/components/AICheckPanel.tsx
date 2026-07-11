'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SentenceTarget } from '@/lib/dom-sentences';
import { buildAICheckResult } from '@/lib/humanness/engine';
import { loadAiConfig } from '@/lib/humanness/client-config';
import type { AICheckApiResult, AICheckResult, HumannessFlag } from '@/lib/humanness/types';
import ModelPicker from './ModelPicker';

type FilterKey = 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO';

interface PersistedAICheckState {
  version: 2;
  htmlSignature: string;
  result: AICheckResult | null;
  filter: FilterKey;
  appliedSet: string[];
  appliedTextMap: Record<string, string>;
  appliedLocatorMap?: Record<string, AppliedFixLocator>;
  dismissedFlagIds: string[];
  checkModel: string;
}

export interface AppliedFixLocator {
  sentenceIndex?: number | null;
  original?: string;
  replacement: string;
}

function buildHtmlSignature(html: string): string {
  const normalized = html.replace(/\s+/g, ' ').trim();
  return `${normalized.length}:${normalized.slice(0, 200)}`;
}

function isAICheckResult(value: unknown): value is AICheckResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as Partial<AICheckResult>;
  return result.version === 2 && Array.isArray(result.flags) && Array.isArray(result.sentenceInsights);
}

function scoreTone(score: number) {
  if (score >= 76) {
    return {
      text: 'text-green-700',
      border: 'border-green-200',
      bg: 'bg-green-50',
      dot: 'bg-green-500',
      label: 'Đạt publish',
    };
  }

  if (score >= 60) {
    return {
      text: 'text-amber-700',
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      dot: 'bg-amber-500',
      label: 'Cần review',
    };
  }

  return {
    text: 'text-red-700',
    border: 'border-red-200',
    bg: 'bg-red-50',
    dot: 'bg-red-500',
    label: 'Chưa đạt',
  };
}

function severityTone(severity: HumannessFlag['severity']) {
  if (severity === 'critical') {
    return {
      card: 'border-red-200 bg-red-50',
      badge: 'bg-red-100 text-red-700',
      icon: '🔴',
    };
  }

  if (severity === 'warning') {
    return {
      card: 'border-amber-200 bg-amber-50',
      badge: 'bg-amber-100 text-amber-700',
      icon: '🟡',
    };
  }

  return {
    card: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    icon: '🔵',
  };
}

function ScoreRing({ score }: { score: number }) {
  const tone = scoreTone(score);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={score >= 76 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626'}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${tone.text}`}>{score}</span>
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>
      <p className={`mt-1 text-sm font-semibold ${tone.text}`}>{tone.label}</p>
      <p className="text-xs text-gray-400">Humanness Score</p>
    </div>
  );
}

function BreakdownBar({ label, value, note }: { label: string; value: number; note: string }) {
  const tone = scoreTone(value);
  return (
    <div className={`rounded-xl border p-3 ${tone.bg} ${tone.border}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <span className={`text-sm font-bold ${tone.text}`}>{value}/100</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80">
        <div
          className={`h-full rounded-full ${value >= 76 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] leading-5 text-gray-500">{note}</p>
    </div>
  );
}

export default function AICheckPanel({
  html,
  onApplyFix,
  onRevealApplied,
  storageKey,
  getSentenceTargets,
  onResultChange,
  onAiRewrite,
  scanSignal,
  onScanConsumed,
}: {
  html: string;
  onApplyFix?: (original: string, replacement: string, sentenceIndex?: number, target?: SentenceTarget) => boolean | void | Promise<boolean | void>;
  onRevealApplied?: (locator: AppliedFixLocator) => void;
  storageKey?: string;
  getSentenceTargets?: () => SentenceTarget[];
  onResultChange?: (result: AICheckResult | null) => void;
  onAiRewrite?: (snippet: string, flagLabel: string, target?: SentenceTarget) => void;
  scanSignal?: number;
  onScanConsumed?: (signal: number) => void;
}) {
  const [result, setResult] = useState<AICheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [editingFlagId, setEditingFlagId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [appliedSet, setAppliedSet] = useState<Set<string>>(new Set());
  const [appliedTextMap, setAppliedTextMap] = useState<Record<string, string>>({});
  const [appliedLocatorMap, setAppliedLocatorMap] = useState<Record<string, AppliedFixLocator>>({});
  const [dismissedFlagIds, setDismissedFlagIds] = useState<Set<string>>(new Set());
  const [checkModel, setCheckModel] = useState('');
  const [analysisSignature, setAnalysisSignature] = useState('');
  const [showAll, setShowAll] = useState(false);
  const previousStorageKeyRef = useRef<string | undefined>();
  const sentenceTargetsRef = useRef<SentenceTarget[]>([]);
  const getSentenceTargetsRef = useRef(getSentenceTargets);
  const autoRescanRef = useRef(false);
  const prevScanSignalRef = useRef(0);
  const hydratedSignatureRef = useRef('');
  const notifiedResultKeyRef = useRef('');

  const currentSignature = useMemo(() => buildHtmlSignature(html), [html]);
  const isStale = Boolean(result && analysisSignature && analysisSignature !== currentSignature);
  const resultNotifyKey = useMemo(() => {
    if (!result || analysisSignature !== currentSignature) {
      return '';
    }

    return [
      analysisSignature,
      result.humannessScore,
      result.breakdown.toneConsistencyScore,
      result.counts.bannedWordCount,
      result.counts.criticalFlags,
      result.flags.length,
    ].join(':');
  }, [analysisSignature, currentSignature, result]);

  useEffect(() => {
    getSentenceTargetsRef.current = getSentenceTargets;
  }, [getSentenceTargets]);

  useEffect(() => {
    const storageKeyChanged = previousStorageKeyRef.current !== storageKey;
    if (storageKeyChanged) {
      setResult(null);
      setError('');
      setFilter('ALL');
      setEditingFlagId(null);
      setEditedText('');
      setAppliedSet(new Set());
      setAppliedTextMap({});
      setAppliedLocatorMap({});
      setDismissedFlagIds(new Set());
      setAnalysisSignature('');
      setShowAll(false);
      hydratedSignatureRef.current = '';
      notifiedResultKeyRef.current = '';
      previousStorageKeyRef.current = storageKey;
    }

    if (!storageKey || typeof window === 'undefined') {
      return;
    }

    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) {
        return;
      }

      const persisted = JSON.parse(raw) as Partial<PersistedAICheckState>;
      if (typeof persisted.checkModel === 'string' && persisted.checkModel.trim()) {
        setCheckModel(persisted.checkModel);
      }

      if (
        persisted.version === 2
        && isAICheckResult(persisted.result)
        && persisted.htmlSignature === currentSignature
      ) {
        if (hydratedSignatureRef.current === persisted.htmlSignature && analysisSignature === persisted.htmlSignature) {
          return;
        }
        sentenceTargetsRef.current = getSentenceTargetsRef.current?.() || [];
        setResult(persisted.result);
        setFilter(persisted.filter || 'ALL');
        setAppliedSet(new Set(persisted.appliedSet || []));
        setAppliedTextMap(persisted.appliedTextMap || {});
        setAppliedLocatorMap(persisted.appliedLocatorMap || {});
        setDismissedFlagIds(new Set(persisted.dismissedFlagIds || []));
        setAnalysisSignature(persisted.htmlSignature);
        setShowAll(false);
        hydratedSignatureRef.current = persisted.htmlSignature;
      }
    } catch {
      // ignore invalid persisted payload
    }
  }, [analysisSignature, currentSignature, storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') {
      return;
    }

    if (!result && !checkModel) {
      return;
    }

    const payload: PersistedAICheckState = {
      version: 2,
      htmlSignature: analysisSignature || currentSignature,
      result,
      filter,
      appliedSet: Array.from(appliedSet),
      appliedTextMap,
      appliedLocatorMap,
      dismissedFlagIds: Array.from(dismissedFlagIds),
      checkModel,
    };

    sessionStorage.setItem(storageKey, JSON.stringify(payload));
  }, [analysisSignature, appliedLocatorMap, appliedSet, appliedTextMap, checkModel, currentSignature, dismissedFlagIds, filter, result, storageKey]);

  useEffect(() => {
    if (!onResultChange) {
      return;
    }

    if (!result || analysisSignature !== currentSignature) {
      notifiedResultKeyRef.current = '';
      onResultChange(null);
      return;
    }

    if (resultNotifyKey && notifiedResultKeyRef.current === resultNotifyKey) {
      return;
    }

    notifiedResultKeyRef.current = resultNotifyKey;
    onResultChange(result);
  }, [analysisSignature, currentSignature, onResultChange, result, resultNotifyKey]);

  useEffect(() => {
    if (!autoRescanRef.current || !html.trim()) {
      return;
    }

    if (!result || analysisSignature === currentSignature) {
      return;
    }

    autoRescanRef.current = false;
    void handleCheck({ preserveUiState: true, silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisSignature, currentSignature, html, result]);

  useEffect(() => {
    const nextSignal = scanSignal ?? 0;
    if (nextSignal <= prevScanSignalRef.current) {
      return;
    }

    prevScanSignalRef.current = nextSignal;

    if (!html.trim()) {
      onScanConsumed?.(nextSignal);
      return;
    }

    void handleCheck({ preserveUiState: true }).finally(() => {
      onScanConsumed?.(nextSignal);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, onScanConsumed, scanSignal]);

  async function handleCheck(options?: { preserveUiState?: boolean; silent?: boolean }) {
    if (!html.trim()) {
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError('');
    setEditingFlagId(null);
    setEditedText('');
    setShowAll(false);
    if (!options?.preserveUiState) {
      setAppliedSet(new Set());
      setAppliedLocatorMap({});
      setDismissedFlagIds(new Set());
    }

    try {
      const sentenceTargets = getSentenceTargetsRef.current?.() || [];
      sentenceTargetsRef.current = sentenceTargets;

      const normalizedSentences = sentenceTargets.length > 0
        ? sentenceTargets.map((target) => ({ index: target.index, text: target.text }))
        : undefined;

      const config = await loadAiConfig();
      const baseResult = buildAICheckResult({
        html,
        config,
        sentences: normalizedSentences,
      });

      let aiResult: AICheckApiResult | null = null;

      try {
        const response = await fetch('/api/pipeline/ai-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html,
            model: checkModel,
            sentences: normalizedSentences,
            localFlags: baseResult.flags.map((flag) => ({
              sentenceIndex: flag.sentenceIndex,
              label: flag.label,
              reason: flag.reason,
              severity: flag.severity,
              matchedTerms: flag.matchedTerms,
            })).filter((flag) => flag.sentenceIndex !== null),
          }),
        });

        const json = await response.json() as { success?: boolean; error?: string; data?: AICheckApiResult };
        if (response.ok && json.success && json.data) {
          aiResult = json.data;
        } else if (!response.ok) {
          throw new Error(json.error || 'Không thể phân tích AI.');
        }
      } catch (aiError) {
        console.warn('[AICheckPanel] Falling back to local result:', aiError);
      }

      const nextResult = buildAICheckResult({
        html,
        config,
        sentences: normalizedSentences,
        aiResult,
      });

      setResult(nextResult);
      setAnalysisSignature(currentSignature);
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'Không thể phân tích nội dung.');
      setResult(null);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  function startEdit(flag: HumannessFlag) {
    setEditingFlagId(flag.id);
    setEditedText(flag.suggestion || flag.snippet);
  }

  function cancelEdit() {
    setEditingFlagId(null);
    setEditedText('');
  }

  function applySuggestion(flag: HumannessFlag, replacement: string) {
    if (flag.sentenceIndex === null || !replacement.trim()) {
      return;
    }

    const target = sentenceTargetsRef.current[flag.sentenceIndex];
    const original = target?.text || flag.snippet;
    const appliedText = replacement.trim();
    const finalizeApply = (applied?: boolean | void) => {
      if (applied === false) {
        return;
      }

      setAppliedSet((prev) => new Set(prev).add(flag.id));
      setAppliedTextMap((prev) => ({ ...prev, [flag.id]: appliedText }));
      setAppliedLocatorMap((prev) => ({
        ...prev,
        [flag.id]: {
          sentenceIndex: flag.sentenceIndex,
          original,
          replacement: appliedText,
        },
      }));
      autoRescanRef.current = true;
      setEditingFlagId(null);
    };

    const applied = onApplyFix?.(original, replacement.trim(), flag.sentenceIndex, target);
    if (!onApplyFix) {
      return;
    }

    if (applied instanceof Promise) {
      void applied.then((result) => {
        finalizeApply(result);
      }).catch(() => null);
      return;
    }

    finalizeApply(applied);
  }

  function dismissFlag(flagId: string) {
    setDismissedFlagIds((prev) => {
      const next = new Set(prev);
      if (next.has(flagId)) {
        next.delete(flagId);
      } else {
        next.add(flagId);
      }
      return next;
    });
  }

  const visibleFlags = useMemo(() => {
    if (!result) {
      return [];
    }

    const unresolved = result.flags.filter((flag) => !dismissedFlagIds.has(flag.id));
    const filtered = unresolved.filter((flag) => {
      if (filter === 'ALL') return true;
      if (filter === 'CRITICAL') return flag.severity === 'critical';
      if (filter === 'WARNING') return flag.severity === 'warning';
      return flag.severity === 'info';
    });

    return showAll ? filtered : filtered.slice(0, 10);
  }, [dismissedFlagIds, filter, result, showAll]);

  if (!result && !loading) {
    return (
      <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
        <div className="mb-4 text-5xl">🤖</div>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Kiểm tra AI & humanness</h3>
        <p className="mb-2 max-w-sm text-xs leading-5 text-gray-500">
          Scanner local sẽ dò từ cấm, nhịp câu, specificity, xưng hô; sau đó AI chấm tone consistency và gợi ý câu thay thế.
        </p>
        <p className="mb-4 max-w-sm text-xs leading-5 text-gray-400">
          Danh sách từ cấm được lấy trực tiếp từ trang quản lý AI Check qua API, không dùng list hardcode trong panel.
        </p>

        <div className="mb-4 w-full px-1">
          <p className="mb-2 text-left text-xs font-medium text-gray-500">
            Chọn AI chấm điểm
            <span className="ml-1.5 font-normal text-gray-400">(nên khác model đã viết bài)</span>
          </p>
          <ModelPicker value={checkModel} onChange={setCheckModel} size="sm" label="" />
        </div>

        {error && <p className="mb-3 text-xs text-red-600">⚠️ {error}</p>}
        <button
          type="button"
          onClick={() => void handleCheck()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          🔍 Phân tích bài viết
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-14">
        <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-sm font-medium text-gray-700">Đang phân tích local signals và tone consistency...</p>
        <p className="mt-1 text-xs text-gray-400">
          Model: <span className="font-medium text-gray-500">{checkModel || 'Tự chọn'}</span>
        </p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const tone = scoreTone(result.humannessScore);
  const hiddenCount = result.flags.filter((flag) => !dismissedFlagIds.has(flag.id)).length - visibleFlags.length;

  return (
    <div className="space-y-4">
      {isStale && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Nội dung editor đã thay đổi sau lần phân tích gần nhất. Hãy quét lại để cập nhật score mới.
        </div>
      )}

      <div className={`rounded-2xl border p-4 ${tone.bg} ${tone.border}`}>
        <div className="flex items-start gap-4">
          <ScoreRing score={result.humannessScore} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800">Kiểm Tra AI & Chất Lượng</p>
            <p className="mt-1 text-xs leading-5 text-gray-600">{result.summary}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white/70 px-3 py-2">
                <div className="font-semibold text-gray-700">Tone nhất quán</div>
                <div className="mt-1 text-gray-500">{result.breakdown.toneConsistencyScore}/100</div>
              </div>
              <div className="rounded-lg bg-white/70 px-3 py-2">
                <div className="font-semibold text-gray-700">Từ cấm còn lại</div>
                <div className="mt-1 text-gray-500">{result.counts.bannedWordCount} mục</div>
              </div>
              <div className="rounded-lg bg-white/70 px-3 py-2">
                <div className="font-semibold text-gray-700">Flag nặng</div>
                <div className="mt-1 text-gray-500">{result.counts.criticalFlags} lỗi</div>
              </div>
              <div className="rounded-lg bg-white/70 px-3 py-2">
                <div className="font-semibold text-gray-700">Cảnh báo nhẹ</div>
                <div className="mt-1 text-gray-500">{result.counts.warningFlags + result.counts.info} mục</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void handleCheck({ preserveUiState: true })}
            className="flex-1 rounded-lg border border-gray-300 bg-white/80 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-white"
          >
            🔄 Scan lại
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BreakdownBar
          label="Humanness tổng"
          value={result.breakdown.humannessScore}
          note="Điểm publish an toàn khi từ 76 trở lên."
        />
        <BreakdownBar
          label="Tone consistency"
          value={result.breakdown.toneConsistencyScore}
          note="Giọng bài cần đồng đều giữa mở bài, thân bài và CTA."
        />
        <BreakdownBar
          label="Từ cấm / transition"
          value={result.breakdown.bannedWordScore}
          note="Mỗi từ cấm hoặc pattern AI sẽ kéo score xuống khá mạnh."
        />
        <BreakdownBar
          label="Specificity / xưng hô"
          value={Math.round((result.breakdown.specificityScore + result.breakdown.pronounScore) / 2)}
          note="Ưu tiên thêm dữ kiện và sửa xưng hô sai kênh trước khi publish."
        />
      </div>

      {(result.issues.forbiddenWords.length > 0
        || result.issues.pronounIssues.length > 0
        || result.issues.noSpecificData
        || result.issues.uniformSentences) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h4 className="text-xs font-semibold text-gray-700">Tín hiệu đã phát hiện</h4>
          <div className="mt-3 space-y-2 text-xs">
            {result.issues.forbiddenWords.length > 0 && (
              <div className="rounded-lg bg-red-50 p-3 text-red-700">
                <strong>Từ cấm:</strong>{' '}
                {result.issues.forbiddenWords.map((word) => (
                  <span
                    key={word}
                    className="mr-1 inline-block rounded bg-red-100 px-1.5 py-0.5 font-mono text-red-800"
                  >
                    {word}
                  </span>
                ))}
              </div>
            )}
            {result.issues.pronounIssues.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                <strong>Xưng hô sai kênh:</strong>{' '}
                {result.issues.pronounIssues.join(', ')}
              </div>
            )}
            {result.issues.uniformSentences && (
              <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
                <strong>Nhịp câu đều:</strong> Nên pha câu ngắn và câu trung bình để giảm cảm giác máy viết.
              </div>
            )}
            {result.issues.noSpecificData && (
              <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
                <strong>Thiếu specificity:</strong> Nội dung đang ít số liệu, thông số hoặc mốc thời gian cụ thể.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Vấn đề cần xử lý</p>
            <p className="mt-1 text-xs text-gray-500">
              Hiển thị tối đa 10 flag đầu tiên theo mức độ nghiêm trọng.
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>{result.flags.length} flag tổng</div>
            <div>{dismissedFlagIds.size} đã bỏ qua</div>
          </div>
        </div>

        <div className="mt-3 flex gap-1 rounded-lg bg-gray-100 p-1">
          {([
            { key: 'ALL', label: `Tất cả (${result.flags.length - dismissedFlagIds.size})` },
            { key: 'CRITICAL', label: `🔴 ${result.counts.critical}` },
            { key: 'WARNING', label: `🟡 ${result.counts.warning}` },
            { key: 'INFO', label: `🔵 ${result.counts.info}` },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`flex-1 rounded-md py-1.5 text-xs transition-colors ${
                filter === tab.key ? 'bg-white font-medium text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {visibleFlags.map((flag) => {
          const toneConfig = severityTone(flag.severity);
          const isEditing = editingFlagId === flag.id;
          const isApplied = appliedSet.has(flag.id);
          const isDismissed = dismissedFlagIds.has(flag.id);
          const appliedText = appliedTextMap[flag.id] || flag.suggestion || '';
          const appliedLocator = appliedLocatorMap[flag.id];

          return (
            <div key={flag.id} className={`rounded-xl border p-4 ${toneConfig.card}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneConfig.badge}`}>
                      {toneConfig.icon} {flag.label}
                    </span>
                    {flag.group && (
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-gray-500">
                        {flag.group}
                      </span>
                    )}
                    {isApplied && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                        Đã áp dụng
                      </span>
                    )}
                  </div>
                  <p className={`mt-2 text-xs leading-5 text-gray-800 ${isApplied ? 'opacity-50 line-through' : ''}`}>
                    {flag.snippet}
                  </p>
                  {isApplied && Boolean(appliedText) && (
                    <button
                      type="button"
                      onClick={() => onRevealApplied?.(
                        appliedLocator || {
                          sentenceIndex: flag.sentenceIndex,
                          original: flag.snippet,
                          replacement: appliedText,
                        },
                      )}
                      className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100"
                    >
                      Xem vị trí trong editor
                    </button>
                  )}
                  <p className="mt-2 text-xs leading-5 text-gray-500">{flag.reason}</p>
                  {flag.matchedTerms.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {flag.matchedTerms.map((term) => (
                        <span key={`${flag.id}:${term}`} className="rounded bg-white/80 px-1.5 py-0.5 text-[11px] font-mono text-gray-600">
                          {term}
                        </span>
                      ))}
                    </div>
                  )}
                  {!isApplied && flag.sentenceIndex !== null && onAiRewrite && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = sentenceTargetsRef.current[flag.sentenceIndex!];
                        onAiRewrite(target?.text || flag.snippet, flag.label, target);
                      }}
                      className="mt-2 w-full rounded-lg border border-indigo-200 bg-indigo-50 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                    >
                      ⚡ Nhờ AI viết lại câu này
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissFlag(flag.id)}
                  className="text-xs text-gray-400 transition-colors hover:text-gray-600"
                >
                  {isDismissed ? 'Khôi phục' : 'Bỏ qua'}
                </button>
              </div>

              {!isApplied && !isEditing && (
                <div className="mt-3 rounded-lg border border-white/80 bg-white/80 p-3">
                  <p className="text-xs font-semibold text-blue-700">✨ Gợi ý sửa</p>
                  <p className="mt-1 text-xs leading-5 text-gray-700">
                    {flag.suggestion || 'Chưa có câu thay thế tự động. Bạn có thể chỉnh tay rồi áp dụng trực tiếp.'}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {flag.suggestion && (
                      <button
                        type="button"
                        disabled={!onApplyFix}
                        onClick={() => applySuggestion(flag, flag.suggestion)}
                        className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        ✅ Áp dụng
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(flag)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      ✏️ Chỉnh sửa
                    </button>
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="mt-3 space-y-2 rounded-lg border border-blue-100 bg-white/90 p-3">
                  <p className="text-xs font-semibold text-blue-700">✏️ Sửa trước khi áp dụng</p>
                  <textarea
                    value={editedText}
                    onChange={(event) => setEditedText(event.target.value)}
                    rows={4}
                    autoFocus
                    className="w-full resize-none rounded-lg border border-blue-300 px-2.5 py-2 text-xs leading-5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {!onApplyFix && (
                    <p className="text-xs text-amber-600">⚠️ Cần mở từ editor bài viết để áp dụng trực tiếp.</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => applySuggestion(flag, editedText)}
                      disabled={!editedText.trim() || !onApplyFix}
                      className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      ✅ Áp dụng vào bài
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      Huỷ
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="w-full rounded-lg border border-gray-300 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
        >
          {showAll ? 'Thu gọn danh sách' : `Xem thêm ${hiddenCount} vấn đề`}
        </button>
      )}

      {visibleFlags.length === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-6 text-center text-sm font-medium text-green-700">
          Bài viết đạt chuẩn ✅ Không còn flag nào trong nhóm đang xem.
        </div>
      )}
    </div>
  );
}
