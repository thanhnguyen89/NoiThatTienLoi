'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { COMMENT_COUNTS, COMMENT_LANGUAGES, COMMENT_STYLES, FACEBOOK_COMMENT_EMOJI_GROUPS, FREE_USER_MAX_WORDS } from '@/lib/facebook-comment/options';
import { joinPlainComments } from '@/lib/facebook-comment/parser';
import type {
  CommentCard,
  CommentCount,
  CommentGeneratorConfig,
  CommentSSEEvent,
} from '@/lib/facebook-comment/types';

const DEFAULT_CONFIG: CommentGeneratorConfig = {
  postContent: '',
  language: 'Vietnamese',
  style: 'friendly',
  count: 5,
  includeEmojis: true,
};

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export default function FacebookCommentPage() {
  const uid = useId();
  const abortRef = useRef<AbortController | null>(null);
  const cardCounter = useRef(0);
  const postTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [config, setConfig] = useState<CommentGeneratorConfig>(DEFAULT_CONFIG);
  const [emojiGroup, setEmojiGroup] = useState(0);
  const [cards, setCards] = useState<CommentCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [allCopied, setAllCopied] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const inputWordCount = countWords(config.postContent);
  const activeEmojiGroup = FACEBOOK_COMMENT_EMOJI_GROUPS[emojiGroup] ?? FACEBOOK_COMMENT_EMOJI_GROUPS[0];

  useEffect(() => {
    document.title = 'Facebook Comment - Content Agent';
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!config.postContent.trim()) {
      setError('Vui long nhap noi dung bai post.');
      return;
    }

    if (inputWordCount > FREE_USER_MAX_WORDS) {
      setError(`Noi dung vuot ${FREE_USER_MAX_WORDS} tu (hien tai: ${inputWordCount} tu).`);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setDone(false);
    setError('');
    setCards([]);
    setSavedId(null);
    setAllCopied(false);
    cardCounter.current = 0;
    setProgress({ current: 0, total: Math.ceil(config.count / 10) });

    try {
      const response = await fetch('/api/facebook-comment/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        let message = text || 'Khong the tao comment';
        try {
          const parsed = JSON.parse(text) as { message?: string };
          message = parsed.message || message;
        } catch {
          // keep raw response text
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          const dataLine = event
            .split('\n')
            .map((line) => line.trim())
            .find((line) => line.startsWith('data: '));

          if (!dataLine) continue;

          try {
            const payload = JSON.parse(dataLine.slice(6)) as CommentSSEEvent;

            if (payload.type === 'batch') {
              const nextCards = payload.comments.map((text) => ({
                id: `${uid}-${++cardCounter.current}`,
                text,
                copied: false,
              }));
              setCards((prev) => [...prev, ...nextCards]);
              setProgress((prev) => ({ ...prev, current: payload.batchIndex + 1 }));
            } else if (payload.type === 'done') {
              setDone(true);
              setSavedId(payload.savedId ?? null);
            } else if (payload.type === 'error') {
              setError((prev) => (prev ? `${prev} | ${payload.message}` : payload.message));
            }
          } catch {
            // skip malformed event
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Loi khong xac dinh');
      }
    } finally {
      setLoading(false);
    }
  }, [config, inputWordCount, uid]);

  function handleCopyCard(id: string) {
    const card = cards.find((item) => item.id === id);
    if (!card) return;

    void navigator.clipboard.writeText(card.text).then(() => {
      setCards((prev) => prev.map((item) => (item.id === id ? { ...item, copied: true } : item)));
      setTimeout(() => {
        setCards((prev) => prev.map((item) => (item.id === id ? { ...item, copied: false } : item)));
      }, 1400);
    });
  }

  function handleCopyAll() {
    void navigator.clipboard.writeText(joinPlainComments(cards.map((card) => card.text))).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 1800);
    });
  }

  function insertEmoji(emoji: string) {
    const textarea = postTextareaRef.current;

    setConfig((prev) => {
      const current = prev.postContent;
      const start = textarea?.selectionStart ?? current.length;
      const end = textarea?.selectionEnd ?? current.length;
      const next = `${current.slice(0, start)}${emoji}${current.slice(end)}`;

      requestAnimationFrame(() => {
        textarea?.focus();
        const cursor = start + emoji.length;
        textarea?.setSelectionRange(cursor, cursor);
      });

      return { ...prev, postContent: next };
    });
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      <div className="flex border-b border-gray-200 bg-white shrink-0">
        <Link
          href="/viet-bai-facebook"
          className="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700"
        >
          Tao Facebook Post
        </Link>
        <Link
          href="/facebook-comment"
          className="px-4 py-3 text-sm font-medium border-b-2 border-blue-500 text-blue-600"
        >
          Tao Facebook Comment
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[420px] shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-5">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-gray-900">Tao Facebook Comment</h1>
            <p className="text-sm text-gray-500 mt-1">Nhanh, gon, sinh comment tu nhien theo bat cu bai post nao.</p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-800">
                  Noi dung bai post <span className="text-red-500">*</span>
                </label>
                <span className={`text-xs ${inputWordCount > FREE_USER_MAX_WORDS ? 'text-red-600' : 'text-gray-400'}`}>
                  so tu: {inputWordCount}
                  {inputWordCount > FREE_USER_MAX_WORDS ? ` / ${FREE_USER_MAX_WORDS}` : ''}
                </span>
              </div>
              <textarea
                ref={postTextareaRef}
                value={config.postContent}
                onChange={(event) => setConfig((prev) => ({ ...prev, postContent: event.target.value }))}
                placeholder="Dan noi dung bai post vao day..."
                rows={9}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {inputWordCount > FREE_USER_MAX_WORDS && (
                <p className="text-xs text-red-600 mt-1">Noi dung qua dai, hay rut xuong duoi 500 tu.</p>
              )}
              <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">Emoji Facebook</span>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      checked={config.includeEmojis}
                      onChange={(event) => setConfig((prev) => ({ ...prev, includeEmojis: event.target.checked }))}
                    />
                    Cho AI dùng emoji
                  </label>
                </div>
                <p className="mb-2 text-[11px] text-gray-500">Click emoji để chèn tại vị trí con trỏ trong nội dung post.</p>
                <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                  {FACEBOOK_COMMENT_EMOJI_GROUPS.map((group, index) => (
                    <button
                      key={group.label}
                      type="button"
                      onClick={() => setEmojiGroup(index)}
                      className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                        emojiGroup === index
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      {group.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-10 gap-1.5">
                  {activeEmojiGroup.emojis.map((emoji) => (
                    <button
                      key={`${activeEmojiGroup.label}-${emoji}`}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="aspect-square rounded-lg bg-white text-lg shadow-sm transition hover:scale-110 hover:bg-blue-50 hover:ring-1 hover:ring-blue-300 active:scale-95"
                      aria-label={`Chen emoji ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Ngon ngu</label>
              <select
                value={config.language}
                onChange={(event) => setConfig((prev) => ({ ...prev, language: event.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COMMENT_LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Style</label>
              <div className="space-y-2">
                {COMMENT_STYLES.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, style: style.value }))}
                    className={`w-full text-left border rounded-xl p-3 transition-all ${
                      config.style === style.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                    title={style.note}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{style.emoji}</span>
                      <span className="text-sm font-semibold">{style.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{style.note}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">So luong comment</label>
              <div className="grid grid-cols-7 gap-1.5">
                {COMMENT_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, count: count as CommentCount }))}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      config.count === count
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              {config.count > 10 && (
                <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 rounded-lg px-2 py-1">
                  {Math.ceil(config.count / 10)} lan goi AI, co the mat vai giay.
                </p>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading || !config.postContent.trim() || inputWordCount > FREE_USER_MAX_WORDS}
              className="w-full py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? `Dang tao ${progress.total > 1 ? `batch ${progress.current}/${progress.total}` : 'comment'}...`
                : 'Generator'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-200 shrink-0">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {cards.length > 0 ? `${cards.length} comment` : 'Ket qua'}
              </p>
              <p className="text-xs text-gray-400">
                {loading ? 'Dang sinh comment theo batch' : 'Copy tung card hoac copy all khi xong'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {savedId && (
                <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                  Da luu DB
                </span>
              )}
              {cards.length > 0 && done && (
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    allCopied
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {allCopied ? 'Da copy tat ca' : 'Copy tat ca'}
                </button>
              )}
              {loading && progress.total > 1 && (
                <div className="flex gap-1">
                  {Array.from({ length: progress.total }, (_, index) => (
                    <span
                      key={index}
                      className={`w-2 h-2 rounded-full ${index < progress.current ? 'bg-blue-500' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {cards.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                <div className="text-5xl mb-4">...</div>
                <p className="text-base font-semibold text-gray-500">Chua co comment nao</p>
                <p className="text-sm mt-1">Dan post vao ben trai roi bam Generator.</p>
              </div>
            )}

            <div className="space-y-3">
              {cards.map((card, index) => (
                <div
                  key={card.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <p className="flex-1 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {card.text}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopyCard(card.id)}
                      className={`shrink-0 px-2.5 py-1 text-xs rounded-lg border transition-all ${
                        card.copied
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-blue-600 hover:border-blue-300'
                      }`}
                    >
                      {card.copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {loading && cards.length > 0 && (
              <div className="mt-3 space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
