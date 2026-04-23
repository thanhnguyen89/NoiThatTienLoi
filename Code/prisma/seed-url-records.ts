import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedUrlRecordReference() {
  console.log('🌱 Seeding UrlRecordReference...');

  const urlRecordReferences = [
    // Product - Sản phẩm (URL: /san-pham/[slug])
    {
      entityName: 'Product',
      controllerName: 'ProductController',
      actionName: 'Detail',
      isActive: true,
      createdBy: 'system',
    },

    // Category - Danh mục sản phẩm (URL: /danh-muc/[slug])
    {
      entityName: 'Category',
      controllerName: 'CategoryController',
      actionName: 'Index',
      isActive: true,
      createdBy: 'system',
    },

    // News - Tin tức (URL: /tin-tuc/[slug])
    {
      entityName: 'News',
      controllerName: 'NewsController',
      actionName: 'Detail',
      isActive: true,
      createdBy: 'system',
    },

    // NewsCategory - Danh mục tin tức (URL: /tin-tuc/danh-muc/[slug])
    {
      entityName: 'NewsCategory',
      controllerName: 'NewsCategoryController',
      actionName: 'Index',
      isActive: true,
      createdBy: 'system',
    },

    // Page - Trang tĩnh (URL: /[slug] như /gioi-thieu, /lien-he)
    {
      entityName: 'Page',
      controllerName: 'PageController',
      actionName: 'View',
      isActive: true,
      createdBy: 'system',
    },

    // Blog - Blog/Bài viết (URL: /blog/[slug])
    {
      entityName: 'Blog',
      controllerName: 'BlogController',
      actionName: 'Detail',
      isActive: true,
      createdBy: 'system',
    },

    // BlogCategory - Danh mục blog (URL: /blog/danh-muc/[slug])
    {
      entityName: 'BlogCategory',
      controllerName: 'BlogCategoryController',
      actionName: 'Index',
      isActive: true,
      createdBy: 'system',
    },

    // Brand - Thương hiệu (URL: /thuong-hieu/[slug])
    {
      entityName: 'Brand',
      controllerName: 'BrandController',
      actionName: 'Index',
      isActive: true,
      createdBy: 'system',
    },

    // Collection - Bộ sưu tập (URL: /bo-suu-tap/[slug])
    {
      entityName: 'Collection',
      controllerName: 'CollectionController',
      actionName: 'Index',
      isActive: true,
      createdBy: 'system',
    },

    // Promotion - Khuyến mãi (URL: /khuyen-mai/[slug])
    {
      entityName: 'Promotion',
      controllerName: 'PromotionController',
      actionName: 'Detail',
      isActive: true,
      createdBy: 'system',
    },

    // Video - Video (URL: /video/[slug])
    {
      entityName: 'Video',
      controllerName: 'VideoController',
      actionName: 'Detail',
      isActive: true,
      createdBy: 'system',
    },

    // Gallery - Thư viện ảnh (URL: /thu-vien/[slug])
    {
      entityName: 'Gallery',
      controllerName: 'GalleryController',
      actionName: 'View',
      isActive: true,
      createdBy: 'system',
    },

    // FlashSale - Flash sale (URL: /flash-sale hoặc /danh-muc/flash-sale)
    {
      entityName: 'FlashSale',
      controllerName: 'FlashSaleController',
      actionName: 'Index',
      isActive: true,
      createdBy: 'system',
    },

    // HomePage - Trang chủ (URL: /)
    {
      entityName: 'HomePage',
      controllerName: 'HomeController',
      actionName: 'Index',
      isActive: true,
      createdBy: 'system',
    },

    // Contact - Liên hệ (URL: /lien-he)
    {
      entityName: 'Contact',
      controllerName: 'ContactController',
      actionName: 'Index',
      isActive: true,
      createdBy: 'system',
    },

    // About - Giới thiệu (URL: /gioi-thieu)
    {
      entityName: 'About',
      controllerName: 'AboutController',
      actionName: 'Index',
      isActive: true,
      createdBy: 'system',
    },

    // Cart - Giỏ hàng (URL: /gio-hang)
    {
      entityName: 'Cart',
      controllerName: 'CartController',
      actionName: 'Index',
      isActive: true,
      createdBy: 'system',
    },

    // Checkout - Thanh toán (URL: /thanh-toan)
    {
      entityName: 'Checkout',
      controllerName: 'CheckoutController',
      actionName: 'Index',
      isActive: true,
      createdBy: 'system',
    },

    // Account - Tài khoản (URL: /tai-khoan)
    {
      entityName: 'Account',
      controllerName: 'AccountController',
      actionName: 'Index',
      isActive: true,
      createdBy: 'system',
    },

    // Order - Đơn hàng (URL: /don-hang/[id])
    {
      entityName: 'Order',
      controllerName: 'OrderController',
      actionName: 'Detail',
      isActive: true,
      createdBy: 'system',
    },
  ];

  for (const ref of urlRecordReferences) {
    await prisma.urlRecordReference.upsert({
      where: {
        entityName_controllerName_actionName: {
          entityName: ref.entityName,
          controllerName: ref.controllerName,
          actionName: ref.actionName,
        },
      },
      update: {
        isActive: ref.isActive,
        updatedAt: new Date(),
        updatedBy: 'system',
      },
      create: ref,
    });
  }

  console.log(`✅ Created/Updated ${urlRecordReferences.length} UrlRecordReferences`);
}

