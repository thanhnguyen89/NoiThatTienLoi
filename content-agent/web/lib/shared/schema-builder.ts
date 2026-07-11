interface ArticleSchemaInput {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  authorName: string;
  datePublished?: string;
  dateModified?: string;
}

interface LocalBusinessSchemaInput {
  name: string;
  url: string;
  telephone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: string | null;
  priceRange?: string | null;
}

export function buildArticleSchema(input: ArticleSchemaInput): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    url: input.url,
    ...(input.imageUrl ? { image: [input.imageUrl] } : {}),
    author: {
      '@type': 'Organization',
      name: input.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: input.authorName,
    },
    datePublished: input.datePublished || new Date().toISOString(),
    dateModified: input.dateModified || new Date().toISOString(),
  };
}

export function buildLocalBusinessSchema(input: LocalBusinessSchemaInput): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    name: input.name,
    url: input.url,
    ...(input.telephone ? { telephone: input.telephone } : {}),
    ...(input.address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: input.address,
            addressCountry: 'VN',
          },
        }
      : {}),
    ...(input.latitude && input.longitude
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: input.latitude,
            longitude: input.longitude,
          },
        }
      : {}),
    ...(input.openingHours ? { openingHours: input.openingHours.split(',').map((item) => item.trim()).filter(Boolean) } : {}),
    ...(input.priceRange ? { priceRange: input.priceRange } : {}),
  };
}

export function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
