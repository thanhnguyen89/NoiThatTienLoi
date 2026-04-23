import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Checking products with flash sale data...\n');

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        include: {
          productSize: true,
          productColor: true,
        },
      },
    },
    orderBy: {
      soldCount: 'desc',
    },
    take: 10,
  });

  console.log(`Found ${products.length} active products\n`);
  console.log('━'.repeat(120));

  for (const product of products) {
    const variant = product.variants.find(v => v.isDefault) || product.variants[0];

    const salePrice = variant ? Number(variant.salePrice) : 0;
    const promoPrice = variant?.promoPrice ? Number(variant.promoPrice) : null;
    const price = promoPrice || salePrice;
    const comparePrice = promoPrice ? salePrice : null;
    const discountPercent = comparePrice ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

    const progressPercent = product.flashSaleTarget
      ? Math.round((product.soldCount / product.flashSaleTarget) * 100)
      : 0;

    console.log(`\n📦 ${product.name}`);
    console.log(`   SKU: ${product.sku} | Brand: ${product.brand}`);
    console.log(`   Category: ${product.category.name}`);
    console.log(`   💰 Price: ${price.toLocaleString('vi-VN')}₫ ${comparePrice ? `(was ${comparePrice.toLocaleString('vi-VN')}₫)` : ''}`);

    if (discountPercent > 0) {
      console.log(`   🏷️  Discount: -${discountPercent}%`);
    }

    console.log(`   ⭐ Rating: ${product.avgRating.toFixed(1)} (${product.reviewCount} reviews)`);
    console.log(`   📊 Sold: ${product.soldCount} | Views: ${product.viewCount}`);

    if (product.isFlashSale && product.flashSaleTarget) {
      console.log(`   ⚡ Flash Sale: ${product.soldCount}/${product.flashSaleTarget} (${progressPercent}%)`);
      console.log(`   Progress: ${'█'.repeat(Math.floor(progressPercent / 5))}${'░'.repeat(20 - Math.floor(progressPercent / 5))} ${progressPercent}%`);
    }

    console.log(`   🏷️  Featured: ${product.isFeatured ? '✓' : '✗'} | Flash Sale: ${product.isFlashSale ? '✓' : '✗'}`);
    console.log(`   🔢 Variants: ${product.variants.length}`);
  }

  console.log('\n' + '━'.repeat(120));
  console.log('\n✅ Check completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
