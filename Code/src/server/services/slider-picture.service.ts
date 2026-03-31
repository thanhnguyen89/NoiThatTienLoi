import { sliderPictureRepository } from '@/server/repositories/slider-picture.repository';
import { validateSliderPicture, type SliderPictureInput } from '@/server/validators/slider-picture.validator';
import { NotFoundError, ValidationError } from '@/server/errors';

export const sliderPictureService = {
  async getAllSliderPictures() {
    return sliderPictureRepository.findAll();
  },

  async getSliderPictureById(id: string) {
    return sliderPictureRepository.findById(id);
  },

  async createSliderPicture(input: Record<string, unknown>) {
    const result = validateSliderPicture(input);
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    return sliderPictureRepository.create(result.data);
  },

  async updateSliderPicture(id: string, input: Record<string, unknown>) {
    const current = await sliderPictureRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy hình ảnh slider');
    }

    const result = validateSliderPicture({ ...current, ...input });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    return sliderPictureRepository.update(id, result.data);
  },

  async deleteSliderPicture(id: string) {
    const current = await sliderPictureRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Không tìm thấy hình ảnh slider');
    }

    return sliderPictureRepository.delete(id);
  },
};
