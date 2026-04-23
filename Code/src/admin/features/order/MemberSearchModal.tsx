'use client';

import { useState } from 'react';

interface Member {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  email: string | null;
}

interface MemberSearchModalProps {
  onSelect: (member: Member) => void;
  onClose: () => void;
}

export function MemberSearchModal({ onSelect, onClose }: MemberSearchModalProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!search.trim()) {
      alert('Vui lòng nhập từ khóa tìm kiếm');
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/admin/api/members?search=${encodeURIComponent(search)}&pageSize=20`);
      const json = await res.json();

      if (json.success) {
        setResults(json.data || []);
        if (json.data.length === 0) {
          alert('Không tìm thấy thành viên nào');
        }
      } else {
        alert(json.error || 'Lỗi khi tìm kiếm');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Lỗi kết nối');
    } finally {
      setSearching(false);
    }
  }

  function handleSelectMember(member: Member) {
    onSelect(member);
    onClose();
  }

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-search me-2"></i>
              Tìm kiếm thành viên
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>

          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Tìm kiếm theo tên, SĐT hoặc email:</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Nhập tên, số điện thoại hoặc email..."
                  autoFocus
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSearch}
                  disabled={searching}
                >
                  {searching ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    <>
                      <i className="bi bi-search me-1"></i>
                      Tìm kiếm
                    </>
                  )}
                </button>
              </div>
              <small className="text-muted">
                Nhập ít nhất 2 ký tự để tìm kiếm
              </small>
            </div>

            {results.length > 0 && (
              <div>
                <div className="fw-semibold mb-2">
                  Tìm thấy {results.length} thành viên:
                </div>
                <div className="list-group" style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {results.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="list-group-item list-group-item-action"
                      onClick={() => handleSelectMember(member)}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="fw-semibold mb-1">
                            <i className="bi bi-person-fill me-2 text-primary"></i>
                            {member.fullName}
                          </div>
                          <div className="small text-muted">
                            {member.phoneNumber && (
                              <span className="me-3">
                                <i className="bi bi-telephone me-1"></i>
                                {member.phoneNumber}
                              </span>
                            )}
                            {member.email && (
                              <span>
                                <i className="bi bi-envelope me-1"></i>
                                {member.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="badge bg-primary">
                            <i className="bi bi-check2"></i> Chọn
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!searching && results.length === 0 && search && (
              <div className="text-center text-muted py-4">
                <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                Không tìm thấy thành viên nào.
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
