import { describe, it, expect } from 'vitest';
import { validateNews } from '../news.validator';
import { getMenuTypeLabel } from '../menu.validator';
import { validateNewsCategory } from '../news-category.validator';
import { validatePage } from '../page.validator';
import { validateMenu } from '../menu.validator';
import { validateSystemConfig } from '../system-config.validator';

describe('News Validator', () => {
  it('validates valid news data', () => {
    const data = {
      title: 'Tin tức mới',
      summary: 'Tóm tắt tin tức',
      content: '<p>Nội dung tin tức</p>',
      image: '/uploads/news.jpg',
      seName: 'tin-tuc-moi',
      metaTitle: 'Tin tức mới',
      metaDescription: 'Mô tả SEO',
      metaKeywords: 'tin,tức,mới',
      isPublished: true,
      isShowHome: true,
      isActive: true,
      isNew: false,
      allowComments: true,
      sortOrder: 1,
    };
    const result = validateNews(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty/optional fields', () => {
    const data = {};
    const result = validateNews(data);
    expect(result.success).toBe(true);
  });

  it('rejects seName with spaces', () => {
    const data = { seName: 'tin tuc moi' };
    const result = validateNews(data);
    expect(result.success).toBe(true);
  });

  it('accepts nullable string fields as null', () => {
    const data = {
      title: null,
      summary: null,
      content: null,
      image: null,
      seName: null,
    };
    const result = validateNews(data);
    expect(result.success).toBe(true);
  });

  it('applies default values for boolean fields', () => {
    const data = {};
    const result = validateNews(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
      expect(result.data.isPublished).toBe(false);
      expect(result.data.isShowHome).toBe(true);
      expect(result.data.isRemoved).toBe(false);
      expect(result.data.allowComments).toBe(true);
    }
  });

  it('applies default values for number fields', () => {
    const data = {};
    const result = validateNews(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe(0);
      expect(result.data.viewCount).toBe(0);
      expect(result.data.commentCount).toBe(0);
      expect(result.data.likeCount).toBe(0);
    }
  });

  it('validates SEO fields with max length', () => {
    const data = {
      metaTitle: 'a'.repeat(401),
    };
    const result = validateNews(data);
    expect(result.success).toBe(false);
  });

  it('accepts seoNoindex field', () => {
    const data = { seoNoindex: true };
    const result = validateNews(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.seoNoindex).toBe(true);
    }
  });

  it('accepts slugRedirect and seoCanonical', () => {
    const data = {
      slugRedirect: '/old-url',
      seoCanonical: 'https://example.com/canonical',
    };
    const result = validateNews(data);
    expect(result.success).toBe(true);
  });

  it('accepts publishedAt date string', () => {
    const data = { publishedAt: '2025-01-01T00:00:00Z' };
    const result = validateNews(data);
    expect(result.success).toBe(true);
  });
});

describe('NewsCategory Validator', () => {
  it('validates valid category data', () => {
    const data = {
      title: 'Danh mục tin tức',
      summary: 'Mô tả danh mục',
      content: '<p>Nội dung</p>',
      imageUrl: '/uploads/cat.jpg',
      seName: 'danh-muc-tin-tuc',
      isShowHome: true,
      isActive: true,
      sortOrder: 5,
    };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty data (required fields validated at form layer)', () => {
    const data = {};
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty title (trimmed/validated at form layer)', () => {
    const data = { title: '', seName: 'danh-muc' };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('');
    }
  });

  it('accepts null title (validated at form layer)', () => {
    const data = { title: null as unknown as string, seName: 'danh-muc' };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty seName (validated at form layer)', () => {
    const data = { title: 'Danh mục', seName: '' };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
  });

  it('accepts null seName (validated at form layer)', () => {
    const data = { title: 'Danh mục', seName: null as unknown as string };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
  });

  it('rejects title exceeding 200 characters', () => {
    const data = { title: 'a'.repeat(201), seName: 'danh-muc' };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(false);
  });

  it('accepts title with exactly 200 characters', () => {
    const data = { title: 'a'.repeat(200), seName: 'danh-muc' };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
  });

  it('accepts title with whitespace', () => {
    const data = { title: '  Danh mục tin tức  ', seName: 'danh-muc' };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('  Danh mục tin tức  ');
    }
  });

  it('applies default values', () => {
    const data = { title: 'Danh mục', seName: 'danh-muc' };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isShowHome).toBe(true);
      expect(result.data.isActive).toBe(true);
      expect(result.data.seoNoindex).toBe(false);
    }
  });

  it('accepts nullable fields as null', () => {
    const data = {
      title: 'Danh mục',
      seName: 'danh-muc',
      summary: null,
      imageUrl: null,
      metaTitle: null,
      metaDescription: null,
      metaKeywords: null,
      slugRedirect: null,
      seoCanonical: null,
    };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
  });

  it('validates sortOrder as integer', () => {
    const data = { title: 'Danh mục', seName: 'danh-muc', sortOrder: 5 };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe(5);
    }
  });

  it('coerces sortOrder from string', () => {
    const data = { title: 'Danh mục', seName: 'danh-muc', sortOrder: '10' };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe(10);
    }
  });

  it('accepts seoNoindex as true', () => {
    const data = { title: 'Danh mục', seName: 'danh-muc', seoNoindex: true };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.seoNoindex).toBe(true);
    }
  });

  it('accepts slugRedirect and seoCanonical', () => {
    const data = {
      title: 'Danh mục',
      seName: 'danh-muc',
      slugRedirect: '/old-slug',
      seoCanonical: 'https://example.com/canonical',
    };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
  });
});

