# Claude Code Guide - Nội Thất Tiện Lợi

## 1. Tổng quan dự án

**Tên dự án:** Nội Thất Tiện Lợi
**Tech stack:**
- **Frontend:** Next.js 15 + React 19 + TypeScript
- **Backend:** Next.js API Routes (3-layer architecture)
- **Database:** PostgreSQL + Prisma ORM
- **Styling:** Bootstrap 5 + Custom CSS
- **Rich Editor:** CKEditor 5
- **Validation:** Zod
- **Testing:** Vitest + React Testing Library

**Kiến trúc hệ thống:**
```
src/
├── app/                    # Next.js App Router
│   ├── (site)/            # Public pages
│   │   ├── api/           # Public API routes
│   │   ├── danh-muc/      # Category pages
│   │   ├── san-pham/      # Product pages
│   │   └── lien-he/       # Contact page
│   └── admin/             # Admin pages & API
│       └── api/           # Admin API routes
├── admin/                  # Admin client components
│   ├── api/               # (legacy API routes)
│   ├── components/        # Shared admin components
│   ├── features/          # Feature-specific components
│   └── layout/            # Admin page layouts
├── site/                   # Site client components
│   ├── api/               # (legacy API routes)
│   ├── components/        # Site shared components
│   ├── features/          # Site feature components
│   └── layout/            # Site page layouts
├── server/                 # Backend logic (3-layer)
│   ├── repositories/      # Data access layer (Prisma)
│   ├── services/          # Business logic layer
│   ├── validators/        # Zod schemas
│   └── errors.ts          # Custom error classes
├── lib/                    # Shared utilities
│   ├── prisma.ts          # Prisma client singleton
│   ├── utils.ts           # Helper functions
│   └── db-safe.ts         # Database safe operations
└── prisma/
    ├── schema.prisma      # Database schema
    └── seed.ts            # Seed data
```

---

## 2. Kiến trúc 3-layer

### 2.1. Repository Layer (Data Access)

**Vị trí:** `src/server/repositories/`
**Nhiệm vụ:**
- Tương tác trực tiếp với database qua Prisma
- Chỉ chứa query logic, không chứa business logic
- Select tối giản (chỉ lấy fields cần thiết)
- Xử lý Prisma transactions

**Pattern:**
```typescript
// src/server/repositories/category.repository.ts
export const categoryRepository = {
  async findAll(filters) {
    return prisma.category.findMany({
      where: {...},
      select: {...}
    });
  },

  async findById(id: number) {
    return prisma.category.findUnique({
      where: { id },
      select: {...}
    });
  },

  async create(data) {
    return prisma.category.create({ data });
  },

  async update(id: number, data) {
    return prisma.category.update({
      where: { id },
      data
    });
  },

  async delete(id: number) {
    return prisma.category.delete({ where: { id } });
  }
};
```

### 2.2. Service Layer (Business Logic)

**Vị trí:** `src/server/services/`
**Nhiệm vụ:**
- Chứa toàn bộ business logic
- Validation với Zod schemas
- Gọi repository để truy xuất/lưu data
- Xử lý error và throw custom errors
- Transform data trước khi trả về

**Pattern:**
```typescript
// src/server/services/category.service.ts
import { categorySchema } from '@/server/validators/category.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const categoryService = {
  async getAll(filters) {
    // Business logic
    return categoryRepository.findAll(filters);
  },

  async getById(id: number) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Danh mục không tồn tại');
    }
    return category;
  },

  async create(input) {
    // Validate
    const validated = categorySchema.parse(input);

    // Business logic
    const slug = createSlug(validated.name);

    // Save
    return categoryRepository.create({
      ...validated,
      slug
    });
  },

  async update(id: number, input) {
    // Check exists
    await this.getById(id);

    // Validate
    const validated = categorySchema.parse(input);

    // Update
    return categoryRepository.update(id, validated);
  }
};
```

### 2.3. Route Layer (HTTP Handlers)

**Vị trí:** `src/app/admin/api/` hoặc `src/app/(site)/api/`
**Nhiệm vụ:**
- Nhận HTTP request
- Parse request body/params
- Gọi service layer
- Xử lý error từ service
- Trả về HTTP response

