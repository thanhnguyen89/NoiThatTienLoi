import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding master data...');

  // ── 1. Categories ───────────────────────────────────────────────────────────
  const categories = [
    { name: 'Sofa', slug: 'sofa', code: 'SOFA', description: 'Ghế sofa các loại', sortOrder: 1, isActive: true },
    { name: 'Sofa Giường', slug: 'sofa-giuong', code: 'SOFA_BED', description: 'Sofa giường đa năng', sortOrder: 2, isActive: true },
    { name: 'Bàn Ăn', slug: 'ban-an', code: 'DINING_TABLE', description: 'Bàn ăn gia đình', sortOrder: 3, isActive: true },
    { name: 'Giường Ngủ', slug: 'giuong-ngu', code: 'BED', description: 'Giường ngủ các loại', sortOrder: 4, isActive: true },
    { name: 'Tủ Quần Áo', slug: 'tu-quan-ao', code: 'WARDROBE', description: 'Tủ quần áo', sortOrder: 5, isActive: true },
    { name: 'Kệ Sách', slug: 'ke-sach', code: 'BOOKSHELF', description: 'Kệ sách, giá sách', sortOrder: 6, isActive: true },
    { name: 'Bàn Làm Việc', slug: 'ban-lam-viec', code: 'DESK', description: 'Bàn làm việc', sortOrder: 7, isActive: true },
    { name: 'Ghế Văn Phòng', slug: 'ghe-van-phong', code: 'OFFICE_CHAIR', description: 'Ghế văn phòng', sortOrder: 8, isActive: true },
    { name: 'Tủ Bếp', slug: 'tu-bep', code: 'KITCHEN_CABINET', description: 'Tủ bếp', sortOrder: 9, isActive: true },
    { name: 'Kệ Trưng Bày', slug: 'ke-trung-bay', code: 'DISPLAY_SHELF', description: 'Kệ trưng bày', sortOrder: 10, isActive: true },
  ];

  const categoryIds: Record<string, string> = {};
  for (const cat of categories) {
    const existing = await prisma.category.findFirst({ where: { slug: cat.slug } });
    if (!existing) {
      const created = await prisma.category.create({ data: cat });
      categoryIds[cat.slug] = created.id;
    } else {
      categoryIds[cat.slug] = existing.id;
    }
  }
  console.log(`✅ Created ${categories.length} categories`);

  // ── 2. Product Sizes ────────────────────────────────────────────────────────
  const sizes = [
    { sizeLabel: 'S (50-60cm)', sortOrder: 1, isActive: true },
    { sizeLabel: 'M (70-80cm)', sortOrder: 2, isActive: true },
    { sizeLabel: 'L (90-100cm)', sortOrder: 3, isActive: true },
    { sizeLabel: 'XL (110-120cm)', sortOrder: 4, isActive: true },
    { sizeLabel: 'XXL (130-150cm)', sortOrder: 5, isActive: true },
    { sizeLabel: '1m2', sortOrder: 6, isActive: true },
    { sizeLabel: '1m4', sortOrder: 7, isActive: true },
    { sizeLabel: '1m6', sortOrder: 8, isActive: true },
    { sizeLabel: '1m8', sortOrder: 9, isActive: true },
    { sizeLabel: '2m0', sortOrder: 10, isActive: true },
  ];

  const sizeIds: string[] = [];
  for (const size of sizes) {
    const existing = await prisma.productSize.findFirst({ where: { sizeLabel: size.sizeLabel } });
    if (!existing) {
      const created = await prisma.productSize.create({ data: size });
      sizeIds.push(created.id);
    } else {
      sizeIds.push(existing.id);
    }
  }
  console.log(`✅ Created ${sizes.length} product sizes`);

  // ── 3. Product Colors ───────────────────────────────────────────────────────
  const colors = [
    { colorName: 'Trắng', colorCode: '#FFFFFF', sortOrder: 1, isActive: true },
    { colorName: 'Đen', colorCode: '#000000', sortOrder: 2, isActive: true },
    { colorName: 'Nâu', colorCode: '#8B4513', sortOrder: 3, isActive: true },
    { colorName: 'Vàng', colorCode: '#FFD700', sortOrder: 4, isActive: true },
    { colorName: 'Xanh lá', colorCode: '#228B22', sortOrder: 5, isActive: true },
    { colorName: 'Xanh dương', colorCode: '#4169E1', sortOrder: 6, isActive: true },
    { colorName: 'Đỏ', colorCode: '#DC143C', sortOrder: 7, isActive: true },
    { colorName: 'Xám', colorCode: '#808080', sortOrder: 8, isActive: true },
    { colorName: 'Kem', colorCode: '#FFFDD0', sortOrder: 9, isActive: true },
    { colorName: 'Hồng', colorCode: '#FFB6C1', sortOrder: 10, isActive: true },
    { colorName: 'Cam', colorCode: '#FF8C00', sortOrder: 11, isActive: true },
    { colorName: 'Tím', colorCode: '#9370DB', sortOrder: 12, isActive: true },
  ];

  const colorIds: string[] = [];
  for (const color of colors) {
    const existing = await prisma.productColor.findFirst({ where: { colorName: color.colorName } });
    if (!existing) {
      const created = await prisma.productColor.create({ data: color });
      colorIds.push(created.id);
    } else {
      colorIds.push(existing.id);
    }
  }
  console.log(`✅ Created ${colors.length} product colors`);

  // ── 4. Products ──────────────────────────────────────────────────────────────
  const products = [
    { name: 'Sofa Vải 3 Chỗ CAO CẤP', slug: 'sofa-vai-3-cho-cao-cap', categorySlug: 'sofa', sku: 'SOF001', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Sofa vải cao cấp 3 chỗ ngồi, thiết kế hiện đại' },
    { name: 'Sofa Giường Gỗ Tự Nhiên', slug: 'sofa-giuong-go-tu-nhien', categorySlug: 'sofa-giuong', sku: 'SOFB001', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Sofa giường đa năng gỗ tự nhiên' },
    { name: 'Bàn Ăn 6 Người Gỗ Sồi', slug: 'ban-an-6-nguoi-go-soi', categorySlug: 'ban-an', sku: 'DINT001', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Bàn ăn 6 người bằng gỗ sồi tự nhiên' },
    { name: 'Giường Ngủ King Size 1m8', slug: 'giuong-ngu-king-size-1m8', categorySlug: 'giuong-ngu', sku: 'BED001', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Giường ngủ king size 1m8, da PU cao cấp' },
    { name: 'Tủ Quần Áo 3 Cánh Gỗ MDF', slug: 'tu-quan-ao-3-canh-go-mdf', categorySlug: 'tu-quan-ao', sku: 'WAR001', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Tủ quần áo 3 cánh gỗ MDF, phủ melamine' },
    { name: 'Kệ Sách 5 Tầng Mini', slug: 'ke-sach-5-tang-mini', categorySlug: 'ke-sach', sku: 'BOOK001', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Kệ sách 5 tầng mini, treo tường tiện lợi' },
    { name: 'Bàn Làm Việc IT 1m2', slug: 'ban-lam-viec-it-1m2', categorySlug: 'ban-lam-viec', sku: 'DESK001', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Bàn làm việc IT 1m2, có ngăn kéo' },
    { name: 'Ghế Văn Phòng Ergonomic', slug: 'ghe-van-phong-ergonomic', categorySlug: 'ghe-van-phong', sku: 'OFC001', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Ghế văn phòng ergonomic, lưới thoáng khí' },
    { name: 'Tủ Bếp Chữ L Hiện Đại', slug: 'tu-bep-chu-l-hien-dai', categorySlug: 'tu-bep', sku: 'KIT001', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Tủ bếp chữ L hiện đại, gỗ MDF phủ acrylic' },
    { name: 'Kệ Trưng Bày 4 Tầng', slug: 'ke-trung-bay-4-tang', categorySlug: 'ke-trung-bay', sku: 'DISP001', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Kệ trưng bày 4 tầng, treo tường' },
    { name: 'Sofa Nỉ 2 Chỗ Cao Cấp', slug: 'sofa-ni-2-cho-cao-cap', categorySlug: 'sofa', sku: 'SOF002', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Sofa nỉ 2 chỗ cao cấp, kiểu dáng tối giản' },
    { name: 'Bàn Ăn Gỗ Tràm 4 Người', slug: 'ban-an-go-tram-4-nguoi', categorySlug: 'ban-an', sku: 'DINT002', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Bàn ăn 4 người bằng gỗ tràm tự nhiên' },
    { name: 'Giường Ngủ Đôi 1m6', slug: 'giuong-ngu-doi-1m6', categorySlug: 'giuong-ngu', sku: 'BED002', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Giường ngủ đôi 1m6, khung gỗ tự nhiên' },
    { name: 'Tủ Quần Áo Trượt 2 Cánh', slug: 'tu-quan-ao-truot-2-canh', categorySlug: 'tu-quan-ao', sku: 'WAR002', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Tủ quần áo trượt 2 cánh, cửa kính' },
    { name: 'Kệ Sách Đứng 6 Tầng', slug: 'ke-sach-dung-6-tang', categorySlug: 'ke-sach', sku: 'BOOK002', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Kệ sách đứng 6 tầng, gỗ công nghiệp' },
    { name: 'Bàn Làm Việc Lớn 1m6 Có Hộc', slug: 'ban-lam-viec-lon-1m6-co-hoc', categorySlug: 'ban-lam-viec', sku: 'DESK002', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Bàn làm việc lớn 1m6, có hộc tủ' },
    { name: 'Ghế Văn Phòng Xoay Cao Cấp', slug: 'ghe-van-phong-xoay-cao-cap', categorySlug: 'ghe-van-phong', sku: 'OFC002', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Ghế văn phòng xoay cao cấp, da thật' },
    { name: 'Sofa Giường Mini 1m5', slug: 'sofa-giuong-mini-1m5', categorySlug: 'sofa-giuong', sku: 'SOFB002', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Sofa giường mini 1m5, đa năng' },
    { name: 'Kệ Trưng Bày Cửa Kính', slug: 'ke-trung-bay-cua-kinh', categorySlug: 'ke-trung-bay', sku: 'DISP002', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Kệ trưng bày cửa kính, 5 tầng' },
    { name: 'Tủ Bếp Chữ I Đơn Giản', slug: 'tu-bep-chu-i-don-gian', categorySlug: 'tu-bep', sku: 'KIT002', brand: 'Nội Thất Tiện Lợi', origin: 'Việt Nam', shortDescription: 'Tủ bếp chữ I đơn giản, gỗ MDF' },
  ];

  const productIds: string[] = [];
  for (const product of products) {
    const catId = categoryIds[product.categorySlug];
    const existing = await prisma.product.findFirst({ where: { slug: product.slug } });
    if (!existing) {
      const created = await prisma.product.create({
        data: {
          name: product.name,
          slug: product.slug,
          categoryId: catId,
          sku: product.sku,
          brand: product.brand,
          origin: product.origin,
          shortDescription: product.shortDescription,
        },
      });
      productIds.push(created.id);
    } else {
      productIds.push(existing.id);
    }
  }
  console.log(`✅ Created ${products.length} products`);

  // ── 5. News Categories ─────────────────────────────────────────────────────
  const newsCats = [
    { title: 'Tin Tức Nội Thất', seName: 'tin-tuc-noi-that', summary: 'Tin tức về nội thất', sortOrder: BigInt(1), isActive: true },
    { title: 'Khuyến Mãi', seName: 'khuyen-mai', summary: 'Các chương trình khuyến mãi', sortOrder: BigInt(2), isActive: true },
    { title: 'Hướng Dẫn', seName: 'huong-dan', summary: 'Hướng dẫn sử dụng và bảo quản', sortOrder: BigInt(3), isActive: true },
    { title: 'Phong Cách', seName: 'phong-cach', summary: 'Phong cách thiết kế nội thất', sortOrder: BigInt(4), isActive: true },
    { title: 'Tin Tức Chung', seName: 'tin-tuc-chung', summary: 'Tin tức chung', sortOrder: BigInt(5), isActive: true },
  ];

  for (const nc of newsCats) {
    const existing = await prisma.newsCategory.findFirst({ where: { seName: nc.seName } });
    if (!existing) {
      await prisma.newsCategory.create({ data: nc });
    }
  }
  console.log(`✅ Created ${newsCats.length} news categories`);

  // ── 6. News ────────────────────────────────────────────────────────────────
  const newsItems = [
    { title: 'Xu Hướng Nội Thất 2026', seName: 'xu-huong-noi-that-2026', summary: 'Khám phá những xu hướng nội thất hot nhất năm 2026', content: '<p>Nội thất tối giản, gam màu trung tính và vật liệu tự nhiên là xu hướng chủ đạo trong năm 2026.</p>', isPublished: true },
    { title: 'Khuyến Mãi Mùa Hè 30%', seName: 'khuyen-mai-mua-he-30', summary: 'Giảm giá mùa hè lên đến 30% cho tất cả sản phẩm', content: '<p>Chương trình khuyến mãi mùa hè với ưu đãi lên đến 30%.</p>', isPublished: true },
    { title: 'Cách Bảo Quản Sofa Da', seName: 'cach-bao-quan-sofa-da', summary: 'Hướng dẫn cách bảo quản sofa da bền đẹp', content: '<p>Vệ sinh và bảo quản sofa da đúng cách để kéo dài tuổi thọ.</p>', isPublished: true },
    { title: 'Phong Cách Scandinavian', seName: 'phong-cach-scandinavian', summary: 'Khám phá phong cách nội thất Scandinavian', content: '<p>Scandinavian - phong cách tối giản, tiện nghi và gần gũi thiên nhiên.</p>', isPublished: true },
    { title: 'Tết Nguyên Đán - Quà Tặng Ý Nghĩa', seName: 'tet-nguyen-dan-qua-tang', summary: 'Gợi ý quà tặng Tết ý nghĩa cho gia đình', content: '<p>Mua sắm Tết với những ưu đãi hấp dẫn từ Nội Thất Tiện Lợi.</p>', isPublished: true },
  ];

  for (const news of newsItems) {
    const existing = await prisma.newsContent.findFirst({ where: { seName: news.seName } });
    if (!existing) {
      await prisma.newsContent.create({ data: news });
    }
  }
  console.log(`✅ Created ${newsItems.length} news`);

  // ── 7. Sliders ──────────────────────────────────────────────────────────────
  const sliderData = [
    { title: 'Slider Trang Chủ', image: '/images/slider/home-1.jpg', link: null, content: 'Chào mừng đến với Nội Thất Tiện Lợi', sortOrder: 1, isActive: true },
  ];

  for (const slider of sliderData) {
    const existing = await prisma.slider.findFirst({ where: { title: slider.title } });
    if (!existing) {
      await prisma.slider.create({ data: slider });
    }
  }
  console.log(`✅ Created ${sliderData.length} sliders`);

  // ── 8. Shipping Providers ───────────────────────────────────────────────────
  const shippingProviders = [
    { code: 'GHN', name: 'Giao Hàng Nhanh', phone: '1900 8888', website: 'https://ghn.vn', serviceTypes: ['EXPRESS'], isActive: true },
    { code: 'GHTK', name: 'Giao Hàng Tiết Kiệm', phone: '1900 8888', website: 'https://ghtk.vn', serviceTypes: ['ECONOMY'], isActive: true },
    { code: 'VTK', name: 'Viettel Post', phone: '1900 8888', website: 'https://viettelpost.vn', serviceTypes: ['EXPRESS'], isActive: true },
    { code: 'NJV', name: 'Ninja Van', phone: '1900 8888', website: 'https://ninjavan.vn', serviceTypes: ['ECONOMY'], isActive: true },
  ];

  for (const sp of shippingProviders) {
    const existing = await prisma.shippingProvider.findFirst({ where: { code: sp.code } });
    if (!existing) {
      await prisma.shippingProvider.create({ data: sp });
    }
  }
  console.log(`✅ Created ${shippingProviders.length} shipping providers`);

  // ── 9. Warehouses ──────────────────────────────────────────────────────────
  const warehouses = [
    { code: 'WH-HCM-01', name: 'Kho Hồ Chí Minh', contactPhone: '0901 234 567', addressLine: '123 Đại lộ Bình Dương', provinceName: 'Hồ Chí Minh', districtName: 'Thủ Đức', wardName: 'Linh Trung', isActive: true },
    { code: 'WH-HN-01', name: 'Kho Hà Nội', contactPhone: '0902 345 678', addressLine: '456 Đường Giải Phóng', provinceName: 'Hà Nội', districtName: 'Hoàng Mai', wardName: 'Định Công', isActive: true },
    { code: 'WH-DN-01', name: 'Kho Đà Nẵng', contactPhone: '0903 456 789', addressLine: '789 Đường Nguyễn Văn Linh', provinceName: 'Đà Nẵng', districtName: 'Hải Châu', wardName: 'Hải Châu 1', isActive: true },
  ];

  for (const wh of warehouses) {
    const existing = await prisma.warehouse.findFirst({ where: { code: wh.code } });
    if (!existing) {
      await prisma.warehouse.create({ data: wh });
    }
  }
  console.log(`✅ Created ${warehouses.length} warehouses`);

  // ── 10. Pages ──────────────────────────────────────────────────────────────
  const pages = [
    { title: 'Giới Thiệu', pageName: 'Gioi Thieu', body: '<p>Công ty Nội Thất Tiện Lợi - Chuyên cung cấp các sản phẩm nội thất chất lượng cao.</p>', isActive: true, isShowHome: true, sortOrder: 1 },
    { title: 'Chính Sách Vận Chuyển', pageName: 'Chinh Sach Van Chuyen', body: '<p>Chính sách vận chuyển của Nội Thất Tiện Lợi.</p>', isActive: true, isShowHome: false, sortOrder: 2 },
    { title: 'Chính Sách Đổi Trả', pageName: 'Chinh Sach Doi Tra', body: '<p>Chính sách đổi trả hàng của Nội Thất Tiện Lợi.</p>', isActive: true, isShowHome: false, sortOrder: 3 },
    { title: 'Hướng Dẫn Mua Hàng', pageName: 'Huong Dan Mua Hang', body: '<p>Hướng dẫn mua hàng tại Nội Thất Tiện Lợi.</p>', isActive: true, isShowHome: false, sortOrder: 4 },
    { title: 'Liên Hệ', pageName: 'Lien He', body: '<p>Liên hệ với Nội Thất Tiện Lợi.</p>', isActive: true, isShowHome: true, sortOrder: 5 },
  ];

  for (const page of pages) {
    const existing = await prisma.page.findFirst({ where: { pageName: page.pageName } });
    if (!existing) {
      await prisma.page.create({ data: page });
    }
  }
  console.log(`✅ Created ${pages.length} pages`);

  // ── 11. System Configs ─────────────────────────────────────────────────────
  // SystemConfig table có vấn đề với NULL createdAt, skip cho đến khi fix schema
  console.log('⏭️ Skipped system configs (needs schema fix)');

  // ── 12. Menu Links ──────────────────────────────────────────────────────────
  const menuLinks = [
    { title: 'Trang Chủ', slug: '/', sortOrder: 1 },
    { title: 'Sản Phẩm', slug: '/san-pham', sortOrder: 2 },
    { title: 'Tin Tức', slug: '/tin-tuc', sortOrder: 3 },
    { title: 'Liên Hệ', slug: '/lien-he', sortOrder: 4 },
  ];

  for (const menu of menuLinks) {
    const existing = await prisma.menuLink.findFirst({ where: { slug: menu.slug } });
    if (!existing) {
      await prisma.menuLink.create({ data: menu });
    }
  }
  console.log(`✅ Created ${menuLinks.length} menu links`);

  console.log('');
  console.log('🎉 Master data seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
