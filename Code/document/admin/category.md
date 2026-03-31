# 🧑‍💼 Module Admin Categories (Chuẩn cấu trúc cho toàn bộ Admin)

## 🎯 Mục tiêu

Xây dựng module **quản lý danh mục (categories)** làm **template chuẩn** cho các module khác như:

* Product
* Inquiry
* Blog
* Collection

---

# 🧱 1. Cấu trúc thư mục

```bash
src/
  app/
    admin/
      categories/
        page.tsx
        new/
          page.tsx
        [id]/
          edit/
            page.tsx

    api/
      admin/
        categories/
          route.ts
          [id]/
            route.ts

  features/
    category/
      components/
        CategoryTable.tsx
        CategoryForm.tsx
        CategoryFilters.tsx
      types.ts
      utils/
        category-form.mapper.ts

  server/
    repositories/
      category.repository.ts
    services/
      category.service.ts
    validators/
      category.validator.ts

  styles/
    admin/
      category-table.module.css
      category-form.module.css
      category-filters.module.css
```

---

# 🧠 2. Vai trò từng phần

## 🖥️ Page (app/admin/categories)

* render UI
* gọi API
* không chứa business logic

## ⚙️ API (app/api/admin/categories)

* nhận request
* gọi service
* trả response

## 🧠 Service

* xử lý nghiệp vụ
* validate logic
* check slug trùng
* xử lý parent category

## 🗃️ Repository

* làm việc với Prisma
* query database

## ✅ Validator

* validate input bằng Zod

## 🧩 Components

* Table
* Form
* Filters

---

# 🗃️ 3. Prisma Schema

```prisma
model Category {
  id             String     @id @default(cuid())
  name           String
  slug           String     @unique
  description    String?
  image          String?

  parentId       String?
  parent         Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children       Category[] @relation("CategoryTree")

  sortOrder      Int        @default(0)
  isActive       Boolean    @default(true)

  seoTitle       String?
  seoDescription String?
  canonicalUrl   String?
  ogTitle        String?
  ogDescription  String?
  ogImage        String?
  robots         String?    @default("index,follow")

  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  @@index([parentId])
  @@index([slug])
  @@index([isActive])
  @@map("categories")
}
```

---

# 🧾 4. Types

```ts
export type CategoryListItem = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

export type CategoryFormValues = {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  robots?: string;
};
```

---

# ✅ 5. Validator (Zod)

```ts
import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(slugRegex),
  sortOrder: z.coerce.number().min(0),
  isActive: z.boolean(),
});
```

---

# 🗃️ 6. Repository

```ts
export const categoryRepository = {
  findManyAdmin() {
    return prisma.category.findMany({
      include: { parent: true },
    });
  },

  createCategory(data) {
    return prisma.category.create({ data });
  },

  updateCategory(id, data) {
    return prisma.category.update({
      where: { id },
      data,
    });
  },

  deleteCategory(id) {
    return prisma.category.delete({
      where: { id },
    });
  },
};
```

---

# 🧠 7. Service

```ts
export const categoryService = {
  async createCategory(input) {
    const parsed = categorySchema.parse(input);

    const existed = await categoryRepository.findBySlug(parsed.slug);
    if (existed) throw new Error("Slug đã tồn tại");

    return categoryRepository.createCategory(parsed);
  },
};
```

---

# 🌐 8. API Routes

## GET + POST

```ts
export async function GET() {
  const data = await categoryService.getAdminCategories();
  return Response.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const data = await categoryService.createCategory(body);
  return Response.json(data);
}
```

---

# 🧩 9. Components

## CategoryTable

* render danh sách
* edit/delete

## CategoryForm

* create/edit
* validate
* submit

## CategoryFilters

* search
* filter trạng thái

---

# 🖥️ 10. Page

## page.tsx

* list categories

## new/page.tsx

* create category

## edit/page.tsx

* update category

---