async function seedUrlRecords() {
  console.log('🌱 Seeding UrlRecord for Products and Categories...');

  // Lấy tất cả products
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    select: { id: true, slug: true, isActive: true },
  });

  // Tạo UrlRecord cho products
  for (const product of products) {
    await prisma.urlRecord.upsert({
      where: { slug: product.slug },
      update: {
        entityName: 'Product',
        isActive: product.isActive,
        updatedAt: new Date(),
      },
      create: {
        entityId: null, // entityId là BigInt nhưng Product.id là CUID string, nên để null
        entityName: 'Product',
        slug: product.slug,
        isActive: product.isActive,
        createdBy: 'system',
      },
    });
  }

  console.log(`✅ Created ${products.length} UrlRecords for Products`);

  // Lấy tất cả categories
  const categories = await prisma.category.findMany({
    where: { isDeleted: false },
    select: { id: true, slug: true, isActive: true },
  });

  // Tạo UrlRecord cho categories
  for (const category of categories) {
    await prisma.urlRecord.upsert({
      where: { slug: category.slug },
      update: {
        entityName: 'Category',
        isActive: category.isActive,
        updatedAt: new Date(),
      },
      create: {
        entityId: null, // entityId là BigInt nhưng Category.id là CUID string
        entityName: 'Category',
        slug: category.slug,
        isActive: category.isActive,
        createdBy: 'system',
      },
    });
  }

  console.log(`✅ Created ${categories.length} UrlRecords for Categories`);

  // Tạo một số URL tĩnh quan trọng cho Next.js site
  const staticPages = [
    { slug: '', entityName: 'Page', name: 'Trang chủ' },
    { slug: 'lien-he', entityName: 'Page', name: 'Liên hệ' },
    { slug: 'gioi-thieu', entityName: 'Page', name: 'Giới thiệu' },
    { slug: 'chinh-sach-bao-hanh', entityName: 'Page', name: 'Chính sách bảo hành' },
    { slug: 'chinh-sach-doi-tra', entityName: 'Page', name: 'Chính sách đổi trả' },
    { slug: 'huong-dan-mua-hang', entityName: 'Page', name: 'Hướng dẫn mua hàng' },
    { slug: 'chinh-sach-van-chuyen', entityName: 'Page', name: 'Chính sách vận chuyển' },
    { slug: 'chinh-sach-thanh-toan', entityName: 'Page', name: 'Chính sách thanh toán' },
    { slug: 'dieu-khoan-su-dung', entityName: 'Page', name: 'Điều khoản sử dụng' },
    { slug: 'chinh-sach-bao-mat', entityName: 'Page', name: 'Chính sách bảo mật' },
    { slug: 'gio-hang', entityName: 'Page', name: 'Giỏ hàng' },
    { slug: 'thanh-toan', entityName: 'Page', name: 'Thanh toán' },
    { slug: 'tai-khoan', entityName: 'Page', name: 'Tài khoản' },
  ];

  for (const page of staticPages) {
    await prisma.urlRecord.upsert({
      where: { slug: page.slug },
      update: {
        entityName: page.entityName,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        entityName: page.entityName,
        slug: page.slug,
        isActive: true,
        createdBy: 'system',
      },
    });
  }

  console.log(`✅ Created ${staticPages.length} static page UrlRecords`);

  // Tạo một số URL redirect examples (slug cũ -> slug mới)
  const redirectExamples = [
    {
      slug: 'old-san-pham',
      entityName: 'Product',
      slugRedirect: 'san-pham',
      isRedirect: true,
      errorCode: '301',
      isActive: true,
    },
    {
      slug: 'lienhe',
      entityName: 'Contact',
      slugRedirect: 'lien-he',
      isRedirect: true,
      errorCode: '301',
      isActive: true,
    },
    {
      slug: 'gioithieu',
      entityName: 'About',
      slugRedirect: 'gioi-thieu',
      isRedirect: true,
      errorCode: '301',
      isActive: true,
    },
    {
      slug: 'old-category',
      entityName: 'Category',
      slugRedirect: 'giuong-sat',
      isRedirect: true,
      errorCode: '302',
      isActive: true,
    },
    {
      slug: 'deleted-page',
      entityName: 'Page',
      slugRedirect: null,
      isRedirect: false,
      errorCode: '404',
      isActive: false,
    },
    {
      slug: 'temp-redirect',
      entityName: 'Page',
      slugRedirect: 'gioi-thieu',
      isRedirect: true,
      errorCode: '302',
      isActive: true,
    },
  ];

  for (const redirect of redirectExamples) {
    await prisma.urlRecord.upsert({
      where: { slug: redirect.slug },
      update: {
        slugRedirect: redirect.slugRedirect,
        isRedirect: redirect.isRedirect,
        errorCode: redirect.errorCode,
        isActive: redirect.isActive,
        updatedAt: new Date(),
      },
      create: {
        entityName: redirect.entityName,
        slug: redirect.slug,
        slugRedirect: redirect.slugRedirect,
        isRedirect: redirect.isRedirect,
        errorCode: redirect.errorCode,
        isActive: redirect.isActive,
        createdBy: 'system',
      },
    });
  }

  console.log(`✅ Created ${redirectExamples.length} redirect example UrlRecords`);
}

async function main() {
  try {
    await seedUrlRecordReference();
    await seedUrlRecords();
    console.log('🎉 All URL records seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding URL records:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
