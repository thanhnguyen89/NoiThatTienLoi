'use client';

import { useRef, useState, useCallback } from 'react';

interface Props {
  onChange: (urls: string[]) => void;
}

const MAX_SIZE = 977 * 1024;

export function ImageUploader({ onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  onChangeRef.current = onChange;

  async function uploadFiles(selected: File[]) {
    setErrors([]);
    const oversized = selected.filter((f) => f.size > MAX_SIZE);
    if (oversized.length) {
      setErrors(oversized.map((f) => `${f.name}: quá ${Math.round(MAX_SIZE / 1024)} KB`));
    }

    const toUpload = selected.filter((f) => f.size <= MAX_SIZE);
    if (!toUpload.length) return;

    setUploading(true);
    const fd = new FormData();
    toUpload.forEach((f) => fd.append('files', f));

    try {
      const res = await fetch('/admin/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      const urls: string[] = (json.data as Array<{ url?: string; error?: string; name: string }>)
        .filter((r) => r.url)
        .map((r) => r.url!);
      if (urls.length) onChangeRef.current(urls);
    } catch {
      setErrors(['Upload thất bại, thử lại.']);
    } finally {
      setUploading(false);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) uploadFiles(Array.from(e.target.files));
    e.target.value = '';
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files) uploadFiles(Array.from(e.dataTransfer.files));
  }, []);

  return (
    <div>
      {/* Drop zone */}
      <div
        className={`border rounded-2 d-flex align-items-center justify-content-center ${dragging ? 'border-primary bg-primary bg-opacity-10' : 'border-primary'}`}
        style={{ height: 120, cursor: uploading ? 'default' : 'pointer', borderStyle: 'dashed' }}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="text-center text-primary">
            <div className="spinner-border spinner-border-sm mb-1" />
            <p className="small mb-0">Đang upload...</p>
          </div>
        ) : (
          <div className="text-center text-primary">
            <i className="bi bi-cloud-upload" style={{ fontSize: 36 }}></i>
            <p className="small mb-0 mt-1">Kéo thả hoặc click để chọn ảnh</p>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple className="d-none" onChange={handleInput} />

      {/* Errors */}
      {errors.map((err, i) => (
        <p key={i} className="text-danger small mt-1 mb-0">{err}</p>
      ))}
    </div>
  );
}
