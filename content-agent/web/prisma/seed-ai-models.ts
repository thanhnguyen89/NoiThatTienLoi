import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AI Models...');

  // Xóa dữ liệu cũ (nếu có)
  await prisma.aIModel.deleteMany({});

  // Seed AI Models
  const models = [
    {
      name: 'Gemini 2.0 Flash',
      provider: 'gemini',
      modelId: 'gemini-2.0-flash',
      icon: '⚡',
      description: 'Google - Mô hình nhanh',
      isActive: true,
      isDefault: true,
      apiKey: process.env.GEMINI_API_KEY || null,
      baseUrl: process.env.GEMINI_BASE_URL || null,
    },
    {
      name: 'ChatGPT 4o',
      provider: 'openai',
      modelId: 'gpt-4o',
      icon: '🤖',
      description: 'OpenAI - Cần API key',
      isActive: false,
      isDefault: false,
      apiKey: null,
      baseUrl: null,
    },
    {
      name: 'Grok',
      provider: 'grok',
      modelId: 'grok-beta',
      icon: '⚡',
      description: 'xAI - Cần API key',
      isActive: false,
      isDefault: false,
      apiKey: null,
      baseUrl: null,
    },
    {
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      modelId: 'claude-3-5-sonnet-20241022',
      icon: '🧠',
      description: 'Anthropic - Cần API key',
      isActive: false,
      isDefault: false,
      apiKey: null,
      baseUrl: null,
    },
  ];

  for (const model of models) {
    await prisma.aIModel.create({ data: model });
    console.log(`✅ Created: ${model.name}`);
  }

  console.log('✅ AI Models seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding AI Models:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
