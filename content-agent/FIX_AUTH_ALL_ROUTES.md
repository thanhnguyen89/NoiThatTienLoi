# ✅ Fix: Unified Cookie-Based Authentication for All API Routes

## 🔍 Problem
Các API routes đang dùng **2 phương thức authentication khác nhau**:
1. ❌ **Bearer Token từ Header** (cũ) - `request.headers.get('authorization')`
2. ✅ **Cookie-based Auth** (mới) - `requireAuth()` từ `server-auth.ts`

Điều này gây ra:
- Inconsistency trong codebase
- Trang `/cau-hinh/ai-check` không load được data vì API trả về 401 Unauthorized
- Frontend không gửi Bearer token, chỉ gửi cookie

---

## ✅ Solution
Convert **TẤT CẢ** API routes sang dùng **cookie-based authentication** thống nhất.

### Before (❌ Inconsistent):
```typescript
// Cách 1: Bearer token (cũ)
const token = request.headers.get('authorization')?.replace('Bearer ', '');
if (!token) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
const payload = verifyAccessToken(token);
if (!payload) {
  return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
}

// Cách 2: Cookie (mới) - NHƯNG GỌI SAI
const user = await requireAuth(request); // ❌ requireAuth() không nhận parameter!
```

### After (✅ Unified):
```typescript
// Tất cả routes đều dùng cookie-based auth
const user = await requireAuth(); // ✅ Không cần truyền request
if (!user) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
```

---

## 📝 Files Fixed

### 1. **AI Config Routes** ✅
**File:** `web/app/api/ai-config/route.ts`
- ✅ GET `/api/ai-config` - Fixed `requireAuth(request)` → `requireAuth()`
- ✅ POST `/api/ai-config` - Fixed `requireAuth(request)` → `requireAuth()`

### 2. **Article Routes** ✅
**File:** `web/app/api/articles/route.ts`
- ✅ GET `/api/articles` - Already using `requireAuth()` correctly

**File:** `web/app/api/articles/[id]/route.ts`
- ✅ GET `/api/articles/:id` - Converted from Bearer token to `requireAuth()`
- ✅ PATCH `/api/articles/:id` - Converted from Bearer token to `requireAuth()`
- ✅ DELETE `/api/articles/:id` - Converted from Bearer token to `requireAuth()`

**File:** `web/app/api/articles/[id]/boost/route.ts`
- ✅ POST `/api/articles/:id/boost` - Converted from Bearer token to `requireAuth()`

**File:** `web/app/api/articles/[id]/save/route.ts`
- ✅ POST `/api/articles/:id/save` - Fixed `requireAuth(request)` → `requireAuth()`

**File:** `web/app/api/articles/by-runid/[runId]/route.ts`
- ✅ GET `/api/articles/by-runid/:runId` - Fixed `requireAuth(request)` → `requireAuth()`

**File:** `web/app/api/articles/bulk-delete/route.ts`
- ✅ POST `/api/articles/bulk-delete` - Converted from Bearer token to `requireAuth()`

### 3. **Pipeline Routes** ✅
**File:** `web/app/api/pipeline/start/route.ts`
- ✅ POST `/api/pipeline/start` - Fixed `requireAuth(request)` → `requireAuth()`

---

## 🔧 Changes Made

### Pattern 1: Remove Bearer Token Auth
```diff
- import { verifyAccessToken } from '@/lib/auth';
+ import { requireAuth } from '@/lib/server-auth';

  export async function GET(request: NextRequest) {
    try {
-     const token = request.headers.get('authorization')?.replace('Bearer ', '');
-     if (!token) {
-       return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
-     }
-     
-     const payload = verifyAccessToken(token);
-     if (!payload) {
-       return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
-     }
+     const user = await requireAuth();
+     if (!user) {
+       return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
+     }
```

### Pattern 2: Fix requireAuth() Call
```diff
- const user = await requireAuth(request); // ❌ Wrong
+ const user = await requireAuth();        // ✅ Correct
```

