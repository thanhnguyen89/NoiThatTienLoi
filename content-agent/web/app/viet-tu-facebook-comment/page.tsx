'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModelPicker from '@/app/components/ModelPicker';
import {
  BrandSection,
  EMPTY_BRAND_SECTION_STATE,
  type BrandSectionState,
} from '@/components/BrandSection';
import { joinComments } from '@/lib/facebook-comment/parser';
import {
  COMMENT_BRAND_STYLES,
  COMMENT_COUNTS,
  COMMENT_LANGUAGES,
  VTFC_BRAND_KEY,
  VTFC_SESSION_KEY,
} from '@/lib/viet-tu-facebook-comment/options';
import type {
  CommentBrandCard,
  CommentBrandConfig,
  CommentBrandSSEEvent,
  CommentCount,
  SaveCommentResponse,
  SavedFacebookPostOption,
} from '@/lib/viet-tu-facebook-comment/types';

const DEFAULT_CONFIG: CommentBrandConfig = {
  postContent: '',
  facebookPostId: null,
  language: 'Vietnamese',
  style: 'friendly',
  count: 5,
  modelId: 'gemini-flash',
  brand: EMPTY_BRAND_SECTION_STATE,
};

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function VietTuFacebookCommentPage() {
  const uid = useId();
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const cardCounter = useRef(0);

  const [config, setConfig] = useState<CommentBrandConfig>(DEFAULT_CONFIG);
  const [posts, setPosts] = useState<SavedFacebookPostOption[]>([]);
  const [cards, setCards] = useState<CommentBrandCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [allCopied, setAllCopied] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const inputWords = wordCount(config.postContent);

  useEffect(() => {
    document.title = 'Viet Comment Facebook - Content Agent';

    try {
      const saved = sessionStorage.getItem(VTFC_SESSION_KEY);
      if (saved) {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
      }
    } catch {
      sessionStorage.removeItem(VTFC_SESSION_KEY);
    }

    fetch('/api/facebook-posts?limit=30')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setPosts(json.data);
        }
      })
      .catch(() => undefined);
  }, []);

  function updateConfig(partial: Partial<CommentBrandConfig>) {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      sessionStorage.setItem(VTFC_SESSION_KEY, JSON.stringify(next));
      return next;
    });
  }

  function handleSelectPost(id: string) {
    if (!id) {
      updateConfig({ facebookPostId: null });
      return;
    }

    const post = posts.find((item) => item.id === id);
    if (!post) return;

    updateConfig({
      facebookPostId: post.id,
      postContent: post.content,
    });
  }

  const handleGenerate = useCallback(async () => {
    if (!config.postContent.trim()) {
      setError('Vui long nhap noi dung bai post Facebook.');
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setDone(false);
    setError('');
    setCards([]);
    setAllCopied(false);
    setSavedId(null);
    cardCounter.current = 0;
    setProgress({ current: 0, total: Math.ceil(config.count / 10) });

    try {
      const response = await fetch('/api/viet-tu-facebook-comment/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        const message = await response.text();
        throw new Error(message || 'Khong the bat dau tao comment');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const line = event
            .split('\n')
            .map((item) => item.trim())
            .find((item) => item.startsWith('data: '));
          if (!line) continue;

          const payload = JSON.parse(line.slice(6)) as CommentBrandSSEEvent;
          if (payload.type === 'batch') {
            const nextCards = payload.comments.map((text) => ({
              id: `${uid}-${++cardCounter.current}`,
              text,
              copied: false,
              saved: false,
            }));
            setCards((prev) => [...prev, ...nextCards]);
            setProgress((prev) => ({ ...prev, current: payload.batchIndex + 1 }));
          }
          if (payload.type === 'done') setDone(true);
          if (payload.type === 'error') setError((prev) => (prev ? `${prev} | ${payload.message}` : payload.message));
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Loi tao comment');
      }
    } finally {
      setLoading(false);
    }
  }, [config, uid]);

  async function handleSaveAll() {
    if (cards.length === 0) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/viet-tu-facebook-comment/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          comments: cards.map((card) => card.text),
          brandSnapshot: config.brand,
        }),
      });

      if (!res.ok) throw new Error('Luu that bai');
      const data = (await res.json()) as SaveCommentResponse;
      setSavedId(data.id);
      setCards((prev) => prev.map((card) => ({ ...card, saved: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Luu that bai. Thu lai.');
    } finally {
      setSaving(false);
    }
  }

  function handleCopyCard(id: string) {
    const card = cards.find((item) => item.id === id);
    if (!card) return;

    void navigator.clipboard.writeText(card.text).then(() => {
      setCards((prev) => prev.map((item) => (item.id === id ? { ...item, copied: true } : item)));
      setTimeout(() => {
        setCards((prev) => prev.map((item) => (item.id === id ? { ...item, copied: false } : item)));
      }, 1500);
    });
  }

  function handleCopyAll() {
    void navigator.clipboard.writeText(joinComments(cards.map((card) => card.text))).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 1800);
    });
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Viet Comment Facebook</h1>
          <p className="text-sm text-gray-500 mt-1">Tao comment moi tu nhien, co brand context va luu DB.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/quan-ly-facebook-comment')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Quan ly comment
          </button>
          <button
            type="button"
            onClick={() => router.push('/quan-ly-bai-facebook')}
            className="px-3 py-2 text-sm border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-50"
          >
            Bai Facebook da luu
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[420px] shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-5 space-y-5">
          <BrandSection
            value={config.brand}
            onChange={(brand: BrandSectionState) => updateConfig({ brand })}
            lsKey={VTFC_BRAND_KEY}
          />

          <section className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Chon bai Facebook da luu</label>
              <select
                value={config.facebookPostId || ''}
                onChange={(event) => handleSelectPost(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Paste thu cong</option>
                {posts.map((post) => (
                  <option key={post.id} value={post.id}>
                    {post.keyword} {post.shopName ? `- ${post.shopName}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-800">Noi dung bai post *</label>
                <span className={`text-xs ${inputWords > 500 ? 'text-red-600' : 'text-gray-400'}`}>{inputWords} tu</span>
              </div>
              <textarea
                value={config.postContent}
                onChange={(event) => updateConfig({ postContent: event.target.value, facebookPostId: null })}
                rows={8}
                placeholder="Dan noi dung bai post Facebook vao day..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {inputWords > 500 && (
                <p className="text-xs text-red-600 mt-1">Noi dung qua dai, hay rut gon duoi 500 tu.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Ghi chu noi bo</label>
              <input
                value={config.notes || ''}
                onChange={(event) => updateConfig({ notes: event.target.value })}
                placeholder="Vi du: seeding bai khuyen mai tuan nay"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </section>

          <section className="border border-gray-200 rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Ngon ngu</label>
              <select
                value={config.language}
                onChange={(event) => updateConfig({ language: event.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COMMENT_LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>{language.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Phong cach comment</label>
              <div className="grid grid-cols-1 gap-2">
                {COMMENT_BRAND_STYLES.map((style) => (
                  <button
                    type="button"
                    key={style.value}
                    onClick={() => updateConfig({ style: style.value })}
                    className={`w-full text-left border rounded-lg p-3 transition-all ${
                      config.style === style.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{style.emoji}</span>
                      <span className="text-sm font-semibold">{style.label}</span>
                      {style.hot && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">HOT</span>}
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
                    type="button"
                    key={count}
                    onClick={() => updateConfig({ count: count as CommentCount })}
                    className={`py-1.5 rounded text-xs font-semibold ${
                      config.count === count
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <ModelPicker value={config.modelId} onChange={(modelId) => updateConfig({ modelId })} size="md" label="AI Model" />
          </section>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>
          )}

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading || !config.postContent.trim() || inputWords > 500}
            className="w-full py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? `Dang tao ${progress.total > 1 ? `batch ${progress.current}/${progress.total}` : 'comment'}...` : 'Tao comment'}
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-200 shrink-0">
            <div>
              <p className="text-sm font-semibold text-gray-800">{cards.length ? `${cards.length} comment` : 'Ket qua'}</p>
              <p className="text-xs text-gray-400">{loading ? 'AI dang tao comment theo tung batch' : 'Copy hoac luu tat ca vao DB'}</p>
            </div>
            <div className="flex items-center gap-2">
              {cards.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                    allCopied ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {allCopied ? 'Da copy' : 'Copy tat ca'}
                </button>
              )}
              {done && cards.length > 0 && !savedId && (
                <button
                  type="button"
                  onClick={() => void handleSaveAll()}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Dang luu...' : `Luu ${cards.length} comment`}
                </button>
              )}
              {savedId && <span className="text-xs text-green-600 font-semibold">Da luu DB</span>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {cards.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                <div className="text-5xl mb-4">...</div>
                <p className="text-base font-semibold text-gray-500">Chua co comment nao</p>
                <p className="text-sm mt-1">Dan bai post, chon style, roi bam Tao comment.</p>
              </div>
            )}

            <div className="space-y-3">
              {cards.map((card, index) => (
                <div key={card.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <p className="flex-1 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{card.text}</p>
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

            {loading && (
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
