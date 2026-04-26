-- ============================================================
-- SEED DATA FOR NOITHATTIENLOI DATABASE
-- ============================================================

-- 1. CATEGORIES (10 categories)
INSERT INTO categories (id, name, slug, code, description, "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
('cat_sofa_001', 'Sofa', 'sofa', 'SOFA', 'Ghế sofa các loại', 1, true, NOW(), NOW()),
('cat_sofabed_002', 'Sofa Giường', 'sofa-giuong', 'SOFA_BED', 'Sofa giường đa năng', 2, true, NOW(), NOW()),
('cat_dining_003', 'Bàn Ăn', 'ban-an', 'DINING_TABLE', 'Bàn ăn gia đình', 3, true, NOW(), NOW()),
('cat_bed_004', 'Giường Ngủ', 'giuong-ngu', 'BED', 'Giường ngủ các loại', 4, true, NOW(), NOW()),
('cat_wardrobe_005', 'Tủ Quần Áo', 'tu-quan-ao', 'WARDROBE', 'Tủ quần áo', 5, true, NOW(), NOW()),
('cat_bookshelf_006', 'Kệ Sách', 'ke-sach', 'BOOKSHELF', 'Kệ sách, giá sách', 6, true, NOW(), NOW()),
('cat_desk_007', 'Bàn Làm Việc', 'ban-lam-viec', 'DESK', 'Bàn làm việc', 7, true, NOW(), NOW()),
('cat_chair_008', 'Ghế Văn Phòng', 'ghe-van-phong', 'OFFICE_CHAIR', 'Ghế văn phòng', 8, true, NOW(), NOW()),
('cat_kitchen_009', 'Tủ Bếp', 'tu-bep', 'KITCHEN_CABINET', 'Tủ bếp', 9, true, NOW(), NOW()),
('cat_display_010', 'Kệ Trưng Bày', 'ke-trung-bay', 'DISPLAY_SHELF', 'Kệ trưng bày', 10, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 2. PRODUCT SIZES (10 sizes)
INSERT INTO product_sizes (id, "sizeLabel", "sortOrder", "isActive", "createdAt") VALUES
('size_s_001', 'S (50-60cm)', 1, true, NOW()),
('size_m_002', 'M (70-80cm)', 2, true, NOW()),
('size_l_003', 'L (90-100cm)', 3, true, NOW()),
('size_xl_004', 'XL (110-120cm)', 4, true, NOW()),
('size_xxl_005', 'XXL (130-150cm)', 5, true, NOW()),
('size_1m2_006', '1m2', 6, true, NOW()),
('size_1m4_007', '1m4', 7, true, NOW()),
('size_1m6_008', '1m6', 8, true, NOW()),
('size_1m8_009', '1m8', 9, true, NOW()),
('size_2m0_010', '2m0', 10, true, NOW())
ON CONFLICT ("sizeLabel") DO NOTHING;

-- 3. PRODUCT COLORS (12 colors)
INSERT INTO product_colors (id, "colorName", "colorCode", "sortOrder", "isActive", "createdAt") VALUES
('color_white_001', 'Trắng', '#FFFFFF', 1, true, NOW()),
('color_black_002', 'Đen', '#000000', 2, true, NOW()),
('color_brown_003', 'Nâu', '#8B4513', 3, true, NOW()),
('color_yellow_004', 'Vàng', '#FFD700', 4, true, NOW()),
('color_green_005', 'Xanh lá', '#228B22', 5, true, NOW()),
('color_blue_006', 'Xanh dương', '#4169E1', 6, true, NOW()),
('color_red_007', 'Đỏ', '#DC143C', 7, true, NOW()),
('color_gray_008', 'Xám', '#808080', 8, true, NOW()),
('color_cream_009', 'Kem', '#FFFDD0', 9, true, NOW()),
('color_pink_010', 'Hồng', '#FFB6C1', 10, true, NOW()),
('color_orange_011', 'Cam', '#FF8C00', 11, true, NOW()),
('color_purple_012', 'Tím', '#9370DB', 12, true, NOW())
ON CONFLICT ("colorName") DO NOTHING;

-- 4. PRODUCTS (20 products)
INSERT INTO products (id, "categoryId", name, slug, sku, brand, origin, "shortDescription", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
('prod_001', 'cat_sofa_001', 'Sofa Vải 3 Chỗ CAO CẤP', 'sofa-vai-3-cho-cao-cap', 'SOF001', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Sofa vải cao cấp 3 chỗ ngồi, thiết kế hiện đại', 1, true, NOW(), NOW()),
('prod_002', 'cat_sofabed_002', 'Sofa Giường Gỗ Tự Nhiên', 'sofa-giuong-go-tu-nhien', 'SOFB001', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Sofa giường đa năng gỗ tự nhiên', 2, true, NOW(), NOW()),
('prod_003', 'cat_dining_003', 'Bàn Ăn 6 Người Gỗ Sồi', 'ban-an-6-nguoi-go-soi', 'DINT001', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Bàn ăn 6 người bằng gỗ sồi tự nhiên', 3, true, NOW(), NOW()),
('prod_004', 'cat_bed_004', 'Giường Ngủ King Size 1m8', 'giuong-ngu-king-size-1m8', 'BED001', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Giường ngủ king size 1m8, da PU cao cấp', 4, true, NOW(), NOW()),
('prod_005', 'cat_wardrobe_005', 'Tủ Quần Áo 3 Cánh Gỗ MDF', 'tu-quan-ao-3-canh-go-mdf', 'WAR001', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Tủ quần áo 3 cánh gỗ MDF, phủ melamine', 5, true, NOW(), NOW()),
('prod_006', 'cat_bookshelf_006', 'Kệ Sách 5 Tầng Mini', 'ke-sach-5-tang-mini', 'BOOK001', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Kệ sách 5 tầng mini, treo tường tiện lợi', 6, true, NOW(), NOW()),
('prod_007', 'cat_desk_007', 'Bàn Làm Việc IT 1m2', 'ban-lam-viec-it-1m2', 'DESK001', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Bàn làm việc IT 1m2, có ngăn kéo', 7, true, NOW(), NOW()),
('prod_008', 'cat_chair_008', 'Ghế Văn Phòng Ergonomic', 'ghe-van-phong-ergonomic', 'OFC001', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Ghế văn phòng ergonomic, lưới thoáng khí', 8, true, NOW(), NOW()),
('prod_009', 'cat_kitchen_009', 'Tủ Bếp Chữ L Hiện Đại', 'tu-bep-chu-l-hien-dai', 'KIT001', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Tủ bếp chữ L hiện đại, gỗ MDF phủ acrylic', 9, true, NOW(), NOW()),
('prod_010', 'cat_display_010', 'Kệ Trưng Bày 4 Tầng', 'ke-trung-bay-4-tang', 'DISP001', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Kệ trưng bày 4 tầng, treo tường', 10, true, NOW(), NOW()),
('prod_011', 'cat_sofa_001', 'Sofa Nỉ 2 Chỗ Cao Cấp', 'sofa-ni-2-cho-cao-cap', 'SOF002', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Sofa nỉ 2 chỗ cao cấp, kiểu dáng tối giản', 11, true, NOW(), NOW()),
('prod_012', 'cat_dining_003', 'Bàn Ăn Gỗ Tràm 4 Người', 'ban-an-go-tram-4-nguoi', 'DINT002', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Bàn ăn 4 người bằng gỗ tràm tự nhiên', 12, true, NOW(), NOW()),
('prod_013', 'cat_bed_004', 'Giường Ngủ Đôi 1m6', 'giuong-ngu-doi-1m6', 'BED002', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Giường ngủ đôi 1m6, khung gỗ tự nhiên', 13, true, NOW(), NOW()),
('prod_014', 'cat_wardrobe_005', 'Tủ Quần Áo Trượt 2 Cánh', 'tu-quan-ao-truot-2-canh', 'WAR002', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Tủ quần áo trượt 2 cánh, cửa kính', 14, true, NOW(), NOW()),
('prod_015', 'cat_bookshelf_006', 'Kệ Sách Đứng 6 Tầng', 'ke-sach-dung-6-tang', 'BOOK002', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Kệ sách đứng 6 tầng, gỗ công nghiệp', 15, true, NOW(), NOW()),
('prod_016', 'cat_desk_007', 'Bàn Làm Việc Lớn 1m6 Có Hộc', 'ban-lam-viec-lon-1m6-co-hoc', 'DESK002', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Bàn làm việc lớn 1m6, có hộc tủ', 16, true, NOW(), NOW()),
('prod_017', 'cat_chair_008', 'Ghế Văn Phòng Xoay Cao Cấp', 'ghe-van-phong-xoay-cao-cap', 'OFC002', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Ghế văn phòng xoay cao cấp, da thật', 17, true, NOW(), NOW()),
('prod_018', 'cat_sofabed_002', 'Sofa Giường Mini 1m5', 'sofa-giuong-mini-1m5', 'SOFB002', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Sofa giường mini 1m5, đa năng', 18, true, NOW(), NOW()),
('prod_019', 'cat_display_010', 'Kệ Trưng Bày Cửa Kính', 'ke-trung-bay-cua-kinh', 'DISP002', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Kệ trưng bày cửa kính, 5 tầng', 19, true, NOW(), NOW()),
('prod_020', 'cat_kitchen_009', 'Tủ Bếp Chữ I Đơn Giản', 'tu-bep-chu-i-don-gian', 'KIT002', 'Nội Thất Tiện Lợi', 'Việt Nam', 'Tủ bếp chữ I đơn giản, gỗ MDF', 20, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 5. PRODUCT VARIANTS (Sample: 3 variants per first 5 products)
INSERT INTO product_variants (id, "productId", "productSizeId", "productColorId", sku, "purchasePrice", "salePrice", "stockQty", "isDefault", "isActive", "createdAt", "updatedAt") VALUES
-- Sofa Vải 3 Chỗ
('var_001_001', 'prod_001', 'size_l_003', 'color_brown_003', 'SOF001-L-BROWN', 8000000, 12000000, 10, true, true, NOW(), NOW()),
('var_001_002', 'prod_001', 'size_l_003', 'color_gray_008', 'SOF001-L-GRAY', 8000000, 12000000, 8, false, true, NOW(), NOW()),
('var_001_003', 'prod_001', 'size_xl_004', 'color_brown_003', 'SOF001-XL-BROWN', 9000000, 13500000, 5, false, true, NOW(), NOW()),
-- Sofa Giường
('var_002_001', 'prod_002', 'size_1m6_008', 'color_brown_003', 'SOFB001-1M6-BROWN', 7000000, 10500000, 12, true, true, NOW(), NOW()),
('var_002_002', 'prod_002', 'size_1m8_009', 'color_brown_003', 'SOFB001-1M8-BROWN', 8000000, 12000000, 8, false, true, NOW(), NOW()),
-- Bàn Ăn
('var_003_001', 'prod_003', 'size_1m4_007', 'color_brown_003', 'DINT001-1M4-BROWN', 5000000, 7500000, 15, true, true, NOW(), NOW()),
('var_003_002', 'prod_003', 'size_1m6_008', 'color_brown_003', 'DINT001-1M6-BROWN', 6000000, 9000000, 10, false, true, NOW(), NOW()),
-- Giường Ngủ
('var_004_001', 'prod_004', 'size_1m8_009', 'color_white_001', 'BED001-1M8-WHITE', 10000000, 15000000, 8, true, true, NOW(), NOW()),
('var_004_002', 'prod_004', 'size_1m8_009', 'color_brown_003', 'BED001-1M8-BROWN', 10000000, 15000000, 6, false, true, NOW(), NOW()),
-- Tủ Quần Áo
('var_005_001', 'prod_005', 'size_1m6_008', 'color_white_001', 'WAR001-1M6-WHITE', 8000000, 12000000, 10, true, true, NOW(), NOW()),
('var_005_002', 'prod_005', 'size_1m8_009', 'color_white_001', 'WAR001-1M8-WHITE', 9000000, 13500000, 7, false, true, NOW(), NOW())
ON CONFLICT (sku) DO NOTHING;

-- 6. NEWS CATEGORIES
INSERT INTO news_category (id, title, "seName", summary, "sortOrder", "isActive", "isShowHome", "isPublished", "createdDate", "lastUpdDate") VALUES
('newscat_001', 'Tin Tức Nội Thất', 'tin-tuc-noi-that', 'Tin tức về nội thất', 1, true, true, true, NOW(), NOW()),
('newscat_002', 'Khuyến Mãi', 'khuyen-mai', 'Các chương trình khuyến mãi', 2, true, true, true, NOW(), NOW()),
('newscat_003', 'Hướng Dẫn', 'huong-dan', 'Hướng dẫn sử dụng và bảo quản', 3, true, true, true, NOW(), NOW()),
('newscat_004', 'Phong Cách', 'phong-cach', 'Phong cách thiết kế nội thất', 4, true, true, true, NOW(), NOW()),
('newscat_005', 'Tin Tức Chung', 'tin-tuc-chung', 'Tin tức chung', 5, true, true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 7. NEWS CONTENT
INSERT INTO news_content (id, title, "seName", summary, content, "isPublished", "isShowHome", "isActive", "createdDate", "lastUpdDate", "publishedAt") VALUES
('news_001', 'Xu Hướng Nội Thất 2026', 'xu-huong-noi-that-2026', 'Khám phá những xu hướng nội thất hot nhất năm 2026', '<p>Nội thất tối giản, gam màu trung tính và vật liệu tự nhiên là xu hướng chủ đạo trong năm 2026.</p>', true, true, true, NOW(), NOW(), NOW()),
('news_002', 'Khuyến Mãi Mùa Hè 30%', 'khuyen-mai-mua-he-30', 'Giảm giá mùa hè lên đến 30% cho tất cả sản phẩm', '<p>Chương trình khuyến mãi mùa hè với ưu đãi lên đến 30%.</p>', true, true, true, NOW(), NOW(), NOW()),
('news_003', 'Cách Bảo Quản Sofa Da', 'cach-bao-quan-sofa-da', 'Hướng dẫn cách bảo quản sofa da bền đẹp', '<p>Vệ sinh và bảo quản sofa da đúng cách để kéo dài tuổi thọ.</p>', true, true, true, NOW(), NOW(), NOW()),
('news_004', 'Phong Cách Scandinavian', 'phong-cach-scandinavian', 'Khám phá phong cách nội thất Scandinavian', '<p>Scandinavian - phong cách tối giản, tiện nghi và gần gũi thiên nhiên.</p>', true, true, true, NOW(), NOW(), NOW()),
('news_005', 'Tết Nguyên Đán - Quà Tặng Ý Nghĩa', 'tet-nguyen-dan-qua-tang', 'Gợi ý quà tặng Tết ý nghĩa cho gia đình', '<p>Mua sắm Tết với những ưu đãi hấp dẫn từ Nội Thất Tiện Lợi.</p>', true, true, true, NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 8. SLIDERS
INSERT INTO sliders (id, title, image, link, content, "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
('slider_001', 'Slider Trang Chủ 1', '/images/slider/home-1.jpg', '/', 'Chào mừng đến với Nội Thất Tiện Lợi', 1, true, NOW(), NOW()),
('slider_002', 'Slider Khuyến Mãi', '/images/slider/sale-1.jpg', '/khuyen-mai', 'Giảm giá lên đến 30%', 2, true, NOW(), NOW()),
('slider_003', 'Slider Sản Phẩm Mới', '/images/slider/new-1.jpg', '/san-pham', 'Sản phẩm mới nhất', 3, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 9. PAGES
INSERT INTO page (id, "pageName", title, body, "isActive", "isShowHome", "sortOrder", "createdDate", "lastUpdDate") VALUES
('page_001', 'Gioi Thieu', 'Giới Thiệu', '<p>Công ty Nội Thất Tiện Lợi - Chuyên cung cấp các sản phẩm nội thất chất lượng cao.</p>', true, true, 1, NOW(), NOW()),
('page_002', 'Chinh Sach Van Chuyen', 'Chính Sách Vận Chuyển', '<p>Chính sách vận chuyển của Nội Thất Tiện Lợi.</p>', true, false, 2, NOW(), NOW()),
('page_003', 'Chinh Sach Doi Tra', 'Chính Sách Đổi Trả', '<p>Chính sách đổi trả hàng của Nội Thất Tiện Lợi.</p>', true, false, 3, NOW(), NOW()),
('page_004', 'Huong Dan Mua Hang', 'Hướng Dẫn Mua Hàng', '<p>Hướng dẫn mua hàng tại Nội Thất Tiện Lợi.</p>', true, false, 4, NOW(), NOW()),
('page_005', 'Lien He', 'Liên Hệ', '<p>Liên hệ với Nội Thất Tiện Lợi.</p>', true, true, 5, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 10. MENU LINKS
INSERT INTO menu_link (id, title, slug, "sortOrder", "createdDate", "lastUpdDate") VALUES
('menu_001', 'Trang Chủ', '/', 1, NOW(), NOW()),
('menu_002', 'Sản Phẩm', '/san-pham', 2, NOW(), NOW()),
('menu_003', 'Tin Tức', '/tin-tuc', 3, NOW(), NOW()),
('menu_004', 'Liên Hệ', '/lien-he', 4, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Summary
SELECT 'Seed data imported successfully!' as message;
SELECT COUNT(*) as categories_count FROM categories;
SELECT COUNT(*) as product_sizes_count FROM product_sizes;
SELECT COUNT(*) as product_colors_count FROM product_colors;
SELECT COUNT(*) as products_count FROM products;
SELECT COUNT(*) as product_variants_count FROM product_variants;
SELECT COUNT(*) as news_count FROM news_content;
SELECT COUNT(*) as sliders_count FROM sliders;
SELECT COUNT(*) as pages_count FROM page;
