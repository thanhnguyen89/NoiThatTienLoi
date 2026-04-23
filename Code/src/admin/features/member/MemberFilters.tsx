'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface Props {
  defaultSearch: string;
  defaultIsActive: string;
  defaultEmailVerified: string;
  defaultPhoneVerified: string;
  defaultGender: string;
  defaultDateFrom: string;
  defaultDateTo: string;
  defaultHasOrder: string;
}

export function MemberFilters({
  defaultSearch,
  defaultIsActive,
  defaultEmailVerified,
  defaultPhoneVerified,
  defaultGender,
  defaultDateFrom,
  defaultDateTo,
  defaultHasOrder,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(defaultSearch);
  const [isActive, setIsActive] = useState(defaultIsActive);
  const [emailVerified, setEmailVerified] = useState(defaultEmailVerified);
  const [phoneVerified, setPhoneVerified] = useState(defaultPhoneVerified);
  const [gender, setGender] = useState(defaultGender);
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [hasOrder, setHasOrder] = useState(defaultHasOrder);

  const push = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('page');
    Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleSearch = () => {
    push({
      search: search.trim() || undefined,
      isActive: isActive || undefined,
      emailVerified: emailVerified || undefined,
      phoneVerified: phoneVerified || undefined,
      gender: gender || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      hasOrder: hasOrder || undefined,
    });
  };

  const handleReset = () => {
    setSearch('');
    setIsActive('');
    setEmailVerified('');
    setPhoneVerified('');
    setGender('');
    setDateFrom('');
    setDateTo('');
    setHasOrder('');
    push({
      search: undefined,
      isActive: undefined,
      emailVerified: undefined,
      phoneVerified: undefined,
      gender: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      hasOrder: undefined,
    });
  };

  return (
    <div>
      <div className="row g-2 align-items-end">
        <div className="col-md-3">
          <label className="form-label">Từ khóa</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Tên, email, SĐT, ID..."
            className="form-control form-control-sm"
          />
        </div>
        <div className="col-md-2">
          <label className="form-label">Trạng thái</label>
          <select className="form-select form-select-sm" value={isActive} onChange={(e) => setIsActive(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Khóa</option>
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label">Xác minh Email</label>
          <select className="form-select form-select-sm" value={emailVerified} onChange={(e) => setEmailVerified(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="verified">Đã xác minh</option>
            <option value="unverified">Chưa xác minh</option>
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label">Xác minh SĐT</label>
          <select className="form-select form-select-sm" value={phoneVerified} onChange={(e) => setPhoneVerified(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="verified">Đã xác minh</option>
            <option value="unverified">Chưa xác minh</option>
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label">Giới tính</label>
          <select className="form-select form-select-sm" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label">Từ ngày</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="form-control form-control-sm" />
        </div>
        <div className="col-md-2">
          <label className="form-label">Đến ngày</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="form-control form-control-sm" />
        </div>
        <div className="col-md-2">
          <label className="form-label">Có đơn hàng</label>
          <select className="form-select form-select-sm" value={hasOrder} onChange={(e) => setHasOrder(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="yes">Có</option>
            <option value="no">Không</option>
          </select>
        </div>
      </div>
      <div className="row mt-2">
        <div className="col-md-12 d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-sm btn-search" onClick={handleSearch}>
            <i className="bi bi-search me-1"></i>Tìm kiếm
          </button>
          <button type="button" className="btn btn-sm btn-reset" onClick={handleReset}>
            <i className="bi bi-arrow-counterclockwise me-1"></i>Làm mới
          </button>
        </div>
      </div>
    </div>
  );
}