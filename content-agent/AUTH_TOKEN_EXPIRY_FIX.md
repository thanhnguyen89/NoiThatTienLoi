# Fix: Token Expiry Auto Logout

## Vấn Đề

Khi token hết hạn (sau 8 giờ), user vẫn ở trong trang và không bị redirect về `/login`. Điều này gây ra lỗi 401 Unauthorized khi gọi API.

## Nguyên Nhân

1. **AuthGuard chỉ check token 1 lần** khi component mount
2. **Không có periodic check** để phát hiện token hết hạn
3. **Cookie và localStorage không sync** - Server dùng cookie, client check localStorage

## Giải Pháp

### 1. Cập nhật AuthGuard

File: `web/components/AuthGuard.tsx`

**Thay đổi:**

#### a) Thêm function đọc cookie
```typescript
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}
```

#### b) Check cả cookie và localStorage
```typescript
// Check cookie first (server uses cookie)
const cookieToken = getCookie('admin_token');

// Fallback to localStorage (for backward compatibility)
const storedToken = cookieToken || localStorage.getItem('admin_token');
```

#### c) Thêm periodic check (mỗi 1 phút)
```typescript
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
```

#### d) Clear cookie khi logout
```typescript
// Clear cookie
document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
```

### 2. Token Expiry Time

File: `web/app/api/auth/login/route.ts`

Cookie expires sau **8 giờ**:
```typescript
const cookieExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
```

JWT token cũng expires sau **8 giờ**:
```typescript
// In web/lib/auth.ts
const accessToken = jwt.sign(payload, secret, { expiresIn: '8h' });
```

## Cách Hoạt Động

### Flow Bình Thường

1. User login → Server set cookie `admin_token` (expires 8h)
2. Client save token vào `localStorage`
3. AuthGuard check token khi mount
4. AuthGuard check token mỗi 1 phút
5. Nếu token còn hạn → Continue
6. Nếu token hết hạn → Redirect `/login`

### Flow Khi Token Hết Hạn

```
User đang ở trang → AuthGuard check (1 phút 1 lần)
                  ↓
            Token hết hạn?
                  ↓ Yes
         Clear localStorage
         Clear cookie
                  ↓
    Redirect to /login?redirect=/current-page
                  ↓
         User login lại
                  ↓
    Redirect về trang cũ
```

## Testing

### Test 1: Token hết hạn tự động
1. Login vào hệ thống
2. Đợi 8 giờ (hoặc thay đổi expiry thành 1 phút để test)
3. Sau 1 phút, AuthGuard sẽ phát hiện token hết hạn
4. Tự động redirect về `/login`

### Test 2: Manual clear token
1. Login vào hệ thống
2. Mở DevTools → Application → Cookies
3. Xóa cookie `admin_token`
4. Đợi 1 phút
5. Tự động redirect về `/login`

### Test 3: API call với token hết hạn
1. Login vào hệ thống
2. Clear cookie `admin_token`
3. Gọi API (ví dụ: load AI models)
4. API trả về 401 Unauthorized
5. AuthGuard phát hiện và redirect về `/login`

## Cải Tiến Thêm (TODO)

### 1. Token Refresh
Thay vì logout khi token hết hạn, có thể tự động refresh token:

```typescript
// Check if token will expire in next 5 minutes
const payload = decodeJwt(storedToken);
if (payload.exp && (payload.exp * 1000 - Date.now()) < 5 * 60 * 1000) {
  // Refresh token
  const refreshToken = localStorage.getItem('admin_refresh');
  if (refreshToken) {
    await fetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }
}
```

### 2. Warning Before Expiry
Hiển thị warning 5 phút trước khi token hết hạn:

```typescript
if (payload.exp && (payload.exp * 1000 - Date.now()) < 5 * 60 * 1000) {
  showToast('Phiên đăng nhập sắp hết hạn. Vui lòng lưu công việc.');
}
```

### 3. Activity-Based Expiry
Reset expiry time khi user có hoạt động:

```typescript
// On user activity (click, type, etc.)
document.addEventListener('click', () => {
  // Extend token expiry
  fetch('/api/auth/extend-session', { method: 'POST' });
});
```

## Files Changed

- `web/components/AuthGuard.tsx` - Added periodic token check
- `AUTH_TOKEN_EXPIRY_FIX.md` - This documentation

## Related Issues

- Token không sync giữa cookie và localStorage
- API routes trả về 401 khi token hết hạn
- User không biết token đã hết hạn

## References

- JWT expiry: https://jwt.io/introduction
- Cookie expiry: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
- Next.js authentication: https://nextjs.org/docs/authentication
