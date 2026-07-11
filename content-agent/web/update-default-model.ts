import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating default model to use proxy...\n');

  // Get env variables
  const apiKey = process.env.GEMINI_API_KEY;
  const baseUrl = process.env.GEMINI_BASE_URL;
  const modelId = process.env.GEMINI_MODEL || 'DevGOVietnam-Frontier';

  console.log('Config from .env.local:');
  console.log(`  API Key: ${apiKey ? '✓ Set' : '✗ Not set'}`);
  console.log(`  Base URL: ${baseUrl}`);
  console.log(`  Model ID: ${modelId}\n`);

  // Update the default model
  const updated = await prisma.aIModel.updateMany({
    where: {
      isDefault: true,
    },
    data: {
      modelId: modelId,
      apiKey: apiKey,
      baseUrl: baseUrl,
    },
  });

  console.log(`✅ Updated ${updated.count} model(s)`);

  // Verify
  const defaultModel = await prisma.aIModel.findFirst({
    where: { isDefault: true },
  });

  if (defaultModel) {
    console.log('\n✅ Default model after update:');
    console.log(`   Name: ${defaultModel.name}`);
    console.log(`   Model ID: ${defaultModel.modelId}`);
    console.log(`   Base URL: ${defaultModel.baseUrl}`);
    console.log(`   API Key: ${defaultModel.apiKey ? '✓ Set' : '✗ Not set'}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
