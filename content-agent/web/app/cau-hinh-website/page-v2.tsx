'use client';

import { useEffect, useState } from 'react';
import { useWebsiteConfig } from './hooks/useWebsiteConfig';
import WebsiteModal from './components/WebsiteModal';
import WebsiteCard from './components/WebsiteCard';
import { PLATFORM_TYPES } from './types';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CauHinhWebsitePage() {
  const [tab, setTab] = useState<'website' | 'social'>('website');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const {
    websites,
    loading,
    showModal,
    editingWebsite,
    formData,
    saving,
    setFormData,
    loadWebsites,
    openAddModal,
    openEditModal,
    closeModal,
    saveWebsite,
    deleteWebsite,
  } = useWebsiteConfig();

  useEffect(() => {
    document.title = 'Cấu hình Website — Content Agent';
    loadWebsites();
  }, [loadWebsites]);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    await saveWebsite(
      msg => showToast(msg, true),
      msg => showToast(msg, false)
    );
  }

  async function handleDelete(id: string, name: string) {
    await deleteWebsite(
      id,
      name,
      msg => showToast(msg, true),
      msg => showToast(msg, false)
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-5">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Cấu Hình Website & Nền Tảng</h1>
              <p className="text-sm text-gray-500">
                Kết nối website (WordPress, Shopify, Custom API) và các kênh mạng xã hội để đăng bài trực tiếp
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1.5">
          {[
            { key: 'website', icon: '🌐', label: 'Website / CMS', count: websites.length },
            { key: 'social', icon: '📱', label: 'Mạng xã hội', count: 0 },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'website' | 'social')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    tab === t.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Website ─────────────────────────────────────────────────── */}
        {tab === 'website' && (
          <div className="space-y-4">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-gray-800">Website & CMS</p>
                <p className="text-xs text-gray-400">
                  Hỗ trợ WordPress, Shopify, Wix, Custom API và nhiều nền tảng khác
                </p>
              </div>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <span>+</span> Thêm website
              </button>
            </div>

            {/* Platform Summary */}
            <div className="grid grid-cols-5 gap-3">
              {PLATFORM_TYPES.map(p => {
                const count = websites.filter(w => w.platform === p.value).length;
                return (
                  <div
                    key={p.value}
                    className={`bg-white rounded-xl border-2 p-3 text-center transition-all ${
                      count > 0 ? 'border-green-300 hover:shadow-md' : 'border-gray-100'
                    }`}
                  >
                    <p className="text-2xl mb-1">{p.icon}</p>
                    <p className="text-xs font-semibold text-gray-700">{p.label}</p>
                    <p className={`text-xs mt-0.5 ${count > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                      {count > 0 ? `${count} kết nối` : 'Chưa có'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Website List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : websites.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <p className="text-4xl mb-3">🌐</p>
                <p className="text-gray-700 font-semibold mb-1">Chưa có website nào</p>
                <p className="text-sm text-gray-400 mb-4">
                  Thêm website để có thể đăng bài trực tiếp sau khi viết xong
                </p>
                <button
                  onClick={openAddModal}
                  className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  + Thêm website đầu tiên
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {websites.map(w => (
                  <WebsiteCard key={w.id} website={w} onEdit={openEditModal} onDelete={handleDelete} />
                ))}
              </div>
            )}

            {/* Hướng dẫn */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">📖 Hướng dẫn kết nối</p>
              <div className="space-y-3 text-sm text-blue-800">
                <div>
                  <p className="font-semibold mb-1">WordPress:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Vào WordPress Admin → Users → Profile</li>
                    <li>
                      Kéo xuống phần <strong>Application Passwords</strong>
                    </li>
                    <li>
                      Nhập tên (ví dụ: &quot;Content Agent&quot;) → click <strong>Add New Application Password</strong>
                    </li>
                    <li>Copy mật khẩu và dán vào form</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold mb-1">Shopify / Custom API:</p>
                  <p className="ml-2">Cần API Key và API Secret từ admin panel của nền tảng tương ứng</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Social (Placeholder) ────────────────────────────────────── */}
        {tab === 'social' && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">📱</p>
            <p className="text-gray-700 font-semibold mb-1">Tính năng đang phát triển</p>
            <p className="text-sm text-gray-400">Quản lý kênh mạng xã hội sẽ sớm được bổ sung</p>
          </div>
        )}
      </div>

      {/* ── Modal: Website ───────────────────────────────────────────────────── */}
      <WebsiteModal
        isOpen={showModal}
        onClose={closeModal}
        editingWebsite={editingWebsite}
        formData={formData}
        onFormChange={setFormData}
        onSave={handleSave}
        isSaving={saving}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 transition-all ${
            toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.ok ? '✓' : '⚠️'} {toast.msg}
        </div>
      )}
    </div>
  );
}
