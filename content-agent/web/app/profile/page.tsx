'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthGuard';

export default function ProfilePage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    document.title = 'Hồ Sơ - Content Agent';
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [user]);

  async function handleSave() {
    if (!formData.fullName.trim()) {
      alert('Vui lòng nhập họ tên');
      return;
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert('Mật khẩu mới không khớp');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          currentPassword: formData.currentPassword || undefined,
          newPassword: formData.newPassword || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('Cập nhật thành công!');
        setEditing(false);
        setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
        window.location.reload();
      } else {
        alert(json.error || 'Cập nhật thất bại');
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('Lỗi kết nối');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Hồ Sơ Cá Nhân</h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý thông tin tài khoản của bạn</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Avatar & Basic Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl">
                📚
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{user?.fullName || user?.username}</h2>
                <p className="text-gray-500 mt-1">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    {user?.role.name}
                  </span>
                  {user?.isSuperAdmin && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                      Super Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Thông Tin Tài Khoản</h3>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Chỉnh Sửa
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Username (readonly) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  value={user?.username || ''}
                  disabled
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={!editing}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              {/* Email (readonly) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {editing && (
                <>
                  <div className="border-t border-gray-200 pt-4 mt-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Đổi Mật Khẩu (Tùy chọn)</h4>
                  </div>

                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Mật khẩu hiện tại
                    </label>
                    <input
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      placeholder="Nhập mật khẩu hiện tại"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder="Nhập mật khẩu mới"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </>
              )}
            </div>

            {editing && (
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      fullName: user?.fullName || '',
                      email: user?.email || '',
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                  }}
                  className="px-5 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            )}
          </div>

          {/* Account Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-2xl mb-2">📝</div>
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-sm text-gray-500">Bài viết</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-2xl mb-2">💎</div>
              <div className="text-2xl font-bold text-gray-900">5,000</div>
              <div className="text-sm text-gray-500">Credits</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-sm text-gray-500">Hoạt động</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
