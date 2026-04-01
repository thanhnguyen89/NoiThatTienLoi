import { describe, it, expect } from 'vitest';
import { validateCatalogEmbedCode } from '../catalog-embed-code.validator';
import { validateCatalogNewsLevel } from '../catalog-news-level.validator';
import { validateMenuLink, validateReorderMenuLinks, menuLinkTargetEnum } from '../menu-link.validator';
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

  it('accepts all valid target values', () => {
    for (const target of ['_self', '_blank', '_parent', '_top']) {
      const data = { title: 'Test', target };
      const result = validateMenuLink(data);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid target values', () => {
    for (const target of ['_none', 'self', 'blank', 'SELF', '']) {
      const data = { title: 'Test', target };
      const result = validateMenuLink(data);
      expect(result.success).toBe(false);
    }
  });

  it('rejects target with extra characters', () => {
    const data = { title: 'Test', target: '_selfx' };
    const result = validateMenuLink(data);
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding max length', () => {
    const data = { title: 'a'.repeat(1001) };
    const result = validateMenuLink(data);
    expect(result.success).toBe(false);
  });

  it('accepts title at max length', () => {
    const data = { title: 'a'.repeat(1000) };
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
  });

  it('rejects slug exceeding max length', () => {
    const data = { slug: 'a'.repeat(2001) };
    const result = validateMenuLink(data);
    expect(result.success).toBe(false);
  });

  it('accepts slug at max length', () => {
    const data = { slug: 'a'.repeat(2000) };
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
  });

  it('accepts parentId string', () => {
    const data = { title: 'Test', parentId: 'abc-123-uuid' };
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
  });

  it('accepts numeric entityId', () => {
    const data = { entityId: 456, title: 'Test' };
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
  });

  it('accepts BigInt entityId', () => {
    const data = { entityId: BigInt(789), title: 'Test' };
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
  });

  it('accepts entityName string', () => {
    const data = { title: 'Test', entityName: 'ProductCategory' };
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
  });

  it('rejects entityName exceeding max length', () => {
    const data = { title: 'Test', entityName: 'a'.repeat(1001) };
    const result = validateMenuLink(data);
    expect(result.success).toBe(false);
  });

  it('accepts level as integer', () => {
    const data = { title: 'Test', level: 2 };
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
  });

  it('rejects level as non-integer', () => {
    const data = { title: 'Test', level: 1.5 };
    const result = validateMenuLink(data);
    expect(result.success).toBe(false);
  });

  it('accepts sortOrder as integer', () => {
    const data = { title: 'Test', sortOrder: 10 };
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
  });

  it('rejects sortOrder as non-integer', () => {
    const data = { title: 'Test', sortOrder: 3.14 };
    const result = validateMenuLink(data);
    expect(result.success).toBe(false);
  });

  it('accepts icon string', () => {
    const data = { title: 'Test', icon: 'bi-house-fill' };
    const result = validateMenuLink(data);
    expect(result.success).toBe(true);
  });
});

describe('ReorderMenuLinks Validator', () => {
  it('validates valid reorder data with parentId', () => {
    const data = {
      updates: [
        { id: 'id-1', sortOrder: 1, parentId: null },
        { id: 'id-2', sortOrder: 2, parentId: 'parent-1' },
      ],
    };
    const result = validateReorderMenuLinks(data);
    expect(result.success).toBe(true);
  });

  it('validates reorder data without parentId (optional)', () => {
    const data = {
      updates: [
        { id: 'id-1', sortOrder: 1 },
        { id: 'id-2', sortOrder: 2 },
      ],
    };
    const result = validateReorderMenuLinks(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty updates array', () => {
    const data = { updates: [] };
    const result = validateReorderMenuLinks(data);
    expect(result.success).toBe(true);
  });

  it('rejects sortOrder as non-integer', () => {
    const data = { updates: [{ id: 'id-1', sortOrder: 1.5 }] };
    const result = validateReorderMenuLinks(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing id field', () => {
    const data = { updates: [{ sortOrder: 1 }] };
    const result = validateReorderMenuLinks(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing sortOrder field', () => {
    const data = { updates: [{ id: 'id-1' }] };
    const result = validateReorderMenuLinks(data);
    expect(result.success).toBe(false);
  });

  it('accepts null parentId', () => {
    const data = { updates: [{ id: 'id-1', sortOrder: 1, parentId: null }] };
    const result = validateReorderMenuLinks(data);
    expect(result.success).toBe(true);
  });

  it('accepts parentId as string', () => {
    const data = { updates: [{ id: 'id-1', sortOrder: 1, parentId: 'parent-uuid' }] };
    const result = validateReorderMenuLinks(data);
    expect(result.success).toBe(true);
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
