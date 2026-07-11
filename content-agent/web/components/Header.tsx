'use client';

import { useAuth } from './AuthGuard';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh');
    document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  }

  return (
    <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 sticky top-0 z-10">
      <div className="flex items-center gap-6 flex-1">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
            AI
          </div>
          <span className="font-bold text-lg">Content Agent</span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-4 text-sm">
          <a href="/" className="text-blue-600 font-medium hover:text-blue-700">Viết Bài</a>
          <a href="/dashboard/articles" className="text-gray-600 hover:text-gray-900">Quản Lý Bài Viết</a>
          <a href="#" className="text-gray-600 hover:text-gray-900">Keyword Tools</a>
          <a href="#" className="text-gray-600 hover:text-gray-900">Cấu Hình</a>
        </nav>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <span className="text-blue-600">💎</span>
          <span>5,000</span>
        </button>
        
        {/* User dropdown */}
        <div className="relative border-l pl-4" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
          >
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{user?.fullName || user?.username}</div>
              <div className="text-xs text-gray-500">{user?.role.name}</div>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white">
              📚
            </div>
          </button>

          {/* Dropdown menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{user?.fullName || user?.username}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              
              <a
                href="/profile"
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>👤</span>
                <span>Hồ sơ</span>
              </a>
              
              <a
                href="/cau-hinh/ai-models"
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>🤖</span>
                <span>AI Models</span>
              </a>
              
              <a
                href="/cau-hinh/ai-check"
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>🔍</span>
                <span>AI Check Config</span>
              </a>
              
              <a
                href="/activity"
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>📊</span>
                <span>Log Activity</span>
              </a>
              
              <a
                href="/support-center"
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>💬</span>
                <span>Trung tâm hỗ trợ</span>
              </a>
              
              <div className="border-t border-gray-100 mt-2 pt-2">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left disabled:opacity-50"
                >
                  <span>{loggingOut ? '⏳' : '🚪'}</span>
                  <span>{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
