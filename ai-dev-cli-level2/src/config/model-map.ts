export type ModelDefinition = {
  module: string;
  referenceModule: string;
  description: string;
  type: 'simpleCRUD' | 'fullCRUD' | 'content' | 'auth' | 'navigation';
  filesToRead: string[];
  filesToModify: string[];
  affectedLayers: string[];
};

export const MODEL_MAP: Record<string, ModelDefinition> = {
  menu: {
    module: 'menu',
    referenceModule: 'category',
    description: 'Quản lý menu và menu link',
    type: 'navigation',
    filesToRead: [
      './src/admin/features/menu/MenuTable.tsx',
      './src/admin/features/menu/MenuForm.tsx',
      './src/admin/features/menu/MenuFilters.tsx',
      './src/server/services/menu.service.ts',
      './src/server/repositories/menu.repository.ts',
      './src/server/validators/menu.validator.ts',
      './src/admin/api/menu/route.ts',
      './src/admin/api/menu/[id]/route.ts',
    ],
    filesToModify: [
      './src/admin/features/menu/MenuTable.tsx',
      './src/admin/features/menu/MenuForm.tsx',
      './src/admin/features/menu/MenuFilters.tsx',
      './src/server/services/menu.service.ts',
      './src/server/repositories/menu.repository.ts',
    ],
    affectedLayers: ['ui', 'service', 'repository', 'api', 'validator'],
  },
  category: {
    module: 'category',
    referenceModule: 'category',
    description: 'CRUD danh mục + SEO đa nền tảng',
    type: 'fullCRUD',
    filesToRead: [
      './src/admin/features/category/CategoryTable.tsx',
      './src/admin/features/category/CategoryForm.tsx',
      './src/admin/features/category/CategoryFilters.tsx',
      './src/server/services/category.service.ts',
      './src/server/repositories/category.repository.ts',
      './src/server/validators/category.validator.ts',
    ],
    filesToModify: [
      './src/admin/features/category/CategoryTable.tsx',
      './src/admin/features/category/CategoryForm.tsx',
      './src/server/services/category.service.ts',
      './src/server/repositories/category.repository.ts',
    ],
    affectedLayers: ['ui', 'service', 'repository', 'api', 'validator', 'database'],
  },
  product: {
    module: 'product',
    referenceModule: 'product',
    description: 'CRUD sản phẩm + variants + media + SEO',
    type: 'fullCRUD',
    filesToRead: [
      './src/admin/features/product/ProductTable.tsx',
      './src/admin/features/product/ProductForm.tsx',
      './src/admin/features/product/ProductFilters.tsx',
      './src/server/services/product.service.ts',
      './src/server/repositories/product.repository.ts',
      './src/server/validators/product.validator.ts',
    ],
    filesToModify: [
      './src/admin/features/product/ProductTable.tsx',
      './src/admin/features/product/ProductForm.tsx',
      './src/server/services/product.service.ts',
      './src/server/repositories/product.repository.ts',
    ],
    affectedLayers: ['ui', 'service', 'repository', 'api', 'validator', 'database'],
  },
  slider: {
    module: 'slider',
    referenceModule: 'slider',
    description: 'CRUD slider đơn giản',
    type: 'simpleCRUD',
    filesToRead: [
      './src/admin/features/slider/SliderTable.tsx',
      './src/admin/features/slider/SliderForm.tsx',
      './src/server/services/slider.service.ts',
      './src/server/repositories/slider.repository.ts',
      './src/server/validators/slider.validator.ts',
    ],
    filesToModify: [
      './src/admin/features/slider/SliderTable.tsx',
      './src/admin/features/slider/SliderForm.tsx',
      './src/server/services/slider.service.ts',
    ],
    affectedLayers: ['ui', 'service', 'repository', 'api', 'validator'],
  },
  page: {
    module: 'page',
    referenceModule: 'category',
    description: 'CMS page',
    type: 'content',
    filesToRead: [
      './src/admin/features/page/PageTable.tsx',
      './src/admin/features/page/PageForm.tsx',
      './src/server/services/page.service.ts',
      './src/server/repositories/page.repository.ts',
      './src/server/validators/page.validator.ts',
    ],
    filesToModify: [
      './src/admin/features/page/PageTable.tsx',
      './src/admin/features/page/PageForm.tsx',
      './src/server/services/page.service.ts',
    ],
    affectedLayers: ['ui', 'service', 'repository', 'api', 'validator'],
  },
  news: {
    module: 'news',
    referenceModule: 'category',
    description: 'Tin tức và danh mục tin',
    type: 'content',
    filesToRead: [
      './src/admin/features/news/NewsTable.tsx',
      './src/admin/features/news/NewsForm.tsx',
      './src/server/services/news.service.ts',
      './src/server/repositories/news.repository.ts',
      './src/server/validators/news.validator.ts',
    ],
    filesToModify: [
      './src/admin/features/news/NewsTable.tsx',
      './src/admin/features/news/NewsForm.tsx',
      './src/server/services/news.service.ts',
    ],
    affectedLayers: ['ui', 'service', 'repository', 'api', 'validator'],
  },
};

export function getModelDefinition(moduleName: string): ModelDefinition {
  const found = MODEL_MAP[moduleName];
  if (!found) {
    const available = Object.keys(MODEL_MAP).join(', ');
    throw new Error(`Module không hỗ trợ: ${moduleName}. Available: ${available}`);
  }
  return found;
}
