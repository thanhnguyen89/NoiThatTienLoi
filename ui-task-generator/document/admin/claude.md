# Đã nắm đầy đủ project. Bây giờ tôi sẽ trình bày toàn bộ phân tích và thiết kế skill.

  ---
  ## 1. Project Analysis

  Tên dự án: Nội Thất Minh Qui — E-commerce nội thất
  Tech stack: Next.js 15 + React 19 + TypeScript + PostgreSQL/Prisma + Bootstrap 5 + CKEditor
  Database: PostgreSQL — 20+ bảng (products, categories, variants, SEO multi-platform, auth, etc.)

  ### Cấu trúc thư mục chuẩn

  src/
  ├── app/                    # Next.js App Router (server pages)
  │   ├── admin/             # Admin layout pages
  │   └── site/              # Public site pages
  ├── admin/                  # Client components for admin
  │   ├── api/               # API routes (thin wrappers)
  │   ├── components/        # Shared admin components
  │   ├── features/          # Feature modules (Table, Form, Filters)
  │   └── layout/            # Page-level server components
  ├── server/                 # 3-layer backend
  │   ├── repositories/       # Data access (Prisma)
  │   ├── services/           # Business logic
  │   └── validators/         # Zod schemas
  └── lib/                    # Shared utilities
      ├── types.ts            # Shared TypeScript types
      ├── constants.ts        # Constants (pagination, labels)
      ├── utils.ts            # Helpers (formatPrice, createSlug, etc.)
      └── prisma.ts           # Prisma client singleton

  ### Conventions quan trọng

  ┌────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │      Quy tắc       │                                                        Chi tiết                                                         │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Path alias         │ @/ → src/                                                                                                               │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Đặt tên file       │ TSX: kebab-case (category-form.tsx), TS: camelCase (category.service.ts)                                                │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Đặt tên thư mục    │ kebab-case (src/admin/features/category/)                                                                               │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Service export     │ Named export singleton: export const categoryService = { ... }                                                          │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Repository export  │ Named export singleton: export const categoryRepository = { ... }                                                       │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Validator export   │ Named function + Type inference: export const categorySchema = z.object(...) + export type CategoryInput = z.infer<...> │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Error handling     │ Custom classes: NotFoundError, ValidationError, DuplicateError, ConflictError                                           │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ API response       │ { success: true/false, data/error }                                                                                     │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Client components  │ 'use client' + dynamic import trong page server component                                                               │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Form pattern       │ FormWrapper.tsx (dynamic import) + FeaturesForm.tsx (form logic)                                                        │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Image upload       │ SingleImageUploader, ImageManagerModal, ImageUploader                                                                   │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Rich text          │ RichTextEditor (CKEditor wrapper)                                                                                       │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ SEO multi-platform │ 4 tabs: Website / Facebook / TikTok / YouTube                                                                           │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Platform enum      │ WEBSITE | FACEBOOK | TIKTOK | YOUTUBE                                                                                   │
  └────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  ---
  # 2. Questions

  Dưới đây là 6 câu hỏi để làm rõ yêu cầu trước khi code:

  1. Tính năng mới thuộc module nào? (admin CRUD, site display, shared utility, hoặc hoàn toàn mới)
  2. Có cần tạo bảng database mới không? (Prisma model + repository/service/validator)
  3. Module nào trong project là reference gần nhất? (category là reference pattern đầy đủ nhất)
  4. Có cần SEO đa nền tảng (4 platform) không? (Website / Facebook / TikTok / YouTube)
  5. Có cần phân quyền admin không? (hiện có hệ thống permission rồi)
  6. API endpoint là public (site) hay protected (admin)?

  ---
  # 3. Skill Design

  ### Tên skill

  noithat-dev — Reusable coding skill cho dự án Nội Thất Tiện Lợi

  ### Mô tả

  Guideline bắt buộc tuân thủ khi viết code cho dự án Next.js Nội Thất Tiện Lợi. Áp dụng cho mọi task: thêm feature, sửa bug, refactor, hoặc viết test.

  ### Mục tiêu

  - Code theo đúng 3-layer architecture (Repository → Service → Route)
  - Tuân thủ convention về naming, file structure, và patterns
  - Sinh code dễ review, maintain, và mở rộng
  - Không sửa lung tung, chỉ thay đổi những gì cần thiết

  ### Điều kiện sử dụng

  Khi người dùng yêu cầu bất kỳ task nào liên quan đến project Nội Thất Tiện Lợi.

  ---
  # 4. SOP — Standard Operating Procedure

  ### Bước 1: Đọc project (luôn luôn làm trước)

  1.1. Đọc package.json → biết dependencies, scripts
  1.2. Đọc prisma/schema.prisma → hiểu models
  1.3. Đọc src/lib/types.ts, src/lib/constants.ts, src/lib/utils.ts → shared utilities
  1.4. Đọc src/server/errors.ts → error classes
  1.5. Đọc 1 module reference gần nhất (VD: category hoặc product hoặc slider)
  1.6. Đọc middleware.ts → auth flow

  ### Bước 2: Xác định phạm vi thay đổi

  2.1. Xác định module: admin CRUD / site page / shared utility / API mới
  2.2. Xác định cần tạo mới hay sửa:
      - Tạo mới: luôn theo pattern có sẵn
      - Sửa: chỉ sửa những file liên quan, không sửa lan
  2.3. Kiểm tra file đích đã tồn tại chưa

  ### Bước 3: Hỏi 6 câu (nếu chưa rõ)

  Q1: Module nào?
  Q2: Tạo bảng DB mới?
  Q3: Reference pattern nào?
  Q4: Cần SEO 4 platform?
  Q5: Cần phân quyền?
  Q6: Admin hay public API?

  ### Bước 4: Code theo template

  4a. Tạo module mới (admin CRUD)

  Đường dẫn: src/server/repositories/{name}.repository.ts
  Đường dẫn: src/server/services/{name}.service.ts
  Đường dẫn: src/server/validators/{name}.validator.ts
  Đường dẫn: src/admin/api/{name}/route.ts
  Đường dẫn: src/admin/api/{name}/[id]/route.ts
  Đường dẫn: src/admin/features/{name}/{Name}Table.tsx
  Đường dẫn: src/admin/features/{name}/{Name}Filters.tsx
  Đường dẫn: src/admin/features/{name}/{Name}Form.tsx
  Đường dẫn: src/admin/components/{Name}FormWrapper.tsx  (nếu cần dynamic import)
  Đường dẫn: src/admin/layout/{name}s/{Name}sPage.tsx
  Đường dẫn: src/admin/layout/{name}s/New{Name}Page.tsx
  Đường dẫn: src/admin/layout/{name}s/Edit{Name}Page.tsx
  → Thêm route vào admin sidebar

  4b. Sửa module có sẵn

  5.1. Đọc tất cả files liên quan trước
  5.2. Sửa tối thiểu, đúng vị trí
  5.3. Nếu thêm field DB → cập nhật schema.prisma + generate + migrate
  5.4. Nếu thêm API field → cập nhật types.ts + repository select + service
  5.5. Nếu thêm UI field → cập nhật Form + Table (nếu cần)

  Bước 5: Review checklist (xem mục 7)

  Bước 6: Báo cáo

  6.1. Danh sách file tạo mới / sửa
  6.2. Giải thích ngắn gọn từng thay đổi
  6.3. Các bước chạy tiếp theo (npm run dev, migrate, seed...)

  ---
  # 5. Reusable Prompt

  Bạn đang làm việc trên dự án Nội Thất Minh Qui — Next.js e-commerce nội thất.

  ### Trước khi code, ĐỌC PROJECT:
  - src/server/errors.ts (error classes)
  - src/lib/types.ts, src/lib/constants.ts, src/lib/utils.ts (shared)
  - prisma/schema.prisma (database)
  - 1 module reference gần nhất (category hoặc product hoặc slider)
  - middleware.ts (auth flow)

  ### TUÂN THỦ:
  - 3-layer: Repository (Prisma) → Service (logic) → Route (HTTP)
  - Path alias: @/ → src/
  - File naming: TSX kebab-case, TS camelCase
  - Service/Repository: named export singleton
  - Validator: Zod schema + z.infer type
  - Error: dùng AppError subclasses (NotFoundError, ValidationError...)
  - API response: { success, data } hoặc { success, error }
  - Client components: 'use client' + dynamic import trong server page
  - SEO pattern: 4 tabs (Website / Facebook / TikTok / YouTube)
  - Platform enum: WEBSITE | FACEBOOK | TIKTOK | YOUTUBE

  CHỈ sửa files liên quan trực tiếp. Không sửa lung tung.
  Sau khi code, liệt kê files tạo/sửa + bước chạy tiếp theo.

  ---
  # 6. Coding Guardrails

  ### Phải làm

  - Luôn đọc module reference trước khi code
  - Dùng z.infer<> để infer type từ Zod schema
  - Dùng Prisma.TransactionClient khi có nhiều write operations
  - Select tối giản (chỉ lấy field cần thiết)
  - Validate input bằng Zod ở service layer
  - Dùng parseAppError() hoặc isAppError() trong route handlers
  - Dùng createSlug() cho slug auto-generation
  - Dynamic import với ssr: false cho form components
  - Dùng router.push() + router.refresh() sau khi submit form thành công

  ### Không được

  - Không viết logic trực tiếp trong route handler (route chỉ gọi service)
  - Không hardcode error messages tiếng Anh (dùng tiếng Việt)
  - Không dùng any type
  - Không tạo file mới nếu đã có pattern tương tự — tham khảo và copy-paste-adapter
  - Không sửa nhiều hơn 3 files không liên quan cho 1 task
  - Không ignore TypeScript errors
  - Không commit node_modules/, .env, *.tsbuildinfo

  ---
 # 7. Review Checklist

  ### Architecture

  - Route handler chỉ gọi service, không có logic nghiệp vụ?
  - Service gọi repository, có validation Zod?
  - Repository dùng Prisma với select tối giản?
  - Upsert nhiều bảng có dùng $transaction?

  ### TypeScript

  - Không có any type?
  - Input type được infer từ Zod schema?
  - Shared types khai báo trong src/lib/types.ts?

  ### Naming & Structure

  - File TSX đặt tên kebab-case?
  - File TS đặt tên camelCase?
  - Service/Repository export named singleton?
  - Import alias dùng @/ prefix?

  ### Error Handling

  - Dùng đúng AppError subclasses?
  - API route parse error với parseAppError() hoặc isAppError()?
  - Error response có format { success: false, error: string, code?: string }?

  ### UI/Form (nếu có)

  - Client component có 'use client' directive?
  - Form page dùng dynamic import ssr: false?
  - Submit thành công có router.push() + router.refresh()?
  - Image upload dùng SingleImageUploader / ImageManagerModal?

  ### Database

  - Schema prisma đã cập nhật nếu thêm field?
  - Đã chạy npx prisma generate sau khi đổi schema?
  - Migration file có meaningful name?

  ---
  ### Bạn muốn tôi lưu skill này vào đâu? Ví dụ:
  - Code/document/skill-noithat-dev.md — lưu dạng markdown documentation
  - Code/src/lib/skill-noithat-dev.ts — lưu dạng structured data để Claude đọc tự động
  - Hoặc cả hai?
