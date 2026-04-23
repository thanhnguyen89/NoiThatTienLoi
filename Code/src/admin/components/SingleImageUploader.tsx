'use client';

import { useState, useRef } from 'react';
import { ImageManagerModal } from './ImageManagerModal';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label: string;
  defaultSrc?: string;
}

export function SingleImageUploader({ value, onChange, label, defaultSrc }: Props) {
  const [showManager, setShowManager] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Chỉ chấp nhận file ảnh!');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File quá lớn! Tối đa 5MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/admin/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Upload failed');
      }

      onChange(json.url);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload thất bại! Vui lòng thử lại.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div>
      <label className="form-label small fw-semibold">{label}</label>
      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <span className="spinner-border spinner-border-sm me-1"></span>
              Đang tải...
            </>
          ) : (
            <>
              <i className="bi bi-upload me-1"></i>Upload
            </>
          )}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setShowManager(true)}
          disabled={uploading}
        >
          <i className="bi bi-images me-1"></i>Chọn ảnh
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {value ? (
        <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
          <img
            src={value}
            alt={label}
            style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #dee2e6' }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            style={{ position: 'absolute', top: -6, right: -6, background: '#dc3545', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer', lineHeight: 1, padding: 0 }}
            title="Xóa"
          >×</button>
        </div>
      ) : defaultSrc && (
        <div style={{ marginTop: 8 }}>
          <img src={defaultSrc} alt="default" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #dee2e6', opacity: 0.5 }} />
        </div>
      )}

      <ImageManagerModal
        isOpen={showManager}
        onClose={() => setShowManager(false)}
        onSelect={(url) => { onChange(url); setShowManager(false); }}
      />
    </div>
  );
}
