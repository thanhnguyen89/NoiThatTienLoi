// IMPORTANT: vi.mock calls must be at the top level — hoisting depends on this.
// Do NOT move the import of newsService ABOVE the vi.mock call.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock newsRepository BEFORE importing newsService
vi.mock('@/server/repositories/news.repository', () => ({
  newsRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  },
}));

// Import after mock is set up
import { newsService } from '../news.service';
import { newsRepository } from '@/server/repositories/news.repository';
import { NotFoundError, ValidationError } from '@/server/errors';
import { validateNews } from '@/server/validators/news.validator';

// ──────────────────────────────────────────────
// SECTION 1: validateNews — unit-level tests
// ──────────────────────────────────────────────

describe('validateNews (standalone)', () => {
  it('accepts a fully populated news object', () => {
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
      categoryId: 'cat-123',
    };
    const result = validateNews(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Tin tức mới');
      expect(result.data.seName).toBe('tin-tuc-moi');
      expect(result.data.isActive).toBe(true);
      expect(result.data.isShowHome).toBe(true);
    }
  });

  it('applies correct default values', () => {
    const result = validateNews({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
      expect(result.data.isPublished).toBe(false);
      expect(result.data.isShowHome).toBe(true);
      expect(result.data.isRemoved).toBe(false);
      expect(result.data.allowComments).toBe(true);
      expect(result.data.isNew).toBe(false);
      expect(result.data.isRedirect).toBe(false);
      expect(result.data.seoNoindex).toBe(false);
      expect(result.data.sortOrder).toBe(0);
      expect(result.data.viewCount).toBe(0);
      expect(result.data.commentCount).toBe(0);
      expect(result.data.likeCount).toBe(0);
    }
  });

  it('accepts null/empty optional fields', () => {
    const data = {
      title: null,
      summary: null,
      content: null,
      image: null,
      seName: null,
      categoryId: null,
      metaTitle: null,
      metaDescription: null,
      metaKeywords: null,
      slugRedirect: null,
      seoCanonical: null,
      authorName: null,
      newTag: null,
      errorCode: null,
    };
    const result = validateNews(data);
    expect(result.success).toBe(true);
  });

  it('rejects title exceeding 1000 characters', () => {
    const data = { title: 'a'.repeat(1001) };
    const result = validateNews(data);
    expect(result.success).toBe(false);
  });

  it('accepts title with exactly 1000 characters', () => {
    const data = { title: 'a'.repeat(1000) };
    const result = validateNews(data);
    expect(result.success).toBe(true);
  });

  it('rejects metaTitle exceeding 400 characters', () => {
    const data = { metaTitle: 'a'.repeat(401) };
    const result = validateNews(data);
    expect(result.success).toBe(false);
  });

  it('accepts metaTitle with exactly 400 characters', () => {
    const data = { metaTitle: 'a'.repeat(400) };
    const result = validateNews(data);
    expect(result.success).toBe(true);
  });

  it('rejects metaKeywords exceeding 400 characters', () => {
    const data = { metaKeywords: 'a'.repeat(401) };
    const result = validateNews(data);
    expect(result.success).toBe(false);
  });

  it('rejects seName exceeding 255 characters', () => {
    const data = { seName: 'a'.repeat(256) };
    const result = validateNews(data);
    expect(result.success).toBe(false);
  });

  it('rejects slugRedirect exceeding 1000 characters', () => {
    const data = { slugRedirect: 'a'.repeat(1001) };
    const result = validateNews(data);
    expect(result.success).toBe(false);
  });

  it('rejects seoCanonical exceeding 1000 characters', () => {
    const data = { seoCanonical: 'a'.repeat(1001) };
    const result = validateNews(data);
    expect(result.success).toBe(false);
  });

  it('rejects errorCode exceeding 50 characters', () => {
    const data = { errorCode: 'a'.repeat(51) };
    const result = validateNews(data);
    expect(result.success).toBe(false);
  });

  it('rejects authorName exceeding 255 characters', () => {
    const data = { authorName: 'a'.repeat(256) };
    const result = validateNews(data);
    expect(result.success).toBe(false);
  });

  it('accepts valid publishedAt date string', () => {
    const data = { publishedAt: '2025-01-01T00:00:00Z' };
    const result = validateNews(data);
    expect(result.success).toBe(true);
  });

  it('accepts seoNoindex as true', () => {
    const data = { seoNoindex: true };
    const result = validateNews(data);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.seoNoindex).toBe(true);
  });

  it('accepts isRedirect with slugRedirect', () => {
    const data = { isRedirect: true, slugRedirect: '/old-url' };
    const result = validateNews(data);
    expect(result.success).toBe(true);
  });

  it('accepts seoCanonical URL', () => {
    const data = { seoCanonical: 'https://example.com/canonical' };
    const result = validateNews(data);
    expect(result.success).toBe(true);
  });

  it('coerces sortOrder from string', () => {
    const data = { sortOrder: '5' };
    const result = validateNews(data);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sortOrder).toBe(5);
  });

  it('rejects negative sortOrder', () => {
    const data = { sortOrder: -1 };
    const result = validateNews(data);
    expect(result.success).toBe(false);
  });

  it('coerces wordCount correctly', () => {
    const data = { wordCount: 1500 };
    const result = validateNews(data);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.wordCount).toBe(1500);
  });
});

