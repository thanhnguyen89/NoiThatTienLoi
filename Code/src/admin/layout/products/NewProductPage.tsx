import Link from 'next/link';
import { categoryService } from '@/server/services/category.service';
import { productService } from '@/server/services/product.service';
import { ProductForm } from '@/admin/features/product/ProductForm';
import { dbSafe } from '@/lib/db-safe';

export const metadata = { title: 'Thêm sản phẩm mới' };

export default async function NewProductPage() {
  const categories = await dbSafe(
    () => categoryService.getAllCategories() as Promise<Array<{ id: string; name: string }>>,
    []
  );
  const sizes = await dbSafe(() => productService.getSizes(), []);
  const colors = await dbSafe(() => productService.getColors(), []);

  const sizesFormatted = sizes.map((s: { id: string; sizeLabel: string; widthCm: unknown; lengthCm: unknown; heightCm: unknown }) => ({
    id: s.id,
    sizeLabel: s.sizeLabel,
    widthCm: s.widthCm?.toString() ?? null,
    lengthCm: s.lengthCm?.toString() ?? null,
    heightCm: s.heightCm?.toString() ?? null,
  }));

  return (
    <div>
      <ProductForm categories={categories} sizes={sizesFormatted} colors={colors} />
    </div>
  );
}
