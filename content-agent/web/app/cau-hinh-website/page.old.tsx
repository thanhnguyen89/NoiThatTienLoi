'use client';

import { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebsiteConfig {
  id: string;
  name: string;
  url: string;
  platform: string;
  apiUrl: string;
  username: string | null;
  appPassword: string | null;
  hasPassword: boolean;
  defaultCategory: number | null;
  defaultAuthorId: number | null;
  defaultStatus: string;
  isActive: boolean;
  isDefault: boolean;
}

interface SocialPlatform {
  id: string;
  type: string;
  name: string;
  pageId: string | null;
  pageUrl: string | null;
  accessToken: string | null;
  hasToken: boolean;
  accessTokenExpiry: string | null;
  isActive: boolean;
  isDefault: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOCIAL_TYPES = [
  { value: 'FACEBOOK_PAGE', label: 'Facebook Page',  icon: '📘', color: 'blue'   },
  { value: 'TIKTOK',        label: 'TikTok',         icon: '🎵', color: 'gray'   },
  { value: 'ZALO_OA',       label: 'Zalo OA',        icon: '💬', color: 'blue'   },
  { value: 'INSTAGRAM',     label: 'Instagram',      icon: '📸', color: 'pink'   },
  { value: 'YOUTUBE',       label: 'YouTube',        icon: '▶️',  color: 'red'    },
  { value: 'THREADS',       label: 'Threads',        icon: '🧵', color: 'gray'   },
];

const STATUS_OPTIONS = [
  { value: 'draft',   label: 'Nháp (draft)' },
  { value: 'publish', label: 'Đăng ngay (publish)' },
  { value: 'pending', label: 'Chờ duyệt (pending)' },
];

// ─── Empty forms ──────────────────────────────────────────────────────────────

const emptyWebsite: Omit<WebsiteConfig, 'id' | 'hasPassword'> = {
  name: '', url: '', platform: 'wordpress', apiUrl: '',
  username: '', appPassword: '',
  defaultCategory: null, defaultAuthorId: null, defaultStatus: 'draft',
  isActive: true, isDefault: false,
};

const emptySocial: Omit<SocialPlatform, 'id' | 'hasToken'> = {
  type: 'FACEBOOK_PAGE', name: '', pageId: '', pageUrl: '',
  accessToken: '', accessTokenExpiry: null,
  isActive: true, isDefault: false,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CauHinhWebsitePage() {
  const [tab, setTab]               = useState<'website' | 'social'>('website');

  // Website state
  const [websites, setWebsites]     = useState<WebsiteConfig[]>([]);
  const [wLoading, setWLoading]     = useState(true);
  const [showWModal, setShowWModal] = useState(false);
  const [editingW, setEditingW]     = useState<WebsiteConfig | null>(null);
  const [wForm, setWForm]           = useState({ ...emptyWebsite });
  const [wSaving, setWSaving]       = useState(false);
  const [wTestResult, setWTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [wTesting, setWTesting]     = useState(false);

  // Social state
  const [socials, setSocials]       = useState<SocialPlatform[]>([]);
  const [sLoading, setSLoading]     = useState(true);
  const [showSModal, setShowSModal] = useState(false);
  const [editingS, setEditingS]     = useState<SocialPlatform | null>(null);
  const [sForm, setSForm]           = useState({ ...emptySocial });
  const [sSaving, setSSaving]       = useState(false);

  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    document.title = 'Cấu hình Website — Content Agent';
    loadWebsites();
    loadSocials();
  }, []);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Website CRUD ─────────────────────────────────────────────────────────────

  async function loadWebsites() {
    setWLoading(true);
    try {
      const res = await fetch('/api/website-configs');
      const json = await res.json();
      if (json.success) setWebsites(json.data);
    } catch { /* ignore */ } finally { setWLoading(false); }
  }

  function openAddWebsite() {
    setEditingW(null);
    setWForm({ ...emptyWebsite });
    setWTestResult(null);
    setShowWModal(true);
  }

  function openEditWebsite(w: WebsiteConfig) {
    setEditingW(w);
    setWForm({
      name: w.name, url: w.url, platform: w.platform, apiUrl: w.apiUrl,
      username: w.username || '', appPassword: '',  // luôn reset password field
      defaultCategory: w.defaultCategory, defaultAuthorId: w.defaultAuthorId,
      defaultStatus: w.defaultStatus,
      isActive: w.isActive, isDefault: w.isDefault,
    });
    setWTestResult(null);
    setShowWModal(true);
  }

  async function saveWebsite() {
    if (!wForm.name.trim() || !wForm.url.trim() || !wForm.apiUrl.trim()) {
      showToast('Vui lòng điền tên, URL và API URL', false);
      return;
    }
    setWSaving(true);
    try {
      const body = editingW ? { ...wForm, id: editingW.id } : wForm;
      const res = await fetch('/api/website-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        showToast(editingW ? 'Đã cập nhật website' : 'Đã thêm website');
        setShowWModal(false);
        loadWebsites();
      } else { showToast(json.error || 'Lỗi lưu', false); }
    } catch { showToast('Lỗi kết nối', false); } finally { setWSaving(false); }
  }

  async function deleteWebsite(id: string, name: string) {
    if (!confirm(`Xóa "${name}"?`)) return;
    try {
      const res = await fetch(`/api/website-configs?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { showToast('Đã xóa'); loadWebsites(); }
      else showToast(json.error || 'Lỗi xóa', false);
    } catch { showToast('Lỗi kết nối', false); }
  }

  async function testWordPressConnection() {
    if (!wForm.apiUrl.trim()) { showToast('Nhập API URL trước', false); return; }
    setWTesting(true);
    setWTestResult(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (wForm.username && wForm.appPassword) {
        const cred = btoa(`${wForm.username}:${wForm.appPassword}`);
        headers['X-WP-Auth'] = cred;
      }
      // Test bằng cách gọi WP users endpoint
      const testUrl = wForm.apiUrl.replace(/\/$/, '') + '/users/me';
      const res = await fetch('/api/website-configs/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: wForm.apiUrl, username: wForm.username, appPassword: wForm.appPassword }),
      });
      if (res.ok) {
        const json = await res.json();
        setWTestResult({ ok: json.success, msg: json.success ? `✓ Kết nối thành công — ${json.siteName || ''}` : json.error || 'Kết nối thất bại' });
      } else {
        setWTestResult({ ok: false, msg: 'Không thể kết nối đến API' });
      }
    } catch {
      setWTestResult({ ok: false, msg: 'Lỗi kết nối mạng' });
    } finally { setWTesting(false); }
  }

  // ── Social CRUD ──────────────────────────────────────────────────────────────

  async function loadSocials() {
    setSLoading(true);
    try {
      const res = await fetch('/api/social-platforms');
      const json = await res.json();
      if (json.success) setSocials(json.data);
    } catch { /* ignore */ } finally { setSLoading(false); }
  }

  function openAddSocial() {
    setEditingS(null);
    setSForm({ ...emptySocial });
    setShowSModal(true);
  }

  function openEditSocial(s: SocialPlatform) {
    setEditingS(s);
    setSForm({
      type: s.type, name: s.name, pageId: s.pageId || '',
      pageUrl: s.pageUrl || '', accessToken: '',  // reset
      accessTokenExpiry: s.accessTokenExpiry,
      isActive: s.isActive, isDefault: s.isDefault,
    });
    setShowSModal(true);
  }

  async function saveSocial() {
    if (!sForm.name.trim()) { showToast('Nhập tên nền tảng', false); return; }
    setSSaving(true);
    try {
      const body = editingS ? { ...sForm, id: editingS.id } : sForm;
      const res = await fetch('/api/social-platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        showToast(editingS ? 'Đã cập nhật' : 'Đã thêm nền tảng');
        setShowSModal(false);
        loadSocials();
      } else { showToast(json.error || 'Lỗi lưu', false); }
    } catch { showToast('Lỗi kết nối', false); } finally { setSSaving(false); }
  }

  async function deleteSocial(id: string, name: string) {
    if (!confirm(`Xóa "${name}"?`)) return;
    try {
      const res = await fetch(`/api/social-platforms?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { showToast('Đã xóa'); loadSocials(); }
      else showToast(json.error || 'Lỗi xóa', false);
    } catch { showToast('Lỗi kết nối', false); }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function getSocialMeta(type: string) {
    return SOCIAL_TYPES.find(t => t.value === type) || { icon: '🌐', label: type, color: 'gray' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-5">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Cấu Hình Website & Nền Tảng</h1>
              <p className="text-sm text-gray-500">Kết nối website WordPress và các kênh mạng xã hội để đăng bài trực tiếp</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1.5">
          {[
            { key: 'website', icon: '🌐', label: 'Website / WordPress', count: websites.length },
            { key: 'social',  icon: '📱', label: 'Mạng xã hội',        count: socials.length  },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'website' | 'social')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${tab === t.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Website ─────────────────────────────────────────────────── */}
        {tab === 'website' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-gray-800">Website WordPress</p>
                <p className="text-xs text-gray-400">Kết nối qua WordPress REST API để đăng bài tự động</p>
              </div>
              <button onClick={openAddWebsite}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <span>+</span> Thêm website
              </button>
            </div>

            {wLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : websites.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <p className="text-4xl mb-3">🌐</p>
                <p className="text-gray-700 font-semibold mb-1">Chưa có website nào</p>
                <p className="text-sm text-gray-400 mb-4">Thêm website WordPress để có thể đăng bài trực tiếp sau khi viết xong</p>
                <button onClick={openAddWebsite} className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                  + Thêm website đầu tiên
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {websites.map(w => (
                  <div key={w.id} className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${w.isDefault ? 'border-blue-500' : w.isActive ? 'border-green-400' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${w.isActive ? 'bg-blue-50' : 'bg-gray-100'}`}>
                          🌐
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm">{w.name}</p>
                            {w.isDefault && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Mặc định</span>}
                            {!w.isActive && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Tắt</span>}
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {STATUS_OPTIONS.find(s => s.value === w.defaultStatus)?.label || w.defaultStatus}
                            </span>
                          </div>
                          <a href={w.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-0.5 block truncate">
                            {w.url}
                          </a>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                            <span>API: {w.apiUrl.replace(/https?:\/\//, '')}</span>
                            {w.username && <span>· Tài khoản: {w.username}</span>}
                            {w.hasPassword && <span className="text-green-600">· 🔑 Đã có mật khẩu</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => openEditWebsite(w)}
                          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                          Sửa
                        </button>
                        <button onClick={() => deleteWebsite(w.id, w.name)}
                          className="px-3 py-1.5 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-600">
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hướng dẫn */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">📖 Hướng dẫn lấy Application Password từ WordPress</p>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Vào <strong>WordPress Admin → Users → Profile</strong></li>
                <li>Kéo xuống phần <strong>Application Passwords</strong></li>
                <li>Nhập tên (ví dụ: &quot;Content Agent&quot;) → click <strong>Add New Application Password</strong></li>
                <li>Copy mật khẩu vừa tạo và dán vào ô App Password ở trên</li>
                <li>API URL thường là: <code className="bg-blue-100 px-1 rounded">https://yoursite.com/wp-json/wp/v2</code></li>
              </ol>
            </div>
          </div>
        )}

        {/* ── Tab: Social ──────────────────────────────────────────────────── */}
        {tab === 'social' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-gray-800">Kênh mạng xã hội</p>
                <p className="text-xs text-gray-400">Facebook Page, TikTok, Zalo OA, Instagram, YouTube</p>
              </div>
              <button onClick={openAddSocial}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <span>+</span> Thêm kênh
              </button>
            </div>

            {/* Platform type summary */}
            <div className="grid grid-cols-3 gap-3">
              {SOCIAL_TYPES.map(t => {
                const count = socials.filter(s => s.type === t.value).length;
                return (
                  <div key={t.value} className={`bg-white rounded-xl border-2 p-3 text-center ${count > 0 ? 'border-green-300' : 'border-gray-100'}`}>
                    <p className="text-2xl mb-1">{t.icon}</p>
                    <p className="text-xs font-semibold text-gray-700">{t.label}</p>
                    <p className={`text-xs mt-0.5 ${count > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                      {count > 0 ? `${count} kết nối` : 'Chưa có'}
                    </p>
                  </div>
                );
              })}
            </div>

            {sLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : socials.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-10 text-center">
                <p className="text-4xl mb-3">📱</p>
                <p className="text-gray-700 font-semibold mb-1">Chưa có kênh nào</p>
                <p className="text-sm text-gray-400 mb-4">Thêm Facebook Page, TikTok hoặc Zalo OA để đăng bài trực tiếp</p>
                <button onClick={openAddSocial} className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                  + Thêm kênh đầu tiên
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {socials.map(s => {
                  const meta = getSocialMeta(s.type);
                  return (
                    <div key={s.id} className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${s.isDefault ? 'border-blue-500' : s.isActive ? 'border-green-400' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-xl shrink-0">
                            {meta.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{meta.label}</span>
                              {s.isDefault && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Mặc định</span>}
                              {!s.isActive && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Tắt</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              {s.pageId && <span>ID: {s.pageId}</span>}
                              {s.pageUrl && <a href={s.pageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{s.pageUrl.replace(/https?:\/\//, '')}</a>}
                              {s.hasToken && <span className="text-green-600">🔑 Đã có access token</span>}
                              {!s.hasToken && <span className="text-orange-500">⚠️ Chưa có token</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => openEditSocial(s)}
                            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                            Sửa
                          </button>
                          <button onClick={() => deleteSocial(s.id, s.name)}
                            className="px-3 py-1.5 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-600">
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Lưu ý */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Lưu ý về Access Token</p>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li><strong>Facebook:</strong> Cần Page Access Token từ Facebook Developers (có hạn 60 ngày, có thể gia hạn bằng Long-lived token)</li>
                <li><strong>TikTok:</strong> Cần Business API approval từ TikTok — liên hệ TikTok for Business</li>
                <li><strong>Zalo OA:</strong> Cần OA Access Token từ Zalo Developer Console</li>
                <li>Token hết hạn sẽ cần cập nhật lại thủ công</li>
              </ul>
            </div>
          </div>
        )}

      </div>

      {/* ── Modal: Website ───────────────────────────────────────────────────── */}
      {showWModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">
                {editingW ? 'Sửa website' : 'Thêm website WordPress'}
              </h2>
              <button onClick={() => setShowWModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tên */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tên website <span className="text-red-500">*</span></label>
                <input type="text" value={wForm.name} onChange={e => setWForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ví dụ: Nội Thất Minh Quân - Main Site"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">URL website <span className="text-red-500">*</span></label>
                <input type="url" value={wForm.url} onChange={e => setWForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://noithatminhquan.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              {/* API URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">WordPress REST API URL <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input type="url" value={wForm.apiUrl} onChange={e => setWForm(f => ({ ...f, apiUrl: e.target.value }))}
                    placeholder="https://noithatminhquan.com/wp-json/wp/v2"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button
                    onClick={() => {
                      if (wForm.url && !wForm.apiUrl) {
                        setWForm(f => ({ ...f, apiUrl: f.url.replace(/\/$/, '') + '/wp-json/wp/v2' }));
                      }
                    }}
                    className="px-3 py-2.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg whitespace-nowrap">
                    Tự điền
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Thường là URL website + /wp-json/wp/v2</p>
              </div>

              {/* Username + App Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tên đăng nhập WP</label>
                  <input type="text" value={wForm.username || ''} onChange={e => setWForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="admin"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    App Password
                    {editingW?.hasPassword && <span className="text-green-600 font-normal ml-1">(đã có — nhập để đổi)</span>}
                  </label>
                  <input type="password" value={wForm.appPassword || ''} onChange={e => setWForm(f => ({ ...f, appPassword: e.target.value }))}
                    placeholder={editingW?.hasPassword ? '••••••••' : 'xxxx xxxx xxxx xxxx xxxx xxxx'}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              {/* Test connection */}
              <div>
                <button onClick={testWordPressConnection} disabled={wTesting}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-2 disabled:opacity-50">
                  {wTesting ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : '🔌'}
                  Kiểm tra kết nối
                </button>
                {wTestResult && (
                  <p className={`text-xs mt-2 ${wTestResult.ok ? 'text-green-600' : 'text-red-600'}`}>{wTestResult.msg}</p>
                )}
              </div>

              {/* Phân cách */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 mb-3">CẤU HÌNH ĐĂNG BÀI MẶC ĐỊNH</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Category ID mặc định</label>
                    <input type="number" value={wForm.defaultCategory || ''} onChange={e => setWForm(f => ({ ...f, defaultCategory: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="1"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Trạng thái bài đăng</label>
                    <select value={wForm.defaultStatus} onChange={e => setWForm(f => ({ ...f, defaultStatus: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Switches */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'isActive',  label: 'Kích hoạt',      desc: 'Cho phép đăng bài' },
                  { key: 'isDefault', label: 'Đặt làm mặc định', desc: 'Site ưu tiên khi publish' },
                ].map(sw => (
                  <label key={sw.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      wForm[sw.key as keyof typeof wForm] ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <input type="checkbox"
                      checked={!!wForm[sw.key as keyof typeof wForm]}
                      onChange={e => setWForm(f => ({ ...f, [sw.key]: e.target.checked }))}
                      className="accent-blue-600" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{sw.label}</p>
                      <p className="text-xs text-gray-400">{sw.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
              <button onClick={() => setShowWModal(false)}
                className="px-5 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={saveWebsite} disabled={wSaving}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {wSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editingW ? 'Lưu thay đổi' : 'Thêm website'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Social Platform ───────────────────────────────────────────── */}
      {showSModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">
                {editingS ? 'Sửa kênh MXH' : 'Thêm kênh mạng xã hội'}
              </h2>
              <button onClick={() => setShowSModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Loại platform */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Nền tảng</label>
                <div className="grid grid-cols-3 gap-2">
                  {SOCIAL_TYPES.map(t => (
                    <button key={t.value} onClick={() => setSForm(f => ({ ...f, type: t.value }))}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all ${
                        sForm.type === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <span className="text-xl">{t.icon}</span>
                      <span className="text-xs font-medium text-gray-700">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tên */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tên kênh <span className="text-red-500">*</span></label>
                <input type="text" value={sForm.name} onChange={e => setSForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={`Ví dụ: Fanpage ${getSocialMeta(sForm.type).label} Nội Thất Minh Quân`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              {/* Page ID + URL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    {sForm.type === 'FACEBOOK_PAGE' ? 'Facebook Page ID' :
                     sForm.type === 'ZALO_OA'       ? 'Zalo OA ID'       :
                     sForm.type === 'TIKTOK'        ? 'TikTok Account ID' : 'ID kênh'}
                  </label>
                  <input type="text" value={sForm.pageId || ''} onChange={e => setSForm(f => ({ ...f, pageId: e.target.value }))}
                    placeholder="123456789..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Link profile / Fanpage</label>
                  <input type="url" value={sForm.pageUrl || ''} onChange={e => setSForm(f => ({ ...f, pageUrl: e.target.value }))}
                    placeholder="https://facebook.com/..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              {/* Access Token */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Access Token
                  {editingS?.hasToken && <span className="text-green-600 font-normal ml-1">(đã có — nhập để đổi)</span>}
                </label>
                <textarea value={sForm.accessToken || ''} onChange={e => setSForm(f => ({ ...f, accessToken: e.target.value }))}
                  placeholder={editingS?.hasToken ? '••••••••' : 'Dán access token vào đây...'}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono text-xs" />
                <p className="text-xs text-gray-400 mt-1">
                  {sForm.type === 'FACEBOOK_PAGE' && 'Lấy từ Facebook Graph API Explorer → Page Access Token'}
                  {sForm.type === 'ZALO_OA' && 'Lấy từ Zalo Developer Console → OA Access Token'}
                  {sForm.type === 'TIKTOK' && 'Cần TikTok Business API access'}
                </p>
              </div>

              {/* Switches */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'isActive',  label: 'Kích hoạt',        desc: 'Cho phép đăng bài' },
                  { key: 'isDefault', label: 'Kênh mặc định',    desc: 'Ưu tiên khi đăng' },
                ].map(sw => (
                  <label key={sw.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      sForm[sw.key as keyof typeof sForm] ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <input type="checkbox"
                      checked={!!sForm[sw.key as keyof typeof sForm]}
                      onChange={e => setSForm(f => ({ ...f, [sw.key]: e.target.checked }))}
                      className="accent-blue-600" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{sw.label}</p>
                      <p className="text-xs text-gray-400">{sw.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
              <button onClick={() => setShowSModal(false)}
                className="px-5 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={saveSocial} disabled={sSaving}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {sSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editingS ? 'Lưu thay đổi' : 'Thêm kênh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 transition-all ${
          toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.ok ? '✓' : '⚠️'} {toast.msg}
        </div>
      )}
    </div>
  );
}
