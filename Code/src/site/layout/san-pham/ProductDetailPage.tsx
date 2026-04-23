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

  // Lấy giá từ variant
  const variant = product.variants?.find(v => v.isDefault && v.isActive) || product.variants?.find(v => v.isActive);
  const price = variant?.promoPrice || variant?.salePrice || 0;
  const comparePrice = variant?.promoPrice ? variant.salePrice : null;

  return {
    title: product.seoTitle || `${product.name} - Nội Thất Tiện Lợi`,
    description: product.seoDescription || product.shortDescription || `Mua ${product.name} chính hãng, giá tốt tại Nội Thất Tiện Lợi. ${product.brand ? `Thương hiệu ${product.brand}` : ''} Giao hàng toàn quốc, bảo hành chính hãng.`,
    keywords: [product.name, product.brand, product.category.name, 'nội thất', 'giường sắt', 'giường xếp'].filter(Boolean),
    openGraph: {
      title: product.ogTitle || product.name,
      description: product.ogDescription || product.shortDescription || '',
      type: 'product',
      images: product.images?.map(img => ({
        url: img.url,
        alt: img.alt || product.name,
      })) || [],
      locale: 'vi_VN',
    },
    robots: {
      index: product.isActive,
      follow: product.isActive,
    },
    alternates: {
      canonical: product.canonicalUrl || `/san-pham/${slug}`,
    },
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

  // Lấy giá từ variant
  const variant = product.variants?.find(v => v.isDefault && v.isActive) || product.variants?.find(v => v.isActive);
  const price = variant?.promoPrice || variant?.salePrice || 0;
  const comparePrice = variant?.promoPrice ? variant.salePrice : null;

  // JSON-LD structured data for SEO
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images?.map(img => img.url) || [],
    description: product.shortDescription || product.description || '',
    sku: product.sku || product.id,
    brand: product.brand ? {
      '@type': 'Brand',
      name: product.brand,
    } : undefined,
    offers: {
      '@type': 'Offer',
      url: `https://noithattienlloi.com/san-pham/${slug}`,
      priceCurrency: 'VND',
      price: price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: variant && variant.stockQty > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Nội Thất Tiện Lợi',
      },
    },
    aggregateRating: product.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.avgRating,
      reviewCount: product.reviewCount,
    } : undefined,
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

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
    </>
  );
}
