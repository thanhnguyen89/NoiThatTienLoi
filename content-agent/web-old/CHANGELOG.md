# Changelog - Content Agent Web UI

## [2.0.0] - 2025-01-20

### 🎉 Major Update: Authentication System

Refactored toàn bộ giao diện theo cấu trúc admin của Next.js project trong thư mục `Code`.

### ✨ Added

#### Authentication
- ✅ Login page riêng biệt (`/login.html`)
- ✅ Session-based authentication với HttpOnly cookies
- ✅ Token stored in localStorage
- ✅ AuthGuard middleware để protect routes
- ✅ Auto-redirect khi chưa login
- ✅ Logout functionality với loading state
- ✅ Session timeout: 8 giờ

#### UI/UX Improvements
- ✅ Sidebar với user info section
  - Avatar placeholder
  - Display name
  - Role badge
  - Logout button
- ✅ Brand footer: "Nội Thất Minh Quân - Content Agent System"
- ✅ Google Fonts integration (Inter, Playfair Display, DM Mono)
- ✅ Responsive login form với:
  - Toggle password visibility
  - Remember me checkbox
  - Forgot password link
  - Loading states
  - Error messages
  - Success feedback

#### API Endpoints
- ✅ `POST /api/login` - Login endpoint
- ✅ `POST /api/auth/login` - Alternative login endpoint
- ✅ `POST /api/auth/logout` - Logout endpoint
- ✅ `GET /api/auth/me` - Get current user info
- ✅ All data endpoints now require authentication

#### Security
- ✅ Session management với Map-based storage
- ✅ Token expiration (8 hours)
- ✅ HttpOnly cookies
- ✅ Authorization header support
- ✅ Auto-cleanup expired sessions

#### Documentation
- ✅ `README.md` - Setup và installation guide
- ✅ `USAGE.md` - Chi tiết hướng dẫn sử dụng từng feature
- ✅ `CHANGELOG.md` - Version history
- ✅ `.env.example` - Environment variables template
- ✅ `.gitignore` - Ignore sensitive files

#### Configuration
- ✅ Environment variables cho admin credentials
  - `ADMIN_USERNAME` (default: admin)
  - `ADMIN_PASSWORD` (default: admin123)
- ✅ npm scripts:
  - `npm start` - Production mode
  - `npm run dev` - Development mode với auto-reload

### 🔧 Changed

#### Server (`server.js`)
- Refactored authentication logic
- Added session management
- Added cookie helpers
- Added `requireAuth` middleware
- Protected all API routes

#### Client (`app.js`)
- Added `checkAuth()` function
- Added `authFetch()` wrapper
- Added `logout()` function
- Added `updateUserInfo()` function
- All API calls now use `authFetch()`

#### Styles (`styles.css`)
- Added `.user-info` styles
- Added `.user-avatar` styles
- Added `.user-details` styles
- Added `.btn-logout` styles
- Added `.spinner-border` animation
- Updated sidebar layout

#### HTML (`index.html`)
- Updated brand name: "Forme" → "Nội Thất Minh Quân"
- Updated tagline
- Fixed font imports
- Fixed encoding issues (UTF-8)
- Fixed emoji rendering

### 🐛 Fixed
- ✅ Font display issues (added Google Fonts)
- ✅ Encoding issues in HTML (UTF-8)
- ✅ Emoji rendering
- ✅ Vietnamese characters display

### 📝 Files Added
```
web/
├── public/
│   └── login.html          # NEW: Login page
├── .env.example            # NEW: Environment template
├── .gitignore              # NEW: Git ignore rules
├── README.md               # NEW: Setup guide
├── USAGE.md                # NEW: User guide
└── CHANGELOG.md            # NEW: This file
```

### 📝 Files Modified
```
web/
├── public/
│   ├── index.html          # Updated: Brand name, fonts, user info
│   ├── app.js              # Updated: Auth logic, API calls
│   └── styles.css          # Updated: User info styles, animations
├── server.js               # Updated: Auth system, session management
├── package.json            # Updated: Added dev script
└── .env                    # Updated: Added admin credentials
```

### 🎯 Architecture

#### Before (v1.0.0)
```
User → index.html → app.js → server.js → Gemini API
                                       → Mock Data
```

#### After (v2.0.0)
```
User → login.html → POST /api/login → Session Created
                                    → Token Saved
                                    → Redirect to /

User → index.html → checkAuth() → GET /api/auth/me
                                → Valid? → Load App
                                → Invalid? → Redirect to /login.html

User → app.js → authFetch() → requireAuth middleware
                            → Valid? → API Response
                            → Invalid? → 401 → Redirect to /login.html
```

### 🔐 Security Model

#### Session Flow
1. User submits login form
2. Server validates credentials
3. Server creates session with random token
4. Server sets HttpOnly cookie + returns token in response
5. Client stores token in localStorage
6. Client includes token in Authorization header for all requests
7. Server validates token on each request
8. Session expires after 8 hours

#### Token Storage
- **Server:** Map-based in-memory storage (sessions Map)
- **Client:** localStorage (`ca_token`, `ca_user`)
- **Cookie:** HttpOnly, SameSite=Lax, Max-Age=28800 (8 hours)

### 🚀 Migration Guide

#### For existing users:

1. **Pull latest code**
   ```bash
   git pull origin main
   ```

2. **Update .env**
   ```bash
   # Add these lines to .env
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ```

3. **Restart server**
   ```bash
   npm start
   ```

4. **Clear browser data**
   - Open DevTools (F12)
   - Console tab
   - Run: `localStorage.clear()`
   - Refresh page

5. **Login**
   - Username: admin
   - Password: admin123

### 📊 Metrics

- **Lines of code added:** ~800
- **Files added:** 5
- **Files modified:** 6
- **Breaking changes:** Yes (requires login)
- **Backward compatible:** No

### 🎓 Learning Resources

- [README.md](./README.md) - Setup guide
- [USAGE.md](./USAGE.md) - Detailed user guide
- [.env.example](./.env.example) - Configuration template

### 🐛 Known Issues

1. **Session storage in-memory**
   - Sessions lost on server restart
   - Not suitable for multi-instance deployment
   - **Solution:** Use Redis or database for production

2. **No password hashing**
   - Passwords stored in plain text in .env
   - **Solution:** Use bcrypt for production

3. **No refresh token**
   - User must re-login after 8 hours
   - **Solution:** Implement refresh token flow

4. **No rate limiting**
   - Vulnerable to brute force attacks
   - **Solution:** Add express-rate-limit

5. **Image generation mock**
   - Thumbnail and section images use placeholders
   - **Solution:** Integrate Gemini Imagen / DALL-E / OpenRouter

### 🔮 Future Enhancements

- [ ] Database-backed session storage (Redis/PostgreSQL)
- [ ] Password hashing with bcrypt
- [ ] Refresh token flow
- [ ] Rate limiting
- [ ] CSRF protection
- [ ] 2FA support
- [ ] User management UI
- [ ] Role-based access control (RBAC)
- [ ] Audit logs
- [ ] Real image generation (Gemini Imagen)
- [ ] Export to WordPress API
- [ ] Export to Shopify API
- [ ] History view with search/filter
- [ ] Batch processing
- [ ] Scheduled publishing

### 👥 Contributors

- AI Assistant (Kiro) - Full implementation

### 📄 License

Internal use only - Nội Thất Minh Quân

---

## [1.0.0] - 2025-01-19

### Initial Release
- Basic pipeline UI
- 8-step content generation
- Gemini API integration
- Mock data fallback
- Brand context loading
- SSE real-time updates
