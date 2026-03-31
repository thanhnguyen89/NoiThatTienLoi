import { describe, it, expect } from 'vitest';
import { validateNews } from '../news.validator';
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
      expect(result.data.isPublished).toBe(true);
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
      isPublished: true,
      isShowHome: true,
    };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty data', () => {
    const data = {};
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
  });

  it('applies default values', () => {
    const data = {};
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublished).toBe(true);
      expect(result.data.isShowHome).toBe(true);
    }
  });

  it('accepts nullable fields as null', () => {
    const data = {
      title: null,
      summary: null,
      imageUrl: null,
      seName: null,
    };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
  });

  it('validates sortOrder as integer', () => {
    const data = { sortOrder: 5 };
    const result = validateNewsCategory(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe(5);
    }
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
});

describe('SystemConfig Validator', () => {
  it('validates valid config data', () => {
    const data = {
      pageTitle: 'Nội Thất Tiện Lợi',
      keywords: 'noi-that,trang-tri',
      metaDescription: 'Mô tả website',
      displayRowCount: 20,
      accessTimeFrom: '08:00',
      accessTimeTo: '18:00',
      holidays: 'T7,CN',
    };
    const result = validateSystemConfig(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty data', () => {
    const data = {};
    const result = validateSystemConfig(data);
    expect(result.success).toBe(true);
  });

  it('validates displayRowCount as positive integer', () => {
    const data = { displayRowCount: 50 };
    const result = validateSystemConfig(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayRowCount).toBe(50);
    }
  });

  it('accepts null for all string fields', () => {
    const data = {
      pageTitle: null,
      keywords: null,
      metaDescription: null,
      logoUrl: null,
      imageUrl: null,
      accessTimeFrom: null,
      accessTimeTo: null,
      holidays: null,
    };
    const result = validateSystemConfig(data);
    expect(result.success).toBe(true);
  });

  it('accepts totalAccessCount', () => {
    const data = { totalAccessCount: 1000 };
    const result = validateSystemConfig(data);
    expect(result.success).toBe(true);
  });
});
