# Đánh giá code Category theo các chuẩn phổ biến
  ## 1. Kiến trúc Layered (3-layer)
  - ✅ Repository (src/server/repositories/category.repository.ts) - giao tiếp Prisma/DB                                                                                                                                                         
  - ✅ Service (src/server/services/category.service.ts) - logic nghiệp vụ, validation, kiểm tra trùng lặp
  - ✅ Route/API (trong src/app) - xử lý HTTP request
  ## 2. Clean Architecture
  - ✅ Tách biệt rõ: Repository → Service → Validator → Route                                                                                                                                                      
  - ✅ Re-export qua nhiều route.ts (điều hướng request)
  ## 3. Design Patterns
  - ✅ Repository Pattern - truy xuất data qua lớp trung gian 
  - ✅ Service Layer Pattern - logic nghiệp vụ ở tầng service
  - ✅ Validator Pattern - dùng Zod schema
  - ✅ Partial Re-export pattern cho route (gọn, dễ maintain)
  ## 4. Zod Validation
  - ✅ Schema-driven validation với Zod             
  - ✅ Tách CategoryInput type từ schema
  ## 5. API REST chuẩn
  - ✅ GET /api/categories - list 
  - ✅ POST /api/categories - create (admin)
  - ✅ GET /api/categories/[id] - detail (chưa thấy route.ts riêng)
  - ✅ PUT /api/categories/[id] - update (admin)       
  - ✅ DELETE /api/categories/[id] - delete (admin)
  6. Điểm cần lưu ý
  ┌─────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  ┌───────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  ┌─────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  ┌─────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │            Khía cạnh            │                                                              Tình trạng                                                               │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Error handling     C  t       C │t✅ Có throw custom error với type                                                                  │      │                            │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Select/Include tối giản       D │ ✅ Dùng select để tránh lấy thừa data                                                              │      │                            │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Transaction (update)            │ ⚠️ Update platformSeos/platformImages chạy 2 lần deleteMany + createMany riêng biệt, không có transaction                             │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Rate limiting                 K │ ❌ Không có                                                                                               │                            │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Caching                       K │ ❌ Không có                                                                                               │                            │                                                                                                                                                                                           e   ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Logging                       K │ ❌ Không có                                                                                               │                            │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Type narrowing cho errors       │ ⚠️ Dùng throw { type, message } - nên dùng custom Error class hoặc Result pattern                                                     │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Missing findById trong site API │ ⚠️ Chỉ có findBySlug, thiếu endpoint lấy category theo ID                                                                             │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Hard-coded slug regex           │ ⚠️ Regex slugRegex được define ở validator nhưng logic tạo slug ở service dùng createSlug từ utils - cần đảm bảo 2 cái này match nhau │
  └─────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
  Kết luận
  Code theo chuẩn tốt, đúng kiến trúc 3-layer, có validator, repository, service. Điểm yếu nhỏ là thiếu transaction cho upsert phức tạp và không có error class chuẩn.
 Các lệnh Prisma hay dùng

  # 1. Generate Prisma Client (sau khi thay đổi schema)
  npx prisma generate

  # 2. Tạo migration mới
  npx prisma migrate dev --name ten_migration

  # 3. Apply migration (không tạo file migration mới, dùng cho production)
  npx prisma migrate deploy

  # 4. Xem SQL trước khi chạy migration (không thực thi)
  npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-url postgresql://...

  # 5. Reset database (xóa hết data + migration history, re-create)
  npx prisma migrate reset

  # 6. Studio - giao diện GUI xem/sửa data trên browser
  npx prisma studio

  # 7. Format schema file
  npx prisma format

  # 8. Validate schema
  npx prisma validate

  # 9. Pull schema từ database (tạo schema.prisma từ DB có sẵn)
  npx prisma db pull

  # 10. Push schema lên database (không cần migration, trực tiếp sync)
  npx prisma db push

  Workflow phổ biến khi dev:
  # Thay đổi schema → generate client → push/sync DB
  npx prisma generate
  npx prisma db push

  Quay lại vấn đề của bạn — bạn muốn reset database chưa có dữ liệu, hay cần cách khác để sync schema?

✻ Worked for 1m 16s

> Tình huống    Lệnh
Thay đổi model, cần migrate DB    npx prisma migrate dev --name Chỉ update Prisma Client types    npx prisma generate
Xem trạng thái migration    npx prisma migrate status
Reset DB (dev only)    npx prisma migrate reset
Xem DB qua UI    npx prisma studio<name>

> xem cac lenh nay nè

● Đây là bảng tổng hợp hay và đầy đủ. Lưu lại cho future reference:

  ┌────────────────────────────────┬─────────────────────────────────────┐
  │           Tình huống           │                Lệnh                 │
  ├────────────────────────────────┼─────────────────────────────────────┤
  │ Thay đổi model, cần migrate DB │ npx prisma migrate dev --name <ten> │
  ├────────────────────────────────┼─────────────────────────────────────┤
  │ Chỉ update Prisma Client types │ npx prisma generate                 │
  ├────────────────────────────────┼─────────────────────────────────────┤
  │ Xem trạng thái migration       │ npx prisma migrate status           │
  ├────────────────────────────────┼─────────────────────────────────────┤
  │ Reset DB (dev only)            │ npx prisma migrate reset            │
  ├────────────────────────────────┼─────────────────────────────────────┤
  │ Xem DB qua UI                  │ npx prisma studio                   │
  └────────────────────────────────┴─────────────────────────────────────┘

● Tài khoản admin mặc định (sau khi seed):

  ┌──────────┬──────────┬─────────────┐
  │ Username │ Password │    Role     │
  ├──────────┼──────────┼─────────────┤
  │ admin    │ admin123 │ SUPER_ADMIN │
  ├──────────┼──────────┼─────────────┤
  │ editor   │ admin123 │ EDITOR      │
  └──────────┴──────────┴─────────────┘

  Vào /login → điền username/password → đăng nhập → chuyển đến /admin.

# Cấu trúc dự án
  ┌───────────────┬────────────────────────┐
  │ Thư mục/File  │         Mô tả          │
  ├───────────────┼────────────────────────┤
  │ src/app       │ App router (Next.js)   │
  ├───────────────┼────────────────────────┤
  │ src/admin     │ Module admin           │
  ├───────────────┼────────────────────────┤
  │ src/site      │ Module site (frontend) │
  ├───────────────┼────────────────────────┤
  │ src/server    │ Server-side logic      │
  ├───────────────┼────────────────────────┤
  │ src/lib       │ Thư viện/shared code   │
  ├───────────────┼────────────────────────┤
  │ prisma/       │ Prisma ORM (database)  │
  ├───────────────┼────────────────────────┤
  │ public/       │ Static assets          │
  ├───────────────┼────────────────────────┤
  │ middleware.ts │ Next.js middleware     │
  ├───────────────┼────────────────────────┤
  │ package.json  │ Dependencies           │
  ├───────────────┼────────────────────────┤
  │ .env          │ Environment variables  │
