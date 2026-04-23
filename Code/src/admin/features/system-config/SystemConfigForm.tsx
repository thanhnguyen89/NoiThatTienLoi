'use client';

import { useState } from 'react';
import { toast } from '@/admin/components/Toast';

// ─── Types ────────────────────────────────────────────────────────────────

interface SystemConfigData {
  general: GeneralFields;
  mail: MailFields;
  info: InfoFields;
}

interface GeneralFields {
  uploadPath?: string | null;
  accessTimeFrom?: string | null;
  accessTimeTo?: string | null;
  displayRowCount?: number | null;
  pageTitle?: string | null;
  keywords?: string | null;
  metaDescription?: string | null;
  socialFacebook?: string | null;
  socialZalo?: string | null;
  socialTwitter?: string | null;
  socialYouTube?: string | null;
  socialTiktok?: string | null;
}

interface MailFields {
  mailFrom?: string | null;
  mailFromName?: string | null;
  mailHost?: string | null;
  mailPort?: number | null;
  mailUsername?: string | null;
  mailSecure?: boolean;
}

interface InfoFields {
  unitName?: string | null;
  unitShortName?: string | null;
  unitAddress?: string | null;
  unitPhone?: string | null;
  unitFax?: string | null;
  unitEmail?: string | null;
  unitWebsite?: string | null;
  copyright?: string | null;
  websiteContent?: string | null;
}

interface Props {
  initialConfig: SystemConfigData | null;
  onSuccess?: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────

const DEFAULT_GENERAL: GeneralFields = {};
const DEFAULT_MAIL: MailFields = {};
const DEFAULT_INFO: InfoFields = {};

function mergeDefaults(data: SystemConfigData | null): SystemConfigData {
  return {
    general: { ...DEFAULT_GENERAL, ...data?.general },
    mail: { ...DEFAULT_MAIL, ...data?.mail },
    info: { ...DEFAULT_INFO, ...data?.info },
  };
}

// ─── CollapsibleCard ───────────────────────────────────────────────────────

function CollapsibleCard({
  title,
  icon,
  children,
  isOpen,
  onToggle,
  headerActions,
}: {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}) {
  return (
    <div className="card mb-3">
      <div
        className="card-header d-flex justify-content-between align-items-center"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={onToggle}
      >
        <div className="d-flex align-items-center gap-2">
          <i className={`bi ${icon}`}></i>
          <span className="fw-semibold">{title}</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          {headerActions}
          <i className={`bi ${isOpen ? 'bi-dash-lg' : 'bi-plus-lg'}`} style={{ fontSize: 18 }}></i>
        </div>
      </div>
      {isOpen && <div className="card-body">{children}</div>}
    </div>
  );
}

// ─── FormSection ──────────────────────────────────────────────────────────

function FieldInput({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  max,
  rows,
}: {
  label: string;
  name: string;
  value?: string | number | null;
  onChange: (name: string, val: string) => void;
  type?: string;
  placeholder?: string;
  max?: number;
  rows?: number;
}) {
  const shared = {
    name,
    value: value ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(name, e.target.value),
    className: 'form-control form-control-sm',
    placeholder,
  };
  return (
    <div className="mb-3">
      <label className="form-label small fw-semibold">{label}</label>
      {type === 'textarea' ? (
        <textarea {...shared} rows={rows ?? 3} maxLength={max} />
      ) : (
        <input {...shared} type={type} max={max} maxLength={max} />
      )}
    </div>
  );
}

// ─── SystemConfigForm ─────────────────────────────────────────────────────

export function SystemConfigForm({ initialConfig, onSuccess }: Props) {
  const merged = mergeDefaults(initialConfig ?? null);

  const [general, setGeneral] = useState<GeneralFields>(merged.general);
  const [mail, setMail] = useState<MailFields>(merged.mail);
  const [info, setInfo] = useState<InfoFields>(merged.info);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reloading, setReloading] = useState(false);

  const [collapsed, setCollapsed] = useState({ general: true, mail: true, info: true });

  function toggleCard(key: keyof typeof collapsed) {
    setCollapsed((p) => ({ ...p, [key]: !p[key] }));
  }