**Pattern:**
```typescript
// src/app/admin/api/categories/route.ts
import { categoryService } from '@/server/services/category.service';
import { isAppError } from '@/server/errors';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/categories
export async function GET(request: NextRequest) {
  try {
    const filters = {}; // Parse từ searchParams
    const data = await categoryService.getAll(filters);

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: error.statusCode });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/admin/categories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await categoryService.create(body);

    return NextResponse.json({
      success: true,
      data
    }, { status: 201 });
  } catch (error) {
    // Handle error...
  }
}
```

---

## 3. Quy chuẩn code

### 3.1. Naming Conventions

| Loại | Quy tắc | Ví dụ |
|------|---------|-------|
| **Files TSX** | kebab-case | `category-form.tsx`, `product-table.tsx` |
| **Files TS** | camelCase | `category.service.ts`, `utils.ts` |
| **Folders** | kebab-case | `src/admin/features/category/` |
| **Components** | PascalCase | `CategoryForm`, `ProductTable` |
| **Functions** | camelCase | `createSlug()`, `formatPrice()` |
| **Variables** | camelCase | `categoryData`, `isActive` |
| **Constants** | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE`, `API_URL` |
| **Types/Interfaces** | PascalCase | `CategoryInput`, `ApiResponse` |

### 3.2. Export Patterns

**Services & Repositories:**
```typescript
// Named export - singleton object
export const categoryService = { ... };
export const categoryRepository = { ... };
```

**Validators:**
```typescript
// Named export schema + inferred type
export const categorySchema = z.object({ ... });
export type CategoryInput = z.infer<typeof categorySchema>;
```

**Components:**
```typescript
// Default export
export default function CategoryForm() { ... }

// Hoặc named export
export function CategoryForm() { ... }
```

### 3.3. Import Aliases

Sử dụng `@/` prefix cho tất cả imports:

```typescript
import { categoryService } from '@/server/services/category.service';
import { CategoryForm } from '@/admin/features/category/CategoryForm';
import { formatPrice } from '@/lib/utils';
import prisma from '@/lib/prisma';
```

### 3.4. Error Handling

**Custom Error Classes:**
```typescript
// src/server/errors.ts
export class NotFoundError extends Error { ... }
export class ValidationError extends Error { ... }
export class DuplicateError extends Error { ... }
export class ConflictError extends Error { ... }
```

**Sử dụng:**
```typescript
// Trong service
if (!category) {
  throw new NotFoundError('Danh mục không tồn tại');
}

