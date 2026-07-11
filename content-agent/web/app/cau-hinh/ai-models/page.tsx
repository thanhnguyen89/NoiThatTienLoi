'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/Pagination';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  apiKey: string | null;
  baseUrl: string | null;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AIModelsPage() {
  const router = useRouter();
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    provider: 'gemini',
    modelId: '',
    apiKey: '',
    baseUrl: '',
    icon: '⚡',
    description: '',
    isActive: true,
    isDefault: false,
  });

  // Icon options
  const iconOptions = [
    '⚡', '🤖', '🧠', '🚀', '✨', '💡', '🔥', '⭐',
    '🎯', '💎', '🌟', '🎨', '🎭', '🎪', '🎬', '🎮',
    '🔮', '🎲', '🎰', '🎳', '🎯', '🎪', '🎨', '🎭',
    '🌈', '🌊', '🌙', '☀️', '⛅', '🌤️', '⛈️', '🌩️',
    '💫', '🌠', '🌌', '🌃', '🌆', '🌇', '🌉', '🌁',
    '🔵', '🟢', '🟡', '🟠', '🔴', '🟣', '🟤', '⚫',
    '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛',
  ];

  // Pagination logic
  const totalPages = Math.ceil(models.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentModels = models.slice(startIndex, endIndex);

  useEffect(() => {
    // Set page title
    document.title = 'Quản Lý AI Models - Content Agent';
  }, []);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      const res = await fetch('/api/ai-models');
      const json = await res.json();
      if (json.success) {
        setModels(json.data);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingModel(null);
    setFormData({
      name: '',
      provider: 'gemini',
      modelId: '',
      apiKey: '',
      baseUrl: '',
      icon: '⚡',
      description: '',
      isActive: true,
      isDefault: false,
    });
    setShowModal(true);
  }

  function openEditModal(model: AIModel) {
    setEditingModel(model);
    setFormData({
      name: model.name,
      provider: model.provider,
      modelId: model.modelId,
      apiKey: model.apiKey || '',
      baseUrl: model.baseUrl || '',
      icon: model.icon || '⚡',
      description: model.description || '',
      isActive: model.isActive,
      isDefault: model.isDefault,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name.trim() || !formData.provider.trim() || !formData.modelId.trim()) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingModel?.id,
          ...formData,
        }),
      });

      const json = await res.json();
      if (json.success) {
        await loadModels();
        setShowModal(false);
      } else {
        alert(json.error || 'Lỗi khi lưu');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Lỗi kết nối');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xác nhận xóa model này?')) return;

    try {
      const res = await fetch(`/api/ai-models?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        await loadModels();
      } else {
        alert(json.error || 'Lỗi khi xóa');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Lỗi kết nối');
    }
  }

  async function toggleActive(model: AIModel) {
    try {
      const res = await fetch('/api/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: model.id,
          name: model.name,
          provider: model.provider,
          modelId: model.modelId,
          apiKey: model.apiKey,
          baseUrl: model.baseUrl,
          icon: model.icon,
          description: model.description,
          isActive: !model.isActive,
          isDefault: model.isDefault,
        }),
      });

      const json = await res.json();
      if (json.success) {
        await loadModels();
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  }

  async function setAsDefault(model: AIModel) {
    try {
      const res = await fetch('/api/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: model.id,
          name: model.name,
          provider: model.provider,
          modelId: model.modelId,
          apiKey: model.apiKey,
          baseUrl: model.baseUrl,
          icon: model.icon,
          description: model.description,
          isActive: model.isActive,
          isDefault: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        await loadModels();
      }
    } catch (err) {
      console.error('Set default error:', err);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Quản Lý AI Models</h1>
            <p className="text-sm text-gray-500 mt-1">Cấu hình các model AI để viết bài</p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Thêm Model
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentModels.map((model) => (
            <div
              key={model.id}
              className={`bg-white rounded-xl border-2 p-5 transition-all hover:shadow-lg ${
                model.isDefault
                  ? 'border-blue-500 shadow-md'
                  : model.isActive
                  ? 'border-gray-200'
                  : 'border-gray-100 opacity-60'
              }`}
            >
              {/* Icon & Name */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{model.icon || '🤖'}</div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{model.name}</h3>
                    <p className="text-xs text-gray-500">{model.provider}</p>
                  </div>
                </div>
                {model.isDefault && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                    Mặc định
                  </span>
                )}
              </div>

              {/* Description */}
              {model.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{model.description}</p>
              )}

              {/* Model ID */}
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">Model ID</p>
                <p className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                  {model.modelId}
                </p>
              </div>

              {/* API Config */}
              <div className="space-y-1 mb-4">
                {model.apiKey && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span>🔑</span>
                    <span>API Key: ••••••••</span>
                  </div>
                )}
                {model.baseUrl && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span>🌐</span>
                    <span className="truncate">{model.baseUrl}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => toggleActive(model)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    model.isActive
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {model.isActive ? '✓ Đang dùng' : 'Tắt'}
                </button>
                {!model.isDefault && model.isActive && (
                  <button
                    onClick={() => setAsDefault(model)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Đặt mặc định
                  </button>
                )}
                <button
                  onClick={() => openEditModal(model)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Sửa
                </button>
                {!model.isDefault && (
                  <button
                    onClick={() => handleDelete(model.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {models.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">Chưa có model nào</p>
          </div>
        )}

        {/* Pagination */}
        {models.length > 0 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={models.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newSize) => {
                setItemsPerPage(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingModel ? 'Chỉnh Sửa Model' : 'Thêm Model Mới'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Đóng"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Tên Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Gemini 2.0 Flash"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Provider & Icon */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Provider <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="provider-suggestions"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    placeholder="gemini, openai, anthropic..."
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <datalist id="provider-suggestions">
                    <option value="gemini">Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="grok">Grok</option>
                    <option value="cohere">Cohere</option>
                    <option value="mistral">Mistral</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="qwen">Qwen</option>
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Icon</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-2xl text-left focus:outline-none focus:ring-2 focus:ring-blue-400 hover:bg-gray-50 transition-colors"
                    >
                      {formData.icon || '⚡'}
                    </button>
                    {showIconPicker && (
                      <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl p-3 max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-8 gap-2">
                          {iconOptions.map((icon) => (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, icon });
                                setShowIconPicker(false);
                              }}
                              className={`text-2xl p-2 rounded hover:bg-blue-50 transition-colors ${
                                formData.icon === icon ? 'bg-blue-100 ring-2 ring-blue-400' : ''
                              }`}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Model ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Model ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.modelId}
                  onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                  placeholder="gemini-2.0-flash"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  API Key <span className="text-xs text-gray-400">(optional)</span>
                </label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="Để trống nếu dùng env variable"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Base URL <span className="text-xs text-gray-400">(optional, cho proxy)</span>
                </label>
                <input
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Mô tả ngắn về model này..."
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="text-sm text-gray-700">Kích hoạt</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="text-sm text-gray-700">Đặt làm mặc định</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
