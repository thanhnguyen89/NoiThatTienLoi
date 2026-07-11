/**
 * Seed brand profile — Nội Thất Minh Quân
 * Chạy: node scripts/seed-brand-minhquan.mjs
 * (từ thư mục web/)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Kiểm tra brand profile đã tồn tại...');

  const existing = await prisma.brandProfile.findFirst({
    where: { shopName: 'Nội Thất Minh Quân' },
  });

  if (existing) {
    console.log('⚠️  Đã tồn tại:', existing.name, `(id: ${existing.id})`);
    console.log('   Cập nhật lại toàn bộ thông tin...');

    const updated = await prisma.brandProfile.update({
      where: { id: existing.id },
      data:  buildData(),
    });

    console.log('✅ Đã cập nhật:', updated.name);
    return;
  }

  console.log('➕ Tạo brand profile mới...');
  const profile = await prisma.brandProfile.create({ data: buildData() });

  console.log('✅ Thành công!');
  console.log('   ID:      ', profile.id);
  console.log('   Tên:     ', profile.name);
  console.log('   Shop:    ', profile.shopName);
  console.log('   Mặc định:', profile.isDefault);
}

function buildData() {
  return {
    name:     'Nội Thất Minh Quân — Chính',
    shopName: 'Nội Thất Minh Quân',
    industry: 'Nội thất',

    brandPronouns: 'Minh Quân / bạn, anh chị (Facebook) | Minh Quân / em / anh chị (Zalo)',

    brandAudience:
      'Gia đình trẻ 25–40 tuổi, sinh viên và công nhân thuê trọ cần giường giá rẻ, chủ homestay/nhà trọ mua số lượng, chủ kinh doanh nhỏ (quán ăn, cafe) cần bàn ghế inox',

    brandToneNotes: [
      'TAGLINE: Giá xưởng – Có sẵn – Giao nhanh',
      '',
      'ĐỊNH VỊ: Nội thất bán thẳng từ xưởng, không qua trung gian. Tập trung độ bền và giá thực tế, không làm hàng trưng bày.',
      '',
      'TONE: Chân thật – Chuyên nghiệp – Gần gũi',
      '- Chân thật: không hô khẩu hiệu sáo rỗng, số liệu phải đúng thực tế (khung dày 1.4mm = đúng 1.4mm)',
      '- Chuyên nghiệp: specs cụ thể (mm, kg, ngày giao), có kích thước, chất liệu, bảo hành',
      '- Gần gũi: câu ngắn, không lan man, không dùng từ hoa mỹ',
      '',
      'USP ƯU TIÊN (luôn nhắc trong bài):',
      '1. Giá xưởng — không qua trung gian',
      '2. Có sẵn hàng — giao liền',
      '3. Giao nhanh — nội thành HCM hỏa tốc 2–4h, toàn quốc 1–3 ngày',
      '4. Bền chắc — khung sắt dày, tải trọng cao, bảo hành 12 tháng',
      '',
      'CTA CHUẨN: "Hàng có sẵn – giao nhanh. Liên hệ Minh Quân để báo giá ngay."',
      '',
      'SẢN PHẨM CHÍNH: giường sắt, giường tầng, bàn ghế inox, kệ inox, bàn ghế cafe, võng, ghế xếp',
    ].join('\n'),

    phone:   '0286 256 5678 – 0919 840 148',
    address: 'A7/8 đường 1C, Ấp 1A, Vĩnh Lộc B, H.Bình Chánh, TP.HCM',

    brandDesc:
      'Nội Thất Minh Quân chuyên cung cấp giường sắt, giường tầng, bàn ghế inox, kệ inox giá xưởng. ' +
      'Giao hàng nhanh toàn quốc, nhận đặt theo yêu cầu, chất lượng bền đẹp – giá hợp lý. ' +
      'Bán trực tiếp từ kho, không có showroom, không qua trung gian.',

    brandForbidden: [
      // AI-style transitions
      'quan trọng, hiệu quả, tuy nhiên, bên cạnh đó, đáng kể',
      'không thể phủ nhận, toàn diện, tối ưu hóa, đặc biệt quan trọng',
      'nhìn chung, thực tế cho thấy, đặc biệt là, chính vì vậy',
      'như vậy, tóm lại, nói tóm lại, như đã đề cập',
      // Cliché openings
      'trong cuộc sống hiện đại, ngày nay, hiện nay, bạn có biết rằng',
      'trong xã hội ngày nay, trong bài viết này, trên đây là',
      'hy vọng bài viết, thông tin hữu ích',
      // Fluff adjectives
      'đa dạng, phong phú, vô cùng, cực kỳ, tuyệt vời, đáng chú ý',
      // AI signature pattern
      'không chỉ mà còn',
      // Marketing fluff
      'siêu phẩm, số 1, đẳng cấp, hoàn hảo, sang trọng, nâng tầm',
    ].join(', '),

    ctaStandard:
      'Hàng có sẵn – giao nhanh. Liên hệ Minh Quân để báo giá ngay.',

    mainProducts:
      'Giường sắt 1 tầng, Giường tầng sắt, Bàn ghế inox quán ăn, Kệ inox bếp, Bàn ghế cafe sắt, Võng xếp, Ghế xếp',

    isDefault: true,
    isActive:  true,
  };
}

main()
  .catch(e => {
    console.error('❌ Lỗi:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
