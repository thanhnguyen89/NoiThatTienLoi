import Link from 'next/link';
import { productService } from '@/server/services/product.service';
import { categoryService } from '@/server/services/category.service';
import { ProductForm } from '@/admin/features/product/ProductForm';
import { ProductSalesStats } from '@/admin/features/product/ProductSalesStats';
import { dbSafe } from '@/lib/db-safe';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chỉnh sửa sản phẩm' };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [product, categories, sizes, colors] = await Promise.all([
    dbSafe(() => productService.getProductById(id), null),
    dbSafe(() => categoryService.getAllCategories() as Promise<Array<{ id: string; name: string }>>, []),
    dbSafe(() => productService.getSizes(), []),
    dbSafe(() => productService.getColors(), []),
  ]);

  const sizesFormatted = sizes.map((s: { id: string; sizeLabel: string; widthCm: unknown; lengthCm: unknown; heightCm: unknown }) => ({
    id: s.id,
    sizeLabel: s.sizeLabel,
    widthCm: s.widthCm?.toString() ?? null,
    lengthCm: s.lengthCm?.toString() ?? null,
    heightCm: s.heightCm?.toString() ?? null,
  }));

  if (!product) {
    return (
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Không tìm thấy sản phẩm</h1>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/admin/products" className="btn-admin btn-admin--ghost btn-admin--sm">
          ← Quay lại
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Chỉnh sửa: {product.name}</h1>
      </div>

      {/* Thống kê bán hàng */}
      <ProductSalesStats productId={id} productName={product.name} />

      {/* Form chỉnh sửa */}
      <ProductForm
        product={product}
        categories={categories}
        sizes={sizesFormatted}
        colors={colors}
      />
    </div>
  );
}