# 🎨 11. CSS Structure

```bash
styles/admin/
  category-table.module.css
  category-form.module.css
  category-filters.module.css
```

---

# 🔄 12. Luồng dữ liệu

### Load list

Page → API → Service → Repository → Prisma → DB

### Create

Form → API → Validator → Service → Repository → DB

### Update

Form → API → Service → Repository → DB

### Delete

Table → API → Service → Repository → DB

---

# 🚀 13. Pattern chuẩn để reuse

```text
Module
├── page list
├── page create
├── page edit
├── filters
├── table
├── form
├── validator
├── repository
├── service
└── api
```

---

# ✅ 14. Kết luận

Module Categories = template chuẩn cho toàn bộ admin.

👉 Copy pattern này để build:

* Product
* Inquiry
* Blog
* Collection

---

# 🚀 Next step

1. Build xong categories
2. Copy sang product
3. Mở rộng thêm upload ảnh + SEO + filter nâng cao

#Hoàn toàn clean. Tôi đã build xong module Categories theo đúng document. Tóm tắt:

Đã tạo đầy đủ module admin categories theo cấu trúc chuẩn trong document:

category.validator.ts — validate bằng Zod với đầy đủ fields (name, slug, SEO, parent, sortOrder...)
category.repository.ts — cập nhật thêm findAllFlat(), findById() với SEO fields, hasChildren(), hasProducts()
category.service.ts — cập nhật thêm validate slug trùng, check trước khi xóa (có con/có sản phẩm), auto-generate slug
CategoryTable.tsx — hiển thị danh sách với edit/delete, hiện parent name
CategoryForm.tsx — form create/edit đầy đủ SEO fields, auto-slug, validate client-side
CategoryFilters.tsx — search + filter trạng thái
Layout pages: CategoriesPage, NewCategoryPage, EditCategoryPage
App pages: /admin/categories, /admin/categories/new, /admin/categories/[id]/edit
API routes: GET list, POST create, GET by id, PUT update, DELETE (với error handling cho validation, duplicate slug, has children/products)
Đã install zod vào project

# Đã tạo 14 file mới:product-color

  Backend (Server):
  - src/server/repositories/product-color.repository.ts - Repository CRUD
  - src/server/services/product-color.service.ts - Service layer
  - src/server/validators/product-color.validator.ts - Zod validation

  API Routes:
  - src/admin/api/product-colors/route.ts - GET, POST
  - src/admin/api/product-colors/[id]/route.ts - GET, PUT, DELETE
  - src/app/admin/api/product-colors/route.ts - re-export
  - src/app/admin/api/product-colors/[id]/route.ts - re-export

  Admin UI:
  - src/admin/features/product-color/ProductColorFilters.tsx - Bộ lọc (từ khóa, trạng thái)
  - src/admin/features/product-color/ProductColorTable.tsx - Bảng danh sách
  - src/admin/features/product-color/ProductColorForm.tsx - Form thêm/sửa
  - src/admin/components/ProductColorFormWrapper.tsx - Dynamic import wrapper
  - src/admin/layout/product-colors/ProductColorsPage.tsx - Trang danh sách
  - src/admin/layout/product-colors/NewProductColorPage.tsx - Trang thêm mới
  - src/admin/layout/product-colors/EditProductColorPage.tsx - Trang chỉnh sửa

  App Router Pages:
  - src/app/admin/product-colors/page.tsx
  - src/app/admin/product-colors/new/page.tsx
  - src/app/admin/product-colors/[id]/edit/page.tsx

  Truy cập: /admin/product-colors - giao diện Bootstrap giống hệt quản lý danh mục, bao gồm:
  - Thêm màu sắc
  - Sửa màu sắc
  - Xóa màu sắc (chặn nếu có biến thể)
  - Tìm kiếm theo tên/mã màu
  - Lọc theo trạng thái
  - Hiển thị mã màu HEX với color swatch
