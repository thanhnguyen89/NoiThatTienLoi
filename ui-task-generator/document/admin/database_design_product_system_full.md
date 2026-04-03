# Database Design – Product System (Multi-platform SEO + Variants)

## 1. Mục tiêu thiết kế

Thiết kế này hỗ trợ các yêu cầu nghiệp vụ sau:

- Quản lý danh mục và sản phẩm theo cấu trúc chuẩn hóa.
- Một danh mục có thể có nhiều media.
- Một sản phẩm có thể có nhiều media.
- Giá bán, giá khuyến mãi, giá nhập và tồn kho được quản lý theo biến thể sản phẩm.
- Biến thể sản phẩm được xác định theo tổ hợp kích thước và màu sắc.
- Kích thước và màu sắc là tập dữ liệu dùng chung, không phụ thuộc riêng vào từng sản phẩm.
- SEO được quản lý riêng cho từng nền tảng: Website, Facebook, YouTube, TikTok, Zalo.
- Mỗi nền tảng có thể có nội dung riêng, metadata riêng và media SEO riêng.
- Danh mục và sản phẩm đều có `sort_order` để phục vụ sắp xếp hiển thị.

---

## 2. Nguyên tắc thiết kế

### 2.1. Chuẩn hóa dữ liệu

Thiết kế tách riêng các nhóm dữ liệu:

- **Danh mục**
- **Sản phẩm**
- **Kích thước dùng chung**
- **Màu sắc dùng chung**
- **Biến thể sản phẩm**
- **Media chung**
- **SEO đa nền tảng**
- **Media SEO theo nền tảng**

Cách tách này giúp:

- Dễ mở rộng hệ thống.
- Hạn chế trùng lặp dữ liệu.
- Dễ quản lý khi cùng một kích thước hoặc màu sắc được dùng cho nhiều sản phẩm.
- Hỗ trợ tốt cho CMS, website bán hàng, social commerce và SEO đa kênh.

### 2.2. Kích thước và màu sắc dùng chung

Ở phiên bản điều chỉnh này:

- `product_sizes` **không còn khóa ngoại tới `products`**.
- `product_colors` **không còn khóa ngoại tới `products`**.

Lý do:

- Một kích thước như `1.2m x 2m` có thể dùng cho nhiều sản phẩm khác nhau.
- Một màu như `Đỏ`, `Đen`, `Kem`, `Trắng` có thể dùng lại cho nhiều sản phẩm khác nhau.

Do đó:

- `product_sizes` trở thành **danh mục kích thước dùng chung**.
- `product_colors` trở thành **danh mục màu dùng chung**.
- Bảng `product_variants` sẽ liên kết sản phẩm với kích thước và màu sắc tương ứng.

---

## 3. Danh sách bảng

Hệ thống gồm các nhóm bảng sau:

### 3.1. Nhóm lõi

- `categories`
- `products`
- `product_sizes`
- `product_colors`
- `product_variants`

### 3.2. Nhóm media chung

- `category_media`
- `product_media`

### 3.3. Nhóm SEO đa nền tảng

- `category_seo_platforms`
- `product_seo_platforms`

### 3.4. Nhóm media SEO

- `category_seo_media`
- `product_seo_media`

---

## 4. Chi tiết từng bảng

# 4.2. Bảng `products`

### Mục đích

Lưu thông tin sản phẩm gốc.

### Ý nghĩa

- Mỗi sản phẩm thuộc một danh mục.
- Không lưu giá và tồn kho trực tiếp tại đây.
- Giá và tồn kho sẽ nằm ở bảng biến thể để đáp ứng nghiệp vụ theo kích thước + màu sắc.

### SQL

