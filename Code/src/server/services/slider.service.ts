import { sliderRepository } from '@/server/repositories/slider.repository';
import { validateSlider, type SliderInput } from '@/server/validators/slider.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const sliderService = {
  async getAllSliders() {
    return sliderRepository.findAll();
  },

  async getSliderById(id: string) {
    return sliderRepository.findById(id);
  },

  async createSlider(input: Record<string, unknown>) {
    const result = validateSlider(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return sliderRepository.create(result.data);
  },

  async updateSlider(id: string, input: Record<string, unknown>) {
    const current = await sliderRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy slider');
    }
    const result = validateSlider({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }
    return sliderRepository.update(id, result.data);
  },

  async deleteSlider(id: string) {
    const current = await sliderRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy slider');
    }
    return sliderRepository.delete(id);
  },
};
