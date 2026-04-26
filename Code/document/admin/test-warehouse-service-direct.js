// Test warehouse repository directly
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWarehouseService() {
  try {
    console.log('🔍 Testing warehouse repository...\n');

    const listSelect = {
      id: true,
      code: true,
      name: true,
      contactName: true,
      contactPhone: true,
      provinceName: true,
      districtName: true,
      wardName: true,
      addressLine: true,
      fullAddress: true,
      latitude: true,
      longitude: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      updatedBy: true,
      isDeleted: true,
      deletedBy: true,
      deletedAt: true,
    };

    const where = { isDeleted: false };
    const page = 1;
    const pageSize = 20;

    const [result, total] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        select: {
          ...listSelect,
          _count: { select: { shipments: true } },
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.warehouse.count({ where }),
    ]);

    console.log(`📊 Total count: ${total}`);
    console.log(`📦 Returned: ${result.length}\n`);

    if (result.length > 0) {
      console.log('✅ First warehouse data:');
      console.log(JSON.stringify(result[0], null, 2));
    } else {
      console.log('⚠️  No warehouses returned!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWarehouseService();
