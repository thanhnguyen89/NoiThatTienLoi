import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────
function dec(n: number) {
  return n;
}

function rndInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rndDec(min: number, max: number, decimals = 2) {
  const v = Math.random() * (max - min) + min;
  return parseFloat(v.toFixed(decimals));
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

async function main() {
  console.log('🌱 Seeding order system data...\n');

  // ── 0. Xoá dữ liệu order system cũ (giữ lại warehouse/sp master) ──
  console.log('🗑️  Clearing old order data...');
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.orderShipment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.memberAddress.deleteMany({});
  await prisma.member.deleteMany({});
  await prisma.shippingProviderPricing.deleteMany({});
  console.log('   ✅ Cleared\n');

  // ── 1. Đảm bảo có sản phẩm & biến thể để order ──────────────────
  console.log('📦 Preparing products for order items...');

  const cat = await prisma.category.findFirst({ take: 1 });
  const catId = cat?.id ?? (await prisma.category.create({
    data: { name: 'Nội thất phòng khách', slug: 'noi-that-phong-khach', isActive: true },
  })).id;

  // Tạo thêm products nếu chưa đủ
  const products = await prisma.product.findMany({ take: 10 });
  const pArr = products.length > 0 ? products : [await prisma.product.create({
    data: { categoryId: catId, name: 'Sofa Giường Gỗ Tự Nhiên', slug: 'sofa-giuong-go-tu-nhien-' + Date.now(), code: 'SOFA-001', isActive: true },
  })];

  // Đảm bảo có sizes
  let sizeIds: string[] = [];
  const sizes = await prisma.productSize.findMany({ take: 5 });
  if (sizes.length === 0) {
    const s1 = await prisma.productSize.create({ data: { sizeLabel: '1m2 x 2m', sortOrder: 1 } });
    const s2 = await prisma.productSize.create({ data: { sizeLabel: '1m4 x 2m', sortOrder: 2 } });
    const s3 = await prisma.productSize.create({ data: { sizeLabel: '1m6 x 2m', sortOrder: 3 } });
    const s4 = await prisma.productSize.create({ data: { sizeLabel: '1m8 x 2m', sortOrder: 4 } });
    sizeIds = [s1.id, s2.id, s3.id, s4.id];
  } else {
    sizeIds = sizes.map(s => s.id);
  }

  // Đảm bảo có colors
  let colorIds: string[] = [];
  const colors = await prisma.productColor.findMany({ take: 5 });
  if (colors.length === 0) {
    const c1 = await prisma.productColor.create({ data: { colorName: 'Nâu', colorCode: '#795548', sortOrder: 1 } });
    const c2 = await prisma.productColor.create({ data: { colorName: 'Đen', colorCode: '#212121', sortOrder: 2 } });
    const c3 = await prisma.productColor.create({ data: { colorName: 'Trắng', colorCode: '#ffffff', sortOrder: 3 } });
    const c4 = await prisma.productColor.create({ data: { colorName: 'Xám', colorCode: '#9e9e9e', sortOrder: 4 } });
    colorIds = [c1.id, c2.id, c3.id, c4.id];
  } else {
    colorIds = colors.map(c => c.id);
  }

  // Tạo variants cho mỗi product nếu chưa có
  for (const prod of pArr) {
    const existingVariant = await prisma.productVariant.findFirst({ where: { productId: prod.id } });
    if (!existingVariant) {
      const variant = await prisma.productVariant.create({
        data: {
          productId: prod.id,
          productSizeId: sizeIds[0],
          productColorId: colorIds[0],
          sku: 'VAR-' + (prod.code ?? prod.id.slice(-6)),
          salePrice: 15000000,
          promoPrice: 13500000,
          stockQty: 50,
          isActive: true,
        },
      });
    }
  }

  const allVariants = await prisma.productVariant.findMany({
    select: { id: true, productId: true, sku: true, salePrice: true, promoPrice: true },
    take: 30,
  });
  const variantMap: Record<string, { id: string; salePrice: number; promoPrice: number | null }> = {};
  for (const v of allVariants) {
    variantMap[v.id] = { id: v.id, salePrice: Number(v.salePrice), promoPrice: v.promoPrice ? Number(v.promoPrice) : null };
  }

  console.log(`   ✅ ${pArr.length} products, ${sizeIds.length} sizes, ${colorIds.length} colors, ${allVariants.length} variants\n`);

  // ── 2. Members (30) ──────────────────────────────────────────────
  console.log('👥 Seeding members (30)...');

  const memberData = [
    { fullName: 'Trần Minh Hoàng', email: 'tran.hoang01@example.com', phone: '0901000001', gender: 'male', dob: '1990-03-15' },
    { fullName: 'Nguyễn Thị Lan', email: 'nguyen.lan02@example.com', phone: '0902000002', gender: 'female', dob: '1988-07-22' },
    { fullName: 'Lê Văn Quang', email: 'le.quang03@example.com', phone: '0903000003', gender: 'male', dob: '1995-01-10' },
    { fullName: 'Phạm Thu Hà', email: 'pham.ha04@example.com', phone: '0904000004', gender: 'female', dob: '1992-11-30' },
    { fullName: 'Hoàng Đức Anh', email: 'hoang.anh05@example.com', phone: '0905000005', gender: 'male', dob: '1997-05-18' },
    { fullName: 'Vũ Thị Mai', email: 'vu.mai06@example.com', phone: '0906000006', gender: 'female', dob: '1985-09-08' },
    { fullName: 'Đặng Minh Tuấn', email: 'dang.tuan07@example.com', phone: '0907000007', gender: 'male', dob: '1991-12-25' },
    { fullName: 'Bùi Thị Hoa', email: 'bui.hoa08@example.com', phone: '0908000008', gender: 'female', dob: '1994-04-03' },
    { fullName: 'Ngô Văn Dũng', email: 'ngo.dung09@example.com', phone: '0909000009', gender: 'male', dob: '1989-08-14' },
    { fullName: 'Trịnh Thị Ngọc', email: 'trinh.ngoc10@example.com', phone: '0910000010', gender: 'female', dob: '1996-02-20' },
    { fullName: 'Võ Quốc Việt', email: 'vo.viet11@example.com', phone: '0911000011', gender: 'male', dob: '1993-06-07' },
    { fullName: 'Đỗ Thị Lan Vy', email: 'do.lanvy12@example.com', phone: '0912000012', gender: 'female', dob: '1998-10-12' },
    { fullName: 'Lý Hoàng Nam', email: 'ly.nam13@example.com', phone: '0913000013', gender: 'male', dob: '1987-03-28' },
    { fullName: 'Mai Thị Hương', email: 'mai.huong14@example.com', phone: '0914000014', gender: 'female', dob: '1991-07-16' },
    { fullName: 'Trương Văn Hùng', email: 'truong.hung15@example.com', phone: '0915000015', gender: 'male', dob: '1994-01-05' },
    { fullName: 'Phan Thị Thanh', email: 'phan.thanh16@example.com', phone: '0916000016', gender: 'female', dob: '1990-09-22' },
    { fullName: 'Đinh Văn Tùng', email: 'dinh.tung17@example.com', phone: '0917000017', gender: 'male', dob: '1995-11-11' },
    { fullName: 'Hồ Thị Diệp', email: 'ho.diep18@example.com', phone: '0918000018', gender: 'female', dob: '1992-05-30' },
    { fullName: 'Cao Văn Phong', email: 'cao.phong19@example.com', phone: '0919000019', gender: 'male', dob: '1988-12-09' },
    { fullName: 'Nguyễn Hoàng Yến', email: 'yen.nguyen20@example.com', phone: '0920000020', gender: 'female', dob: '1997-02-14' },
    { fullName: 'Lưu Văn Minh', email: 'luu.minh21@example.com', phone: '0921000021', gender: 'male', dob: '1993-08-03' },
    { fullName: 'Trần Thị Kim Oanh', email: 'tran.oanh22@example.com', phone: '0922000022', gender: 'female', dob: '1989-04-19' },
    { fullName: 'Nguyễn Đức Phúc', email: 'nguyen.phuc23@example.com', phone: '0923000023', gender: 'male', dob: '1996-06-28' },
    { fullName: 'Lê Thị Hồng Nhung', email: 'le.nhung24@example.com', phone: '0924000024', gender: 'female', dob: '1991-10-07' },
    { fullName: 'Phạm Văn Bảo', email: 'pham.bao25@example.com', phone: '0925000025', gender: 'male', dob: '1994-03-25' },
    { fullName: 'Vũ Thị Minh Châu', email: 'vu.chau26@example.com', phone: '0926000026', gender: 'female', dob: '1998-01-13' },
    { fullName: 'Trịnh Hoàng Gia Bảo', email: 'trinh.ba27@example.com', phone: '0927000027', gender: 'male', dob: '1992-07-31' },
    { fullName: 'Hoàng Thị Quỳnh Anh', email: 'hoang.quynh28@example.com', phone: '0928000028', gender: 'female', dob: '1995-09-02' },
    { fullName: 'Bùi Văn Đạt', email: 'bui.dat29@example.com', phone: '0929000029', gender: 'male', dob: '1990-05-21' },
    { fullName: 'Đặng Thị Minh Thư', email: 'dang.thu30@example.com', phone: '0930000030', gender: 'female', dob: '1993-11-17' },
  ];

  const members = [];
  for (const m of memberData) {
    const member = await prisma.member.upsert({
      where: { email: m.email },
      update: {},
      create: {
        fullName: m.fullName,
        email: m.email,
        phone: m.phone,
        gender: m.gender,
        dateOfBirth: new Date(m.dob),
        isActive: true,
      },
    });
    members.push(member);
  }
  console.log(`   ✅ ${members.length} members created\n`);

  // ── 3. MemberAddresses (30+) ────────────────────────────────────
  console.log('🏠 Seeding member addresses (30+)...');

  const provinces = [
    { code: 'HCM', name: 'Hồ Chí Minh' },
    { code: 'HN', name: 'Hà Nội' },
    { code: 'DN', name: 'Đà Nẵng' },
    { code: 'CT', name: 'Cần Thơ' },
    { code: 'HP', name: 'Hải Phòng' },
  ];

  const districts: Record<string, Array<{ code: string; name: string }>> = {
    HCM: [
      { code: 'Q1', name: 'Quận 1' },
      { code: 'Q3', name: 'Quận 3' },
      { code: 'Q5', name: 'Quận 5' },
      { code: 'Q7', name: 'Quận 7' },
      { code: 'Q10', name: 'Quận 10' },
      { code: 'QBT', name: 'Quận Bình Thạnh' },
      { code: 'QTD', name: 'Quận Thủ Đức' },
      { code: 'Q12', name: 'Quận 12' },
    ],
    HN: [
      { code: 'QĐ', name: 'Quận Đống Đa' },
      { code: 'QTH', name: 'Quận Thanh Xuân' },
      { code: 'QCG', name: 'Quận Cầu Giấy' },
      { code: 'QHB', name: 'Quận Hoàn Kiếm' },
      { code: 'QBT2', name: 'Quận Bắc Từ Liêm' },
    ],
    DN: [
      { code: 'QH', name: 'Quận Hải Châu' },
      { code: 'QST', name: 'Quận Sơn Trà' },
    ],
    CT: [{ code: 'QNK', name: 'Quận Ninh Kiều' }],
    HP: [{ code: 'QHP', name: 'Quận Hồng Bàng' }],
  };

  const streets = [
    'Đường Nguyễn Huệ', 'Đường Lê Lợi', 'Đường Điện Biên Phủ',
    'Đường 3 Tháng 2', 'Đường Nguyễn Trãi', 'Đường Phạm Ngũ Lão',
    'Đường Pasteur', 'Đường Võ Văn Tần', 'Đường Trần Hưng Đạo',
    'Đường Lê Duẩn', 'Đường Hoàng Van Thu', 'Đường Trieu Nuoc',
    'Đường Nam Kỳ Khởi Nghĩa', 'Đường Trần Bình Trọng',
    'Đường Hai Bà Trưng', 'Đường Lý Thường Kiệt',
  ];

  let addrCount = 0;
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const prov = provinces[i % provinces.length];
    const dists = districts[prov.code] ?? [{ code: 'Q1', name: 'Quận 1' }];
    const dist = dists[i % dists.length];
    const street = streets[i % streets.length];
    const num = rndInt(10, 999);

    const addr = await prisma.memberAddress.create({
      data: {
        memberId: m.id,
        contactName: m.fullName ?? 'Khách hàng',
        contactPhone: m.phone ?? '0900000000',
        provinceCode: prov.code,
        provinceName: prov.name,
        districtCode: dist.code,
        districtName: dist.name,
        wardCode: 'P' + String(i + 1).padStart(2, '0'),
        wardName: 'Phường ' + (i + 1),
        addressLine: `${num} ${street}`,
        fullAddress: `${num} ${street}, Phường ${i + 1}, ${dist.name}, ${prov.name}`,
        isDefault: true,
      },
    });
    addrCount++;
  }
  console.log(`   ✅ ${addrCount} member addresses created\n`);

  // ── 4. Warehouses (5) ─────────────────────────────────────────────
  console.log('🏭 Seeding warehouses (5)...');

  const warehouseData = [
    { code: 'KHO-SG-01', name: 'Kho Sài Gòn', contactName: 'Nguyễn Văn Kho', contactPhone: '02812345678', prov: 'HCM', dist: 'Q12', distName: 'Quận 12', addr: '123 Đường Trung Hưng Đạo', lat: 10.8616, lng: 106.6417 },
    { code: 'KHO-HN-01', name: 'Kho Hà Nội', contactName: 'Lê Văn Hùng', contactPhone: '02498765432', prov: 'HN', dist: 'QTH', distName: 'Quận Thanh Xuân', addr: '456 Đường Nguyễn Trãi', lat: 20.9808, lng: 105.8152 },
    { code: 'KHO-DN-01', name: 'Kho Đà Nẵng', contactName: 'Trịnh Minh Tâm', contactPhone: '02367891234', prov: 'DN', dist: 'QH', distName: 'Quận Hải Châu', addr: '789 Đường Nguyễn Văn Linh', lat: 16.0544, lng: 108.2022 },
    { code: 'KHO-CT-01', name: 'Kho Cần Thơ', contactName: 'Võ Thị Bích', contactPhone: '02921234567', prov: 'CT', dist: 'QNK', distName: 'Quận Ninh Kiều', addr: '321 Đường 3 Tháng 2', lat: 10.0360, lng: 105.7872 },
    { code: 'KHO-HP-01', name: 'Kho Hải Phòng', contactName: 'Bùi Đình Phúc', contactPhone: '02251234567', prov: 'HP', dist: 'QHP', distName: 'Quận Hồng Bàng', addr: '654 Đường Tô Hiệu', lat: 20.8449, lng: 106.6881 },
  ];

  const warehouses = [];
  for (const w of warehouseData) {
    const wh = await prisma.warehouse.upsert({
      where: { code: w.code },
      update: {},
      create: {
        code: w.code,
        name: w.name,
        contactName: w.contactName,
        contactPhone: w.contactPhone,
        provinceCode: w.prov,
        provinceName: provinces.find(p => p.code === w.prov)?.name,
        districtCode: w.dist,
        districtName: w.distName,
        wardCode: 'P01',
        wardName: 'Phường Tân Chánh Hiệp',
        addressLine: w.addr,
        fullAddress: `${w.addr}, ${w.distName}, ${provinces.find(p => p.code === w.prov)?.name}`,
        latitude: w.lat,
        longitude: w.lng,
        isActive: true,
      },
    });
    warehouses.push(wh);
  }
  console.log(`   ✅ ${warehouses.length} warehouses created\n`);

  // ── 5. ShippingProviders (5) + ShippingProviderPricing (20) ────────
  console.log('🚚 Seeding shipping providers (5)...');

  const spData = [
    { code: 'GHN', name: 'Giao Hàng Nhanh', phone: '1900 6363', website: 'https://ghn.vn', note: 'Dịch vụ giao nhanh 24h, phạm vi rộng', serviceTypes: ['standard', 'express', 'same_day'], vehicles: ['motorbike', 'van', 'truck'] },
    { code: 'GHTK', name: 'Giao Hàng Tiết Kiệm', phone: '1900 6888', website: 'https://giaohangtietkiem.vn', note: 'Đối tác chính, giao tiết kiệm', serviceTypes: ['standard', 'express'], vehicles: ['motorbike', 'van'] },
    { code: 'VTP', name: 'Viettel Post', phone: '1900 8095', website: 'https://viettelpost.com.vn', note: 'Mạng lưới rộng khắp cả nước', serviceTypes: ['standard', 'express', 'same_day', 'scheduled'], vehicles: ['motorbike', 'van', 'truck'] },
    { code: 'GRAB', name: 'GrabExpress', phone: '028 3838 3838', website: 'https://grab.com/vn', note: 'Giao nhanh trong 1-2 giờ nội thành', serviceTypes: ['standard', 'express', 'same_day'], vehicles: ['motorbike'] },
    { code: 'SPX', name: 'SPX Express', phone: '1900 2707', website: 'https://spx.com.vn', note: 'Dịch vụ logistics tích hợp', serviceTypes: ['standard', 'express'], vehicles: ['van', 'truck'] },
  ];

  const providers = [];
  for (const sp of spData) {
    const p = await prisma.shippingProvider.upsert({
      where: { code: sp.code },
      update: {},
      create: {
        code: sp.code,
        name: sp.name,
        phone: sp.phone,
        website: sp.website,
        note: sp.note,
        serviceTypes: sp.serviceTypes,
        vehicles: sp.vehicles,
        isActive: true,
      },
    });
    providers.push(p);
  }
  console.log(`   ✅ ${providers.length} shipping providers created`);

  console.log('💰 Seeding shipping provider pricing (20)...');
  const pricingData: Array<{
    providerId: string; distanceFrom: number; distanceTo: number;
    serviceType: 'standard' | 'express' | 'same_day' | 'scheduled';
    basePrice: number; surchargeAmount?: number; surchargeLabel?: string;
  }> = [];

  for (const sp of providers) {
    // standard: 0-20km, 20-50km, 50-100km, 100+km
    pricingData.push(
      { providerId: sp.id, distanceFrom: 0, distanceTo: 20, serviceType: 'standard', basePrice: rndInt(20000, 35000) },
      { providerId: sp.id, distanceFrom: 20, distanceTo: 50, serviceType: 'standard', basePrice: rndInt(35000, 55000) },
      { providerId: sp.id, distanceFrom: 50, distanceTo: 100, serviceType: 'standard', basePrice: rndInt(55000, 90000) },
      { providerId: sp.id, distanceFrom: 100, distanceTo: 200, serviceType: 'standard', basePrice: rndInt(90000, 140000) },
    );
    if (sp.code !== 'SPX') {
      pricingData.push(
        { providerId: sp.id, distanceFrom: 0, distanceTo: 20, serviceType: 'express', basePrice: rndInt(35000, 60000) },
        { providerId: sp.id, distanceFrom: 20, distanceTo: 50, serviceType: 'express', basePrice: rndInt(60000, 100000) },
      );
    }
    if (sp.code != null && ['GHN', 'GRAB'].includes(sp.code)) {
      pricingData.push(
        { providerId: sp.id, distanceFrom: 0, distanceTo: 15, serviceType: 'same_day', basePrice: rndInt(50000, 80000), surchargeAmount: 10000, surchargeLabel: 'Phí giao trong ngày' },
      );
    }
    if (sp.code === 'VTP') {
      pricingData.push(
        { providerId: sp.id, distanceFrom: 0, distanceTo: 30, serviceType: 'scheduled', basePrice: rndInt(25000, 45000) },
      );
    }
  }

  for (const pr of pricingData) {
    await prisma.shippingProviderPricing.upsert({
      where: {
        id: `${pr.providerId}-${pr.serviceType}-${pr.distanceFrom}`,
      },
      update: {},
      create: {
        id: `${pr.providerId}-${pr.serviceType}-${pr.distanceFrom}`,
        shippingProviderId: pr.providerId,
        distanceFromKm: pr.distanceFrom,
        distanceToKm: pr.distanceTo,
        serviceType: pr.serviceType,
        basePrice: pr.basePrice,
        surchargeAmount: pr.surchargeAmount ?? 0,
        surchargeLabel: pr.surchargeLabel ?? null,
        isActive: true,
      },
    });
  }
  console.log(`   ✅ ${pricingData.length} pricing rows created\n`);

  // ── 6. Orders (30) ─────────────────────────────────────────────────
  console.log('🧾 Seeding orders (30)...');

  const orderStatuses = ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'completed', 'cancelled'] as const;
  const paymentStatuses = ['unpaid', 'partially_paid', 'paid'] as const;
  const customerTypes = ['member', 'guest'] as const;

  const orderNoPrefixes = ['DH-20260412', 'DH-20260411', 'DH-20260410', 'DH-20260409', 'DH-20260408', 'DH-20260407'];

  const orders = [];
  for (let i = 1; i <= 30; i++) {
    const isMember = i % 4 !== 0; // ~75% member orders
    const member = isMember ? members[(i - 1) % members.length] : null;
    const custType: 'member' | 'guest' = member ? 'member' : 'guest';
    const custName = member ? member.fullName : `Khách hàng ${i}`;
    const custPhone = member ? member.phone : `09${String(1000000 + i).slice(1)}`;
    const custEmail = member ? member.email : `guest${i}@example.com`;

    const dayIdx = i % orderNoPrefixes.length;
    const orderNo = `${orderNoPrefixes[dayIdx]}-${String(i).padStart(3, '0')}`;

    const statusIdx = Math.min(Math.floor(i / 4), orderStatuses.length - 2);
    const orderStatus = orderStatuses[statusIdx];
    const paymentStatus: typeof paymentStatuses[number] =
      orderStatus === 'cancelled' ? 'unpaid' :
      orderStatus === 'pending' ? 'unpaid' :
      orderStatus === 'completed' ? 'paid' :
      orderStatus === 'delivered' ? (i % 2 === 0 ? 'paid' : 'partially_paid') :
      paymentStatuses[i % paymentStatuses.length];

    // Calculate amounts based on order number
    const baseAmount = rndInt(5, 50) * 500000;
    const discount = i % 3 === 0 ? rndInt(1, 5) * 500000 : 0;
    const shippingAmt = i % 5 === 0 ? 0 : rndInt(2, 8) * 50000;
    const grandTotal = baseAmount - discount + shippingAmt;
    const deposit = paymentStatus === 'paid' ? grandTotal :
                   paymentStatus === 'partially_paid' ? Math.floor(grandTotal / 2) : 0;

    const daysBack = rndInt(0, 15);
    const placedAt = daysAgo(daysBack);

    // Address
    const prov = provinces[rndInt(0, provinces.length - 1)];
    const dists = districts[prov.code] ?? districts['HCM'];
    const dist = dists[rndInt(0, dists.length - 1)];
    const street = streets[rndInt(0, streets.length - 1)];
    const num = rndInt(10, 888);

    const order = await prisma.order.upsert({
      where: { orderNo },
      update: {},
      create: {
        orderNo,
        customerType: custType,
        memberId: member?.id ?? null,
        customerName: custName ?? 'Khách hàng',
        customerPhone: custPhone,
        customerEmail: custEmail,
        shippingContactName: custName ?? 'Khách hàng',
        shippingContactPhone: custPhone,
        shippingProvinceCode: prov.code,
        shippingProvinceName: prov.name,
        shippingDistrictCode: dist.code,
        shippingDistrictName: dist.name,
        shippingWardCode: 'P' + String((i % 20) + 1).padStart(2, '0'),
        shippingWardName: 'Phường ' + ((i % 20) + 1),
        shippingAddressLine: `${num} ${street}`,
        shippingFullAddress: `${num} ${street}, Phường ${(i % 20) + 1}, ${dist.name}, ${prov.name}`,
        subtotalAmount: baseAmount,
        discountAmount: discount,
        shippingAmount: shippingAmt,
        otherFeeAmount: 0,
        taxAmount: 0,
        grandTotalAmount: grandTotal,
        depositAmount: deposit,
        remainingAmount: grandTotal - deposit,
        orderStatus,
        paymentStatus,
        customerNote: i % 3 === 0 ? 'Giao giờ hành chính' : null,
        placedAt,
        createdAt: placedAt,
      },
    });
    orders.push(order);
  }
  console.log(`   ✅ ${orders.length} orders created\n`);

  // ── 7. OrderItems (30+) ───────────────────────────────────────────
  console.log('📋 Seeding order items...');

  const productNames = [
    'Sofa Giường Gỗ Tự Nhiên',
    'Bàn Ghế Gỗ Cao Cấp',
    'Tủ Quần Áo 4 Cánh',
    'Kệ Sách Gỗ Óc Chó',
    'Giường Ngủ King Size',
    'Bàn Ăn 6 Chỗ',
    'Ghế Massage Thư Giãn',
    'Rèm Cửa Vải Cao Cấp',
  ];

  const colorArr = ['Nâu', 'Đen', 'Trắng', 'Xám', 'Nâu đậm'];
  const sizeArr = ['1m2 x 2m', '1m4 x 2m', '1m6 x 2m', '1m8 x 2m'];

  let itemCount = 0;
  for (const order of orders) {
    const itemCountOrder = rndInt(1, 3);
    for (let j = 0; j < itemCountOrder; j++) {
      const variant = allVariants[j % allVariants.length];
      const salePrice = variantMap[variant.id]?.salePrice ?? rndInt(5, 30) * 1000000;
      const promoPrice = variantMap[variant.id]?.promoPrice ?? (j === 0 ? Math.floor(salePrice * 0.9) : null);
      const qty = j === 0 ? rndInt(1, 2) : 1;
      const lineTotal = qty * (promoPrice ?? salePrice);

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: variant.productId,
          productVariantId: variant.id,
          productName: productNames[j % productNames.length],
          variantName: `${colorArr[j % colorArr.length]} / ${sizeArr[j % sizeArr.length]}`,
          sku: variant.sku || undefined,
          sizeLabel: sizeArr[j % sizeArr.length],
          colorName: colorArr[j % colorArr.length],
          quantity: qty,
          unitSalePrice: salePrice,
          unitPromoPrice: promoPrice ?? undefined,
          unitFinalPrice: promoPrice ?? salePrice,
          lineDiscountAmount: promoPrice && j === 0 ? salePrice - promoPrice : 0,
          lineTotalAmount: lineTotal,
          productSnapshotJson: JSON.stringify({
            productId: variant.productId,
            variantId: variant.id,
            priceSnapshot: { salePrice, promoPrice },
          }),
        },
      });
      itemCount++;
    }
  }
  console.log(`   ✅ ${itemCount} order items created\n`);

  // ── 8. OrderShipments (30) ────────────────────────────────────────
  console.log('🚛 Seeding order shipments...');

  const shippingMethods = ['motorbike', 'van', 'truck', 'pickup', 'other'] as const;
  const serviceTypes = ['standard', 'express', 'same_day', 'scheduled', 'other'] as const;

  let shipmentCount = 0;
  for (const order of orders) {
    const wh = warehouses[rndInt(0, warehouses.length - 1)];
    const sp = order.orderStatus !== 'cancelled' && order.orderStatus !== 'pending'
      ? providers[rndInt(0, providers.length - 1)]
      : null;
    const method = shippingMethods[rndInt(0, 1)] as typeof shippingMethods[number];
    const svcType = sp ? (serviceTypes[rndInt(0, 2)] as typeof serviceTypes[number]) : 'standard';

    const shippingCost = Number(order.shippingAmount) > 0 ? order.shippingAmount : 0;
    const distanceKm = rndDec(1, 50);
    const estDistKm = rndDec(distanceKm - 5 > 0 ? distanceKm - 5 : 1, distanceKm + 5);

    const shippedAt = ['shipping', 'delivered', 'completed'].includes(order.orderStatus)
      ? new Date(order.placedAt!.getTime() + rndInt(24, 72) * 3600000)
      : null;
    const deliveredAt = ['delivered', 'completed'].includes(order.orderStatus)
      ? new Date((shippedAt?.getTime() ?? order.placedAt!.getTime()) + rndInt(2, 8) * 3600000)
      : null;

    await prisma.orderShipment.create({
      data: {
        orderId: order.id,
        warehouseId: wh.id,
        shippingProviderId: sp?.id ?? undefined,
        shippingMethod: method,
        shippingServiceType: svcType,
        fromContactName: wh.contactName ?? undefined,
        fromContactPhone: wh.contactPhone ?? undefined,
        fromProvinceCode: wh.provinceCode ?? undefined,
        fromProvinceName: wh.provinceName ?? undefined,
        fromDistrictCode: wh.districtCode ?? undefined,
        fromDistrictName: wh.districtName ?? undefined,
        fromWardCode: wh.wardCode ?? undefined,
        fromWardName: wh.wardName ?? undefined,
        fromAddressLine: wh.addressLine,
        fromFullAddress: wh.fullAddress ?? undefined,
        fromLatitude: wh.latitude ?? undefined,
        fromLongitude: wh.longitude ?? undefined,
        toContactName: order.shippingContactName,
        toContactPhone: order.shippingContactPhone ?? undefined,
        toProvinceCode: order.shippingProvinceCode ?? undefined,
        toProvinceName: order.shippingProvinceName ?? undefined,
        toDistrictCode: order.shippingDistrictCode ?? undefined,
        toDistrictName: order.shippingDistrictName ?? undefined,
        toWardCode: order.shippingWardCode ?? undefined,
        toWardName: order.shippingWardName ?? undefined,
        toAddressLine: order.shippingAddressLine,
        toFullAddress: order.shippingFullAddress ?? undefined,
        distanceKm,
        estimatedDistanceKm: estDistKm,
        shippingCost,
        extraCost: 0,
        discountAmount: 0,
        finalShippingCost: shippingCost,
        trackingCode: shippedAt ? `TRK${rndInt(100000, 999999)}` : undefined,
        shippedAt: shippedAt ?? undefined,
        deliveredAt: deliveredAt ?? undefined,
      },
    });
    shipmentCount++;
  }
  console.log(`   ✅ ${shipmentCount} order shipments created\n`);

  // ── 9. OrderStatusHistories (30+) ─────────────────────────────────
  console.log('📝 Seeding order status histories...');

  const statusFlowMap: Record<string, string[]> = {
    pending: ['pending'],
    confirmed: ['pending', 'confirmed'],
    processing: ['pending', 'confirmed', 'processing'],
    shipping: ['pending', 'confirmed', 'processing', 'shipping'],
    delivered: ['pending', 'confirmed', 'processing', 'shipping', 'delivered'],
    completed: ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'completed'],
    cancelled: ['pending', 'cancelled'],
  };

  const statusNotes: Record<string, Record<string, string>> = {
    pending: { pending: 'Đơn hàng được tạo qua website' },
    confirmed: {
      pending: 'Đơn hàng được tạo qua website',
      confirmed: 'Xác nhận đơn hàng, chuẩn bị xử lý',
    },
    processing: {
      pending: 'Đơn hàng được tạo qua website',
      confirmed: 'Xác nhận đơn hàng',
      processing: 'Đang đóng gói và kiểm tra hàng',
    },
    shipping: {
      pending: 'Đơn hàng được tạo qua website',
      confirmed: 'Xác nhận đơn hàng',
      processing: 'Đang xử lý',
      shipping: 'Đã bàn giao đơn vị vận chuyển',
    },
    delivered: {
      pending: 'Đơn hàng được tạo',
      confirmed: 'Xác nhận đơn hàng',
      processing: 'Đang xử lý',
      shipping: 'Đang giao hàng',
      delivered: 'Giao hàng thành công, khách đã nhận',
    },
    completed: {
      pending: 'Đơn hàng được tạo',
      confirmed: 'Xác nhận đơn hàng',
      processing: 'Đang xử lý',
      shipping: 'Đang giao hàng',
      delivered: 'Giao hàng thành công',
      completed: 'Đơn hàng hoàn thành',
    },
    cancelled: {
      pending: 'Đơn hàng được tạo',
      cancelled: 'Hủy đơn - khách không nhận hàng',
    },
  };

  const changedByTypeArr = ['admin', 'system', 'customer', 'shipper'] as const;

  let histCount = 0;
  for (const order of orders) {
    const flow = statusFlowMap[order.orderStatus] ?? ['pending'];
    let prevStatus: string | null = null;

    for (let hIdx = 0; hIdx < flow.length; hIdx++) {
      const toStatus = flow[hIdx];
      const changedBy = toStatus === 'pending' ? 'system' : (hIdx === flow.length - 1 ? 'admin' : 'system');
      const note = statusNotes[order.orderStatus]?.[toStatus] ?? `Chuyển trạng thái sang ${toStatus}`;

      const baseTime = order.placedAt!.getTime();
      const histTime = new Date(baseTime + hIdx * rndInt(1, 4) * 3600000);

      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: prevStatus as never,
          toStatus: toStatus as never,
          changedByType: changedBy as never,
          changedById: changedBy === 'admin' ? BigInt(1) : null,
          note,
          createdAt: histTime,
        },
      });
      prevStatus = toStatus;
      histCount++;
    }
  }
  console.log(`   ✅ ${histCount} order status history records created\n`);

  // ── Summary ────────────────────────────────────────────────────────
  const finalCounts = await Promise.all([
    prisma.member.count(),
    prisma.memberAddress.count(),
    prisma.warehouse.count(),
    prisma.shippingProvider.count(),
    prisma.shippingProviderPricing.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.orderShipment.count(),
    prisma.orderStatusHistory.count(),
  ]);

  console.log('');
  console.log('🎉 Seed completed!');
  console.log('');
  console.log('Summary:');
  console.log(`  • Members:            ${finalCounts[0]}`);
  console.log(`  • MemberAddresses:   ${finalCounts[1]}`);
  console.log(`  • Warehouses:         ${finalCounts[2]}`);
  console.log(`  • ShippingProviders: ${finalCounts[3]}`);
  console.log(`  • ShippingPricing:   ${finalCounts[4]}`);
  console.log(`  • Orders:             ${finalCounts[5]}`);
  console.log(`  • OrderItems:         ${finalCounts[6]}`);
  console.log(`  • OrderShipments:     ${finalCounts[7]}`);
  console.log(`  • OrderStatusHistories: ${finalCounts[8]}`);
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
