import { useState, useCallback } from 'react';
import { WebsiteConfig, emptyWebsite } from '../types';

export function useWebsiteConfig() {
  const [websites, setWebsites] = useState<WebsiteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<WebsiteConfig | null>(null);
  const [formData, setFormData] = useState<Partial<WebsiteConfig>>({ ...emptyWebsite });
  const [saving, setSaving] = useState(false);

  const loadWebsites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/website-configs');
      const json = await res.json();
      if (json.success) setWebsites(json.data);
    } catch (error) {
      console.error('Failed to load websites:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const openAddModal = useCallback(() => {
    setEditingWebsite(null);
    setFormData({ ...emptyWebsite });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((website: WebsiteConfig) => {
    setEditingWebsite(website);
    setFormData({
      name: website.name,
      url: website.url,
      platform: website.platform,
      apiUrl: website.apiUrl,
      companyName: website.companyName || '',
      hotline: website.hotline || '',
      hotlineComplaint: website.hotlineComplaint || '',
      branchCount: website.branchCount,
      branchListUrl: website.branchListUrl || '',
      supportInfo: website.supportInfo || '',
      username: website.username || '',
      appPassword: '', // Always reset password field
      apiKey: '',
      apiSecret: '',
      defaultCategory: website.defaultCategory,
      defaultAuthorId: website.defaultAuthorId,
      defaultStatus: website.defaultStatus,
      isActive: website.isActive,
      isDefault: website.isDefault,
    });
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingWebsite(null);
    setFormData({ ...emptyWebsite });
  }, []);

  const saveWebsite = useCallback(
    async (onSuccess?: (msg: string) => void, onError?: (msg: string) => void) => {
      if (!formData.name?.trim() || !formData.url?.trim() || !formData.apiUrl?.trim()) {
        onError?.('Vui lòng điền tên, URL và API URL');
        return;
      }

      setSaving(true);
      try {
        const body = editingWebsite ? { ...formData, id: editingWebsite.id } : formData;
        const res = await fetch('/api/website-configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();

        if (json.success) {
          onSuccess?.(editingWebsite ? 'Đã cập nhật website' : 'Đã thêm website');
          closeModal();
          loadWebsites();
        } else {
          onError?.(json.error || 'Lỗi lưu');
        }
      } catch (error) {
        onError?.('Lỗi kết nối');
      } finally {
        setSaving(false);
      }
    },
    [formData, editingWebsite, closeModal, loadWebsites]
  );

  const deleteWebsite = useCallback(
    async (id: string, name: string, onSuccess?: (msg: string) => void, onError?: (msg: string) => void) => {
      if (!confirm(`Xóa "${name}"?`)) return;

      try {
        const res = await fetch(`/api/website-configs?id=${id}`, { method: 'DELETE' });
        const json = await res.json();

        if (json.success) {
          onSuccess?.('Đã xóa');
          loadWebsites();
        } else {
          onError?.(json.error || 'Lỗi xóa');
        }
      } catch (error) {
        onError?.('Lỗi kết nối');
      }
    },
    [loadWebsites]
  );

  return {
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
  };
}
