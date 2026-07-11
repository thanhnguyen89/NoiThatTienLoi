# Content Agent Web UI

Giao diện web cho hệ thống Content Agent - tạo nội dung tự động với pipeline 8 bước.

## 🚀 Cài đặt

```bash
# 1. Cài đặt dependencies
npm install

# 2. Cấu hình môi trường
cp .env.example .env
# Chỉnh sửa .env với thông tin của bạn

# 3. Chạy server
npm start
```

Server sẽ chạy tại: http://localhost:3000

## 🔐 Đăng nhập

Mặc định:
- **Username:** admin
- **Password:** admin123

Để thay đổi, chỉnh sửa trong file `.env`:
```env
ADMIN_USERNAME=your_username
ADMIN_PASSWORD=your_password
```

## 📋 Pipeline 8 bước

1. **Research** - Phân tích keyword, search intent, đối tượng mục tiêu
2. **Outline** - Tạo dàn ý chi tiết với H2/H3, meta description
3. **Content** - Viết bài HTML hoàn chỉnh theo dàn ý
4. **SEO Optimize** - Tối ưu kỹ thuật SEO (title, meta, keyword density)
5. **QC / Humanize** - Xóa dấu vết AI, chấm Humanness Score
6. **Thumbnail** - Tạo ảnh đại diện 1200x630 bằng AI
7. **Section Images** - Ảnh minh họa evocative/cinematic cho từng section
8. **Publish** - Hiển thị preview + báo cáo, chờ xác nhận publish

## 🎨 Tính năng

- ✅ Authentication với session-based login
- ✅ Pipeline SSE (Server-Sent Events) real-time
- ✅ Gemini API integration với mock fallback
- ✅ Brand context từ markdown files
- ✅ Humanness scoring (threshold ≥76 để publish)
- ✅ SEO optimization tự động
- ✅ Preview bài viết trước khi publish

## 📁 Cấu trúc

```
web/
├── public/
│   ├── index.html      # Main app (sau khi login)
│   ├── login.html      # Login page
│   ├── app.js          # Client-side logic
│   └── styles.css      # Styles
├── server.js           # Express server + API
├── .env                # Environment variables
└── package.json
```

## 🔧 API Endpoints

### Authentication
- `POST /api/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Data
- `GET /api/brand` - Lấy brand context
- `GET /api/products` - Lấy danh sách sản phẩm
- `GET /api/status` - Kiểm tra Gemini API status

### Pipeline
- `GET /api/pipeline/stream` - Chạy pipeline (SSE)

## 🛠️ Development

```bash
# Chạy với nodemon (auto-reload)
npm run dev

# Chạy production
npm start
```

## 📝 Notes

- Session timeout: 8 giờ
- Gemini API quota: Nếu hết quota sẽ tự động fallback sang mock data
- Humanness threshold: ≥76 để publish, 60-75 cần review, <60 cần viết lại
- Banned words: 14 từ AI-style được filter tự động

## 🔒 Security

- Session-based authentication với HttpOnly cookies
- Token stored in localStorage (client-side)
- CORS disabled (same-origin only)
- No password hashing (development only - nên thêm bcrypt cho production)

## 📚 Context Files

Brand context được load từ:
- `../context/brand-guideline.md`
- `../context/customer-persona.md`
- `../context/marketing-channels.md`
- `../context/product-catalog.md`
- `../sop/content-sop.md`
- `../sop/research-sop.md`
- `../data/performance-latest.md`

## 🎯 Brand DNA

**Nội Thất Minh Quân**
- Chân thật – Chuyên nghiệp – Gần gũi
- 14 banned words (AI-style + marketing-fluff)
- Humanness Score threshold: ≥76

## 🐛 Troubleshooting

**Server không start:**
```bash
# Check port 3000 có bị chiếm không
netstat -ano | findstr :3000

# Kill process nếu cần
taskkill /PID <PID> /F
```

**Gemini API lỗi:**
- Check API key trong `.env`
- Check quota tại: https://aistudio.google.com/
- System sẽ tự động fallback sang mock data

**Login không hoạt động:**
- Clear localStorage: `localStorage.clear()`
- Check credentials trong `.env`
- Check server logs

## 📄 License

Internal use only - Nội Thất Minh Quân
