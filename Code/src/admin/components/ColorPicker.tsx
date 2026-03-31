'use client';

import { useEffect, useRef, useState } from 'react';

// Bảng màu preset phổ biến cho nội thất
const PRESETS = [
  '#000000', '#ffffff', '#f5f5f5', '#e0e0e0', '#9e9e9e', '#616161',
  '#b71c1c', '#e53935', '#ef9a9a', '#ff8a65', '#ff7043', '#e64a19',
  '#f57f17', '#fbc02d', '#fff176', '#f9a825', '#ff8f00', '#e65100',
  '#1b5e20', '#388e3c', '#66bb6a', '#a5d6a7', '#00695c', '#26a69a',
  '#0d47a1', '#1976d2', '#42a5f5', '#90caf9', '#1a237e', '#3949ab',
  '#4a148c', '#7b1fa2', '#ce93d8', '#ad1457', '#e91e63', '#f48fb1',
  '#3e2723', '#795548', '#bcaaa4', '#d7ccc8', '#fafafa', '#eceff1',
  '#37474f', '#546e7a', '#b0bec5', '#cfd8dc', '#4e342e', '#6d4c41',
];

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value || '');
  const [inputVal, setInputVal] = useState(value || '');
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    setHex(value || '');
    setInputVal(value || '');
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function applyHex(val: string) {
    const clean = val.startsWith('#') ? val : '#' + val;
    setHex(clean);
    setInputVal(clean);
    onChange(clean);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputVal(val);
    // Only apply if valid hex
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setHex(val);
      onChange(val);
    }
  }

  function handleNativePicker(e: React.ChangeEvent<HTMLInputElement>) {
    applyHex(e.target.value);
  }

  const isValid = /^#[0-9a-fA-F]{6}$/.test(hex);

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 10px', border: '1px solid #dee2e6',
          borderRadius: 6, background: '#fff', cursor: 'pointer',
          fontSize: 13, color: '#333',
          boxShadow: open ? '0 0 0 2px #0d6efd40' : 'none',
          transition: 'box-shadow .15s',
        }}
      >
        <span style={{
          width: 22, height: 22, borderRadius: 4,
          background: isValid ? hex : '#eee',
          border: '1px solid rgba(0,0,0,0.15)',
          display: 'inline-block', flexShrink: 0,
        }} />
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
          {hex || 'Chọn màu'}
        </span>
        <i className="bi bi-chevron-down" style={{ fontSize: 10, color: '#888' }}></i>
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          background: '#fff', border: '1px solid #e0e0e0',
          borderRadius: 10, padding: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 9999, width: 260,
        }}>
          {/* Native color picker + HEX input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input
              type="color"
              value={isValid ? hex : '#ffffff'}
              onChange={handleNativePicker}
              style={{ width: 40, height: 36, padding: 2, border: '1px solid #dee2e6', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}
            />
            <input
              value={inputVal}
              onChange={handleInputChange}
              placeholder="#000000"
              maxLength={7}
              style={{
                flex: 1, padding: '6px 10px', border: '1px solid #dee2e6',
                borderRadius: 6, fontSize: 13, fontFamily: 'monospace',
                outline: 'none',
                borderColor: inputVal && !/^#[0-9a-fA-F]{6}$/.test(inputVal) ? '#dc3545' : '#dee2e6',
              }}
            />
            {isValid && (
              <span style={{
                width: 36, height: 36, borderRadius: 6,
                background: hex, border: '1px solid rgba(0,0,0,0.1)',
                flexShrink: 0,
              }} />
            )}
          </div>

          {/* Preset swatches */}
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: 500 }}>MÀU PHỔ BIẾN</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
            {PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => applyHex(c)}
                style={{
                  width: '100%', aspectRatio: '1', borderRadius: 4,
                  background: c, cursor: 'pointer',
                  border: hex === c ? '2px solid #0d6efd' : '1px solid rgba(0,0,0,0.12)',
                  outline: 'none', padding: 0,
                  boxShadow: hex === c ? '0 0 0 1px #fff inset' : 'none',
                  transition: 'transform .1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              />
            ))}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 6 }}>
            <button
              type="button"
              onClick={() => { onChange(''); setHex(''); setInputVal(''); setOpen(false); }}
              style={{ padding: '4px 12px', fontSize: 12, border: '1px solid #dee2e6', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#666' }}
            >
              Xóa
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ padding: '4px 12px', fontSize: 12, border: 'none', borderRadius: 5, background: '#0d6efd', color: '#fff', cursor: 'pointer' }}
            >
              Xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
