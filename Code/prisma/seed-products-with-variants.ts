import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding products with variants and realistic data...');

  // Lấy categories, sizes, colors
  const categories = await prisma.category.findMany();
  const sizes = await prisma.productSize.findMany();
  const colors = await prisma.productColor.findMany();

  if (!categories.length || !sizes.length || !colors.length) {
    console.log('⚠️  Please run seed-master-data.ts first!');
    return;
  }

  // Helper function để random số
  const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);
  const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

  // Dữ liệu sản phẩm chi tiết như trong hình
  const productsData = [
    {
      name: 'Giường tầng thông minh khung sắt có bàn học Tiện Lợi - GTS001222',
      slug: 'giuong-tang-thong-minh-khung-sat-co-ban-hoc-tien-loi-gts001222',
      categorySlug: 'giuong-ngu',
      brand: 'CeraVe',
      sku: 'GTS001',
      shortDescription: 'Giường tầng thông minh khung sắt có bàn học, tiết kiệm không gian cho phòng ngủ nhỏ',
      purchasePrice: 5600000,
      salePrice: 13490000,
      promoPrice: 8490000, // -38%
      soldCount: 2100,
      avgRating: 4.7,
      reviewCount: 89,
      isFlashSale: false,
      isFeatured: true,
      flashSaleTarget: 3000,
      image: 'https://via.placeholder.com/300x300/8B4513/FFFFFF?text=Giuong+Tang',
    },
    {
      name: 'Ghế xếp đầy đủ khung inox GX14112',
      slug: 'ghe-xep-day-du-khung-inox-gx14112',
      categorySlug: 'ghe-van-phong',
      brand: 'Giường xếp',
      sku: 'GX14',
      shortDescription: 'Ghế xếp đầy đủ khung inox, gấp gọn tiện lợi',
      purchasePrice: 600000,
      salePrice: 1300000,
      promoPrice: 920000, // -29%
      soldCount: 1500,
      avgRating: 4.9,
      reviewCount: 116,
      isFlashSale: true,
      isFeatured: true,
      flashSaleTarget: 3000,
      image: 'https://via.placeholder.com/300x300/4169E1/FFFFFF?text=Ghe+Xep',
    },
    {
      name: 'Bộ võng xếp inox Cỡ đại lớn nhất',
      slug: 'bo-vong-xep-inox-co-dai-lon-nhat',
      categorySlug: 'ghe-van-phong',
      brand: 'Võng xếp',
      sku: 'VX01',
      shortDescription: 'Bộ võng xếp inox cỡ đại, chịu tải tốt',
      purchasePrice: 1200000,
      salePrice: 2748000,
      promoPrice: 1748000, // -36%
      soldCount: 1400,
      avgRating: 4.9,
      reviewCount: 13,
      isFlashSale: true,
      isFeatured: false,
      flashSaleTarget: 7800,
      image: 'https://via.placeholder.com/300x300/228B22/FFFFFF?text=Vong+Xep',
    },
    {
      name: 'Giường sắt mỹ nghệ Tiến Lợi 01 1mx2m minh qui',
      slug: 'giuong-sat-my-nghe-tien-loi-01-1mx2m-minh-qui',
      categorySlug: 'giuong-ngu',
      brand: 'Giường sắt',
      sku: 'GS01',
      shortDescription: 'Giường sắt mỹ nghệ Tiến Lợi 01 kích thước 1mx2m',
      purchasePrice: 1100000,
      salePrice: 2220000,
      promoPrice: 1590000, // -28%
      soldCount: 1500,
      avgRating: 4.8,
      reviewCount: 148,
      isFlashSale: true,
      isFeatured: true,
      flashSaleTarget: 2550,
      image: 'https://via.placeholder.com/300x300/000000/FFFFFF?text=Giuong+Sat',
    },
    {
      name: 'Giường tầng thông minh khung sắt hiện đại Tiến Lợi - GTS06012',
      slug: 'giuong-tang-thong-minh-khung-sat-hien-dai-tien-loi-gts06012',
      categorySlug: 'giuong-ngu',
      brand: 'Innisfree',
      sku: 'GTS060',
      shortDescription: 'Giường tầng thông minh khung sắt hiện đại Tiến Lợi - GTS060',
      purchasePrice: 3500000,
      salePrice: 10290000,
      promoPrice: 5290000, // -49%
      soldCount: 1800,
      avgRating: 4.6,
      reviewCount: 234,
      isFlashSale: false,
      isFeatured: true,
      flashSaleTarget: 1950,
      image: 'https://via.placeholder.com/300x300/FFFFFF/000000?text=Giuong+Tang+060',
    },
    {
      name: 'Sofa Vải 3 Chỗ CAO CẤP tốt nhất',
      slug: 'sofa-vai-3-cho-cao-cap-tot-nhat',
      categorySlug: 'sofa',
      brand: 'Nội Thất Tiện Lợi',
      sku: 'SOF001',
      shortDescription: 'Sofa vải cao cấp 3 chỗ ngồi, thiết kế hiện đại',
      purchasePrice: 4000000,
      salePrice: 9500000,
      promoPrice: 6500000,
      soldCount: 850,
      avgRating: 4.8,
      reviewCount: 45,
      isFlashSale: false,
      isFeatured: true,
      flashSaleTarget: 1200,
      image: 'https://via.placeholder.com/300x300/8B4513/FFFFFF?text=Sofa+3+Cho',
    },
    {
      name: 'Bàn Ăn 6 Người Gỗ Sồi tốt nhất',
      slug: 'ban-an-6-nguoi-go-soi-tot-nhat',
      categorySlug: 'ban-an',
      brand: 'Nội Thất Tiện Lợi',
      sku: 'DINT001',
      shortDescription: 'Bàn ăn 6 người bằng gỗ sồi tự nhiên',
      purchasePrice: 3500000,
      salePrice: 8000000,
      promoPrice: 5500000,
      soldCount: 650,
      avgRating: 4.9,
      reviewCount: 78,
      isFlashSale: true,
      isFeatured: true,
      flashSaleTarget: 1000,
      image: 'https://via.placeholder.com/300x300/FFD700/000000?text=Ban+An+Go+Soi',
    },
    {
      name: 'Tủ Quần Áo 3 Cánh Gỗ MDF tốt nhất',
      slug: 'tu-quan-ao-3-canh-go-mdf tot-nhat',
      categorySlug: 'tu-quan-ao',
      brand: 'Nội Thất Tiện Lợi',
      sku: 'WAR001',
      shortDescription: 'Tủ quần áo 3 cánh gỗ MDF, phủ melamine',
      purchasePrice: 2800000,
      salePrice: 6500000,
      promoPrice: 4200000,
      soldCount: 980,
      avgRating: 4.7,
      reviewCount: 56,
      isFlashSale: false,
      isFeatured: false,
      flashSaleTarget: 1500,
      image: 'https://via.placeholder.com/300x300/808080/FFFFFF?text=Tu+Quan+Ao',
    },
  ];

  let createdCount = 0;

  for (const productData of productsData) {
    // Tìm category
    const category = categories.find((c) => c.slug === productData.categorySlug);
    if (!category) {
      console.log(`⚠️  Category ${productData.categorySlug} not found, skipping product ${productData.name}`);
      continue;
    }

    // Kiểm tra xem sản phẩm đã tồn tại chưa (check cả slug và sku)
    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { slug: productData.slug },
          { sku: productData.sku },
        ],
      },
    });

    if (existing) {
      console.log(`⏭️  Product ${productData.name} already exists (slug: ${productData.slug}, sku: ${productData.sku}), skipping`);
      continue;
    }

    // Tạo product
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        slug: productData.slug,
        categoryId: category.id,
        brand: productData.brand,
        sku: productData.sku,
        shortDescription: productData.shortDescription,
        description: `<p>${productData.shortDescription}</p><p>Sản phẩm chất lượng cao, được làm từ vật liệu cao cấp.</p>`,
        image: productData.image,
        soldCount: productData.soldCount,
        avgRating: productData.avgRating,
        reviewCount: productData.reviewCount,
        isFlashSale: productData.isFlashSale,
        isFeatured: productData.isFeatured,
        isActive: true,
        isShowHome: true,
        flashSaleTarget: productData.flashSaleTarget,
        origin: 'Việt Nam',
        unit: 'Cái',
        warrantyMonths: 12,
      },
    });

    // Tạo 2-3 variants cho mỗi sản phẩm
    const numVariants = random(2, 3);
    for (let i = 0; i < numVariants; i++) {
      const size = sizes[random(0, sizes.length - 1)];
      const color = colors[random(0, colors.length - 1)];

      // Kiểm tra variant đã tồn tại chưa
      const existingVariant = await prisma.productVariant.findFirst({
        where: {
          productId: product.id,
          productSizeId: size.id,
          productColorId: color.id,
        },
      });

      if (existingVariant) continue;

      await prisma.productVariant.create({
        data: {
          productId: product.id,
          productSizeId: size.id,
          productColorId: color.id,
          sku: `${productData.sku}-${size.sizeLabel.substring(0, 2).toUpperCase()}-${color.colorName.substring(0, 2).toUpperCase()}`,
          purchasePrice: productData.purchasePrice,
          salePrice: productData.salePrice,
          promoPrice: productData.promoPrice,
          stockQty: random(50, 200),
          reservedQty: random(0, 20),
          weightKg: randomFloat(5, 50),
          isDefault: i === 0, // Variant đầu tiên là default
          isActive: true,
        },
      });
    }

    // Tạo 2-3 hình ảnh cho product
    const numImages = random(2, 3);
    for (let i = 0; i < numImages; i++) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: `${productData.image}?v=${i + 1}`,
          alt: `${productData.name} - Hình ${i + 1}`,
          sortOrder: i,
          isThumbnail: i === 0,
          isActive: true,
        },
      });
    }

    createdCount++;
    console.log(`✅ Created product: ${productData.name}`);
  }

  console.log('');
  console.log(`🎉 Product seeding completed! Created ${createdCount} products with variants and images.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