// ──────────────────────────────────────────────
// SECTION 2: newsService.createNews
// ──────────────────────────────────────────────

describe('newsService.createNews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error – mock typing
    newsRepository.create.mockResolvedValue({ id: 'news-1' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a news item with auto-generated seName from title', async () => {
    const input = { title: 'Tin tức mới' };
    // @ts-expect-error – mock typing
    newsRepository.create.mockResolvedValueOnce({ id: 'news-1', title: 'Tin tức mới', seName: 'tin-tuc-moi' });

    await newsService.createNews(input, 'user-1');

    expect(newsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Tin tức mới',
        seName: 'tin-tuc-moi',
      }),
      'user-1'
    );
  });

  it('preserves existing seName if provided', async () => {
    const input = { title: 'Tin tức mới', seName: 'custom-slug' };
    // @ts-expect-error – mock typing
    newsRepository.create.mockResolvedValueOnce({ id: 'news-1', seName: 'custom-slug' });

    await newsService.createNews(input, 'user-1');

    expect(newsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ seName: 'custom-slug' }),
      'user-1'
    );
  });

  it('creates a news item with full data', async () => {
    const input = {
      title: 'Tin tức mới',
      summary: 'Tóm tắt',
      content: '<p>Nội dung</p>',
      seName: 'tin-tuc-moi',
      categoryId: 'cat-1',
      isPublished: true,
      isShowHome: true,
      isActive: true,
      allowComments: true,
      sortOrder: 5,
    };
    // @ts-expect-error – mock typing
    newsRepository.create.mockResolvedValueOnce({ id: 'news-1', ...input });

    const result = await newsService.createNews(input, 'user-1');

    expect(result).toBeDefined();
    expect(newsRepository.create).toHaveBeenCalledTimes(1);
  });

  it('throws ValidationError for invalid data', async () => {
    const input = { title: 'a'.repeat(1001) };

    await expect(newsService.createNews(input, 'user-1')).rejects.toThrow(ValidationError);
    expect(newsRepository.create).not.toHaveBeenCalled();
  });

  it('throws ValidationError when both title too long and no seName', async () => {
    const input = { title: 'a'.repeat(1001), seName: 'custom-slug' };

    await expect(newsService.createNews(input, 'user-1')).rejects.toThrow(ValidationError);
  });

  it('accepts empty seName (validator treats it as optional)', async () => {
    const input = { title: 'Tin tức', seName: '' };
    // @ts-expect-error – mock typing
    newsRepository.create.mockResolvedValueOnce({ id: 'news-1' });

    const result = await newsService.createNews(input, 'user-1');
    expect(result).toBeDefined();
  });
});

// ──────────────────────────────────────────────
// SECTION 3: newsService.updateNews
// ──────────────────────────────────────────────

