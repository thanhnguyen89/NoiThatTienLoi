import { MetadataRoute } from 'next';
import { productService } from '@/server/services/product.service';
import { categoryService } from '@/server/services/category.service';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://noithattienlloi.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/lien-he`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  // Get all categories
  const categories = await categoryService.getAllCategories();
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/danh-muc/${category.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // Get all products
  const products = await productService.getProducts({ isActive: true, page: 1, pageSize: 1000 });
  const productPages: MetadataRoute.Sitemap = products.data.map((product) => ({
    url: `${baseUrl}/san-pham/${product.slug}`,
    lastModified: product.createdAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
