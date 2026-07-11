'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ModelPicker from '../components/ModelPicker';
import { SUPPORTED_LANGUAGES } from '@/lib/shared/options';

// ─── Constants ────────────────────────────────────────────────────────────────

const WRITING_MODES = [
  {
    value: 'expand',
    icon: '📈',
    label: 'Mở rộng + SEO hóa',
    desc: 'Giữ ý chính từ Facebook, thêm chiều sâu, số liệu, FAQ và cấu trúc SEO',
    badge: 'Khuyên dùng',
  },
  {
    value: 'rewrite',
    icon: '✍️',
    label: 'Viết lại hoàn toàn',
    desc: 'Dùng Facebook làm nguồn cảm hứng, viết bài mới độc lập — tránh duplicate',
  },
  {
    value: 'reformat',
    icon: '📐',
    label: 'Giữ nguyên ý + Format lại',
    desc: 'Giữ 100% nội dung, chỉ thêm H2/H3, chia đoạn và chuẩn hóa cấu trúc blog',
  },
];

const TARGET_LENGTHS = [
  { value: 800,  label: '~800 từ — Ngắn gọn'      },
  { value: 1200, label: '~1,200 từ — Chuẩn SEO'   },
  { value: 2000, label: '~2,000 từ — Chi tiết',    badge: 'Phổ biến' },
  { value: 3000, label: '~3,000 từ — Chuyên sâu'  },
];

