'use client';

interface SystemConfigItem {
  id: string;
  imageUrl: string | null;
  displayRowCount: number | null;
  pageTitle: string | null;
  keywords: string | null;
  metaDescription: string | null;
  logoUrl: string | null;
  accessTimeFrom: string | null;
  accessTimeTo: string | null;
  holidays: string | null;
  totalAccessCount: bigint | null;
}

interface Props {
  config: SystemConfigItem | null;
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="row mb-2">
      <div className="col-4 fw-semibold text-muted small">{label}</div>
      <div className="col-8">{value || <span className="text-muted">—</span>}</div>
    </div>
  );
}

export function SystemConfigTable({ config }: Props) {
  if (!config) {
    return (
      <table className="table table-bordered mb-0 w-100">
        <tbody>
          <tr>
            <td className="text-center text-muted py-4">
              <i className="bi bi-gear fs-1 d-block mb-2"></i>
              Chưa có cấu hình hệ thống. Nhấn "Cấu hình" để thiết lập.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <div className="p-3">
      <div className="row g-4">
        {/* Left column: Text fields */}
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header fw-semibold small">Thông tin chung</div>
            <div className="card-body py-2">
              <FieldRow label="Page Title" value={<span className="small">{config.pageTitle}</span>} />
              <FieldRow label="Keywords" value={<span className="small">{config.keywords}</span>} />
              <FieldRow label="Meta Description" value={<span className="small">{config.metaDescription}</span>} />
              <FieldRow label="Số dòng hiển thị" value={config.displayRowCount} />
            </div>
          </div>
        </div>

        {/* Right column: Time/access fields */}
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header fw-semibold small">Thời gian truy cập</div>
            <div className="card-body py-2">
              <FieldRow label="Từ giờ" value={config.accessTimeFrom} />
              <FieldRow label="Đến giờ" value={config.accessTimeTo} />
              <FieldRow label="Ngày nghỉ" value={<span className="small">{config.holidays}</span>} />
              <FieldRow label="Tổng lượt truy cập" value={config.totalAccessCount} />
            </div>
          </div>
        </div>

        {/* Images row */}
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header fw-semibold small">Logo</div>
            <div className="card-body py-2">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" style={{ maxWidth: 160, maxHeight: 80, objectFit: 'contain' }} />
              ) : (
                <span className="text-muted small">—</span>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header fw-semibold small">Hình ảnh</div>
            <div className="card-body py-2">
              {config.imageUrl ? (
                <img src={config.imageUrl} alt="Config" style={{ maxWidth: 160, maxHeight: 80, objectFit: 'contain' }} />
              ) : (
                <span className="text-muted small">—</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
