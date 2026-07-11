'use client';

import { useState } from 'react';
import ModelPicker from '@/app/components/ModelPicker';
import { FACEBOOK_POST_DEFAULT_WORD_COUNT, TEMPLATES, TONES } from '@/lib/facebook-post/constants';
import { clampFacebookPostQuickWordCount } from '@/lib/facebook-post/schema';
import type { FacebookPostTemplate, FacebookPostTone } from '@/lib/facebook-post/types';

export default function FacebookPostPage() {
  const [modelId, setModelId] = useState('gemini-flash');
  const [keyword, setKeyword] = useState('');
  const [tone, setTone] = useState<FacebookPostTone>('friendly');
  const [template, setTemplate] = useState<FacebookPostTemplate>('');
  const [wordCount, setWordCount] = useState(FACEBOOK_POST_DEFAULT_WORD_COUNT);
  const [shopName, setShopName] = useState('');
  const [ctaStandard, setCtaStandard] = useState('');
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [freeShip, setFreeShip] = useState(false);
  const [urgency, setUrgency] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [output, setOutput] = useState('');

  async function handleGenerate() {
    const topic = keyword.trim();
    if (!topic) {
      setError('Nhap chu de hoac noi dung goc truoc khi tao post.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/facebook-post/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          keyword: topic,
          wordCount,
          tone,
          template: template || null,
          shopName,
          industry: '',
          brandPronouns: '',
          brandAudience: '',
          brandToneNotes: '',
          phone: '',
          address: '',
          brandDesc: '',
          brandForbidden: '',
          ctaStandard,
          mainProducts: '',
          includeEmojis,
          includeHashtags,
          freeShip,
          urgency,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: { post?: string };
      };

      if (!response.ok || !payload.success || !payload.data?.post) {
        throw new Error(payload.error || 'Khong the tao Facebook post.');
      }

      setOutput(payload.data.post);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Khong the tao Facebook post.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Quick Social Tool</p>
            <h1 className="mt-2 text-3xl font-black text-gray-900">Facebook Post</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Tool stateless de tao nhanh 1 bai Facebook post, khong tao Article trong DB.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Chu de / noi dung goc</label>
            <textarea
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              rows={8}
              placeholder="VD: giam gia giuong sat 1m6, thong bao kho hang, rewrite bai post cu..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">AI model</label>
            <ModelPicker value={modelId} onChange={setModelId} size="md" label="" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Tone</label>
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value as FacebookPostTone)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TONES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Template</label>
              <select
                value={template}
                onChange={(event) => setTemplate(event.target.value as FacebookPostTemplate)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TEMPLATES.map((item) => (
                  <option key={item.value || 'auto'} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Word target</label>
              <input
                type="number"
                min={60}
                max={320}
                value={wordCount}
                onChange={(event) => setWordCount(clampFacebookPostQuickWordCount(Number(event.target.value)))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Shop name</label>
              <input
                type="text"
                value={shopName}
                onChange={(event) => setShopName(event.target.value)}
                placeholder="VD: Noi That Minh Quan"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">CTA cuoi bai</label>
            <input
              type="text"
              value={ctaStandard}
              onChange={(event) => setCtaStandard(event.target.value)}
              placeholder="VD: Inbox ngay de nhan bao gia trong ngay."
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
              <input type="checkbox" checked={includeEmojis} onChange={(event) => setIncludeEmojis(event.target.checked)} />
              <span>Include emojis</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
              <input type="checkbox" checked={includeHashtags} onChange={(event) => setIncludeHashtags(event.target.checked)} />
              <span>Include hashtags</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
              <input type="checkbox" checked={freeShip} onChange={(event) => setFreeShip(event.target.checked)} />
              <span>Free ship callout</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
              <input type="checkbox" checked={urgency} onChange={(event) => setUrgency(event.target.checked)} />
              <span>Urgency CTA</span>
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Dang tao post...' : 'Tao Facebook post'}
          </button>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Output</p>
              <h2 className="mt-1 text-2xl font-black text-gray-900">Bai post</h2>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!output}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Copy
            </button>
          </div>

          <div className="mt-6 min-h-[520px] rounded-2xl bg-gray-50 p-6">
            {output ? (
              <div className="whitespace-pre-wrap text-sm leading-7 text-gray-800">{output}</div>
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-gray-300 text-sm text-gray-400">
                Output se hien o day sau khi generate.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