// Trong route handler
if (isAppError(error)) {
  return NextResponse.json({
    success: false,
    error: error.message
  }, { status: error.statusCode });
}
```

### 3.5. API Response Format

**Success:**
```typescript
{
  success: true,
  data: { ... }
}
```

**Error:**
```typescript
{
  success: false,
  error: "Error message",
  code?: "ERROR_CODE"
}
```

---

## 4. Database Design

### 4.1. Core Tables

**Sản phẩm & Danh mục:**
```
categories              # Danh mục
products                # Sản phẩm
product_sizes           # Kích thước (shared)
product_colors          # Màu sắc (shared)
product_variants        # Biến thể = product + size + color
category_media          # Media của category
product_media           # Media của product
```

**SEO đa nền tảng:**
```
category_seo_platforms  # SEO cho category theo platform
product_seo_platforms   # SEO cho product theo platform
category_seo_media      # Media SEO cho category
product_seo_media       # Media SEO cho product
```

**Platform enum:**
```typescript
enum Platform {
  WEBSITE
  FACEBOOK
  TIKTOK
  YOUTUBE
  ZALO
}
```

### 4.2. Nguyên tắc thiết kế

- **Shared sizes & colors:** Không phụ thuộc vào từng sản phẩm
- **Variants:** Tổ hợp product + size + color có giá riêng
- **SEO per platform:** Mỗi nền tảng có metadata riêng
- **Sort order:** Hỗ trợ sắp xếp tùy chỉnh

Xem chi tiết: [database_design_product_system_full.md](document/admin/database_design_product_system_full.md)

---

## 5. Module Reference

### 5.1. Category Module (Pattern chuẩn)

Category là module reference đầy đủ nhất. Tham khảo khi tạo module mới:

**Backend:**
- [category.repository.ts](src/server/repositories/category.repository.ts)
- [category.service.ts](src/server/services/category.service.ts)
- [category.validator.ts](src/server/validators/category.validator.ts)

**API Routes:**
- [src/app/admin/api/categories/route.ts](src/app/admin/api/categories/route.ts)
- [src/app/admin/api/categories/[id]/route.ts](src/app/admin/api/categories/[id]/route.ts)

**Admin UI:**
- [CategoryTable.tsx](src/admin/features/category/CategoryTable.tsx)
- [CategoryFilters.tsx](src/admin/features/category/CategoryFilters.tsx)
- [NewCategoryPage.tsx](src/admin/layout/categories/NewCategoryPage.tsx)
- [EditCategoryPage.tsx](src/admin/layout/categories/EditCategoryPage.tsx)

### 5.2. Product Module

Product có thêm variants, colors, sizes:

**Backend:**
- Product service/repository/validator
- ProductColor service/repository/validator
- ProductSize service/repository/validator

**Admin UI:**
- [ProductTable.tsx](src/admin/features/product/ProductTable.tsx)
- [ProductImageFields.tsx](src/admin/features/product/ProductImageFields.tsx)
- Product variant management

### 5.3. Inquiry Module (Form submissions)

Module đơn giản cho liên hệ/tư vấn:

**Backend:**
- [inquiry.repository.ts](src/server/repositories/inquiry.repository.ts)
- [inquiry.service.ts](src/server/services/inquiry.service.ts)

**API:**
- Admin API + Site API

---

## 6. UI Components

### 6.1. Shared Components

**Admin:**
- `SingleImageUploader` - Upload 1 ảnh
- `ColorPicker` - Chọn màu
- `CKEditorImpl` - Rich text editor
- `FormWrapper` - Wrapper cho dynamic import forms
- `Pagination` - Phân trang
- `BootstrapInit` - Init Bootstrap JS

**Site:**
- `Header`, `Footer` - Layout components
- `Breadcrumb` - Breadcrumb navigation
- `ProductCard` - Product display card
- `Pagination` - Site pagination

### 6.2. Client Component Pattern

**Server Component (Page):**
```typescript
// src/admin/layout/categories/NewCategoryPage.tsx
import dynamic from 'next/dynamic';

const FormWrapper = dynamic(
  () => import('@/admin/components/FormWrapper'),
  { ssr: false }
);

export default function NewCategoryPage() {
  return (
    <div>
      <h1>Thêm danh mục</h1>
      <FormWrapper />
    </div>
  );
}
```

**Client Component (Form):**
```typescript
// src/admin/components/FormWrapper.tsx
'use client';

import { CategoryForm } from '@/admin/features/category/CategoryForm';

export default function FormWrapper() {
  return <CategoryForm />;
}
```

### 6.3. Form Submit Pattern

```typescript
'use client';
import { useRouter } from 'next/navigation';

