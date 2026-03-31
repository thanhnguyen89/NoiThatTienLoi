import { describe, it, expect } from 'vitest';
import { validateCatalogEmbedCode } from '../catalog-embed-code.validator';
import { validateCatalogNewsLevel } from '../catalog-news-level.validator';
import { validateMenuLink } from '../menu-link.validator';
import { validateSliderPicture } from '../slider-picture.validator';
import { validateUrlRecord } from '../url-record.validator';

describe('CatalogEmbedCode Validator', () => {
  it('validates valid embed code data', () => {
    const data = {
      title: 'Facebook Page Plugin',
      positionId: 1,
      embedCode: '<div>FB plugin</div>',
      note: 'Sidebar widget',
      isActive: true,
    };
    const result = validateCatalogEmbedCode(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty data', () => {
    const data = {};
    const result = validateCatalogEmbedCode(data);
    expect(result.success).toBe(true);
  });

  it('accepts null for optional fields', () => {
    const data = {
      title: null,
      positionId: null,
      embedCode: null,
      note: null,
    };
    const result = validateCatalogEmbedCode(data);
    expect(result.success).toBe(true);
  });

  it('validates isActive default', () => {
    const data = {};
    const result = validateCatalogEmbedCode(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });
});

describe('CatalogNewsLevel Validator', () => {
  it('validates valid news level data', () => {
    const data = { name: 'Tin nổi bật', sortOrder: 1, isActive: true };
    const result = validateCatalogNewsLevel(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty data', () => {
    const data = {};
    const result = validateCatalogNewsLevel(data);
    expect(result.success).toBe(true);
  });

  it('accepts null name', () => {
    const data = { name: null };
    const result = validateCatalogNewsLevel(data);
    expect(result.success).toBe(true);
  });

  it('validates sortOrder as number', () => {
    const data = { name: 'Level 1', sortOrder: 5 };
    const result = validateCatalogNewsLevel(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe(5);
    }
  });
});

describe('MenuLink Validator', () => {
  it('validates valid menu link data', () => {
    const data = {
      title: 'Trang chủ',
      slug: '/',
      target: '_self',
      menuId: BigInt(1),
      icon: 'bi-house',
      level: 1,
      sortOrder: 0,
      nofollow: false,
      isActive: true,
    };
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty data', () => {
    const data = {};
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
  });

  it('accepts null for optional string fields', () => {
    const data = {
      title: null,
      slug: null,
      target: null,
    };
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
  });

  it('accepts BigInt for menuId', () => {
    const data = { menuId: BigInt(123), title: 'Test' };
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
  });

  it('accepts nofollow boolean', () => {
    const data = { title: 'Test', nofollow: true };
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nofollow).toBe(true);
    }
  });
});

describe('SliderPicture Validator', () => {
  it('validates valid slider picture data', () => {
    const data = {
      name: 'Banner 1',
      comment: 'Promo summer sale',
      image: '/uploads/slider1.jpg',
      sortOrder: 1,
      isActive: true,
    };
    const result = validateSliderPicture(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty data', () => {
    const data = {};
    const result = validateSliderPicture(data);
    expect(result.success).toBe(true);
  });

  it('applies default isActive to true', () => {
    const data = {};
    const result = validateSliderPicture(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it('accepts null for optional fields', () => {
    const data = { name: null, comment: null, image: null };
    const result = validateSliderPicture(data);
    expect(result.success).toBe(true);
  });

  it('accepts sortOrder', () => {
    const data = { name: 'Test', sortOrder: 10 };
    const result = validateSliderPicture(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe(10);
    }
  });
});

describe('UrlRecord Validator', () => {
  it('validates valid url record data', () => {
    const data = {
      entityId: BigInt(123),
      entityName: 'Product',
      slug: 'san-pham-1',
    };
    const result = validateUrlRecord(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty data', () => {
    const data = {};
    const result = validateUrlRecord(data);
    expect(result.success).toBe(true);
  });

  it('accepts null for optional fields', () => {
    const data = {
      entityId: null,
      entityName: null,
      slug: null,
    };
    const result = validateUrlRecord(data);
    expect(result.success).toBe(true);
  });

  it('accepts redirect fields', () => {
    const data = {
      slug: '/old-url',
      slugRedirect: '/new-url',
      isRedirect: true,
      errorCode: '301',
    };
    const result = validateUrlRecord(data);
    expect(result.success).toBe(true);
  });

  it('accepts BigInt entityId', () => {
    const data = { entityId: BigInt(456), entityName: 'Category' };
    const result = validateUrlRecord(data);
    expect(result.success).toBe(true);
  });

  it('accepts isActive and isDeleted booleans', () => {
    const data = { isActive: false, isDeleted: true };
    const result = validateUrlRecord(data);
    expect(result.success).toBe(true);
  });
});