describe('newsService.updateNews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates an existing news item', async () => {
    const existing = { id: 'news-1', title: 'Tin cũ', seName: 'tin-cu' };
    // @ts-expect-error – mock typing
    newsRepository.findById.mockResolvedValueOnce(existing);
    // @ts-expect-error – mock typing
    newsRepository.update.mockResolvedValueOnce({ id: 'news-1', title: 'Tin mới' });

    const result = await newsService.updateNews('news-1', { title: 'Tin mới' }, 'user-1');

    expect(newsRepository.findById).toHaveBeenCalledWith('news-1');
    expect(newsRepository.update).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('auto-generates seName if title changes and seName is missing', async () => {
    const existing = { id: 'news-1', title: 'Tin cũ', seName: 'tin-cu' };
    // @ts-expect-error – mock typing
    newsRepository.findById.mockResolvedValueOnce(existing);
    // @ts-expect-error – mock typing
    newsRepository.update.mockResolvedValueOnce({ id: 'news-1' });

    await newsService.updateNews('news-1', { title: 'Tin mới' }, 'user-1');

    expect(newsRepository.update).toHaveBeenCalledWith(
      'news-1',
      expect.objectContaining({ seName: 'tin-moi' }),
      'user-1'
    );
  });

  it('throws NotFoundError if news does not exist', async () => {
    // @ts-expect-error – mock typing
    newsRepository.findById.mockResolvedValueOnce(null);

    await expect(newsService.updateNews('not-exist', { title: 'Tin mới' }, 'user-1')).rejects.toThrow(
      NotFoundError
    );
  });

  it('throws ValidationError for invalid update data', async () => {
    const existing = { id: 'news-1', title: 'Tin cũ', seName: 'tin-cu' };
    // @ts-expect-error – mock typing
    newsRepository.findById.mockResolvedValueOnce(existing);

    await expect(
      newsService.updateNews('news-1', { title: 'a'.repeat(1001) }, 'user-1')
    ).rejects.toThrow(ValidationError);
  });
});

// ──────────────────────────────────────────────
// SECTION 4: newsService.deleteNews
// ──────────────────────────────────────────────

describe('newsService.deleteNews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('soft-deletes an existing news item', async () => {
    const existing = { id: 'news-1' };
    // @ts-expect-error – mock typing
    newsRepository.findById.mockResolvedValueOnce(existing);
    // @ts-expect-error – mock typing
    newsRepository.softDelete.mockResolvedValueOnce({ id: 'news-1', isDeleted: true });

    const result = await newsService.deleteNews('news-1', 'user-1');

    expect(newsRepository.softDelete).toHaveBeenCalledWith('news-1', 'user-1');
    expect(result).toBeDefined();
  });

  it('throws NotFoundError if news does not exist', async () => {
    // @ts-expect-error – mock typing
    newsRepository.findById.mockResolvedValueOnce(null);

    await expect(newsService.deleteNews('not-exist', 'user-1')).rejects.toThrow(NotFoundError);
    expect(newsRepository.softDelete).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────
// SECTION 5: newsService.getAllNews & getNewsById
// ──────────────────────────────────────────────

describe('newsService.getAllNews', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('returns all news from repository', async () => {
    const mockList = [
      { id: 'news-1', title: 'Tin 1' },
      { id: 'news-2', title: 'Tin 2' },
    ];
    // @ts-expect-error – mock typing
    newsRepository.findAll.mockResolvedValueOnce(mockList);

    const result = await newsService.getAllNews();

    expect(newsRepository.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockList);
  });
});

describe('newsService.getNewsById', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('returns news by id', async () => {
    const mockNews = { id: 'news-1', title: 'Tin 1' };
    // @ts-expect-error – mock typing
    newsRepository.findById.mockResolvedValueOnce(mockNews);

    const result = await newsService.getNewsById('news-1');

    expect(newsRepository.findById).toHaveBeenCalledWith('news-1');
    expect(result).toEqual(mockNews);
  });

  it('throws NotFoundError if not found', async () => {
    // @ts-expect-error – mock typing
    newsRepository.findById.mockResolvedValueOnce(null);

    await expect(newsService.getNewsById('not-exist')).rejects.toThrow(NotFoundError);
  });
});