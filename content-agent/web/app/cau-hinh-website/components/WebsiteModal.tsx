'use client';

import { useState } from 'react';
import { WebsiteConfig, PLATFORM_TYPES, STATUS_OPTIONS } from '../types';

interface WebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingWebsite: WebsiteConfig | null;
  formData: Partial<WebsiteConfig>;
  onFormChange: (data: Partial<WebsiteConfig>) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export default function WebsiteModal({
  isOpen,
  onClose,
  editingWebsite,
  formData,
  onFormChange,
  onSave,
  isSaving,
}: WebsiteModalProps) {
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const selectedPlatform = PLATFORM_TYPES.find(p => p.value === formData.platform);
  const needsBasicAuth = selectedPlatform?.authType === 'basic' || selectedPlatform?.authType === 'flexible';
  const needsApiAuth = selectedPlatform?.authType === 'api' || selectedPlatform?.authType === 'flexible';

  async function testConnection() {
    if (!formData.apiUrl?.trim()) {
      setTestResult({ ok: false, msg: 'Nhập API URL trước' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/website-configs/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: formData.apiUrl,
          platform: formData.platform,
          username: formData.username,
          appPassword: formData.appPassword,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setTestResult({
          ok: json.success,
          msg: json.success ? `✓ Kết nối thành công — ${json.siteName || ''}` : json.error || 'Kết nối thất bại',
        });
      } else {
        setTestResult({ ok: false, msg: 'Không thể kết nối đến API' });
      }
    } catch {
      setTestResult({ ok: false, msg: 'Lỗi kết nối mạng' });
    } finally {
      setTesting(false);
    }
  }

  function autoFillApiUrl() {
    if (formData.url && !formData.apiUrl) {
      const baseUrl = formData.url.replace(/\/$/, '');
      let apiUrl = '';
      switch (formData.platform) {
        case 'wordpress':
          apiUrl = `${baseUrl}/wp-json/wp/v2`;
          break;
        case 'shopify':
          apiUrl = `${baseUrl}/admin/api/2024-01/graphql.json`;
          break;
        default:
          apiUrl = `${baseUrl}/api`;
      }
      onFormChange({ ...formData, apiUrl });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">
            {editingWebsite ? 'Sửa website' : 'Thêm website mới'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* ── Platform Selection ──────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Loại nền tảng <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {PLATFORM_TYPES.map(p => (
                <button
                  key={p.value}
                  onClick={() => onFormChange({ ...formData, platform: p.value })}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                    formData.platform === p.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <span className="text-xs font-medium text-gray-700 text-center">{p.label}</span>
                </button>
              ))}
            </div>
            {selectedPlatform && (
              <p className="text-xs text-gray-500 mt-2">💡 {selectedPlatform.description}</p>
            )}
          </div>

          {/* ── Basic Info ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Tên website <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => onFormChange({ ...formData, name: e.target.value })}
                placeholder="Ví dụ: Hasaki Vietnam - Main Site"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                URL website <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={formData.url || ''}
                onChange={e => onFormChange({ ...formData, url: e.target.value })}
                placeholder="https://www.hasaki.vn"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* ── Company Info (Collapsible) ──────────────────────────────────── */}
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🏢</span>
                <span className="text-sm font-semibold text-gray-700">Thông tin doanh nghiệp</span>
                <span className="text-xs text-gray-400">(tùy chọn)</span>
              </div>
              <span className="text-gray-400">{showAdvanced ? '▼' : '▶'}</span>
            </button>

            {showAdvanced && (
              <div className="p-4 pt-0 space-y-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tên công ty</label>
                    <input
                      type="text"
                      value={formData.companyName || ''}
                      onChange={e => onFormChange({ ...formData, companyName: e.target.value })}
                      placeholder="HASAKI VIỆT NAM"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Số chi nhánh</label>
                    <input
                      type="number"
                      value={formData.branchCount || ''}
                      onChange={e =>
                        onFormChange({ ...formData, branchCount: e.target.value ? Number(e.target.value) : null })
                      }
                      placeholder="323"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Hotline</label>
                    <input
                      type="text"
                      value={formData.hotline || ''}
                      onChange={e => onFormChange({ ...formData, hotline: e.target.value })}
                      placeholder="1800 6324"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Hotline khiếu nại</label>
                    <input
                      type="text"
                      value={formData.hotlineComplaint || ''}
                      onChange={e => onFormChange({ ...formData, hotlineComplaint: e.target.value })}
                      placeholder="1800 6310"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Link danh sách chi nhánh</label>
                  <input
                    type="url"
                    value={formData.branchListUrl || ''}
                    onChange={e => onFormChange({ ...formData, branchListUrl: e.target.value })}
                    placeholder="https://hotro.hasaki.vn/he-thong-cua-hang.html"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Thông tin hỗ trợ khác</label>
                  <textarea
                    value={formData.supportInfo || ''}
                    onChange={e => onFormChange({ ...formData, supportInfo: e.target.value })}
                    placeholder="Nhấn Phím 1 cho Mỹ phẩm, Phím 2 cho Clinic..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── API Configuration ───────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              API URL <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.apiUrl || ''}
                onChange={e => onFormChange({ ...formData, apiUrl: e.target.value })}
                placeholder="https://www.hasaki.vn/wp-json/wp/v2"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={autoFillApiUrl}
                className="px-3 py-2.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg whitespace-nowrap"
              >
                Tự điền
              </button>
            </div>
          </div>

          {/* ── Authentication ───────────────────────────────────────────────── */}
          {needsBasicAuth && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={e => onFormChange({ ...formData, username: e.target.value })}
                  placeholder="admin"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {formData.platform === 'wordpress' ? 'App Password' : 'Password'}
                  {editingWebsite?.hasPassword && (
                    <span className="text-green-600 font-normal ml-1">(đã có — nhập để đổi)</span>
                  )}
                </label>
                <input
                  type="password"
                  value={formData.appPassword || ''}
                  onChange={e => onFormChange({ ...formData, appPassword: e.target.value })}
                  placeholder={editingWebsite?.hasPassword ? '••••••••' : 'xxxx xxxx xxxx xxxx'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          )}

          {needsApiAuth && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">API Key</label>
                <input
                  type="text"
                  value={formData.apiKey || ''}
                  onChange={e => onFormChange({ ...formData, apiKey: e.target.value })}
                  placeholder="your-api-key"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">API Secret</label>
                <input
                  type="password"
                  value={formData.apiSecret || ''}
                  onChange={e => onFormChange({ ...formData, apiSecret: e.target.value })}
                  placeholder="your-api-secret"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          )}

          {/* ── Test Connection ──────────────────────────────────────────────── */}
          {selectedPlatform?.requiresAuth && (
            <div>
              <button
                onClick={testConnection}
                disabled={testing}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-2 disabled:opacity-50"
              >
                {testing ? (
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  '🔌'
                )}
                Kiểm tra kết nối
              </button>
              {testResult && (
                <p className={`text-xs mt-2 ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.msg}
                </p>
              )}
            </div>
          )}

          {/* ── Default Settings ─────────────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">CẤU HÌNH ĐĂNG BÀI MẶC ĐỊNH</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category ID</label>
                <input
                  type="number"
                  value={formData.defaultCategory || ''}
                  onChange={e =>
                    onFormChange({ ...formData, defaultCategory: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="1"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Trạng thái bài đăng</label>
                <select
                  value={formData.defaultStatus || 'draft'}
                  onChange={e => onFormChange({ ...formData, defaultStatus: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Switches ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'isActive', label: 'Kích hoạt', desc: 'Cho phép đăng bài' },
              { key: 'isDefault', label: 'Đặt làm mặc định', desc: 'Site ưu tiên khi publish' },
            ].map(sw => (
              <label
                key={sw.key}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  formData[sw.key as keyof typeof formData]
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!formData[sw.key as keyof typeof formData]}
                  onChange={e => onFormChange({ ...formData, [sw.key]: e.target.checked })}
                  className="accent-blue-600"
                />
                <div>
                  <p className="text-xs font-semibold text-gray-700">{sw.label}</p>
                  <p className="text-xs text-gray-400">{sw.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {editingWebsite ? 'Lưu thay đổi' : 'Thêm website'}
          </button>
        </div>
      </div>
    </div>
  );
}
