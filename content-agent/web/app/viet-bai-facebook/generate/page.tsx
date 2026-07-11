'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FBPostParams {
  provider:        string;
  keyword:         string;
  wordCount:       number;
  tone:            string;
  template:        string | null;
  shopName:        string;
  industry:        string;
  brandPronouns:   string;
  brandAudience:   string;
  brandToneNotes:  string;
  phone:           string;
  address:         string;
  brandDesc:       string;
  brandForbidden:  string;
  ctaStandard:     string;
  mainProducts:    string;
  includeEmojis:   boolean;
  includeHashtags: boolean;
  freeShip:        boolean;
  urgency:         boolean;
}

interface FBPostEditSession {
  id: string;
  content: string;
  params: FBPostParams;
}

// ─── Emoji data ───────────────────────────────────────────────────────────────

const EMOJI_CATEGORIES = [
  {
    label: '🔥 Hot',
    emojis: ['🔥','⚡','💥','🎯','🚀','💫','✨','🌟','⭐','💎','🏆','🎁','💰','🤑','💸','🎉','🎊','👑','🥇','🎖️'],
  },
  {
    label: '👍 Tốt',
    emojis: ['👍','👌','✅','☑️','✔️','💪','🙌','👏','🤝','🫶','❤️','💚','💙','🧡','💛','🤍','💯','🫀','❣️','💝'],
  },
  {
    label: '📦 Sản phẩm',
    emojis: ['📦','🛋️','🪑','🛏️','🪞','🚪','🪟','🏠','🏡','🏗️','🔨','🪛','⚙️','🔧','🪚','📐','📏','🎨','🖼️','🪴'],
  },
  {
    label: '🚚 Giao hàng',
    emojis: ['🚚','🚛','📬','📦','🏎️','✈️','⚓','🗺️','📍','📌','🗺','🌍','🌏','🌐','🧭','📡','🛣️','🛤️','🏁','🎌'],
  },
  {
    label: '💬 CTA',
    emojis: ['💬','📲','📞','☎️','📱','💌','📩','📨','✉️','📧','👇','👆','👉','👈','⬇️','⬆️','➡️','⬅️','🔗','📢'],
  },
  {
    label: '💵 Giá',
    emojis: ['💵','💴','💶','💷','💰','🏷️','🎟️','🪙','💳','🧾','📊','📈','📉','💹','🤑','💸','💲','🏦','💎','🛒'],
  },
  {
    label: '⏰ Urgency',
    emojis: ['⏰','⌛','⏳','🕐','⏱️','🗓️','📅','📆','🔔','🔕','⚠️','🚨','🆘','❗','❕','‼️','⁉️','🆙','🆕','🆓'],
  },
  {
    label: '😊 Cảm xúc',
    emojis: ['😊','😍','🥰','😁','😆','🤩','😎','🥳','😋','😏','🤗','🫂','😌','🙏','🤞','✌️','🫵','☺️','🥹','😃'],
  },
  {
    label: '🌿 Phong cách',
    emojis: ['🌿','🌱','🌲','🌳','🍀','🌸','🌺','🌻','🌹','🌼','🍁','🍂','🍃','🌾','🌷','🪷','🌵','🎋','🎍','💐'],
  },
  {
    label: '✏️ Số - Ký tự',
    emojis: ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','#️⃣','*️⃣','▶️','⏸️','⏭️','🔴','🟡','🟢','🔵','🟣'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function countEmojis(text: string): number {
  const emojiRegex = /\p{Emoji_Presentation}|\p{Emoji}️/gu;
  return (text.match(emojiRegex) || []).length;
}

function countHashtags(text: string): number {
  return (text.match(/#\w+/g) || []).length;
}

function estimateReadTime(wordCount: number): string {
  const wpm = 200; // Facebook average reading speed (Vietnamese)
  const seconds = Math.ceil((wordCount / wpm) * 60);
  if (seconds < 60) return `${seconds} giây`;
  return `${Math.ceil(seconds / 60)} phút`;
}

const TEMPLATE_LABELS: Record<string, string> = {
  product_intro:   'Giới thiệu sản phẩm',
  combo_wholesale: 'Bàn ghế / Sỉ lẻ',
  bulk_b2b:        'B2B / Số lượng lớn',
  friendly_stock:  'Kho hàng / Thân thiện',
  branding:        'Branding',
};

const FB_DECORATION_DIVIDER = '━━━━━━━━━━━━━━━';
const FB_POST_EDIT_SESSION_KEY = 'fb_post_edit_session';
const FB_FIXED_FOOTER_LINES = [
  '➖➖➖➖➖➖➖',
  '⛪ NỘI THẤT MINH QUÂN',
  '📍 Hệ thống 2 chi nhánh trên toàn quốc: https://noithatminhquan.vn/he-thong-cua-hang.html',
  '🍀 Website: https://www.noithatminhquan.vn',
  '☎ Hotline miễn phí: 086 599 3334 - 098 831 8834',
  '☎ Hotline khiếu nại miễn phí: 086 599 3334',
] as const;
const FB_FIXED_FOOTER_BLOCK = FB_FIXED_FOOTER_LINES.join('\n');

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripExistingFixedFooter(text: string): string {
  return text
    .replace(new RegExp(`${escapeRegex(FB_FIXED_FOOTER_BLOCK)}\\s*$`, 'u'), '')
    .trimEnd();
}

function ensureFixedFooter(text: string): string {
  const base = stripExistingFixedFooter(text).trim();
  if (!base) return FB_FIXED_FOOTER_BLOCK;
  return `${base}\n${FB_FIXED_FOOTER_BLOCK}`;
}

function stripVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?…]+[.!?…]?/gu) || [text])
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

