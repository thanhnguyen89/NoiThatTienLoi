const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWarehouseData() {
  try {
    console.log('🔍 Checking warehouse data...\n');

    // Count total warehouses
    const total = await prisma.warehouse.count();
    console.log(`📊 Total warehouses: ${total}`);

    // Count by isDeleted
    const notDeleted = await prisma.warehouse.count({ where: { isDeleted: false } });
    const deleted = await prisma.warehouse.count({ where: { isDeleted: true } });
    console.log(`✅ Not deleted: ${notDeleted}`);
    console.log(`🗑️  Deleted: ${deleted}\n`);

    // Get first 5 warehouses
    const warehouses = await prisma.warehouse.findMany({
      where: { isDeleted: false },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    if (warehouses.length > 0) {
      console.log('📦 Sample warehouse data:');
      warehouses.forEach((w, idx) => {
        console.log(`\n${idx + 1}. ${w.name}`);
        console.log(`   ID: ${w.id}`);
        console.log(`   Code: ${w.code || '—'}`);
        console.log(`   Address: ${w.addressLine}`);
        console.log(`   Province: ${w.provinceName || '—'}`);
        console.log(`   Active: ${w.isActive}`);
        console.log(`   Deleted: ${w.isDeleted}`);
      });
    } else {
      console.log('⚠️  No warehouses found in database!');
    }

  } catch (error) {
    console.error('❌ Error checking warehouse data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWarehouseData();
