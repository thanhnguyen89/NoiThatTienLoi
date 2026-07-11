'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getBulkFeature, type BulkFeatureId } from '@/lib/viet-hang-loat/features';
import type { BulkJobResponse, BulkQueueArticle, BulkSseEvent } from '@/lib/viet-hang-loat/types';

type ItemState = BulkQueueArticle & {
  progress: number;
  currentStep?: string;
  currentDetail?: string;
  runtimeStatus?: 'pending' | 'running' | 'done' | 'error';
  error?: string;
};

function getMetaError(meta: unknown): string {
  const record = (meta ?? {}) as Record<string, unknown>;
  return typeof record.bulkError === 'string' ? record.bulkError : '';
}

function normalizeItem(article: BulkQueueArticle): ItemState {
  const error = getMetaError(article.meta);
  const done = article.status === 'WRITTEN' || article.status === 'PUBLISHED';
  return {
    ...article,
    progress: done ? 100 : 0,
    runtimeStatus: done ? 'done' : error ? 'error' : 'pending',
    error,
  };
}

function statusBadge(item: ItemState) {
  if (item.runtimeStatus === 'running') return { label: item.currentStep || 'Đang chạy', className: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (item.runtimeStatus === 'done' || item.status === 'WRITTEN') return { label: `Xong · ${item.wordCount.toLocaleString('vi-VN')} từ`, className: 'bg-green-50 text-green-700 border-green-200' };
  if (item.runtimeStatus === 'error' || item.error) return { label: 'Lỗi', className: 'bg-red-50 text-red-700 border-red-200' };
  return { label: 'Chờ', className: 'bg-gray-50 text-gray-600 border-gray-200' };
}

export default function BulkQueuePage({ featureId }: { featureId: BulkFeatureId }) {
  const router = useRouter();
  const feature = getBulkFeature(featureId);
  const [job, setJob] = useState<BulkJobResponse | null>(null);
  const [items, setItems] = useState<ItemState[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const doneCount = useMemo(
    () => items.filter((item) => item.runtimeStatus === 'done' || item.status === 'WRITTEN' || item.status === 'PUBLISHED').length,
    [items],
  );
  const errorCount = useMemo(() => items.filter((item) => item.runtimeStatus === 'error' || item.error).length, [items]);
  const progress = items.length ? Math.round(((doneCount + errorCount) / items.length) * 100) : 0;

  async function loadJob(jobId: string) {
    setError('');
    const res = await fetch(`${feature.apiPrefix}/jobs/${jobId}`);
    const json = await res.json() as { success?: boolean; data?: { job: BulkJobResponse }; error?: string };
    if (!res.ok || !json.success || !json.data?.job) {
      throw new Error(json.error || 'Không load được job');
    }
    setJob(json.data.job);
    setItems(json.data.job.articles.map(normalizeItem));
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jid = params.get('jobId') || sessionStorage.getItem(feature.jobIdKey) || (featureId === 'smart' ? sessionStorage.getItem('vhl_job_id') : '');
    if (!jid) {
      router.replace(feature.route);
      return;
    }
    sessionStorage.setItem(feature.jobIdKey, jid);
    loadJob(jid).catch((err) => setError(err instanceof Error ? err.message : 'Không load được job'));
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature.apiPrefix, feature.jobIdKey, feature.route, featureId, router]);

  function applyEvent(event: BulkSseEvent) {
    if (event.type === 'item_start') {
      setItems((prev) => prev.map((item) => item.bulkIndex === event.index ? {
        ...item,
        runtimeStatus: 'running',
        progress: 5,
        currentStep: 'Bắt đầu',
        currentDetail: event.keyword,
      } : item));
      return;
    }

    if (event.type === 'item_step') {
      setItems((prev) => prev.map((item) => item.bulkIndex === event.index ? {
        ...item,
        runtimeStatus: 'running',
        progress: event.progress,
        currentStep: event.step,
        currentDetail: event.detail,
      } : item));
      return;
    }

    if (event.type === 'item_done') {
      setItems((prev) => prev.map((item) => item.bulkIndex === event.index ? {
        ...item,
        runtimeStatus: 'done',
        progress: 100,
        selectedTitle: event.title,
        wordCount: event.wordCount,
        humannessScore: event.humanness,
        seoScore: event.seoScore,
        status: 'WRITTEN',
        error: '',
      } : item));
      return;
    }

    if (event.type === 'item_error') {
      setItems((prev) => prev.map((item) => item.bulkIndex === event.index ? {
        ...item,
        runtimeStatus: 'error',
        progress: 100,
        error: event.message,
      } : item));
      return;
    }

    if (event.type === 'job_done') {
      setRunning(false);
      setJob((prev) => prev ? { ...prev, status: 'COMPLETED', successCount: event.successCount, errorCount: event.errorCount } : prev);
      return;
    }

    if (event.type === 'paused') {
      setRunning(false);
      setJob((prev) => prev ? { ...prev, status: 'PAUSED' } : prev);
      return;
    }

    if (event.type === 'error') {
      setRunning(false);
      setError(event.message);
    }
  }

  async function startProcessing() {
    if (!job || running) return;
    setError('');
    setRunning(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${feature.apiPrefix}/process/${job.id}`, {
        method: 'POST',
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error('Không kết nối được SSE');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            applyEvent(JSON.parse(line.slice(6)) as BulkSseEvent);
          } catch {
            // skip malformed SSE event
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Queue bị ngắt');
      }
    } finally {
      setRunning(false);
    }
  }

  async function patchJob(action: 'pause' | 'resume' | 'cancel') {
    if (!job) return;
    await fetch(`${feature.apiPrefix}/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (action === 'pause' || action === 'cancel') {
      abortRef.current?.abort();
      setRunning(false);
    }
    setJob((prev) => prev ? { ...prev, status: action === 'pause' ? 'PAUSED' : action === 'cancel' ? 'FAILED' : 'RUNNING' } : prev);
    if (action === 'resume') void startProcessing();
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="w-full px-6 py-8">
        <div className={`rounded-3xl bg-gradient-to-r ${feature.accent} p-6 text-white shadow-sm`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Queue Bulk</p>
              <h1 className="mt-2 text-3xl font-bold">{feature.title}</h1>
              <p className="mt-2 text-sm text-white/85">{job ? `${job.totalCount} bài · trạng thái ${job.status}` : 'Đang tải job...'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startProcessing} disabled={!job || running || job.status === 'COMPLETED'} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700 disabled:opacity-50">
                {running ? 'Đang chạy...' : 'Bắt đầu'}
              </button>
              <button type="button" onClick={() => patchJob('pause')} disabled={!job || !running} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-40">Tạm dừng</button>
              <button type="button" onClick={() => patchJob('resume')} disabled={!job || running || job.status !== 'PAUSED'} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-40">Tiếp tục</button>
              <button type="button" onClick={() => patchJob('cancel')} disabled={!job || job.status === 'COMPLETED'} className="rounded-xl bg-red-500/80 px-4 py-2 text-sm font-semibold disabled:opacity-40">Hủy</button>
            </div>
          </div>
        </div>

        <div className="my-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700">Tiến độ tổng</span>
            <span className="text-gray-500">{doneCount} xong · {errorCount} lỗi · {items.length} tổng</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

        <div className="grid gap-3">
          {items.map((item, index) => {
            const badge = statusBadge(item);
            return (
              <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">{index + 1}</span>
                      <p className="truncate text-sm font-semibold text-gray-900">{item.keyword}</p>
                    </div>
                    <p className="mt-1 truncate pl-9 text-sm text-gray-600">{item.selectedTitle}</p>
                    {item.currentDetail && <p className="mt-1 pl-9 text-xs text-blue-600">{item.currentDetail}</p>}
                    {item.error && <p className="mt-1 pl-9 text-xs text-red-600">{item.error}</p>}
                  </div>
                  <div className="flex items-center gap-2 md:shrink-0">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                    {(item.runtimeStatus === 'done' || item.status === 'WRITTEN' || item.status === 'PUBLISHED') && (
                      <Link href={`${feature.route}/${item.id}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                        Xem bài
                      </Link>
                    )}
                  </div>
                </div>
                {item.runtimeStatus === 'running' && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-between">
          <Link href={feature.route} className="text-sm font-semibold text-blue-600 hover:underline">Tạo job mới</Link>
          <Link href="/dashboard/articles" className="text-sm font-semibold text-gray-600 hover:underline">Xem tất cả bài viết</Link>
        </div>
      </div>
    </div>
  );
}