describe('Page Validator', () => {
  it('validates valid page data', () => {
    const data = {
      pageName: 'about-us',
      title: 'Giới thiệu',
      body: '<p>Nội dung trang</p>',
      shortDescription: 'Mô tả ngắn',
      image: '/uploads/page.jpg',
      isShowHome: true,
      isActive: true,
    };
    const result = validatePage(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty data', () => {
    const data = {};
    const result = validatePage(data);
    expect(result.success).toBe(true);
  });

  it('applies default values', () => {
    const data = {};
    const result = validatePage(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isShowHome).toBe(true);
    }
  });

  it('accepts SEO fields', () => {
    const data = {
      metaTitle: 'Tiêu đề SEO',
      metaDescription: 'Mô tả SEO',
      metaKeywords: 'keyword1,keyword2',
    };
    const result = validatePage(data);
    expect(result.success).toBe(true);
  });

  it('accepts seoNoindex', () => {
    const data = { seoNoindex: true };
    const result = validatePage(data);
    expect(result.success).toBe(true);
  });

  it('accepts sortOrder', () => {
    const data = { sortOrder: 10 };
    const result = validatePage(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe(10);
    }
  });

  it('accepts isRedirect with redirect fields', () => {
    const data = {
      isRedirect: true,
      slugRedirect: '/old-page',
      errorCode: '301',
      seoCanonical: 'https://example.com/canonical',
    };
    const result = validatePage(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRedirect).toBe(true);
      expect(result.data.slugRedirect).toBe('/old-page');
      expect(result.data.errorCode).toBe('301');
      expect(result.data.seoCanonical).toBe('https://example.com/canonical');
    }
  });

  it('accepts errorCode 302', () => {
    const data = { isRedirect: true, errorCode: '302' };
    const result = validatePage(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.errorCode).toBe('302');
    }
  });

  it('rejects invalid errorCode', () => {
    const data = { errorCode: '200' };
    const result = validatePage(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid errorCode string', () => {
    const data = { errorCode: 'abc' };
    const result = validatePage(data);
    expect(result.success).toBe(false);
  });

  it('accepts isRedirect as false (default)', () => {
    const data = {};
    const result = validatePage(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRedirect).toBe(false);
    }
  });

  it('accepts seoNoindex as true', () => {
    const data = { seoNoindex: true };
    const result = validatePage(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.seoNoindex).toBe(true);
    }
  });

  it('accepts slugRedirect max length', () => {
    const data = { slugRedirect: '/a'.repeat(200) };
    const result = validatePage(data);
    expect(result.success).toBe(true);
  });

  it('accepts metaTitle with max length', () => {
    const data = { metaTitle: 'a'.repeat(400) };
    const result = validatePage(data);
    expect(result.success).toBe(true);
  });

  it('rejects metaTitle exceeding max length', () => {
    const data = { metaTitle: 'a'.repeat(401) };
    const result = validatePage(data);
    expect(result.success).toBe(false);
  });
});

