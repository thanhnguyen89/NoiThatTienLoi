'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandSection, EMPTY_BRAND_SECTION_STATE, type BrandSectionState } from '@/components/BrandSection';
import ModelPicker from '@/components/ModelPicker';
import {
  CTA_STYLES,
  EMOJI_LEVELS,
  HOOK_STYLES,
  LS_KEY_BRAND,
  LS_KEY_CONFIG,
  TIKTOK_CHAR_WARNING,
  TOPIC_EXAMPLES,
  VIDEO_TYPES,
} from '@/lib/viet-bai-tiktok/options';
import type { EmojiLevel, HookStyle, TikTokCTA, TiktokBrandPostConfig, TiktokParsedOutput, VideoType } from '@/lib/viet-bai-tiktok/types';

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function brandInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return 'MQ';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0]?.[0] || ''}${words[1]?.[0] || ''}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

function usernameFromBrand(name: string): string {
  if (!name.trim()) return 'noithatminhquan';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20) || 'noithatminhquan';
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function VietBaiTiktokPage() {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [topic, setTopic] = useState('');
  const [videoType, setVideoType] = useState<VideoType>('product_demo');
  const [hookStyle, setHookStyle] = useState<HookStyle>('number');
  const [ctaStyle, setCtaStyle] = useState<TikTokCTA>('inbox');
  const [language, setLanguage] = useState('Vietnamese');
  const [emojiLevel, setEmojiLevel] = useState<EmojiLevel>('medium');
  const [modelId, setModelId] = useState('');
  const [brand, setBrand] = useState<BrandSectionState>(EMPTY_BRAND_SECTION_STATE);

  const [rawStream, setRawStream] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const selectedVideo = VIDEO_TYPES.find((item) => item.value === videoType) || VIDEO_TYPES[0];
  const parsed = Boolean(title || caption || hashtags.length);

  useEffect(() => {
    document.title = 'Viết bài TikTok - Content Agent';

    const raw = sessionStorage.getItem(LS_KEY_CONFIG);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<TiktokBrandPostConfig>;
        if (parsed.topic) setTopic(parsed.topic);
        if (parsed.videoType) setVideoType(parsed.videoType);
        if (parsed.hookStyle) setHookStyle(parsed.hookStyle);
        if (parsed.ctaStyle) setCtaStyle(parsed.ctaStyle);
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.emojiLevel) setEmojiLevel(parsed.emojiLevel);
        if (parsed.modelId) setModelId(parsed.modelId);
        if (parsed.brand) setBrand({ ...EMPTY_BRAND_SECTION_STATE, ...parsed.brand });
      } catch {
        sessionStorage.removeItem(LS_KEY_CONFIG);
      }
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(LS_KEY_CONFIG, JSON.stringify(buildConfig()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, topic, videoType, hookStyle, ctaStyle, language, emojiLevel, modelId, brand]);

  useEffect(() => {
    if (!caption) {
      setWordCount(0);
      setCharCount(0);
      return;
    }
    setWordCount(countWords(caption));
    setCharCount(caption.length);
  }, [caption]);

  function buildConfig(): TiktokBrandPostConfig {
    return {
      topic,
      videoType,
      hookStyle,
      ctaStyle,
      language,
      emojiLevel,
      modelId,
      brand,
    };
  }

  function validate(): boolean {
    if (!topic.trim()) {
      setError('Thiếu mô tả video / chủ đề');
      return false;
    }
    if (!modelId.trim()) {
      setError('Vui lòng chọn AI Model');
      return false;
    }
    setError('');
    return true;
  }

  async function handleGenerate() {
    if (!validate()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setRawStream('');
    setTitle('');
    setCaption('');
    setHashtags([]);
    setWordCount(0);
    setCharCount(0);
    setError('');
    setCopiedTitle(false);
    setCopiedCaption(false);
    setCopiedHashtags(false);
    setSavedId(null);
    setShowFull(false);
    setGeneratedAt(null);

    const config = buildConfig();
    sessionStorage.setItem(LS_KEY_CONFIG, JSON.stringify(config));

    try {
      const res = await fetch('/api/viet-bai-tiktok/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || json?.error || 'Không thể tạo caption TikTok');
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

        for (const eventText of events) {
          const line = eventText.split('\n').find((item) => item.startsWith('data: '));
          if (!line) continue;

          const event = JSON.parse(line.slice(6)) as
            | { type: 'chunk'; text: string }
            | { type: 'parsed'; data: TiktokParsedOutput }
            | { type: 'done'; wordCount: number; charCount: number }
            | { type: 'error'; message: string };

          if (event.type === 'chunk') {
            setRawStream((prev) => prev + event.text);
          }
          if (event.type === 'parsed') {
            setTitle(event.data.title);
            setCaption(event.data.caption);
            setHashtags(event.data.hashtags);
            setRawStream('');
            setShowFull(false);
          }
          if (event.type === 'done') {
            setWordCount(event.wordCount);
            setCharCount(event.charCount);
            setGeneratedAt(new Date());
            setLoading(false);
          }
          if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo caption');
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!caption.trim() || saving || savedId) return;

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/viet-bai-tiktok/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          videoType,
          hookStyle,
          ctaStyle,
          title,
          content: caption,
          hashtags,
          language,
          emojiLevel,
          wordCount,
          charCount,
          brandProfileId: brand.selectedProfileId || null,
          brandName: brand.shopName || null,
          modelId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Không thể lưu caption');
      setSavedId(json.id || json.data?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu caption');
    } finally {
      setSaving(false);
    }
  }

  function copyText(text: string, setCopied: (value: boolean) => void) {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function updateTitle(next: string) {
    setTitle(next.slice(0, 80));
    setSavedId(null);
  }

  function updateCaption(next: string) {
    setCaption(next);
    setSavedId(null);
  }

  function updateHashtags(next: string) {
    setHashtags(next.split(/\s+/).map((tag) => tag.trim()).filter(Boolean));
    setSavedId(null);
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-slate-100">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              <h1 className="text-xl font-bold text-slate-950">Viết bài TikTok</h1>
              <span className="px-2 py-0.5 rounded-full bg-slate-950 text-white text-xs font-semibold">Brand tool</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Tạo title, caption 100-200 từ và hashtag TikTok theo brand guideline, có preview và lưu lịch sử.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push('/quan-ly-bai-tiktok')}
              className="px-3 py-2 text-sm border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700"
            >
              📋 Caption đã lưu
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-3 py-2 text-sm border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700"
            >
              ← Quay lại
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4 md:p-6">
        <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[430px_minmax(0,1fr)]">
          <div className="min-h-0 space-y-4 overflow-y-auto pr-0 lg:pr-2">
            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Mô tả video / ý tưởng chính <span className="text-red-500">*</span>
              </label>
              <textarea
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  setError('');
                }}
                rows={5}
                placeholder={TOPIC_EXAMPLES[videoType]}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <p className="mt-2 text-xs text-slate-400">
                Ghi rõ sản phẩm, cảnh quay, giá, số liệu test, ưu đãi hoặc CTA cần nhấn.
              </p>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <p className="text-sm font-bold text-slate-900 mb-3">Loại video</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VIDEO_TYPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setVideoType(item.value)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      videoType === item.value
                        ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                        : 'border-slate-200 hover:border-slate-400 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-semibold">{item.label}</span>
                    </div>
                    <p className={`text-xs mt-1 leading-5 ${videoType === item.value ? 'text-slate-300' : 'text-slate-500'}`}>
                      {item.note}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <p className="text-sm font-bold text-slate-900 mb-3">Kiểu hook</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {HOOK_STYLES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    title={item.example}
                    onClick={() => setHookStyle(item.value)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      hookStyle === item.value
                        ? 'border-rose-500 bg-rose-50 text-rose-950'
                        : 'border-slate-200 hover:border-rose-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span className="text-sm font-semibold">{item.label}</span>
                      {item.hot && <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">Hot</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-5">{item.note}</p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{item.example}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-900 mb-3">Kiểu CTA</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CTA_STYLES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setCtaStyle(item.value)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                        ctaStyle === item.value
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-950'
                          : 'border-slate-200 hover:border-cyan-200 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{item.icon}</span>
                        <span className="text-xs font-semibold">{item.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{item.example}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ngôn ngữ</label>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="Vietnamese">Tiếng Việt</option>
                    <option value="English">English</option>
                    <option value="Thai">Thai</option>
                    <option value="Indonesian">Indonesian</option>
                  </select>
                </div>
                <div>
                  <p className="block text-xs font-semibold text-slate-500 mb-1.5">Emoji level</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJI_LEVELS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setEmojiLevel(item.value)}
                        title={item.note}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                          emojiLevel === item.value
                            ? 'border-slate-950 bg-slate-950 text-white'
                            : 'border-slate-200 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <ModelPicker value={modelId} onChange={setModelId} size="sm" label="AI Model" />
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <BrandSection value={brand} onChange={setBrand} lsKey={LS_KEY_BRAND} defaultBrandName="Nội Thất Minh Quân" />
            </section>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                ⚠️ {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading}
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? 'AI đang viết caption...' : '🎬 Tạo caption TikTok'}
            </button>
          </div>

          <div className="min-h-0 space-y-4 overflow-y-auto pr-0 lg:pr-2">
            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">TikTok Preview</p>
                  <p className="text-xs text-slate-400">Dark card mô phỏng caption trên FYP</p>
                </div>
                {generatedAt && <span className="text-xs text-slate-400">{formatDateTime(generatedAt)}</span>}
              </div>

              <div className="max-w-sm mx-auto select-none">
                <div className="bg-[#111] rounded-t-2xl relative overflow-hidden" style={{ aspectRatio: '9 / 16', maxHeight: '280px' }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl mb-2">{selectedVideo?.icon}</span>
                    <span className="text-xs text-gray-500">{selectedVideo?.label}</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
                  <div className="absolute right-3 bottom-8 flex flex-col items-center gap-4 text-white">
                    {[
                      { icon: '❤️', count: '1.2K' },
                      { icon: '💬', count: '48' },
                      { icon: '↗️', count: '89' },
                      { icon: '🔖', count: '' },
                    ].map(({ icon, count }) => (
                      <div key={icon} className="flex flex-col items-center gap-0.5">
                        <span className="text-xl drop-shadow">{icon}</span>
                        {count && <span className="text-[10px] text-gray-300">{count}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111] rounded-b-2xl px-4 py-3 border-t border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {brandInitials(brand.shopName)}
                      </div>
                      <span className="text-xs text-gray-300 font-semibold truncate">@{usernameFromBrand(brand.shopName)}</span>
                    </div>
                    {parsed && !loading && (
                      <button
                        type="button"
                        onClick={() => void handleGenerate()}
                        className="text-[10px] text-gray-400 hover:text-gray-200 transition-colors px-2"
                      >
                        🔄 Tạo lại
                      </button>
                    )}
                  </div>

                  {loading && rawStream && !parsed && (
                    <div className="text-xs text-gray-300 leading-relaxed opacity-70">
                      <p className="whitespace-pre-wrap line-clamp-4">{rawStream}</p>
                      <span className="inline-block w-1.5 h-3 bg-white ml-0.5 animate-pulse rounded-sm" />
                    </div>
                  )}
                  {parsed && (
                    <div className="text-xs text-gray-200 leading-relaxed">
                      {title && <p className="mb-1 font-bold text-white">{title}</p>}
                      {showFull ? (
                        <p className="whitespace-pre-wrap">{caption}</p>
                      ) : (
                        <div>
                          <p className="line-clamp-2 whitespace-pre-wrap">{caption}</p>
                          <button
                            type="button"
                            onClick={() => setShowFull(true)}
                            className="text-gray-500 text-[10px] mt-0.5 hover:text-gray-300"
                          >
                            ... more
                          </button>
                        </div>
                      )}
                      {hashtags.length > 0 && (
                        <p className="mt-1 line-clamp-1 text-cyan-300">{hashtags.join(' ')}</p>
                      )}
                    </div>
                  )}
                  {!rawStream && loading && !parsed && <div className="text-xs text-gray-500 italic">AI đang viết caption...</div>}
                  {!rawStream && !loading && !parsed && <div className="text-xs text-gray-600">Title, caption và hashtag sẽ hiện ở đây...</div>}

                  {!loading && parsed && (
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800">
                      <div className="min-w-0">
                        <span className="text-[10px] text-gray-500">
                          {wordCount} từ · {charCount} ký tự
                        </span>
                        {charCount > TIKTOK_CHAR_WARNING && (
                          <span className="block text-[10px] text-amber-400 mt-0.5">⚠ dài hơn 2 dòng FYP</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSave()}
                          disabled={saving || Boolean(savedId)}
                          className={`px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-all ${
                            savedId
                              ? 'border-green-500 bg-green-500/20 text-green-400'
                              : 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50'
                          }`}
                        >
                          {savedId ? '✓ Đã lưu' : saving ? '...' : '💾 Lưu'}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyText(caption, setCopiedCaption)}
                          className={`px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-all ${
                            copiedCaption
                              ? 'border-green-500 bg-green-500/20 text-green-400'
                              : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {copiedCaption ? '✓ Copy' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">3 output TikTok</p>
                  <p className="text-xs text-slate-400">Tách riêng tiêu đề, mô tả và hashtag để dán đúng field TikTok.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!caption.trim() || saving || Boolean(savedId)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {savedId ? '✓ Đã lưu' : saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>

              {!parsed ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                  Sau khi generate xong, 3 box output sẽ hiện ở đây.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500">① Tiêu đề TikTok</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] ${title.length > 45 ? 'text-amber-600' : 'text-slate-400'}`}>{title.length}/50</span>
                        <button
                          type="button"
                          onClick={() => copyText(title, setCopiedTitle)}
                          className="rounded border border-slate-300 px-2 py-0.5 text-[10px] hover:bg-slate-50"
                        >
                          {copiedTitle ? '✓ Đã copy' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <input
                      value={title}
                      onChange={(event) => updateTitle(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-950"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500">② Mô tả / Caption</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{wordCount} từ</span>
                        <button
                          type="button"
                          onClick={() => copyText(caption, setCopiedCaption)}
                          className="rounded border border-slate-300 px-2 py-0.5 text-[10px] hover:bg-slate-50"
                        >
                          {copiedCaption ? '✓ Đã copy' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={caption}
                      onChange={(event) => updateCaption(event.target.value)}
                      rows={8}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-7 resize-none focus:outline-none focus:ring-2 focus:ring-slate-950"
                    />
                    {charCount > TIKTOK_CHAR_WARNING && (
                      <p className="mt-1 text-[10px] text-amber-600">⚠ Dài hơn 2 dòng FYP</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500">③ Hashtag</span>
                      <button
                        type="button"
                        onClick={() => copyText(hashtags.join(' '), setCopiedHashtags)}
                        disabled={hashtags.length === 0}
                        className="rounded border border-slate-300 px-2 py-0.5 text-[10px] hover:bg-slate-50 disabled:opacity-50"
                      >
                        {copiedHashtags ? '✓ Đã copy' : 'Copy tất cả'}
                      </button>
                    </div>
                    <input
                      value={hashtags.join(' ')}
                      onChange={(event) => updateHashtags(event.target.value)}
                      placeholder="#noithatminhquan #giuongsat #giaxuong"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-cyan-700 focus:outline-none focus:ring-2 focus:ring-slate-950"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {hashtags.map((tag) => (
                        <span key={tag} className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs text-cyan-700">{tag}</span>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-amber-600">Dán hashtag vào cuối phần Mô tả trong app TikTok qua nút #.</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
