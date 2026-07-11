import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking AI Models in database...\n');

  const models = await prisma.aIModel.findMany({
    orderBy: { isDefault: 'desc' },
  });

  if (models.length === 0) {
    console.log('❌ No models found in database!');
    return;
  }

  console.log(`✅ Found ${models.length} models:\n`);

  models.forEach((model, index) => {
    console.log(`${index + 1}. ${model.name}`);
    console.log(`   Provider: ${model.provider}`);
    console.log(`   Model ID: ${model.modelId}`);
    console.log(`   API Key: ${model.apiKey ? '✓ Set' : '✗ Not set'}`);
    console.log(`   Base URL: ${model.baseUrl || '✗ Not set'}`);
    console.log(`   Active: ${model.isActive ? '✓' : '✗'}`);
    console.log(`   Default: ${model.isDefault ? '✓' : '✗'}`);
    console.log('');
  });

  const defaultModel = models.find((m) => m.isDefault && m.isActive);
  if (defaultModel) {
    console.log(`🎯 Default model: ${defaultModel.name} (${defaultModel.modelId})`);
  } else {
    console.log('⚠️  No default model found!');
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
