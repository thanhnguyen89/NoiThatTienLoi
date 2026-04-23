'use client';

import { useState } from 'react';

export type ToastType = 'success' | 'error' | 'danger';

interface ToastState {
  msg: string;
  type: ToastType;
}

let toastFn: ((msg: string, type: ToastType) => void) | null = null;

export function toast(msg: string, type: ToastType = 'success') {
  toastFn?.(msg, type);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastState, setToastState] = useState<ToastState | null>(null);

  toastFn = (msg, type) => {
    setToastState({ msg, type });
    setTimeout(() => setToastState(null), 4000);
  };

  return (
    <>
      {children}
      {toastState && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            minWidth: 250,
            padding: '12px 20px',
            borderRadius: 6,
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            background: toastState.type === 'success' ? '#2e7d32' : '#c62828',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <i className={`bi ${toastState.type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
          {toastState.msg}
        </div>
      )}
    </>
  );
}
