import type { Metadata } from 'next';
import { productService } from '@/server/services/product.service';
import { Breadcrumb } from '@/site/shared/Breadcrumb';
import { ProductImages } from '@/site/features/product-detail/ProductImages';
import { ProductInfo } from '@/site/features/product-detail/ProductInfo';
import { ProductTabs } from '@/site/features/product-detail/ProductTabs';
import { ConsultationForm } from '@/site/features/product-detail/ConsultationForm';
import { dbSafe } from '@/lib/db-safe';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await dbSafe(() => productService.getProductBySlug(slug), null);
  if (!product) return {};
  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.description || '',
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await dbSafe(() => productService.getProductBySlug(slug), null);

  if (!product) {
    return (
      <div className="container">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Sản phẩm' }]} />
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#888' }}>
          Không tìm thấy sản phẩm hoặc chưa kết nối database.
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Breadcrumb
        items={[
          { label: 'Trang chủ', href: '/' },
          { label: product.category.name, href: `/danh-muc/${product.category.slug}` },
          { label: product.name },
        ]}
      />
      <div className="product-detail-wrapper">
        <div className="product-main">
          <div className="product-left-column">
            <ProductImages images={product.images} productName={product.name} />
            <ProductInfo product={product} />
          </div>
        </div>
        <div className="product-detail-content">
          <div className="description-column">
            <ProductTabs product={product} />
          </div>
          <aside className="sidebar-column">
            <ConsultationForm productId={product.id} />
          </aside>
        </div>
      </div>
    </div>
  );
}
