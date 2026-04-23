import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding order system data...\n');

  // ── 1. Members + MemberAddresses ─────────────────────────────────
  console.log('📦 Creating members...');

  const member1 = await prisma.member.upsert({
    where: { email: 'tran.thi.b@example.com' },
    update: {},
    create: {
      fullName: 'Trần Thị B',
      email: 'tran.thi.b@example.com',
      phone: '0912345678',
      isActive: true,
    },
  });

  const member2 = await prisma.member.upsert({
    where: { email: 'pham.thu.d@example.com' },
    update: {},
    create: {
      fullName: 'Phạm Thu D',
      email: 'pham.thu.d@example.com',
      phone: '0944567890',
      isActive: true,
    },
  });

  // Member addresses
  await prisma.memberAddress.createMany({
    data: [
      {
        memberId: member1.id,
        contactName: 'Trần Thị B',
        contactPhone: '0912345678',
        provinceCode: 'HCM',
        provinceName: 'Hồ Chí Minh',
        districtCode: 'Q3',
        districtName: 'Quận 3',
        wardCode: 'P02',
        wardName: 'Phường Võ Thị Sáu',
        addressLine: '456 Đường Điện Biên Phủ',
        fullAddress: '456 Đường Điện Biên Phủ, Phường Võ Thị Sáu, Quận 3, Hồ Chí Minh',
        isDefault: true,
      },
      {
        memberId: member2.id,
        contactName: 'Phạm Thu D',
        contactPhone: '0944567890',
        provinceCode: 'HCM',
        provinceName: 'Hồ Chí Minh',
        districtCode: 'Q10',
        districtName: 'Quận 10',
        wardCode: 'P05',
        wardName: 'Phường 5',
        addressLine: '321 Đường 3 Tháng 2',
        fullAddress: '321 Đường 3 Tháng 2, Phường 5, Quận 10, Hồ Chí Minh',
        isDefault: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log(`   ✅ Member: ${member1.fullName} (${member1.email})`);
  console.log(`   ✅ Member: ${member2.fullName} (${member2.email})`);

  // ── 2. Warehouses ──────────────────────────────────────────────
  console.log('\n🏭 Creating warehouses...');

  const warehouse1 = await prisma.warehouse.upsert({
    where: { code: 'KHO-SG-01' },
    update: {},
    create: {
      code: 'KHO-SG-01',
      name: 'Kho Sài Gòn',
      contactName: 'Nguyễn Văn Kho',
      contactPhone: '02812345678',
      provinceCode: 'HCM',
      provinceName: 'Hồ Chí Minh',
      districtCode: 'Q12',
      districtName: 'Quận 12',
      wardCode: 'P01',
      wardName: 'Phường Tân Chánh Hiệp',
      addressLine: '123 Đường Trung Hưng Đạo',
      fullAddress: '123 Đường Trung Hưng Đạo, Phường Tân Chánh Hiệp, Quận 12, Hồ Chí Minh',
      latitude: 10.8616,
      longitude: 106.6417,
      isActive: true,
    },
  });

  const warehouse2 = await prisma.warehouse.upsert({
    where: { code: 'KHO-HN-01' },
    update: {},
    create: {
      code: 'KHO-HN-01',
      name: 'Kho Hà Nội',
      contactName: 'Lê Văn Hùng',
      contactPhone: '02498765432',
      provinceCode: 'HN',
      provinceName: 'Hà Nội',
      districtCode: 'QTH',
      districtName: 'Quận Thanh Xuân',
      wardCode: 'P03',
      wardName: 'Phường Kim Giang',
      addressLine: '456 Đường Nguyễn Trãi',
      fullAddress: '456 Đường Nguyễn Trãi, Phường Kim Giang, Quận Thanh Xuân, Hà Nội',
      latitude: 20.9808,
      longitude: 105.8152,
      isActive: true,
    },
  });

  console.log(`   ✅ ${warehouse1.name} (${warehouse1.code})`);
  console.log(`   ✅ ${warehouse2.name} (${warehouse2.code})`);

  // ── 3. Shipping Providers ───────────────────────────────────────
  console.log('\n🚚 Creating shipping providers...');

  const sp1 = await prisma.shippingProvider.upsert({
    where: { code: 'GHTK' },
    update: {},
    create: {
      code: 'GHTK',
      name: 'Giao Hàng Tiết Kiệm',
      phone: '1900 6888',
      website: 'https://giaohangtietkiem.vn',
      note: 'Đối tác vận chuyển chính',
      isActive: true,
    },
  });

  const sp2 = await prisma.shippingProvider.upsert({
    where: { code: 'GHN' },
    update: {},
    create: {
      code: 'GHN',
      name: 'Giao Hàng Nhanh',
      phone: '1900 6363',
      website: 'https://ghn.vn',
      note: 'Dịch vụ giao nhanh 24h',
      isActive: true,
    },
  });

  const sp3 = await prisma.shippingProvider.upsert({
    where: { code: 'VTP' },
    update: {},
    create: {
      code: 'VTP',
      name: 'Viettel Post',
      phone: '1900 8095',
      website: 'https://viettelpost.com.vn',
      note: 'Mạng lưới rộng khắp',
      isActive: true,
    },
  });

  console.log(`   ✅ ${sp1.name} (${sp1.code})`);
  console.log(`   ✅ ${sp2.name} (${sp2.code})`);
  console.log(`   ✅ ${sp3.name} (${sp3.code})`);

  // ── 4. Products (for order items) ─────────────────────────────
  console.log('\n📦 Ensuring products exist...');

  const category = await prisma.category.findFirst({ take: 1 });
  let categoryId = category?.id;

  if (!category) {
    const newCat = await prisma.category.create({
      data: {
        name: 'Nội thất phòng khách',
        slug: 'noi-that-phong-khach',
        description: 'Danh mục nội thất phòng khách',
        sortOrder: 1,
        isActive: true,
      },
    });
    categoryId = newCat.id;
  }

  const product = await prisma.product.findFirst({ where: { categoryId } });
  let productId = product?.id;
  let variantId: string | undefined;

  if (!product) {
    const newProduct = await prisma.product.create({
      data: {
        categoryId: categoryId!,
        name: 'Sofa Giường Gỗ Tự Nhiên',
        slug: 'sofa-giuong-go-tu-nhien-' + Date.now(),
        code: 'SOFA-001',
        shortDescription: 'Sofa giường gỗ tự nhiên cao cấp, thiết kế hiện đại',
        brand: 'Nội Thất Tiến Lợi',
        unit: 'chiếc',
        isActive: true,
        isFeatured: true,
      },
    });
    productId = newProduct.id;

    const size = await prisma.productSize.create({
      data: { sizeLabel: '1m8', sortOrder: 1 },
    });
    const color = await prisma.productColor.create({
      data: { colorName: 'Nâu', sortOrder: 1 },
    });

    const variant = await prisma.productVariant.create({
      data: {
        productId: productId!,
        productSizeId: size.id,
        productColorId: color.id,
        sku: 'SOFA-001-NH-18',
        salePrice: 15000000,
        promoPrice: 13500000,
        stockQty: 50,
        isActive: true,
      },
    });
    variantId = variant.id;
  } else {
    const variant = await prisma.productVariant.findFirst({
      where: { productId: product.id },
    });
    variantId = variant?.id;
  }

  console.log(`   ✅ Product: ${product?.name ?? 'N/A'} (ID: ${productId})`);
  console.log(`   ✅ Variant: ${variantId ?? 'N/A'}`);

  // ── 5. Orders ──────────────────────────────────────────────────
  console.log('\n🧾 Creating orders...');

  // Order 1: Guest, pending
  const order1 = await prisma.order.upsert({
    where: { orderNo: 'DH-20260409-001' },
    update: {},
    create: {
      orderNo: 'DH-20260409-001',
      customerType: 'guest',
      customerName: 'Nguyễn Văn A',
      customerPhone: '0909123456',
      customerEmail: 'vana@gmail.com',
      shippingContactName: 'Nguyễn Văn A',
      shippingContactPhone: '0909123456',
      shippingProvinceCode: 'HCM',
      shippingProvinceName: 'Hồ Chí Minh',
      shippingDistrictCode: 'Q1',
      shippingDistrictName: 'Quận 1',
      shippingWardCode: 'P01',
      shippingWardName: 'Phường Bến Nghé',
      shippingAddressLine: '123 Đường Nguyễn Huệ',
      shippingFullAddress: '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, Hồ Chí Minh',
      subtotalAmount: 15000000,
      discountAmount: 0,
      shippingAmount: 0,
      otherFeeAmount: 0,
      taxAmount: 0,
      grandTotalAmount: 15000000,
      depositAmount: 0,
      remainingAmount: 15000000,
      orderStatus: 'pending',
      paymentStatus: 'unpaid',
      customerNote: 'Giao giờ hành chính',
      placedAt: new Date('2026-04-09T10:30:00Z'),
    },
  });

  // Order 2: Member, confirmed, partially paid
  const order2 = await prisma.order.upsert({
    where: { orderNo: 'DH-20260409-002' },
    update: {},
    create: {
      orderNo: 'DH-20260409-002',
      customerType: 'member',
      memberId: member1.id,
      customerName: 'Trần Thị B',
      customerPhone: '0912345678',
      customerEmail: 'tran.thi.b@example.com',
      shippingContactName: 'Trần Thị B',
      shippingContactPhone: '0912345678',
      shippingProvinceCode: 'HCM',
      shippingProvinceName: 'Hồ Chí Minh',
      shippingDistrictCode: 'Q3',
      shippingDistrictName: 'Quận 3',
      shippingWardCode: 'P02',
      shippingWardName: 'Phường Võ Thị Sáu',
      shippingAddressLine: '456 Đường Điện Biên Phủ',
      shippingFullAddress: '456 Đường Điện Biên Phủ, Phường Võ Thị Sáu, Quận 3, Hồ Chí Minh',
      subtotalAmount: 28000000,
      discountAmount: 2000000,
      shippingAmount: 500000,
      otherFeeAmount: 0,
      taxAmount: 0,
      grandTotalAmount: 26550000,
      depositAmount: 10000000,
      remainingAmount: 16550000,
      orderStatus: 'confirmed',
      paymentStatus: 'partially_paid',
      customerNote: 'Giao buổi sáng 8h-12h',
      placedAt: new Date('2026-04-08T14:00:00Z'),
    },
  });

  // Order 3: Guest, shipping, paid
  const order3 = await prisma.order.upsert({
    where: { orderNo: 'DH-20260407-003' },
    update: {},
    create: {
      orderNo: 'DH-20260407-003',
      customerType: 'guest',
      customerName: 'Lê Minh C',
      customerPhone: '0933123456',
      customerEmail: 'minhle@gmail.com',
      shippingContactName: 'Lê Minh C',
      shippingContactPhone: '0933123456',
      shippingProvinceCode: 'HCM',
      shippingProvinceName: 'Hồ Chí Minh',
      shippingDistrictCode: 'Q5',
      shippingDistrictName: 'Quận 5',
      shippingWardCode: 'P03',
      shippingWardName: 'Phường 3',
      shippingAddressLine: '789 Đường Hùng Vương',
      shippingFullAddress: '789 Đường Hùng Vương, Phường 3, Quận 5, Hồ Chí Minh',
      subtotalAmount: 15000000,
      discountAmount: 1500000,
      shippingAmount: 300000,
      otherFeeAmount: 0,
      taxAmount: 0,
      grandTotalAmount: 13800000,
      depositAmount: 13800000,
      remainingAmount: 0,
      orderStatus: 'shipping',
      paymentStatus: 'paid',
      customerNote: 'Khách hàng dặn nhẹ tay',
      placedAt: new Date('2026-04-07T09:00:00Z'),
    },
  });

  // Order 4: Member, completed, paid
  const order4 = await prisma.order.upsert({
    where: { orderNo: 'DH-20260401-004' },
    update: {},
    create: {
      orderNo: 'DH-20260401-004',
      customerType: 'member',
      memberId: member2.id,
      customerName: 'Phạm Thu D',
      customerPhone: '0944567890',
      customerEmail: 'pham.thu.d@example.com',
      shippingContactName: 'Phạm Thu D',
      shippingContactPhone: '0944567890',
      shippingProvinceCode: 'HCM',
      shippingProvinceName: 'Hồ Chí Minh',
      shippingDistrictCode: 'Q10',
      shippingDistrictName: 'Quận 10',
      shippingWardCode: 'P05',
      shippingWardName: 'Phường 5',
      shippingAddressLine: '321 Đường 3 Tháng 2',
      shippingFullAddress: '321 Đường 3 Tháng 2, Phường 5, Quận 10, Hồ Chí Minh',
      subtotalAmount: 30000000,
      discountAmount: 3000000,
      shippingAmount: 0,
      otherFeeAmount: 0,
      taxAmount: 0,
      grandTotalAmount: 27000000,
      depositAmount: 27000000,
      remainingAmount: 0,
      orderStatus: 'completed',
      paymentStatus: 'paid',
      customerNote: '',
      placedAt: new Date('2026-04-01T16:00:00Z'),
    },
  });

  // Order 5: Guest, cancelled
  const order5 = await prisma.order.upsert({
    where: { orderNo: 'DH-20260405-005' },
    update: {},
    create: {
      orderNo: 'DH-20260405-005',
      customerType: 'guest',
      customerName: 'Hoàng Văn E',
      customerPhone: '0955678901',
      customerEmail: 'hvane@gmail.com',
      shippingContactName: 'Hoàng Văn E',
      shippingContactPhone: '0955678901',
      shippingProvinceCode: 'HCM',
      shippingProvinceName: 'Hồ Chí Minh',
      shippingDistrictCode: 'Q2',
      shippingDistrictName: 'Quận 2',
      shippingWardCode: 'P02',
      shippingWardName: 'Phường Thảo Điền',
      shippingAddressLine: '555 Đường Xa Lộ Hà Nội',
      shippingFullAddress: '555 Đường Xa Lộ Hà Nội, Phường Thảo Điền, Quận 2, Hồ Chí Minh',
      subtotalAmount: 15000000,
      discountAmount: 0,
      shippingAmount: 500000,
      otherFeeAmount: 0,
      taxAmount: 0,
      grandTotalAmount: 15500000,
      depositAmount: 0,
      remainingAmount: 15500000,
      orderStatus: 'cancelled',
      paymentStatus: 'unpaid',
      customerNote: 'Hủy do khách đổi ý',
      placedAt: new Date('2026-04-05T11:00:00Z'),
    },
  });

  // Order 6: Guest, processing, unpaid (bonus)
  const order6 = await prisma.order.upsert({
    where: { orderNo: 'DH-20260408-006' },
    update: {},
    create: {
      orderNo: 'DH-20260408-006',
      customerType: 'guest',
      customerName: 'Võ Thị F',
      customerPhone: '0966881234',
      customerEmail: 'votif@gmail.com',
      shippingContactName: 'Võ Thị F',
      shippingContactPhone: '0966881234',
      shippingProvinceCode: 'HCM',
      shippingProvinceName: 'Hồ Chí Minh',
      shippingDistrictCode: 'Q7',
      shippingDistrictName: 'Quận 7',
      shippingWardCode: 'P01',
      shippingWardName: 'Phường Tân Phong',
      shippingAddressLine: '888 Đường Nguyễn Văn Linh',
      shippingFullAddress: '888 Đường Nguyễn Văn Linh, Phường Tân Phong, Quận 7, Hồ Chí Minh',
      subtotalAmount: 45000000,
      discountAmount: 5000000,
      shippingAmount: 0,
      otherFeeAmount: 0,
      taxAmount: 0,
      grandTotalAmount: 40000000,
      depositAmount: 0,
      remainingAmount: 40000000,
      orderStatus: 'processing',
      paymentStatus: 'unpaid',
      customerNote: 'Yêu cầu giao vào cuối tuần',
      placedAt: new Date('2026-04-08T08:00:00Z'),
    },
  });

  // Order 7: Guest, delivered, partially paid (bonus)
  const order7 = await prisma.order.upsert({
    where: { orderNo: 'DH-20260403-007' },
    update: {},
    create: {
      orderNo: 'DH-20260403-007',
      customerType: 'guest',
      customerName: 'Đặng Minh G',
      customerPhone: '0977994567',
      customerEmail: 'dmg@gmail.com',
      shippingContactName: 'Đặng Minh G',
      shippingContactPhone: '0977994567',
      shippingProvinceCode: 'HCM',
      shippingProvinceName: 'Hồ Chí Minh',
      shippingDistrictCode: 'Q4',
      shippingDistrictName: 'Quận 4',
      shippingWardCode: 'P02',
      shippingWardName: 'Phường Đakao',
      shippingAddressLine: '222 Đường Bến Vân Đồn',
      shippingFullAddress: '222 Đường Bến Vân Đồn, Phường Đakao, Quận 4, Hồ Chí Minh',
      subtotalAmount: 20000000,
      discountAmount: 0,
      shippingAmount: 200000,
      otherFeeAmount: 0,
      taxAmount: 0,
      grandTotalAmount: 20200000,
      depositAmount: 10000000,
      remainingAmount: 10200000,
      orderStatus: 'delivered',
      paymentStatus: 'partially_paid',
      customerNote: 'Giao sau 17h',
      placedAt: new Date('2026-04-03T15:00:00Z'),
    },
  });

  console.log('   ✅ Orders created:');
  console.log(`      ${order1.orderNo} - ${order1.orderStatus} (${order1.customerType})`);
  console.log(`      ${order2.orderNo} - ${order2.orderStatus} (${order2.customerType})`);
  console.log(`      ${order3.orderNo} - ${order3.orderStatus} (${order3.customerType})`);
  console.log(`      ${order4.orderNo} - ${order4.orderStatus} (${order4.customerType})`);
  console.log(`      ${order5.orderNo} - ${order5.orderStatus} (${order5.customerType})`);
  console.log(`      ${order6.orderNo} - ${order6.orderStatus} (${order6.customerType})`);
  console.log(`      ${order7.orderNo} - ${order7.orderStatus} (${order7.customerType})`);

  // ── 6. Order Items ─────────────────────────────────────────────
  console.log('\n📋 Creating order items...');

  const orderItemsData = [
    // Order 1
    { orderId: order1.id, productId: productId!, variantId, name: 'Sofa Giường Gỗ Tự Nhiên', variant: 'Nâu / 1m8', qty: 1, unitPrice: 15000000, promoPrice: null, discount: 0 },
    // Order 2
    { orderId: order2.id, productId: productId!, variantId, name: 'Sofa Giường Gỗ Tự Nhiên', variant: 'Nâu / 1m8', qty: 2, unitPrice: 14000000, promoPrice: null, discount: 0 },
    // Order 3
    { orderId: order3.id, productId: productId!, variantId, name: 'Sofa Giường Gỗ Tự Nhiên', variant: 'Nâu / 1m8', qty: 1, unitPrice: 15000000, promoPrice: 13500000, discount: 1500000 },
    // Order 4
    { orderId: order4.id, productId: productId!, variantId, name: 'Sofa Giường Gỗ Tự Nhiên', variant: 'Nâu / 1m8', qty: 2, unitPrice: 15000000, promoPrice: 13500000, discount: 3000000 },
    // Order 5
    { orderId: order5.id, productId: productId!, variantId, name: 'Sofa Giường Gỗ Tự Nhiên', variant: 'Nâu / 1m8', qty: 1, unitPrice: 15000000, promoPrice: null, discount: 0 },
    // Order 6 (2 items)
    { orderId: order6.id, productId: productId!, variantId, name: 'Sofa Giường Gỗ Tự Nhiên', variant: 'Nâu / 1m8', qty: 3, unitPrice: 15000000, promoPrice: 14000000, discount: 3000000 },
    // Order 7
    { orderId: order7.id, productId: productId!, variantId, name: 'Sofa Giường Gỗ Tự Nhiên', variant: 'Nâu / 1m8', qty: 1, unitPrice: 20000000, promoPrice: null, discount: 0 },
  ];

  for (const item of orderItemsData) {
    await prisma.orderItem.upsert({
      where: { id: item.orderId + '-' + item.productId.toString() },
      update: {},
      create: {
        orderId: item.orderId,
        productId: item.productId,
        productVariantId: item.variantId ?? undefined,
        productName: item.name,
        variantName: item.variant,
        sku: 'SOFA-001-NH-18',
        quantity: item.qty,
        unitSalePrice: item.unitPrice,
        unitPromoPrice: item.promoPrice ?? undefined,
        unitFinalPrice: item.promoPrice ?? item.unitPrice,
        lineDiscountAmount: item.discount,
        lineTotalAmount: item.qty * (item.promoPrice ?? item.unitPrice),
      },
    });
  }

  console.log(`   ✅ ${orderItemsData.length} order items created`);

  // ── 7. Order Shipments ──────────────────────────────────────────
  console.log('\n🚛 Creating order shipments...');

  const shipmentData = [
    {
      orderId: order1.id,
      warehouseId: warehouse1.id,
      providerId: null,
      method: 'motorbike',
      serviceType: 'standard',
      shippingCost: 0,
    },
    {
      orderId: order2.id,
      warehouseId: warehouse1.id,
      providerId: sp1.id,
      method: 'van',
      serviceType: 'express',
      shippingCost: 500000,
    },
    {
      orderId: order3.id,
      warehouseId: warehouse1.id,
      providerId: sp2.id,
      method: 'motorbike',
      serviceType: 'express',
      shippingCost: 300000,
      trackingCode: 'GHSG123456',
      shippedAt: new Date('2026-04-07T14:00:00Z'),
    },
    {
      orderId: order4.id,
      warehouseId: warehouse1.id,
      providerId: sp3.id,
      method: 'van',
      serviceType: 'standard',
      shippingCost: 0,
      shippedAt: new Date('2026-04-01T10:00:00Z'),
      deliveredAt: new Date('2026-04-01T16:00:00Z'),
    },
    {
      orderId: order5.id,
      warehouseId: warehouse1.id,
      providerId: null,
      method: 'motorbike',
      serviceType: 'standard',
      shippingCost: 500000,
    },
    {
      orderId: order6.id,
      warehouseId: warehouse1.id,
      providerId: sp1.id,
      method: 'truck',
      serviceType: 'scheduled',
      shippingCost: 0,
    },
    {
      orderId: order7.id,
      warehouseId: warehouse1.id,
      providerId: sp2.id,
      method: 'motorbike',
      serviceType: 'express',
      shippingCost: 200000,
      trackingCode: 'GHSG789012',
      shippedAt: new Date('2026-04-03T16:00:00Z'),
      deliveredAt: new Date('2026-04-03T19:00:00Z'),
    },
  ];

  for (const s of shipmentData) {
    const order = [order1, order2, order3, order4, order5, order6, order7].find(o => o.id === s.orderId)!;
    await prisma.orderShipment.upsert({
      where: { id: s.orderId + '-shipment' },
      update: {},
      create: {
        id: s.orderId + '-shipment',
        orderId: s.orderId,
        warehouseId: s.warehouseId,
        shippingProviderId: s.providerId ?? undefined,
        shippingMethod: s.method as 'motorbike',
        shippingServiceType: s.serviceType as 'standard',
        fromContactName: warehouse1.contactName ?? undefined,
        fromContactPhone: warehouse1.contactPhone ?? undefined,
        fromProvinceCode: warehouse1.provinceCode ?? undefined,
        fromProvinceName: warehouse1.provinceName ?? undefined,
        fromDistrictCode: warehouse1.districtCode ?? undefined,
        fromDistrictName: warehouse1.districtName ?? undefined,
        fromWardCode: warehouse1.wardCode ?? undefined,
        fromWardName: warehouse1.wardName ?? undefined,
        fromAddressLine: warehouse1.addressLine,
        fromFullAddress: warehouse1.fullAddress ?? undefined,
        fromLatitude: warehouse1.latitude ?? undefined,
        fromLongitude: warehouse1.longitude ?? undefined,
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
        distanceKm: Math.random() * 20 + 1,
        estimatedDistanceKm: Math.random() * 20 + 1,
        shippingCost: s.shippingCost,
        extraCost: 0,
        discountAmount: 0,
        finalShippingCost: s.shippingCost,
        trackingCode: s.trackingCode ?? undefined,
        shippedAt: s.shippedAt ?? undefined,
        deliveredAt: s.deliveredAt ?? undefined,
      },
    });
  }

  console.log(`   ✅ ${shipmentData.length} shipments created`);

  // ── 8. Order Status Histories ──────────────────────────────────
  console.log('\n📝 Creating order status histories...');

  const statusHistories: Array<{
    orderId: string;
    status: string;
    fromStatus: string | null;
    changedByType: string;
    changedById?: number;
    note: string;
    createdAt: Date;
  }> = [];

  // Order 1: pending only
  statusHistories.push(
    { orderId: order1.id, status: 'pending', fromStatus: null, changedByType: 'system', note: 'Đơn hàng được tạo', createdAt: new Date('2026-04-09T10:30:00Z') }
  );

  // Order 2: pending → confirmed
  statusHistories.push(
    { orderId: order2.id, status: 'pending', fromStatus: null, changedByType: 'system', note: 'Đơn hàng được tạo', createdAt: new Date('2026-04-08T14:00:00Z') },
    { orderId: order2.id, status: 'confirmed', fromStatus: 'pending', changedByType: 'admin', changedById: 1, note: 'Xác nhận đơn hàng, đã nhận cọc 10 triệu', createdAt: new Date('2026-04-08T15:00:00Z') }
  );

  // Order 3: pending → confirmed → processing → shipping
  statusHistories.push(
    { orderId: order3.id, status: 'pending', fromStatus: null, changedByType: 'system', note: 'Đơn hàng được tạo', createdAt: new Date('2026-04-07T09:00:00Z') },
    { orderId: order3.id, status: 'confirmed', fromStatus: 'pending', changedByType: 'admin', changedById: 1, note: 'Xác nhận đơn hàng', createdAt: new Date('2026-04-07T10:00:00Z') },
    { orderId: order3.id, status: 'processing', fromStatus: 'confirmed', changedByType: 'system', note: 'Đang đóng gói và chuẩn bị giao', createdAt: new Date('2026-04-07T11:00:00Z') },
    { orderId: order3.id, status: 'shipping', fromStatus: 'processing', changedByType: 'admin', changedById: 1, note: 'Đã bàn giao GHTK, mã vận đơn GHSG123456', createdAt: new Date('2026-04-07T14:00:00Z') }
  );

  // Order 4: full lifecycle → completed
  statusHistories.push(
    { orderId: order4.id, status: 'pending', fromStatus: null, changedByType: 'system', note: 'Đơn hàng được tạo', createdAt: new Date('2026-04-01T16:00:00Z') },
    { orderId: order4.id, status: 'confirmed', fromStatus: 'pending', changedByType: 'admin', changedById: 1, note: 'Xác nhận đơn hàng', createdAt: new Date('2026-04-01T16:30:00Z') },
    { orderId: order4.id, status: 'processing', fromStatus: 'confirmed', changedByType: 'system', note: 'Đang xử lý', createdAt: new Date('2026-04-01T17:00:00Z') },
    { orderId: order4.id, status: 'shipping', fromStatus: 'processing', changedByType: 'admin', changedById: 1, note: 'Bàn giao Viettel Post', createdAt: new Date('2026-04-02T09:00:00Z') },
    { orderId: order4.id, status: 'delivered', fromStatus: 'shipping', changedByType: 'shipper', note: 'Giao hàng thành công', createdAt: new Date('2026-04-01T16:00:00Z') },
    { orderId: order4.id, status: 'completed', fromStatus: 'delivered', changedByType: 'system', note: 'Đơn hàng hoàn thành tự động', createdAt: new Date('2026-04-03T16:00:00Z') }
  );

  // Order 5: pending → cancelled
  statusHistories.push(
    { orderId: order5.id, status: 'pending', fromStatus: null, changedByType: 'system', note: 'Đơn hàng được tạo', createdAt: new Date('2026-04-05T11:00:00Z') },
    { orderId: order5.id, status: 'cancelled', fromStatus: 'pending', changedByType: 'admin', changedById: 1, note: 'Hủy đơn - khách đổi ý không mua nữa', createdAt: new Date('2026-04-05T12:00:00Z') }
  );

  // Order 6: pending → confirmed → processing
  statusHistories.push(
    { orderId: order6.id, status: 'pending', fromStatus: null, changedByType: 'system', note: 'Đơn hàng được tạo', createdAt: new Date('2026-04-08T08:00:00Z') },
    { orderId: order6.id, status: 'confirmed', fromStatus: 'pending', changedByType: 'admin', changedById: 1, note: 'Xác nhận đơn hàng, chờ giao cuối tuần', createdAt: new Date('2026-04-08T09:00:00Z') },
    { orderId: order6.id, status: 'processing', fromStatus: 'confirmed', changedByType: 'system', note: 'Đang xử lý và đóng gói', createdAt: new Date('2026-04-08T10:00:00Z') }
  );

  // Order 7: pending → confirmed → processing → shipping → delivered
  statusHistories.push(
    { orderId: order7.id, status: 'pending', fromStatus: null, changedByType: 'system', note: 'Đơn hàng được tạo', createdAt: new Date('2026-04-03T15:00:00Z') },
    { orderId: order7.id, status: 'confirmed', fromStatus: 'pending', changedByType: 'admin', changedById: 1, note: 'Xác nhận đơn hàng', createdAt: new Date('2026-04-03T15:30:00Z') },
    { orderId: order7.id, status: 'processing', fromStatus: 'confirmed', changedByType: 'system', note: 'Đang xử lý', createdAt: new Date('2026-04-03T16:00:00Z') },
    { orderId: order7.id, status: 'shipping', fromStatus: 'processing', changedByType: 'admin', changedById: 1, note: 'Bàn giao GHN', createdAt: new Date('2026-04-03T16:00:00Z') },
    { orderId: order7.id, status: 'delivered', fromStatus: 'shipping', changedByType: 'shipper', note: 'Giao thành công, khách nhận hàng', createdAt: new Date('2026-04-03T19:00:00Z') }
  );

  for (const h of statusHistories) {
    await prisma.orderStatusHistory.create({
      data: {
        orderId: h.orderId,
        fromStatus: h.fromStatus as any,
        toStatus: h.status as any,
        changedByType: h.changedByType as any,
        changedById: h.changedById,
        note: h.note,
        createdAt: h.createdAt,
      },
    });
  }

  console.log(`   ✅ ${statusHistories.length} status history records created`);

  console.log('\n🎉 Order system seed completed!');
  console.log('\nSummary:');
  console.log('  • Members: 2');
  console.log('  • MemberAddresses: 2');
  console.log('  • Warehouses: 2');
  console.log('  • ShippingProviders: 3');
  console.log('  • Orders: 7');
  console.log('  • OrderItems: 7');
  console.log('  • OrderShipments: 7');
  console.log('  • OrderStatusHistories: ' + statusHistories.length);
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
