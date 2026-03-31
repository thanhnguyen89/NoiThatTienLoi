import { newsRepository } from '@/server/repositories/news.repository';
import { validateNews } from '@/server/validators/news.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const newsService = {
  async getAllNews() {
    return newsRepository.findAll();
  },

  async getNewsById(id: string) {
    const news = await newsRepository.findById(id);
    if (!news) throw new NotFoundError('Không tìm thấy tin tức');
    return news;
  },

  async createNews(input: Record<string, unknown>) {
    const result = validateNews(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return newsRepository.create(result.data);
  },

  async updateNews(id: string, input: Record<string, unknown>) {
    const existing = await newsRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy tin tức');

    const result = validateNews({ ...existing, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return newsRepository.update(id, result.data);
  },

  async deleteNews(id: string) {
    const existing = await newsRepository.findById(id);
    if (!existing) throw new NotFoundError('Không tìm thấy tin tức');
    return newsRepository.delete(id);
  },
};
