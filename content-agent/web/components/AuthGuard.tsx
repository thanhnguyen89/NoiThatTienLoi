'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

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
  isSuperAdmin: boolean;
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

  // Check auth function
  const checkAuth = async () => {
    // Allow login page
    if (pathname === '/login') {
      setChecking(false);
      return;
    }

    // Check cookie first (server uses cookie)
    const cookieToken = getCookie('admin_token');
    
    // Fallback to localStorage (for backward compatibility)
    const storedToken = cookieToken || localStorage.getItem('admin_token');
    
    if (!storedToken) {
      console.log('[AuthGuard] No token found, redirecting to login');
      router.replace('/login?redirect=' + encodeURIComponent(pathname));
      return;
    }

    // Validate token
    const payload = decodeJwt(storedToken);
    if (!payload) {
      console.log('[AuthGuard] Token expired or invalid, redirecting to login');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh');
      // Clear cookie
      document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      router.replace('/login?redirect=' + encodeURIComponent(pathname));
      return;
    }

    setToken(storedToken);

    // Fetch user info
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      const json = await res.json();
      
      if (json.success) {
        setUser(json.data);
        setChecking(false);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      console.error('[AuthGuard] Failed to fetch user:', err);
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh');
      document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      router.replace('/login');
    }
  };

  // Initial check
  useEffect(() => {
    checkAuth();
  }, [pathname]);

  // Periodic token check (every 1 minute)
  useEffect(() => {
    if (pathname === '/login') return;

    const interval = setInterval(() => {
      const cookieToken = getCookie('admin_token');
      const storedToken = cookieToken || localStorage.getItem('admin_token');
      
      if (!storedToken) {
        console.log('[AuthGuard] Token disappeared, redirecting to login');
        router.replace('/login?redirect=' + encodeURIComponent(pathname));
        return;
      }

      const payload = decodeJwt(storedToken);
      if (!payload) {
        console.log('[AuthGuard] Token expired during session, redirecting to login');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh');
        document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        router.replace('/login?redirect=' + encodeURIComponent(pathname));
      }
    }, 60000); // Check every 1 minute

    return () => clearInterval(interval);
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
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

