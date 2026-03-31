'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && Date.now() >= (payload.exp as number) * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  role: { name: string; code: string };
}

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
}

const AuthContext = createContext<AuthContextValue>({ user: null, token: null });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Cho phép trang login đi qua
    if (pathname === '/admin/login') {
      setChecking(false);
      return;
    }

    const storedToken = localStorage.getItem('admin_token');
    if (!storedToken) {
      router.replace('/admin/login?redirect=' + encodeURIComponent(pathname));
      return;
    }
    const payload = decodeJwt(storedToken);
    if (!payload) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh');
      router.replace('/admin/login?redirect=' + encodeURIComponent(pathname));
      return;
    }
    setToken(storedToken);
    // Fetch user info
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setUser(j.data);
        setChecking(false);
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh');
        router.replace('/admin/login');
      });
  }, [router, pathname]);

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token }}>
      {children}
    </AuthContext.Provider>
  );
}