```sql
CREATE TABLE products (
    id                  BIGSERIAL PRIMARY KEY,
    category_id         BIGINT NOT NULL REFERENCES categories(id),
    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) UNIQUE,
    short_description   TEXT,
    description         TEXT,
    sort_order          INT DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chú thích field

- `id`: khóa chính.
- `category_id`: khóa ngoại tới danh mục.
- `name`: tên sản phẩm.
- `slug`: slug dùng cho URL.
- `short_description`: mô tả ngắn.
- `description`: mô tả chi tiết.
- `sort_order`: thứ tự hiển thị sản phẩm.
- `is_active`: trạng thái hoạt động.
- `created_at`, `updated_at`: thời gian tạo/cập nhật.

---

# 4.3. Bảng `product_sizes`

### Mục đích

Lưu danh mục kích thước dùng chung cho toàn hệ thống.

### Ý nghĩa

- Không phụ thuộc vào riêng một sản phẩm.
- Một kích thước có thể gán cho nhiều sản phẩm khác nhau.
- Phù hợp với nghiệp vụ như `0.8m x 2m`, `1.0m x 2m`, `1.2m x 2m` được dùng lặp lại.

### SQL

```sql
CREATE TABLE product_sizes (
    id              BIGSERIAL PRIMARY KEY,
    size_label      VARCHAR(100) NOT NULL UNIQUE,
    width_cm        DECIMAL(10,2),
    length_cm       DECIMAL(10,2),
    height_cm       DECIMAL(10,2),
    sort_order      INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chú thích field

- `id`: khóa chính.
- `size_label`: nhãn kích thước hiển thị, ví dụ `1.2m x 2m`.
- `width_cm`: chiều rộng.
- `length_cm`: chiều dài.
- `height_cm`: chiều cao nếu có.
- `sort_order`: thứ tự hiển thị kích thước.
- `is_active`: trạng thái hoạt động.
- `created_at`: thời gian tạo.

---

# 4.4. Bảng `product_colors`

### Mục đích

Lưu danh mục màu sắc dùng chung cho toàn hệ thống.

### Ý nghĩa

- Không phụ thuộc vào riêng một sản phẩm.
- Một màu có thể dùng cho nhiều sản phẩm.
- Hỗ trợ mở rộng cho bộ lọc, hiển thị swatch màu, mapping với variant.

### SQL

```sql
CREATE TABLE product_colors (
    id              BIGSERIAL PRIMARY KEY,
    color_name      VARCHAR(100) NOT NULL UNIQUE,
    color_code      VARCHAR(20),
    sort_order      INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chú thích field

- `id`: khóa chính.
- `color_name`: tên màu.
- `color_code`: mã màu, ví dụ HEX nếu có.
- `sort_order`: thứ tự hiển thị.
- `is_active`: trạng thái hoạt động.
- `created_at`: thời gian tạo.

---

# 4.5. Bảng `product_variants`

### Mục đích

Lưu biến thể sản phẩm theo tổ hợp:

- sản phẩm
- kích thước
- màu sắc

### Ý nghĩa

Đây là bảng xử lý nghiệp vụ quan trọng nhất vì:

- Giá nhập khác nhau theo biến thể.
- Giá bán khác nhau theo biến thể.
- Giá khuyến mãi khác nhau theo biến thể.
- Tồn kho khác nhau theo biến thể.

Ví dụ:

- Giường sắt đơn ống tròn + `1.2m x 2m` + `Đỏ`
- Giường sắt đơn ống tròn + `1.2m x 2m` + `Kem`

Hai biến thể này có thể có tồn kho và giá khác nhau.

### SQL

```sql
CREATE TABLE product_variants (
    id                  BIGSERIAL PRIMARY KEY,
    product_id          BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_size_id     BIGINT NOT NULL REFERENCES product_sizes(id),
    product_color_id    BIGINT NOT NULL REFERENCES product_colors(id),
    sku                 VARCHAR(100) UNIQUE,
    barcode             VARCHAR(100),
    purchase_price      DECIMAL(15,2) NOT NULL DEFAULT 0,
    sale_price          DECIMAL(15,2) NOT NULL DEFAULT 0,
    promo_price         DECIMAL(15,2),
    stock_qty           INT DEFAULT 0,
    reserved_qty        INT DEFAULT 0,
    weight_kg           DECIMAL(10,2),
    is_default          BOOLEAN DEFAULT FALSE,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, product_size_id, product_color_id)
);
```

### Chú thích field

- `id`: khóa chính.
- `product_id`: sản phẩm gốc.
- `product_size_id`: kích thước dùng chung.
- `product_color_id`: màu sắc dùng chung.
- `sku`: mã SKU riêng cho biến thể.
- `barcode`: mã vạch nếu có.
- `purchase_price`: giá nhập.
- `sale_price`: giá bán.
- `promo_price`: giá khuyến mãi.
- `stock_qty`: tồn kho hiện có.
- `reserved_qty`: số lượng đã giữ chỗ / đang chờ xử lý đơn.
- `weight_kg`: trọng lượng.
- `is_default`: đánh dấu biến thể mặc định.
- `is_active`: trạng thái hoạt động.
- `created_at`, `updated_at`: thời gian tạo/cập nhật.
- `UNIQUE(product_id, product_size_id, product_color_id)`: không cho trùng cùng một tổ hợp sản phẩm + kích thước + màu.

---

# 4.7. Bảng `product_media`

### Mục đích

Lưu media chung của sản phẩm.

### Ý nghĩa

Một sản phẩm có thể có nhiều:

- ảnh chi tiết
- ảnh đại diện
- video sản phẩm
- ảnh theo nền tảng

### SQL

```sql
CREATE TABLE product_media (
    id              BIGSERIAL PRIMARY KEY,
    product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_variant_id BIGINT REFERENCES product_variants(id) ON DELETE NULL,
    media_type      VARCHAR(20) NOT NULL,
    media_url       VARCHAR(1000) NOT NULL,
    alt_text        VARCHAR(255),
    title           VARCHAR(255),
    width_px        INT,
    height_px       INT,
    file_size_kb    INT,
    mime_type       VARCHAR(100),
    sort_order      INT DEFAULT 0,
    is_thumbnail    BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chú thích field

Tương tự `category_media`, nhưng gắn với `product_id`.

---

# 4.9. Bảng `product_seo_platforms`

### Mục đích

Lưu cấu hình SEO và nội dung đa nền tảng cho từng sản phẩm.

### Ý nghĩa

Bảng này tương tự `category_seo_platforms`, nhưng áp dụng ở cấp sản phẩm.

### SQL

```sql
CREATE TABLE product_seo_platforms (
    id                  BIGSERIAL PRIMARY KEY,
    product_id          BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    platform            VARCHAR(30) NOT NULL,
    seo_title           VARCHAR(500),
    seo_description     VARCHAR(2000),
    seo_keywords        VARCHAR(2000),
    slug                VARCHAR(500),
    canonical_url       VARCHAR(1000),
    robots              VARCHAR(255),
    is_noindex          BOOLEAN DEFAULT FALSE,
    is_nofollow         BOOLEAN DEFAULT FALSE,
    og_title            VARCHAR(500),
    og_description      VARCHAR(2000),
    og_image_url        VARCHAR(1000),
    hashtag_text        TEXT,
    post_title          VARCHAR(500),
    post_description    TEXT,
    platform_url        VARCHAR(1000),
    image_width_px      INT,
    image_height_px     INT,
    schema_json         JSONB,
    extra_meta_json     JSONB,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, platform)
);
```

### Chú thích field

Tương tự `category_seo_platforms`, nhưng gắn với `product_id`.

---

# 4.11. Bảng `product_seo_media`

### Mục đích

Lưu media SEO riêng cho từng nền tảng của sản phẩm.

### Ý nghĩa

Cho phép một sản phẩm có nhiều bộ ảnh/video SEO khác nhau tùy nền tảng.

### SQL

```sql
CREATE TABLE product_seo_media (
    id                      BIGSERIAL PRIMARY KEY,
    product_seo_platform_id BIGINT NOT NULL REFERENCES product_seo_platforms(id) ON DELETE CASCADE,
    media_type              VARCHAR(20) NOT NULL,
    media_url               VARCHAR(1000) NOT NULL,
    alt_text                VARCHAR(255),
    title                   VARCHAR(255),
    width_px                INT,
    height_px               INT,
    sort_order              INT DEFAULT 0,
    is_primary              BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chú thích field

Tương tự `category_seo_media`, nhưng áp dụng cho sản phẩm.

---

## 5. Sơ đồ quan hệ tổng quát

```text
categories
 ├── category_media
 ├── category_seo_platforms
 │    └── category_seo_media
 └── products
      ├── product_media
      ├── product_variants
      │    ├── product_sizes
      │    └── product_colors
      └── product_seo_platforms
           └── product_seo_media
```

---

## 6. Giải thích mô hình biến thể

Do yêu cầu nghiệp vụ là:

- giá theo kích thước
- giá theo màu sắc
- tồn kho theo kích thước
- tồn kho theo màu sắc

nên cần lưu ở `product_variants`.

### Ví dụ

Sản phẩm: `Giường sắt đơn ống tròn`

Kích thước dùng chung trong `product_sizes`:

- `0.8m x 2m`
- `1.0m x 2m`
- `1.2m x 2m`

Màu dùng chung trong `product_colors`:

- `Đỏ`
- `Xanh`
- `Kem`
- `Đen`
- `Trắng`

Biến thể trong `product_variants` sẽ là:

- Giường sắt đơn ống tròn + `0.8m x 2m` + `Đỏ`
- Giường sắt đơn ống tròn + `0.8m x 2m` + `Xanh`
- Giường sắt đơn ống tròn + `1.0m x 2m` + `Kem`

Mỗi biến thể có thể có:

- giá nhập riêng
- giá bán riêng
- giá khuyến mãi riêng
- tồn kho riêng
- SKU riêng

---

## 7. Ưu điểm của thiết kế

### 7.1. Phù hợp nghiệp vụ thực tế

- Sản phẩm có nhiều biến thể.
- Kích thước và màu sắc tái sử dụng được.
- Hỗ trợ tốt cho bán hàng online nhiều kênh.

### 7.2. Tối ưu mở rộng

Có thể mở rộng thêm:

- thương hiệu
- thuộc tính sản phẩm khác
- bộ lọc tìm kiếm
- lịch sử giá
- kho nhiều chi nhánh
- mapping với sàn thương mại điện tử

### 7.3. Tối ưu quản trị nội dung

- quản trị media chung
- quản trị media SEO riêng từng nền tảng
- quản trị canonical, robots, hashtag, schema rõ ràng

---

## 8. Gợi ý triển khai thêm

Nếu triển khai thực tế, có thể bổ sung thêm trong tương lai:

- bảng `brands`
- bảng `product_attributes`
- bảng `warehouses`
- bảng `inventory_transactions`
- bảng `platform_publish_logs`
- bảng `seo_templates`

---

## 9. Kết luận

Thiết kế này phù hợp cho hệ thống quản lý sản phẩm có các đặc điểm:

- nhiều danh mục
- nhiều sản phẩm
- nhiều biến thể theo kích thước và màu sắc
- media phong phú
- SEO đa nền tảng
- khả năng mở rộng cao

Đây là mô hình phù hợp để phát triển:

- website bán hàng
- admin CMS
- hệ thống social commerce
- nền tảng quản trị nội dung đa kênh
 # Sơ đồ quan hệ

  Product
   ├── Category          (N:1) — danh mục cha
   ├── ProductImage      (1:N) — ảnh chung
   ├── ProductMedia     (1:N) — media (gắn riêng biến thể)
   ├── ProductVariant    (1:N) — biến thể
   │    ├── ProductSize     (N:1) — kích thước dùng chung
   │    └── ProductColor    (N:1) — màu dùng chung
   ├── ProductSeoPlatform  (1:N) — SEO đa nền tảng
   │    └── ProductSeoMedia  (1:N) — media SEO theo nền tảng
   ├── ProductPlatformImage (1:N) — ảnh đa nền tảng
   └── Inquiry          (1:N) — liên hệ / tư vấn

Sơ đồ quan hệ
Product
 ├── ProductVariant (n) ── ProductSize (shared)
 │                    └── ProductColor (shared)
 ├── ProductImage (n)
 ├── ProductMedia (n)
 ├── ProductPlatformImage (n) [WEBSITE/FB/TT/YT]
 ├── ProductSeoPlatform (n)
 │    └── ProductSeoMedia (n)
 └── Inquiry (n)
Sản phẩm "Giường sắt đơn ống tròn":

sku = "GIUONG-SAT-001" — mã tổng
isFeatured = true, isShowHome = true
warrantyMonths = 12
origin = "Việt Nam", unit = "cái"
Variants:

1.2m x 2m + Đỏ → salePrice = 1.500.000, stockQty = 10
1.2m x 2m + Kem → salePrice = 1.600.000, stockQty = 5
1.4m x 2m + Đen → salePrice = 1.800.000, stockQty = 3
PlatformImages:

WEBSITE: 5 ảnh chụp studio
FACEBOOK: 3 ảnh lifestyle
TIKTOK: 1 ảnh thumbnail video
WEBSITE: 
model Product {
  id               String   // ID duy nhất (cuid)
  categoryId       String   // Thuộc danh mục nào
  name             String   // Tên sản phẩm
  slug             String   // URL-friendly, unique
  code             String?  // Mã sản phẩm nội bộ, unique
  shortDescription String?  // Mô tả ngắn (hiển thị listing)
  description      String?  // Mô tả chi tiết
  content          String?  // Nội dung bài viết HTML (rich text)
  specifications   String?  // Thông số kỹ thuật (JSON hoặc HTML)
  ingredients      String?  // Thành phần vật liệu
  usage            String?  // Hướng dẫn sử dụng / bảo quản

  brand            String?  // Thương hiệu
  sku              String?  // Mã SKU tổng (unique), variant có SKU riêng
  origin           String?  // Xuất xứ (VD: Việt Nam, Nhật Bản)
  unit             String?  // Đơn vị tính (cái, bộ, chiếc...)
  warrantyMonths   Int?     // Bảo hành bao nhiêu tháng

  image            String?  // Ảnh đại diện chính
  icon             String?  // Icon nhỏ
  banner           String?  // Banner danh mục/sản phẩm

  // SEO cơ bản (Website)
  seoTitle         String?
  seoDescription   String?
  canonicalUrl     String?
  ogTitle          String?
  ogDescription    String?
  ogImage          String?
  robots           String?  // default: "index,follow"

  sortOrder        Int      // Thứ tự hiển thị
  isFeatured       Boolean  // Sản phẩm nổi bật
  isFlashSale      Boolean  // Đang flash sale
  isActive         Boolean  // Đang bán / ẩn
  isShowHome       Boolean  // Hiển thị trang chủ

  soldCount        Int      // Đã bán
  viewCount        Int      // Lượt xem
  avgRating        Float    // Điểm đánh giá trung bình
  reviewCount      Int      // Số lượt đánh giá
}
---
  Chi tiết từng model

  1. Product — Sản phẩm gốc

  ┌──────────────────────────────────────────────────────────────────────────────┐
  │ Product                                                                        │
  ├──────────────────────────────────────────────────────────────────────────────┤
  │ id               String      @id @default(cuid())  — khóa chính              │
  │ categoryId       String      FK → Category           — danh mục              │
  │                                                                               │
  │ ── Thông tin cơ bản ──                                                      │
  │ name             String(500)                         — tên sản phẩm         │
  │ slug             String(300) @unique                  — URL slug              │
  │ code             String(100) @unique                  — mã nội bộ            │
  │ shortDescription String(2000)                        — mô tả ngắn          │
  │ description      Text                                 — mô tả chi tiết      │
  │ content          Text                                 — nội dung HTML         │
  │ specifications   Text                                 — thông số kỹ thuật   │
  │ ingredients      Text                                 — thành phần/chất liệu│
  │ usage            Text                                 — hướng dẫn sử dụng    │
  │                                                                               │
  │ ── Thông tin thương mại ──                                                  │
  │ brand            String(200)                        — thương hiệu           │
  │ sku              String(100) @unique                  — mã SKU sản phẩm      │
  │ origin           String(200)                        — xuất xứ               │
  │ unit             String(50)                         — đơn vị tính           │
  │ warrantyMonths   Int?                              — bảo hành (tháng)      │
  │                                                                               │
  │ ── Hình ảnh đơn lẻ ──                                                      │
  │ image            String(1000)                        — ảnh đại diện (URL)   │
  │ icon             String(1000)                        — icon                  │
  │ banner           String(1000)                        — banner                │
  │                                                                               │
  │ ── SEO base ──                                                             │
  │ seoTitle         String(500)                        — meta title             │
  │ seoDescription   String(1000)                        — meta description      │
  │ canonicalUrl     String(1000)                        — canonical URL         │
  │ ogTitle          String(500)                        — Open Graph title        │
  │ ogDescription    String(1000)                        — Open Graph description │
  │ ogImage          String(1000)                        — Open Graph image      │
  │ robots           String(100) @default("index,follow") — robots meta         │
  │                                                                               │
  │ ── Trạng thái ──                                                            │
  │ sortOrder        Int @default(0)                    — thứ tự hiển thị       │
  │ isFeatured       Boolean @default(false)           — nổi bật               │
  │ isFlashSale      Boolean @default(false)           — flash sale             │
  │ isActive         Boolean @default(true)             — công khai              │
  │ isShowHome       Boolean @default(false)            — hiển thị trang chủ   │
  │                                                                               │
  │ ── Thống kê ──                                                              │
  │ soldCount        Int @default(0)                    — đã bán                │
  │ viewCount        Int @default(0)                    — lượt xem               │
  │ avgRating        Float @default(0)                — đánh giá TB            │
  │ reviewCount      Int @default(0)                    — số đánh giá           │
  │                                                                               │
  │ createdAt        DateTime @default(now())          — ngày tạo               │
  │ updatedAt        DateTime @updatedAt               — ngày cập nhật          │
  └──────────────────────────────────────────────────────────────────────────────┘

  Ý nghĩa: Đây là bảng sản phẩm gốc — không chứa giá và tồn kho. Giá và tồn kho nằm ở ProductVariant vì giá/thùng kho khác nhau theo kích thước và màu sắc.

  ---
  2. ProductSize — Kích thước dùng chung

  ┌──────────────────────────────────────────┐
  │ ProductSize                               │
  ├──────────────────────────────────────────┤
  │ id          String @id @default(cuid())   │
  │ sizeLabel   String(100) @unique            │ ← VD: "1.2m x 2m"
  │ widthCm     Decimal(10,2)?                 │ ← chiều rộng (cm)
  │ lengthCm    Decimal(10,2)?                 │ ← chiều dài (cm)
  │ heightCm    Decimal(10,2)?                 │ ← chiều cao (cm)
  │ sortOrder   Int @default(0)              │
  │ isActive    Boolean @default(true)        │
  │ createdAt   DateTime @default(now())       │
  │                                          │
  │ variants    ProductVariant[]              │ ← liên kết ngược
  └──────────────────────────────────────────┘

  Ý nghĩa: Kích thước là danh mục dùng chung, không phụ thuộc sản phẩm. Ví dụ: 0.8m x 2m, 1.0m x 2m, 1.2m x 2m dùng được cho nhiều sản phẩm khác nhau (giường, tủ, kệ...).

  ---
  3. ProductColor — Màu dùng chung

  ┌──────────────────────────────────────────┐
  │ ProductColor                              │
  ├──────────────────────────────────────────┤
  │ id          String @id @default(cuid())   │
  │ colorName   String(100) @unique            │ ← VD: "Đỏ", "Kem", "Đen"
  │ colorCode   String(20)?                    │ ← mã HEX, VD: "#FF0000"
  │ sortOrder   Int @default(0)              │
  │ isActive    Boolean @default(true)        │
  │ createdAt   DateTime @default(now())       │
  │                                          │
  │ variants    ProductVariant[]              │
  └──────────────────────────────────────────┘

  Ý nghĩa: Màu là danh mục dùng chung, có thể hiển thị swatch màu (colorCode) và tái sử dụng cho nhiều sản phẩm.

  ---
  4. ProductVariant — Biến thể sản phẩm

  ┌─────────────────────────────────────────────────────────────────┐
  │ ProductVariant                                                     │
  ├─────────────────────────────────────────────────────────────────┤
  │ id              String @id @default(cuid())                      │
  │ productId       String FK → Product (ON DELETE CASCADE)         │
  │ productSizeId   String FK → ProductSize                          │
  │ productColorId  String FK → ProductColor                         │
  │                                                                  │
  │ sku             String(100) @unique  — SKU riêng biến thể        │
  │ barcode         String(100)       — mã vạch                      │
  │                                                                  │
  │ purchasePrice  Decimal(15,2) @default(0) — giá nhập            │
  │ salePrice      Decimal(15,2) @default(0) — giá bán              │
  │ promoPrice     Decimal(15,2)?              — giá khuyến mãi    │
  │                                                                  │
  │ stockQty        Int @default(0)    — tồn kho                    │
  │ reservedQty     Int @default(0)    — đã giữ chỗ                │
  │ weightKg        Decimal(10,2)?     — trọng lượng (kg)            │
  │                                                                  │
  │ isDefault       Boolean @default(false) — biến thể mặc định    │
  │ isActive        Boolean @default(true)                           │
  │                                                                  │
  │ createdAt       DateTime @default(now())                         │
  │ updatedAt       DateTime @updatedAt                              │
  │                                                                  │
  │ media          ProductMedia[]                                    │
  │                                                                  │
  │ @@unique([productId, productSizeId, productColorId])             │
  └─────────────────────────────────────────────────────────────────┘

  Ý nghĩa: Đây là bảng xử lý nghiệp vụ quan trọng nhất. Mỗi dòng = 1 tổ hợp (sản phẩm + kích thước + màu) với giá/thùng kho riêng.

  ▎ Ví dụ:
  ▎ - Giường sắt GTS001 + 1.2m x 2m + Đỏ → stockQty=5, salePrice=2,500,000₫
  ▎ - Giường sắt GTS001 + 1.2m x 2m + Kem → stockQty=3, salePrice=2,500,000₫
  ▎ - Giường sắt GTS001 + 1.0m x 2m + Đỏ → stockQty=8, salePrice=2,200,000₫

  ---
  5. ProductImage — Ảnh chung sản phẩm

  ┌─────────────────────────────────────────────────┐
  │ ProductImage                                      │
  ├─────────────────────────────────────────────────┤
  │ id            String @id @default(cuid())         │
  │ productId     String FK → Product (CASCADE)       │
  │ url           String                             │
  │ alt           String?                           │
  │ sortOrder     Int @default(0)                   │
  │ isThumbnail   Boolean @default(false)            │
  │ isActive      Boolean @default(true)            │
  │ createdAt     DateTime @default(now())           │
  └─────────────────────────────────────────────────┘

  ---
  6. ProductMedia — Media sản phẩm (nâng cao)

  ┌────────────────────────────────────────────────────────────────┐
  │ ProductMedia                                                     │
  ├────────────────────────────────────────────────────────────────┤
  │ id               String @id @default(cuid())                    │
  │ productId        String FK → Product (CASCADE)                 │
  │ productVariantId String? FK → ProductVariant (SET NULL)        │ ← nullable!
  │                                                                  │
  │ mediaType        String(20)    — image / video / file           │
  │ mediaUrl         String(1000)                                  │
  │ altText          String(255)?                                   │
  │ title            String(255)?                                   │
  │ widthPx          Int?                                          │
  │ heightPx         Int?                                          │
  │ fileSizeKb       Int?                                          │
  │ mimeType         String(100)?                                  │
  │ sortOrder        Int @default(0)                               │
  │ isThumbnail      Boolean @default(false)                       │
  │ isActive         Boolean @default(true)                        │
  │ createdAt        DateTime @default(now())                       │
  └────────────────────────────────────────────────────────────────┘

  Ý nghĩa: productVariantId nullable → một media có thể:
  - Gắn chung cho toàn bộ sản phẩm (productVariantId = null)
  - Gắn riêng cho 1 biến thể cụ thể (VD: ảnh riêng cho giường size 1.2m màu đỏ)

  ---
  7. ProductSeoPlatform — SEO đa nền tảng

  ┌──────────────────────────────────────────────────────────────────┐
  │ ProductSeoPlatform                                                 │
  ├──────────────────────────────────────────────────────────────────┤
  │ id              String @id @default(cuid())                       │
  │ productId       String FK → Product (CASCADE)                     │
  │ platform        PlatformType  — WEBSITE | FACEBOOK | TIKTOK | YOUTUBE │
  │                                                                       │
  │ title           String(500)?         — title cho platform            │
  │ description     String(5000)?        — mô tả platform              │
  │ contentCate     Text?              — nội dung theo platform         │
  │ keywords        String(2000)?        — keywords                     │
  │ hashtags        String(2000)?        — hashtags (FB/TT/YT)          │
  │ tags            String(2000)?        — tags (YT)                    │
  │ linkPosted      String(1000)?        — link bài đã đăng           │
  │ slug            String(500)?         — slug riêng platform           │
  │ canonicalUrl    String(1000)?        — canonical URL                 │
  │ robots          String(255)?         — robots meta                   │
  │ isNoindex       Boolean @default(false)                            │
  │ isNofollow      Boolean @default(false)                            │
  │                                                                       │
  │ ogTitle         String(500)?        — OG title                      │
  │ ogDescription   String(2000)?       — OG description                │
  │ ogImage         String(1000)?       — OG image URL                   │
  │                                                                       │
  │ schemaJson      Json?               — structured data (Product)     │
  │ extraMetaJson   Json?               — metadata bổ sung               │
  │                                                                       │
  │ isActive        Boolean @default(true)                             │
  │ createdAt       DateTime @default(now())                            │
  │ updatedAt       DateTime @updatedAt                                │
  │                                                                       │
  │ seoMedia        ProductSeoMedia[]                                   │
  │                                                                       │
  │ @@unique([productId, platform])   — mỗi platform chỉ 1 bản ghi     │
  └──────────────────────────────────────────────────────────────────┘

  Ý nghĩa: Mỗi sản phẩm có tối đa 4 bản ghi SEO (Website, Facebook, TikTok, YouTube), mỗi bản ghi có nội dung riêng phù hợp nền tảng.
8. ProductPlatformImage — Ảnh đa nền tảng sản phẩm

  ┌─────────────────────────────────────────────────────────┐
  │ ProductPlatformImage                                     │
  ├─────────────────────────────────────────────────────────┤
  │ id         String @id @default(cuid())                   │
  │ productId  String FK → Product (CASCADE)               │
  │ platform   PlatformType                                 │
  │                                                         │
  │ imageUrl   String(1000)                                │
  │ alt        String(500)?                                 │
  │ title      String(500)?                                 │
  │ caption    String(1000)?                                │
  │ sortOrder  Int @default(0)                              │
  │ isPrimary  Boolean @default(false)                      │
  │ isActive   Boolean @default(true)                       │
  │                                                         │
  │ createdAt  DateTime @default(now())                     │
  │ updatedAt  DateTime @updatedAt                          │
  └─────────────────────────────────────────────────────────┘

  Ý nghĩa: Ảnh riêng theo nền tảng. VD: ảnh đăng Facebook khác với ảnh trên website (kích thước, tỷ lệ khác nhau).

  ---
  9. ProductSeoMedia — Media SEO theo nền tảng

  ┌────────────────────────────────────────────────────────────┐
  │ ProductSeoMedia                                            │
  ├────────────────────────────────────────────────────────────┤
  │ id                   String @id @default(cuid())           │
  │ productSeoPlatformId String FK → ProductSeoPlatform (CASCADE) │
  │                                                             │
  │ mediaType            String(20)                            │
  │ mediaUrl             String(1000)                          │
  │ altText              String(255)?                          │
  │ title                String(255)?                          │
  │ widthPx              Int?                                 │
  │ heightPx             Int?                                 │
  │ sortOrder            Int @default(0)                      │
  │ isPrimary            Boolean @default(false)              │
  │ createdAt            DateTime @default(now())              │
  └────────────────────────────────────────────────────────────┘

  ---
  Nghiệp vụ chính

  Tạo sản phẩm mới:
  1. Tạo Product (thông tin cơ bản, SEO base)
  2. Tạo ProductImage (ảnh chung)
  3. Tạo ProductVariant (từng biến thể = size × color)
  4. Tạo ProductSeoPlatform (SEO cho từng platform)
  5. Tạo ProductSeoMedia (ảnh SEO theo platform)
  6. Tạo ProductPlatformImage (ảnh theo platform)

  Mỗi variant có giá nhập, giá bán, giá KM, tồn kho riêng.
  Nếu size có N kích thước và M màu → tối đa N×M biến thể.
