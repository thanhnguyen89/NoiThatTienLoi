import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Admin Role
  const adminRole = await prisma.adminRole.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'Super Admin',
      code: 'SUPER_ADMIN',
      description: 'Full system access',
      permissions: {
        '*': ['*'], // All permissions
      },
      isActive: true,
    },
  });

  console.log('✅ Created role:', adminRole.name);

  // Create Admin User
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@contentagen.com',
      passwordHash,
      fullName: 'Administrator',
      roleId: adminRole.id,
      isActive: true,
      isSuperAdmin: true,
    },
  });

  console.log('✅ Created user:', adminUser.username);
  console.log('📧 Email:', adminUser.email);
  console.log('🔑 Password: admin123');
  
  console.log('\n✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
