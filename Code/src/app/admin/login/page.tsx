'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  }

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError('Vui lòng nhập username và mật khẩu');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || `Lỗi ${res.status}: ${JSON.stringify(json)}`); return; }
      localStorage.setItem('admin_token', json.data.tokens.accessToken);
      localStorage.setItem('admin_refresh', json.data.tokens.refreshToken);
      window.location.href = '/admin';
    } catch (err) {
      console.error('Login error:', err);
      setError('Lỗi kết nối: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1F7A5C 0%, #2E8B6E 50%, #3A9D7C 100%)',
      // Ẩn AdminTopNav và reset padding từ AdminLayout
    }}>
      {/* Override AdminLayout styles */}
      <style>{`
        .admin-topnav { display: none !important; }
        .container-fluid { padding: 0 !important; }
        body { background: transparent !important; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420, padding: '0 16px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <i className="bi bi-shop" style={{ fontSize: 36, color: '#fff' }}></i>
          </div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Nội Thất Minh Qui</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>Hệ thống quản trị</p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '32px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <h2 style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Đăng nhập</h2>
          <p style={{ textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 24 }}>Vui lòng nhập thông tin để tiếp tục</p>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-exclamation-triangle-fill"></i>
              {error}
            </div>
          )}

          <form onSubmit={submit} noValidate>
            {/* Username */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-person-fill" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 15 }}></i>
                <input
                  type="text" name="username" value={form.username} onChange={handle}
                  placeholder="Tên đăng nhập" autoComplete="username" autoFocus
                  style={{ width: '100%', padding: '11px 12px 11px 36px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-lock-fill" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 15 }}></i>
                <input
                  type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handle}
                  placeholder="Mật khẩu" autoComplete="current-password"
                  style={{ width: '100%', padding: '11px 40px 11px 36px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 0 }}>
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" /> Ghi nhớ đăng nhập
              </label>
              <a href="#" style={{ fontSize: 13, color: '#1976d2', textDecoration: 'none' }}>Quên mật khẩu?</a>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px', background: loading ? '#aaa' : '#1F7A5C',
              color: '#fff', border: 'none', borderRadius: 50, fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? (
                <><span style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}></span> Đang đăng nhập...</>
              ) : (
                <><i className="bi bi-box-arrow-in-right"></i> Đăng nhập</>
              )}
            </button>
          </form>
        </div>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}>
            <i className="bi bi-arrow-left me-1"></i>Quay lại cửa hàng
          </Link>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