  async function handleReload() {
    setReloading(true);
    try {
      const res = await fetch('/admin/api/system-config');
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data as SystemConfigData;
        setGeneral(d.general);
        setMail(d.mail);
        setInfo(d.info);
      }
    } catch {}
    finally { setReloading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch('/admin/api/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ general, mail, info }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.errors) setErrors(json.errors as Record<string, string>);
        toast(json.error || 'Lỗi khi lưu cấu hình', 'error');
        return;
      }
      toast('Lưu cấu hình thành công!', 'success');
    } catch {
      toast('Lỗi kết nối', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {globalError && <div className="alert alert-danger py-2 mb-3">{globalError}</div>}

      {/* General Card */}
      <CollapsibleCard
        title="Cấu hình chung"
        icon="bi-sliders"
        isOpen={collapsed.general}
        onToggle={() => toggleCard('general')}
      >
        <div className="row">
          <div className="col-md-6">
            <FieldInput label="Đường dẫn upload hình ảnh" name="uploadPath" value={general.uploadPath} onChange={(n, v) => setGeneral((g) => ({ ...g, [n]: v || null }))} placeholder="/uploads" />
            <FieldInput label="Từ giờ (HH:MM)" name="accessTimeFrom" value={general.accessTimeFrom} onChange={(n, v) => setGeneral((g) => ({ ...g, [n]: v || null }))} placeholder="08:00" />
            <FieldInput label="Đến giờ (HH:MM)" name="accessTimeTo" value={general.accessTimeTo} onChange={(n, v) => setGeneral((g) => ({ ...g, [n]: v || null }))} placeholder="22:00" />
            <FieldInput label="Số hàng hiển thị tìm kiếm" name="displayRowCount" value={general.displayRowCount} onChange={(n, v) => setGeneral((g) => ({ ...g, [n]: v ? Number(v) : null }))} type="number" placeholder="20" />
          </div>
          <div className="col-md-6">
            <FieldInput label="Tiêu đề SEO" name="pageTitle" value={general.pageTitle} onChange={(n, v) => setGeneral((g) => ({ ...g, [n]: v || null }))} placeholder="Nội Thất Tiện Lợi" rows={2} />
            <FieldInput label="Từ khóa SEO" name="keywords" value={general.keywords} onChange={(n, v) => setGeneral((g) => ({ ...g, [n]: v || null }))} placeholder="noi that, giuong ngu" rows={2} />
            <FieldInput label="Mô tả SEO" name="metaDescription" value={general.metaDescription} onChange={(n, v) => setGeneral((g) => ({ ...g, [n]: v || null }))} placeholder="Mô tả ngắn gọn..." rows={2} />
          </div>
        </div>
        <div className="row mt-2">
          <div className="col-md-6">
            <FieldInput label="Facebook" name="socialFacebook" value={general.socialFacebook} onChange={(n, v) => setGeneral((g) => ({ ...g, [n]: v || null }))} placeholder="https://facebook.com/..." />
            <FieldInput label="Zalo" name="socialZalo" value={general.socialZalo} onChange={(n, v) => setGeneral((g) => ({ ...g, [n]: v || null }))} placeholder="https://zalo.me/..." />
            <FieldInput label="Twitter / X" name="socialTwitter" value={general.socialTwitter} onChange={(n, v) => setGeneral((g) => ({ ...g, [n]: v || null }))} placeholder="https://x.com/..." />
          </div>
          <div className="col-md-6">
            <FieldInput label="YouTube" name="socialYouTube" value={general.socialYouTube} onChange={(n, v) => setGeneral((g) => ({ ...g, [n]: v || null }))} placeholder="https://youtube.com/..." />
            <FieldInput label="TikTok" name="socialTiktok" value={general.socialTiktok} onChange={(n, v) => setGeneral((g) => ({ ...g, [n]: v || null }))} placeholder="https://tiktok.com/..." />
          </div>
        </div>
      </CollapsibleCard>

      {/* Mail Card */}
      <MailSection
        data={mail}
        onChange={setMail}
      />

      {/* Info Card */}
      <InfoSection
        data={info}
        onChange={setInfo}
        onReload={handleReload}
        isReloading={reloading}
      />

      {/* Nút Lưu */}
      <div className="d-flex justify-content-end mt-3">
        <button type="submit" className="btn btn-success" disabled={loading}>
          {loading ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang lưu...</> : <><i className="bi bi-check2 me-1"></i>Lưu cấu hình</>}
        </button>
      </div>
    </form>
  );
}

// ─── MailSection ──────────────────────────────────────────────────────────

function MailSection({
  data,
  onChange,
}: {
  data: MailFields;
  onChange: (m: MailFields) => void;
}) {
  const set = (name: string, val: string) => onChange({ ...data, [name]: val || null });
  const setNum = (name: string, val: string) => onChange({ ...data, [name]: val ? Number(val) : null });
  const [showPwChange, setShowPwChange] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  async function handlePwChange() {
    if (!newPw.trim()) return;
    setPwLoading(true);
    try {
      const res = await fetch('/admin/api/system-config/mail-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPw }),
      });
      const json = await res.json();
      if (res.ok) {
        toast('Đổi mật khẩu thành công!', 'success');
        setNewPw('');
        setShowPwChange(false);
      } else {
        toast(json.error || 'Lỗi', 'error');
      }
    } catch {
      toast('Lỗi kết nối', 'error');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <CollapsibleCard title="Cấu hình mail" icon="bi-envelope" isOpen={true} onToggle={() => {}}>
      <div className="row">
        <div className="col-md-6">
          <FieldInput label="Địa chỉ email" name="mailFrom" value={data.mailFrom} onChange={set} type="email" placeholder="no-reply@example.com" />
          <FieldInput label="Tên hiển thị" name="mailFromName" value={data.mailFromName} onChange={set} placeholder="Nội Thất Tiện Lợi" />
          <FieldInput label="SMTP Host" name="mailHost" value={data.mailHost} onChange={set} placeholder="smtp.gmail.com" />
        </div>
        <div className="col-md-6">
          <FieldInput label="Port" name="mailPort" value={data.mailPort} onChange={setNum} type="number" placeholder="587" />
          <FieldInput label="Người dùng" name="mailUsername" value={data.mailUsername} onChange={set} placeholder="user@gmail.com" />
          <div className="mb-3">
            <label className="form-label small fw-semibold">Mật khẩu</label>
            <div className="d-flex gap-2 align-items-center">
              <input type="password" value="••••••••" disabled className="form-control form-control-sm" style={{ maxWidth: 200 }} />
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => setShowPwChange(true)}
              >
                <i className="bi bi-key me-1"></i>Đổi mật khẩu
              </button>
            </div>
          </div>
          <div className="form-check mb-3">
            <input
              type="checkbox"
              className="form-check-input"
              id="mailSecure"
              checked={data.mailSecure ?? false}
              onChange={(e) => onChange({ ...data, mailSecure: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="mailSecure">Sử dụng SSL/TLS (port 465)</label>
          </div>
        </div>
      </div>
      {showPwChange && (
        <div className="border rounded p-3 mt-2 bg-light">
          <div className="mb-2 fw-semibold small">Đổi mật khẩu SMTP</div>
          <div className="d-flex gap-2 align-items-end">
            <div className="flex-grow-1">
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                className="form-control form-control-sm"
              />
            </div>
            <button type="button" className="btn btn-success btn-sm" disabled={pwLoading || !newPw.trim()} onClick={handlePwChange}>
              {pwLoading ? <span className="spinner-border spinner-border-sm"></span> : 'Lưu'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowPwChange(false); setNewPw(''); }}>
              Hủy
            </button>
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
}

// ─── InfoSection ──────────────────────────────────────────────────────────

function InfoSection({
  data,
  onChange,
  onReload,
  isReloading,
}: {
  data: InfoFields;
  onChange: (i: InfoFields) => void;
  onReload: () => void;
  isReloading: boolean;
}) {
  const set = (name: string, val: string) => onChange({ ...data, [name]: val || null });

  return (
    <CollapsibleCard
      title="Thông tin chung"
      icon="bi-building"
      isOpen={true}
      onToggle={() => {}}
      headerActions={
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          title="Làm mới"
          disabled={isReloading}
          onClick={(e) => { e.stopPropagation(); onReload(); }}
        >
          <i className={`bi bi-arrow-clockwise${isReloading ? ' fa-spin' : ''}`}></i>
        </button>
      }
    >
      <div className="row">
        <div className="col-md-6">
          <FieldInput label="Tên đơn vị" name="unitName" value={data.unitName} onChange={set} placeholder="Công ty TNHH Nội Thất Tiện Lợi" />
          <FieldInput label="Tên viết tắt" name="unitShortName" value={data.unitShortName} onChange={set} placeholder="NTL" />
          <FieldInput label="Địa chỉ" name="unitAddress" value={data.unitAddress} onChange={set} placeholder="123 Đường ABC, Quận 1, TP.HCM" rows={2} />
          <FieldInput label="Điện thoại" name="unitPhone" value={data.unitPhone} onChange={set} placeholder="0901 234 567" />
          <FieldInput label="Fax" name="unitFax" value={data.unitFax} onChange={set} placeholder="028 1234 5678" />
        </div>
        <div className="col-md-6">
          <FieldInput label="Email" name="unitEmail" value={data.unitEmail} onChange={set} type="email" placeholder="contact@example.com" />
          <FieldInput label="Website" name="unitWebsite" value={data.unitWebsite} onChange={set} placeholder="https://noithattienloi.vn" />
          <FieldInput label="Copyright" name="copyright" value={data.copyright} onChange={set} placeholder="© 2026 Nội Thất Tiện Lợi" />
          <div className="mb-3">
            <label className="form-label small fw-semibold">Nội dung website</label>
            <textarea
              name="websiteContent"
              value={data.websiteContent ?? ''}
              onChange={(e) => set('websiteContent', e.target.value)}
              rows={4}
              className="form-control form-control-sm"
              placeholder="Giới thiệu ngắn về website..."
            />
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
}
