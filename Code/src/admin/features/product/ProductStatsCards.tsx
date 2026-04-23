interface Props {
  stats: {
    total: number;
    active: number;
    inactive: number;
    featured: number;
  };
}

export function ProductStatsCards({ stats }: Props) {
  return (
    <div className="row g-3 mb-3">
      <div className="col-md-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body d-flex align-items-center">
            <div className="flex-shrink-0 bg-primary bg-opacity-10 rounded p-3 me-3">
              <i className="bi bi-box-seam fs-3 text-primary"></i>
            </div>
            <div className="flex-grow-1">
              <div className="text-muted small mb-1">Tổng sản phẩm</div>
              <div className="fs-4 fw-bold">{stats.total.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body d-flex align-items-center">
            <div className="flex-shrink-0 bg-success bg-opacity-10 rounded p-3 me-3">
              <i className="bi bi-check-circle fs-3 text-success"></i>
            </div>
            <div className="flex-grow-1">
              <div className="text-muted small mb-1">Đang công khai</div>
              <div className="fs-4 fw-bold">{stats.active.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body d-flex align-items-center">
            <div className="flex-shrink-0 bg-secondary bg-opacity-10 rounded p-3 me-3">
              <i className="bi bi-eye-slash fs-3 text-secondary"></i>
            </div>
            <div className="flex-grow-1">
              <div className="text-muted small mb-1">Đang ẩn</div>
              <div className="fs-4 fw-bold">{stats.inactive.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body d-flex align-items-center">
            <div className="flex-shrink-0 bg-warning bg-opacity-10 rounded p-3 me-3">
              <i className="bi bi-star-fill fs-3 text-warning"></i>
            </div>
            <div className="flex-grow-1">
              <div className="text-muted small mb-1">Sản phẩm nổi bật</div>
              <div className="fs-4 fw-bold">{stats.featured.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