function isDecoratedParagraph(text: string): boolean {
  return /^(?:[#@]|https?:\/\/|www\.|[🔥⚡✨🌟📌✅❌👉▶🎁🏷️🚚⏰🔴♦◈★💰📦📞📲📍👇▸•【])/u.test(text)
    || /^[━▬—◈❋⭐🌟]{4,}/u.test(text);
}

function beautifyListLines(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('- ')) return `• ${trimmed.slice(2)}`;
      if (trimmed.startsWith('* ')) return `• ${trimmed.slice(2)}`;
      return line.trimEnd();
    })
    .join('\n');
}

function compactParagraphLines(text: string): string {
  const lines = text.split('\n').map(line => line.trimEnd());
  const compact: string[] = [];

  for (const line of lines) {
    const isBlank = !line.trim();
    const prev = compact[compact.length - 1];

    if (isBlank) {
      if (!prev || !prev.trim()) continue;
      compact.push('');
      continue;
    }

    compact.push(line);
  }

  return compact.join('\n').trim();
}

function getHookPrefix(params: FBPostParams): string {
  if (!params.includeEmojis) return '';
  if (params.urgency) return '🔥 ';
  if (params.template === 'branding') return '✨ ';
  if (params.template === 'friendly_stock') return '📌 ';
  return '🌟 ';
}

function getParagraphPrefix(text: string, index: number, params: FBPostParams): string {
  if (isDecoratedParagraph(text)) return '';

  const plain = stripVietnamese(text).toLowerCase();

  if (index === 0) return getHookPrefix(params);
  if (/(freeship|giao hang|van chuyen|ship|hoa toc)/.test(plain)) return '🚚 ';
  if (/(gia|uu dai|khuyen mai|deal|sale|voucher|chi con)/.test(plain) && /\d/.test(plain)) return '💰 ';
  if (/(thong so|kich thuoc|chat lieu|bao hanh|mau sac|tai trong|spec)/.test(plain)) return '📦 ';
  if (/(phu hop cho|danh cho|ung dung|ly tuong cho)/.test(plain)) return '✅ ';
  if (/(lien he|hotline|inbox|nhan tin|goi ngay|website|he thong|chi nhanh|fanpage|app)/.test(plain)) return '📲 ';

  return '';
}

function shouldInsertDividerBefore(text: string): boolean {
  const plain = stripVietnamese(text).toLowerCase();
  return /(freeship|giao hang|van chuyen|lien he|hotline|website|he thong|chi nhanh|fanpage|app)/.test(plain);
}

function hasBulletStructure(text: string): boolean {
  return /(^|\n)[•\-*]\s/m.test(text);
}

function getParagraphSeparator(current: string, next: string): string {
  if (current === FB_DECORATION_DIVIDER || next === FB_DECORATION_DIVIDER) return '\n';
  if (hasBulletStructure(current) || hasBulletStructure(next)) return '\n';
  return '\n\n';
}

