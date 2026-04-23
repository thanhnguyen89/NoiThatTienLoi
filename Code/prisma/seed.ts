import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── 1. Create Permissions ────────────────────────────────────────────────
  const RESOURCES: Array<{ resource: string; label: string }> = [
    { resource: 'categories', label: 'Danh mục sản phẩm' },
    { resource: 'products', label: 'Sản phẩm' },
    { resource: 'product_sizes', label: 'Kích thước' },
    { resource: 'product_colors', label: 'Màu sắc' },
    { resource: 'sliders', label: 'Slider' },
    { resource: 'seo_configs', label: 'Cấu hình SEO' },
    { resource: 'redirects', label: 'Redirect URL' },
    { resource: 'text_to_links', label: 'Text To Link' },
    { resource: 'inquiries', label: 'Liên hệ' },
    { resource: 'news', label: 'Tin tức' },
    { resource: 'pages', label: 'Trang' },
    { resource: 'users', label: 'Người dùng' },
    { resource: 'roles', label: 'Vai trò' },
    { resource: 'settings', label: 'Cấu hình hệ thống' },
    { resource: 'activity_logs', label: 'Nhật ký hoạt động' },
  ];

  const ACTIONS = ['VIEW', 'CREATE', 'UPDATE', 'DELETE'] as const;

  const permissions: Array<{ id: string; action: string; resource: string }> = [];

  for (const { resource } of RESOURCES) {
    for (const action of ACTIONS) {
      const p = await prisma.adminPermission.upsert({
        where: { action_resource: { action, resource } },
        update: {},
        create: { action, resource },
      });
      permissions.push(p);
    }
  }

  // All permissions
  const allPermIds = permissions.map((p) => p.id);

  // View permissions
  const viewPermIds = permissions.filter((p) => p.action === 'VIEW').map((p) => p.id);

  // Categories + Products CRUD
  const contentPermIds = permissions
    .filter((p) => ['categories', 'products', 'sliders', 'seo_configs', 'redirects', 'text_to_links'].includes(p.resource))
    .map((p) => p.id);

  // Inquiries view
  const inquiryViewId = permissions.find((p) => p.resource === 'inquiries' && p.action === 'VIEW')?.id;
  const inquiryPermIds = inquiryViewId ? [inquiryViewId] : [];

  console.log(`✅ Created ${permissions.length} permissions`);

  // ── 1b. Create UrlRecordReference (danh mục entity cho url_record) ─────────
  const urlRecordReferences = [
    { entityName: 'Product', controllerName: 'Product', actionName: 'Detail', urlPattern: '/san-pham/{slug}', description: 'Trang chi tiết sản phẩm', isActive: true },
    { entityName: 'Category', controllerName: 'Category', actionName: 'List', urlPattern: '/danh-muc/{slug}', description: 'Trang danh sách sản phẩm theo danh mục', isActive: true },
    { entityName: 'Page', controllerName: 'Page', actionName: 'View', urlPattern: '/{slug}', description: 'Trang tĩnh', isActive: true },
    { entityName: 'News', controllerName: 'News', actionName: 'Detail', urlPattern: '/tin-tuc/{slug}', description: 'Trang chi tiết tin tức', isActive: true },
    { entityName: 'NewsCategory', controllerName: 'NewsCategory', actionName: 'List', urlPattern: '/tin-tuc/{slug}', description: 'Trang danh sách tin tức theo danh mục', isActive: true },
  ];

  for (const ref of urlRecordReferences) {
    await prisma.urlRecordReference.upsert({
      where: { entityName_controllerName_actionName: { entityName: ref.entityName, controllerName: ref.controllerName, actionName: ref.actionName } },
      update: { urlPattern: ref.urlPattern, description: ref.description, isActive: ref.isActive },
      create: ref,
    });
  }

  console.log('✅ Created UrlRecordReference entries');

  // ── 2. Create Roles ───────────────────────────────────────────────────────

  // SUPER_ADMIN — full access, bypass
  const superAdminRole = await prisma.adminRole.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'Super Administrator',
      code: 'SUPER_ADMIN',
      description: 'Toàn quyền truy cập hệ thống, bypass mọi kiểm tra quyền',
      isSystem: true,
      isActive: true,
      sortOrder: 1,
    },
  });

  // ADMIN — full CRUD on everything
  const adminRole = await prisma.adminRole.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      name: 'Administrator',
      code: 'ADMIN',
      description: 'Quản trị viên, có toàn quyền trên hệ thống',
      isSystem: true,
      isActive: true,
      sortOrder: 2,
    },
  });

  // EDITOR — CRUD on content, view inquiries
  const editorRole = await prisma.adminRole.upsert({
    where: { code: 'EDITOR' },
    update: {},
    create: {
      name: 'Editor',
      code: 'EDITOR',
      description: 'Biên tập nội dung, quản lý sản phẩm, slider, SEO',
      isSystem: true,
      isActive: true,
      sortOrder: 3,
    },
  });

  // VIEWER — read only
  const viewerRole = await prisma.adminRole.upsert({
    where: { code: 'VIEWER' },
    update: {},
    create: {
      name: 'Viewer',
      code: 'VIEWER',
      description: 'Chỉ xem, không có quyền thay đổi dữ liệu',
      isSystem: true,
      isActive: true,
      sortOrder: 4,
    },
  });

  console.log('✅ Created 4 system roles');

  // ── 3. Assign Permissions to Roles ───────────────────────────────────────

  // SUPER_ADMIN — gets all permissions (bypass is handled in code, not perms)
  await prisma.adminRolePermission.deleteMany({ where: { roleId: superAdminRole.id } });
  for (const pid of allPermIds) {
    await prisma.adminRolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: pid } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: pid },
    });
  }

  // ADMIN — all CRUD
  await prisma.adminRolePermission.deleteMany({ where: { roleId: adminRole.id } });
  for (const pid of allPermIds) {
    await prisma.adminRolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: pid } },
      update: {},
      create: { roleId: adminRole.id, permissionId: pid },
    });
  }

  // EDITOR — content CRUD + inquiries view
  await prisma.adminRolePermission.deleteMany({ where: { roleId: editorRole.id } });
  for (const pid of [...contentPermIds, ...inquiryPermIds]) {
    await prisma.adminRolePermission.upsert({
      where: { roleId_permissionId: { roleId: editorRole.id, permissionId: pid } },
      update: {},
      create: { roleId: editorRole.id, permissionId: pid },
    });
  }

  // VIEWER — view only
  await prisma.adminRolePermission.deleteMany({ where: { roleId: viewerRole.id } });
  for (const pid of viewPermIds) {
    await prisma.adminRolePermission.upsert({
      where: { roleId_permissionId: { roleId: viewerRole.id, permissionId: pid } },
      update: {},
      create: { roleId: viewerRole.id, permissionId: pid },
    });
  }

  console.log('✅ Assigned permissions to roles');

  // ── 4. Create Default Admin User ─────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const adminUser = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@noithattienloi.vn',
      password: hashedPassword,
      fullName: 'Quản trị viên',
      phone: null,
      address: null,
      avatar: null,
      roleId: superAdminRole.id,
      isActive: true,
      isSuperAdmin: true,
    },
  });

  // Create admin in EDITOR role too
  const editorUser = await prisma.adminUser.upsert({
    where: { username: 'editor' },
    update: {},
    create: {
      username: 'editor',
      email: 'editor@noithattienloi.vn',
      password: hashedPassword,
      fullName: 'Biên tập viên',
      roleId: editorRole.id,
      isActive: true,
      isSuperAdmin: false,
    },
  });

  console.log('✅ Created default users:');
  console.log(`   admin / admin123  (SUPER_ADMIN)`);
  console.log(`   editor / admin123 (EDITOR)`);
  console.log('');
  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
