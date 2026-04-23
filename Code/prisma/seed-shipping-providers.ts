import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚚 Seeding shipping providers...');

  const providers = [
    {
      code: 'GHN',
      name: 'Giao Hàng Nhanh',
      phone: '1900-8899',
      website: 'https://ghn.vn',
      note: 'Đối tác tin cậy từ năm 2020\n- Hỗ trợ COD, hoàn tiền nhanh\n- API tích hợp tốt\n- Giá cạnh tranh cho đơn hàng nội thành',
      isActive: true,
      serviceTypes: ['standard', 'express', 'same_day'],
      vehicles: ['motorbike', 'van', 'truck'],
    },
    {
      code: 'GHTK',
      name: 'Giao Hàng Tiết Kiệm',
      phone: '1900-2468',
      website: 'https://giaohangtietkiem.vn',
      note: 'Đối tác từ năm 2021\n- Hỗ trợ COD\n- Giá rẻ cho đơn hàng nhẹ\n- Phạm vi giao hàng rộng',
      isActive: true,
      serviceTypes: ['standard', 'express'],
      vehicles: ['motorbike', 'van'],
    },
    {
      code: 'VTP',
      name: 'Viettel Post',
      phone: '1900-8095',
      website: 'https://viettelpost.vn',
      note: 'Đối tác từ năm 2021\n- Mạng lưới rộng khắp\n- Hỗ trợ giao hàng đến xa\n- COD và thanh toán online',
      isActive: true,
      serviceTypes: ['standard', 'express', 'same_day', 'scheduled'],
      vehicles: ['motorbike', 'van', 'truck'],
    },
    {
      code: 'GRAB',
      name: 'GrabExpress',
      phone: '028-3838-3838',
      website: 'https://grab.com/vn',
      note: 'Dịch vụ giao hàng nhanh trong thành phố\n- Giao trong 1-2 giờ\n- Phù hợp đơn nội thành\n- Theo dõi realtime tốt',
      isActive: true,
      serviceTypes: ['standard', 'express', 'same_day'],
      vehicles: ['motorbike'],
    },
    {
      code: 'VNPOST',
      name: 'Bưu điện Việt Nam',
      phone: '1900-5408',
      website: 'https://vnpost.vn',
      note: 'Mạng lưới bưu cục rộng nhất cả nước\n- Phủ đến tận xã/phường\n- Dịch vụ bảo đảm\n- Phù hợp vùng sâu vùng xa',
      isActive: false,
      serviceTypes: ['standard'],
      vehicles: ['motorbike', 'van', 'truck'],
    },
  ];

  for (const p of providers) {
    await prisma.shippingProvider.upsert({
      where: { code: p.code },
      update: { isDeleted: false },
      create: p,
    });
    console.log(`  ✅ ${p.code} - ${p.name} (${p.isActive ? 'active' : 'inactive'})`);
  }

  console.log('');
  console.log('🎉 Shipping providers seeded!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
