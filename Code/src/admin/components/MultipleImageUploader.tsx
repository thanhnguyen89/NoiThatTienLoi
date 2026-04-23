'use client';

import { useState, useRef } from 'react';
import { ImageManagerModal } from './ImageManagerModal';

interface ImageItem {
  url: string;
  id: string;
}

interface Props {
  value: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  label: string;
  maxImages?: number;
}

export function MultipleImageUploader({ value, onChange, label, maxImages = 10 }: Props) {
  const [showManager, setShowManager] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Check max images
    if (value.length + files.length > maxImages) {
      alert(`Chỉ được upload tối đa ${maxImages} ảnh!`);
      return;
    }

    // Validate all files
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert('Chỉ chấp nhận file ảnh!');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File quá lớn! Tối đa 5MB.');
        return;
      }
    }

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/admin/api/upload', {
          method: 'POST',
          body: formData,
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Upload failed');
        
        return { url: json.url, id: Date.now() + Math.random().toString(36) };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      onChange([...value, ...uploadedImages]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload thất bại! Vui lòng thử lại.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleRemove(id: string) {
    onChange(value.filter(img => img.id !== id));
  }

  function handleSelectFromManager(url: string) {
    if (value.length >= maxImages) {
      alert(`Chỉ được chọn tối đa ${maxImages} ảnh!`);
      return;
    }
    onChange([...value, { url, id: Date.now() + Math.random().toString(36) }]);
    setShowManager(false);
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    const newImages = [...value];
    const [moved] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, moved);
    onChange(newImages);
  }

  return (
    <div>
      <label className="form-label small fw-semibold">{label}</label>
      
      <div className="d-flex gap-2 mb-2">
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || value.length >= maxImages}
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
          disabled={uploading || value.length >= maxImages}
        >
          <i className="bi bi-images me-1"></i>Chọn ảnh
        </button>
        <span className="text-muted small align-self-center">
          {value.length}/{maxImages} ảnh
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {value.length > 0 && (
        <div className="d-flex flex-wrap gap-2" style={{ marginTop: 8 }}>
          {value.map((img, idx) => (
            <div
              key={img.id}
              style={{
                position: 'relative',
                width: 120,
                height: 120,
                border: '2px solid #dee2e6',
                borderRadius: 6,
                overflow: 'hidden',
                background: '#f8f9fa',
              }}
            >
              <img
                src={img.url}
                alt={`${label} ${idx + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              
              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(img.id)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  fontSize: 14,
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Xóa"
              >
                ×
              </button>

              {/* Order badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 4,
                  left: 4,
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                #{idx + 1}
              </div>

              {/* Reorder buttons */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  display: 'flex',
                  gap: 2,
                }}
              >
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => handleReorder(idx, idx - 1)}
                    style={{
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      width: 20,
                      height: 20,
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    title="Di chuyển lên"
                  >
                    ←
                  </button>
                )}
                {idx < value.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleReorder(idx, idx + 1)}
                    style={{
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      width: 20,
                      height: 20,
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    title="Di chuyển xuống"
                  >
                    →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ImageManagerModal
        isOpen={showManager}
        onClose={() => setShowManager(false)}
        onSelect={handleSelectFromManager}
      />
    </div>
  );
}
