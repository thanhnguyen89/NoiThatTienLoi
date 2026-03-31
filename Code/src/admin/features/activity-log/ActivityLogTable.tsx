'use client';

import { useState } from 'react';

interface LogUser {
  id: string;
  username: string;
  fullName: string | null;
  avatar: string | null;
}

interface ActivityLogItem {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  description: string | null;
  ipAddress: string | null;
  createdAt: Date;
  user: LogUser | null;
}

function formatDate(date: Date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-success',
  LOGOUT: 'bg-secondary',
  CREATE: 'bg-primary',
  UPDATE: 'bg-warning text-dark',
  DELETE: 'bg-danger',
};

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={`badge ${ACTION_COLORS[action] || 'bg-secondary'}`}>
      {action}
    </span>
  );
}

function LogDetail({ log }: { log: ActivityLogItem }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!(log.description || log.ipAddress || log.resourceId);

  if (!hasDetail) return null;

  return (
    <div className="mt-1">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        style={{ fontSize: 11 }}
        onClick={() => setOpen(!open)}
      >
        <i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`}></i>
        Chi tiết
      </button>
      {open && (
        <div className="mt-2 p-2 border rounded" style={{ fontSize: 12, background: '#f8f9fa' }}>
          {log.description && <div><strong>Mô tả:</strong> {log.description}</div>}
          {log.resourceId && <div><strong>ID:</strong> <code>{log.resourceId}</code></div>}
          {log.ipAddress && <div><strong>IP:</strong> <code>{log.ipAddress}</code></div>}
        </div>
      )}
    </div>
  );
}

export function ActivityLogTable({ logs }: { logs: ActivityLogItem[] }) {
  if (!logs.length) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-clock-history fs-1 d-block mb-2"></i>
              Chưa có nhật ký nào.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <>
      <div className="table-responsive">
        <table className="table table-bordered mb-0 w-100">
          <thead>
            <tr>
              <th className="text-center" style={{ width: 50 }}>STT</th>
              <th style={{ width: 140 }}>Thời gian</th>
              <th>Người dùng</th>
              <th className="text-center" style={{ width: 100 }}>Hành động</th>
              <th>Module</th>
              <th style={{ width: '40%' }}>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={log.id}>
                <td className="text-center">{idx + 1}</td>
                <td>
                  <span className="small" style={{ fontSize: 12 }}>{formatDate(log.createdAt)}</span>
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: '#e9ecef', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {log.user?.avatar ? (
                        <img src={log.user.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        (log.user?.username || 'U')[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="fw-semibold small">{log.user?.fullName || log.user?.username || '—'}</div>
                      {log.user && <div className="text-muted" style={{ fontSize: 11 }}>@{log.user.username}</div>}
                    </div>
                  </div>
                </td>
                <td className="text-center">
                  <ActionBadge action={log.action} />
                </td>
                <td>
                  <span className="badge bg-dark">{log.resource}</span>
                </td>
                <td>
                  <LogDetail log={log} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