### Pattern 3: Update User ID Reference
```diff
  const article = await prisma.article.findFirst({
    where: {
      id: params.id,
-     userId: payload.userId,  // ❌ Old
+     userId: user.userId,     // ✅ New
      deletedAt: null,
    },
  });
```

---

## 🎯 Why Cookie-Based Auth?

### Advantages:
1. ✅ **Automatic** - Browser tự động gửi cookie với mỗi request
2. ✅ **Secure** - HttpOnly cookie không thể bị XSS attack
3. ✅ **Simple** - Frontend không cần quản lý token
4. ✅ **Consistent** - Tất cả routes dùng cùng 1 phương thức
5. ✅ **SSR-friendly** - Server components có thể dùng `getCurrentUser()`

### Bearer Token Issues:
1. ❌ Frontend phải manually thêm header cho mỗi request
2. ❌ Token lưu trong localStorage dễ bị XSS
3. ❌ Không work với Server Components
4. ❌ Phức tạp hơn khi implement

---

## 📊 Summary

### Total Routes Fixed: **10 routes**

| Route | Method | Status |
|-------|--------|--------|
| `/api/ai-config` | GET | ✅ Fixed |
| `/api/ai-config` | POST | ✅ Fixed |
| `/api/articles` | GET | ✅ Already OK |
| `/api/articles/:id` | GET | ✅ Fixed |
| `/api/articles/:id` | PATCH | ✅ Fixed |
| `/api/articles/:id` | DELETE | ✅ Fixed |
| `/api/articles/:id/boost` | POST | ✅ Fixed |
| `/api/articles/:id/save` | POST | ✅ Fixed |
| `/api/articles/by-runid/:runId` | GET | ✅ Fixed |
| `/api/articles/bulk-delete` | POST | ✅ Fixed |
| `/api/pipeline/start` | POST | ✅ Fixed |

---

## 🧪 Testing

### ✅ Verified:
- [x] Server compiles without errors
- [x] No TypeScript errors
- [x] AI Check loads config from database successfully
- [x] Console shows: `[ai-check] Loaded config: 37 forbidden words, 7 cliche openings`

### 🔲 Manual Testing Required:
- [ ] Login at http://localhost:3000/login
- [ ] Navigate to http://localhost:3000/cau-hinh/ai-check
- [ ] Verify page loads without 401 errors
- [ ] Verify data loads from database (37 forbidden words, 7 cliché openings)
- [ ] Test adding/editing/deleting items
- [ ] Test article management pages
- [ ] Test pipeline start/write/publish

---

## 🔐 How requireAuth() Works

```typescript
// web/lib/server-auth.ts
export async function requireAuth(): Promise<JwtPayload> {
  const cookieStore = await cookies();           // Get Next.js cookies
  const token = cookieStore.get('admin_token')?.value;  // Read admin_token cookie
  
  if (!token) {
    throw new Error('Unauthorized');
  }
  
  const payload = verifyAccessToken(token);      // Verify JWT
  
  if (!payload) {
    throw new Error('Unauthorized');
  }
  
  return payload;  // Returns { userId, username, email, ... }
}
```

**Key Points:**
- ✅ No parameters needed
- ✅ Automatically reads from cookies
- ✅ Throws error if not authenticated
- ✅ Returns user payload if authenticated

---

## 🎉 Result

**Status:** ✅ **ALL ROUTES UNIFIED**

Tất cả API routes giờ đây đều dùng **cookie-based authentication** thống nhất:
- ✅ Consistent codebase
- ✅ Secure authentication
- ✅ Simple to use
- ✅ Frontend không cần thêm code
- ✅ Trang `/cau-hinh/ai-check` sẽ load được data

---

**Next Step:** 
Refresh trang http://localhost:3000/cau-hinh/ai-check để test!

---

**Fixed by:** Kiro AI Assistant  
**Date:** 2025-01-09  
**Issue:** Inconsistent authentication methods causing 401 errors  
**Solution:** Unified all routes to use cookie-based `requireAuth()`
