// Danh sách tất cả resources có thể phân quyền
export const RESOURCES = [
  'categories',
  'products',
  'product_sizes',
  'product_colors',
  'sliders',
  'seo_configs',
  'redirects',
  'text_to_links',
  'inquiries',
  'news',
  'pages',
  'users',
  'roles',
  'settings',
  'activity_logs',
] as const;

export type Resource = (typeof RESOURCES)[number];

// Các action có thể thực hiện
export const ACTIONS = ['VIEW', 'CREATE', 'UPDATE', 'DELETE'] as const;
export type Action = (typeof ACTIONS)[number];

// Check quyền: admin có quyền action trên resource không?
export function hasPermission(
  isSuperAdmin: boolean,
  permissions: Array<{ action: string; resource: string }>,
  action: Action,
  resource: Resource | 'all'
): boolean {
  // Super admin bypass mọi thứ
  if (isSuperAdmin) return true;

  // Check quyền cụ thể
  const hasSpecific = permissions.some(
    (p) => (p.resource === resource || p.resource === 'all') && p.action === action
  );
  if (hasSpecific) return true;

  // VIEW: nếu có quyền VIEW_ALL thì được VIEW resource
  if (action === 'VIEW') {
    return permissions.some((p) => p.resource === resource && p.action === 'VIEW');
  }

  return false;
}

// Check quyền từ role permissions (dạng raw từ DB)
export function canUserDo(
  isSuperAdmin: boolean,
  rolePermissions: Array<{ action: string; resource: string }>,
  action: Action,
  resource: Resource | 'all'
): boolean {
  return hasPermission(isSuperAdmin, rolePermissions, action, resource);
}

// Lấy label hiển thị cho resource
export const RESOURCE_LABELS: Record<Resource | 'all', string> = {
  categories: 'Danh mục sản phẩm',
  products: 'Sản phẩm',
  product_sizes: 'Kích thước',
  product_colors: 'Màu sắc',
  sliders: 'Slider',
  seo_configs: 'Cấu hình SEO',
  redirects: 'Redirect URL',
  text_to_links: 'Text To Link',
  inquiries: 'Liên hệ',
  news: 'Tin tức',
  pages: 'Trang',
  users: 'Người dùng',
  roles: 'Vai trò',
  settings: 'Cấu hình hệ thống',
  activity_logs: 'Nhật ký hoạt động',
  all: 'Toàn quyền',
};

export const ACTION_LABELS: Record<Action, string> = {
  VIEW: 'Xem',
  CREATE: 'Tạo mới',
  UPDATE: 'Sửa',
  DELETE: 'Xóa',
};
