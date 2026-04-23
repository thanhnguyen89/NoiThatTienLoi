# Database Design – Order System

## 1. Mục tiêu thiết kế

Thiết kế này tập trung vào phần **đặt hàng và lưu đơn hàng**, không bao gồm phần danh mục và sản phẩm của tài liệu trước.

Hệ thống cần hỗ trợ các yêu cầu:

- Thành viên đã có tài khoản có thể đặt hàng.
- Khách chưa có tài khoản vẫn có thể đặt hàng như tài khoản guest.
- Sau này khách có thể tạo tài khoản và liên kết lại đơn cũ dựa trên:
  - số điện thoại
  - email
- Mỗi đơn hàng cần lưu đầy đủ thông tin vận chuyển:
  - từ địa chỉ kho
  - đến địa chỉ khách
  - đơn vị vận chuyển
  - số km
  - chi phí vận chuyển
  - hình thức vận chuyển
- Đơn hàng cần lưu thêm số tiền khách đã đặt cọc.

---

## 2. Nguyên tắc thiết kế

Thiết kế được tách thành các nhóm dữ liệu:

- **Tài khoản thành viên**
- **Địa chỉ thành viên**
- **Kho**
- **Đơn vị vận chuyển**
- **Đơn hàng**
- **Chi tiết đơn hàng**
- **Thông tin vận chuyển của đơn**
- **Lịch sử trạng thái đơn**

Nguyên tắc chính:

- Không bắt buộc người mua phải có tài khoản.
- Đơn hàng luôn lưu snapshot thông tin khách tại thời điểm đặt hàng.
- Khi guest tạo tài khoản sau này, có thể liên kết đơn cũ về member.
- Dữ liệu vận chuyển được lưu chi tiết để phục vụ phân tích chi phí logistics.

---

## 3. ENUM đề xuất

### 3.1. `order_customer_type_enum`

```sql
CREATE TYPE order_customer_type_enum AS ENUM (
    'member',
    'guest'
);
```

### 3.2. `order_status_enum`

```sql
CREATE TYPE order_status_enum AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipping',
    'delivered',
    'completed',
    'cancelled',
    'returned'
);
```

### 3.3. `payment_status_enum`

```sql
CREATE TYPE payment_status_enum AS ENUM (
    'unpaid',
    'partially_paid',
    'paid',
    'refunded',
    'partially_refunded'
);
```

### 3.4. `shipping_method_enum`

```sql
CREATE TYPE shipping_method_enum AS ENUM (
    'motorbike',
    'van',
    'truck',
    'pickup',
    'other'
);
```

### 3.5. `shipping_service_type_enum`

```sql
CREATE TYPE shipping_service_type_enum AS ENUM (
    'standard',
    'express',
    'same_day',
    'scheduled',
    'other'
);
```

### 3.6. `changed_by_type_enum`

```sql
CREATE TYPE changed_by_type_enum AS ENUM (
    'admin',
    'system',
    'customer',
    'shipper'
);
```

> Ghi chú: ví dụ trên dùng cú pháp PostgreSQL. Nếu dùng MySQL, có thể khai báo `ENUM(...)` trực tiếp trong cột.

---

## 4. Chi tiết các bảng

## 4.1. Bảng `members`

### Mục đích

Lưu tài khoản thành viên của hệ thống.

### SQL

