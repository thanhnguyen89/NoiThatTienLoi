import { newsRepository } from '@/server/repositories/news.repository';
import { validateNews } from '@/server/validators/news.validator';
import { NotFoundError, ValidationError } from '@/server/errors';
import { createSlug } from '@/lib/utils';

export const newsService = {
  async getAllNews(opts?: {
    page?: number;
    pageSize?: number;
    search?: string;
    isPublished?: string;
    isShowHome?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    return newsRepository.findAllPaginated({
      page: opts?.page,
      pageSize: opts?.pageSize,
      search: opts?.search,
      isPublished: opts?.isPublished === 'published' ? true : opts?.isPublished === 'unpublished' ? false : undefined,
      isShowHome: opts?.isShowHome === 'home' ? true : opts?.isShowHome === 'nothome' ? false : undefined,
      dateFrom: opts?.dateFrom,
      dateTo: opts?.dateTo,
    });
  },

  async getNewsById(id: string) {
    const news = await newsRepository.findById(id);
    if (!news) throw new NotFoundError('Không tìm thấy tin tức');
    return news;
  },

  async createNews(input: Record<string, unknown>, userId: string) {
    if (!input.seName && input.title) {
      input.seName = createSlug(input.title as string);
    }
    const result = validateNews(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return newsRepository.create(result.data, userId);
  },

  async updateNews(id: string, input: Record<string, unknown>, userId: string) {
    const existing = await newsRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy tin tức');

    if (!input.seName && input.title) {
      input.seName = createSlug(input.title as string);
    }
    const result = validateNews({ ...existing, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return newsRepository.update(id, result.data, userId);
  },

  async deleteNews(id: string, userId: string) {
    const existing = await newsRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy tin tức');
    return newsRepository.softDelete(id, userId);
  },
};
