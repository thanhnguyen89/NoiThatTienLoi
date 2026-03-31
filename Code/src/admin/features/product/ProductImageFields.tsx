'use client';

import { useState } from 'react';

export interface ImageItem {
  id?: string;       // có id = ảnh đã lưu trong DB
  url: string;
  alt: string;
  isNew?: boolean;   // ảnh mới thêm
  isDeleted?: boolean; // đánh dấu xóa
}

interface ProductImageFieldsProps {
  initialImages: Array<{ id: string; url: string; alt: string | null }>;
  onChange: (images: ImageItem[]) => void;
}

export function ProductImageFields({ initialImages, onChange }: ProductImageFieldsProps) {
  const [images, setImages] = useState<ImageItem[]>(
    initialImages.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt || '',
    }))
  );

  function update(newImages: ImageItem[]) {
    setImages(newImages);
    onChange(newImages);
  }

  function handleAdd() {
    update([...images, { url: '', alt: '', isNew: true }]);
  }

  function handleRemove(index: number) {
    const img = images[index];
    if (img.id) {
      // Ảnh đã lưu → đánh dấu xóa
      const updated = [...images];
      updated[index] = { ...img, isDeleted: true };
      update(updated);
    } else {
      // Ảnh mới → xóa khỏi list
      update(images.filter((_, i) => i !== index));
    }
  }

  function handleRestore(index: number) {
    const updated = [...images];
    updated[index] = { ...updated[index], isDeleted: false };
    update(updated);
  }

  function handleChange(index: number, field: 'url' | 'alt', value: string) {
    const updated = [...images];
    updated[index] = { ...updated[index], [field]: value };
    update(updated);
  }

  const visibleImages = images.filter((img) => !img.isDeleted);
  const deletedImages = images.filter((img) => img.isDeleted);

  return (
    <div className="image-fields">
      <div className="image-fields__list">
        {visibleImages.map((img, visualIndex) => {
          const realIndex = images.indexOf(img);
          return (
            <div key={realIndex} className="image-fields__item">
              <div className="image-fields__preview">
                {img.url ? (
                  <img src={img.url} alt={img.alt || 'Preview'} />
                ) : (
                  <span className="image-fields__placeholder">Chưa có ảnh</span>
                )}
              </div>
              <div className="image-fields__inputs">
                <input
                  type="text"
                  className="form-input"
                  placeholder="URL hình ảnh *"
                  value={img.url}
                  onChange={(e) => handleChange(realIndex, 'url', e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Mô tả ảnh (alt)"
                  value={img.alt}
                  onChange={(e) => handleChange(realIndex, 'alt', e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-admin btn-admin--danger btn-admin--sm"
                onClick={() => handleRemove(realIndex)}
                title="Xóa ảnh"
              >
                ✕
              </button>
              {img.id && (
                <span className="image-fields__saved-badge">Đã lưu</span>
              )}
              {img.isNew && (
                <span className="image-fields__new-badge">Mới</span>
              )}
            </div>
          );
        })}
      </div>

      {deletedImages.length > 0 && (
        <div className="image-fields__deleted">
          <p className="image-fields__deleted-title">
            Ảnh sẽ bị xóa ({deletedImages.length}):
          </p>
          {deletedImages.map((img) => {
            const realIndex = images.indexOf(img);
            return (
              <div key={realIndex} className="image-fields__deleted-item">
                <span className="image-fields__deleted-url">{img.url}</span>
                <button
                  type="button"
                  className="btn-admin btn-admin--ghost btn-admin--sm"
                  onClick={() => handleRestore(realIndex)}
                >
                  Khôi phục
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="btn-admin btn-admin--ghost image-fields__add"
        onClick={handleAdd}
      >
        + Thêm hình ảnh
      </button>
    </div>
  );
}
