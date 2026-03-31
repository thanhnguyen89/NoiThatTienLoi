'use client';

import { useState } from 'react';
import { ImageManagerModal } from './ImageManagerModal';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label: string;
  defaultSrc?: string;
}

export function SingleImageUploader({ value, onChange, label, defaultSrc }: Props) {
  const [showManager, setShowManager] = useState(false);

  return (
    <div>
      <label className="form-label small fw-semibold">{label}</label>
      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setShowManager(true)}
        >
          <i className="bi bi-images me-1"></i>Chọn ảnh
        </button>
      </div>

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
