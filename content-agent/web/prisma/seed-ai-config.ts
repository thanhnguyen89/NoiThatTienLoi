import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_FORBIDDEN_WORDS = [
  'quan trọng', 'hiệu quả', 'tuy nhiên', 'bên cạnh đó', 'đáng kể',
  'không thể phủ nhận', 'toàn diện', 'tối ưu hóa', 'đặc biệt quan trọng',
  'nhìn chung', 'thực tế cho thấy', 'đặc biệt là', 'chính vì vậy',
  'như vậy', 'tóm lại', 'nói tóm lại', 'như đã đề cập',
  'trong cuộc sống hiện đại', 'ngày nay', 'hiện nay', 'bạn có biết rằng',
  'trong xã hội ngày nay', 'trong bài viết này', 'trên đây là',
  'hy vọng bài viết', 'thông tin hữu ích',
  'đa dạng và phong phú', 'vô cùng', 'cực kỳ', 'tuyệt vời', 'đáng chú ý',
  'không chỉ', 'mà còn',
  'siêu phẩm', 'số 1', 'đẳng cấp', 'hoàn hảo',
];

const DEFAULT_CLICHE_OPENINGS = [
  'X là', 'được biết đến', 'từ lâu đã', 'không ai có thể phủ nhận',
  'chắc hẳn bạn', 'bạn đang tìm kiếm', 'đây là lý do',
];

async function main() {
  console.log('🌱 Seeding AI Config...');

  // Seed FORBIDDEN_WORDS
  await prisma.aIConfig.upsert({
    where: { id: 'forbidden-words-default' },
    update: {
      items: DEFAULT_FORBIDDEN_WORDS,
    },
    create: {
      id: 'forbidden-words-default',
      type: 'FORBIDDEN_WORDS',
      items: DEFAULT_FORBIDDEN_WORDS,
      description: 'Danh sách từ cấm AI mặc định',
      isActive: true,
    },
  });

  console.log(`✅ Seeded FORBIDDEN_WORDS: ${DEFAULT_FORBIDDEN_WORDS.length} items`);

  // Seed CLICHE_OPENINGS
  await prisma.aIConfig.upsert({
    where: { id: 'cliche-openings-default' },
    update: {
      items: DEFAULT_CLICHE_OPENINGS,
    },
    create: {
      id: 'cliche-openings-default',
      type: 'CLICHE_OPENINGS',
      items: DEFAULT_CLICHE_OPENINGS,
      description: 'Danh sách mở bài sáo rỗng mặc định',
      isActive: true,
    },
  });

  console.log(`✅ Seeded CLICHE_OPENINGS: ${DEFAULT_CLICHE_OPENINGS.length} items`);

  console.log('✨ AI Config seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding AI Config:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