function joinDecoratedParagraphs(paragraphs: string[]): string {
  if (paragraphs.length === 0) return '';

  let result = paragraphs[0];
  for (let i = 1; i < paragraphs.length; i += 1) {
    result += getParagraphSeparator(paragraphs[i - 1], paragraphs[i]) + paragraphs[i];
  }

  return result;
}

function buildParagraphsForFacebook(text: string): string[] {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  const hasRichStructure = paragraphs.length >= 3 || /(^|\n)\s*[-*•]/m.test(normalized);
  if (hasRichStructure) return paragraphs;

  const flattened = normalized.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const sentences = splitSentences(flattened);

  if (sentences.length < 4) return paragraphs.length ? paragraphs : [flattened];

  const groups = [sentences[0]];
  for (let i = 1; i < sentences.length; i += 2) {
    groups.push(sentences.slice(i, i + 2).join(' '));
  }

  return groups.filter(Boolean);
}

function beautifyGeneratedPost(text: string, params: FBPostParams): string {
  const paragraphs = buildParagraphsForFacebook(text);
  if (paragraphs.length === 0) return text;

  const decorated: string[] = [];

  paragraphs.forEach((rawParagraph, index) => {
    let paragraph = compactParagraphLines(beautifyListLines(rawParagraph));
    const prefix = getParagraphPrefix(paragraph, index, params);

    if (prefix) {
      paragraph = `${prefix}${paragraph}`;
    }

    if (index > 0 && shouldInsertDividerBefore(paragraph) && decorated[decorated.length - 1] !== FB_DECORATION_DIVIDER) {
      decorated.push(FB_DECORATION_DIVIDER);
    }

    decorated.push(paragraph);
  });

  let result = joinDecoratedParagraphs(decorated)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (params.ctaStandard?.trim()) {
    const normalizedResult = stripVietnamese(result).toLowerCase();
    const normalizedCta = stripVietnamese(params.ctaStandard).toLowerCase();
    const ctaProbe = normalizedCta.slice(0, Math.min(24, normalizedCta.length));

    if (ctaProbe && !normalizedResult.includes(ctaProbe)) {
      result += `\n${FB_DECORATION_DIVIDER}\n📲 ${params.ctaStandard.trim()}`;
    }
  }

  return ensureFixedFooter(result);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GenerateFBPost() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('mode') === 'edit';

  const [params, setParams]       = useState<FBPostParams | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [postText, setPostText]   = useState('');
  const [error, setError]         = useState('');
  const [copied, setCopied]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [savedId, setSavedId]     = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [sideTab, setSideTab]     = useState<'emoji' | 'tips'>('emoji');
  const [emojiCat, setEmojiCat]   = useState(0);
  const [editorFontSize, setEditorFontSize] = useState(15);

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const abortRef     = useRef<AbortController | null>(null);

  // ── Load params & auto-generate ──────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('fb_post_params');
    const rawEditSession = localStorage.getItem(FB_POST_EDIT_SESSION_KEY);
    const savedFontSize = Number(localStorage.getItem('fb_editor_font_size'));
    if (Number.isFinite(savedFontSize) && savedFontSize >= 13 && savedFontSize <= 22) {
      setEditorFontSize(savedFontSize);
    }
    if (isEditMode) {
      if (!rawEditSession) {
        router.replace('/quan-ly-bai-fb');
        return;
      }

      try {
        const session: FBPostEditSession = JSON.parse(rawEditSession);
        setParams(session.params);
        setPostText(session.content || '');
        setSavedId(session.id);
        setGenerating(false);
        setProgress(0);
        setCurrentStep('');
        setError('');
        setSaved(false);
        return;
      } catch {
        router.replace('/quan-ly-bai-fb');
        return;
      }
    }

    if (!raw) { router.replace('/viet-bai-facebook'); return; }
    const p: FBPostParams = JSON.parse(raw);
    setParams(p);
    generatePost(p);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  useEffect(() => {
    localStorage.setItem('fb_editor_font_size', String(editorFontSize));
  }, [editorFontSize]);

  // ── Generate ─────────────────────────────────────────────────────────────────
  const generatePost = useCallback(async (p: FBPostParams) => {
    setGenerating(true);
    setProgress(15);
    setCurrentStep('Đang phân tích từ khóa...');
    setError('');
    setPostText('');
    setSaved(false);
    setSavedId(null);

    abortRef.current = new AbortController();

    try {
      setProgress(40);
      setCurrentStep('AI đang viết bài post...');

      const res = await fetch('/api/facebook-post/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
        signal: abortRef.current.signal,
      });

      const json = await res.json();
      console.log('[generatePost] API response:', { ok: res.ok, success: json.success, postLength: json.data?.post?.length });

      if (!res.ok || !json.success) throw new Error(json.error || 'Không thể tạo bài post');

      const postContent = json.data?.post?.trim() ?? '';
      if (!postContent) {
        throw new Error('AI trả về nội dung trống. Thử lại hoặc đổi model.');
      }

      setProgress(95);
      setCurrentStep('Hoàn tất!');
      setPostText(beautifyGeneratedPost(postContent, p));
      setProgress(100);
      setTimeout(() => { setGenerating(false); setCurrentStep(''); }, 400);

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Đã hủy tạo bài post');
      } else {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      }
      setGenerating(false);
    }
  }, []);

  // ── Insert emoji at cursor position ──────────────────────────────────────────
  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setPostText(prev => prev + emoji);
      return;
    }
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const newText = postText.slice(0, start) + emoji + postText.slice(end);
    setPostText(newText);
    // Restore cursor after emoji
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  // ── Copy ─────────────────────────────────────────────────────────────────────
  function handleCopy() {
    navigator.clipboard.writeText(postText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // ── Save to DB ───────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!params || !postText || saving) return;
    setSaving(true);
    try {
      const url = savedId ? `/api/facebook-posts/${savedId}` : '/api/facebook-posts';
      const method = savedId ? 'PATCH' : 'POST';
      const body = savedId
        ? { content: postText, wordCount, emojiCount }
        : {
            keyword:    params.keyword,
            content:    postText,
            shopName:   params.shopName   || null,
            industry:   params.industry   || null,
            tone:       params.tone,
            template:   params.template   || null,
            wordCount,
            emojiCount,
          };

      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Lỗi lưu bài');

      if (!savedId) setSavedId(json.data.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[handleSave]', err);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    router.back();
  }

  function handleRegenerate() {
    if (params) generatePost(params);
  }

  function handleBeautifyPost() {
    if (!params || !postText.trim()) return;
    setPostText(beautifyGeneratedPost(postText, params));
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const wordCount   = countWords(postText);
  const emojiCount  = countEmojis(postText);
  const hashtagCount = countHashtags(postText);
  const readTime    = estimateReadTime(wordCount);
  const contentTextStyle = {
    fontSize: `${editorFontSize}px`,
    lineHeight: editorFontSize >= 18 ? 1.72 : 1.58,
  } as const;

  const getWordCountColor = () => {
    if (!params) return 'text-gray-600';
    const diff = Math.abs(wordCount - params.wordCount);
    if (diff <= 20) return 'text-green-600';
    if (diff <= 50) return 'text-yellow-600';
    return 'text-red-500';
  };

  if (!params) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-5 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">📱</span>
          <div>
            <h1 className="text-base font-bold text-gray-900">Tạo bài Facebook Post</h1>
            <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
              <span className="font-medium text-gray-600">{params.keyword}</span>
              {params.template && <><span>·</span><span>{TEMPLATE_LABELS[params.template]}</span></>}
              <span>·</span><span>~{params.wordCount} từ</span>
              {params.shopName && <><span>·</span><span>{params.shopName}</span></>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {postText && !generating && (
            <>
              <button onClick={handleCopy}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  copied ? 'bg-green-100 text-green-700 border-green-300' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}>
                {copied ? '✓ Đã copy!' : '📋 Copy'}
              </button>
              <button onClick={handleSave} disabled={saving}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                  saved    ? 'bg-green-100 text-green-700 border-green-300'
                  : saving ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait'
                  : savedId ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}>
                {saved ? '✓ Đã lưu!' : saving ? '⏳ Đang lưu...' : savedId ? '🔄 Cập nhật' : '💾 Lưu bài'}
              </button>
              <button onClick={handleRegenerate}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5">
                🔄 Viết lại
              </button>
              <button onClick={handleBeautifyPost}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5">
                ✨ Trang trí
              </button>
            </>
          )}
          <button onClick={handleCancel}
            className="px-3.5 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
            {generating ? 'Hủy' : '← Quay lại'}
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">

        {/* ── Left: Editor column ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Stats bar */}
          {postText && (
            <div className="flex items-center gap-0 border-b border-gray-200 bg-white px-4 shrink-0">
              {[
                { icon: '📝', label: 'Số từ',  value: wordCount.toString(),    color: getWordCountColor(),
                  sub: `mục tiêu ${params.wordCount}` },
                { icon: '😊', label: 'Emoji',   value: emojiCount.toString(),   color: emojiCount > 7 ? 'text-orange-500' : 'text-green-600',
                  sub: emojiCount > 7 ? 'Hơi nhiều' : 'Vừa đủ' },
                { icon: '#️⃣', label: 'Hashtag', value: hashtagCount.toString(), color: 'text-purple-600',
                  sub: 'nên 3–5' },
                { icon: '⏱️', label: 'Đọc',     value: readTime,               color: 'text-blue-600',
                  sub: 'thời gian đọc' },
              ].map((s, i) => (
                <div key={s.label} className={`flex items-center gap-2.5 px-4 py-2.5 ${i > 0 ? 'border-l border-gray-100' : ''}`}>
                  <span className="text-base">{s.icon}</span>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                      <span className="text-xs text-gray-400">{s.label}</span>
                    </div>
                    <p className="text-xs text-gray-400">{s.sub}</p>
                  </div>
                </div>
              ))}
              <div className="ml-auto flex items-center gap-2 pl-4">
                <button onClick={handleRegenerate} disabled={generating}
                  className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-40 flex items-center gap-1.5">
                  🔄 Viết lại
                </button>
                <button onClick={handleBeautifyPost}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5">
                  ✨ Trang trí
                </button>
                <button onClick={handleSave} disabled={saving}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    saved    ? 'bg-green-100 text-green-700 border-green-200'
                    : saving ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait'
                    : savedId ? 'bg-purple-50 text-purple-700 border-purple-300'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {saved ? '✓ Đã lưu!' : saving ? '⏳...' : savedId ? '🔄 Update' : '💾 Lưu'}
                </button>
                <button onClick={handleCopy}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    copied ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                  {copied ? '✓ Đã copy!' : '📋 Copy bài'}
                </button>
              </div>
            </div>
          )}

          {/* Main area: split view */}
          <div className="flex-1 overflow-hidden flex">

            {/* Editor */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Editor header */}
              <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50 shrink-0">
                <span className="text-xs text-gray-400">✏️</span>
                <span className="text-xs font-semibold text-gray-600">Chỉnh sửa bài viết</span>
                <div className="ml-auto flex items-center gap-2">
                  <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-1.5 py-1 bg-white">
                    <button
                      onClick={() => setEditorFontSize(size => Math.max(13, size - 1))}
                      className="px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-700"
                      title="Giảm cỡ chữ editor/preview"
                    >
                      A-
                    </button>
                    <span className="text-[11px] font-semibold text-gray-500 min-w-[38px] text-center">
                      {editorFontSize}px
                    </span>
                    <button
                      onClick={() => setEditorFontSize(size => Math.min(22, size + 1))}
                      className="px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-700"
                      title="Tăng cỡ chữ editor/preview"
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>

              {/* Loading / Error states */}
              {generating && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800">{currentStep}</p>
                    <p className="text-xs text-gray-400 mt-1">Vui lòng chờ...</p>
                  </div>
                  <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-blue-500">{progress}%</p>
                </div>
              )}

              {error && !generating && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                  <span className="text-4xl">⚠️</span>
                  <p className="text-sm font-semibold text-red-700">Tạo bài thất bại</p>
                  <p className="text-sm text-red-500 text-center">{error}</p>
                  <button onClick={handleRegenerate}
                    className="px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700">
                    Thử lại
                  </button>
                </div>
              )}

              {/* The editor textarea */}
              {!generating && (
                <textarea
                  ref={textareaRef}
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  className="fb-compatible-text flex-1 w-full px-5 py-4 text-sm text-gray-800 leading-7 resize-none focus:outline-none"
                  style={contentTextStyle}
                  placeholder={generating ? '' : 'Bài viết sẽ xuất hiện ở đây sau khi AI tạo xong...'}
                />
              )}

              {/* Footer hint */}
              {postText && !generating && (
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 shrink-0">
                  <p className="text-xs text-gray-400">
                    💡 Click emoji bên phải → chèn tại vị trí con trỏ •
                    Nút <strong>✨ Trang trí</strong> để tự động format bài •
                    Cỡ chữ A±  chỉ áp dụng cho editor/preview
                  </p>
                </div>
              )}
            </div>

            {/* Facebook preview panel */}
            {postText && !generating && (
              <div className="w-80 border-l border-gray-200 overflow-y-auto bg-gray-50 flex-shrink-0">
                <div className="p-3 border-b border-gray-200 bg-white">
                  <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                    <span>📘</span> Preview Facebook
                  </p>
                </div>
                <div className="p-3">
                  {/* FB card */}
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                    {/* Header */}
                    <div className="flex items-center gap-2.5 p-3 border-b border-gray-100">
                      <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {(params.shopName || 'N').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{params.shopName || 'Nội Thất Minh Quân'}</p>
                        <p className="text-xs text-gray-400">Vừa xong · 🌐</p>
                      </div>
                      <span className="text-gray-300 text-sm">···</span>
                    </div>
                    {/* Content */}
                    <div
                      className="fb-compatible-text p-3 whitespace-pre-wrap text-xs text-gray-800 leading-relaxed max-h-[500px] overflow-y-auto"
                      style={contentTextStyle}
                    >
                      {postText}
                    </div>
                    {/* Reactions */}
                    <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                      <span>👍 💬 ↗</span>
                      <span>{wordCount} từ</span>
                    </div>
                    <div className="flex border-t border-gray-100">
                      {['👍 Thích', '💬 Comment', '↗ Chia sẻ'].map(a => (
                        <button key={a} className="flex-1 py-2 text-xs text-gray-500 hover:bg-gray-50 font-medium">{a}</button>
                      ))}
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-blue-800 mb-2">💡 Mẹo tăng reach</p>
                    {[
                      '⏰ Đăng: 7–9h, 12–13h, 19–21h',
                      '📸 3–5 ảnh sản phẩm thực tế',
                      '💬 Trả lời comment ngay 30 phút đầu',
                      '🔁 Boost nếu CTR > 2% sau 2h',
                    ].map(t => (
                      <p key={t} className="text-xs text-blue-700 mb-1">{t}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar: Tools ───────────────────────────────────────────── */}
        <div className="w-64 border-l border-gray-200 bg-white flex flex-col flex-shrink-0">

          {/* Sidebar tabs */}
          <div className="flex border-b border-gray-200">
            {[
              { key: 'emoji', label: '😊 Emoji' },
              { key: 'tips',  label: '📋 Tips'   },
            ].map(t => (
              <button key={t.key} onClick={() => setSideTab(t.key as 'emoji' | 'tips')}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                  sideTab === t.key
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ─── Emoji tab ──────────────────────────────────────────────── */}
          {sideTab === 'emoji' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">Click emoji → chèn vào vị trí con trỏ trong bài</p>
              </div>

              {/* Category tabs */}
              <div className="flex overflow-x-auto p-2 gap-1.5 border-b border-gray-100 shrink-0">
                {EMOJI_CATEGORIES.map((cat, idx) => (
                  <button key={idx} onClick={() => setEmojiCat(idx)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      emojiCat === idx
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Emoji grid */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-5 gap-1.5">
                  {EMOJI_CATEGORIES[emojiCat].emojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      title={`Chèn ${emoji}`}
                      disabled={!postText && !generating}
                      className="w-full aspect-square flex items-center justify-center text-xl rounded-lg hover:bg-blue-50 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-blue-200"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Quick insert section */}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">⚡ Chèn nhanh cho bán hàng</p>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Mở bài hook',    text: '🔥 ' },
                      { label: 'Bullet điểm',    text: '✅ ' },
                      { label: 'Giá / Deal',     text: '💰 ' },
                      { label: 'Giao hàng',      text: '🚚 ' },
                      { label: 'Liên hệ CTA',    text: '📲 ' },
                      { label: 'Đường kẻ ngang', text: '━━━━━━━━━━━━━━━\n' },
                      { label: 'Tạo độ sâu',    text: '👇\n' },
                      { label: 'Urgency',        text: '⏰ SỐ LƯỢNG CÓ HẠN!' },
                    ].map(q => (
                      <button
                        key={q.label}
                        onClick={() => insertEmoji(q.text)}
                        disabled={!postText && !generating}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs hover:bg-blue-50 transition-colors border border-gray-100 hover:border-blue-200 disabled:opacity-30"
                      >
                        <span className="text-base shrink-0">{q.text.trim().slice(0, 2)}</span>
                        <span className="text-gray-700">{q.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Separator lines */}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">✦ Đường kẻ trang trí</p>
                  <div className="space-y-1.5">
                    {[
                      '━━━━━━━━━━━━━━━',
                      '▬▬▬▬▬▬▬▬▬▬▬▬▬',
                      '✦ ✦ ✦ ✦ ✦ ✦ ✦',
                      '🌟🌟🌟🌟🌟🌟🌟',
                      '— — — — — — —',
                      '◈◈◈◈◈◈◈◈◈◈',
                      '❋❋❋❋❋❋❋❋❋❋',
                      '⭐⭐⭐⭐⭐⭐⭐',
                    ].map(sep => (
                      <button key={sep} onClick={() => insertEmoji('\n' + sep + '\n')}
                        disabled={!postText && !generating}
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs text-gray-700 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 transition-colors text-center font-mono disabled:opacity-30">
                        {sep}
                      </button>
                    ))}
                  </div>
                </div>

                {/* FB structure blocks */}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">🏗️ Cấu trúc bài FB</p>
                  <div className="space-y-1.5">
                    {[
                      { label: '🔥 Hook mở bài',          text: '🔥 ',                              hint: 'Câu đầu kéo người đọc'    },
                      { label: '✅ Bullet ưu điểm',        text: '✅ ',                              hint: 'Một điểm bán hàng'        },
                      { label: '📦 Thông số kỹ thuật',     text: '📦 Thông số:\n- ',                 hint: 'Specs sản phẩm'           },
                      { label: '💰 Giá / Deal',             text: '💰 Giá: ',                        hint: 'Dòng giá nổi bật'         },
                      { label: '🚚 Giao hàng',              text: '🚚 Giao hàng: ',                  hint: 'Shipping info'            },
                      { label: '📞 CTA liên hệ',           text: '📞 Liên hệ: ',                    hint: 'Hotline / inbox'          },
                      { label: '📍 Địa chỉ kho',           text: '📍 Kho: ',                        hint: 'Địa chỉ lấy hàng'        },
                      { label: '⏰ Urgency',               text: '⏰ SỐ LƯỢNG CÓ HẠN — đặt ngay!', hint: 'Tạo khan hiếm'           },
                      { label: '━━━ Divider',              text: '\n━━━━━━━━━━━━━━━\n',             hint: 'Đường kẻ phân cách'      },
                      { label: '👇 Xem thêm',              text: '\n👇\n',                           hint: 'Kéo expand bài'          },
                      { label: '【 Tiêu đề 】',           text: '【 ',                              hint: 'Khung tiêu đề nổi bật'   },
                      { label: '▸ Bullet đơn giản',        text: '▸ ',                              hint: 'Bullet nhẹ, không emoji'  },
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={() => insertEmoji(item.text)}
                        disabled={!postText && !generating}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 text-left transition-colors disabled:opacity-30 group"
                      >
                        <span className="text-sm shrink-0 w-5 text-center">{item.label.split(' ')[0]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 group-hover:text-blue-700 truncate">{item.label}</p>
                          <p className="text-xs text-gray-400">{item.hint}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trust / Bảo hành — nội thất */}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">🔒 Uy tín / Bảo hành</p>
                  <div className="space-y-1.5">
                    {[
                      { label: '🏭 Hàng từ xưởng',        text: '🏭 Hàng sản xuất trực tiếp từ xưởng — không qua trung gian.',      hint: 'USP giá xưởng'             },
                      { label: '🔒 Bảo hành 12 tháng',    text: '🔒 Bảo hành 12 tháng — đổi mới nếu lỗi kết cấu hoặc hàn.',        hint: 'Cam kết chất lượng'        },
                      { label: '🪛 Đặt theo yêu cầu',     text: '🪛 Nhận đặt theo kích thước yêu cầu — giao trong 5–7 ngày.',       hint: 'Gia công custom'           },
                      { label: '⚡ Giao hỏa tốc HCM',     text: '⚡ Giao hỏa tốc nội thành TP.HCM trong 2–4h.',                    hint: 'Tốc độ giao hàng'          },
                      { label: '🚛 Giao toàn quốc',       text: '🚛 Giao toàn quốc 1–3 ngày — đóng gói chắc chắn, nguyên kiện.',   hint: 'Ship toàn quốc'            },
                      { label: '📋 Xuất hoá đơn VAT',     text: '📋 Xuất hoá đơn VAT theo yêu cầu.',                               hint: 'Cho B2B, công ty'          },
                      { label: '📏 Kích thước chuẩn',     text: '📏 Kích thước: ',                                                  hint: 'Điền mm/cm vào sau'        },
                      { label: '⚖️ Tải trọng',            text: '⚖️ Tải trọng: ',                                                   hint: 'Điền kg tải trọng vào sau' },
                      { label: '🎨 Màu sắc / chất liệu',  text: '🎨 Chất liệu: \n🎨 Màu sắc: ',                                    hint: 'Thông số vật liệu'         },
                      { label: '🏪 Xem tại kho',          text: '🏪 Xem hàng thực tế tại kho: A7/8 đường 1C, Vĩnh Lộc B, Bình Chánh.', hint: 'Địa chỉ kho Minh Quân' },
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={() => insertEmoji(item.text)}
                        disabled={!postText && !generating}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-gray-100 hover:border-green-300 hover:bg-green-50 text-left transition-colors disabled:opacity-30 group"
                      >
                        <span className="text-sm shrink-0 w-5 text-center">{item.label.split(' ')[0]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 group-hover:text-green-700 truncate">{item.label}</p>
                          <p className="text-xs text-gray-400">{item.hint}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tips tab ───────────────────────────────────────────────── */}
          {sideTab === 'tips' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Thông tin bài */}
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">📊 Thông tin bài viết</p>
                <div className="space-y-2">
                  {[
                    { label: 'Từ khóa',     value: params.keyword },
                    { label: 'Template',    value: params.template ? TEMPLATE_LABELS[params.template] : 'AI tự chọn' },
                    { label: 'Giọng văn',   value: params.tone === 'friendly' ? 'Thân thiện' : params.tone === 'professional' ? 'Chuyên nghiệp' : params.tone === 'casual' ? 'Tự nhiên' : 'Bán hàng mạnh' },
                    { label: 'Mục tiêu',    value: `${params.wordCount} từ` },
                    { label: 'Thực tế',     value: `${wordCount} từ` },
                  ].map(info => (
                    <div key={info.label} className="flex justify-between text-xs">
                      <span className="text-gray-400">{info.label}</span>
                      <span className="text-gray-700 font-medium text-right max-w-[60%] truncate">{info.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emoji guide */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs font-bold text-yellow-900 mb-2">📖 Quy tắc dùng emoji</p>
                <ul className="text-xs text-yellow-800 space-y-1.5">
                  <li>✔ Đặt đầu đoạn hoặc cuối câu</li>
                  <li>✔ Dùng để highlight điểm mạnh (giá, giao hàng, CTA)</li>
                  <li>✔ Bài 100–200 từ: 3–5 emoji</li>
                  <li>✔ Bài 300+ từ: 5–10 emoji</li>
                  <li>✘ Không đặt giữa câu — phá nhịp đọc</li>
                  <li>✘ Không dùng quá nhiều loại khác nhau</li>
                  <li>✘ Tránh emoji không liên quan đến ngành</li>
                </ul>
              </div>

              {/* Facebook algo tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-bold text-blue-900 mb-2">🎯 Tối ưu Facebook Reach</p>
                <ul className="text-xs text-blue-800 space-y-1.5">
                  <li>📌 Hook mạnh ở 2 dòng đầu — quyết định "Xem thêm"</li>
                  <li>💬 Kết bằng câu hỏi → tăng comment</li>
                  <li>📸 Ảnh đầu tiên là quan trọng nhất</li>
                  <li>🕐 Không edit bài trong 30 phút đầu sau đăng</li>
                  <li>🔁 Tag fanpage liên quan để mở rộng reach</li>
                  <li>📊 Check insight sau 2h — boost nếu CTR &gt; 2%</li>
                </ul>
              </div>

              {/* Hashtag gợi ý */}
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">🔖 Hashtag phổ biến</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '#noithat', '#giuongsat', '#tuquanao', '#noithatgiare',
                    '#giaxuong', '#noithatphongngu', '#noithatminhquan',
                    '#noithattphcm', '#muanoithat', '#giuongtang',
                    '#bantruong', '#banhang', '#dealnoithat',
                  ].map(tag => (
                    <button key={tag} onClick={() => insertEmoji('\n' + tag)}
                      disabled={!postText}
                      className="px-2 py-0.5 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-600 rounded text-xs transition-colors disabled:opacity-30">
                      {tag}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Click để thêm vào cuối bài</p>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
