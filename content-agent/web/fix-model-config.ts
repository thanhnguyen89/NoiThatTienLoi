import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing model config to use proxy...\n');

  // Hardcode proxy config
  const config = {
    apiKey: 'sk-3b33cfc262a93b47-hz6ma2-b29b30fd',
    baseUrl: 'https://9router.tools.devgovietnam.io.vn/v2',
    modelId: 'DevGOVietnam-Frontier', // Changed from cx/gpt-5.5
  };

  console.log('Updating to:');
  console.log(`  Model ID: ${config.modelId}`);
  console.log(`  Base URL: ${config.baseUrl}`);
  console.log(`  API Key: ${config.apiKey.slice(0, 20)}...\n`);

  // Update the default model
  const updated = await prisma.aIModel.updateMany({
    where: {
      isDefault: true,
    },
    data: {
      modelId: config.modelId,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    },
  });

  console.log(`✅ Updated ${updated.count} model(s)\n`);

  // Verify
  const defaultModel = await prisma.aIModel.findFirst({
    where: { isDefault: true },
  });

  if (defaultModel) {
    console.log('✅ Verified - Default model:');
    console.log(`   Name: ${defaultModel.name}`);
    console.log(`   Model ID: ${defaultModel.modelId}`);
    console.log(`   Base URL: ${defaultModel.baseUrl}`);
    console.log(`   API Key: ${defaultModel.apiKey?.slice(0, 20)}...`);
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