const TONES = [
  { value: 'friendly',     label: '😊 Thân thiện',      desc: 'Gần gũi như người bạn tư vấn' },
  { value: 'professional', label: '💼 Chuyên nghiệp',   desc: 'Tư vấn chuyên gia, có thuật ngữ ngành' },
  { value: 'casual',       label: '💬 Bình thường',      desc: 'Tự nhiên, không quá khuôn phép' },
  { value: 'formal',       label: '🎓 Trang trọng',     desc: 'Học thuật, phù hợp tài liệu kỹ thuật' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VietTuFacebook() {
  const router = useRouter();

  const [keyword, setKeyword]               = useState('');
  const [secondaryKw, setSecondaryKw]       = useState('');
  const [fbContent, setFbContent]           = useState('');
  const [title, setTitle]                   = useState('');
  const [writingMode, setWritingMode]       = useState('expand');
  const [targetLength, setTargetLength]     = useState(2000);
  const [tone, setTone]                     = useState('friendly');
  const [language, setLanguage]             = useState('Vietnamese');
  const [provider, setProvider]             = useState('gemini-flash');
  const [autoTitle, setAutoTitle]           = useState(true);

  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Viết từ Facebook Post - Content Agent';
    const saved = localStorage.getItem('pipeline_provider') || 'gemini-flash';
    setProvider(saved);
  }, []);

  // Auto-generate title hint từ keyword
  useEffect(() => {
    if (autoTitle && keyword.trim()) {
      const kw = keyword.trim();
      const year = new Date().getFullYear();
      setTitle(`${kw.charAt(0).toUpperCase()}${kw.slice(1)}: Hướng dẫn đầy đủ ${year}`);
    }
  }, [keyword, autoTitle]);

  function handleProviderChange(id: string) {
    setProvider(id);
    localStorage.setItem('pipeline_provider', id);
  }

  function validate(): boolean {
    if (!keyword.trim()) { setError('Vui lòng nhập từ khóa SEO'); return false; }
    if (!fbContent.trim()) { setError('Vui lòng dán nội dung bài Facebook'); return false; }
    if (fbContent.trim().length < 50) { setError('Nội dung Facebook quá ngắn — tối thiểu 50 ký tự'); return false; }
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề bài blog'); return false; }
    setError('');
    return true;
  }

  function handleNext() {
    if (!validate()) return;

    const secKws = secondaryKw.split(',').map((k) => k.trim()).filter(Boolean);

    // Lưu vào localStorage để generate page đọc
    localStorage.setItem('fb2article_params', JSON.stringify({
      provider,
      keyword:           keyword.trim(),
      secondaryKeywords: secKws,
      fbContent:         fbContent.trim(),
      title:             title.trim(),
      writingMode,
      targetLength,
      tone,
      language,
    }));

    // Cho step4 biết keyword
    localStorage.setItem('pipeline_step1', JSON.stringify({
      keyword:      keyword.trim(),
      language,
      contentType:  'guide',
      targetLength,
    }));
    localStorage.setItem('pipeline_outline', JSON.stringify({
      secondaryKeywords: secKws,
      primaryKeyword:    keyword.trim(),
    }));

    router.push('/viet-tu-facebook/generate');
  }

  const charCount = fbContent.length;

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="w-full mx-auto space-y-4">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">📘</span>
                <h1 className="text-2xl font-bold text-gray-900">Viết từ Facebook Post</h1>
              </div>
              <p className="text-sm text-blue-600">
                Chuyển bài Facebook thành bài blog SEO chuẩn — 3 bước pipeline tự động
              </p>
            </div>
            <button onClick={() => router.back()}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              ← Quay lại
            </button>
          </div>

          {/* How it works */}
          <div className="mt-4 flex gap-2">
            {['📋 Dán bài Facebook', '🤖 AI chuyển đổi', '✏️ Chỉnh sửa & Đăng'].map((step, i) => (
              <div key={i} className="flex-1 flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                <span className="text-xs font-bold text-blue-400">0{i + 1}</span>
                <span className="text-xs text-blue-700 font-medium">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI Model ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm px-5 py-4">
          <ModelPicker value={provider} onChange={handleProviderChange} size="sm"
            label="Chọn AI Model để chuyển đổi" />
        </div>

        {/* ── Facebook Post ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📘</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Nội dung bài Facebook
                <span className="text-red-500 ml-1">*</span>
              </p>
              <p className="text-xs text-gray-400">Copy toàn bộ bài viết Facebook và dán vào đây</p>
            </div>
          </div>
          <textarea
            value={fbContent}
            onChange={(e) => { setFbContent(e.target.value); setError(''); }}
            placeholder={`Dán nội dung bài Facebook vào đây...\n\nVí dụ:\nHôm nay mình muốn chia sẻ về giường sắt 2 tầng — loại nội thất mình thấy nhiều gia đình trẻ đang tìm. Nhà chỉ 12m2 mà có 2 đứa con thì giường tầng là giải pháp tốt nhất...\n\n👉 Khung thép 1.4mm, chịu tải 200kg\n👉 Giá từ 2.8 triệu, giao toàn quốc\n👉 Bảo hành 3 năm`}
            rows={10}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 font-sans leading-relaxed"
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-400">
              {charCount < 50
                ? <span className="text-red-400">Cần ít nhất 50 ký tự</span>
                : <span className="text-green-600">✓ {charCount.toLocaleString()} ký tự</span>
              }
            </span>
            <span className="text-xs text-gray-400">Tối đa 3,000 ký tự được đưa vào AI</span>
          </div>
        </div>

        {/* ── Keyword ─────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Từ khóa SEO chính
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setError(''); }}
              placeholder="Ví dụ: giường sắt 2 tầng, tủ quần áo gỗ công nghiệp..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="text-xs text-gray-400 mt-1">Từ khóa AI sẽ tối ưu mật độ 1.0–1.5%</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Từ khóa phụ (LSI)
              <span className="text-xs font-normal text-gray-400 ml-2">Không bắt buộc — cách nhau bởi dấu phẩy</span>
            </label>
            <input
              type="text"
              value={secondaryKw}
              onChange={(e) => setSecondaryKw(e.target.value)}
              placeholder="Ví dụ: giường tầng sắt, giường 2 tầng trẻ em, giường tầng giá rẻ"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-800">
                Tiêu đề bài blog
                <span className="text-red-500 ml-1">*</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={autoTitle}
                  onChange={(e) => setAutoTitle(e.target.checked)}
                  className="accent-blue-600 w-3.5 h-3.5" />
                <span className="text-xs text-gray-500">Tự động từ keyword</span>
              </label>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setAutoTitle(false); }}
              placeholder="Tiêu đề bài blog SEO..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {title && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs ${title.length >= 50 && title.length <= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                  {title.length} ký tự {title.length >= 50 && title.length <= 70 ? '✓ Tốt' : '(nên 50–70)'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Writing Mode ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">Cách xử lý nội dung Facebook</p>
          <div className="space-y-2">
            {WRITING_MODES.map((m) => (
              <label key={m.value}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  writingMode === m.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}>
                <input type="radio" name="mode" checked={writingMode === m.value}
                  onChange={() => setWritingMode(m.value)}
                  className="mt-0.5 accent-blue-600 shrink-0" />
                <span className="text-xl shrink-0">{m.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                    {m.badge && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">{m.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Options row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Độ dài */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Độ dài bài viết</label>
            <div className="space-y-1.5">
              {TARGET_LENGTHS.map((l) => (
                <label key={l.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-all ${
                    targetLength === l.value ? 'border-blue-500 bg-blue-50 text-blue-800 font-medium' : 'border-gray-200 hover:border-blue-300 text-gray-700'
                  }`}>
                  <input type="radio" name="length" checked={targetLength === l.value}
                    onChange={() => setTargetLength(l.value)}
                    className="accent-blue-600 shrink-0" />
                  <span className="flex-1">{l.label}</span>
                  {l.badge && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">{l.badge}</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Giọng văn */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Giọng văn</label>
            <div className="space-y-1.5">
              {TONES.map((t) => (
                <label key={t.value}
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                    tone === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}>
                  <input type="radio" name="tone" checked={tone === t.value}
                    onChange={() => setTone(t.value)}
                    className="mt-0.5 accent-blue-600 shrink-0" />
                  <div>
                    <p className={`text-xs font-semibold ${tone === t.value ? 'text-blue-800' : 'text-gray-700'}`}>{t.label}</p>
                    <p className="text-xs text-gray-400">{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Language ─────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-semibold text-gray-800 mb-2">Ngôn ngữ bài viết</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {SUPPORTED_LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        {/* ── Error ────────────────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* ── Action ───────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Pipeline: Writer → SEO Specialist → Editor QC → Chỉnh sửa
          </p>
          <button onClick={handleNext}
            className="px-8 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <span>📘</span>
            <span>Tạo bài viết →</span>
          </button>
        </div>

      </div>
    </div>
  );
}