export function CategoryForm() {
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (result.success) {
      router.push('/admin/categories');
      router.refresh(); // Refresh server components
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## 7. Hướng dẫn làm việc với Claude Code

### 7.1. Workflow chuẩn

**BƯỚC 1: ANALYZE (Không code)**
```bash
Đọc:
- claude.md (file này)
- package.json
- prisma/schema.prisma
- Module reference liên quan (category/product/inquiry)

Xác định:
- Module nào? (admin/site/shared)
- Tạo mới hay sửa?
- Files cần tạo/sửa?
- Risks & dependencies?

Liệt kê plan chi tiết.
DO NOT WRITE CODE YET.
```

**BƯỚC 2: CONFIRM**
```bash
User xác nhận plan.
Tiến hành code theo đúng pattern.
```

**BƯỚC 3: CODE**
- Tuân thủ 3-layer architecture
- Follow naming conventions
- Chỉ sửa files liên quan
- Comment logic phức tạp bằng tiếng Việt

**BƯỚC 4: REVIEW**
- Checklist architecture
- Checklist naming
- Check TypeScript errors
- Check missing dependencies

**BƯỚC 5: REPORT**
```
Files tạo mới:
- src/server/repositories/xxx.repository.ts
- src/server/services/xxx.service.ts
- ...

Files sửa đổi:
- src/app/admin/api/xxx/route.ts (thêm validation)
- ...

Các bước tiếp theo:
1. npm run db:generate (nếu sửa schema)
2. npm run db:migrate
3. npm run dev
4. Test tại http://localhost:3000/...
```

### 7.2. 6 Câu hỏi quan trọng

Trước khi code, trả lời:

1. **Module nào?** (admin CRUD / site display / shared utility)
2. **Tạo bảng DB mới?** (Prisma model + repository/service/validator)
3. **Reference pattern?** (category đầy đủ nhất, product có variants)
4. **Cần SEO đa platform?** (Website/Facebook/TikTok/YouTube/Zalo)
5. **Cần phân quyền?** (admin protected / site public)
6. **API endpoint?** (admin: /api/admin/xxx, site: /api/xxx)

### 7.3. Nguyên tắc bắt buộc

**PHẢI:**
- Đọc module reference trước khi code
- Dùng `z.infer<>` để infer type từ Zod
- Dùng `Prisma.TransactionClient` cho nhiều operations
- Select tối giản trong repository
- Validate input ở service layer
- Dynamic import form components với `ssr: false`
- `router.push()` + `router.refresh()` sau submit

**KHÔNG ĐƯỢC:**
- Logic trong route handler (chỉ gọi service)
- Hardcode tiếng Anh (dùng tiếng Việt)
- Dùng `any` type
- Tạo file mới nếu có pattern tương tự
- Sửa >3 files không liên quan
- Ignore TypeScript errors
- Commit `node_modules/`, `.env`

---

## 8. Review Checklist

### 8.1. Architecture
- [ ] Route handler chỉ gọi service, không có business logic
- [ ] Service gọi repository, có validation Zod
- [ ] Repository dùng Prisma với select tối giản
- [ ] Nhiều operations dùng `$transaction`

### 8.2. TypeScript
- [ ] Không có `any` type
- [ ] Input type được infer từ Zod schema
- [ ] Shared types khai báo trong `src/lib/types.ts`

### 8.3. Naming & Structure
- [ ] File TSX: kebab-case
- [ ] File TS: camelCase
- [ ] Service/Repository: named export singleton
- [ ] Import alias: `@/` prefix

### 8.4. Error Handling
- [ ] Dùng đúng AppError subclasses
- [ ] API route parse error với `isAppError()`
- [ ] Error response: `{ success: false, error: string }`

### 8.5. UI/Form
- [ ] Client component có `'use client'`
- [ ] Form page dùng dynamic import `ssr: false`
- [ ] Submit thành công có `router.push()` + `router.refresh()`
- [ ] Image upload dùng `SingleImageUploader`

### 8.6. Database
- [ ] Schema prisma đã update nếu thêm field
- [ ] Đã chạy `npx prisma generate`
- [ ] Migration có tên có nghĩa

---

## 9. Commands thường dùng

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run start                  # Start production server

# Database
npm run db:generate            # Generate Prisma client
npm run db:push                # Push schema to DB (dev)
npm run db:migrate             # Create migration
npm run db:seed                # Seed data
npm run db:studio              # Open Prisma Studio

# Testing
npm run test                   # Run tests once
npm run test:watch             # Watch mode
```

---

## 10. Tài liệu tham khảo

### Design Documents
- [Database Design](document/admin/database_design_product_system_full.md)
- [Order Management UI](document/admin/order_management_ui_design.md)
- [Shipping Providers UI](document/admin/shipping_providers_management_ui_design.md)
- [Warehouses Management UI](document/admin/warehouses_management_ui_design.md)
- [Members Management UI](document/admin/members_management_ui_design.md)

### Development Guides
- [AI Dev System](document/3.AI_DEV_SYSTEM.md)
- [Claude Code Flow](document/prompts/1.claude_code_flow.md)
- [Unit Test Checklist](document/5.unit-test-checklist.md)
- [Chuẩn Code](document/admin/ChuanCode.md)
- [Claude Code Skill](document/admin/CLAUDE_CODE_SKILL.md)

---

## 11. Project Status

**Completed:**
- ✅ Category management (CRUD)
- ✅ Product management (basic)
- ✅ Product colors (shared)
- ✅ Product sizes (shared)
- ✅ Inquiry/Contact form
- ✅ Site pages (home, category, product detail, contact)

**In Progress:**
- 🚧 Product variants management
- 🚧 SEO multi-platform
- 🚧 Admin authentication

**TODO (có design docs):**
- ⏳ Order management
- ⏳ Shipping providers
- ⏳ Warehouses
- ⏳ Members management
- ⏳ Shopping cart
- ⏳ Checkout flow

---

**Last updated:** 2026-04-12
**Version:** 1.0.0