```sql
CREATE TABLE members (
    id                  BIGSERIAL PRIMARY KEY,
    full_name           VARCHAR(255),
    email               VARCHAR(255),
    phone               VARCHAR(50),
    password_hash       VARCHAR(255),
    date_of_birth       DATE,
    gender              VARCHAR(20),
    is_active           BOOLEAN DEFAULT TRUE,
    email_verified_at   TIMESTAMP,
    phone_verified_at   TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chú thích field

- `full_name`: họ tên thành viên.
- `email`: email đăng nhập hoặc liên hệ.
- `phone`: số điện thoại.
- `password_hash`: mật khẩu mã hóa.
- `is_active`: trạng thái tài khoản.
- `email_verified_at`: thời gian xác minh email.
- `phone_verified_at`: thời gian xác minh số điện thoại.
- `created_at`, `updated_at`: thời gian tạo/cập nhật.

### Khuyến nghị

- Nên tạo index cho `email`, `phone`.
- Có thể thêm `UNIQUE(email)` và `UNIQUE(phone)` nếu nghiệp vụ cho phép.

---

## 4.2. Bảng `member_addresses`

### Mục đích

Lưu sổ địa chỉ của thành viên.

### SQL

```sql
CREATE TABLE member_addresses (
    id                  BIGSERIAL PRIMARY KEY,
    member_id           BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    contact_name        VARCHAR(255) NOT NULL,
    contact_phone       VARCHAR(50) NOT NULL,
    country_code        VARCHAR(20),
    province_code       VARCHAR(50),
    province_name       VARCHAR(255),
    district_code       VARCHAR(50),
    district_name       VARCHAR(255),
    ward_code           VARCHAR(50),
    ward_name           VARCHAR(255),
    address_line        VARCHAR(500) NOT NULL,
    full_address        VARCHAR(1000),
    latitude            DECIMAL(10,7),
    longitude           DECIMAL(10,7),
    note                VARCHAR(500),
    is_default          BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chú thích field

- `member_id`: thành viên sở hữu địa chỉ.
- `contact_name`, `contact_phone`: người nhận tại địa chỉ đó.
- `province_*`, `district_*`, `ward_*`: thông tin địa giới hành chính.
- `address_line`: địa chỉ chi tiết.
- `full_address`: địa chỉ đầy đủ đã ghép.
- `latitude`, `longitude`: tọa độ nếu có.
- `is_default`: đánh dấu địa chỉ mặc định.

### Lưu ý

Địa chỉ trong đơn hàng vẫn nên được lưu snapshot riêng, không phụ thuộc trực tiếp vào bảng này.

---

## 4.3. Bảng `warehouses`

### Mục đích

Lưu thông tin kho hoặc điểm xuất hàng.

### SQL

```sql
CREATE TABLE warehouses (
    id                  BIGSERIAL PRIMARY KEY,
    code                VARCHAR(100) UNIQUE,
    name                VARCHAR(255) NOT NULL,
    contact_name        VARCHAR(255),
    contact_phone       VARCHAR(50),
    country_code        VARCHAR(20),
    province_code       VARCHAR(50),
    province_name       VARCHAR(255),
    district_code       VARCHAR(50),
    district_name       VARCHAR(255),
    ward_code           VARCHAR(50),
    ward_name           VARCHAR(255),
    address_line        VARCHAR(500) NOT NULL,
    full_address        VARCHAR(1000),
    latitude            DECIMAL(10,7),
    longitude           DECIMAL(10,7),
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chú thích field

- `code`: mã kho.
- `name`: tên kho.
- `contact_name`, `contact_phone`: đầu mối liên hệ kho.
- `full_address`: địa chỉ kho đầy đủ.
- `latitude`, `longitude`: tọa độ kho để hỗ trợ tính quãng đường.

---

## 4.4. Bảng `shipping_providers`

### Mục đích

Lưu đơn vị vận chuyển.

### SQL

```sql
CREATE TABLE shipping_providers (
    id                  BIGSERIAL PRIMARY KEY,
    code                VARCHAR(100) UNIQUE,
    name                VARCHAR(255) NOT NULL,
    phone               VARCHAR(50),
    website             VARCHAR(255),
    note                TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chú thích field

- `code`: mã đơn vị vận chuyển.
- `name`: tên đơn vị vận chuyển.
- `phone`, `website`: thông tin liên hệ.
- `note`: ghi chú thêm.
- `is_active`: trạng thái hoạt động.

---

## 4.5. Bảng `orders`

### Mục đích

Lưu thông tin tổng quan của đơn hàng.

### Ý nghĩa

- Hỗ trợ cả member và guest.
- Lưu snapshot thông tin khách hàng tại thời điểm đặt.
- Lưu tổng tiền, trạng thái đơn, trạng thái thanh toán.
- Lưu thêm số tiền đặt cọc và số tiền còn lại phải thanh toán.

### SQL

```sql
CREATE TABLE orders (
    id                          BIGSERIAL PRIMARY KEY,
    order_no                    VARCHAR(100) NOT NULL UNIQUE,

    customer_type               order_customer_type_enum NOT NULL,
    member_id                   BIGINT REFERENCES members(id),

    customer_name               VARCHAR(255) NOT NULL,
    customer_phone              VARCHAR(50),
    customer_email              VARCHAR(255),

    billing_contact_name        VARCHAR(255),
    billing_contact_phone       VARCHAR(50),
    billing_contact_email       VARCHAR(255),
    billing_country_code        VARCHAR(20),
    billing_province_code       VARCHAR(50),
    billing_province_name       VARCHAR(255),
    billing_district_code       VARCHAR(50),
    billing_district_name       VARCHAR(255),
    billing_ward_code           VARCHAR(50),
    billing_ward_name           VARCHAR(255),
    billing_address_line        VARCHAR(500),
    billing_full_address        VARCHAR(1000),

    shipping_contact_name       VARCHAR(255) NOT NULL,
    shipping_contact_phone      VARCHAR(50) NOT NULL,
    shipping_contact_email      VARCHAR(255),
    shipping_country_code       VARCHAR(20),
    shipping_province_code      VARCHAR(50),
    shipping_province_name      VARCHAR(255),
    shipping_district_code      VARCHAR(50),
    shipping_district_name      VARCHAR(255),
    shipping_ward_code          VARCHAR(50),
    shipping_ward_name          VARCHAR(255),
    shipping_address_line       VARCHAR(500) NOT NULL,
    shipping_full_address       VARCHAR(1000),
    shipping_latitude           DECIMAL(10,7),
    shipping_longitude          DECIMAL(10,7),

    subtotal_amount             DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount             DECIMAL(15,2) NOT NULL DEFAULT 0,
    shipping_amount             DECIMAL(15,2) NOT NULL DEFAULT 0,
    other_fee_amount            DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount                  DECIMAL(15,2) NOT NULL DEFAULT 0,
    grand_total_amount          DECIMAL(15,2) NOT NULL DEFAULT 0,

    deposit_amount              DECIMAL(15,2) NOT NULL DEFAULT 0,
    remaining_amount            DECIMAL(15,2) NOT NULL DEFAULT 0,

    order_status                order_status_enum NOT NULL DEFAULT 'pending',
    payment_status              payment_status_enum NOT NULL DEFAULT 'unpaid',

    customer_note               TEXT,
    internal_note               TEXT,

    placed_at                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chú thích field

- `order_no`: mã đơn hàng.
- `customer_type`: loại người mua, `member` hoặc `guest`.
- `member_id`: optional, dùng khi đơn thuộc tài khoản thành viên.
- `customer_name`, `customer_phone`, `customer_email`: snapshot người mua.
- `billing_*`: thông tin thanh toán/xuất hóa đơn.
- `shipping_*`: thông tin giao hàng thực tế.
- `subtotal_amount`: tổng tiền hàng trước giảm giá/phí.
- `discount_amount`: tổng giảm giá.
- `shipping_amount`: tổng phí vận chuyển.
- `other_fee_amount`: phụ phí khác.
- `tax_amount`: thuế nếu có.
- `grand_total_amount`: tổng giá trị đơn cuối cùng.
- `deposit_amount`: số tiền khách đã đặt cọc.
- `remaining_amount`: số tiền còn lại phải thanh toán.
- `order_status`: trạng thái xử lý đơn.
- `payment_status`: trạng thái thanh toán.
- `customer_note`: ghi chú từ khách.
- `internal_note`: ghi chú nội bộ.

### Gợi ý công thức

```text
remaining_amount = grand_total_amount - deposit_amount
```

### Lưu ý

Dù khách hàng sau này đổi thông tin tài khoản, dữ liệu trong đơn vẫn giữ nguyên lịch sử tại thời điểm đặt hàng.

---

## 4.6. Bảng `order_items`

### Mục đích

Lưu chi tiết từng dòng sản phẩm trong đơn hàng.

### SQL

```sql
CREATE TABLE order_items (
    id                      BIGSERIAL PRIMARY KEY,
    order_id                BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id              BIGINT NOT NULL,
    product_variant_id      BIGINT,

    product_name            VARCHAR(255) NOT NULL,
    variant_name            VARCHAR(255),
    sku                     VARCHAR(100),

    size_label              VARCHAR(100),
    color_name              VARCHAR(100),

    quantity                INT NOT NULL,
    unit_purchase_price     DECIMAL(15,2),
    unit_sale_price         DECIMAL(15,2) NOT NULL DEFAULT 0,
    unit_promo_price        DECIMAL(15,2),
    unit_final_price        DECIMAL(15,2) NOT NULL DEFAULT 0,

    line_discount_amount    DECIMAL(15,2) NOT NULL DEFAULT 0,
    line_total_amount       DECIMAL(15,2) NOT NULL DEFAULT 0,

    product_snapshot_json   JSONB,

    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chú thích field

- `order_id`: đơn hàng cha.
- `product_id`: id sản phẩm tại thời điểm đặt.
- `product_variant_id`: id biến thể nếu có.
- `product_name`, `variant_name`, `size_label`, `color_name`: snapshot thông tin hiển thị.
- `quantity`: số lượng.
- `unit_purchase_price`: giá nhập tham chiếu nếu cần phân tích lãi.
- `unit_sale_price`: đơn giá niêm yết.
- `unit_promo_price`: đơn giá khuyến mãi.
- `unit_final_price`: đơn giá thực tế áp dụng.
- `line_discount_amount`: số tiền giảm giá của dòng.
- `line_total_amount`: thành tiền của dòng.
- `product_snapshot_json`: snapshot mở rộng.

### Lưu ý

Bảng này chủ yếu dùng để bảo toàn lịch sử đơn. Không nên phụ thuộc hoàn toàn vào dữ liệu hiện tại của sản phẩm.

---

## 4.7. Bảng `order_shipments`

### Mục đích

Lưu thông tin vận chuyển của đơn hàng để phục vụ phân tích logistics và tối ưu chi phí.

### SQL

```sql
CREATE TABLE order_shipments (
    id                          BIGSERIAL PRIMARY KEY,
    order_id                    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

    warehouse_id                BIGINT REFERENCES warehouses(id),
    shipping_provider_id        BIGINT REFERENCES shipping_providers(id),

    shipping_method             shipping_method_enum NOT NULL,
    shipping_service_type       shipping_service_type_enum,

    from_contact_name           VARCHAR(255),
    from_contact_phone          VARCHAR(50),
    from_country_code           VARCHAR(20),
    from_province_code          VARCHAR(50),
    from_province_name          VARCHAR(255),
    from_district_code          VARCHAR(50),
    from_district_name          VARCHAR(255),
    from_ward_code              VARCHAR(50),
    from_ward_name              VARCHAR(255),
    from_address_line           VARCHAR(500),
    from_full_address           VARCHAR(1000),
    from_latitude               DECIMAL(10,7),
    from_longitude              DECIMAL(10,7),

    to_contact_name             VARCHAR(255),
    to_contact_phone            VARCHAR(50),
    to_country_code             VARCHAR(20),
    to_province_code            VARCHAR(50),
    to_province_name            VARCHAR(255),
    to_district_code            VARCHAR(50),
    to_district_name            VARCHAR(255),
    to_ward_code                VARCHAR(50),
    to_ward_name                VARCHAR(255),
    to_address_line             VARCHAR(500),
    to_full_address             VARCHAR(1000),
    to_latitude                 DECIMAL(10,7),
    to_longitude                DECIMAL(10,7),

    distance_km                 DECIMAL(10,2),
    estimated_distance_km       DECIMAL(10,2),

    shipping_cost               DECIMAL(15,2) NOT NULL DEFAULT 0,
    extra_cost                  DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount             DECIMAL(15,2) NOT NULL DEFAULT 0,
    final_shipping_cost         DECIMAL(15,2) NOT NULL DEFAULT 0,

    provider_order_code         VARCHAR(100),
    tracking_code               VARCHAR(100),
    shipped_at                  TIMESTAMP,
    delivered_at                TIMESTAMP,

    note                        TEXT,
    metadata_json               JSONB,

    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chú thích field

- `order_id`: đơn hàng cần giao.
- `warehouse_id`: kho xuất hàng.
- `shipping_provider_id`: đơn vị vận chuyển.
- `shipping_method`: phương tiện giao như xe máy, xe van, xe tải.
- `shipping_service_type`: loại dịch vụ giao hàng.
- `from_*`: snapshot địa chỉ lấy hàng.
- `to_*`: snapshot địa chỉ giao hàng.
- `distance_km`: số km thực tế.
- `estimated_distance_km`: số km ước tính.
- `shipping_cost`: phí vận chuyển gốc.
- `extra_cost`: phụ phí thêm.
- `discount_amount`: phần giảm giá phí ship.
- `final_shipping_cost`: phí ship cuối cùng.
- `provider_order_code`: mã đơn phía hãng vận chuyển.
- `tracking_code`: mã tracking.
- `metadata_json`: dữ liệu mở rộng từ API hãng vận chuyển nếu có.

### Giá trị phân tích

Từ bảng này có thể phân tích:

- kho nào xuất hàng tối ưu nhất
- đơn vị vận chuyển nào có chi phí thấp hơn
- khu vực nào có chi phí giao cao
- phương tiện nào phù hợp theo khoảng cách
- tỷ lệ chi phí ship trên giá trị đơn hàng

---

## 4.8. Bảng `order_status_histories`

### Mục đích

Lưu lịch sử thay đổi trạng thái của đơn hàng.

### SQL

```sql
CREATE TABLE order_status_histories (
    id                  BIGSERIAL PRIMARY KEY,
    order_id            BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status         order_status_enum,
    to_status           order_status_enum NOT NULL,
    changed_by_type     changed_by_type_enum,
    changed_by_id       BIGINT,
    note                TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chú thích field

- `order_id`: đơn hàng được thay đổi trạng thái.
- `from_status`: trạng thái trước đó.
- `to_status`: trạng thái mới.
- `changed_by_type`: loại actor thực hiện thay đổi, ví dụ `admin`, `system`, `customer`, `shipper`.
- `changed_by_id`: id của actor đã thay đổi trạng thái.
- `note`: ghi chú thêm.
- `created_at`: thời điểm thay đổi.

### Ý nghĩa 2 field quan trọng

- `changed_by_type`: cho biết **ai** đã thực hiện thay đổi.
- `changed_by_id`: cho biết **id của đối tượng đó**.

Ví dụ:

- `changed_by_type = 'admin'`, `changed_by_id = 5`
- `changed_by_type = 'system'`, `changed_by_id = NULL`
- `changed_by_type = 'customer'`, `changed_by_id = 88`

### Lợi ích

- Audit lịch sử thao tác
- Debug xử lý đơn
- Phân tích tỷ lệ trạng thái đổi bởi admin, hệ thống, khách hay shipper

---

## 5. Liên kết guest order với member sau này

### Bài toán

Khách đặt hàng khi chưa có tài khoản, sau đó mới đăng ký thành viên.

### Cách xử lý đề xuất

Khi khách tạo tài khoản mới, hệ thống có thể rà soát các đơn cũ:

- theo `orders.customer_email`
- hoặc theo `orders.customer_phone`

Sau đó cập nhật liên kết:

```sql
UPDATE orders
SET member_id = :new_member_id,
    customer_type = 'member'
WHERE member_id IS NULL
  AND (
        customer_email = :email
        OR customer_phone = :phone
      );
```

### Lưu ý

- Nên có bước xác minh OTP hoặc xác minh email trước khi merge.
- Nên ghi log khi thực hiện liên kết đơn guest sang member.

---

## 6. Sơ đồ quan hệ tổng quát

```text
members
 ├── member_addresses
 └── orders
      ├── order_items
      ├── order_shipments
      └── order_status_histories

warehouses
 └── order_shipments

shipping_providers
 └── order_shipments
```

---

## 7. Kết luận

Thiết kế này đáp ứng các yêu cầu chính:

- thành viên có thể đặt hàng
- khách chưa có tài khoản vẫn đặt hàng được
- guest order có thể liên kết lại về member sau này
- mỗi đơn lưu đầy đủ snapshot khách hàng
- mỗi đơn lưu chi tiết vận chuyển từ kho đến khách
- hỗ trợ phân tích tối ưu chi phí logistics
- hỗ trợ lưu số tiền khách đã đặt cọc trực tiếp trong đơn hàng

Đây là phần thiết kế phù hợp để triển khai:

- website bán hàng
- hệ thống admin quản lý đơn
- hệ thống vận hành giao hàng
- báo cáo phân tích chi phí vận chuyển
