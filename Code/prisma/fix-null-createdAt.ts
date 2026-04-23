import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing NULL createdAt values...');

  const now = new Date();

  // Fix catalog_embed_code
  const embedCodes = await prisma.$executeRaw`
    UPDATE catalog_embed_code
    SET "createdAt" = ${now}
    WHERE "createdAt" IS NULL
  `;
  console.log(`✅ Fixed ${embedCodes} catalog_embed_code records`);

  // Fix menu
  const menus = await prisma.$executeRaw`
    UPDATE menu
    SET "createdAt" = ${now}
    WHERE "createdAt" IS NULL
  `;
  console.log(`✅ Fixed ${menus} menu records`);

  // Fix news_category
  const newsCategories = await prisma.$executeRaw`
    UPDATE news_category
    SET "createdAt" = ${now}
    WHERE "createdAt" IS NULL
  `;
  console.log(`✅ Fixed ${newsCategories} news_category records`);

  // Fix news_content
  const newsContent = await prisma.$executeRaw`
    UPDATE news_content
    SET "createdAt" = ${now}
    WHERE "createdAt" IS NULL
  `;
  console.log(`✅ Fixed ${newsContent} news_content records`);

  // Fix page
  const pages = await prisma.$executeRaw`
    UPDATE page
    SET "createdAt" = ${now}
    WHERE "createdAt" IS NULL
  `;
  console.log(`✅ Fixed ${pages} page records`);

  // Fix system_config
  const systemConfigs = await prisma.$executeRaw`
    UPDATE system_config
    SET "createdAt" = ${now}
    WHERE "createdAt" IS NULL
  `;
  console.log(`✅ Fixed ${systemConfigs} system_config records`);

  console.log('');
  console.log('🎉 All NULL createdAt values fixed!');
}

main()
  .catch((e) => {
    console.error('❌ Fix failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