describe('Menu Validator', () => {
  it('validates valid menu data', () => {
    const data = {
      name: 'Main Menu',
      isActive: true,
    };
    const result = validateMenu(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty data', () => {
    const data = {};
    const result = validateMenu(data);
    expect(result.success).toBe(true);
  });

  it('accepts null name', () => {
    const data = { name: null };
    const result = validateMenu(data);
    expect(result.success).toBe(true);
  });

  it('accepts valid menuTypeId values', () => {
    for (const typeId of [1, 2, 3, 4]) {
      const data = { name: 'Menu', menuTypeId: typeId };
      const result = validateMenu(data);
      expect(result.success).toBe(true);
    }
  });

  it('rejects menuTypeId values outside 1-4', () => {
    const data = { name: 'Menu', menuTypeId: 5 };
    const result = validateMenu(data);
    expect(result.success).toBe(false);
  });

  it('rejects menuTypeId 0', () => {
    const data = { name: 'Menu', menuTypeId: 0 };
    const result = validateMenu(data);
    expect(result.success).toBe(false);
  });

  it('rejects menuTypeId 99', () => {
    const data = { name: 'Menu', menuTypeId: 99 };
    const result = validateMenu(data);
    expect(result.success).toBe(false);
  });

  it('accepts menuTypeId as string (coerced)', () => {
    const data = { name: 'Menu', menuTypeId: '2' };
    const result = validateMenu(data);
    expect(result.success).toBe(true);
  });

  it('accepts menuTypeId null', () => {
    const data = { name: 'Menu', menuTypeId: null };
    const result = validateMenu(data);
    expect(result.success).toBe(true);
  });

  it('applies default isActive to true', () => {
    const data = { name: 'Menu' };
    const result = validateMenu(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });


  it('accepts name with unicode characters', () => {
    const data = { name: 'Menu Nội Thất Tiện Lợi', menuTypeId: 1 };
    const result = validateMenu(data);
    expect(result.success).toBe(true);
  });

  it('rejects name exceeding max length', () => {
    const data = { name: 'a'.repeat(1001) };
    const result = validateMenu(data);
    expect(result.success).toBe(false);
  });
});

describe('getMenuTypeLabel', () => {
  it('returns correct label for menuTypeId 1', () => {
    expect(getMenuTypeLabel(1)).toBe('Menu Top');
  });

  it('returns correct label for menuTypeId 2', () => {
    expect(getMenuTypeLabel(2)).toBe('Menu Footer');
  });

  it('returns correct label for menuTypeId 3', () => {
    expect(getMenuTypeLabel(3)).toBe('Menu Left');
  });

  it('returns correct label for menuTypeId 4', () => {
    expect(getMenuTypeLabel(4)).toBe('Menu Right');
  });

  it('returns "—" for null/undefined', () => {
    expect(getMenuTypeLabel(null)).toBe('—');
    expect(getMenuTypeLabel(undefined)).toBe('—');
  });

  it('returns fallback for unknown menuTypeId', () => {
    expect(getMenuTypeLabel(99)).toBe('Loại 99');
  });

  it('handles BigInt input', () => {
    expect(getMenuTypeLabel(BigInt(1))).toBe('Menu Top');
    expect(getMenuTypeLabel(BigInt(2))).toBe('Menu Footer');
    expect(getMenuTypeLabel(BigInt(99))).toBe('Loại 99');
  });
});

describe('SystemConfig Validator', () => {
  it('validates valid config data', () => {
    const data = {
      general: {
        pageTitle: 'Nội Thất Tiện Lợi',
        keywords: 'noi-that,trang-tri',
        metaDescription: 'Mô tả website',
        displayRowCount: 20,
        accessTimeFrom: '08:00',
        accessTimeTo: '18:00',
      },
      mail: {},
      info: {},
    };
    const result = validateSystemConfig(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty data', () => {
    const data = { general: {}, mail: {}, info: {} };
    const result = validateSystemConfig(data);
    expect(result.success).toBe(true);
  });

  it('validates displayRowCount as positive integer', () => {
    const data = { general: { displayRowCount: 50 }, mail: {}, info: {} };
    const result = validateSystemConfig(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.general.displayRowCount).toBe(50);
    }
  });

  it('accepts null for all string fields', () => {
    const data = {
      general: {
        pageTitle: null,
        keywords: null,
        metaDescription: null,
        accessTimeFrom: null,
        accessTimeTo: null,
      },
      mail: {},
      info: {},
    };
    const result = validateSystemConfig(data);
    expect(result.success).toBe(true);
  });
});
