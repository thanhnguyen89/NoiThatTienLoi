'use client';

import { useCallback, useRef, useState } from 'react';

export type GenerateStreamEvent = {
  type: 'step' | 'step_done' | 'status' | 'chunk' | 'humanness' | 'done' | 'error';
  step?: string;
  label?: string;
  message?: string;
  text?: string;
  html?: string;
  data?: unknown;
  score?: number;
  decision?: string;
  humanness?: unknown;
  articleId?: string;
  wordCount?: number;
};

export function useGenerateStream(endpoint: string) {
  const [streaming, setStreaming] = useState(false);
  const [activeStep, setActiveStep] = useState('');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [outputHtml, setOutputHtml] = useState('');
  const [streamResult, setStreamResult] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [lastEvent, setLastEvent] = useState<GenerateStreamEvent | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const startStream = useCallback(async (payload: object) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setStreaming(true);
    setActiveStep('');
    setCompletedSteps([]);
    setOutputHtml('');
    setStreamResult(null);
    setError('');
    setStatusMessage('');
    setLastEvent(null);

    let completed = false;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error('Khong the bat dau stream');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const line = event
            .split('\n')
            .map((item) => item.trim())
            .find((item) => item.startsWith('data: '));

          if (!line || requestId !== requestIdRef.current) continue;

          try {
            const nextEvent = JSON.parse(line.slice(6)) as GenerateStreamEvent;
            setLastEvent(nextEvent);

            if (nextEvent.type === 'step') {
              setActiveStep(nextEvent.step || '');
              setStatusMessage(nextEvent.label || nextEvent.message || nextEvent.step || '');
            }

            if (nextEvent.type === 'step_done') {
              setCompletedSteps((prev) => [...prev, nextEvent.step || '']);
            }

            if (nextEvent.type === 'status') {
              setStatusMessage(nextEvent.message || '');
            }

            if (nextEvent.type === 'chunk') {
              const text = nextEvent.text ?? nextEvent.html ?? '';
              if (text) setOutputHtml((prev) => prev + text);
            }

            if (nextEvent.type === 'done') {
              completed = true;
              setStreamResult(nextEvent.data ?? nextEvent);
              setStatusMessage('Hoan tat');
              setStreaming(false);
            }

            if (nextEvent.type === 'error') {
              setError(nextEvent.message || 'Stream error');
              setStreaming(false);
            }
          } catch {
            // ignore malformed event
          }
        }
      }

      if (requestId === requestIdRef.current) setStreaming(false);
      return completed && requestId === requestIdRef.current;
    } catch (err) {
      if ((err as Error).name !== 'AbortError' && requestId === requestIdRef.current) {
        setError(String(err));
      }
      if (requestId === requestIdRef.current) setStreaming(false);
      return false;
    }
  }, [endpoint]);

  const abort = useCallback(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setActiveStep('');
    setCompletedSteps([]);
    setOutputHtml('');
    setStreamResult(null);
    setError('');
    setStatusMessage('');
    setLastEvent(null);
  }, []);

  return {
    streaming,
    activeStep,
    completedSteps,
    outputHtml,
    streamResult,
    error,
    statusMessage,
    lastEvent,
    startStream,
    abort,
    reset,
  };
}
